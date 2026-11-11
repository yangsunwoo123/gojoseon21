/* 방문자에게 보여 줄 페이지를 서버에서 만들어 보냅니다. */
import { renderDocument } from '../public/render.js';
import { loadAll } from './store.js';
import { getUser } from './auth.js';
import { securityHeaders } from './http.js';

export async function servePage(ctx, view) {
  const { request, env } = ctx;
  const [all, user] = await Promise.all([loadAll(env.DB), getUser(request, env.DB)]);

  const members = {};
  for (const id in all.members) members[id] = all.members[id].data;
  const data = { site: all.site.data, members };

  let status = 200;
  if (view.page === 'notfound') status = 404;
  if (view.page === 'member' && !members[view.id]) status = 404;

  /* 편집에 필요한 데이터와 편집 스크립트는 로그인한 팀원에게만 넣어 보냅니다.
     (이것은 편의일 뿐이고, 실제 차단은 저장 API 가 요청마다 로그인 여부를 확인해서 합니다.) */
  let boot = '';
  if (user && view.page !== 'login') {
    boot = JSON.stringify({
      view,
      user: { name: user.name, username: user.username },
      docs: { site: all.site, members: all.members }
    }).replace(/</g, '\\u003c');
  }

  const html = renderDocument(view, data, { user: user ? { name: user.name } : null, boot });
  const headers = Object.assign(securityHeaders(request), {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': user || view.page === 'login' ? 'private, no-store' : 'no-cache',
    'Vary': 'Cookie'
  });
  return new Response(request.method === 'HEAD' ? null : html, { status, headers });
}
