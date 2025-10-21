# デプロイ前チェックリスト

## ✅ 完了した実装

### 1. 認証システムの刷新
- ✅ `/api/agree-terms` - 利用規約同意API
- ✅ `TermsAgreementModal.tsx` - 利用規約モーダル
- ✅ `ClientLayout.tsx` - 全ページで利用規約チェック
- ✅ `app/layout.tsx` - ClientLayout統合
- ✅ `/api/vote` - userToken対応
- ✅ `/api/comments` - userToken対応 + Service Role Key
- ✅ `VoteButton.tsx` - userTokenチェック
- ✅ `CommentForm.tsx` - userTokenチェック
- ✅ `CommentSection.tsx` - userTokenチェック

### 2. セキュリティ強化
- ✅ Captchaバイパス脆弱性修正
- ✅ コメント評価の改ざん防止
- ✅ IPアドレス取得の削除
- ✅ Service Role Key使用

### 3. パフォーマンス最適化
- ✅ サイドバーのサーバーコンポーネント化
- ✅ データ取得の一元化
- ✅ 並列データ取得

## ⚠️ デプロイ前に必須の作業

### 1. Supabase SQL Editorで以下を実行

```sql
-- コメントテーブルのINSERTポリシーを削除（クライアント側から直接INSERTできないようにする）
DROP POLICY IF EXISTS "Enable insert access for all users" ON comments;

-- 確認: ポリシー一覧を表示
SELECT * FROM pg_policies WHERE tablename = 'comments';
```

### 2. 環境変数の確認

`.env.local` に以下が設定されていることを確認：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
TURNSTILE_SECRET_KEY=your_turnstile_secret
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

### 3. Vercel環境変数の設定

Vercel Dashboard → Settings → Environment Variables で以下を追加：

- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY`

**重要**: `SUPABASE_SERVICE_ROLE_KEY` は絶対にクライアント側に公開しないこと！

## 📝 デプロイ手順

### 1. ローカルでテスト

```powershell
# 開発サーバー起動
npm run dev

# ブラウザでCookieをクリア
# 開発者ツール > Application > Cookies > すべて削除

# 以下を確認:
# 1. ページアクセス時に利用規約モーダルが表示される
# 2. Captcha認証が完了する
# 3. 同意ボタンで user_token がCookieに保存される
# 4. 投票・コメント投稿が正常に動作する
```

### 2. コミット & プッシュ

```powershell
git add -A
git commit -m "Implement terms agreement system and security enhancements

- Add terms agreement modal with Captcha verification
- Switch from cookie_id to secure user_token authentication
- Fix comment posting Captcha bypass vulnerability
- Use Service Role Key for comment posting
- Remove IP address tracking
- Optimize data fetching and reduce request count
- Fix comment evaluation security vulnerability"

git push origin main
```

### 3. Vercelにデプロイ

```powershell
vercel --prod --yes
```

### 4. 本番環境でテスト

デプロイ後、以下を確認：

1. **利用規約モーダル**
   - Cookieをクリアしてアクセス
   - モーダルが表示されることを確認
   - Captcha認証後に同意できることを確認

2. **投票機能**
   - user_tokenがない場合、エラーメッセージが表示される
   - user_tokenがある場合、投票できる
   - 重複投票が防止される

3. **コメント投稿**
   - user_tokenがない場合、エラーメッセージが表示される
   - user_tokenがある場合、コメント投稿できる
   - 返信も正常に投稿できる

4. **セキュリティ**
   - Supabaseに直接コメントをINSERTしようとしてもエラーになる
   - CaptchaをバイパスしてAPIを叩いてもエラーになる

## 🔄 ロールバック手順（問題発生時）

### 1. コードのロールバック

```powershell
# 前のコミットに戻す
git revert HEAD
git push origin main

# またはコミットIDを指定
git reset --hard <previous_commit_id>
git push origin main --force
```

### 2. Supabaseポリシーの復元

```sql
-- クライアント側からのINSERTを再度許可（緊急時のみ）
CREATE POLICY "Enable insert access for all users" ON comments
  FOR INSERT WITH CHECK (true);
```

### 3. Vercelで再デプロイ

```powershell
vercel --prod --yes
```

## 📊 監視項目

デプロイ後、以下を監視：

1. **エラーレート**
   - Vercel Dashboard > Analytics
   - 400/401/403エラーの増加に注意

2. **パフォーマンス**
   - ページロード時間
   - APIレスポンスタイム

3. **ユーザー行動**
   - 利用規約同意率
   - 投票・コメント投稿数

## 🎉 完了！

すべてのチェック項目が完了したら、デプロイ準備完了です。

問題が発生した場合は、すぐにロールバック手順を実行してください。
