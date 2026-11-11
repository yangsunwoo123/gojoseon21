/* 응답 만들기와 요청 검사에 쓰는 작은 도구들 */

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://cdn.jsdelivr.net",
  "font-src 'self' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'"
].join('; ');

export function securityHeaders(request) {
  const h = {
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
  if (new URL(request.url).protocol === 'https:') h['Strict-Transport-Security'] = 'max-age=15552000';
  return h;
}

export function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }, headers || {})
  });
}

export function fail(status, message) {
  return json({ ok: false, error: message }, status);
}

/* 다른 사이트에서 몰래 보낸 요청을 거절합니다. (우리 사이트 화면에서 보낸 요청만 통과) */
export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) return false;
  const site = request.headers.get('Sec-Fetch-Site');
  return !site || site === 'same-origin';
}

/* JSON 본문을 읽습니다. 형식이 다르거나 너무 크면 null */
export async function readJson(request, maxBytes) {
  const type = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!type.startsWith('application/json')) return null;
  if (Number(request.headers.get('Content-Length') || 0) > maxBytes) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch (e) {
    return null;
  }
}
