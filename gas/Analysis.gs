// 生ログ → 利用回数への変換。生ログは読むだけで書き換えない。
//
// 判定ルール：同じ device_id・同じ text_id で「最後にカウントした記録の時刻」から
// しきい値以内の再アクセスは同一利用とみなす。主な値は 90 分（授業の長さから事前に固定）。
// 感度分析として 2/30/60/90/120/180 分でも数え直し、結果は「最小〜最大」の幅で出す。
// 件数が少ないうちは、データからの閾値推定やブートストラップは使わない。

var ANALYSIS_SHEET = "解析";
var THRESHOLDS_MIN = [2, 30, 60, 90, 120, 180];
var PRIMARY_THRESHOLD_MIN = 90;
var ALL = "（合計）";
// これより前の記録は導入時の動作確認なので数えない（生ログには残したまま、解析でだけ除外する）。
// 最後の確認記録が 2026-10-08 02:50:11 なので、その次の秒から数える。
var COUNT_FROM = "2026-10-08 02:50:12";

function runAnalysis() {
  var ss = SpreadsheetApp.getActive();
  var raw = ss.getSheetByName("生ログ");
  var values = raw ? raw.getDataRange().getValues().slice(1) : [];
  var tz = ss.getSpreadsheetTimeZone();
  var countFrom = Utilities.parseDate(COUNT_FROM, tz, "yyyy-MM-dd HH:mm:ss").getTime();
  var events = values
    .filter(function (r) { return r[0] instanceof Date && r[0].getTime() >= countFrom && r[1] && r[2]; })
    .map(function (r) {
      return {
        time: r[0].getTime(),
        month: Utilities.formatDate(r[0], tz, "yyyy-MM"),
        deviceId: String(r[1]),
        textId: String(r[2]),
        referrer: String(r[3]),
      };
    });

  var out = buildReport(events, THRESHOLDS_MIN);
  var sheet = ss.getSheetByName(ANALYSIS_SHEET) || ss.insertSheet(ANALYSIS_SHEET);
  resetSheet_(sheet);

  // レイアウト：左に「利用回数」(A〜K)、1列あけて右に「連続して開いた間隔」(M〜P)。
  // 見出し行(4行目)を共通にして固定し、縦に長くなっても列名が見えるようにする。
  var width = 5 + THRESHOLDS_MIN.length;
  var gapCol = width + 2;
  var head = 4;
  var countRows = out.counts.map(function (c) {
    return [c.period, c.textId, c.referrer, c.opens]
      .concat(c.byThreshold)
      .concat([c.min + "〜" + c.max + "回"]);
  });
  var gapRows = out.gaps.map(function (g) {
    return [g.textId, g.under1, g.from1to90, g.over90];
  });
  var lastRow = head + Math.max(countRows.length, gapRows.length, 1);

  // 「2026-10」や更新時刻が日付に化けないよう、書き込む前に文字列書式にしておく。
  sheet.getRange(1, 2).setNumberFormat("@");
  sheet.getRange(head, 1, lastRow - head + 1, 3).setNumberFormat("@");
  sheet.getRange(head, gapCol, lastRow - head + 1, 1).setNumberFormat("@");

  sheet.getRange(1, 1, 1, 3).setValues([["更新", Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm"), "主な値は " + PRIMARY_THRESHOLD_MIN + " 分。数字は感度分析の幅（最小〜最大）とあわせて読む。" + COUNT_FROM + " 以降の記録を集計（それより前は動作確認として除外）。"]]);
  sheet.getRange(3, 1).setValue("■ 利用回数（しきい値別）");
  sheet.getRange(3, gapCol).setValue("■ 同じ端末・同じテキストで連続して開いた間隔（全期間）");
  sheet.getRange(head, 1, 1, width).setValues([["期間", "text_id", "referrer", "開いた件数"]
    .concat(THRESHOLDS_MIN.map(function (m) { return m + "分"; }))
    .concat(["幅"])]);
  sheet.getRange(head, gapCol, 1, 4).setValues([["text_id", "1分未満", "1〜90分", "90分超"]]);
  if (countRows.length) sheet.getRange(head + 1, 1, countRows.length, width).setValues(countRows);
  if (gapRows.length) sheet.getRange(head + 1, gapCol, gapRows.length, 4).setValues(gapRows);

  formatAnalysis_(sheet, out.counts, out.gaps, width, gapCol, head, lastRow);
}

// 前回の書式・メモ・固定を残さないように初期化する（clear() だけではメモ等が残る）。
function resetSheet_(sheet) {
  sheet.clear();
  sheet.clearNotes();
  sheet.clearConditionalFormatRules();
  sheet.getBandings().forEach(function (b) { b.remove(); });
  sheet.setFrozenRows(0);
  sheet.setFrozenColumns(0);
}

// 見た目だけを整える。値は変えない。
function formatAnalysis_(sheet, counts, gaps, width, gapCol, head, lastRow) {
  var C = {
    dark: "#263238", header: "#37474F", white: "#FFFFFF", muted: "#B0BEC5",
    text: "#263238", detail: "#607D8B", line: "#CFD8DC", periodLine: "#78909C",
    period: "#E3F2FD", primary: "#FFF8E1", primaryStrong: "#FFE082", primaryHead: "#FBC02D",
    warn: "#E65100", zebra: "#F7F9FA",
  };
  var SOLID = SpreadsheetApp.BorderStyle.SOLID;
  var first = head + 1;
  var n = counts.length;
  var maxCol = gapCol + 3;
  var primaryCol = 5 + THRESHOLDS_MIN.indexOf(PRIMARY_THRESHOLD_MIN);

  sheet.setHiddenGridlines(true);
  sheet.getRange(1, 1, lastRow, maxCol)
    .setFontSize(10).setFontColor(C.text).setVerticalAlignment("middle");

  // 1行目：更新情報の帯
  sheet.getRange(1, 1, 1, maxCol).setBackground(C.dark).setFontColor(C.white);
  sheet.getRange(1, 1, 1, 2).setFontWeight("bold");
  sheet.getRange(1, 2).setHorizontalAlignment("left");
  sheet.getRange(1, 3).setFontColor(C.muted);
  sheet.setRowHeight(1, 34);
  sheet.setRowHeight(2, 12);

  // 3行目：セクション名
  [1, gapCol].forEach(function (col) {
    sheet.getRange(3, col).setFontSize(12).setFontWeight("bold").setFontColor(C.dark);
  });
  sheet.setRowHeight(3, 30);

  // 4行目：表の見出し
  [sheet.getRange(head, 1, 1, width), sheet.getRange(head, gapCol, 1, 4)].forEach(function (r) {
    r.setBackground(C.header).setFontColor(C.white).setFontWeight("bold")
      .setHorizontalAlignment("center").setWrap(true);
  });
  sheet.getRange(head, primaryCol).setBackground(C.primaryHead).setFontColor(C.dark)
    .setNote("主な値（" + PRIMARY_THRESHOLD_MIN + " 分）。授業の長さから事前に固定したしきい値。");
  sheet.getRange(head, width)
    .setNote("しきい値 " + THRESHOLDS_MIN.join("/") + " 分で数え直したときの最小〜最大。\nオレンジ色は、しきい値によって回数が変わる行。");
  sheet.getRange(head, 4).setNote("記録された「開いた」回数そのもの（重複を含む）。");
  sheet.setRowHeight(head, 32);

  // 利用回数の本体
  if (n) {
    var bg = [], fc = [], fw = [], nf = [];
    counts.forEach(function (c) {
      var periodTotal = c.textId === ALL && c.referrer === ALL;
      var textTotal = c.textId !== ALL && c.referrer === ALL;
      var rb = [], rf = [], rw = [];
      for (var col = 1; col <= width; col++) {
        var b = periodTotal ? C.period : C.white;
        if (col === primaryCol) b = periodTotal ? C.primaryStrong : C.primary;
        var f = (periodTotal || textTotal) ? C.text : C.detail;
        if (col === 1 && !periodTotal) f = C.muted; // 期間は各ブロックの先頭行だけ目立たせる
        if (col === width && c.min !== c.max) f = C.warn;
        var w = (periodTotal || (textTotal && col === 2) || col === primaryCol) ? "bold" : "normal";
        rb.push(b); rf.push(f); rw.push(w);
      }
      bg.push(rb); fc.push(rf); fw.push(rw);
      nf.push([textTotal || periodTotal ? "@" : "\"　└ \"@"]); // referrer の内訳は字下げ表示
    });
    var body = sheet.getRange(first, 1, n, width);
    body.setBackgrounds(bg).setFontColors(fc).setFontWeights(fw);
    sheet.getRange(first, 3, n, 1).setNumberFormats(nf);
    sheet.getRange(first, 4, n, width - 4).setNumberFormat("0").setHorizontalAlignment("right");
    sheet.getRange(first, width, n, 1).setHorizontalAlignment("center");
    sheet.getRange(first, 1, n, 1).setHorizontalAlignment("left");
    body.setBorder(null, null, null, null, null, true, C.line, SOLID);
    sheet.getRange(head, 1, n + 1, width).setBorder(true, true, true, true, null, null, C.line, SOLID);
    counts.forEach(function (c, i) {
      if (i > 0 && c.textId === ALL && c.referrer === ALL) {
        sheet.getRange(first + i, 1, 1, width)
          .setBorder(true, null, null, null, null, null, C.periodLine, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      }
    });
  }

  // 連続して開いた間隔の本体
  if (gaps.length) {
    var gbody = sheet.getRange(first, gapCol, gaps.length, 4);
    gbody.setBackgrounds(gaps.map(function (g, i) {
      var b = i % 2 ? C.zebra : C.white;
      return [b, b, b, b];
    }));
    sheet.getRange(first, gapCol, gaps.length, 1).setFontWeight("bold");
    sheet.getRange(first, gapCol + 1, gaps.length, 3)
      .setNumberFormat("0;-0;\"–\"").setHorizontalAlignment("center");
    gbody.setBorder(null, null, null, null, null, true, C.line, SOLID);
    sheet.getRange(head, gapCol, gaps.length + 1, 4).setBorder(true, true, true, true, null, null, C.line, SOLID);
  }

  // 列幅と固定
  var widths = [90, 180, 120, 84];
  THRESHOLDS_MIN.forEach(function () { widths.push(64); });
  widths.push(96, 24, 180, 80, 80, 80);
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
  sheet.setFrozenRows(head);
}


// ここから下はスプレッドシートに依存しない純粋な計算（tests/analysis.test.js で検証）。

// 1つの (device_id, text_id) の時刻列について、しきい値ごとに「カウントした記録」を返す。
function countedFlags(sortedTimes, thresholdMin) {
  var limit = thresholdMin * 60 * 1000;
  var flags = [];
  var lastCounted = null;
  sortedTimes.forEach(function (t) {
    var counted = lastCounted === null || t - lastCounted > limit;
    if (counted) lastCounted = t;
    flags.push(counted);
  });
  return flags;
}

function buildReport(events, thresholds) {
  // 端末×テキストでまとめて時系列に並べる。referrer は端末の途中で general→wonder に変わりうるので
  // まとめる単位には含めず、カウントした記録ごとに集計する。
  var groups = {};
  events.forEach(function (e) {
    var key = e.deviceId + "\u0000" + e.textId;
    (groups[key] = groups[key] || []).push(e);
  });

  var tally = {};
  function add(period, textId, referrer, field, idx) {
    var key = [period, textId, referrer].join("\u0000");
    var t = tally[key] = tally[key] || {
      period: period, textId: textId, referrer: referrer,
      opens: 0, byThreshold: thresholds.map(function () { return 0; }),
    };
    if (field === "open") t.opens++;
    else t.byThreshold[idx]++;
  }
  function addAll(e, field, idx) {
    [e.month, "全期間"].forEach(function (p) {
      add(p, e.textId, e.referrer, field, idx);
      add(p, e.textId, ALL, field, idx);
      add(p, ALL, ALL, field, idx);
    });
  }

  var gapByText = {};
  Object.keys(groups).forEach(function (key) {
    var list = groups[key].sort(function (a, b) { return a.time - b.time; });
    var times = list.map(function (e) { return e.time; });
    list.forEach(function (e) { addAll(e, "open"); });
    thresholds.forEach(function (m, idx) {
      countedFlags(times, m).forEach(function (counted, i) {
        if (counted) addAll(list[i], "count", idx);
      });
    });

    var textId = list[0].textId;
    var g = gapByText[textId] = gapByText[textId] || { textId: textId, under1: 0, from1to90: 0, over90: 0 };
    for (var i = 1; i < times.length; i++) {
      var gapMin = (times[i] - times[i - 1]) / 60000;
      if (gapMin < 1) g.under1++;
      else if (gapMin <= 90) g.from1to90++;
      else g.over90++;
    }
  });

  var counts = Object.keys(tally).map(function (k) {
    var t = tally[k];
    t.min = Math.min.apply(null, t.byThreshold);
    t.max = Math.max.apply(null, t.byThreshold);
    return t;
  });
  counts.sort(function (a, b) {
    return order_(a.period, b.period, true) || order_(a.textId, b.textId) || order_(a.referrer, b.referrer);
  });
  var gaps = Object.keys(gapByText).sort().map(function (k) { return gapByText[k]; });
  return { counts: counts, gaps: gaps };
}

// 「全期間」「（合計）」を先頭に、月は新しい順、それ以外は名前順。
function order_(a, b, newestFirst) {
  var top = { "全期間": 1, "（合計）": 1 };
  if (top[a] && !top[b]) return -1;
  if (top[b] && !top[a]) return 1;
  if (a === b) return 0;
  var asc = a < b ? -1 : 1;
  return newestFirst ? -asc : asc;
}

// サイトの「おすすめのテキスト」用。主な値（90分）で数えた利用回数の多い順に text_id を返す。
// 回数そのものはサイトに出さない（順番だけ使う）。同じ回数なら text_id の順。
function rankTexts(events, thresholdMin) {
  var byKey = {};
  events.forEach(function (e) {
    var key = e.deviceId + "\t" + e.textId;
    (byKey[key] = byKey[key] || { textId: e.textId, times: [] }).times.push(e.time);
  });
  var tally = {};
  Object.keys(byKey).forEach(function (k) {
    var g = byKey[k];
    var n = countedFlags(g.times.sort(function (a, b) { return a - b; }), thresholdMin)
      .filter(function (c) { return c; }).length;
    tally[g.textId] = (tally[g.textId] || 0) + n;
  });
  return Object.keys(tally)
    .map(function (id) { return { textId: id, count: tally[id] }; })
    .sort(function (a, b) { return b.count - a.count || (a.textId < b.textId ? -1 : a.textId > b.textId ? 1 : 0); });
}
