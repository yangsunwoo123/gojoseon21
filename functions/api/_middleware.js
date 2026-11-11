import { fail, sameOrigin } from '../../server/http.js';

/* /api/ 아래 모든 요청이 먼저 지나가는 곳 */
export async function onRequest(ctx) {
  const method = ctx.request.method;
  if (method !== 'GET' && method !== 'HEAD' && !sameOrigin(ctx.request)) {
    return fail(403, '허용되지 않은 요청입니다.');
  }
  if (!ctx.env.DB) {
    return fail(503, '서버 설정(데이터베이스 연결)이 아직 끝나지 않았습니다.');
  }
  try {
    return await ctx.next();
  } catch (e) {
    console.error('api error:', e && (e.stack || e.message));
    return fail(500, '서버에서 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.');
  }
}
