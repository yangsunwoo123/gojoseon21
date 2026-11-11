/* 저장하기 전에 내용을 검사하고 다듬습니다.
   strict = true  : 팀원이 저장할 때. 문제가 있으면 한국어 안내와 함께 거절합니다.
   strict = false : 화면에 보여 줄 때. 문제가 있는 값은 조용히 비우거나 잘라 냅니다.
   어느 쪽이든 여기서 정한 모양(필드·길이·주소 형식) 밖의 값은 저장되지도, 화면에 나가지도 않습니다. */

export class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}

const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const MEDIA = /^\/media\/[a-f0-9]{32}$/;
const TONES = ['ink', 'tint', 'soft'];
const ARTS = ['academy', 'kids'];

export const isId = (v) => typeof v === 'string' && ID.test(v);

function bad(strict, message) {
  if (strict) throw new ValidationError(message);
}

function obj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

function list(v, max, label, strict) {
  if (v == null) return [];
  if (!Array.isArray(v)) { bad(strict, label + ' 정보가 올바르지 않습니다.'); return []; }
  if (v.length > max) { bad(strict, label + '은(는) ' + max + '개까지 넣을 수 있습니다.'); return v.slice(0, max); }
  return v;
}

function text(v, max, label, strict, multi) {
  if (v == null) return '';
  if (typeof v !== 'string') { bad(strict, label + ' 값이 올바르지 않습니다.'); return ''; }
  let s = v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g, '');
  s = multi
    ? s.replace(/[ \t\u00a0]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    : s.replace(/\s+/g, ' ');
  s = s.trim();
  if (s.length > max) {
    bad(strict, label + ': ' + max + '자까지 쓸 수 있습니다. (지금 ' + s.length + '자)');
    s = s.slice(0, max);
  }
  return s;
}

function link(v, label, strict) {
  let s = text(v, 300, label, strict);
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let ok = /^https?:\/\/[^\s<>"'`]+$/i.test(s);
  if (ok) { try { ok = !!new URL(s).hostname; } catch (e) { ok = false; } }
  if (!ok) { bad(strict, label + ': 주소 형식이 올바르지 않습니다. (예: https://example.com)'); return ''; }
  return s;
}

function media(v, label, strict) {
  if (v == null || v === '') return '';
  if (typeof v !== 'string' || !MEDIA.test(v)) { bad(strict, label + ' 정보가 올바르지 않습니다. 이미지를 다시 올려 주세요.'); return ''; }
  return v;
}

function email(v, label, strict) {
  const s = text(v, 120, label, strict);
  if (!s) return '';
  if (!/^[^\s@<>"'`,;]+@[^\s@<>"'`,;]+\.[^\s@<>"'`,;]{2,}$/.test(s)) {
    bad(strict, label + ': 이메일 주소 형식이 올바르지 않습니다.');
    return '';
  }
  return s;
}

function phone(v, label, strict) {
  const s = text(v, 30, label, strict);
  if (!s) return '';
  if (!/^[0-9+\-() .]+$/.test(s)) { bad(strict, label + ': 전화번호는 숫자와 - 기호로 적어 주세요.'); return ''; }
  return s;
}

/* ---------- 사이트 공통 내용 ---------- */
export function cleanSite(input, strict) {
  if (strict && (!input || typeof input !== 'object' || Array.isArray(input))) {
    throw new ValidationError('저장할 내용이 올바르지 않습니다.');
  }
  const src = obj(input), h = obj(src.home), c = obj(src.contact), b = obj(src.biz);

  const projects = [];
  const seen = new Set();
  for (const raw of list(src.projects, 12, '프로젝트', strict)) {
    const p = obj(raw);
    if (!isId(p.id) || seen.has(p.id)) { bad(strict, '프로젝트 정보가 올바르지 않습니다.'); continue; }
    seen.add(p.id);
    const name = text(p.name, 60, '프로젝트 이름', strict);
    if (!name) bad(strict, '프로젝트 이름을 입력해 주세요.');
    projects.push({
      id: p.id,
      label: text(p.label, 30, '프로젝트 분류', strict),
      name,
      desc: text(p.desc, 400, '프로젝트 소개', strict, true),
      url: link(p.url, '프로젝트 바로가기 주소', strict),
      image: media(p.image, '프로젝트 그림', strict),
      art: ARTS.includes(p.art) ? p.art : '',
      tone: TONES.includes(p.tone) ? p.tone : 'soft'
    });
  }

  const team = [];
  for (const id of list(src.team, 24, '팀원', strict)) {
    if (!isId(id) || team.includes(id)) { bad(strict, '팀원 목록이 올바르지 않습니다.'); continue; }
    team.push(id);
  }

  return {
    home: {
      eyebrow: text(h.eyebrow, 40, '홈 머리글', strict),
      title1: text(h.title1, 60, '홈 제목 첫 줄', strict),
      titleEm: text(h.titleEm, 40, '홈 제목 강조', strict),
      title2: text(h.title2, 60, '홈 제목 끝', strict),
      sub: text(h.sub, 300, '홈 소개 문장', strict, true)
    },
    projectsSub: text(src.projectsSub, 120, '프로젝트 페이지 소개', strict),
    teamSub: text(src.teamSub, 120, '팀 페이지 소개', strict),
    projects,
    team,
    contact: {
      text: text(c.text, 200, '문의 안내 문구', strict),
      email: email(c.email, '문의 이메일', strict),
      phone: phone(c.phone, '문의 전화', strict)
    },
    biz: {
      name: text(b.name, 60, '상호', strict),
      ceo: text(b.ceo, 40, '대표', strict),
      regNo: text(b.regNo, 40, '사업자등록번호', strict),
      mailOrderNo: text(b.mailOrderNo, 60, '통신판매업신고', strict)
    }
  };
}

/* ---------- 팀원 프로필 ---------- */
export function cleanMember(input, strict) {
  if (strict && (!input || typeof input !== 'object' || Array.isArray(input))) {
    throw new ValidationError('저장할 내용이 올바르지 않습니다.');
  }
  const src = obj(input);

  const name = text(src.name, 40, '이름', strict);
  if (!name) bad(strict, '이름을 입력해 주세요.');

  const skills = [];
  for (const raw of list(src.skills, 16, '담당 분야', strict)) {
    const t = text(raw, 30, '담당 분야', strict);
    if (t) skills.push(t);
  }

  const history = [];
  for (const raw of list(src.history, 30, '이력', strict)) {
    const r = obj(raw);
    const row = { year: text(r.year, 12, '이력 연도', strict), text: text(r.text, 160, '이력 내용', strict) };
    if (row.year || row.text) history.push(row);
  }

  const projects = [];
  for (const raw of list(src.projects, 12, '참여 프로젝트', strict)) {
    const r = obj(raw);
    if (!isId(r.id) || projects.some((x) => x.id === r.id)) { bad(strict, '참여 프로젝트 정보가 올바르지 않습니다.'); continue; }
    projects.push({ id: r.id, role: text(r.role, 80, '맡은 역할', strict) });
  }

  const works = [];
  for (const raw of list(src.works, 12, '작업물', strict)) {
    const r = obj(raw);
    const w = {
      title: text(r.title, 60, '작업물 제목', strict),
      desc: text(r.desc, 160, '작업물 설명', strict),
      image: media(r.image, '작업물 이미지', strict),
      url: link(r.url, '작업물 주소', strict)
    };
    if (!w.title && !w.desc && !w.image && !w.url) continue;
    if (!w.title) bad(strict, '작업물 제목을 입력해 주세요.');
    works.push(w);
  }

  return {
    name,
    role: text(src.role, 40, '직함', strict),
    lead: src.lead === true,
    quote: text(src.quote, 120, '한마디', strict),
    photo: media(src.photo, '사진', strict),
    email: email(src.email, '이메일', strict),
    link: link(src.link, '링크', strict),
    bio: text(src.bio, 1200, '소개', strict, true),
    skills, history, projects, works
  };
}
