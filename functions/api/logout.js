import { json } from '../../server/http.js';
import { endSession, clearCookie } from '../../server/auth.js';

export async function onRequestPost(ctx) {
  await endSession(ctx.request, ctx.env.DB);
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(ctx.request) });
}
