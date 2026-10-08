# コントリビュートガイド

バグ報告・機能要望・Pull Request を歓迎します。

## 報告・要望

- **バグ報告・機能要望**: [Issues](../../issues/new/choose) またはサイト内の[管理スレ](https://tsuittara-yoron.hikamers.app/meta)へ
- **セキュリティ問題**: [SECURITY.md](SECURITY.md) の手順で報告してください（**公開Issueに書かないでください**）

## 開発環境

```bash
bun install
DATABASE_URL=postgres://user:pass@host:5432/db bun run dev
```

- パッケージマネージャは **Bun**（npm / yarn / pnpm は使いません）
- Node.js 20+ / PostgreSQL 15+
- DBスキーマは `db/schema.sql`（空DBに流すと初期化できます）

## Pull Request の前に

1. `bun run build` が通ることを確認する
2. 既存のコードスタイル（TypeScript strict / Tailwind CSS）に合わせる
3. 1つのPR = 1つの目的（無関係な変更を混ぜない）
4. **環境変数・シークレットをコミットしない**（`DATABASE_URL` 等は `.env` で管理）
5. UIの変更は、可能ならダーク/ライト両テーマで確認する

## コミットメッセージ

- 日本語または英語、どちらでも構いません
- 何を・なぜ変えたかが分かるように書いてください

## 行動規範

参加にあたっては [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) に従ってください。
