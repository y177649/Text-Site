import { existsSync } from 'node:fs';
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
    if (t.data.video && !existsSync(`public/${t.data.video.replace(/^\//, '')}`)) {
      throw new Error(`src/content/texts/${t.id}.md: 動画 public/${t.data.video} が無い`);
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

// 相談フォームを開くURL。種別とテキストの題名を事前入力する。フォームが未設定なら null
export function formUrl(kind?: string, textTitle?: string): string | null {
  const f = SITE.form;
  if (!f.url) return null;
  const u = new URL(f.url);
  u.searchParams.set('usp', 'pp_url');
  if (kind && f.kindEntry) u.searchParams.set(f.kindEntry, kind);
  if (textTitle && f.textEntry) u.searchParams.set(f.textEntry, textTitle);
  return u.toString();
}

// 題名を、ふりがな付きの部分（rt あり）とそのままの部分に分ける。ruby のキーは長いものから当てる
export function rubySegments(title: string, ruby: Record<string, string>): { base: string; rt?: string }[] {
  const keys = Object.keys(ruby).sort((a, b) => b.length - a.length);
  const out: { base: string; rt?: string }[] = [];
  let i = 0;
  while (i < title.length) {
    const k = keys.find((key) => title.startsWith(key, i));
    if (k) { out.push({ base: k, rt: ruby[k] }); i += k.length; continue; }
    const last = out[out.length - 1];
    if (last && !last.rt) last.base += title[i]; else out.push({ base: title[i] });
    i += 1;
  }
  return out;
}

// 分類ページのURL
export const categorySlug = (name: string, index: number) => SITE.categorySlugs[name] ?? `cat-${index}`;
export const categoryUrl = (name: string, index: number) => `${import.meta.env.BASE_URL}category/${categorySlug(name, index)}/`;

// 分類の中を難しさの低い順に、⭐の数ごとにまとめる。⭐の無いテキストは一番下
export function byLevel(list: Text[]): { stars?: number; texts: Text[] }[] {
  const levels: (number | undefined)[] = [...SITE.levels.map((l) => l.stars), undefined];
  return levels
    .map((stars) => ({ stars, texts: list.filter((t) => t.data.level === stars) }))
    .filter((b) => b.texts.length > 0);
}

// 公開から SITE.newDays 日以内のテキスト（新しい順）
export function newTexts(texts: Text[], now = new Date()): Text[] {
  const limit = SITE.newDays * 24 * 60 * 60 * 1000;
  return texts
    .filter((t) => now.getTime() - t.data.published.getTime() <= limit)
    .sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}

// よく開かれている順（Apps Script の ?view=ranking）。取れなければ null（おすすめの欄を出さない）
export async function rankedTexts(texts: Text[]): Promise<Text[] | null> {
  if (!SITE.endpoint) return null;
  try {
    const res = await fetch(`${SITE.endpoint}?view=ranking`, { signal: AbortSignal.timeout(15000) });
    const body = (await res.json()) as { order?: unknown };
    if (!Array.isArray(body.order)) return null;
    const ranked = body.order
      .map((id) => texts.find((t) => t.id === id))
      .filter((t): t is Text => Boolean(t))
      .slice(0, SITE.recommendCount);
    return ranked.length > 0 ? ranked : null;
  } catch {
    return null;
  }
}
