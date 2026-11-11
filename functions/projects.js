import { servePage } from '../server/page.js';

export const onRequestGet = (ctx) => servePage(ctx, { page: 'projects' });
export const onRequestHead = onRequestGet;
