import { servePage } from '../../server/page.js';

export const onRequestGet = (ctx) => servePage(ctx, { page: 'team' });
export const onRequestHead = onRequestGet;
