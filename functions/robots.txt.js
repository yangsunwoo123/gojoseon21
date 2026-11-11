/* 검색 엔진 안내문: 모든 페이지를 읽어도 되고, 저장용 주소(/api/)만 제외합니다.
   로그인 페이지는 페이지 안의 noindex 표시로 검색 결과에서 빠집니다. */
import { siteOrigin } from '../server/page.js';

export function onRequestGet({ request, env }) {
  const body = 'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ' + siteOrigin(request, env) + '/sitemap.xml\n';
  return new Response(request.method === 'HEAD' ? null : body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
export const onRequestHead = onRequestGet;
