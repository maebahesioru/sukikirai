# コメント投稿のCaptchaバイパス脆弱性修正

## 問題
コメント投稿がクライアント側でTurnstile検証を行い、その後Supabaseに直接insertしていたため、APIを直接叩くことでCaptcha検証をバイパスできる脆弱性がありました。

## 修正内容

### 1. **コメント投稿API作成（`app/api/comments/route.ts`）**
- サーバー側でTurnstile検証を実施
- 検証成功後にSupabaseにinsert
- クライアントから直接Supabaseにアクセスしない

### 2. **CommentFormコンポーネント修正**
- `verify-turnstile` APIを使わず、`/api/comments` に直接投稿
- Turnstileトークンをサーバー側に送信
- サーバー側で検証とデータベース挿入を実施

### 3. **CommentSectionコンポーネント修正（返信機能）**
- 返信投稿も同様にサーバー側API経由に変更

## 追加で必要な作業（重要）

現在、Supabaseの`comments`テーブルには以下のポリシーが設定されています：

```sql
CREATE POLICY "Enable insert access for all users" ON comments
  FOR INSERT WITH CHECK (true);
```

このポリシーにより、クライアントから直接Supabaseにアクセスして、Captcha検証をバイパスすることが理論上可能です。

### 推奨される対策

#### オプション1: サービスロールキーを使用（推奨）
サーバー側のAPIでService Role Keyを使用し、クライアント側のINSERTポリシーを削除：

1. `.env.local`にService Role Keyを追加：
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. `app/api/comments/route.ts`でService Role Keyを使用：
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

3. Supabase SQL Editorで以下を実行：
```sql
-- クライアント側からのINSERTを禁止
DROP POLICY IF EXISTS "Enable insert access for all users" ON comments;
```

#### オプション2: RLSポリシーはそのまま（現状維持）
- クライアント側のコードでSupabaseに直接insertしないようにした
- ただし、悪意のあるユーザーがSupabaseの認証情報を抽出して直接アクセスすることは可能
- リスクは低減されたが、完全には防げない

## セキュリティ改善

### 修正前
- ❌ クライアント側でTurnstile検証
- ❌ クライアントから直接Supabase insert
- ❌ APIを直接叩けばCaptchaバイパス可能

### 修正後
- ✅ サーバー側でTurnstile検証
- ✅ サーバー側でデータベース挿入
- ✅ クライアントはAPIを経由するのみ
- ⚠️ Supabaseの認証情報は依然としてクライアント側に露出（Service Role Keyで解決可能）

## デプロイ手順

1. コードをデプロイ
2. （オプション）Service Role Keyを設定
3. （オプション）SupabaseでINSERTポリシーを削除

## 検証方法

以下のcurlコマンドでTurnstile検証が機能していることを確認：

```bash
# 無効なトークンでコメント投稿を試行（失敗するはず）
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{
    "personId": "test",
    "commentNumber": 1,
    "voteType": "like",
    "content": "test",
    "turnstileToken": "invalid_token"
  }'
```

期待される結果：
```json
{"success":false,"error":"Turnstile verification failed"}
```
