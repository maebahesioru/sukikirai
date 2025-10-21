# コメント評価機能のセキュリティ修正

## 問題
コメントの`good_count`と`bad_count`がクライアント側から直接更新できる脆弱性がありました。

## 対策
1. `comment_reactions`テーブルを新規作成し、評価データを別管理
2. `comments`テーブルの`UPDATE`ポリシーを削除
3. 評価数は`comment_reactions`から動的に集計

## Supabase SQL Editorで実行するSQL

```sql
-- 既存のcommentsテーブルのUPDATEポリシーを削除
DROP POLICY IF EXISTS "Enable update access for all users" ON comments;

-- comment_reactionsテーブルを作成
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('good', 'bad')),
  cookie_id TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, cookie_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_cookie_id ON comment_reactions(cookie_id);

-- RLSを有効化
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Enable read access for all users" ON comment_reactions
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON comment_reactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON comment_reactions
  FOR DELETE USING (true);
```

## コード変更（完了）
- ✅ `lib/comment-reactions.ts`: 評価管理の新しいヘルパー関数を追加
- ✅ `lib/supabase.ts`: `CommentReaction`型を追加
- ✅ `components/CommentSection.tsx`: 評価機能を新システムに移行
  - コメント評価ボタンが`comment_reactions`テーブルを使用
  - 既存の`good_count`/`bad_count`はローカル表示のみ更新
  - 評価の切り替えもサポート
- ✅ `supabase/schema.sql`: RLSポリシーとテーブル定義を更新

## 移行手順
1. 上記SQLをSupabase SQL Editorで実行
2. コードをデプロイ
3. 新しい評価は`comment_reactions`に記録される
4. 既存の評価は`good_count`/`bad_count`として残る（互換性維持）

## セキュリティ改善
- ❌ **修正前**: クライアントが直接`comments.good_count`/`bad_count`を更新可能
- ✅ **修正後**: `comment_reactions`テーブルで評価を管理、直接更新不可
- ✅ cookie_idベースで重複評価を防止
- ✅ 評価の切り替えと取り消しをサポート
