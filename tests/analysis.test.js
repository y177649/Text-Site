// node tests/analysis.test.js で実行する。gas/Analysis.gs の純粋な計算部分を検証する。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../gas/Analysis.gs"), "utf8"), ctx);
const { countedFlags, buildReport } = ctx;

const MIN = 60 * 1000;
const T0 = Date.UTC(2026, 9, 1, 1, 0);

function ev(min, deviceId, textId, referrer, month) {
  return { time: T0 + min * MIN, deviceId, textId, referrer: referrer || "wonder", month: month || "2026-10" };
}

function find(report, period, textId, referrer) {
  return report.counts.find((c) => c.period === period && c.textId === textId && c.referrer === referrer);
}

// しきい値は「最後にカウントした時刻」から測る（直前の記録からではない）。
// 0, 60, 100 分：90 分なら 0 と 100 をカウント（60 は 0 から 90 分以内、100 は 0 から 100 分）。
assert.deepEqual([...countedFlags([0, 60, 100].map((m) => m * MIN), 90)], [true, false, true]);
// ちょうど 90 分は「90 分以内」なので同一利用。
assert.deepEqual([...countedFlags([0, 90].map((m) => m * MIN), 90)], [true, false]);
// 直前からなら 40 分ずつでも、最後にカウントした時刻からは 120 分あいている。
assert.deepEqual([...countedFlags([0, 40, 80, 120].map((m) => m * MIN), 90)], [true, false, false, true]);
assert.deepEqual([...countedFlags([], 90)], []);

// 授業の想定：1コマ目で 10 分に開き、押し間違いで 10.5 分にもう一度、2コマ目の 115 分に開く。
const events = [
  ev(10, "pc-a", "lego-gacha"),
  ev(10.5, "pc-a", "lego-gacha"),
  ev(115, "pc-a", "lego-gacha"),
  ev(12, "pc-b", "lego-gacha"),            // 別の PC は別に数える
  ev(20, "pc-a", "3dp-keycap-toy", "general"),
];
const thresholds = [2, 30, 60, 90, 120, 180];
const report = buildReport(events, thresholds);

const gacha = find(report, "全期間", "lego-gacha", "wonder");
assert.equal(gacha.opens, 4);
// 2/30/60/90分:2+1（10.5分は2分以内で同一）, 120/180分:1+1
assert.deepEqual([...gacha.byThreshold], [3, 3, 3, 3, 2, 2]);
assert.equal(gacha.min, 2);
assert.equal(gacha.max, 3);

const total = find(report, "全期間", "（合計）", "（合計）");
assert.equal(total.opens, 5);
assert.deepEqual([...total.byThreshold], [4, 4, 4, 4, 3, 3]);
assert.ok(find(report, "2026-10", "3dp-keycap-toy", "general"));

// referrer が途中で general → wonder に変わっても、同じ端末・同じテキストとして判定する。
const mixed = buildReport([ev(0, "pc-c", "lego-6wd", "general"), ev(5, "pc-c", "lego-6wd", "wonder")], [90]);
assert.deepEqual([...find(mixed, "全期間", "lego-6wd", "general").byThreshold], [1]);
assert.equal(find(mixed, "全期間", "lego-6wd", "wonder").byThreshold[0], 0);
assert.equal(find(mixed, "全期間", "lego-6wd", "wonder").opens, 1);

// 開いた間隔の内訳（同じ端末・同じテキストの連続する2回）
const gachaGaps = report.gaps.find((g) => g.textId === "lego-gacha");
assert.deepEqual({ ...gachaGaps }, { textId: "lego-gacha", under1: 1, from1to90: 0, over90: 1 });

// 並び順：全期間が先頭、合計行が各期間の先頭
assert.equal(report.counts[0].period, "全期間");
assert.equal(report.counts[0].textId, "（合計）");

// 生ログが空でも落ちない
assert.deepEqual([...buildReport([], thresholds).counts], []);

console.log("ok");
