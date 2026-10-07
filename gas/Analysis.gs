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

function runAnalysis() {
  var ss = SpreadsheetApp.getActive();
  var raw = ss.getSheetByName("生ログ");
  var values = raw ? raw.getDataRange().getValues().slice(1) : [];
  var tz = ss.getSpreadsheetTimeZone();
  var events = values
    .filter(function (r) { return r[0] instanceof Date && r[1] && r[2]; })
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
  sheet.clear();

  var rows = [];
  rows.push(["更新", Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm"), "主な値は " + PRIMARY_THRESHOLD_MIN + " 分。数字は感度分析の幅（最小〜最大）とあわせて読む。"]);
  rows.push([]);
  rows.push(["■ 利用回数（しきい値別）"]);
  rows.push(["期間", "text_id", "referrer", "開いた件数"]
    .concat(THRESHOLDS_MIN.map(function (m) { return m + "分"; }))
    .concat(["幅"]));
  out.counts.forEach(function (c) {
    rows.push([c.period, c.textId, c.referrer, c.opens]
      .concat(c.byThreshold)
      .concat([c.min + "〜" + c.max + "回"]));
  });
  rows.push([]);
  rows.push(["■ 同じ端末・同じテキストで連続して開いた間隔（全期間）"]);
  rows.push(["text_id", "1分未満", "1〜90分", "90分超"]);
  out.gaps.forEach(function (g) {
    rows.push([g.textId, g.under1, g.from1to90, g.over90]);
  });

  var width = 5 + THRESHOLDS_MIN.length;
  rows = rows.map(function (r) {
    var row = r.slice();
    while (row.length < width) row.push("");
    return row;
  });
  sheet.getRange(1, 1, rows.length, width).setValues(rows);
  sheet.setFrozenRows(1);
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
