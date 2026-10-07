# Text-Site

教材テキストを配布するサイト（Astro・静的HTML）と、テキストが開かれた回数を記録・解析する仕組み。
公開URL：https://y177649.github.io/Text-Site/ （社内SNSに貼るのは末尾に `?from=wonder` を付けたもの）

構成は [Portfolio](https://github.com/y177649/Portfolio) と同じ（Astro のコンテンツコレクション・詳細ページ・sitemap・GitHub Actions でデプロイ）。
違いは、利用を記録するための小さなクライアントJS（`src/scripts/track.ts`）があること。

## テキストの足し方（投稿型）

`src/content/texts/` に Markdown を1ファイル足し、写真を `public/images/` に置くだけ。トップのカードと詳細ページが自動で増える。
Apps Script の変更・再デプロイは要らない。

🔴 **ファイル名（拡張子なし）がそのまま記録の `text_id` になる。** 英小文字・数字・ハイフンのみ。一度公開したら変えない
（変えると過去の記録と別のテキストとして数えられる）。URL も `/texts/<ファイル名>/` になる。

```markdown
---
title: テキストの名前
category: レゴ            # 新しい分類名を書けば見出しごと増える（並び順は src/site.ts の categoryOrder）
summary: カードに出す1文（80字以内）
image: images/lego-new-car.jpg   # public/ からのパス。横長がよい
url: "https://drive.google.com/…"  # テキスト本体の共有リンク。無ければ「準備中」
order: 4                 # 分類の中での並び順（小さいほど先）
draft: false             # true にすると公開されない
---

## ねらい
## できること
## このテキストで学べること
## 注意点
```

本文は段落の途中で改行しない（日本語の途中に空白が入るため）。

## 記録の仕組み

- 記録するのは、詳細ページの「テキストを開く」（`data-text-id` の付いたリンク）を押した瞬間だけ。ページを開いただけでは記録しない。
- 記録する列：`時刻`（受信時刻）・`device_id`（ブラウザごとに `localStorage` へ発行するランダムな UUID）・`text_id`・`referrer`。
- `?from=wonder` 付きのリンクで一度でも来た端末は、以後 `referrer=wonder`。それ以外は `general`。
- 記録の時点では重複をはじかない。形式が壊れた送信（`text_id` の形式違いなど）だけ捨てる。
- 送り先（Apps Script の /exec）は `src/site.ts` の `endpoint`。

## 解析のルール（`gas/Analysis.gs`）

同じ `device_id`・同じ `text_id` で、**最後にカウントした記録から90分以内**の再アクセスは同一利用とみなす。
あわせて 2・30・60・90・120・180 分でも数え直し（感度分析）、「◯〜◯回」の幅で出す。

スプレッドシートの「解析」シート（毎日4時に更新。メニュー「テキスト利用 → 解析を今すぐ更新」でも可）：

1. 期間（全期間・月別）× `text_id` × `referrer` ごとの、開いた件数としきい値別の利用回数と幅
2. 同じ端末・同じテキストで連続して開いた間隔の内訳（1分未満・1〜90分・90分超）

## 精度の確かめ方

公開後2週間、自分が実際に使ったコマを「正解データ」シートに手で記録する（紙に書いて後から転記してもよい）。
列は `日付・コマ開始時刻・text_id・使った人数・使ったPC台数・メモ`。同じ期間の「解析」の90分の値と突き合わせる。

## 開発

```bash
npm install
npm run dev      # http://localhost:4321/Text-Site/
npm run build    # dist/ に静的HTMLを出力
npm test         # 解析ロジックのテスト
```

## デプロイ

- **サイト**：`main` に push すると GitHub Actions（`.github/workflows/deploy.yml`）がテスト・ビルドして公開する。
  リポジトリの Settings → Pages → Source は **GitHub Actions**。
- **Apps Script**（`gas/`）：[clasp](https://github.com/google/clasp) で `npx @google/clasp push` → `npx @google/clasp update-deployment <デプロイID>`。
  初回のセットアップはスプレッドシートを作り、エディタで `setup` を1回実行して権限を許可する（シートと毎日の解析トリガーができる）。
  `.clasp.json` はスクリプトIDを含むのでコミットしない。

## 公開してよい情報

何を載せてよいかは、このリポジトリの外（非公開）にある公開ルールで判定する。
テキストを足したら、PR にする前に `/publish-check` を通す。main への push・マージは PR 経由のみ。
