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

/* 인스타그램 아이디. '@아이디' 나 프로필 주소를 붙여 넣어도 아이디만 남깁니다. */
function insta(v, label, strict) {
  let s = text(v, 120, label, strict);
  if (!s) return '';
  s = s.replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  if (!/^[A-Za-z0-9._]{1,30}$/.test(s)) {
    bad(strict, label + ': 영문, 숫자, 밑줄(_), 마침표(.)로 30자까지 적어 주세요.');
    return '';
  }
  return s;
}

/* 시기. '2026.9', '2026-09', '2026/9', '2026년 9월' 처럼 적어도 '2026.09' 로 맞춥니다.
   기간은 '2026.09 - 2026.10' 으로 맞춥니다. ('~' 로 이어 적어도 되고, 끝은 '현재' 처럼 글자로 적거나 비워도 됩니다.)
   연도만 적었거나 다른 모양이면 적은 그대로 둡니다. */
const WHEN_ONE = /^(\d{4})\s*(?:년|[.\/-])\s*(\d{1,2})\s*(?:월|\.)?$/;
const WHEN_RANGE = /^(\d{4})\s*(?:년|[.\/-])\s*(\d{1,2})\s*(?:월|\.)?\s*(?:-|~|–|—|부터)\s*(.*)$/;
function yearMonth(y, m) {
  const month = +m;
  return month >= 1 && month <= 12 ? y + '.' + String(month).padStart(2, '0') : '';
}
function when(v, label, strict) {
  const s = text(v, 30, label, strict);
  let m = WHEN_ONE.exec(s);
  if (m) return yearMonth(m[1], m[2]) || s;
  m = WHEN_RANGE.exec(s);
  const from = m ? yearMonth(m[1], m[2]) : '';
  if (!from) return s;
  const rest = m[3].trim();
  const end = WHEN_ONE.exec(rest);
  if (end) {
    const to = yearMonth(end[1], end[2]);
    return to ? from + ' - ' + to : s;
  }
  /* 끝을 비웠거나 '현재' 처럼 숫자 없는 짧은 글로 적은 경우 */
  return /^\D{0,10}$/.test(rest) ? (from + ' - ' + rest).trim() : s;
}

/* '이름 + 주소' 줄의 목록 (꼬리말의 채널 링크, 팀원 프로필의 링크). 주소가 없는 줄은 저장하지 않습니다. */
function linkRows(v, what, strict) {
  const rows = [];
  for (const raw of list(v, 8, what, strict)) {
    const l = obj(raw);
    const label = text(l.label, 24, what + ' 이름', strict);
    const url = link(l.url, what + ' 주소', strict);
    if (!url) {
      if (label) bad(strict, what + ' ‘' + label + '’의 주소를 입력해 주세요.');
      continue;
    }
    rows.push({ label, url });
  }
  return rows;
}

/* 이력, 수상 · 자격증에 쓰는 '시기 + 내용' 줄의 목록.
   year 칸에는 시기를 적습니다. (이름은 연도만 적던 때의 것을 그대로 씁니다.) */
function dated(v, label, strict) {
  const rows = [];
  for (const raw of list(v, 30, label, strict)) {
    const r = obj(raw);
    const row = { year: when(r.year, label + ' 시기', strict), text: text(r.text, 160, label + ' 내용', strict) };
    if (row.year || row.text) rows.push(row);
  }
  return rows;
}

/* ---------- 사이트 공통 내용 ---------- */
export function cleanSite(input, strict) {
  if (strict && (!input || typeof input !== 'object' || Array.isArray(input))) {
    throw new ValidationError('저장할 내용이 올바르지 않습니다.');
  }
  const src = obj(input), c = obj(src.contact), b = obj(src.biz);

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

  /* 꼬리말의 채널 링크(인스타그램 · 깃허브 · 블로그 등). */
  const links = linkRows(src.links, '채널 링크', strict);

  /* 홈의 큰 문구, 제목 옆 한 줄 소개(projectsSub · teamSub), 문의 안내 문구(contact.text)는 없앴습니다.
     예전에 저장된 값이 들어와도 여기서 버려집니다. */
  return {
    teamAbout: text(src.teamAbout, 600, '팀 소개 글', strict, true),
    projects,
    team,
    links,
    contact: {
      email: email(c.email, '문의 이메일', strict),
      phone: phone(c.phone, '문의 전화', strict),
      kakao: text(c.kakao, 40, '카카오톡 ID', strict),
      instagram: insta(c.instagram, '인스타그램 아이디', strict)
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

  const history = dated(src.history, '이력', strict);
  const awards = dated(src.awards, '수상 · 자격증', strict);

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

  /* 링크(노션 · 블로그 · 깃허브 등) 여러 개. 예전에는 주소 하나(link)만 적을 수 있었습니다.
     그때 저장된 주소가 들어오면 목록의 한 줄로 옮깁니다. */
  const links = linkRows(src.links, '링크', strict);
  const old = link(src.link, '링크', strict);
  if (old && links.length < 8 && !links.some((l) => l.url === old)) links.push({ label: '', url: old });

  return {
    name,
    role: text(src.role, 40, '직함', strict),
    lead: src.lead === true,
    quote: text(src.quote, 120, '한마디', strict),
    photo: media(src.photo, '사진', strict),
    email: email(src.email, '이메일', strict),
    links,
    bio: text(src.bio, 1200, '소개', strict, true),
    skills, history, awards, projects, works
  };
}
