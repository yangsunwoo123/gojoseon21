import { servePage } from '../server/page.js';

export const onRequestGet = (ctx) => servePage(ctx, { page: 'home' });
export const onRequestHead = onRequestGet;
