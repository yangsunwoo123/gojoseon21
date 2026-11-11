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
  right: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" stroke="currentColor" stroke-width="1.6"/></svg>',
  left: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.5 8h-11M7 3.5 2.5 8 7 12.5" stroke="currentColor" stroke-width="1.6"/></svg>',
  out: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M5 13 13 5M6 5h7v7" stroke="currentColor" stroke-width="1.6"/></svg>',
  link: '<svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M7.5 10.5a3.2 3.2 0 0 0 4.5 0l2.6-2.6a3.2 3.2 0 0 0-4.5-4.5l-.9.9M10.5 7.5a3.2 3.2 0 0 0-4.5 0l-2.6 2.6a3.2 3.2 0 0 0 4.5 4.5l.9-.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  image: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect x="5.75" y="8.75" width="28.5" height="22.5" stroke="currentColor" stroke-width="1.5"/><circle cx="14" cy="16" r="2.5" fill="currentColor"/><path d="M6 28l8.5-8 5.5 5 4.5-4.5L34 30" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  user: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="7" r="3.4" stroke="currentColor" stroke-width="1.5"/><path d="M3.6 17c.7-3 3.2-4.8 6.4-4.8s5.7 1.8 6.4 4.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  bars: '<svg class="bars" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M3 7.5h16M3 14.5h16" stroke="currentColor" stroke-width="1.6"/></svg>',
  x: '<svg class="x" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M5 5l12 12M17 5L5 17" stroke="currentColor" stroke-width="1.6"/></svg>'
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

/* 구역 머리말: 검은 줄 + 작은 라벨(번호 · 영문) + 큰 제목 + 오른쪽 한 줄 소개 */
function labels(a, b) {
  return '<div class="label" aria-hidden="true"><span>' + a + '</span><span>' + b + '</span></div>';
}
function head(tag, no, en, title, sub, cls, id) {
  return '<div class="sec-head' + (cls ? ' ' + cls : '') + '">' + labels(no, en) +
    '<' + tag + (id ? ' id="' + id + '"' : '') + '>' + title + '</' + tag + '>' + (sub || '') + '</div>';
}
function subLine(o, path, ph, value) {
  return (value || o.edit) ? '<p' + E(o, 'site', path, ph) + '>' + esc(value) + '</p>' : '';
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

/* ---------- 프로젝트 줄 (홈 · 프로젝트 페이지 공용) ----------
   opt.h: 제목 태그, opt.img: 올린 그림 보이기, opt.tools: 편집 버튼, opt.ids: 줄마다 id 달기 */
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
    return '<article class="proj' + (linked ? ' proj--link' : '') + ((p.label || o.edit) ? '' : ' proj--nocat') + '"' +
      (opt.ids ? ' id="' + esc(p.id) + '"' : '') + '>' +
      '<span class="proj__no label" aria-hidden="true">' + num(i) + '</span>' +
      '<div class="proj__main">' +
      ((p.label || o.edit) ? '<p class="proj__cat"><span' + E(o, 'site', doc + 'label', '분류') + '>' + esc(p.label) + '</span></p>' : '') +
      '<' + H + E(o, 'site', doc + 'name', '프로젝트 이름') + '>' +
      (linked
        ? '<a href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="' + esc(p.name) + ' 바로가기 (' + esc(host) + ', 새 창)">' + esc(p.name) + '</a>'
        : esc(p.name)) +
      '</' + H + '>' +
      (img ? '<div class="proj__img"><img src="' + img + '" alt="" loading="lazy"></div>' : '') +
      '</div>' +
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
  const s = d.site, list = teamList(d), look = {};
  const hasP = s.projects.length > 0, hasT = list.length > 0;
  const note = (text, href, label) => (o.edit
    ? '<p class="ed-note">' + text + ' <a href="' + href + '">' + label + '</a>에서 고칩니다.</p>' : '');

  /* 큰 문구 없이 목차(01 프로젝트, 02 팀)부터 바로 시작합니다. 맨 위 구역에만 위 여백을 줍니다. */
  return '<div class="home"><h1 class="sr-only">고조선</h1>' +
    (hasP ? '<section class="section" aria-labelledby="home-projects">' +
      head('h2', '01', 'Projects', '프로젝트', subLine(o, 'projectsSub', '프로젝트 한 줄 소개', s.projectsSub), 'sec-head--page', 'home-projects') +
      note('프로젝트 목록은', '/projects', '프로젝트 페이지') +
      '<div class="projects">' + projRows(s, look, { h: 'h3' }) + '</div>' +
      '<p class="more"><a href="/projects">프로젝트 전체 보기 ' + I.right + '</a></p></section>' : '') +

    (hasT ? '<section class="section" aria-labelledby="home-team">' +
      head('h2', '02', 'Team', '팀', subLine(o, 'teamSub', '팀 한 줄 소개', s.teamSub), hasP ? '' : 'sec-head--page', 'home-team') +
      note('팀원 목록과 프로필은', '/team', '팀 페이지') +
      '<ul class="team">' + memberCards(list, look, { h: 'h3' }) + '</ul>' +
      '<p class="more"><a href="/team">팀 소개 보기 ' + I.right + '</a></p></section>' : '') +

    (!hasP && !hasT ? '<p class="empty">준비 중입니다. 곧 소개하겠습니다.</p>' : '') +
    '</div>';
}

/* ---------- 프로젝트 ---------- */
function projects(d, o) {
  const s = d.site, n = s.projects.length;
  return head('h1', '01', 'Projects', '프로젝트', subLine(o, 'projectsSub', '프로젝트 페이지 한 줄 소개', s.projectsSub), 'sec-head--page') +
    (n || o.edit ? '<div class="projects">' + projRows(s, o, { h: 'h2', img: true, tools: true, ids: true }) + '</div>' : '') +
    (o.edit ? '<button type="button" class="ed-add" data-act="proj-add">＋ 프로젝트 추가</button>' : '') +
    (!o.edit && !n ? '<p class="empty">준비 중입니다. 곧 프로젝트를 소개하겠습니다.</p>' : '');
}

/* ---------- 팀 ---------- */
function team(d, o) {
  const s = d.site, list = teamList(d);
  return head('h1', '02', 'Team', '팀', subLine(o, 'teamSub', '팀 페이지 한 줄 소개', s.teamSub), 'sec-head--page') +
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
  const skills = m.skills || [], history = m.history || [], works = m.works || [], joined = m.projects || [];
  const link = webUrl(m.link);
  const sec = (cls, title, body) => '<section class="p-sec ' + cls + '" aria-label="' + title + '">' +
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
  h += '</div></div>';

  /* 소개 · 담당 분야 · 이력 */
  if (m.bio || ed) {
    h += sec('p-about', '소개', '<p class="ml"' + E(o, doc, 'bio', '자기소개를 두세 문장으로 적어 주세요.', true) + '>' + esc(m.bio) + '</p>');
  }
  if (skills.length || ed) {
    h += sec('p-skills', '담당 분야', '<ul class="tags">' + skills.map((t, n) => (ed
      ? '<li class="ed-tag"><span' + E(o, doc, 'skills.' + n, '분야') + '>' + esc(t) + '</span>' + edX('skill-del', n, '담당 분야 삭제') + '</li>'
      : '<li>' + esc(t) + '</li>')).join('') + '</ul>' + (ed ? edBtn('＋ 분야 추가', 'skill-add') : ''));
  }
  if (history.length || ed) {
    h += sec('p-history', '이력', '<ol class="history">' +
      history.map((r, n) => '<li><span class="yr"' + E(o, doc, 'history.' + n + '.year', '연도') + '>' + esc(r.year) + '</span>' +
        '<span class="what"' + E(o, doc, 'history.' + n + '.text', '이력 내용') + '>' + esc(r.text) + '</span>' +
        (ed ? edX('hist-del', n, '이력 삭제') : '') + '</li>').join('') + '</ol>' +
      (ed ? edBtn('＋ 이력 추가', 'hist-add') : ''));
  }

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
function contact(d, o) {
  const c = d.site.contact || {};
  const row = (en, key, ph, scheme) => {
    if (!c[key] && !o.edit) return '';
    return '<div class="contact-row">' + (o.edit
      ? '<span class="contact-link"' + E(o, 'site', 'contact.' + key, ph) + '>' + esc(c[key]) + '</span>'
      : '<a class="contact-link" href="' + scheme + esc(c[key]) + '">' + esc(c[key]) + I.out + '</a>') +
      '<span class="label" aria-hidden="true">' + en + '</span></div>';
  };
  return '<div class="sec-head sec-head--page contact-head">' + labels('03', 'Contact') +
    '<h1' + E(o, 'site', 'contact.text', '문의 안내 문구') + '>' + esc(c.text || (o.edit ? '' : '문의')) + '</h1></div>' +
    '<div class="contact-rows">' +
    row('Email', 'email', 'name@example.com', 'mailto:') + row('Phone', 'phone', '010-0000-0000', 'tel:') + '</div>';
}

/* ---------- 로그인 / 계정 ---------- */
function login(o) {
  if (o.user) {
    return head('h1', 'Members', 'Account', '내 계정', '', 'sec-head--page') +
      '<div class="auth-grid">' +
      '<div class="auth"><p class="auth__who"><b>' + esc(o.user.name) + '</b> 님으로 로그인되어 있습니다.</p>' +
      '<p class="auth__hint">각 페이지 아래쪽의 ‘편집’ 버튼을 누르면 내용을 바로 고칠 수 있습니다.</p>' +
      '<div class="btns"><a class="btn btn--primary" href="/">홈에서 편집하기 ' + I.right + '</a>' +
      '<button class="btn btn--ghost" type="button" id="logout">로그아웃</button></div></div>' +
      '<div class="auth"><h2>비밀번호 바꾸기</h2><form class="form" id="pw-form" novalidate>' +
      '<label>지금 비밀번호<input type="password" name="current" autocomplete="current-password" required></label>' +
      '<label>새 비밀번호<input type="password" name="next" autocomplete="new-password" minlength="10" required><small>10자 이상으로 정해 주세요.</small></label>' +
      '<label>새 비밀번호 한 번 더<input type="password" name="again" autocomplete="new-password" minlength="10" required></label>' +
      '<p class="form__msg" role="alert" hidden></p>' +
      '<button class="btn btn--primary" type="submit">비밀번호 바꾸기</button></form></div></div>';
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

/* 서버에서 쓰는 전체 문서. o.boot 는 로그인한 팀원에게만 넣는 편집용 데이터(JSON 문자열)입니다. */
export function renderDocument(view, d, o) {
  o = o || {};
  const hidden = view.page === 'login' || view.page === 'notfound';
  /* 검색 결과에 나오는 한 줄 소개: 지금 사이트에 올라 있는 프로젝트 이름으로 만듭니다. */
  const names = (d.site.projects || []).map((p) => p.name).filter(Boolean);
  const about = '고조선 팀 홈페이지' + (names.length ? ' — ' + names.join(', ') : '');
  return '<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(pageTitle(view, d)) + '</title>\n' +
    '<meta name="description" content="' + esc(about) + '">\n' +
    '<meta name="theme-color" content="#ffffff">\n' +
    (hidden ? '<meta name="robots" content="noindex">\n' : '') +
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
