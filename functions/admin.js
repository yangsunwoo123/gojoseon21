/* /admin 으로 들어오면 로그인 화면으로 보냅니다. */
export const onRequestGet = (ctx) => Response.redirect(new URL('/login', ctx.request.url).toString(), 302);
export const onRequestHead = onRequestGet;
