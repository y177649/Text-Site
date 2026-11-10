import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { SITE } from './site';

// 1テキスト = src/content/texts/ の Markdown 1ファイル。
// ファイルを足すだけでトップにカードが増え、詳細ページも自動で作られる。
// 🔴 ファイル名（拡張子なし）がそのまま記録の text_id になる。一度公開したら変えない。
//    英小文字・数字・ハイフンのみ（gas/Code.gs の TEXT_ID_PATTERN と同じ）。
const texts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/texts' }),
  schema: z.object({
    title: z.string(),
    // 分類（例: レゴ / 3Dプリンター）。新しい名前を書けば見出しごと増える
    category: z.string(),
    // 題名の漢字のふりがな（例: { 速: はや }）。題名の上に小さく出す
    ruby: z.record(z.string(), z.string()).default({}),
    summary: z.string().max(80),
    // 写真（public/ からのパス。例: images/lego-gacha.jpg）
    image: z.string().optional(),
    // テキスト本体（Google ドライブ等の共有リンク）。無ければ「準備中」
    url: z.string().url().optional(),
    // 動くようすの動画（public/ からのパス。例: videos/lego-gacha.mp4）。無ければ「動画なし」
    video: z.string().optional(),
    // 難しさ（1〜4。凡例と制作時間の目安は src/site.ts の levels）。無ければ「-」
    level: z.number().int().min(1).max(4).optional(),
    // 技術のタグ（src/site.ts の techTags から選ぶ）。無ければ「-」
    techTags: z.array(z.enum(SITE.techTags as [string, ...string[]])).default([]),
    // パーツ数（組み立てに使う部品の総数）。無ければ「-」
    parts: z.number().int().positive().optional(),
    // 作るときに使う道具・ソフト（トップの「使う道具・ソフト」に集計される）
    tools: z.array(z.string()).default([]),
    // 分類の中での並び順（小さいほど先）
    order: z.number().default(100),
    draft: z.boolean().default(false),
  }),
});

export const collections = { texts };
