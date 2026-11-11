/* 고조선 — 화면 템플릿
   서버(Cloudflare Pages Functions)가 페이지를 만들 때와, 로그인한 팀원의 브라우저가
   편집 화면을 다시 그릴 때 같은 코드를 씁니다. 그래서 화면 마크업은 여기 한 곳에만 있습니다.

   d = { site, members }   site: 사이트 공통 내용, members: { 팀원id: 프로필 }
   o = { edit, user }      edit 가 true 면 편집용 표시(data-e, 추가/삭제 버튼)를 함께 그립니다. */

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

/* 편집 가능한 글자 표시: data-e="문서|경로" */
function E(o, doc, path, ph, multi) {
  if (!o.edit) return '';
  return ' data-e="' + esc(doc) + '|' + esc(path) + '" data-ph="' + esc(ph) + '"' + (multi ? ' data-ml' : '');
}

const I = {
  right: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  out: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M4 10l6-6M5 4h5v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  link: '<svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M7.5 10.5a3.2 3.2 0 0 0 4.5 0l2.6-2.6a3.2 3.2 0 0 0-4.5-4.5l-.9.9M10.5 7.5a3.2 3.2 0 0 0-4.5 0l-2.6 2.6a3.2 3.2 0 0 0 4.5 4.5l.9-.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  image: '<svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true"><rect x="5" y="8" width="34" height="28" rx="6" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="18" r="3.5" fill="currentColor"/><path d="M8 32l9-9 6 6 5-5 9 9" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>',
  user: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="7" r="3.4" stroke="currentColor" stroke-width="1.7"/><path d="M3.6 17c.7-3 3.2-4.8 6.4-4.8s5.7 1.8 6.4 4.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  bars: '<svg class="bars" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M3 7h16M3 15h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  x: '<svg class="x" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M5 5l12 12M17 5L5 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  logo: '<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#18181A"/><g stroke-linejoin="round" stroke-width="1.8"><path d="M6.4 13.4l2.8-3.2 7.8-1 6.6.7 2.6 2.3-.7 2.2-5.4.9-12.1-.3z" fill="#E8603C" stroke="#E8603C"/><path d="M9.6 17.8h4.6l.6 5.8H8.9z" fill="#fff" stroke="#fff"/><path d="M19.2 17.8h2.8l.9 5.8h-4.1z" fill="#fff" stroke="#fff"/></g></svg>'
};

/* 프로젝트 그림: 올린 이미지가 있으면 그 이미지, 없으면 기본 일러스트 */
const ART = {
  academy: '<svg viewBox="60 0 560 280" preserveAspectRatio="xMidYMid meet"><rect x="150" y="40" width="330" height="212" rx="20" fill="#2B2B2E"/><circle cx="178" cy="66" r="5.5" fill="#E8603C"/><circle cx="197" cy="66" r="5.5" fill="#5C5C61"/><circle cx="216" cy="66" r="5.5" fill="#5C5C61"/><g stroke-linecap="round" stroke-width="10" fill="none"><path d="M180 106h70" stroke="#E8603C"/><path d="M266 106h110" stroke="#5C5C61"/><path d="M204 135h46" stroke="#fff"/><path d="M266 135h150" stroke="#5C5C61"/><path d="M204 164h96" stroke="#5C5C61"/><path d="M316 164h54" stroke="#fff"/><path d="M204 193h130" stroke="#5C5C61"/><path d="M180 222h40" stroke="#E8603C"/></g><path d="M398 112h150a22 22 0 0 1 22 22v62a22 22 0 0 1-22 22h-96l-30 26v-26h-24a22 22 0 0 1-22-22v-62a22 22 0 0 1 22-22z" fill="#fff"/><g stroke-linecap="round" stroke-width="9" stroke="#18181A" fill="none"><path d="M404 150h132"/><path d="M404 178h84"/></g><rect x="82" y="136" width="112" height="56" rx="20" fill="#47474C"/><circle cx="116" cy="164" r="5" fill="#fff"/><circle cx="138" cy="164" r="5" fill="#fff"/><circle cx="160" cy="164" r="5" fill="#fff"/><path d="M546 176l14 52 12-20 23-4z" fill="#E8603C" stroke="#18181A" stroke-width="5" stroke-linejoin="round"/></svg>',
  kids: '<svg viewBox="0 0 480 280" preserveAspectRatio="xMidYMid meet"><path d="M64 190c48-62 92-66 128-32s74 38 108-2 66-48 104-28" fill="none" stroke="#E8603C" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/><circle cx="350" cy="92" r="44" fill="#fff"/><rect x="96" y="56" width="92" height="92" rx="14" fill="#fff" transform="rotate(-9 142 102)"/><path d="M118 124l22-34 18 22 10-12 14 24z" fill="#18181A" transform="rotate(-9 142 102)"/><circle cx="162" cy="80" r="8" fill="#E8603C" transform="rotate(-9 142 102)"/><path d="M208 258a56 56 0 0 1 112 0z" fill="#18181A"/><path d="M380 252l32-54 32 54z" fill="#18181A" stroke="#18181A" stroke-width="6" stroke-linejoin="round"/><path d="M226 62c8-12 16-12 24 0s16 12 24 0" fill="none" stroke="#18181A" stroke-width="5" stroke-linecap="round"/><circle cx="52" cy="96" r="8" fill="#18181A"/><circle cx="432" cy="44" r="5" fill="#18181A"/></svg>',
  blank: '<svg viewBox="0 0 480 280" preserveAspectRatio="xMidYMid meet"><circle cx="186" cy="136" r="66" fill="#E8603C"/><rect x="232" y="82" width="132" height="132" rx="28" fill="#fff"/><path d="M104 236h272" fill="none" stroke="#9A9A9F" stroke-width="6" stroke-linecap="round"/></svg>'
};
const HERO_ART = '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet"><circle cx="290" cy="74" r="60" fill="#fff"/><rect x="-1000" y="240" width="2400" height="70" fill="#D6D6D2"/><g stroke-linejoin="round" stroke-width="12"><path d="M118 158l50-2 8 86h-66z" fill="#18181A" stroke="#18181A"/><path d="M246 156l30 2 10 84h-46z" fill="#18181A" stroke="#18181A"/><path d="M76 132l34-30 96-12 84 8 42 26-8 26-70 12-140-4z" fill="#E8603C" stroke="#E8603C"/></g><circle cx="62" cy="62" r="7" fill="#18181A"/><circle cx="92" cy="40" r="4" fill="#18181A"/><path d="M24 206c10-9 20-9 30 0s20 9 30 0" fill="none" stroke="#18181A" stroke-width="5" stroke-linecap="round"/></svg>';
const TONE = { ink: 'tile--ink', tint: 'tile--tint', soft: 'tile--soft' };

function projArt(p) {
  const img = mediaUrl(p.image);
  return img ? '<img src="' + img + '" alt="">' : (ART[p.art] || ART.blank);
}
function portrait(m, alt) {
  const src = mediaUrl(m && m.photo);
  return '<div class="portrait">' + (src ? '<img src="' + src + '" alt="' + esc(alt || '') + '">' : '') + '</div>';
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

/* ---------- 공통 머리말 / 꼬리말 ---------- */
function header(view, o) {
  const cur = (p) => (view.page === p ? ' aria-current="page"' : (p === 'team' && view.page === 'member' ? ' aria-current="true"' : ''));
  return '<header class="site-header"><div class="wrap bar">' +
    '<a class="logo" href="/" aria-label="고조선 홈">' + I.logo + '고조선</a>' +
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

export function renderFooter(d, o) {
  o = o || {};
  const b = d.site.biz || {}, c = d.site.contact || {};
  const item = (label, key, ph) => ((b[key] || o.edit)
    ? '<li><b>' + label + '</b><span' + E(o, 'site', 'biz.' + key, ph) + '>' + esc(b[key]) + '</span></li>' : '');
  return '<footer class="site-footer"><div class="wrap"><ul class="biz">' +
    item('상호', 'name', '상호') +
    item('대표', 'ceo', '대표자') +
    item('사업자등록번호', 'regNo', '000-00-00000') +
    item('통신판매업신고', 'mailOrderNo', '신고번호') +
    (c.email ? '<li><b>이메일</b><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></li>' : '') +
    (c.phone ? '<li><b>전화</b><a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + '</a></li>' : '') +
    '</ul><span>© ' + new Date().getFullYear() + ' ' + esc(b.name || '고조선') + '. All rights reserved.</span></div></footer>';
}

/* ---------- 홈 ---------- */
function home(d, o) {
  const s = d.site, h = s.home || {};
  const peeks = s.projects.map((p) => (
    '<a class="tile ' + (TONE[p.tone] || '') + ' peek" href="/projects#' + esc(p.id) + '">' +
    '<div class="peek__art" aria-hidden="true">' + projArt(p) + '</div>' +
    '<div class="peek__body">' + (p.label ? '<span class="chip">' + esc(p.label) + '</span>' : '') +
    '<h2>' + esc(p.name) + '</h2>' +
    '<div class="peek__foot"><span>프로젝트 보기</span><span class="arr">' + I.right + '</span></div></div></a>'
  )).join('');
  const faces = teamList(d).slice(0, 4).map((x) => portrait(x.m, '')).join('');

  return '<div class="home">' +
    '<section class="grid" aria-labelledby="hero-title"><div class="tile hero-main">' +
    '<span class="eyebrow"><i></i><span' + E(o, 'site', 'home.eyebrow', '작은 머리글') + '>' + esc(h.eyebrow) + '</span></span>' +
    '<div><h1 id="hero-title">' +
    '<span' + E(o, 'site', 'home.title1', '제목 첫 줄') + '>' + esc(h.title1) + '</span><br>' +
    '<em' + E(o, 'site', 'home.titleEm', '강조할 말') + '>' + esc(h.titleEm) + '</em> ' +
    '<span' + E(o, 'site', 'home.title2', '제목 끝') + '>' + esc(h.title2) + '</span></h1>' +
    '<p class="hero-sub ml"' + E(o, 'site', 'home.sub', '팀을 한두 문장으로 소개해 주세요.', true) + '>' + esc(h.sub) + '</p>' +
    '<div class="btns"><a class="btn btn--primary" href="/projects">프로젝트 보기 ' + I.right + '</a>' +
    '<a class="btn btn--ghost" href="/team">팀 소개</a></div></div></div>' +
    '<div class="tile tile--soft hero-art" aria-hidden="true">' + HERO_ART + '</div></section>' +
    '<section class="grid" aria-label="둘러보기">' + peeks +
    '<a class="tile peek peek--team" href="/team"><div class="peek__faces" aria-hidden="true">' + faces + '</div>' +
    '<div class="peek__body"><span class="chip">팀</span><h2>' + esc(s.teamSub || '고조선을 만드는 사람들') + '</h2>' +
    '<div class="peek__foot"><span>팀 소개</span><span class="arr">' + I.right + '</span></div></div></a>' +
    '</section></div>';
}

/* ---------- 프로젝트 ---------- */
function projects(d, o) {
  const s = d.site, n = s.projects.length;
  const tiles = s.projects.map((p, i) => {
    const doc = 'projects.' + i + '.';
    const url = webUrl(p.url);
    let link;
    if (o.edit) {
      link = '<div class="proj__link proj__link--edit"><span class="domain"' + E(o, 'site', doc + 'url', '바로가기 주소 (https://…)') + '>' + esc(p.url) + '</span></div>';
    } else if (url) {
      link = '<a class="proj__link" href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="' + esc(p.name) + ' 바로가기 (' + esc(hostOf(url)) + ', 새 창)">' +
        '<span class="domain">' + esc(hostOf(url)) + '</span><span class="go">바로가기 ' + I.out + '</span></a>';
    } else {
      link = '<div class="proj__link proj__link--off"><span class="domain">준비 중</span></div>';
    }
    const tools = o.edit ? '<div class="ed-tools">' +
      edBtn('그림 올리기', 'proj-image', i) +
      (p.image ? edBtn('그림 빼기', 'proj-image-del', i) : '') +
      edBtn('배경색 바꾸기', 'proj-tone', i) +
      edBtn('←', 'proj-move', i + ',-1', 'ed-btn--icon', ' aria-label="앞으로 옮기기"' + (i === 0 ? ' disabled' : '')) +
      edBtn('→', 'proj-move', i + ',1', 'ed-btn--icon', ' aria-label="뒤로 옮기기"' + (i === n - 1 ? ' disabled' : '')) +
      edBtn('삭제', 'proj-del', i, 'ed-btn--danger') + '</div>' : '';
    return '<article class="tile ' + (TONE[p.tone] || '') + ' proj" id="' + esc(p.id) + '">' +
      '<div class="proj__art" aria-hidden="true">' + projArt(p) + '</div>' +
      '<div class="proj__body">' +
      ((p.label || o.edit) ? '<span class="chip"' + E(o, 'site', doc + 'label', '분류') + '>' + esc(p.label) + '</span>' : '') +
      '<h2' + E(o, 'site', doc + 'name', '프로젝트 이름') + '>' + esc(p.name) + '</h2>' +
      ((p.desc || o.edit) ? '<p class="ml"' + E(o, 'site', doc + 'desc', '프로젝트를 한두 문장으로 소개해 주세요.', true) + '>' + esc(p.desc) + '</p>' : '') +
      link + '</div>' + tools + '</article>';
  }).join('');

  return '<div class="page-head"><h1>프로젝트</h1>' +
    ((s.projectsSub || o.edit) ? '<p' + E(o, 'site', 'projectsSub', '프로젝트 페이지 한 줄 소개') + '>' + esc(s.projectsSub) + '</p>' : '') + '</div>' +
    '<div class="grid">' + tiles +
    (o.edit ? '<button type="button" class="ed-add proj" data-act="proj-add">＋ 프로젝트 추가</button>' : '') +
    (!o.edit && !n ? '<div class="tile notice"><h1>준비 중입니다.</h1><p>곧 프로젝트를 소개하겠습니다.</p></div>' : '') +
    '</div>';
}

/* ---------- 팀 ---------- */
function team(d, o) {
  const s = d.site, list = teamList(d);
  const cards = list.map((x, i) => {
    const m = x.m;
    const tools = o.edit ? '<div class="ed-tools">' +
      edBtn('←', 'member-move', x.id + ',-1', 'ed-btn--icon', ' aria-label="앞으로 옮기기"' + (i === 0 ? ' disabled' : '')) +
      edBtn('→', 'member-move', x.id + ',1', 'ed-btn--icon', ' aria-label="뒤로 옮기기"' + (i === list.length - 1 ? ' disabled' : '')) +
      edBtn('삭제', 'member-del', x.id, 'ed-btn--danger') + '</div>' : '';
    return '<li><a class="member" href="/team/' + esc(x.id) + '">' + portrait(m, '') +
      '<div class="member__top"><div><h2>' + esc(m.name) + '</h2>' +
      '<p class="member__role">' + (m.lead ? '<span class="lead-label">' + esc(m.role) + '</span>' : esc(m.role)) + '</p></div>' +
      '<span class="member__go" aria-hidden="true">' + I.right + '</span></div>' +
      (m.quote ? '<p class="member__quote">' + esc(m.quote) + '</p>' : '') +
      '</a>' + tools + '</li>';
  }).join('');

  return '<div class="page-head"><h1>팀</h1>' +
    ((s.teamSub || o.edit) ? '<p' + E(o, 'site', 'teamSub', '팀 페이지 한 줄 소개') + '>' + esc(s.teamSub) + '</p>' : '') + '</div>' +
    '<div class="grid"><div class="tile team-tile"><ul class="team">' + cards +
    (o.edit ? '<li><button type="button" class="ed-add" data-act="member-add">＋ 팀원 추가</button></li>' : '') +
    '</ul></div></div>';
}

/* ---------- 팀원 개인 페이지 ---------- */
function member(d, id, o) {
  const list = teamList(d);
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return notFound('팀원을 찾을 수 없습니다.', '주소가 올바르지 않거나 삭제된 프로필입니다. 팀 페이지에서 다시 선택해 주세요.', '/team', '팀으로 돌아가기');
  const m = list[i].m, doc = 'member:' + id, ed = !!o.edit;
  const skills = m.skills || [], history = m.history || [], works = m.works || [], joined = m.projects || [];
  const link = webUrl(m.link);
  let h = '<div class="profile">';

  /* 사진 + 이름 */
  h += '<div class="grid"><div class="tile p-photo">' + portrait(m, m.name + ' 사진') +
    (ed ? '<div class="ed-tools">' + edBtn(m.photo ? '사진 바꾸기' : '사진 올리기', 'photo') + (m.photo ? edBtn('사진 빼기', 'photo-del', undefined, 'ed-btn--danger') : '') + '</div>' : '') +
    '</div><div class="tile p-intro"><a class="back" href="/team">' + I.left + '팀으로 돌아가기</a><div>' +
    '<h1' + E(o, doc, 'name', '이름') + '>' + esc(m.name) + '</h1>' +
    '<p class="p-role"><span' + (m.lead ? ' class="lead-label"' : '') + E(o, doc, 'role', '직함') + '>' + esc(m.role) + '</span></p>' +
    (ed ? '<label class="ed-check"><input type="checkbox" data-act="lead"' + (m.lead ? ' checked' : '') + '> 팀장으로 표시</label>' : '') +
    ((m.quote || ed) ? '<blockquote class="p-quote"' + E(o, doc, 'quote', '한마디를 적어 주세요.') + '>' + esc(m.quote) + '</blockquote>' : '');
  if (ed) {
    h += '<div class="p-links">' +
      '<div class="ed-field"><b>이메일</b><span' + E(o, doc, 'email', 'name@example.com') + '>' + esc(m.email) + '</span></div>' +
      '<div class="ed-field"><b>링크</b><span' + E(o, doc, 'link', '깃허브·블로그 등 주소 (https://…)') + '>' + esc(m.link) + '</span></div></div>';
  } else if (m.email || link) {
    h += '<div class="p-links">' +
      (m.email ? '<a class="btn btn--primary" href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a>' : '') +
      (link ? '<a class="icon-btn" href="' + esc(link) + '" target="_blank" rel="noopener" aria-label="' + esc(m.name) + '의 링크 열기 (새 창)">' + I.link + '</a>' : '') +
      '</div>';
  }
  h += '</div></div></div>';

  /* 소개 · 담당 분야 · 이력 */
  const hasAbout = ed || m.bio || skills.length, hasHistory = ed || history.length;
  if (hasAbout || hasHistory) {
    h += '<div class="grid">';
    if (hasAbout) {
      h += '<section class="tile p-about' + (hasHistory ? '' : ' p-about--full') + '" aria-label="소개">';
      if (m.bio || ed) h += '<h2 class="label">소개</h2><p class="ml"' + E(o, doc, 'bio', '자기소개를 두세 문장으로 적어 주세요.', true) + '>' + esc(m.bio) + '</p>';
      if (skills.length || ed) {
        h += '<h2 class="label">담당 분야</h2><ul class="tags">' + skills.map((t, n) => (ed
          ? '<li class="ed-tag"><span' + E(o, doc, 'skills.' + n, '분야') + '>' + esc(t) + '</span>' + edX('skill-del', n, '담당 분야 삭제') + '</li>'
          : '<li>' + esc(t) + '</li>')).join('') + '</ul>';
        if (ed) h += edBtn('＋ 분야 추가', 'skill-add');
      }
      h += '</section>';
    }
    if (hasHistory) {
      h += '<section class="tile p-history' + (hasAbout ? '' : ' p-history--full') + '" aria-label="이력"><h2 class="label">이력</h2><ol class="history">' +
        history.map((r, n) => '<li><span class="yr"' + E(o, doc, 'history.' + n + '.year', '연도') + '>' + esc(r.year) + '</span>' +
          '<span class="what"' + E(o, doc, 'history.' + n + '.text', '이력 내용') + '>' + esc(r.text) + '</span>' +
          (ed ? edX('hist-del', n, '이력 삭제') : '') + '</li>').join('') + '</ol>' +
        (ed ? edBtn('＋ 이력 추가', 'hist-add') : '') + '</section>';
    }
    h += '</div>';
  }

  /* 참여 프로젝트 */
  const all = d.site.projects || [];
  if (ed) {
    if (all.length) {
      h += '<div class="sec-head"><h2>참여 프로젝트</h2></div><div class="grid">' + all.map((p) => {
        const n = joined.findIndex((r) => r.id === p.id);
        return '<div class="tile p-proj' + (n < 0 ? ' p-proj--off' : '') + '"><span>' +
          (p.label ? '<span class="chip">' + esc(p.label) + '</span>' : '') + '<h3>' + esc(p.name) + '</h3>' +
          (n < 0 ? '' : '<p' + E(o, doc, 'projects.' + n + '.role', '맡은 역할') + '>' + esc(joined[n].role) + '</p>') + '</span>' +
          '<label class="ed-check"><input type="checkbox" data-act="mproj" data-arg="' + esc(p.id) + '"' + (n < 0 ? '' : ' checked') + '> 참여</label></div>';
      }).join('') + '</div>';
    }
  } else {
    const rows = joined.map((r) => ({ r: r, p: all.find((p) => p.id === r.id) })).filter((x) => x.p);
    if (rows.length) {
      h += '<div class="sec-head"><h2>참여 프로젝트</h2></div><div class="grid">' + rows.map((x) => (
        '<a class="tile p-proj" href="/projects#' + esc(x.p.id) + '"><span>' +
        (x.p.label ? '<span class="chip">' + esc(x.p.label) + '</span>' : '') + '<h3>' + esc(x.p.name) + '</h3>' +
        (x.r.role ? '<p>' + esc(x.r.role) + '</p>' : '') + '</span><span class="arr">' + I.right + '</span></a>'
      )).join('') + '</div>';
    }
  }

  /* 작업물 */
  if (works.length || ed) {
    h += '<div class="sec-head"><h2>작업물</h2></div><div class="grid works" data-n="' + (works.length + (ed ? 1 : 0)) + '">' +
      works.map((w, n) => {
        const img = mediaUrl(w.image), url = webUrl(w.url);
        const pic = img ? '<img src="' + img + '" alt="">' : '<span class="ph">' + I.image + '</span>';
        if (ed) {
          return '<div class="tile work' + (img ? ' work--img' : '') + '">' + pic +
            '<div class="cap"><b' + E(o, doc, 'works.' + n + '.title', '작업물 제목') + '>' + esc(w.title) + '</b>' +
            '<span' + E(o, doc, 'works.' + n + '.desc', '짧은 설명') + '>' + esc(w.desc) + '</span>' +
            '<span' + E(o, doc, 'works.' + n + '.url', '연결할 주소 (선택, https://…)') + '>' + esc(w.url) + '</span></div>' +
            '<div class="ed-tools">' + edBtn(img ? '이미지 바꾸기' : '이미지 올리기', 'work-image', n) +
            (img ? edBtn('이미지 빼기', 'work-image-del', n) : '') + edBtn('삭제', 'work-del', n, 'ed-btn--danger') + '</div></div>';
        }
        const cap = '<span class="cap"><b>' + esc(w.title) + '</b>' + (w.desc ? '<span>' + esc(w.desc) + '</span>' : '') + '</span>';
        return url
          ? '<a class="tile work' + (img ? ' work--img' : '') + '" href="' + esc(url) + '" target="_blank" rel="noopener">' + pic + cap + '</a>'
          : '<div class="tile work' + (img ? ' work--img' : '') + '">' + pic + cap + '</div>';
      }).join('') +
      (ed ? '<button type="button" class="ed-add work" data-act="work-add">＋ 작업물 추가</button>' : '') + '</div>';
  }

  /* 이전 / 다음 팀원 */
  if (list.length > 1) {
    const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    h += '<nav class="grid pager" aria-label="팀원 이동">' +
      '<a class="tile prev" href="/team/' + esc(prev.id) + '">' + I.left + '<span><small>이전 팀원</small><b>' + esc(prev.m.name) + '</b></span></a>' +
      '<a class="tile all" href="/team">팀 전체 보기</a>' +
      '<a class="tile next" href="/team/' + esc(next.id) + '"><span><small>다음 팀원</small><b>' + esc(next.m.name) + '</b></span>' + I.right + '</a></nav>';
  }
  return h + '</div>';
}

/* ---------- 문의 ---------- */
function contact(d, o) {
  const c = d.site.contact || {};
  const row = (label, key, ph, scheme) => {
    if (!c[key] && !o.edit) return '';
    return '<div><dt>' + label + '</dt><dd>' + (o.edit
      ? '<span' + E(o, 'site', 'contact.' + key, ph) + '>' + esc(c[key]) + '</span>'
      : '<a href="' + scheme + esc(c[key]) + '">' + esc(c[key]) + '</a>') + '</dd></div>';
  };
  return '<div class="page-head"><h1>문의</h1></div><div class="grid"><div class="tile tile--accent contact">' +
    '<p' + E(o, 'site', 'contact.text', '문의 안내 문구') + '>' + esc(c.text) + '</p>' +
    '<div class="contact-side"><dl class="contact-list">' +
    row('이메일', 'email', 'name@example.com', 'mailto:') + row('전화', 'phone', '010-0000-0000', 'tel:') + '</dl>' +
    (c.email && !o.edit ? '<a class="btn btn--primary" href="mailto:' + esc(c.email) + '">메일 보내기 ' + I.out + '</a>' : '') +
    '</div></div></div>';
}

/* ---------- 로그인 / 계정 ---------- */
function login(o) {
  if (o.user) {
    return '<div class="page-head"><h1>내 계정</h1></div><div class="grid">' +
      '<div class="tile auth"><p class="auth__who"><b>' + esc(o.user.name) + '</b> 님으로 로그인되어 있습니다.</p>' +
      '<p class="auth__hint">각 페이지 아래쪽의 ‘편집’ 버튼을 누르면 내용을 바로 고칠 수 있습니다.</p>' +
      '<div class="btns"><a class="btn btn--primary" href="/">홈에서 편집하기 ' + I.right + '</a>' +
      '<button class="btn btn--ghost" type="button" id="logout">로그아웃</button></div></div>' +
      '<div class="tile auth"><h2>비밀번호 바꾸기</h2><form class="form" id="pw-form" novalidate>' +
      '<label>지금 비밀번호<input type="password" name="current" autocomplete="current-password" required></label>' +
      '<label>새 비밀번호<input type="password" name="next" autocomplete="new-password" minlength="10" required><small>10자 이상으로 정해 주세요.</small></label>' +
      '<label>새 비밀번호 한 번 더<input type="password" name="again" autocomplete="new-password" minlength="10" required></label>' +
      '<p class="form__msg" role="alert" hidden></p>' +
      '<button class="btn btn--primary" type="submit">비밀번호 바꾸기</button></form></div></div>';
  }
  return '<div class="page-head"><h1>로그인</h1><p>고조선 팀원 전용</p></div><div class="grid">' +
    '<div class="tile auth auth--solo"><form class="form" id="login-form" novalidate>' +
    '<label>아이디<input type="text" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>' +
    '<label>비밀번호<input type="password" name="password" autocomplete="current-password" required></label>' +
    '<p class="form__msg" role="alert" hidden></p>' +
    '<button class="btn btn--primary" type="submit">로그인</button></form></div></div>';
}

function notFound(title, text, href, label) {
  return '<div class="profile"><div class="grid"><div class="tile notice">' +
    '<h1>' + esc(title || '페이지를 찾을 수 없습니다.') + '</h1>' +
    '<p>' + esc(text || '주소가 바뀌었거나 없는 페이지입니다.') + '</p>' +
    '<a class="btn btn--primary" href="' + (href || '/') + '">' + esc(label || '홈으로 가기') + ' ' + I.right + '</a>' +
    '</div></div></div>';
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

/* 서버에서 쓰는 전체 문서. o.boot 는 로그인한 팀원에게만 넣는 편집용 데이터(JSON 문자열)입니다. */
export function renderDocument(view, d, o) {
  o = o || {};
  const hidden = view.page === 'login' || view.page === 'notfound';
  return '<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(pageTitle(view, d)) + '</title>\n' +
    '<meta name="description" content="' + esc((d.site.home || {}).sub || '고조선') + '">\n' +
    (hidden ? '<meta name="robots" content="noindex">\n' : '') +
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n' +
    '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>\n' +
    '<link rel="stylesheet" href="/styles.css">\n' +
    '<script src="/site.js"></script>\n' +
    (o.boot ? '<script type="application/json" id="gj-data">' + o.boot + '</script>\n<script type="module" src="/edit.js"></script>\n' : '') +
    (view.page === 'login' ? '<script src="/login.js" defer></script>\n' : '') +
    '</head>\n<body>\n<a class="skip" href="#main">본문으로 건너뛰기</a>\n' +
    header(view, o) + '\n<main id="main" class="wrap">' + renderMain(view, d, o) + '</main>\n' +
    renderFooter(d, o) + '\n</body>\n</html>\n';
}
