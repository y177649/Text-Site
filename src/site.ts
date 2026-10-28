// サイト全体の表示文言と設定。載せてよいかは公開ルール（非公開）の分類表で判定済みのものだけ。
export const SITE = {
  name: '教材テキスト',
  // ブラウザのタブに出す名前（トップは「オリジナルテキスト」だけ、各ページは「題名 | オリジナルテキスト」）
  title: 'オリジナルテキスト',
  author: 'Yuichiro Sato',
  headline: 'レゴと3Dプリンターの、作り方テキスト。',
  description: 'レゴと3Dプリンターの作り方テキスト。',
  github: 'https://github.com/y177649',
  // トップの「おすすめのテキスト」に出すカードの数。featured: true を先に、足りない分は残りから順に埋める
  featuredCount: 6,
  // About に出す短い事実（1行ずつ）
  about: [
    '子どもたちがワクワクしながら作れるテキストを、これからも作っていきます。',
    '制作：さっちゃん',
  ],
  // 分類の色（カード上端の線・タグの枠・詳細ページの見出しの線だけに使う）。
  // ここに無い分類はグレー。色はアイコンのパレットから選ぶ。
  categoryColors: {
    'レゴ': '#024176',
    '3Dプリンター': '#3fa690',
    'プログラミング': '#f38e64',
  } as Record<string, string>,
  // 分類の表示順。ここに無い分類は後ろに名前順で並ぶ（分類を増やすときに書き足さなくても動く）。
  categoryOrder: ['レゴ', '3Dプリンター'],
  // 相談フォーム（Google フォーム）。url が空のあいだは、ボタン・フッターのリンク・プライバシーポリシーのフォームの節を出さない。
  // url は「事前入力したURL」の ? より前（…/viewform）。entry ID（例: entry.123456789）も事前入力したURLから写す。
  form: {
    url: '',
    // 種別の entry ID。種別の値はフォームの選択肢と一字一句同じにする（違うと事前入力されない）
    kindEntry: '',
    kinds: ['問題を報告', 'お問い合わせ', 'リクエスト'],
    // 対象のテキストの entry ID。詳細ページのボタンからはテキストの題名が入る
    textEntry: '',
    // フォームを足した日（プライバシーポリシーの改定日に出す。例: 2026年11月1日）
    since: '',
  },
  // 利用記録の送り先（Google Apps Script のウェブアプリ /exec）。空なら記録しない。
  endpoint:
    'https://script.google.com/macros/s/AKfycbwIgS7tau6_EcByDvRDpoHTR1iHVwMuSqf_JY8jJpRjo7ZhhYw5LkG6SZsuzzaH5KW9VA/exec',
};
