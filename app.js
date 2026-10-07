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

  function card(text, catIndex) {
    var item = el("li", "card");
    // 分類の色はパレットを順に回す。分類が増えても CSS の変更は要らない。
    item.dataset.cat = String(catIndex % 5);

    if (text.image) {
      var img = el("img", "thumb");
      img.src = text.image;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      item.appendChild(img);
    }

    var body = el("div", "body");
    var meta = el("div", "meta");
    meta.appendChild(el("span", "tag", text.category));
    body.appendChild(meta);

    var h3 = el("h3");
    if (text.url) {
      // カード全体を押せるようにする（リンクは見出しの1つだけ。CSS の ::after で広げる）
      var link = el("a", null, text.title);
      link.href = text.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.addEventListener("click", function () {
        record(text.id);
      });
      h3.appendChild(link);
    } else {
      h3.textContent = text.title;
      item.classList.add("is-disabled");
    }
    body.appendChild(h3);
    body.appendChild(el("p", null, text.summary));
    body.appendChild(el("span", "action", text.url ? "テキストを開く →" : "準備中"));
    item.appendChild(body);
    return item;
  }

  function render() {
    var cats = categories();
    document.getElementById("lead").textContent =
      cats.map(function (c) { return c.name + c.count + "本"; }).join("・") +
      "。カードを押すとテキストが開きます。";

    var root = document.getElementById("sections");
    cats.forEach(function (cat, catIndex) {
      root.appendChild(el("h2", null, cat.name));
      var grid = el("ul", "grid");
      config.texts.forEach(function (text) {
        if (text.category === cat.name) grid.appendChild(card(text, catIndex));
      });
      root.appendChild(grid);
    });
  }

  rememberReferrer();
  deviceId();
  render();
})();
