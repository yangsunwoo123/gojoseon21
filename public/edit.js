/* 고조선 — 편집 모드
   서버가 로그인한 팀원의 페이지에만 이 스크립트를 넣어 보냅니다.
   여기 있는 것은 편집 "화면"일 뿐입니다. 저장 요청은 서버가 매번 로그인 여부를 다시 확인하므로,
   로그인하지 않은 사람이 이 파일을 열어 보거나 실행해도 아무것도 바꿀 수 없습니다. */
import { renderMain, renderFooter, pageTitle, esc, linkLogo, linkHint } from '/render.js';

const boot = JSON.parse(document.getElementById('gj-data').textContent);
const view = boot.view;
const user = boot.user;

const clone = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* saved: 서버에 저장되어 있는 내용 / draft: 지금 고치고 있는 내용.  각 문서는 { data, version } */
let saved = { site: boot.docs.site, members: boot.docs.members };
let draft = clone(saved);
let editing = false;
let busy = false;

const main = document.getElementById('main');
const canEdit = ['home', 'projects', 'team', 'contact'].includes(view.page) ||
  (view.page === 'member' && !!saved.members[view.id]);

function dataOf(state) {
  const members = {};
  for (const id in state.members) members[id] = state.members[id].data;
  return { site: state.site.data, members };
}
function isDirty() {
  return !same(dataOf(draft), dataOf(saved));
}
function remember(on) {
  try { on ? sessionStorage.setItem('gj-edit', '1') : sessionStorage.removeItem('gj-edit'); } catch (e) { /* 무시 */ }
}
function remembered() {
  try { return sessionStorage.getItem('gj-edit') === '1'; } catch (e) { return false; }
}

/* ---------- 아래쪽 편집 막대 · 알림 ---------- */
const bar = document.createElement('div');
bar.className = 'ed-bar';
bar.setAttribute('role', 'region');
bar.setAttribute('aria-label', '편집 도구');
const toastEl = document.createElement('div');
toastEl.className = 'ed-toast';
toastEl.setAttribute('role', 'status');
toastEl.hidden = true;
document.body.append(toastEl, bar);
document.body.classList.add('has-bar');

let barState = '';
function drawBar() {
  const dirty = editing && isDirty();
  const state = [editing, dirty, busy].join();
  if (state === barState) return;
  barState = state;
  if (!editing) {
    bar.innerHTML = '<span class="ed-bar__label">' + esc(user.name) + '</span>' +
      (canEdit ? '<button type="button" class="is-primary" data-bar="edit">편집</button>' : '') +
      '<a href="/login">계정</a>';
  } else {
    bar.innerHTML = '<span class="ed-bar__label">' + (busy ? '저장하는 중…' : dirty ? '저장 안 된 변경사항' : '편집 중') + '</span>' +
      '<button type="button" data-bar="cancel"' + (busy ? ' disabled' : '') + '>' + (dirty ? '취소' : '편집 끝내기') + '</button>' +
      '<button type="button" class="is-primary" data-bar="save"' + (dirty && !busy ? '' : ' disabled') + '>저장</button>';
  }
}

let toastTimer = 0;
function toast(text, kind) {
  clearTimeout(toastTimer);
  toastEl.textContent = text;
  toastEl.classList.toggle('is-error', kind === 'error');
  toastEl.hidden = false;
  if (kind !== 'wait') toastTimer = setTimeout(() => { toastEl.hidden = true; }, kind === 'error' ? 8000 : 3200);
}

/* 확인 창 / 한 줄 입력 창. 확인하면 true(또는 입력한 글), 취소하면 false(또는 null) */
function ask(message, opt) {
  opt = opt || {};
  const none = opt.input ? null : false;
  if (typeof HTMLDialogElement !== 'function') {
    return Promise.resolve(opt.input ? window.prompt(message, '') : window.confirm(message));
  }
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'ed-dialog';
    const p = document.createElement('p');
    p.textContent = message;
    d.append(p);
    let input = null;
    if (opt.input) {
      input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 40;
      input.setAttribute('aria-label', message);
      d.append(input);
    }
    const btns = document.createElement('div');
    btns.className = 'ed-dialog__btns';
    const no = document.createElement('button');
    no.type = 'button'; no.className = 'is-ghost'; no.textContent = opt.cancel || '취소';
    const yes = document.createElement('button');
    yes.type = 'button'; yes.className = opt.danger ? 'is-danger' : 'is-primary'; yes.textContent = opt.ok || '확인';
    btns.append(no, yes);
    d.append(btns);
    const done = (value) => { d.close(); d.remove(); resolve(value); };
    const accept = () => {
      if (!input) return done(true);
      const v = input.value.trim();
      if (v) done(v); else input.focus();
    };
    no.addEventListener('click', () => done(none));
    yes.addEventListener('click', accept);
    d.addEventListener('cancel', (e) => { e.preventDefault(); done(none); });
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); accept(); } });
    document.body.append(d);
    d.showModal();
    (input || (opt.danger ? no : yes)).focus();
  });
}

/* ---------- 화면 그리기 ---------- */
const PLAIN = (() => {
  const t = document.createElement('div');
  try { t.contentEditable = 'plaintext-only'; return t.contentEditable === 'plaintext-only'; } catch (e) { return false; }
})();

function draw() {
  const data = dataOf(editing ? draft : saved);
  main.innerHTML = renderMain(view, data, { edit: editing, user });
  const footer = document.querySelector('footer.site-footer');
  if (footer) footer.outerHTML = renderFooter(data, { edit: editing });
  document.title = pageTitle(view, data);
  document.body.classList.toggle('editing', editing);
  if (editing) {
    document.querySelectorAll('[data-e]').forEach((el) => {
      el.setAttribute('contenteditable', PLAIN ? 'plaintext-only' : 'true');
      el.setAttribute('spellcheck', 'false');
    });
  }
  drawBar();
}

function focusField(ref) {
  const el = document.querySelector('[data-e="' + ref + '"]');
  if (!el) return;
  el.focus();
  if (el.firstChild) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  el.scrollIntoView({ block: 'nearest' });
}

/* ---------- 글자 고치기 ---------- */
function docData(name) {
  if (name === 'site') return draft.site.data;
  const m = draft.members[name.slice('member:'.length)];
  return m ? m.data : null;
}
function write(ref, value) {
  const cut = ref.indexOf('|');
  let o = docData(ref.slice(0, cut));
  const keys = ref.slice(cut + 1).split('.');
  for (let i = 0; o && i < keys.length - 1; i++) o = o[keys[i]];
  if (o && typeof o === 'object') o[keys[keys.length - 1]] = value;
}
const field = (e) => (editing && e.target instanceof Element ? e.target.closest('[data-e]') : null);

document.addEventListener('input', (e) => {
  const el = field(e);
  if (!el) return;
  let text = el.innerText.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
  if (!el.hasAttribute('data-ml')) text = text.replace(/\n+/g, ' ');
  if (!text.trim()) {
    text = '';
    if (el.firstChild) el.textContent = '';   // 빈칸 안내 글자가 다시 보이도록
  }
  write(el.dataset.e, text);
  /* 프로필 링크: 주소를 적으면 바로 그 서비스의 로고를 앞에 보여 주고, 이름 칸의 안내도 맞춰 바꿉니다. */
  const row = /^(member:[a-z0-9-]+\|links\.\d+)\.url$/.exec(el.dataset.e);
  const nameEl = row && document.querySelector('[data-e="' + row[1] + '.label"]');
  if (nameEl) {
    nameEl.dataset.ph = linkHint(text);
    const logoEl = nameEl.parentNode.querySelector('.ed-links__logo');
    if (logoEl) logoEl.innerHTML = linkLogo(text);
  }
  drawBar();
});

document.addEventListener('keydown', (e) => {
  const el = field(e);
  if (el && e.key === 'Enter' && !e.isComposing && !el.hasAttribute('data-ml')) {
    e.preventDefault();
    el.blur();
  }
});

/* 붙여넣기는 서식 없이 글자만 */
document.addEventListener('paste', (e) => {
  const el = field(e);
  if (!el) return;
  e.preventDefault();
  let text = (e.clipboardData ? e.clipboardData.getData('text/plain') : '') || '';
  text = el.hasAttribute('data-ml') ? text.replace(/\r\n?/g, '\n') : text.replace(/\s*[\r\n]+\s*/g, ' ');
  document.execCommand('insertText', false, text);
});
document.addEventListener('drop', (e) => { if (field(e)) e.preventDefault(); });

/* ---------- 이미지 올리기 ---------- */
function pickFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.addEventListener('change', () => resolve((input.files && input.files[0]) || null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}
const toBlob = (canvas, quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

/* 올리기 전에 브라우저에서 크기를 줄입니다. (긴 변 max 픽셀, JPEG) */
async function shrink(file, max) {
  let src = null;
  if (window.createImageBitmap) {
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { src = null; }
  }
  if (!src) src = await loadImage(file);
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
  const k = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * k));
  canvas.height = Math.max(1, Math.round(h * k));
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, canvas.width, canvas.height);
  if (src.close) src.close();
  let blob = await toBlob(canvas, 0.86);
  if (blob && blob.size > 1400000) blob = await toBlob(canvas, 0.7);
  if (!blob || blob.size > 1400000) throw new Error('size');
  return blob;
}

/* 파일을 고르고 올린 뒤 주소('/media/…')를 돌려줍니다. 취소·실패하면 '' */
async function uploadImage(max) {
  const file = await pickFile();
  if (!file) return '';
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    toast('JPG, PNG, WebP 이미지만 올릴 수 있습니다.', 'error');
    return '';
  }
  toast('이미지를 올리는 중…', 'wait');
  try {
    const blob = await shrink(file, max);
    const res = await fetch('/api/upload', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'image/jpeg' }, body: blob
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.url) {
      toast(res.status === 401 ? '로그인이 풀렸습니다. 새 탭에서 다시 로그인한 뒤 올려 주세요.' : (body.error || '이미지를 올리지 못했습니다.'), 'error');
      return '';
    }
    toast('이미지를 올렸습니다. ‘저장’을 눌러야 사이트에 반영됩니다.');
    return body.url;
  } catch (e) {
    toast('이미지를 올리지 못했습니다. 다른 파일로 다시 시도해 주세요.', 'error');
    return '';
  }
}

/* ---------- 추가 · 삭제 · 순서 바꾸기 ---------- */
function uid(prefix) {
  const n = crypto.getRandomValues(new Uint32Array(1))[0];
  return prefix + '-' + n.toString(36).padStart(7, '0');
}
function move(arr, i, dir) {
  const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return;
  const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
}

async function act(name, arg, checked) {
  const s = draft.site.data;
  const mdoc = view.page === 'member' ? 'member:' + view.id : '';
  const m = mdoc ? docData(mdoc) : null;
  let focus = '';

  switch (name) {
    /* 프로젝트 */
    case 'proj-add':
      if (s.projects.length >= 12) return toast('프로젝트는 12개까지 넣을 수 있습니다.', 'error');
      s.projects.push({ id: uid('p'), label: '', name: '새 프로젝트', desc: '', url: '', image: '', art: '', tone: 'soft' });
      focus = 'site|projects.' + (s.projects.length - 1) + '.name';
      break;
    case 'proj-del': {
      const p = s.projects[+arg];
      if (!p || !(await ask('‘' + (p.name || '이름 없는 프로젝트') + '’ 프로젝트를 삭제할까요?', { ok: '삭제', danger: true }))) return;
      s.projects.splice(+arg, 1);
      break;
    }
    case 'proj-move': {
      const [i, dir] = arg.split(',').map(Number);
      move(s.projects, i, dir);
      break;
    }
    case 'proj-image': {
      const url = await uploadImage(1600);
      if (!url || !s.projects[+arg]) return;
      s.projects[+arg].image = url;
      break;
    }
    case 'proj-image-del':
      if (!s.projects[+arg]) return;
      s.projects[+arg].image = '';
      break;

    /* 꼬리말의 채널 링크 */
    case 'link-add':
      s.links = s.links || [];
      if (s.links.length >= 8) return toast('링크는 8개까지 넣을 수 있습니다.', 'error');
      s.links.push({ label: '', url: '' });
      focus = 'site|links.' + (s.links.length - 1) + '.label';
      break;
    case 'link-del':
      if (!s.links || !s.links[+arg]) return;
      s.links.splice(+arg, 1);
      break;

    /* 팀 */
    case 'member-add': {
      if (s.team.length >= 24) return toast('팀원은 24명까지 넣을 수 있습니다.', 'error');
      const who = await ask('새 팀원의 이름을 적어 주세요.', { input: true, ok: '추가' });
      if (!who) return;
      const id = uid('m');
      draft.members[id] = {
        version: 0,
        data: { name: who, role: '팀원', lead: false, quote: '', photo: '', email: '', links: [], bio: '', skills: [], history: [], awards: [], projects: [], works: [] }
      };
      s.team.push(id);
      toast('‘저장’을 누른 뒤 카드를 눌러 프로필을 채워 주세요.');
      break;
    }
    case 'member-del': {
      const who = draft.members[arg];
      if (!who || !(await ask(who.data.name + ' 님의 프로필을 삭제할까요?\n‘저장’을 누르면 프로필 내용이 모두 지워집니다.', { ok: '삭제', danger: true }))) return;
      s.team = s.team.filter((id) => id !== arg);
      break;
    }
    case 'member-move': {
      const [id, dir] = arg.split(',');
      move(s.team, s.team.indexOf(id), +dir);
      break;
    }

    /* 팀원 개인 페이지 */
    case 'photo': {
      const url = await uploadImage(1200);
      if (!url || !m) return;
      m.photo = url;
      break;
    }
    case 'photo-del': if (!m) return; m.photo = ''; break;
    case 'lead': if (!m) return; m.lead = !!checked; break;
    case 'mlink-add':
      if (!m) return;
      if (!m.links) m.links = [];
      if (m.links.length >= 8) return toast('링크는 8개까지 넣을 수 있습니다.', 'error');
      m.links.push({ label: '', url: '' });
      focus = mdoc + '|links.' + (m.links.length - 1) + '.url';
      break;
    case 'mlink-del': if (!m || !m.links) return; m.links.splice(+arg, 1); break;
    case 'skill-add':
      if (!m) return;
      if (m.skills.length >= 16) return toast('담당 분야는 16개까지 넣을 수 있습니다.', 'error');
      m.skills.push('');
      focus = mdoc + '|skills.' + (m.skills.length - 1);
      break;
    case 'skill-del': if (!m) return; m.skills.splice(+arg, 1); break;
    case 'hist-add':
      if (!m) return;
      if (m.history.length >= 30) return toast('이력은 30개까지 넣을 수 있습니다.', 'error');
      m.history.push({ year: '', text: '' });
      focus = mdoc + '|history.' + (m.history.length - 1) + '.year';
      break;
    case 'hist-del': if (!m) return; m.history.splice(+arg, 1); break;
    case 'award-add':
      if (!m) return;
      if (!m.awards) m.awards = [];
      if (m.awards.length >= 30) return toast('수상 · 자격증은 30개까지 넣을 수 있습니다.', 'error');
      m.awards.push({ year: '', text: '' });
      focus = mdoc + '|awards.' + (m.awards.length - 1) + '.year';
      break;
    case 'award-del': if (!m || !m.awards) return; m.awards.splice(+arg, 1); break;
    case 'mproj': {
      if (!m) return;
      const i = m.projects.findIndex((r) => r.id === arg);
      if (checked && i < 0) { m.projects.push({ id: arg, role: '' }); focus = mdoc + '|projects.' + (m.projects.length - 1) + '.role'; }
      if (!checked && i >= 0) m.projects.splice(i, 1);
      break;
    }
    case 'work-add':
      if (!m) return;
      if (m.works.length >= 12) return toast('작업물은 12개까지 넣을 수 있습니다.', 'error');
      m.works.push({ title: '', desc: '', image: '', url: '' });
      focus = mdoc + '|works.' + (m.works.length - 1) + '.title';
      break;
    case 'work-del': {
      const w = m && m.works[+arg];
      if (!w) return;
      if ((w.title || w.image) && !(await ask('‘' + (w.title || '제목 없는 작업물') + '’을(를) 삭제할까요?', { ok: '삭제', danger: true }))) return;
      m.works.splice(+arg, 1);
      break;
    }
    case 'work-image': {
      const url = await uploadImage(1600);
      if (!url || !m || !m.works[+arg]) return;
      m.works[+arg].image = url;
      break;
    }
    case 'work-image-del': if (!m || !m.works[+arg]) return; m.works[+arg].image = ''; break;
    default: return;
  }
  draw();
  if (focus) focusField(focus);
}

/* ---------- 저장 ---------- */
async function call(method, url, body) {
  try {
    const res = await fetch(url, {
      method, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok === true, status: res.status, body: data };
  } catch (e) {
    return { ok: false, status: 0, body: {} };
  }
}
function problem(r) {
  if (r.status === 0) return '서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 저장해 주세요.';
  if (r.status === 401) return '로그인이 풀렸습니다. 새 탭에서 다시 로그인한 뒤 ‘저장’을 눌러 주세요.';
  if (r.status === 409) return '다른 팀원이 먼저 수정했습니다. 고친 내용을 따로 복사해 두고, 새로고침한 뒤 다시 수정해 주세요.';
  return r.body.error || '저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
}

async function save() {
  if (busy) return false;
  busy = true;
  drawBar();
  let error = '';
  try {
    /* 1) 바뀐 팀원 프로필  2) 사이트 공통 내용  3) 팀에서 뺀 팀원의 프로필 삭제 */
    for (const id of draft.site.data.team) {
      const cur = draft.members[id], old = saved.members[id];
      if (!cur || (old && same(cur.data, old.data))) continue;
      const r = await call('PUT', '/api/member/' + id, { version: cur.version, data: cur.data });
      if (!r.ok) { error = problem(r); break; }
      draft.members[id] = { data: r.body.data, version: r.body.version };
      saved.members[id] = clone(draft.members[id]);
    }
    if (!error && !same(draft.site.data, saved.site.data)) {
      const r = await call('PUT', '/api/site', { version: draft.site.version, data: draft.site.data });
      if (!r.ok) error = problem(r);
      else {
        draft.site = { data: r.body.data, version: r.body.version };
        saved.site = clone(draft.site);
      }
    }
    if (!error) {
      for (const id of Object.keys(saved.members)) {
        if (draft.site.data.team.includes(id)) continue;
        const r = await call('DELETE', '/api/member/' + id);
        if (!r.ok) { error = problem(r); break; }
        delete saved.members[id];
        delete draft.members[id];
      }
    }
  } finally {
    busy = false;
  }
  if (error) {
    drawBar();
    toast(error, 'error');
    return false;
  }
  draw();
  toast('저장했습니다.');
  return true;
}

/* ---------- 버튼 ---------- */
async function barAction(name) {
  if (busy) return;
  if (name === 'edit') {
    editing = true;
    remember(true);
    draw();
  } else if (name === 'save') {
    await save();
  } else if (name === 'cancel') {
    if (isDirty() && !(await ask('저장하지 않은 변경사항을 버릴까요?', { ok: '버리기', cancel: '계속 편집', danger: true }))) return;
    draft = clone(saved);
    editing = false;
    remember(false);
    draw();
  }
}

document.addEventListener('click', (e) => {
  if (!(e.target instanceof Element)) return;
  const b = e.target.closest('[data-bar]');
  if (b) { barAction(b.dataset.bar); return; }
  if (!editing) return;

  const btn = e.target.closest('button[data-act]');
  if (btn) {
    e.preventDefault();
    if (!btn.disabled && !busy) act(btn.dataset.act, btn.dataset.arg);
    return;
  }

  /* 저장하지 않은 채 다른 페이지로 가려 할 때 */
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.origin !== location.origin || !isDirty()) return;
  if (a.pathname === location.pathname && a.hash) return;
  e.preventDefault();
  ask('저장하지 않은 변경사항이 있습니다.\n저장하고 이동할까요?', { ok: '저장하고 이동', cancel: '머무르기' }).then(async (yes) => {
    if (yes && await save()) location.href = a.href;
  });
});

document.addEventListener('change', (e) => {
  if (!editing || !(e.target instanceof Element)) return;
  const box = e.target.closest('input[data-act]');
  if (box) act(box.dataset.act, box.dataset.arg, box.checked);
});

window.addEventListener('beforeunload', (e) => {
  if (editing && isDirty()) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- 시작 ---------- */
if (canEdit && remembered()) {
  editing = true;
  draw();
} else {
  drawBar();
}
