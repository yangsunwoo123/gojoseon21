import { servePage } from '../server/page.js';

/* 로그인 화면. 이미 로그인한 팀원에게는 계정 화면(비밀번호 바꾸기·로그아웃)을 보여 줍니다. */
export const onRequestGet = (ctx) => servePage(ctx, { page: 'login' });
export const onRequestHead = onRequestGet;
