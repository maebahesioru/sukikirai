-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  cookie_id TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_votes_person_id ON votes(person_id);
CREATE INDEX idx_votes_cookie_id ON votes(cookie_id);
CREATE INDEX idx_votes_ip_address ON votes(ip_address);
CREATE INDEX idx_votes_created_at ON votes(created_at);

-- Enable RLS
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to select votes
CREATE POLICY "Enable read access for all users" ON votes
  FOR SELECT USING (true);

-- Allow anyone to insert votes
CREATE POLICY "Enable insert access for all users" ON votes
  FOR INSERT WITH CHECK (true);

-- Allow anyone to delete votes
CREATE POLICY "Enable delete access for all users" ON votes
  FOR DELETE USING (true);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id TEXT NOT NULL,
  comment_number INTEGER NOT NULL,
  name TEXT,
  user_id TEXT,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  good_count INTEGER DEFAULT 0,
  bad_count INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_reported BOOLEAN DEFAULT FALSE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_person_id ON comments(person_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_comments_is_hidden ON comments(is_hidden);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read, insert, update, delete comments
CREATE POLICY "Enable read access for all users" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON comments
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON comments
  FOR DELETE USING (true);

-- Create ng_words table
CREATE TABLE IF NOT EXISTS ng_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  person_id TEXT, -- NULL means global
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ng_words_person_id ON ng_words(person_id);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_comment_id ON reports(comment_id);
CREATE INDEX idx_reports_created_at ON reports(created_at);

-- Enable RLS for ng_words and reports
ALTER TABLE ng_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for ng_words
CREATE POLICY "Enable read access for all users" ON ng_words
  FOR SELECT USING (true);

-- RLS policies for reports
CREATE POLICY "Enable read access for all users" ON reports
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON reports
  FOR DELETE USING (true);
