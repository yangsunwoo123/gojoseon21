/* 로그인 · 세션 · 비밀번호.
   계정을 만드는 길은 scripts/users.mjs 하나뿐입니다. 사이트에는 가입 기능이 없습니다.
   (이 파일은 Cloudflare 서버와, 계정을 만드는 Node 스크립트 양쪽에서 씁니다.) */

const ITERATIONS = 100000;                 // Cloudflare Workers 가 허용하는 PBKDF2 최대 반복 수
const SESSION_MS = 14 * 24 * 60 * 60 * 1000; // 로그인 유지 14일
const WINDOW_MS = 15 * 60 * 1000;          // 로그인 실패 횟수를 세는 시간
const MAX_PER_IP = 10;
const MAX_PER_USER = 50;
export const MIN_PASSWORD = 10;

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
/* 로그인한 팀원이면 { id, username, name, tokenHash }, 아니면 null */
export async function getUser(request, db) {
  const token = readToken(request);
  if (!token || !db) return null;
  try {
    const tokenHash = await sha256Hex(token);
    const row = await db.prepare(
      'SELECT u.id, u.username, u.name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1'
    ).bind(tokenHash).first();
    if (!row || row.expires_at <= Date.now()) return null;
    return { id: row.id, username: row.username, name: row.name, tokenHash };
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

  const row = await db.prepare('SELECT id, username, name, pw FROM users WHERE username = ?1').bind(username).first();
  const ok = await verifyPassword(password, row ? row.pw : await dummyHash());
  if (!row || !ok) {
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
  return { status: 200, token, user: { id: row.id, username: row.username, name: row.name } };
}

/* ---------- 비밀번호 바꾸기 ---------- */
export async function changePassword(db, user, current, next) {
  current = typeof current === 'string' ? current : '';
  next = typeof next === 'string' ? next : '';
  if (!current || !next) return { status: 400, error: '비밀번호를 입력해 주세요.' };
  if (next.length < MIN_PASSWORD) return { status: 400, error: '새 비밀번호는 ' + MIN_PASSWORD + '자 이상이어야 합니다.' };
  if (next.length > 200) return { status: 400, error: '새 비밀번호가 너무 깁니다.' };

  const row = await db.prepare('SELECT pw FROM users WHERE id = ?1').bind(user.id).first();
  if (!row || !(await verifyPassword(current, row.pw))) {
    return { status: 403, error: '지금 비밀번호가 올바르지 않습니다.' };
  }
  await db.batch([
    db.prepare('UPDATE users SET pw = ?1, updated_at = ?2 WHERE id = ?3').bind(await hashPassword(next), Date.now(), user.id),
    /* 다른 기기에 남아 있던 로그인은 모두 끊습니다. */
    db.prepare('DELETE FROM sessions WHERE user_id = ?1 AND token_hash != ?2').bind(user.id, user.tokenHash)
  ]);
  return { status: 200 };
}
