# ヒカマーズ好き嫌い.com

Xユーザーの「好き嫌い」と「8項目評価」を匿名で書き込めるサイトです（v2）。

## 主な機能

- **Xユーザーなら誰でも追加** — `@ID` で検索すると未登録ユーザーもその場でページ作成（fxTwitter API でプロフィール取得）
- **好き / 嫌い投票**（1日1回・ブラウザ単位）
- **8項目の5段階評価**（面白さ・正確さ・発信力・知識・人間性・カリスマ性・好感度・返信対応）
- **コメント**（好き派/嫌い派・返信・グッド/バッド・通報）
- **ランキング** — 好感度 / 不人気 / トレンド（7日） / 総合評価
- **投票トーク** — ユーザー作成のアンケート（選択肢追加対応）
- **管理パネル** — 通報・コメント・票数・人物・アナリティクス

## スタック

- Next.js 15 (App Router) / React 19 / Tailwind CSS 4
- PostgreSQL（node-postgres）※自鯖 Coolify 上で運用
- ホスティング: Coolify (VM100) / ドメイン: hikamer-suki-kira.hikamers.app

## 開発

```bash
pnpm install
DATABASE_URL=postgres://user:pass@host:5432/db pnpm dev
```

## ビルド / 起動

```bash
pnpm build
DATABASE_URL=... pnpm start
```

## データベース

- スキーマ: `db/schema.sql`（空DBに流すだけで初期化可能）
- 環境変数: `DATABASE_URL`（必須） / `ADMIN_PASSWORD`（管理画面） / `SITE_URL`（任意）
- OGP・アイコン再生成: `uv run --with pillow python scripts/gen-assets.py`

## 構成

```
app/(main)/   公開ページ（ホーム・人物・ランキング・検索・投票トーク）
app/admin/    管理パネル
app/api/      API（投票・評価・コメント・人物追加・管理）
lib/          DBアクセス層・クエリ・fxTwitter・スパムフィルタ
components/   UIコンポーネント
db/schema.sql スキーマ
```
