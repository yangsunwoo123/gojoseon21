/* 검색 엔진에 알려 주는 페이지 목록. 팀원이 늘거나 줄면 저절로 따라 바뀝니다. */
import { loadAll } from '../server/store.js';
import { siteOrigin } from '../server/page.js';

const xml = (s) => String(s).replace(/[&<>"']/g, (ch) => '&#' + ch.charCodeAt(0) + ';');

export async function onRequestGet({ request, env }) {
  const origin = siteOrigin(request, env);
  const all = await loadAll(env.DB);
  const paths = ['/', '/projects', '/team'];
  for (const id of all.site.data.team || []) {
    if (all.members[id]) paths.push('/team/' + id);
  }
  paths.push('/contact');
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths.map((p) => '  <url><loc>' + xml(origin + p) + '</loc></url>\n').join('') +
    '</urlset>\n';
  return new Response(request.method === 'HEAD' ? null : body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
export const onRequestHead = onRequestGet;
