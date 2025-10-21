-- コメント投稿のセキュリティ強化
-- クライアント側からの直接INSERTを禁止し、サーバー側API経由のみ許可

-- 既存のINSERTポリシーを削除
DROP POLICY IF EXISTS "Enable insert access for all users" ON comments;

-- 確認: commentsテーブルのポリシー一覧
-- SELECT * FROM pg_policies WHERE tablename = 'comments';

-- これでクライアントから直接Supabaseにコメントをinsertできなくなり、
-- /api/comments 経由（Service Role Key使用）でのみ投稿可能になります
