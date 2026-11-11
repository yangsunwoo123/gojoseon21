import { json, fail, readJson } from '../../server/http.js';
import { attemptLogin, sessionCookie } from '../../server/auth.js';

export async function onRequestPost(ctx) {
  const body = await readJson(ctx.request, 2000);
  if (!body) return fail(400, '요청 형식이 올바르지 않습니다.');
  const r = await attemptLogin(ctx.env.DB, ctx.request, body.username, body.password);
  if (r.status !== 200) return fail(r.status, r.error);
  return json({ ok: true, name: r.user.name }, 200, { 'Set-Cookie': sessionCookie(ctx.request, r.token) });
}
