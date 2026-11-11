import { servePage } from '../server/page.js';

export const onRequestGet = (ctx) => servePage(ctx, { page: 'contact' });
export const onRequestHead = onRequestGet;
