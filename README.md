# ヒカマーズ好き嫌い.com

ヒカマーズメンバーの好き嫌い投票サイト

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React 19, TypeScript
- **スタイリング**: Tailwind CSS 4
- **データベース**: Supabase
- **デプロイ**: Vercel
- **パッケージマネージャー**: pnpm

## 機能

### 実装済み

- ✅ **ヘッダーナビゲーション**
  - サイト名表示
  - ランキングリンク（好感度・不人気・トレンド）
  - あいまい検索ボックス
  
- ✅ **個別ページ**（十字架）
  - 好き・嫌いの投票機能（1日1回、Cookieで管理）
  - Cloudflare Turnstile認証（投票・コメント投稿時）
  - 投票結果の視覚的表示
  - 投票後のシェアボタン（X, Bluesky, LINE, URLコピー）
  - コメント表示・投稿機能
  - コメントフィルター（すべて、好き派のみ、嫌い派のみ）
  - コメントへのグッド/バッドボタン
  - 返信機能
  - 通報・非表示ボタン
  - 20件ごとのページネーション

- ✅ **ランキングページ**
  - 好感度ランキング（好き派の最新コメント1件表示）
  - 不人気ランキング（嫌い派の最新コメント1件表示）
  - トレンドランキング（過去7日間の投票数順、好き派の最新コメント1件表示）

- ✅ **検索機能**
  - あいまい検索対応
  - 検索結果ページ（3カラム表示）
  - 人物名・タグ・説明文で検索

- ✅ **管理者コントロールパネル**
  - パスワード認証（6WH_CkHKnsWy）
  - 通報管理
  - コメント削除機能
  - コメント非表示機能

- ✅ **サイドバー**
  - 最近見た人物（LocalStorage管理）
  - 話題の人物
  - 話題のタグ
  - 新着コメント

- ✅ **トップページ**
  - ヒーローセクション
  - ランキングカード
  - 人物一覧

### 今後実装予定

- NGワード設定機能（フロントエンド実装）
- その他の人物データ追加
- タグページ
- コメント検索機能
- 統計ダッシュボード

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. Supabaseのセットアップ

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで `supabase/schema.sql` の内容を実行
3. `.env.local` ファイルを作成

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Cloudflare Turnstile（スパム対策）
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAB7zVyyT42WhDQqg
TURNSTILE_SECRET_KEY=0x4AAAAAAB7zV-zLa2ZSh61jOz6DhjfYojQ
```

**Vercel環境変数設定:**
1. Vercel Dashboardでプロジェクトを選択
2. Settings → Environment Variables
3. 上記の環境変数を追加

### 3. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## データベーススキーマ

### votes テーブル
- 投票データを管理
- person_id, vote_type, cookie_id を保存

### comments テーブル
- コメントデータを管理
- 好き派/嫌い派、グッド/バッドカウント、親コメントID（返信用）を保存

### ng_words テーブル
- NGワードを管理
- person_id が NULL の場合は全体適用

### reports テーブル
- 通報データを管理

## デプロイ

Vercelにデプロイする場合：

```bash
# Vercel CLIをインストール（未インストールの場合）
pnpm add -g vercel

# デプロイ
vercel
```

環境変数の設定を忘れずに行ってください。

## ディレクトリ構成

```
sukikirai/
├── app/                        # Next.js App Router
│   ├── admin/                 # 管理者パネル
│   │   └── page.tsx
│   ├── person/[id]/          # 個別ページ
│   │   └── page.tsx
│   ├── ranking/              # ランキングページ
│   │   ├── popularity/       # 好感度ランキング
│   │   ├── unpopular/        # 不人気ランキング
│   │   └── trending/         # トレンドランキング
│   ├── search/               # 検索結果ページ
│   │   └── page.tsx
│   ├── layout.tsx            # ルートレイアウト
│   ├── page.tsx              # トップページ
│   └── globals.css           # グローバルスタイル
├── components/               # Reactコンポーネント
│   ├── Header.tsx            # ヘッダー
│   ├── VoteButton.tsx        # 投票ボタン
│   ├── ShareButtons.tsx      # シェアボタン
│   ├── CommentSection.tsx    # コメント表示
│   ├── CommentForm.tsx       # コメント投稿フォーム
│   └── Sidebar.tsx           # サイドバー
├── data/                     # JSONデータ
│   └── people.json           # 人物プロフィール
├── lib/                      # ユーティリティ
│   ├── supabase.ts           # Supabaseクライアント
│   └── ranking.ts            # ランキング計算
├── supabase/                 # Supabaseスキーマ
│   └── schema.sql
├── types/                    # TypeScript型定義
│   └── person.ts
└── README.md                 # ドキュメント
```

## ページ一覧

- `/` - トップページ
- `/person/jujika` - 十字架の個別ページ
- `/ranking/popularity` - 好感度ランキング
- `/ranking/unpopular` - 不人気ランキング
- `/ranking/trending` - トレンドランキング
- `/search?q=検索ワード` - 検索結果
- `/admin` - 管理者コントロールパネル

## 管理者情報

- 管理者パネルURL: `/admin`
- 管理者パスワード: `6WH_CkHKnsWy`

## SEO最適化

### 実装済みのSEO機能

- ✅ **メタデータ最適化**
  - タイトル・ディスクリプション・キーワード
  - OGP（Open Graph Protocol）
  - Twitter Card
  - ファビコン（SVG）

- ✅ **構造化データ（JSON-LD）**
  - WebSite スキーマ
  - Person スキーマ
  - BreadcrumbList スキーマ
  - 評価・投票データ

- ✅ **サイトマップ**
  - 自動生成（`/sitemap.xml`）
  - 全ページを含む

- ✅ **robots.txt**
  - 検索エンジン最適化
  - 管理画面除外

- ✅ **パフォーマンス**
  - 画像最適化
  - フォント最適化
  - レスポンシブデザイン

### SEO設定手順

詳細は `SEO_SETUP.md` を参照してください。

1. 環境変数 `NEXT_PUBLIC_SITE_URL` を設定
2. OGP画像を配置（`app/opengraph-image.png`）
3. Google Search Consoleに登録
4. サイトマップを送信

### チェックポイント

- [ ] `/sitemap.xml` が正しく生成されているか確認
- [ ] `/robots.txt` が正しく配置されているか確認
- [ ] OGP画像（1200x630px）を配置
- [ ] Google Search Consoleで確認

## ツール

### 人物追加ツール

`add_person_tool.py` - people.jsonに新しい人物を追加するGUIツール

```bash
python add_person_tool.py
```

または

```bash
start_tool.bat  # Windows
```

詳細は `TOOL_README.md` を参照。
