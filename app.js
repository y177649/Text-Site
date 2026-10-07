(function () {
  "use strict";

  var config = window.TEXT_SITE_CONFIG;
  var DEVICE_KEY = "textSite.deviceId";
  var REFERRER_KEY = "textSite.referrer";

  // localStorage が使えない環境（プライベートウィンドウ等）でも、ページを開いている間は同じ値を使う。
  var memoryStore = {};

  function load(key) {
    try {
      var value = window.localStorage.getItem(key);
      if (value) return value;
    } catch (e) {}
    return memoryStore[key] || null;
  }

  function save(key, value) {
    memoryStore[key] = value;
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
  }

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    var b = new Uint8Array(16);
    window.crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var hex = Array.prototype.map.call(b, function (x) {
      return (x + 0x100).toString(16).slice(1);
    }).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" +
      hex.slice(16, 20) + "-" + hex.slice(20);
  }

  // ブラウザ単位の ID。Google アカウントは教室の複数台で共有されているので使わない。
  function deviceId() {
    var id = load(DEVICE_KEY);
    if (!id) {
      id = newId();
      save(DEVICE_KEY, id);
    }
    return id;
  }

  // 一度 ?from=wonder で来た端末は、以後ずっと wonder として記録する。
  function rememberReferrer() {
    var from = new URLSearchParams(window.location.search).get("from");
    if (from === "wonder") save(REFERRER_KEY, "wonder");
  }

  function referrer() {
    return load(REFERRER_KEY) === "wonder" ? "wonder" : "general";
  }

  // 記録はカードを押したときだけ。Drive への遷移は止めない（失敗しても黙って捨てる）。
  function record(textId) {
    if (!config.endpoint) return;
    var body = JSON.stringify({
      device_id: deviceId(),
      text_id: textId,
      referrer: referrer(),
    });
    // text/plain にして CORS のプリフライトを避ける。sendBeacon はページ遷移後も送信を続ける。
    var blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(config.endpoint, blob)) return;
    } catch (e) {}
    try {
      fetch(config.endpoint, { method: "POST", body: body, mode: "no-cors", keepalive: true });
    } catch (e) {}
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // 「レゴ3本・3Dプリンター2本」のような一覧の説明を config.js から作る。
  function categories() {
    var order = [];
    var counts = {};
    config.texts.forEach(function (text) {
      if (!(text.category in counts)) {
        order.push(text.category);
        counts[text.category] = 0;
      }
      counts[text.category]++;
    });
    return order.map(function (name) { return { name: name, count: counts[name] }; });
  }

  function render() {
    var list = document.getElementById("cards");
    var cats = categories();
    var catIndex = cats.map(function (c) { return c.name; });
    document.getElementById("lead").textContent =
      cats.map(function (c) { return c.name + c.count + "本"; }).join("・") +
      "。カードを押すとテキストが開きます。";

    config.texts.forEach(function (text, index) {
      var item = el("li");
      var card = el(text.url ? "a" : "div", "card");
      if (text.url) {
        card.href = text.url;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.addEventListener("click", function () {
          record(text.id);
        });
      } else {
        card.classList.add("is-disabled");
        card.setAttribute("aria-disabled", "true");
      }
      // 色は並び順・カテゴリ順でパレットを順に回す。テキストやカテゴリが増えても CSS の変更は要らない。
      card.dataset.color = String(index % 5);
      card.dataset.tag = String(catIndex.indexOf(text.category) % 5);
      card.appendChild(el("span", "card-category", text.category));
      card.appendChild(el("span", "card-title", text.title));
      card.appendChild(el("span", "card-summary", text.summary));
      card.appendChild(el("span", "card-action", text.url ? "テキストを開く" : "準備中"));
      item.appendChild(card);
      list.appendChild(item);
    });
  }

  rememberReferrer();
  deviceId();
  render();
})();
