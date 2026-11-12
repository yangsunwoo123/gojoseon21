/* 로그인 · 세션 · 비밀번호.
   계정을 만드는 길은 scripts/users.mjs 하나뿐입니다. 사이트에는 가입 기능이 없습니다.
   (이 파일은 Cloudflare 서버와, 계정을 만드는 Node 스크립트 양쪽에서 씁니다.) */

const ITERATIONS = 100000;                 // Cloudflare Workers 가 허용하는 PBKDF2 최대 반복 수
const SESSION_MS = 14 * 24 * 60 * 60 * 1000; // 로그인 유지 14일
const WINDOW_MS = 15 * 60 * 1000;          // 로그인 실패 횟수를 세는 시간
const MAX_PER_IP = 10;
const MAX_PER_USER = 50;
export const MIN_PASSWORD = 10;
/* 개발자가 정해 준 비밀번호는 '임시 비밀번호' 입니다. 그것으로 로그인하면 새 비밀번호를 정하는 것만
   할 수 있고(편집 불가), 이 기간 안에 바꾸지 않으면 그 비밀번호로는 더 이상 로그인되지 않습니다. */
export const TEMP_MS = 7 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function toB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/* 비밀번호는 원문을 저장하지 않고, 되돌릴 수 없는 값으로 바꿔 저장합니다. */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return 'pbkdf2$' + ITERATIONS + '$' + toB64(salt) + '$' + toB64(hash);
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > ITERATIONS) return false;
  let salt, want;
  try { salt = fromB64(parts[2]); want = fromB64(parts[3]); } catch (e) { return false; }
  const got = await pbkdf2(password, salt, iterations);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

/* 없는 아이디로 시도해도 응답 시간이 같도록, 비교용 가짜 값을 하나 만들어 둡니다. */
let dummy;
function dummyHash() {
  if (!dummy) dummy = hashPassword('gojoseon-dummy-' + Math.random());
  return dummy;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function newToken() {
  return toB64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ---------- 쿠키 ---------- */
function isHttps(request) {
  return new URL(request.url).protocol === 'https:';
}
function cookieName(request) {
  return isHttps(request) ? '__Host-gj_s' : 'gj_s';
}
function readToken(request) {
  const name = cookieName(request);
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      const v = part.slice(i + 1).trim();
      return /^[A-Za-z0-9_-]{43}$/.test(v) ? v : '';
    }
  }
  return '';
}
export function sessionCookie(request, token) {
  return cookieName(request) + '=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' +
    Math.floor(SESSION_MS / 1000) + (isHttps(request) ? '; Secure' : '');
}
export function clearCookie(request) {
  return cookieName(request) + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' + (isHttps(request) ? '; Secure' : '');
}

/* ---------- 세션 ---------- */
/* 로그인한 팀원이면 { id, username, name, tokenHash, mustChange }, 아니면 null.
   임시 비밀번호로 들어와 아직 새 비밀번호를 정하지 않은 상태는 로그인으로 치지 않습니다(null).
   새 비밀번호를 정하는 화면과 API 만 { temp: true } 를 넘겨 그 상태를 받아들입니다. */
export async function getUser(request, db, opts) {
  const token = readToken(request);
  if (!token || !db) return null;
  try {
    const tokenHash = await sha256Hex(token);
    const now = Date.now();
    const row = await db.prepare(
      'SELECT u.id, u.username, u.name, u.must_change, u.temp_until, s.expires_at ' +
      'FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1'
    ).bind(tokenHash).first();
    if (!row || row.expires_at <= now) return null;
    if (row.must_change && (!(opts && opts.temp) || row.temp_until <= now)) return null;
    return { id: row.id, username: row.username, name: row.name, tokenHash, mustChange: !!row.must_change };
  } catch (e) {
    console.error('session check failed:', e && e.message);
    return null;
  }
}

async function createSession(db, userId) {
  const token = newToken();
  const now = Date.now();
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?1').bind(now),
    db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(await sha256Hex(token), userId, now, now + SESSION_MS)
  ]);
  return token;
}

export async function endSession(request, db) {
  const token = readToken(request);
  if (!token) return;
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256Hex(token)).run();
}

/* ---------- 로그인 ---------- */
export async function attemptLogin(db, request, username, password) {
  username = typeof username === 'string' ? username.trim().toLowerCase() : '';
  password = typeof password === 'string' ? password : '';
  if (!username || !password || username.length > 64 || password.length > 200) {
    return { status: 400, error: '아이디와 비밀번호를 입력해 주세요.' };
  }

  const now = Date.now();
  const ipKey = 'ip:' + (request.headers.get('CF-Connecting-IP') || 'local');
  const userKey = 'u:' + username;

  /* 무작위 대입을 막기 위해 실패 횟수를 셉니다. */
  const counts = await db.prepare(
    'SELECT k, COUNT(*) AS n FROM login_attempts WHERE k IN (?1, ?2) AND at > ?3 GROUP BY k'
  ).bind(ipKey, userKey, now - WINDOW_MS).all();
  const n = {};
  for (const r of counts.results || []) n[r.k] = r.n;
  if ((n[ipKey] || 0) >= MAX_PER_IP || (n[userKey] || 0) >= MAX_PER_USER) {
    return { status: 429, error: '로그인 시도가 너무 많습니다. 15분 뒤에 다시 시도해 주세요.' };
  }

  const row = await db.prepare(
    'SELECT id, username, name, pw, must_change, temp_until FROM users WHERE username = ?1'
  ).bind(username).first();
  const ok = await verifyPassword(password, row ? row.pw : await dummyHash());
  /* 기간이 지난 임시 비밀번호는 틀린 비밀번호와 똑같이 다룹니다. */
  const expired = !!row && !!row.must_change && row.temp_until <= now;
  if (!row || !ok || expired) {
    await db.batch([
      db.prepare('INSERT INTO login_attempts (k, at) VALUES (?1, ?2)').bind(ipKey, now),
      db.prepare('INSERT INTO login_attempts (k, at) VALUES (?1, ?2)').bind(userKey, now),
      db.prepare('DELETE FROM login_attempts WHERE at <= ?1').bind(now - WINDOW_MS)
    ]);
    /* 아이디가 틀렸는지 비밀번호가 틀렸는지 알려 주지 않습니다. */
    return { status: 401, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }

  await db.prepare('DELETE FROM login_attempts WHERE k = ?1').bind(ipKey).run();
  const token = await createSession(db, row.id);
  return { status: 200, token, user: { id: row.id, username: row.username, name: row.name }, mustChange: !!row.must_change };
}

/* ---------- 비밀번호 바꾸기 ---------- */
/* 남이 바로 맞힐 수 있는 비밀번호인지: 글자 종류가 너무 적거나, 1234567890 처럼 차례로 이어지거나,
   abcabcabc 처럼 짧은 묶음을 되풀이한 것. */
function tooSimple(pw) {
  const s = pw.toLowerCase();
  if (new Set(s).size < 5) return true;
  let up = true, down = true;
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1);
    if (d !== 1 && !(s[i - 1] === '9' && s[i] === '0')) up = false;
    if (d !== -1 && !(s[i - 1] === '0' && s[i] === '9')) down = false;
  }
  if (up || down) return true;
  for (let size = 1; size <= s.length / 2; size++) {
    let same = true;
    for (let i = size; i < s.length && same; i++) same = s[i] === s[i - size];
    if (same) return true;
  }
  return false;
}

export async function changePassword(db, user, current, next) {
  current = typeof current === 'string' ? current : '';
  next = typeof next === 'string' ? next : '';
  if (!current || !next) return { status: 400, error: '비밀번호를 입력해 주세요.' };
  if (next.length < MIN_PASSWORD) return { status: 400, error: '새 비밀번호는 ' + MIN_PASSWORD + '자 이상이어야 합니다.' };
  if (next.length > 200) return { status: 400, error: '새 비밀번호가 너무 깁니다.' };
  if (next === current) return { status: 400, error: '새 비밀번호는 지금 비밀번호와 달라야 합니다.' };
  if (next.toLowerCase().includes(String(user.username).toLowerCase())) {
    return { status: 400, error: '새 비밀번호에 아이디를 넣을 수 없습니다.' };
  }
  if (tooSimple(next)) return { status: 400, error: '너무 단순한 비밀번호입니다. 다른 비밀번호로 정해 주세요.' };

  const row = await db.prepare('SELECT pw FROM users WHERE id = ?1').bind(user.id).first();
  if (!row || !(await verifyPassword(current, row.pw))) {
    return { status: 403, error: '지금 비밀번호가 올바르지 않습니다.' };
  }
  await db.batch([
    /* 본인이 정한 비밀번호가 되었으므로 임시 표시를 풉니다. */
    db.prepare('UPDATE users SET pw = ?1, must_change = 0, temp_until = 0, updated_at = ?2 WHERE id = ?3')
      .bind(await hashPassword(next), Date.now(), user.id),
    /* 다른 기기에 남아 있던 로그인은 모두 끊습니다. */
    db.prepare('DELETE FROM sessions WHERE user_id = ?1 AND token_hash != ?2').bind(user.id, user.tokenHash)
  ]);
  return { status: 200 };
}
