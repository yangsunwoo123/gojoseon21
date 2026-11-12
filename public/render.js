/* 고조선 — 화면 템플릿
   서버(Cloudflare Pages Functions)가 페이지를 만들 때와, 로그인한 팀원의 브라우저가
   편집 화면을 다시 그릴 때 같은 코드를 씁니다. 그래서 화면 마크업은 여기 한 곳에만 있습니다.

   d = { site, members }   site: 사이트 공통 내용, members: { 팀원id: 프로필 }
   o = { edit, user }      edit 가 true 면 편집용 표시(data-e, 추가/삭제 버튼)를 함께 그립니다. */

import { BRANDS } from './brands.js';

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* 주소는 http(s) 만, 이미지는 우리 서버의 /media/ 만 통과시킵니다. */
function webUrl(u) {
  const s = String(u || '').trim();
  return /^https?:\/\/[^\s<>"'`]+$/i.test(s) ? s : '';
}
function mediaUrl(u) {
  const s = String(u || '');
  return /^\/media\/[a-f0-9]{32}$/.test(s) ? s : '';
}
function hostOf(u) {
  try {
    const x = new URL(u);
    return (x.host + (x.pathname === '/' ? '' : x.pathname)).replace(/^www\./, '');
  } catch (e) { return ''; }
}

/* 프로필 링크. 주소를 보고 어떤 서비스인지 알아봅니다. (서비스 목록과 로고는 brands.js)
   아는 서비스는 로고로, 그 밖의 링크는 적어 넣은 이름(비워 두면 주소의 도메인)을 글자로 보여 줍니다. */
function linkHost(u) {
  let s = String(u || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const host = new URL(s).hostname.toLowerCase().replace(/^www\./, '');
    return host.includes('.') ? host : '';
  } catch (e) { return ''; }
}
function brandOf(u) {
  const host = linkHost(u);
  return (host && BRANDS.find((b) => b[1].test(host))) || null;
}
export function linkName(u) {
  const b = brandOf(u);
  return b ? b[0] : linkHost(u);
}
export function linkLogo(u) {
  const b = brandOf(u);
  return b && b[2] ? '<svg class="brand" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + b[2] + '"/></svg>' : '';
}
/* 편집 화면의 이름 칸에 흐리게 보이는 안내: 로고가 있는 서비스는 이름이 선택 사항, 그 밖에는 저절로 붙을 이름 */
export function linkHint(u) {
  return linkLogo(u) ? '이름 (선택)' : (linkName(u) || '이름');
}

/* 편집 가능한 글자 표시: data-e="문서|경로" */
function E(o, doc, path, ph, multi) {
  if (!o.edit) return '';
  return ' data-e="' + esc(doc) + '|' + esc(path) + '" data-ph="' + esc(ph) + '"' + (multi ? ' data-ml' : '');
}

const I = {
  right: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" stroke="currentColor" stroke-width="1.6"/></svg>',
  left: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.5 8h-11M7 3.5 2.5 8 7 12.5" stroke="currentColor" stroke-width="1.6"/></svg>',
  out: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M5 13 13 5M6 5h7v7" stroke="currentColor" stroke-width="1.6"/></svg>',
  image: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect x="5.75" y="8.75" width="28.5" height="22.5" stroke="currentColor" stroke-width="1.5"/><circle cx="14" cy="16" r="2.5" fill="currentColor"/><path d="M6 28l8.5-8 5.5 5 4.5-4.5L34 30" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  user: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="7" r="3.4" stroke="currentColor" stroke-width="1.5"/><path d="M3.6 17c.7-3 3.2-4.8 6.4-4.8s5.7 1.8 6.4 4.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  bars: '<svg class="bars" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M3 7.5h16M3 14.5h16" stroke="currentColor" stroke-width="1.6"/></svg>',
  x: '<svg class="x" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M5 5l12 12M17 5L5 17" stroke="currentColor" stroke-width="1.6"/></svg>',
  /* 연락처 아이콘 (명함과 같은 방식: 전화 · 카카오톡 · 인스타그램, 그리고 이메일) */
  mail: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5.25" width="18" height="13.5" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M3.6 6.6 12 13l8.4-6.4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  phone: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z" fill="currentColor"/></svg>',
  talk: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.4c-5.3 0-9.6 3.3-9.6 7.4 0 2.6 1.8 4.9 4.4 6.2l-.9 3.6 4-2.6c.7.1 1.4.2 2.1.2 5.3 0 9.6-3.3 9.6-7.4S17.3 3.4 12 3.4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5.9 9.1h2.7M7.25 9.1v3.5M9.3 12.6l1.35-3.5L12 12.6M9.8 11.6h1.7M13 9.1v3.5h1.7M15.7 9.1v3.5M17.9 9.1l-2.1 1.9 2.2 1.6" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  insta: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.3" y="3.3" width="17.4" height="17.4" rx="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.1" stroke="currentColor" stroke-width="1.6"/><circle cx="17.1" cy="6.9" r="1.15" fill="currentColor"/></svg>'
};

const num = (i) => String(i + 1).padStart(2, '0');

/* 사진 자리. 사진이 없으면 이름 첫 글자를 크게 보여 줍니다. */
function portrait(m, alt, no) {
  const src = mediaUrl(m && m.photo);
  if (src) return '<div class="portrait"><img src="' + src + '" alt="' + esc(alt || '') + '"></div>';
  const first = Array.from(String((m && m.name) || '').trim())[0] || '';
  return '<div class="portrait portrait--empty' + (m && m.lead ? ' portrait--lead' : '') + '" aria-hidden="true">' +
    (no ? '<span class="idx">' + no + '</span>' : '') +
    '<span class="initial">' + esc(first) + '</span></div>';
}
function teamList(d) {
  return (d.site.team || []).filter((id) => d.members[id]).map((id) => ({ id: id, m: d.members[id] }));
}
function edBtn(label, act, arg, cls, extra) {
  return '<button type="button" class="ed-btn' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' +
    (arg === undefined ? '' : ' data-arg="' + esc(arg) + '"') + (extra || '') + '>' + label + '</button>';
}
function edX(act, arg, label) {
  return '<button type="button" class="ed-x" data-act="' + act + '" data-arg="' + esc(arg) + '" aria-label="' + esc(label) + '">×</button>';
}

/* 구역 머리말: 검은 줄 + 작은 라벨(번호 · 영문) + 큰 제목. 제목 옆의 한 줄 소개 문구는 두지 않습니다.
   sub 는 제목 오른쪽 칸에 놓을 내용(문의의 연락처 목록, 로그인 안내)이 있을 때만 씁니다. */
function labels(a, b) {
  return '<div class="label" aria-hidden="true"><span>' + a + '</span><span>' + b + '</span></div>';
}
function head(tag, no, en, title, sub, cls, id) {
  return '<div class="sec-head' + (cls ? ' ' + cls : '') + '">' + labels(no, en) +
    '<' + tag + (id ? ' id="' + id + '"' : '') + '>' + title + '</' + tag + '>' + (sub || '') + '</div>';
}

/* ---------- 공통 머리말 / 꼬리말 ---------- */
function header(view, o) {
  const cur = (p) => (view.page === p ? ' aria-current="page"' : (p === 'team' && view.page === 'member' ? ' aria-current="true"' : ''));
  return '<header class="site-header"><div class="wrap bar">' +
    '<a class="logo" href="/" aria-label="고조선 홈"><img src="/logo.png" width="67" height="48" alt="">고조선</a>' +
    '<nav class="nav" id="site-nav" aria-label="주 메뉴"><ul>' +
    '<li><a href="/projects"' + cur('projects') + '>프로젝트</a></li>' +
    '<li><a href="/team"' + cur('team') + '>팀</a></li>' +
    '<li><a href="/contact"' + cur('contact') + '>문의</a></li>' +
    '</ul></nav>' +
    '<div class="util">' +
    '<a class="util-btn" href="/login" aria-label="' + (o.user ? '내 계정' : '팀원 로그인') + '">' + I.user + '</a>' +
    '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="메뉴 열기">' + I.bars + I.x + '</button>' +
    '</div></div></header>';
}

/* 꼬리말: 위쪽에 이름 · 채널 링크 · 메뉴 · 서비스 바로가기, 아래쪽에 사업자 정보.
   서비스 목록은 프로젝트에 적힌 바로가기 주소로 저절로 만들어집니다. */
export function renderFooter(d, o) {
  o = o || {};
  const s = d.site, b = s.biz || {}, c = s.contact || {}, links = s.links || [];
  const item = (label, key, ph) => ((b[key] || o.edit)
    ? '<li><b>' + label + '</b><span' + E(o, 'site', 'biz.' + key, ph) + '>' + esc(b[key]) + '</span></li>' : '');
  const ext = (url, text) => '<a href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="' + esc(text) + ' (새 창)">' +
    esc(text) + I.out + '</a>';

  /* 채널 링크(인스타그램 · 깃허브 · 블로그 등). 이름을 비워 두면 주소를 짧게 줄여 보여 줍니다. */
  let channels = '';
  if (o.edit) {
    channels = '<div class="foot-links foot-links--edit"><span class="label">Links · 인스타그램, 깃허브, 블로그 등</span><ul>' +
      links.map((l, i) => '<li><span' + E(o, 'site', 'links.' + i + '.label', '이름 (예: Instagram)') + '>' + esc(l.label) + '</span>' +
        '<span' + E(o, 'site', 'links.' + i + '.url', 'https://…') + '>' + esc(l.url) + '</span>' +
        edX('link-del', i, '링크 삭제') + '</li>').join('') + '</ul>' +
      edBtn('＋ 링크 추가', 'link-add') + '</div>';
  } else {
    const shown = links.map((l) => ({ url: webUrl(l.url), label: l.label })).filter((l) => l.url);
    if (shown.length) {
      channels = '<ul class="foot-links" aria-label="채널">' +
        shown.map((l) => '<li>' + ext(l.url, l.label || hostOf(l.url)) + '</li>').join('') + '</ul>';
    }
  }
  const services = (s.projects || []).map((p) => ({ name: p.name, url: webUrl(p.url) })).filter((p) => p.name && p.url);

  return '<footer class="site-footer"><div class="wrap">' +
    '<div class="foot-top">' +
    '<div class="foot-brand"><a class="foot-logo" href="/">고조선</a>' + channels + '</div>' +
    '<nav class="foot-col" aria-label="꼬리말 메뉴"><span class="label" aria-hidden="true">Menu</span><ul>' +
    '<li><a href="/projects">프로젝트</a></li><li><a href="/team">팀</a></li><li><a href="/contact">문의</a></li></ul></nav>' +
    (services.length ? '<div class="foot-col foot-col--wide"><span class="label" aria-hidden="true">Services</span><ul aria-label="서비스 바로가기">' +
      services.map((p) => '<li>' + ext(p.url, p.name) + '</li>').join('') + '</ul></div>' : '') +
    '</div>' +
    '<div class="foot-bottom"><ul class="biz">' +
    item('상호', 'name', '상호') +
    item('대표', 'ceo', '대표자') +
    item('사업자등록번호', 'regNo', '000-00-00000') +
    item('통신판매업신고', 'mailOrderNo', '신고번호') +
    (c.email ? '<li><b>이메일</b><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></li>' : '') +
    (c.phone ? '<li><b>전화</b><a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + '</a></li>' : '') +
    '</ul><span>© ' + new Date().getFullYear() + ' ' + esc(b.name || '고조선') + '. All rights reserved.</span></div>' +
    '</div></footer>';
}

/* ---------- 프로젝트 줄 (홈 · 프로젝트 페이지 공용) ----------
   opt.h: 제목 태그, opt.img: 올린 그림 보이기, opt.tools: 편집 버튼, opt.ids: 줄마다 id 달기
   그림이 있는 줄(proj--media)은 왼쪽에 글, 오른쪽에 그림이 놓입니다. */
function projRows(s, o, opt) {
  const n = s.projects.length, H = opt.h || 'h2';
  return s.projects.map((p, i) => {
    const doc = 'projects.' + i + '.';
    const url = webUrl(p.url), host = hostOf(url);
    const img = opt.img ? mediaUrl(p.image) : '';
    const linked = !o.edit && !!url;
    let link;
    if (o.edit) {
      link = '<div class="proj__link proj__link--edit"><span class="proj__hint">바로가기 주소</span>' +
        '<span class="proj__url"' + E(o, 'site', doc + 'url', 'https://…') + '>' + esc(p.url) + '</span></div>';
    } else if (url) {
      link = '<div class="proj__link" aria-hidden="true"><span class="proj__go">바로가기 ' + I.out + '</span>' +
        '<span class="proj__url">' + esc(host) + '</span></div>';
    } else {
      link = '<div class="proj__link proj__link--off"><span class="proj__url">준비 중</span></div>';
    }
    const tools = (o.edit && opt.tools) ? '<div class="ed-tools">' +
      edBtn(p.image ? '그림 바꾸기' : '그림 올리기', 'proj-image', i) +
      (p.image ? edBtn('그림 빼기', 'proj-image-del', i) : '') +
      edBtn('↑', 'proj-move', i + ',-1', 'ed-btn--icon', ' aria-label="위로 옮기기"' + (i === 0 ? ' disabled' : '')) +
      edBtn('↓', 'proj-move', i + ',1', 'ed-btn--icon', ' aria-label="아래로 옮기기"' + (i === n - 1 ? ' disabled' : '')) +
      edBtn('삭제', 'proj-del', i, 'ed-btn--danger') + '</div>' : '';
    return '<article class="proj' + (linked ? ' proj--link' : '') + (img ? ' proj--media' : '') + ((p.label || o.edit) ? '' : ' proj--nocat') + '"' +
      (opt.ids ? ' id="' + esc(p.id) + '"' : '') + '>' +
      '<span class="proj__no label" aria-hidden="true">' + num(i) + '</span>' +
      '<div class="proj__main">' +
      ((p.label || o.edit) ? '<p class="proj__cat"><span' + E(o, 'site', doc + 'label', '분류') + '>' + esc(p.label) + '</span></p>' : '') +
      '<' + H + E(o, 'site', doc + 'name', '프로젝트 이름') + '>' +
      (linked
        ? '<a href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="' + esc(p.name) + ' 바로가기 (' + esc(host) + ', 새 창)">' + esc(p.name) + '</a>'
        : esc(p.name)) +
      '</' + H + '></div>' +
      (img ? '<div class="proj__img"><img src="' + img + '" alt="' + esc(p.name) + ' 화면"' +
        (i ? ' loading="lazy"' : '') + ' decoding="async"></div>' : '') +
      ((p.desc || o.edit) ? '<p class="proj__desc ml"' + E(o, 'site', doc + 'desc', '프로젝트를 한두 문장으로 소개해 주세요.', true) + '>' + esc(p.desc) + '</p>' : '') +
      link + tools + '</article>';
  }).join('');
}

/* ---------- 팀원 카드 (홈 · 팀 페이지 공용) ---------- */
function memberCards(list, o, opt) {
  const H = opt.h || 'h2';
  return list.map((x, i) => {
    const m = x.m;
    const tools = (o.edit && opt.tools) ? '<div class="ed-tools">' +
      edBtn('←', 'member-move', x.id + ',-1', 'ed-btn--icon', ' aria-label="앞으로 옮기기"' + (i === 0 ? ' disabled' : '')) +
      edBtn('→', 'member-move', x.id + ',1', 'ed-btn--icon', ' aria-label="뒤로 옮기기"' + (i === list.length - 1 ? ' disabled' : '')) +
      edBtn('삭제', 'member-del', x.id, 'ed-btn--danger') + '</div>' : '';
    return '<li><a class="member' + (m.lead ? ' is-lead' : '') + '" href="/team/' + esc(x.id) + '">' + portrait(m, '', num(i)) +
      '<div class="member__top"><div><' + H + '>' + esc(m.name) + '</' + H + '>' +
      '<p class="member__role">' + (m.lead ? '<span class="lead-label">' + esc(m.role) + '</span>' : esc(m.role)) + '</p></div>' +
      '<span class="member__go" aria-hidden="true">' + I.right + '</span></div>' +
      (opt.quote && m.quote ? '<p class="member__quote">' + esc(m.quote) + '</p>' : '') +
      '</a>' + tools + '</li>';
  }).join('');
}

/* ---------- 홈 ---------- */
function home(d, o) {
  const s = d.site, list = teamList(d), look = {}, c = s.contact || {};
  const hasP = s.projects.length > 0, hasT = list.length > 0, hasC = !!(c.email || c.phone || c.kakao || c.instagram);
  const note = (text, href, label) => (o.edit
    ? '<p class="ed-note">' + text + ' <a href="' + href + '">' + label + '</a>에서 고칩니다.</p>' : '');

  /* 큰 문구 없이 목차(01 프로젝트, 02 팀)부터 바로 시작합니다. 맨 위 구역에만 위 여백을 줍니다. */
  return '<div class="home"><h1 class="sr-only">고조선</h1>' +
    (hasP ? '<section class="section" aria-labelledby="home-projects">' +
      head('h2', '01', 'Projects', '프로젝트', '', 'sec-head--page', 'home-projects') +
      note('프로젝트 목록은', '/projects', '프로젝트 페이지') +
      '<div class="projects">' + projRows(s, look, { h: 'h3', img: true }) + '</div>' +
      '<p class="more"><a href="/projects">프로젝트 전체 보기 ' + I.right + '</a></p></section>' : '') +

    (hasT ? '<section class="section" aria-labelledby="home-team">' +
      head('h2', '02', 'Team', '팀', '', hasP ? '' : 'sec-head--page', 'home-team') +
      note('팀원 목록과 프로필은', '/team', '팀 페이지') +
      '<ul class="team">' + memberCards(list, look, { h: 'h3' }) + '</ul>' +
      '<p class="more"><a href="/team">팀 소개 보기 ' + I.right + '</a></p></section>' : '') +

    (!hasP && !hasT ? '<p class="empty">준비 중입니다. 곧 소개하겠습니다.</p>' : '') +

    /* 맨 끝은 연락처로 마무리합니다. 메뉴의 세 항목(프로젝트 · 팀 · 문의)이 홈에도 같은 순서로 놓입니다. */
    (hasC ? '<section class="section" aria-labelledby="home-contact">' +
      head('h2', '03', 'Contact', '문의', contactList(c, look), 'sec-head--contact', 'home-contact') +
      note('연락처는', '/contact', '문의 페이지') + '</section>' : '') +
    '</div>';
}

/* ---------- 프로젝트 ---------- */
function projects(d, o) {
  const s = d.site, n = s.projects.length;
  return head('h1', '01', 'Projects', '프로젝트', '', 'sec-head--page') +
    (n || o.edit ? '<div class="projects">' + projRows(s, o, { h: 'h2', img: true, tools: true, ids: true }) + '</div>' : '') +
    (o.edit ? '<button type="button" class="ed-add" data-act="proj-add">＋ 프로젝트 추가</button>' : '') +
    (!o.edit && !n ? '<p class="empty">준비 중입니다. 곧 프로젝트를 소개하겠습니다.</p>' : '');
}

/* ---------- 팀 ---------- */
function team(d, o) {
  const s = d.site, list = teamList(d);
  return head('h1', '02', 'Team', '팀', '', 'sec-head--page') +
    /* 팀 소개 글: 적어 두었을 때만 보입니다. */
    ((s.teamAbout || o.edit) ? '<p class="team-about ml"' + E(o, 'site', 'teamAbout', '팀을 두세 문장으로 소개해 주세요. (비워 두면 보이지 않습니다)', true) + '>' + esc(s.teamAbout) + '</p>' : '') +
    '<ul class="team">' + memberCards(list, o, { h: 'h2', quote: true, tools: true }) +
    (o.edit ? '<li><button type="button" class="ed-add" data-act="member-add">＋ 팀원 추가</button></li>' : '') +
    '</ul>';
}

/* ---------- 팀원 개인 페이지 ---------- */
function member(d, id, o) {
  const list = teamList(d);
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return notFound('팀원을 찾을 수 없습니다.', '주소가 올바르지 않거나 삭제된 프로필입니다. 팀 페이지에서 다시 선택해 주세요.', '/team', '팀으로 돌아가기');
  const m = list[i].m, doc = 'member:' + id, ed = !!o.edit;
  const skills = m.skills || [], history = m.history || [], awards = m.awards || [], works = m.works || [], joined = m.projects || [];
  const links = m.links || [];
  const sec =(cls, title, body) => '<section class="p-sec ' + cls + '" aria-label="' + title + '">' +
    '<h2 class="p-sec__title">' + title + '</h2><div class="p-sec__body">' + body + '</div></section>';

  let h = '<div class="profile">' +
    '<div class="p-bar"><a class="back" href="/team">' + I.left + '팀으로 돌아가기</a>' +
    '<span class="label" aria-hidden="true">Team · ' + num(i) + ' / ' + num(list.length - 1) + '</span></div>';

  /* 사진 + 이름 */
  h += '<div class="p-head"><div class="p-photo">' + portrait(m, m.name + ' 사진') +
    (ed ? '<div class="ed-tools">' + edBtn(m.photo ? '사진 바꾸기' : '사진 올리기', 'photo') + (m.photo ? edBtn('사진 빼기', 'photo-del', undefined, 'ed-btn--danger') : '') + '</div>' : '') +
    '</div><div class="p-intro">' +
    '<h1' + E(o, doc, 'name', '이름') + '>' + esc(m.name) + '</h1>' +
    '<p class="p-role"><span' + (m.lead ? ' class="lead-label"' : '') + E(o, doc, 'role', '직함') + '>' + esc(m.role) + '</span></p>' +
    (ed ? '<label class="ed-check"><input type="checkbox" data-act="lead"' + (m.lead ? ' checked' : '') + '> 팀장으로 표시</label>' : '') +
    ((m.quote || ed) ? '<blockquote class="p-quote"' + E(o, doc, 'quote', '한마디를 적어 주세요.') + '>' + esc(m.quote) + '</blockquote>' : '');
  /* 이메일 + 링크(노션 · 블로그 · 깃허브 등) 여러 개.
     이메일은 'e-mail' 뒤에 밑줄 친 주소로 보여 주고, 누르면 주소가 복사됩니다. (site.js)
     링크는 주소를 보여 주지 않습니다. 아는 서비스(노션 · 네이버 블로그 · 티스토리 · 깃허브 …)는 로고로,
     그 밖의 링크는 적어 넣은 이름으로 보여 주고, 누르면 그 페이지가 새 창으로 열립니다. 로고가 앞에, 글자 링크가 뒤에 옵니다. */
  if (ed) {
    h += '<div class="p-links">' +
      '<div class="ed-field"><b>이메일</b><span' + E(o, doc, 'email', 'name@example.com') + '>' + esc(m.email) + '</span></div>' +
      '<div class="ed-field"><b>링크</b><div class="ed-links"><ul>' +
      links.map((l, n) => '<li><span class="ed-links__logo" aria-hidden="true">' + linkLogo(l.url) + '</span>' +
        '<span' + E(o, doc, 'links.' + n + '.url', '주소 (https://…)') + '>' + esc(l.url) + '</span>' +
        '<span' + E(o, doc, 'links.' + n + '.label', linkHint(l.url)) + '>' + esc(l.label) + '</span>' +
        edX('mlink-del', n, '링크 삭제') + '</li>').join('') + '</ul>' +
      edBtn('＋ 링크 추가', 'mlink-add') + '</div></div></div>';
  } else {
    const shown = links.map((l) => ({ url: webUrl(l.url), label: l.label })).filter((l) => l.url)
      .map((l) => ({ url: l.url, label: l.label, logo: linkLogo(l.url), site: linkName(l.url) }));
    const one = (l) => {
      const a = '<a href="' + esc(l.url) + '" target="_blank" rel="noopener"';
      if (l.logo) {
        return '<li>' + a + ' class="p-brand" title="' + esc(l.site) + '" aria-label="' + esc(l.label ? l.label + ', ' + l.site : l.site) + ' (새 창)">' +
          l.logo + (l.label ? '<span>' + esc(l.label) + '</span>' : '') + '</a></li>';
      }
      const name = l.label || l.site;
      return '<li>' + a + ' aria-label="' + esc(name) + ' (새 창)"><span>' + esc(name) + '</span>' + I.out + '</a></li>';
    };
    if (m.email || shown.length) {
      h += '<div class="p-links">' +
        (m.email ? '<p class="p-mail"><span class="p-mail__k">e-mail</span>' +
          '<a class="p-mail__v" href="mailto:' + esc(m.email) + '" data-copy="' + esc(m.email) + '" title="누르면 주소가 복사됩니다">' + esc(m.email) + '</a>' +
          '<span class="p-mail__ok" role="status"></span></p>' : '') +
        (shown.length ? '<ul class="p-linklist" aria-label="링크">' +
          shown.filter((l) => l.logo).map(one).join('') + shown.filter((l) => !l.logo).map(one).join('') + '</ul>' : '') + '</div>';
    }
  }
  h += '</div></div>';

  /* 소개 · 담당 분야 · 이력 · 수상/자격증 */
  if (m.bio || ed) {
    h += sec('p-about', '소개', '<p class="ml"' + E(o, doc, 'bio', '자기소개를 두세 문장으로 적어 주세요.', true) + '>' + esc(m.bio) + '</p>');
  }
  if (skills.length || ed) {
    h += sec('p-skills', '담당 분야', '<ul class="tags">' + skills.map((t, n) => (ed
      ? '<li class="ed-tag"><span' + E(o, doc, 'skills.' + n, '분야') + '>' + esc(t) + '</span>' + edX('skill-del', n, '담당 분야 삭제') + '</li>'
      : '<li>' + esc(t) + '</li>')).join('') + '</ul>' + (ed ? edBtn('＋ 분야 추가', 'skill-add') : ''));
  }
  /* 이력, 수상 · 자격증은 같은 모양의 줄(시기 + 내용)입니다.
     이력의 시기는 '2026.09 - 2026.10' 같은 기간으로, 수상 · 자격증은 '2026.09' 처럼 적습니다. */
  const dated = (cls, title, key, act, rows, whenPh, ph) => sec(cls, title, '<ol class="history">' +
    rows.map((r, n) => '<li><span class="yr"' + E(o, doc, key + '.' + n + '.year', whenPh) + '>' + esc(r.year) + '</span>' +
      '<span class="what"' + E(o, doc, key + '.' + n + '.text', ph) + '>' + esc(r.text) + '</span>' +
      (ed ? edX(act + '-del', n, title + ' 삭제') : '') + '</li>').join('') + '</ol>' +
    (ed ? edBtn('＋ ' + title + ' 추가', act + '-add') : ''));
  if (history.length || ed) h += dated('p-history', '이력', 'history', 'hist', history, '2026.09 - 2026.10', '이력 내용');
  if (awards.length || ed) h += dated('p-awards', '수상 · 자격증', 'awards', 'award', awards, '2026.09', '수상 내용 또는 자격증 이름');

  /* 참여 프로젝트 */
  const all = d.site.projects || [];
  const cat = (p) => (p.label ? '<span class="p-proj__cat">' + esc(p.label) + '</span>' : '');
  if (ed) {
    if (all.length) {
      h += sec('p-projs', '참여 프로젝트', all.map((p) => {
        const n = joined.findIndex((r) => r.id === p.id);
        return '<div class="p-proj' + (n < 0 ? ' p-proj--off' : '') + '"><span class="p-proj__main">' + cat(p) + '<b>' + esc(p.name) + '</b>' +
          (n < 0 ? '' : '<span class="p-proj__role"' + E(o, doc, 'projects.' + n + '.role', '맡은 역할') + '>' + esc(joined[n].role) + '</span>') + '</span>' +
          '<label class="ed-check"><input type="checkbox" data-act="mproj" data-arg="' + esc(p.id) + '"' + (n < 0 ? '' : ' checked') + '> 참여</label></div>';
      }).join(''));
    }
  } else {
    const rows = joined.map((r) => ({ r: r, p: all.find((p) => p.id === r.id) })).filter((x) => x.p);
    if (rows.length) {
      h += sec('p-projs', '참여 프로젝트', rows.map((x) => (
        '<a class="p-proj" href="/projects#' + esc(x.p.id) + '"><span class="p-proj__main">' + cat(x.p) + '<b>' + esc(x.p.name) + '</b>' +
        (x.r.role ? '<span class="p-proj__role">' + esc(x.r.role) + '</span>' : '') + '</span>' +
        '<span class="p-proj__go" aria-hidden="true">' + I.right + '</span></a>'
      )).join(''));
    }
  }

  /* 작업물 */
  if (works.length || ed) {
    h += sec('p-works', '작업물', '<div class="works" data-n="' + (works.length + (ed ? 1 : 0)) + '">' +
      works.map((w, n) => {
        const img = mediaUrl(w.image), url = webUrl(w.url);
        const pic = '<span class="work__pic">' + (img ? '<img src="' + img + '" alt="" loading="lazy">' : I.image) + '</span>';
        const cls = 'work' + (img ? ' work--img' : '');
        if (ed) {
          return '<div class="' + cls + '">' + pic +
            '<div class="cap"><b' + E(o, doc, 'works.' + n + '.title', '작업물 제목') + '>' + esc(w.title) + '</b>' +
            '<span' + E(o, doc, 'works.' + n + '.desc', '짧은 설명') + '>' + esc(w.desc) + '</span>' +
            '<span' + E(o, doc, 'works.' + n + '.url', '연결할 주소 (선택, https://…)') + '>' + esc(w.url) + '</span></div>' +
            '<div class="ed-tools">' + edBtn(img ? '이미지 바꾸기' : '이미지 올리기', 'work-image', n) +
            (img ? edBtn('이미지 빼기', 'work-image-del', n) : '') + edBtn('삭제', 'work-del', n, 'ed-btn--danger') + '</div></div>';
        }
        const cap = '<span class="cap"><b>' + esc(w.title) + '</b>' + (w.desc ? '<span>' + esc(w.desc) + '</span>' : '') + '</span>';
        return url
          ? '<a class="' + cls + '" href="' + esc(url) + '" target="_blank" rel="noopener">' + pic + cap + '</a>'
          : '<div class="' + cls + '">' + pic + cap + '</div>';
      }).join('') +
      (ed ? '<button type="button" class="ed-add" data-act="work-add">＋ 작업물 추가</button>' : '') + '</div>');
  }

  /* 이전 / 다음 팀원 */
  if (list.length > 1) {
    const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    h += '<nav class="pager" aria-label="팀원 이동">' +
      '<a class="prev" href="/team/' + esc(prev.id) + '">' + I.left + '<span><small>이전 팀원</small><b>' + esc(prev.m.name) + '</b></span></a>' +
      '<a class="all" href="/team">팀 전체 보기</a>' +
      '<a class="next" href="/team/' + esc(next.id) + '"><span><small>다음 팀원</small><b>' + esc(next.m.name) + '</b></span>' + I.right + '</a></nav>';
  }
  return h + '</div>';
}

/* ---------- 문의 ---------- */
/* 연락처 목록 (문의 페이지 · 홈 공용). 명함처럼 작은 아이콘과 글자를 한 줄씩 놓습니다.
   적어 둔 항목만 보이고, 이메일 · 전화 · 인스타그램은 누르면 바로 연결됩니다.
   카카오톡 ID 는 연결할 주소가 없어 글자로만 보여 줍니다. */
function instaUrl(v) {
  const id = String(v || '');
  return /^[A-Za-z0-9._]{1,30}$/.test(id) ? 'https://www.instagram.com/' + id + '/' : '';
}
function contactList(c, o) {
  const row = (icon, name, key, ph, href, out) => {
    const v = c[key];
    if (!v && !o.edit) return '';
    const lead = '<span class="contact-ic" aria-hidden="true">' + icon + '</span><span class="sr-only">' + name + ' </span>';
    if (o.edit) {
      return '<li><span class="contact-item">' + lead +
        '<span class="contact-val"' + E(o, 'site', 'contact.' + key, ph) + '>' + esc(v) + '</span></span></li>';
    }
    const val = '<span class="contact-val">' + esc(v) + '</span>';
    return '<li>' + (href
      ? '<a class="contact-item" href="' + esc(href) + '"' + (out ? ' target="_blank" rel="noopener"' : '') + '>' +
        lead + val + (out ? '<span class="sr-only"> (새 창)</span>' : '') + '</a>'
      : '<span class="contact-item">' + lead + val + '</span>') + '</li>';
  };
  const rows =
    row(I.mail, '이메일', 'email', 'name@example.com', 'mailto:' + c.email) +
    row(I.phone, '전화', 'phone', '010-0000-0000', 'tel:' + c.phone) +
    row(I.talk, '카카오톡 ID', 'kakao', '카카오톡 ID') +
    row(I.insta, '인스타그램', 'instagram', '인스타그램 아이디', instaUrl(c.instagram), true);
  return rows ? '<ul class="contact-list">' + rows + '</ul>' : '';
}
function contact(d, o) {
  return head('h1', '03', 'Contact', '문의', contactList(d.site.contact || {}, o), 'sec-head--page sec-head--contact');
}

/* ---------- 로그인 / 계정 ---------- */
function login(o) {
  /* first: 임시 비밀번호로 처음 들어온 경우 (새 비밀번호를 정하면 홈으로 보냅니다) */
  const pwForm = (first) => '<form class="form" id="pw-form"' + (first ? ' data-first' : '') + ' novalidate>' +
    '<label>' + (first ? '임시 비밀번호' : '지금 비밀번호') + '<input type="password" name="current" autocomplete="current-password" required></label>' +
    '<label>새 비밀번호<input type="password" name="next" autocomplete="new-password" minlength="10" required><small>10자 이상으로 정해 주세요.</small></label>' +
    '<label>새 비밀번호 한 번 더<input type="password" name="again" autocomplete="new-password" minlength="10" required></label>' +
    '<p class="form__msg" role="alert" hidden></p>' +
    '<button class="btn btn--primary" type="submit">' + (first ? '비밀번호 정하기' : '비밀번호 바꾸기') + '</button></form>';
  if (o.user && o.user.mustChange) {
    return head('h1', 'Members', 'Account', '새 비밀번호 정하기', '', 'sec-head--page') +
      '<div class="auth-grid">' +
      '<div class="auth"><p class="auth__who"><b>' + esc(o.user.name) + '</b> 님, 임시 비밀번호로 로그인했습니다.</p>' +
      '<p class="auth__hint">본인만 아는 비밀번호를 새로 정해야 편집할 수 있습니다.</p>' +
      '<div class="btns"><button class="btn btn--ghost" type="button" id="logout">로그아웃</button></div></div>' +
      '<div class="auth">' + pwForm(true) + '</div></div>';
  }
  if (o.user) {
    return head('h1', 'Members', 'Account', '내 계정', '', 'sec-head--page') +
      '<div class="auth-grid">' +
      '<div class="auth"><p class="auth__who"><b>' + esc(o.user.name) + '</b> 님으로 로그인되어 있습니다.</p>' +
      '<p class="auth__hint">각 페이지 아래쪽의 ‘편집’ 버튼을 누르면 내용을 바로 고칠 수 있습니다.</p>' +
      '<div class="btns"><a class="btn btn--primary" href="/">홈에서 편집하기 ' + I.right + '</a>' +
      '<button class="btn btn--ghost" type="button" id="logout">로그아웃</button></div></div>' +
      '<div class="auth"><h2>비밀번호 바꾸기</h2>' + pwForm(false) + '</div></div>';
  }
  return head('h1', 'Members', 'Login', '로그인', '<p>고조선 팀원 전용</p>', 'sec-head--page') +
    '<div class="auth-grid"><div class="auth auth--solo"><form class="form" id="login-form" novalidate>' +
    '<label>아이디<input type="text" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>' +
    '<label>비밀번호<input type="password" name="password" autocomplete="current-password" required></label>' +
    '<p class="form__msg" role="alert" hidden></p>' +
    '<button class="btn btn--primary" type="submit">로그인</button></form></div></div>';
}

function notFound(title, text, href, label) {
  return '<div class="notice">' + labels('404', 'Not found') +
    '<h1>' + esc(title || '페이지를 찾을 수 없습니다.') + '</h1>' +
    '<p>' + esc(text || '주소가 바뀌었거나 없는 페이지입니다.') + '</p>' +
    '<a class="btn btn--primary" href="' + (href || '/') + '">' + esc(label || '홈으로 가기') + ' ' + I.right + '</a>' +
    '</div>';
}

/* ---------- 내보내는 함수 ---------- */
export function renderMain(view, d, o) {
  o = o || {};
  switch (view.page) {
    case 'home': return home(d, o);
    case 'projects': return projects(d, o);
    case 'team': return team(d, o);
    case 'member': return member(d, view.id, o);
    case 'contact': return contact(d, o);
    case 'login': return login(o);
    default: return notFound();
  }
}

export function pageTitle(view, d) {
  const names = { projects: '프로젝트', team: '팀', contact: '문의', login: '로그인' };
  if (view.page === 'home') return '고조선';
  if (view.page === 'member') return ((d.members[view.id] || {}).name || '팀') + ' — 고조선';
  return (names[view.page] || '페이지를 찾을 수 없습니다') + ' — 고조선';
}

/* ---------- 검색 · 링크 미리보기용 정보 ---------- */
function oneLine(v, max) {
  const t = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}
function pagePath(view) {
  if (view.page === 'home') return '/';
  if (view.page === 'member') return '/team/' + view.id;
  return '/' + view.page;
}
/* 페이지마다 다른 한 줄 소개. 지금 사이트에 올라 있는 내용으로만 만듭니다. */
function pageAbout(view, d) {
  const s = d.site;
  const names = (s.projects || []).map((p) => p.name).filter(Boolean);
  const base = '고조선 팀 홈페이지' + (names.length ? ' — ' + names.join(', ') : '');
  if (view.page === 'projects' && names.length) return '고조선의 프로젝트 — ' + names.join(', ');
  if (view.page === 'team') {
    const people = teamList(d).map((x) => x.m.name).filter(Boolean);
    return oneLine(s.teamAbout, 150) || (people.length ? '고조선 팀 — ' + people.join(', ') : base);
  }
  if (view.page === 'member') {
    const m = d.members[view.id];
    if (m) return oneLine(m.bio || m.quote, 150) || oneLine('고조선 ' + (m.role || '') + ' ' + m.name + '의 프로필입니다.', 150);
  }
  if (view.page === 'contact') {
    const c = s.contact || {}, how = [c.email, c.phone].filter(Boolean);
    return how.length ? oneLine('고조선 문의 — ' + how.join(', '), 150) : base;
  }
  return base;
}
/* 글자 '<' 를 JSON 안에서 안전한 표기로 바꿀 때 씁니다. */
const LT = '\\' + 'u003c';

/* 서버에서 쓰는 전체 문서. o.boot 는 로그인한 팀원에게만 넣는 편집용 데이터(JSON 문자열)입니다.
   o.origin (https://도메인) 이 있으면 카카오톡 · 메신저 · SNS 에 주소를 붙였을 때 나오는
   미리보기(제목 · 소개 · 그림)와 대표 주소를 함께 넣습니다. */
export function renderDocument(view, d, o) {
  o = o || {};
  const hidden = view.page === 'login' || view.page === 'notfound' || (view.page === 'member' && !d.members[view.id]);
  const title = pageTitle(view, d), about = pageAbout(view, d);
  let share = '';
  if (o.origin && !hidden) {
    const url = o.origin + pagePath(view), c = d.site.contact || {};
    const tag = (k, v) => '<meta property="' + k + '" content="' + esc(v) + '">\n';
    share = '<link rel="canonical" href="' + esc(url) + '">\n' +
      tag('og:type', view.page === 'member' ? 'profile' : 'website') +
      tag('og:site_name', '고조선') + tag('og:locale', 'ko_KR') +
      tag('og:title', title) + tag('og:description', about) + tag('og:url', url) +
      tag('og:image', o.origin + '/og.png') + tag('og:image:width', '1200') + tag('og:image:height', '630') +
      tag('og:image:alt', '고조선') +
      '<meta name="twitter:card" content="summary_large_image">\n';
    if (view.page === 'home') {
      const org = { '@context': 'https://schema.org', '@type': 'Organization', name: '고조선', url: o.origin + '/', logo: o.origin + '/logo.png' };
      if (c.email) org.email = c.email;
      if (c.phone) org.telephone = c.phone;
      const sameAs = [instaUrl(c.instagram)].concat((d.site.links || []).map((l) => webUrl(l.url))).filter(Boolean);
      if (sameAs.length) org.sameAs = sameAs;
      share += '<script type="application/ld+json">' + JSON.stringify(org).replace(/</g, LT) + '</script>\n';
    }
  }
  return '<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(title) + '</title>\n' +
    '<meta name="description" content="' + esc(about) + '">\n' +
    '<meta name="theme-color" content="#ffffff">\n' +
    (hidden ? '<meta name="robots" content="noindex">\n' : '') + share +
    '<link rel="icon" href="/favicon.png" type="image/png">\n' +
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n' +
    '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>\n' +
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">\n' +
    '<link rel="stylesheet" href="/styles.css">\n' +
    '<script src="/site.js"></script>\n' +
    (o.boot ? '<script type="application/json" id="gj-data">' + o.boot + '</script>\n<script type="module" src="/edit.js"></script>\n' : '') +
    (view.page === 'login' ? '<script src="/login.js" defer></script>\n' : '') +
    '</head>\n<body>\n<a class="skip" href="#main">본문으로 건너뛰기</a>\n' +
    header(view, o) + '\n<main id="main" class="wrap">' + renderMain(view, d, o) + '</main>\n' +
    renderFooter(d, o) + '\n</body>\n</html>\n';
}
