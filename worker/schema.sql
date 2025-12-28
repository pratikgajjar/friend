-- D1 Schema for Friend Challenge

DROP TABLE IF EXISTS challenges;
DROP TABLE IF EXISTS participants;
DROP TABLE IF EXISTS groups;

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phase TEXT DEFAULT 'gathering',
  challenges_per_person INTEGER DEFAULT 6,
  deadline TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE participants (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  is_host INTEGER DEFAULT 0,
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  text TEXT NOT NULL,
  for_participant_id TEXT NOT NULL,
  suggested_by_id TEXT NOT NULL,
  votes TEXT DEFAULT '[]',
  is_completed INTEGER DEFAULT 0,
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (for_participant_id) REFERENCES participants(id),
  FOREIGN KEY (suggested_by_id) REFERENCES participants(id)
);

CREATE INDEX idx_groups_code ON groups(code);
CREATE INDEX idx_participants_group ON participants(group_id);
CREATE INDEX idx_challenges_group ON challenges(group_id);

