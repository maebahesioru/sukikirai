# 環境変数設定ガイド

## `.env.local` ファイルの作成

プロジェクトのルートディレクトリに `.env.local` ファイルを作成し、以下の内容を記載してください：

```bash
# サイトURL（本番環境用）
NEXT_PUBLIC_SITE_URL=https://hikamers-suki-kira.vercel.app

# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 設定手順

### 1. サイトURL

デプロイ先に応じて設定してください：

**Vercel:**
```bash
NEXT_PUBLIC_SITE_URL=https://hikamers-suki-kira.vercel.app
```

**カスタムドメイン:**
```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

**ローカル開発:**
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Supabase設定

1. [Supabase](https://supabase.com)にログイン
2. プロジェクトの Settings > API を開く
3. 以下をコピー：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Vercelへのデプロイ

Vercelの環境変数設定：

1. Vercelのプロジェクト設定を開く
2. Settings > Environment Variables
3. 以下を追加：
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 注意事項

- ⚠️ `.env.local` はGitにコミットしないでください（`.gitignore`で除外済み）
- ⚠️ `NEXT_PUBLIC_` プレフィックスの変数はクライアントサイドで公開されます
- ⚠️ 本番環境では必ず正しいURLを設定してください

## 確認方法

環境変数が正しく設定されているか確認：

```bash
# 開発サーバー起動
pnpm dev

# ブラウザのコンソールで確認
console.log(process.env.NEXT_PUBLIC_SITE_URL)
```

## トラブルシューティング

### 環境変数が反映されない

1. 開発サーバーを再起動
   ```bash
   # サーバーを停止（Ctrl+C）
   pnpm dev  # 再起動
   ```

2. Next.jsのキャッシュをクリア
   ```bash
   rm -rf .next
   pnpm dev
   ```

### Vercelでビルドエラー

- 環境変数がVercelに設定されているか確認
- Supabase URLとキーが正しいか確認
- Redeploy を実行

## セキュリティ

### 公開しても良い情報
- ✅ `NEXT_PUBLIC_SITE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`（anon keyのみ）

### 絶対に公開してはいけない情報
- ❌ Supabase Service Role Key
- ❌ データベースパスワード
- ❌ その他のシークレットキー

## 参考リンク

- [Next.js環境変数](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Vercel環境変数](https://vercel.com/docs/projects/environment-variables)
- [Supabase認証情報](https://supabase.com/docs/guides/api#api-url-and-keys)
