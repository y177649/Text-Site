import type { APIRoute } from 'astro';
import { getTexts } from '../lib/texts';

export const GET: APIRoute = async ({ site }) => {
  const base = new URL(import.meta.env.BASE_URL, site);
  const texts = await getTexts();
  const urls = [base.href, new URL('texts/', base).href, ...texts.map((t) => new URL(`texts/${t.id}/`, base).href)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
