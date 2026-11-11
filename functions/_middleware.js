import { servePage } from '../server/page.js';

/* 모든 요청이 지나가는 곳: 어디에도 맞지 않는 주소(404)를 사이트 모양의 안내 페이지로 바꿔 줍니다.
   (모든 경로를 받는 [[path]].js 로 만들면 첫 화면 "/" 까지 가로채므로 미들웨어로 둡니다) */
export async function onRequest(ctx) {
  const res = await ctx.next();
  if (res.status !== 404) return res;
  const { method, headers } = ctx.request;
  const path = new URL(ctx.request.url).pathname;
  if (path.startsWith('/api/') || path.startsWith('/media/')) return res;
  if ((method === 'GET' || method === 'HEAD') && (headers.get('Accept') || '').includes('text/html')) {
    return servePage(ctx, { page: 'notfound' });
  }
  return res;
}
