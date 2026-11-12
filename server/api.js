/* 저장 API 들이 함께 쓰는 부분 */
import { json, fail, readJson } from './http.js';
import { getUser } from './auth.js';
import { saveDoc } from './store.js';
import { ValidationError } from './validate.js';

export const LOGIN_REQUIRED = '로그인이 필요합니다.';

/* 내용을 바꾸는 모든 요청은 여기서 로그인 여부를 다시 확인합니다.
   임시 비밀번호로 들어와 아직 새 비밀번호를 정하지 않은 사람은 여기서 걸러집니다. */
export function currentUser(ctx) {
  return getUser(ctx.request, ctx.env.DB);
}

/* 비밀번호 바꾸기 전용: 임시 비밀번호로 들어온 사람도 받아들입니다. 다른 곳에서는 쓰지 않습니다. */
export function accountUser(ctx) {
  return getUser(ctx.request, ctx.env.DB, { temp: true });
}

/* 문서 하나 저장: 로그인 확인 → 내용 검사 → 버전 확인 후 저장 */
export async function saveHandler(ctx, key, clean) {
  const user = await currentUser(ctx);
  if (!user) return fail(401, LOGIN_REQUIRED);

  const body = await readJson(ctx.request, 300000);
  if (!body || !Number.isInteger(body.version) || body.version < 0) {
    return fail(400, '요청 형식이 올바르지 않습니다.');
  }

  let data;
  try {
    data = clean(body.data, true);
  } catch (e) {
    if (e instanceof ValidationError) return fail(400, e.message);
    throw e;
  }

  const version = await saveDoc(ctx.env.DB, key, data, body.version, user.username);
  if (version === null) {
    return fail(409, '다른 팀원이 먼저 수정했습니다. 새로고침한 뒤 다시 수정해 주세요.');
  }
  return json({ ok: true, version, data });
}
