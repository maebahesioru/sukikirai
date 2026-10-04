-- ヒカマーズ好き嫌い.com v2 — 自鯖PostgreSQL スキーマ
-- Supabase(myvbc) 時代のデータを全件移行できる後方互換スキーマ + Xユーザー追加・8項目評価対応

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  handle TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'その他',
  avatar_url TEXT,
  related TEXT[] NOT NULL DEFAULT '{}',
  followers INTEGER,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'admin',
  x_user_id TEXT,
  x_status TEXT,
  x_checked_at TIMESTAMPTZ,
  x_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_people_category ON people(category);
CREATE INDEX IF NOT EXISTS idx_people_tags ON people USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_people_created ON people(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_people_handle ON people(handle);

CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like','dislike')),
  cookie_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_votes_person ON votes(person_id);
CREATE INDEX IF NOT EXISTS idx_votes_cookie ON votes(cookie_id);
CREATE INDEX IF NOT EXISTS idx_votes_created ON votes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_pc ON votes(person_id, cookie_id, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  comment_number INTEGER NOT NULL,
  name TEXT,
  user_id TEXT,
  gender TEXT,
  age_group TEXT,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like','dislike')),
  content TEXT NOT NULL,
  cookie_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  good_count INTEGER NOT NULL DEFAULT 0,
  bad_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  is_reported BOOLEAN NOT NULL DEFAULT FALSE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_person ON comments(person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_cookie ON comments(cookie_id);

CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('good','bad')),
  cookie_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, cookie_id)
);
CREATE INDEX IF NOT EXISTS idx_reactions_comment ON comment_reactions(comment_id);

-- 8項目の5段階評価（Xユーザー世論調査）
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  cookie_id TEXT NOT NULL,
  fun SMALLINT CHECK (fun BETWEEN 1 AND 5),
  accuracy SMALLINT CHECK (accuracy BETWEEN 1 AND 5),
  influence SMALLINT CHECK (influence BETWEEN 1 AND 5),
  knowledge SMALLINT CHECK (knowledge BETWEEN 1 AND 5),
  humanity SMALLINT CHECK (humanity BETWEEN 1 AND 5),
  charisma SMALLINT CHECK (charisma BETWEEN 1 AND 5),
  favor SMALLINT CHECK (favor BETWEEN 1 AND 5),
  reply SMALLINT CHECK (reply BETWEEN 1 AND 5),
  day DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Tokyo')::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, cookie_id, day)
);
CREATE INDEX IF NOT EXISTS idx_eval_person ON evaluations(person_id);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reason TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_comment ON reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

CREATE TABLE IF NOT EXISTS ng_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  person_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 投票トーク（旧Supabaseから移植）
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  poll_type TEXT NOT NULL CHECK (poll_type IN ('two_choice','three_plus_fixed','three_plus_open')),
  creator_cookie_id TEXT NOT NULL,
  related_person_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  total_votes INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_polls_created ON polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_related ON polls USING GIN(related_person_ids);

CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  image_url TEXT,
  option_order INTEGER NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_by_creator BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_cookie_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  cookie_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, cookie_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);

CREATE TABLE IF NOT EXISTS poll_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  comment_number INTEGER NOT NULL,
  name TEXT,
  user_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  good_count INTEGER NOT NULL DEFAULT 0,
  bad_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  is_reported BOOLEAN NOT NULL DEFAULT FALSE,
  parent_comment_id UUID REFERENCES poll_comments(id) ON DELETE CASCADE,
  cookie_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_poll_comments_poll ON poll_comments(poll_id, created_at DESC);

CREATE TABLE IF NOT EXISTS poll_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_comment_id UUID NOT NULL REFERENCES poll_comments(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('good','bad')),
  cookie_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_comment_id, cookie_id)
);

CREATE TABLE IF NOT EXISTS poll_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_comment_id UUID NOT NULL REFERENCES poll_comments(id) ON DELETE CASCADE,
  reason TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_poll_reports_comment ON poll_reports(poll_comment_id);

CREATE TABLE IF NOT EXISTS poll_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS people_set_updated ON people;
CREATE TRIGGER people_set_updated BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS polls_set_updated ON polls;
CREATE TRIGGER polls_set_updated BEFORE UPDATE ON polls FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2ch互換: メール欄（sage判定・datパススルー用）
ALTER TABLE comments ADD COLUMN IF NOT EXISTS mail TEXT;
ALTER TABLE poll_comments ADD COLUMN IF NOT EXISTS mail TEXT;

-- 管理スレ（要望・バグ報告）: 単一固定スレッド
CREATE TABLE IF NOT EXISTS meta_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  mail TEXT,
  content TEXT NOT NULL,
  cookie_id TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meta_posts_created ON meta_posts(created_at);
