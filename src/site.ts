// サイト全体の表示文言と設定。載せてよいかは公開ルール（非公開）の分類表で判定済みのものだけ。
export const SITE = {
  name: '教材テキスト',
  author: 'Yuichiro Sato',
  headline: 'レゴと3Dプリンターの、作り方テキスト。',
  description: 'レゴと3Dプリンターの作り方テキスト。',
  portfolio: 'https://y177649.github.io/Portfolio/',
  github: 'https://github.com/y177649',
  // 分類の表示順。ここに無い分類は後ろに名前順で並ぶ（分類を増やすときに書き足さなくても動く）。
  categoryOrder: ['レゴ', '3Dプリンター'],
  // 利用記録の送り先（Google Apps Script のウェブアプリ /exec）。空なら記録しない。
  endpoint:
    'https://script.google.com/macros/s/AKfycbwIgS7tau6_EcByDvRDpoHTR1iHVwMuSqf_JY8jJpRjo7ZhhYw5LkG6SZsuzzaH5KW9VA/exec',
};
