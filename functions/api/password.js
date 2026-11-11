import { json, fail, readJson } from '../../server/http.js';
import { changePassword } from '../../server/auth.js';
import { currentUser, LOGIN_REQUIRED } from '../../server/api.js';

export async function onRequestPost(ctx) {
  const user = await currentUser(ctx);
  if (!user) return fail(401, LOGIN_REQUIRED);
  const body = await readJson(ctx.request, 2000);
  if (!body) return fail(400, '요청 형식이 올바르지 않습니다.');
  const r = await changePassword(ctx.env.DB, user, body.current, body.next);
  if (r.status !== 200) return fail(r.status, r.error);
  return json({ ok: true });
}
