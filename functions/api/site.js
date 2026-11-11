import { saveHandler } from '../../server/api.js';
import { cleanSite } from '../../server/validate.js';

/* 사이트 공통 내용(홈 문구, 프로젝트, 팀 순서, 문의, 사업자 정보) 저장 */
export const onRequestPut = (ctx) => saveHandler(ctx, 'site', cleanSite);
