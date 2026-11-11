/* 올린 사진·이미지를 내보냅니다: /media/<id> */
const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

export async function onRequestGet(ctx) {
  const { request, env, params } = ctx;
  const id = String(params.id || '');
  if (!/^[a-f0-9]{32}$/.test(id) || !env.DB) return notFound();

  /* 같은 이미지는 다시 DB를 읽지 않도록 Cloudflare 캐시에 넣어 둡니다. */
  let cache = null;
  try { cache = caches.default; } catch (e) { cache = null; }
  if (cache) {
    const hit = await cache.match(request).catch(() => null);
    if (hit) return hit;
  }

  const row = await env.DB.prepare('SELECT type, bytes FROM media WHERE id = ?1').bind(id).first();
  if (!row || !row.bytes) return notFound();
  const bytes = row.bytes instanceof ArrayBuffer ? new Uint8Array(row.bytes) : Uint8Array.from(row.bytes);

  const res = new Response(bytes, {
    headers: {
      'Content-Type': row.type,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'"
    }
  });
  if (cache) ctx.waitUntil(cache.put(request, res.clone()).catch(() => {}));
  return res;
}
export const onRequestHead = onRequestGet;
