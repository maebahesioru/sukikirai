-- 重複したRLSポリシーを削除するSQL
-- Supabase Dashboard > SQL Editor で実行してください

-- ============================================
-- comments テーブル
-- ============================================
-- 古いポリシーを削除（"Allow public read access on comments"を削除）
DROP POLICY IF EXISTS "Allow public read access on comments" ON public.comments;

-- ============================================
-- ng_words テーブル
-- ============================================
-- 古いポリシーを削除
DROP POLICY IF EXISTS "Allow public read access on ng_words" ON public.ng_words;

-- ============================================
-- reports テーブル
-- ============================================
-- 古いポリシーを削除
DROP POLICY IF EXISTS "Allow public read access on reports" ON public.reports;
DROP POLICY IF EXISTS "Allow public insert on reports" ON public.reports;
DROP POLICY IF EXISTS "Allow public delete on reports" ON public.reports;

-- ============================================
-- votes テーブル
-- ============================================
-- 古いポリシーを削除
DROP POLICY IF EXISTS "Allow public read access on votes" ON public.votes;
DROP POLICY IF EXISTS "Allow public insert on votes" ON public.votes;

-- ============================================
-- 確認: 残っているポリシーを表示
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
