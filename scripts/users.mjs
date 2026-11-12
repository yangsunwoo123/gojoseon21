#!/usr/bin/env node
/* 고조선 홈페이지 — 수정 권한 계정 관리
   사이트에는 가입 기능이 없습니다. 계정은 이 스크립트로만 만들 수 있습니다.
   (이 저장소는 공개되어 있으므로 실제 아이디는 이 파일에 적지 않습니다. 명령을 실행할 때 직접 적습니다.)

   node scripts/users.mjs list                                계정 목록과 비밀번호 상태
   node scripts/users.mjs add <아이디> <이름> [임시 비밀번호]   계정 추가
   node scripts/users.mjs reset <아이디> [임시 비밀번호]        임시 비밀번호를 다시 정하고, 그 계정의 로그인을 모두 끊습니다
   node scripts/users.mjs rename <지금 아이디> <새 아이디>      아이디 바꾸기 (예전 아이디는 없어집니다)
   node scripts/users.mjs remove <아이디>                      계정 삭제
   node scripts/users.mjs migrate                             예전에 만든 데이터베이스에 새 칸 추가 (다른 명령이 알아서 먼저 실행)

   끝에 --remote 를 붙이면 실제(배포된) 사이트의 데이터베이스에, 없으면 내 컴퓨터의 테스트용 데이터베이스에 적용합니다.

   여기서 정해 준 비밀번호는 모두 '임시 비밀번호' 입니다. (적지 않으면 무작위 14자를 만들어 한 번 보여 줍니다)
   - 임시 비밀번호로 로그인하면 새 비밀번호를 정하는 것만 할 수 있고, 정하기 전에는 편집할 수 없습니다.
   - 7일 안에 바꾸지 않으면 그 임시 비밀번호로는 로그인되지 않습니다. (reset 으로 다시 정해 줍니다)
   DB에는 비밀번호가 되돌릴 수 없는 값으로만 저장됩니다. */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, TEMP_MS } from '../server/auth.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB_NAME = 'gojoseon';

const args = process.argv.slice(2);
const remote = args.includes('--remote');
const [command, ...rest] = args.filter((a) => a !== '--remote');
const where = remote ? '실제 사이트' : '내 컴퓨터(테스트용)';

function die(message) {
  console.error('\n' + message + '\n');
  process.exit(1);
}

function wrangler(extra) {
  const line = ['npx', '--yes', 'wrangler@4', 'd1', 'execute', DB_NAME, remote ? '--remote' : '--local', ...extra].join(' ');
  const r = spawnSync(line, { cwd: ROOT, shell: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) {
    die('데이터베이스 명령이 실패했습니다.\n' + (r.stderr || '') + (r.stdout || '') +
      '\n표가 아직 없다면 먼저 실행하세요:  npm run db:init' + (remote ? ':remote' : ''));
  }
  return r.stdout || '';
}

/* SQL 을 임시 파일에 써서 실행합니다. (비밀번호 해시가 명령줄 기록에 남지 않도록) */
function run(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'gojoseon-'));
  const file = join(dir, 'q.sql');
  try {
    writeFileSync(file, sql, 'utf8');
    wrangler(['"--file=' + file + '"', '--yes']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function query(sql) {
  const out = wrangler(['--json', '--command', '"' + sql + '"']);
  const start = out.indexOf('[');
  try {
    return JSON.parse(out.slice(start))[0].results || [];
  } catch (e) {
    die('데이터베이스 응답을 읽지 못했습니다.\n' + out);
  }
}

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

function checkUsername(u) {
  if (!/^[a-z0-9]{3,32}$/.test(u || '')) die('아이디는 영문 소문자와 숫자 3~32자로 적어 주세요.');
  return u;
}

/* 예전에 만든 데이터베이스에는 임시 비밀번호용 칸이 없습니다. 없으면 추가합니다. */
function migrate() {
  const have = new Set(query('PRAGMA table_info(users)').map((r) => r.name));
  if (!have.size) die('users 표가 없습니다. 먼저 실행하세요:  npm run db:init' + (remote ? ':remote' : ''));
  let sql = '';
  if (!have.has('must_change')) sql += 'ALTER TABLE users ADD COLUMN must_change INTEGER NOT NULL DEFAULT 0;\n';
  if (!have.has('temp_until')) sql += 'ALTER TABLE users ADD COLUMN temp_until INTEGER NOT NULL DEFAULT 0;\n';
  if (sql) run(sql);
  return !!sql;
}

/* 헷갈리는 글자(0 O 1 l I)를 뺀 무작위 비밀번호 14자 */
function newPassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  while (out.length < 14) {
    const b = crypto.getRandomValues(new Uint8Array(1))[0];
    if (b < chars.length * 4) out += chars[b % chars.length];
  }
  return out;
}

/* 임시 비밀번호: 직접 적었으면 그것을, 아니면 무작위로 만든 것을 씁니다. */
function tempPassword(given) {
  if (given === undefined) return { password: newPassword(), given: false };
  if (given.length < 4 || given.length > 200 || /\s/.test(given)) die('임시 비밀번호는 띄어쓰기 없이 4자 이상으로 적어 주세요.');
  return { password: given, given: true };
}

const day = (ms) => new Date(ms).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function show(row, until) {
  console.log('\n[' + where + '] ' + row.name + '   아이디: ' + row.username + '   임시 비밀번호: ' + (row.given ? '(적어 준 것)' : row.password));
  console.log('  ' + day(until) + ' 까지 로그인해서 새 비밀번호를 정해야 합니다. 정하기 전에는 편집할 수 없습니다.\n');
}

if (command === 'migrate') {
  console.log('\n[' + where + '] ' + (migrate() ? '새 칸을 추가했습니다.' : '이미 최신 구조입니다.') + '\n');
} else if (command === 'list') {
  migrate();
  const rows = query('SELECT username, name, must_change, temp_until FROM users ORDER BY id');
  const now = Date.now();
  console.log('\n[' + where + '] 수정 권한 계정 ' + rows.length + '개');
  for (const r of rows) {
    const state = !r.must_change ? '본인이 정한 비밀번호'
      : r.temp_until > now ? '임시 비밀번호 (아직 안 바꿈, ' + day(r.temp_until) + ' 까지)'
      : '임시 비밀번호 기간 지남 — 로그인 불가 (reset 필요)';
    console.log('  ' + r.name + '   아이디: ' + r.username + '   ' + state);
  }
  console.log('');
} else if (command === 'add') {
  migrate();
  const username = checkUsername(rest[0]);
  const name = (rest[1] || '').trim();
  if (!name || name.length > 40) die('이름을 적어 주세요. 예: node scripts/users.mjs add honggildong 홍길동');
  if (query('SELECT 1 AS x FROM users WHERE username = ' + q(username)).length) die('이미 있는 아이디입니다: ' + username);
  const t = tempPassword(rest[2]);
  const now = Date.now();
  run('INSERT INTO users (username, name, pw, updated_at, must_change, temp_until) VALUES (' +
    [q(username), q(name), q(await hashPassword(t.password)), now, 1, now + TEMP_MS].join(', ') + ');\n');
  show({ username, name, password: t.password, given: t.given }, now + TEMP_MS);
} else if (command === 'reset') {
  migrate();
  const username = checkUsername(rest[0]);
  const found = query('SELECT name FROM users WHERE username = ' + q(username));
  if (!found.length) die('그런 아이디가 없습니다: ' + username);
  const t = tempPassword(rest[1]);
  const now = Date.now();
  run('UPDATE users SET pw = ' + q(await hashPassword(t.password)) + ', must_change = 1, temp_until = ' + (now + TEMP_MS) +
    ', updated_at = ' + now + ' WHERE username = ' + q(username) + ';\n' +
    'DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ' + q(username) + ');\n' +
    'DELETE FROM login_attempts WHERE k = ' + q('u:' + username) + ';\n');
  show({ username, name: found[0].name, password: t.password, given: t.given }, now + TEMP_MS);
} else if (command === 'rename') {
  migrate();
  const from = checkUsername(rest[0]);
  const to = checkUsername(rest[1]);
  if (!query('SELECT 1 AS x FROM users WHERE username = ' + q(from)).length) die('그런 아이디가 없습니다: ' + from);
  if (query('SELECT 1 AS x FROM users WHERE username = ' + q(to)).length) die('이미 있는 아이디입니다: ' + to);
  run('DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ' + q(from) + ');\n' +
    'UPDATE users SET username = ' + q(to) + ', updated_at = ' + Date.now() + ' WHERE username = ' + q(from) + ';\n' +
    'DELETE FROM login_attempts WHERE k IN (' + q('u:' + from) + ', ' + q('u:' + to) + ');\n');
  console.log('\n[' + where + '] 아이디를 바꿨습니다: ' + from + ' → ' + to + '   (예전 아이디로는 더 이상 로그인되지 않습니다)\n');
} else if (command === 'remove') {
  const username = checkUsername(rest[0]);
  run('DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ' + q(username) + ');\n' +
    'DELETE FROM users WHERE username = ' + q(username) + ';\n');
  console.log('\n[' + where + '] 계정을 삭제했습니다: ' + username + '\n');
} else {
  die('사용법:\n' +
    '  node scripts/users.mjs list                                계정 목록과 비밀번호 상태\n' +
    '  node scripts/users.mjs add <아이디> <이름> [임시 비밀번호]   계정 추가\n' +
    '  node scripts/users.mjs reset <아이디> [임시 비밀번호]        임시 비밀번호 다시 정하기\n' +
    '  node scripts/users.mjs rename <지금 아이디> <새 아이디>      아이디 바꾸기\n' +
    '  node scripts/users.mjs remove <아이디>                      계정 삭제\n' +
    '  (끝에 --remote 를 붙이면 실제 사이트에 적용)');
}
