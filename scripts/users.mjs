#!/usr/bin/env node
/* 고조선 홈페이지 — 수정 권한 계정 관리
   사이트에는 가입 기능이 없습니다. 계정은 이 스크립트로만 만들 수 있습니다.

   node scripts/users.mjs init                  네 명의 계정을 만듭니다 (이미 있는 계정은 그대로 둠)
   node scripts/users.mjs list                  계정 목록
   node scripts/users.mjs reset <아이디>        비밀번호를 새로 발급하고, 그 계정의 로그인을 모두 끊습니다
   node scripts/users.mjs add <아이디> <이름>   계정 추가
   node scripts/users.mjs remove <아이디>       계정 삭제

   끝에 --remote 를 붙이면 실제(배포된) 사이트의 데이터베이스에, 없으면 내 컴퓨터의 테스트용 데이터베이스에 적용합니다.
   비밀번호는 만들 때 한 번만 화면에 나옵니다. (DB에는 되돌릴 수 없는 값으로만 저장됩니다) */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../server/auth.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB_NAME = 'gojoseon';
const TEAM = [
  ['yangsunwoo', '양선우'],
  ['juyongseok', '주용석'],
  ['parkchanseo', '박찬서'],
  ['limdangun', '임단군']
];

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

function show(rows) {
  console.log('\n[' + where + '] 아래 비밀번호는 지금 한 번만 보입니다. 각자에게 안전하게 전달하고,');
  console.log('로그인한 뒤 계정 화면에서 본인만 아는 비밀번호로 바꾸게 해 주세요.\n');
  for (const r of rows) console.log('  ' + r.name + '   아이디: ' + r.username + '   비밀번호: ' + r.password);
  console.log('');
}

async function create(list) {
  const rows = [];
  let sql = '';
  for (const [username, name] of list) {
    const password = newPassword();
    sql += 'INSERT INTO users (username, name, pw, updated_at) VALUES (' +
      [q(username), q(name), q(await hashPassword(password)), Date.now()].join(', ') + ');\n';
    rows.push({ username, name, password });
  }
  run(sql);
  show(rows);
}

if (command === 'init') {
  const have = new Set(query('SELECT username FROM users').map((r) => r.username));
  const todo = TEAM.filter(([u]) => !have.has(u));
  if (!todo.length) console.log('\n[' + where + '] 네 명의 계정이 이미 모두 있습니다. 비밀번호를 다시 받으려면: node scripts/users.mjs reset <아이디>\n');
  else await create(todo);
} else if (command === 'list') {
  const rows = query('SELECT username, name FROM users ORDER BY id');
  console.log('\n[' + where + '] 수정 권한 계정 ' + rows.length + '개');
  for (const r of rows) console.log('  ' + r.name + '   아이디: ' + r.username);
  console.log('');
} else if (command === 'reset') {
  const username = checkUsername(rest[0]);
  const found = query('SELECT name FROM users WHERE username = ' + q(username));
  if (!found.length) die('그런 아이디가 없습니다: ' + username);
  const password = newPassword();
  run('UPDATE users SET pw = ' + q(await hashPassword(password)) + ', updated_at = ' + Date.now() + ' WHERE username = ' + q(username) + ';\n' +
    'DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ' + q(username) + ');\n');
  show([{ username, name: found[0].name, password }]);
} else if (command === 'add') {
  const username = checkUsername(rest[0]);
  const name = (rest[1] || '').trim();
  if (!name || name.length > 40) die('이름을 적어 주세요. 예: node scripts/users.mjs add honggildong 홍길동');
  if (query('SELECT 1 AS x FROM users WHERE username = ' + q(username)).length) die('이미 있는 아이디입니다: ' + username);
  await create([[username, name]]);
} else if (command === 'remove') {
  const username = checkUsername(rest[0]);
  run('DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ' + q(username) + ');\n' +
    'DELETE FROM users WHERE username = ' + q(username) + ';\n');
  console.log('\n[' + where + '] 계정을 삭제했습니다: ' + username + '\n');
} else {
  die('사용법:\n' +
    '  node scripts/users.mjs init                  네 명의 계정 만들기\n' +
    '  node scripts/users.mjs list                  계정 목록\n' +
    '  node scripts/users.mjs reset <아이디>        비밀번호 새로 발급\n' +
    '  node scripts/users.mjs add <아이디> <이름>   계정 추가\n' +
    '  node scripts/users.mjs remove <아이디>       계정 삭제\n' +
    '  (끝에 --remote 를 붙이면 실제 사이트에 적용)');
}
