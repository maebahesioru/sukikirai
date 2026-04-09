# 投票トーク機能 実装ドキュメント

## 概要
ヒカマーズ好き嫌い.comに投票トーク機能を追加しました。ユーザーがアンケートを投稿し、他のユーザーが投票・コメントできる機能です。

## 主な機能

### 1. 投票形式（3種類）
- **2択**：投稿者が2つの選択肢を設定。他のユーザーは選択肢を追加できない
- **3択以上（固定）**：投稿者が3つ以上の選択肢を設定。他のユーザーは選択肢を追加できない
- **3択以上（追加可）**：投稿者が3つ以上の選択肢を設定。他のユーザーも選択肢を追加可能（最大20個、1ユーザーあたり3個まで）

### 2. 人物との連携
- 投票作成時に関連する人物を選択可能
- 人物ページに関連する投票トークが表示される
- 投票トークページに関連する人物の好き嫌い投票へのリンクが表示される

### 3. コメント機能
- 従来の好き嫌い投票と同様にコメント投稿が可能
- スパム対策（連投防止、重複チェック、類似度チェック）を実装
- コメントへの評価（👍👎）機能

### 4. 投票制限
- 1つの投票につき1ユーザー1回のみ投票可能
- Cookie IDで管理

## 実装ファイル

### 型定義
- `types/poll.ts` - 投票トーク関連の型定義
- `lib/supabase.ts` - 型のエクスポート追加

### API エンドポイント
- `app/api/polls/create/route.ts` - 投票トーク作成
- `app/api/polls/vote/route.ts` - 投票
- `app/api/polls/add-option/route.ts` - 選択肢追加（3択以上・追加可の場合）
- `app/api/polls/comments/route.ts` - コメント投稿
- `app/api/polls/check-vote/route.ts` - 投票済みチェック
- `app/api/polls/related/route.ts` - 関連投票トーク取得

### ページ
- `app/polls/page.tsx` - 投票トーク一覧ページ
- `app/polls/create/page.tsx` - 投票トーク作成ページ
- `app/polls/[id]/page.tsx` - 投票トーク詳細ページ

### コンポーネント
- `components/PollCard.tsx` - 投票トークカード
- `components/CreatePollModal.tsx` - 投票トーク作成モーダル
- `components/PollVoteSection.tsx` - 投票セクション
- `components/PollCommentSection.tsx` - コメントセクション
- `components/RelatedPolls.tsx` - 関連投票トーク表示

### 既存ファイルの変更
- `components/Header.tsx` - 投票トークへのリンク追加
- `app/page.tsx` - トップページに投票トークカード追加
- `app/person/[id]/PersonPageClient.tsx` - 関連投票トーク表示追加

## データベース

### マイグレーション
`supabase_polls_migration.sql` を実行してください。

### テーブル構成
1. **polls** - 投票トーク本体
   - id, title, description, poll_type, creator_cookie_id, related_person_ids, created_at, updated_at, is_hidden, total_votes

2. **poll_options** - 投票選択肢
   - id, poll_id, option_text, option_order, vote_count, created_by_creator, created_by_cookie_id, created_at

3. **poll_votes** - 投票記録
   - id, poll_id, option_id, cookie_id, created_at
   - UNIQUE制約: (poll_id, cookie_id)

4. **poll_comments** - 投票トークコメント
   - id, poll_id, comment_number, name, user_id, content, created_at, good_count, bad_count, is_hidden, is_reported, parent_comment_id, cookie_id

5. **poll_comment_reactions** - コメント評価
   - id, poll_comment_id, reaction_type, cookie_id, created_at
   - UNIQUE制約: (poll_comment_id, cookie_id)

### 関数
- `increment_poll_option_votes(option_id)` - 選択肢の投票数を増やす
- `increment_poll_total_votes(poll_id)` - 投票トークの総投票数を増やす

## セキュリティ

### スパム対策
- 1時間に3つまでの投票トーク作成制限
- 1分以内に2件以上のコメント投稿を制限
- 10分以内に5件以上のコメント投稿を制限
- 重複コメントチェック
- 類似コメントチェック（90%以上類似で拒否）
- NGワードフィルター（既存のspam-filter.tsを使用）

### RLS (Row Level Security)
- 全テーブルでRLSを有効化
- 非表示でない投票トークのみ閲覧可能
- 非表示でないコメントのみ閲覧可能

## 使い方

### 1. データベースのセットアップ
```bash
# Supabaseダッシュボードで以下のSQLを実行
supabase_polls_migration.sql
```

### 2. 環境変数の確認
既存の環境変数がそのまま使用されます：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. アプリケーションの起動
```bash
pnpm dev
```

### 4. 投票トークの作成
1. ヘッダーの「投票トーク」をクリック
2. 「投票を作成」ボタンをクリック
3. タイトル、説明、投票形式、選択肢、関連人物を入力
4. 「作成」ボタンをクリック

### 5. 投票
1. 投票トーク詳細ページで選択肢をクリック
2. 投票結果が表示される

### 6. 選択肢の追加（3択以上・追加可の場合）
1. 投票トーク詳細ページで「選択肢を追加」をクリック
2. 新しい選択肢を入力
3. 「追加」ボタンをクリック

## 今後の拡張案
- 投票トークの検索機能
- 投票トークのカテゴリー分類
- 投票トークの期限設定
- 投票トークの編集・削除機能（投稿者のみ）
- 投票トークのシェア機能
- 投票トークのトレンドランキング
- 投票トークの通知機能
