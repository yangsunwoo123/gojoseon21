/* 사이트 내용을 D1 데이터베이스에서 읽고 씁니다.
   docs 표의 key: 'site' (사이트 공통 내용), 'member:<id>' (팀원 프로필) */
import { DEFAULT_SITE, DEFAULT_MEMBERS } from './defaults.js';
import { cleanSite, cleanMember } from './validate.js';

const KEEP_REVISIONS = 50;

function parse(row, fallback, clean) {
  if (row) {
    try { return { data: clean(JSON.parse(row.json), false), version: row.version }; }
    catch (e) { return { data: clean(fallback, false), version: row.version }; }
  }
  return { data: clean(fallback, false), version: 0 };
}

/* 전체 내용을 읽습니다. DB를 쓸 수 없어도 기본 내용으로 화면은 나옵니다. */
export async function loadAll(db) {
  const rows = new Map();
  let dbOk = true;
  try {
    if (!db) throw new Error('DB binding is missing');
    const res = await db.prepare('SELECT key, json, version FROM docs').all();
    for (const r of res.results || []) rows.set(r.key, r);
  } catch (e) {
    dbOk = false;
    console.error('docs load failed:', e && e.message);
  }

  const site = parse(rows.get('site'), DEFAULT_SITE, cleanSite);
  const members = {};
  for (const id of site.data.team) {
    const row = rows.get('member:' + id);
    if (row) members[id] = parse(row, DEFAULT_MEMBERS[id] || {}, cleanMember);
    else if (DEFAULT_MEMBERS[id]) members[id] = parse(null, DEFAULT_MEMBERS[id], cleanMember);
  }
  return { site, members, dbOk };
}

/* 저장합니다. version 은 편집을 시작할 때 받은 번호입니다.
   그 사이 다른 사람이 먼저 저장했다면 null 을 돌려주고 아무것도 바꾸지 않습니다. */
export async function saveDoc(db, key, data, version, username) {
  const json = JSON.stringify(data);
  const now = Date.now();
  const row = version === 0
    ? await db.prepare(
      'INSERT INTO docs (key, json, version, updated_at, updated_by) VALUES (?1, ?2, 1, ?3, ?4) ' +
      'ON CONFLICT(key) DO NOTHING RETURNING version'
    ).bind(key, json, now, username).first()
    : await db.prepare(
      'UPDATE docs SET json = ?1, version = version + 1, updated_at = ?2, updated_by = ?3 ' +
      'WHERE key = ?4 AND version = ?5 RETURNING version'
    ).bind(json, now, username, key, version).first();
  if (!row) return null;

  /* 되돌릴 수 있도록 저장 이력을 남깁니다. (문서마다 최근 50개) */
  await db.batch([
    db.prepare('INSERT INTO revisions (key, json, version, saved_at, saved_by) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(key, json, row.version, now, username),
    db.prepare(
      'DELETE FROM revisions WHERE key = ?1 AND id NOT IN ' +
      '(SELECT id FROM revisions WHERE key = ?1 ORDER BY id DESC LIMIT ?2)'
    ).bind(key, KEEP_REVISIONS)
  ]);
  return row.version;
}

export async function deleteDoc(db, key) {
  await db.prepare('DELETE FROM docs WHERE key = ?1').bind(key).run();
}
