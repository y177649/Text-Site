// 記録の受け口。サイトのカードが押されるたびに「生ログ」へ1行追記する。
// 重複はここでは一切はじかない（判定は Analysis.gs の解析で行う）。

var RAW_SHEET = "生ログ";
var MANUAL_SHEET = "正解データ";
var RAW_HEADER = ["時刻", "device_id", "text_id", "referrer"];
var MANUAL_HEADER = ["日付", "コマ開始時刻", "text_id", "使った人数", "使ったPC台数", "メモ"];

// テキストの一覧は src/content/texts/ だけで管理する。ここでは text_id の形式だけを見るので、
// テキストを追加しても Apps Script の書き換え・再デプロイは要らない。
var TEXT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
// 経路は英小文字の短い語だけ受け付ける（サイトが送るのは share か general）
var REFERRER_PATTERN = /^[a-z]{1,16}$/;
var DEVICE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return text_("bad request");
  }
  // 形式が壊れた送信だけ捨てる（サイト以外からの送信やいたずら対策）。正しい形式の重複は全部残す。
  if (!data ||
      !TEXT_ID_PATTERN.test(String(data.text_id)) ||
      !REFERRER_PATTERN.test(String(data.referrer)) ||
      !DEVICE_ID_PATTERN.test(String(data.device_id))) {
    return text_("bad request");
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // 時刻は端末の時計ではなく受信時刻。共用の PC の時計がずれていても揃う。
    sheet_(RAW_SHEET, RAW_HEADER).appendRow([new Date(), data.device_id, data.text_id, data.referrer]);
  } finally {
    lock.releaseLock();
  }
  return text_("ok");
}

// デプロイ確認用。ブラウザで /exec を開くと ok が返る。
// ?view=ranking なら、サイトの「おすすめのテキスト」用に、よく開かれている順の text_id だけを返す
// （回数・端末・時刻は返さない）。サイトは毎日の再ビルドでこれを読む。
function doGet(e) {
  if (e && e.parameter && e.parameter.view === "ranking") {
    var ss = SpreadsheetApp.getActive();
    var raw = ss.getSheetByName(RAW_SHEET);
    var values = raw ? raw.getDataRange().getValues().slice(1) : [];
    // 解析（Analysis.gs）と同じく、導入時の動作確認（COUNT_FROM より前）は数えない
    var countFrom = Utilities.parseDate(COUNT_FROM, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd HH:mm:ss").getTime();
    var events = values
      .filter(function (r) { return r[0] instanceof Date && r[0].getTime() >= countFrom && r[1] && r[2]; })
      .map(function (r) { return { time: r[0].getTime(), deviceId: String(r[1]), textId: String(r[2]) }; });
    var order = rankTexts(events, PRIMARY_THRESHOLD_MIN).map(function (r) { return r.textId; });
    return ContentService.createTextOutput(JSON.stringify({ order: order }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return text_("ok");
}

// 初回に1回だけ手で実行する：シートを作り、解析を毎日走らせるトリガーを入れる。
function setup() {
  sheet_(RAW_SHEET, RAW_HEADER);
  var manual = sheet_(MANUAL_SHEET, MANUAL_HEADER);
  manual.getRange("A:A").setNumberFormat("yyyy-mm-dd");
  manual.getRange("B:B").setNumberFormat("hh:mm");

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "runAnalysis") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("runAnalysis").timeBased().everyDays(1).atHour(4).create();
  runAnalysis();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("テキスト利用")
    .addItem("解析を今すぐ更新", "runAnalysis")
    .addToUi();
}

function sheet_(name, header) {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(header);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function text_(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT);
}
