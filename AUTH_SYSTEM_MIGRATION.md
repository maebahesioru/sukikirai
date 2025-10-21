# 認証システム移行ガイド

## 概要

cookie_idベースの識別から、利用規約同意+Captcha認証ベースの識別トークンシステムに移行します。

## 新しい認証フロー

### 1. 初回訪問時
```
ユーザー訪問
  ↓
user_token がCookieに存在するかチェック
  ↓
存在しない → 利用規約同意モーダル表示
  ↓
Captcha認証
  ↓
同意ボタンクリック → /api/agree-terms にPOST
  ↓
サーバー側でTurnstile検証
  ↓
セキュアなトークン生成（64文字のhex）
  ↓
user_token をCookieに保存（有効期限1年）
  ↓
サービス利用可能
```

### 2. 投票・コメント投稿時
```
アクション実行
  ↓
user_token をCookieから取得
  ↓
存在しない → 利用規約モーダル表示
  ↓
user_token + turnstileToken をAPIに送信
  ↓
サーバー側で検証
  ↓
データベースに保存（cookie_id カラムに user_token を格納）
```

## 実装済みのファイル

### 1. **利用規約同意API**
- `app/api/agree-terms/route.ts`
  - Turnstile検証
  - セキュアなトークン生成
  - 1年間有効なトークンを返却

### 2. **利用規約モーダル**
- `components/TermsAgreementModal.tsx`
  - 利用規約表示
  - Captcha認証
  - 同意処理

### 3. **投票API更新**
- `app/api/vote/route.ts`
  - cookie_id → userToken に変更
  - トークン形式検証（64文字hex）

## 実装が必要なファイル

### 1. **VoteButton コンポーネント**
```typescript
// 変更点:
// - Cookies.get('user_id') → Cookies.get('user_token')
// - cookieId → userToken
// - user_tokenがない場合は利用規約モーダルを表示
```

### 2. **CommentForm コンポーネント**
```typescript
// 変更点:
// - 投稿前に user_token の存在チェック
// - なければ利用規約モーダル表示
// - API呼び出し時に userToken を送信
```

### 3. **CommentSection コンポーネント（返信機能）**
```typescript
// 変更点:
// - CommentForm と同様の変更
```

### 4. **コメント投稿API更新**
```typescript
// app/api/comments/route.ts
// 変更点:
// - userToken パラメータを受け取る
// - トークン形式検証
```

### 5. **メインレイアウト**
```typescript
// app/layout.tsx または各ページ
// 変更点:
// - user_token チェックロジック
// - 利用規約モーダルの条件付き表示
```

## 移行手順

### ステップ1: API層の更新
- ✅ `/api/agree-terms` 作成済み
- ✅ `/api/vote` 更新済み
- ✅ `/api/comments` を更新（userToken対応 + Service Role Key）

### ステップ2: コンポーネントの更新
- ✅ VoteButton の更新
- ✅ CommentForm の更新
- ✅ CommentSection の更新

### ステップ3: 利用規約モーダルの統合
- ✅ app/layout.tsx に統合（オプションA）
- ✅ ClientLayout コンポーネント作成
- ✅ user_token チェックロジックの実装

### ステップ4: 既存データの移行
- データベースの cookie_id カラムはそのまま使用
- 既存のcookie_idベースの投票データは保持
- 新しい投票は user_token を使用

## セキュリティ上の改善点

### 修正前
- ❌ ランダムなcookie_idを自動生成
- ❌ 規約同意なし
- ❌ トークンの形式検証なし

### 修正後
- ✅ Captcha認証後にのみトークン発行
- ✅ 利用規約への明示的な同意が必要
- ✅ 64文字hexトークンで形式検証
- ✅ サーバー側でトークン生成
- ✅ 荒らし対策の強化

## データベース

既存の `votes` テーブルと `comments` テーブルはそのまま使用:
- `cookie_id` カラムに `user_token` を格納
- スキーマ変更不要

## テスト方法

1. Cookieを削除
2. ページにアクセス
3. 利用規約モーダルが表示されることを確認
4. Captcha認証を完了
5. 同意ボタンをクリック
6. user_token がCookieに保存されることを確認
7. 投票・コメント投稿が正常に動作することを確認

## ロールバック手順

もし問題が発生した場合:
1. API層を元に戻す（cookieId → userToken）
2. コンポーネントを元に戻す
3. データベースはそのまま（互換性あり）
