import { servePage } from '../../server/page.js';
import { isId } from '../../server/validate.js';

/* 팀원 개인 페이지: /team/<id> */
export const onRequestGet = (ctx) => {
  const id = String(ctx.params.id || '');
  return servePage(ctx, isId(id) ? { page: 'member', id } : { page: 'notfound' });
};
export const onRequestHead = onRequestGet;
