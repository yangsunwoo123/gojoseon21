import { json, fail } from '../../../server/http.js';
import { saveHandler, currentUser, LOGIN_REQUIRED } from '../../../server/api.js';
import { cleanMember, isId } from '../../../server/validate.js';
import { loadAll, deleteDoc } from '../../../server/store.js';

const BAD_ID = '팀원 주소가 올바르지 않습니다.';

/* 팀원 프로필 저장 */
export function onRequestPut(ctx) {
  const id = String(ctx.params.id || '');
  if (!isId(id)) return fail(400, BAD_ID);
  return saveHandler(ctx, 'member:' + id, cleanMember);
}

/* 팀원 프로필 삭제 (팀 목록에서 먼저 뺀 뒤에만 지울 수 있습니다) */
export async function onRequestDelete(ctx) {
  const user = await currentUser(ctx);
  if (!user) return fail(401, LOGIN_REQUIRED);
  const id = String(ctx.params.id || '');
  if (!isId(id)) return fail(400, BAD_ID);
  const all = await loadAll(ctx.env.DB);
  if (all.site.data.team.includes(id)) return fail(409, '팀 목록에 있는 팀원은 지울 수 없습니다. 팀 페이지에서 먼저 삭제해 주세요.');
  await deleteDoc(ctx.env.DB, 'member:' + id);
  return json({ ok: true });
}
