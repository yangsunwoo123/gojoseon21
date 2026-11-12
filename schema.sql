-- 고조선 홈페이지 데이터베이스 구조 (Cloudflare D1)
-- 여러 번 실행해도 기존 내용은 지워지지 않습니다.

-- 수정 권한이 있는 팀원 계정. scripts/users.mjs 로만 만듭니다. (사이트에 가입 기능 없음)
-- must_change = 1 : 개발자가 정해 준 임시 비밀번호 상태. 본인이 새 비밀번호를 정하기 전에는 편집할 수 없고,
--                   temp_until 시각이 지나면 그 임시 비밀번호로는 로그인되지 않습니다.
-- (예전에 만든 데이터베이스에는 두 칸이 없습니다. node scripts/users.mjs migrate 로 추가합니다.)
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  pw          TEXT    NOT NULL,   -- 비밀번호 원문이 아니라 되돌릴 수 없게 바꾼 값
  updated_at  INTEGER NOT NULL,
  must_change INTEGER NOT NULL DEFAULT 0,
  temp_until  INTEGER NOT NULL DEFAULT 0
);

-- 로그인 상태. 쿠키 값의 해시만 저장합니다.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- 로그인 실패 기록 (무작위 대입 차단용, 15분 뒤 자동 정리)
CREATE TABLE IF NOT EXISTS login_attempts (
  k  TEXT    NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_k ON login_attempts(k, at);

-- 사이트 내용. key = 'site' 또는 'member:<id>'
CREATE TABLE IF NOT EXISTS docs (
  key        TEXT    PRIMARY KEY,
  json       TEXT    NOT NULL,
  version    INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT    NOT NULL
);

-- 저장 이력 (실수했을 때 되돌리기 위한 기록, 문서마다 최근 50개)
CREATE TABLE IF NOT EXISTS revisions (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  key      TEXT    NOT NULL,
  json     TEXT    NOT NULL,
  version  INTEGER NOT NULL,
  saved_at INTEGER NOT NULL,
  saved_by TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS revisions_key ON revisions(key, id);

-- 올린 사진·이미지
CREATE TABLE IF NOT EXISTS media (
  id          TEXT    PRIMARY KEY,
  type        TEXT    NOT NULL,
  bytes       BLOB    NOT NULL,
  size        INTEGER NOT NULL,
  uploaded_at INTEGER NOT NULL,
  uploaded_by TEXT    NOT NULL
);
