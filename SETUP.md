# セットアップガイド

## 1. 環境変数の設定

`.env.example` をコピーして `.env.local` ファイルを作成してください。

```bash
# Windowsの場合
copy .env.example .env.local

# または手動で作成
```

`.env.local` の内容を以下のように編集します：

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にアクセス
2. 「New Project」をクリック
3. プロジェクト名、データベースパスワードを設定
4. リージョンを選択（日本の場合は Tokyo を推奨）
5. 「Create new project」をクリック

## 3. データベーススキーマの作成

1. Supabaseダッシュボードで「SQL Editor」を開く
2. 「New query」をクリック
3. `supabase/schema.sql` の内容をコピー＆ペースト
4. 「RUN」ボタンをクリックしてスキーマを作成

## 4. APIキーの取得

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下の情報をコピー：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon / public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `.env.local` ファイルに貼り付け

## 5. 開発サーバーの起動

```bash
pnpm dev
```

http://localhost:3000 でサイトが表示されます。

## 6. 動作確認

1. トップページが表示されることを確認
2. 「十字架」のカードをクリック
3. 個別ページで「好き！」または「嫌い！」に投票
4. コメントを投稿してみる

## トラブルシューティング

### Supabaseに接続できない

- `.env.local` ファイルが正しく作成されているか確認
- URLとAPIキーが正しいか確認
- 開発サーバーを再起動（Ctrl+C → pnpm dev）

### 投票やコメントが保存されない

- Supabaseのスキーマが正しく作成されているか確認
- SQL Editorで `SELECT * FROM votes;` を実行してテーブルが存在するか確認
- ブラウザのコンソールでエラーが出ていないか確認

### ページが表示されない

- `pnpm install` が完了しているか確認
- Node.jsのバージョンが18以上か確認
- ポート3000が他のプロセスで使用されていないか確認

## Vercelへのデプロイ

1. GitHubにコードをプッシュ
2. [Vercel](https://vercel.com) でプロジェクトをインポート
3. 環境変数を設定（`.env.local` の内容）
4. デプロイを実行

詳細は [README.md](./README.md) を参照してください。
