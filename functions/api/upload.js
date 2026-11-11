import { json, fail } from '../../server/http.js';
import { currentUser, LOGIN_REQUIRED } from '../../server/api.js';

const MAX_BYTES = 1500000;   // 한 장에 1.5MB까지 (화면에서 미리 줄여서 올립니다)
const MAX_FILES = 500;

/* 파일 앞부분을 보고 실제 이미지 종류를 확인합니다. */
function sniff(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return '';
}

/* 사진·이미지 올리기 (로그인한 팀원만) */
export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  const user = await currentUser(ctx);
  if (!user) return fail(401, LOGIN_REQUIRED);

  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/webp') {
    return fail(415, 'JPG, PNG, WebP 이미지만 올릴 수 있습니다.');
  }
  const tooBig = '이미지가 너무 큽니다. 1.5MB 이하로 줄여 주세요.';
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BYTES) return fail(413, tooBig);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return fail(400, '이미지가 비어 있습니다.');
  if (bytes.length > MAX_BYTES) return fail(413, tooBig);
  if (sniff(bytes) !== type) return fail(415, '이미지 파일이 올바르지 않습니다.');

  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM media').first('n');
  if (count >= MAX_FILES) return fail(507, '이미지 저장 공간이 가득 찼습니다. 관리자에게 알려 주세요.');

  const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  await env.DB.prepare('INSERT INTO media (id, type, bytes, size, uploaded_at, uploaded_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(id, type, bytes.buffer, bytes.length, Date.now(), user.username).run();
  return json({ ok: true, url: '/media/' + id }, 201);
}
