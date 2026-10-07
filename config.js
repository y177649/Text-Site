// サイトの設定。デプロイ前にここだけ書き換える。
window.TEXT_SITE_CONFIG = {
  // Apps Script を「ウェブアプリ」としてデプロイしたときの URL（…/exec）。
  // 空のままなら記録は送らず、リンクだけが動く。
  endpoint: "https://script.google.com/macros/s/AKfycbwIgS7tau6_EcByDvRDpoHTR1iHVwMuSqf_JY8jJpRjo7ZhhYw5LkG6SZsuzzaH5KW9VA/exec",

  // テキストを追加するときは、この配列に1件足すだけでよい（Apps Script の変更は不要）。
  //   id       記録に残る text_id。英小文字・数字・ハイフンのみ。一度使ったら変えない
  //            （変えると過去の記録と別のテキストとして数えられる）。
  //   category 「レゴ」などの分類。新しい分類名を書けばそのまま増える。
  //   url      Google ドライブ等の共有リンク。空にすると「準備中」と表示される。
  texts: [
    {
      id: "lego-steering",
      category: "レゴ",
      title: "ステアリング機構",
      summary: "説明書作成ソフトで作ったオリジナルの組み立て説明書。",
      url: "https://drive.google.com/file/d/1Qls5aH-jVY59p_5nWJPP5o9sMxZltgKU/view?usp=sharing",
    },
    {
      id: "lego-gacha",
      category: "レゴ",
      title: "ガチャガチャ",
      summary: "ガチャガチャを再現する作品の組み立て説明書。",
      url: "https://drive.google.com/file/d/1RW1wfNa2yObzp6-nFiRq00NT4VHAgB_W/view?usp=sharing",
    },
    {
      id: "lego-6wd",
      category: "レゴ",
      title: "6輪駆動車",
      summary: "6つのタイヤが全部同時に動く車の組み立て説明書。",
      url: "https://drive.google.com/file/d/1UV-jhUzh4TIpLnmPixSfiQvlUDcS-VMq/view?usp=sharing",
    },
    {
      id: "3dp-technic-pin",
      category: "3Dプリンター",
      title: "テクニックピンがはまる部品",
      summary: "穴の入口に段を付け、レゴのテクニックピンがカチッとはまる部品を作る。",
      url: "https://docs.google.com/presentation/d/1I62SDpDqJE4kUGytpGlorqWJlOVnnnA04ZAxyOWacGA/edit?usp=sharing",
    },
    {
      id: "3dp-keycap-toy",
      category: "3Dプリンター",
      title: "キーボードのキーのおもちゃ",
      summary: "寸法が難しいはまる部分は用意済み。見た目の部分を自由に作る。",
      url: "https://docs.google.com/presentation/d/16qySR_juk3eSwxxC8jkl7UM9rJU9SEMDVx8NtVLs4EQ/edit?usp=sharing",
    },
  ],
};
