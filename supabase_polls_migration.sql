-- 投票トーク機能のためのテーブル作成

-- 投票トークテーブル
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  poll_type TEXT NOT NULL CHECK (poll_type IN ('two_choice', 'three_plus_fixed', 'three_plus_open')),
  creator_cookie_id TEXT NOT NULL,
  related_person_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_hidden BOOLEAN DEFAULT FALSE,
  total_votes INTEGER DEFAULT 0
);

-- 投票選択肢テーブル
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL,
  vote_count INTEGER DEFAULT 0,
  created_by_creator BOOLEAN DEFAULT TRUE,
  created_by_cookie_id TEXT, -- ユーザーが追加した選択肢の場合のcookie_id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 投票記録テーブル
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  cookie_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, cookie_id)
);

-- 投票トークコメントテーブル
CREATE TABLE IF NOT EXISTS poll_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  comment_number INTEGER NOT NULL,
  name TEXT,
  user_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  good_count INTEGER DEFAULT 0,
  bad_count INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_reported BOOLEAN DEFAULT FALSE,
  parent_comment_id UUID REFERENCES poll_comments(id) ON DELETE CASCADE,
  cookie_id TEXT NOT NULL
);

-- 投票トークコメント評価テーブル
CREATE TABLE IF NOT EXISTS poll_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_comment_id UUID NOT NULL REFERENCES poll_comments(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('good', 'bad')),
  cookie_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_comment_id, cookie_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_is_hidden ON polls(is_hidden);
CREATE INDEX IF NOT EXISTS idx_polls_related_person_ids ON polls USING GIN(related_person_ids);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_cookie_id ON poll_votes(cookie_id);
CREATE INDEX IF NOT EXISTS idx_poll_comments_poll_id ON poll_comments(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_comments_created_at ON poll_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_comment_reactions_poll_comment_id ON poll_comment_reactions(poll_comment_id);

-- RLS (Row Level Security) ポリシー
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_comment_reactions ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Anyone can view polls" ON polls FOR SELECT USING (NOT is_hidden);
CREATE POLICY "Anyone can view poll_options" ON poll_options FOR SELECT USING (true);
CREATE POLICY "Anyone can view poll_votes" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can view poll_comments" ON poll_comments FOR SELECT USING (NOT is_hidden);
CREATE POLICY "Anyone can view poll_comment_reactions" ON poll_comment_reactions FOR SELECT USING (true);

-- 投票数を増やす関数
CREATE OR REPLACE FUNCTION increment_poll_option_votes(option_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE poll_options
  SET vote_count = vote_count + 1
  WHERE id = option_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 投票トークの総投票数を増やす関数
CREATE OR REPLACE FUNCTION increment_poll_total_votes(poll_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE polls
  SET total_votes = total_votes + 1
  WHERE id = poll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_polls_updated_at
BEFORE UPDATE ON polls
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
