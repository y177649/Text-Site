import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from '../site';

export type Text = CollectionEntry<'texts'>;

const TEXT_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

function categoryRank(name: string): number {
  const i = SITE.categoryOrder.indexOf(name);
  return i < 0 ? SITE.categoryOrder.length : i;
}

// 下書き（draft: true）を除き、分類順 → order → 題名の順に並べる
export async function getTexts(): Promise<Text[]> {
  const texts = await getCollection('texts', ({ data }) => !data.draft);
  for (const t of texts) {
    if (!TEXT_ID.test(t.id)) {
      throw new Error(`src/content/texts/${t.id}.md: ファイル名は英小文字・数字・ハイフンのみ（記録の text_id になるため）`);
    }
  }
  return texts.sort((a, b) =>
    categoryRank(a.data.category) - categoryRank(b.data.category) ||
    a.data.category.localeCompare(b.data.category) ||
    a.data.order - b.data.order ||
    a.data.title.localeCompare(b.data.title));
}

// 分類ごとにまとめる（表示順を保つ）。index は色の割り当てに使う
export function groupByCategory(texts: Text[]) {
  const groups: { name: string; index: number; texts: Text[] }[] = [];
  for (const t of texts) {
    let g = groups.find((x) => x.name === t.data.category);
    if (!g) groups.push((g = { name: t.data.category, index: groups.length, texts: [] }));
    g.texts.push(t);
  }
  return groups;
}

// テキストの tools を集計して「使う道具・ソフト」を出す（多く使うものが先）
export function toolSummary(texts: Text[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of texts) for (const x of t.data.tools) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// 分類の色。CSS の --cat に渡す
export const catStyle = (category: string) => `--cat: ${SITE.categoryColors[category] ?? '#a8a29e'}`;

export const textUrl = (t: Text) => `${import.meta.env.BASE_URL}texts/${t.id}/`;
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
