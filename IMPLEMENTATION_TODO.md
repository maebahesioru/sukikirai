# 実装TODO: 利用規約モーダルの統合

## 完了した作業 ✅

1. **認証システム実装**
   - ✅ `/api/agree-terms` - 利用規約同意API
   - ✅ `TermsAgreementModal.tsx` - 利用規約モーダルコンポーネント
   - ✅ `/api/vote` - userToken対応
   - ✅ `/api/comments` - userToken対応とService Role Key使用

2. **コンポーネント更新**
   - ✅ `VoteButton.tsx` - userTokenチェック追加
   - ✅ `CommentForm.tsx` - userTokenチェック追加
   - ✅ `CommentSection.tsx` - 返信にuserTokenチェック追加

## 残りの作業 ⚠️

### 1. 利用規約モーダルの表示ロジック実装

各ページまたはレイアウトで、user_tokenがない場合に利用規約モーダルを表示する必要があります。

#### オプションA: app/layout.tsx に統合（推奨）

```tsx
// app/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import TermsAgreementModal from '@/components/TermsAgreementModal';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user has agreed to terms
    const userToken = Cookies.get('user_token');
    if (!userToken) {
      setShowTermsModal(true);
    }
    setIsChecking(false);
  }, []);

  const handleAgree = () => {
    setShowTermsModal(false);
  };

  if (isChecking) {
    return <div>Loading...</div>;
  }

  return (
    <html lang="ja">
      <body>
        {showTermsModal && <TermsAgreementModal onAgree={handleAgree} />}
        {children}
      </body>
    </html>
  );
}
```

#### オプションB: 各ページごとに実装

```tsx
// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import TermsAgreementModal from '@/components/TermsAgreementModal';

export default function Home() {
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    const userToken = Cookies.get('user_token');
    if (!userToken) {
      setShowTermsModal(true);
    }
  }, []);

  const handleAgree = () => {
    setShowTermsModal(false);
  };

  return (
    <>
      {showTermsModal && <TermsAgreementModal onAgree={handleAgree} />}
      {/* 既存のコンテンツ */}
    </>
  );
}
```

### 2. コメント取得の最適化（重要）

現在、CommentSectionは個別にコメントと返信を取得しているため、リクエスト数が多いです。

#### 問題
```typescript
// 各コメントごとに返信を取得している
const { data } = await supabase
  .from('comments')
  .select('*')
  .eq('parent_comment_id', comment.id);
```

#### 解決策: 一括取得に変更

```typescript
// components/CommentSection.tsx

const fetchComments = useCallback(async () => {
  // 1. メインコメントを取得
  let query = supabase
    .from('comments')
    .select('*', { count: 'exact' })
    .eq('person_id', personId)
    .eq('is_hidden', false)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * commentsPerPage, page * commentsPerPage - 1);

  if (filter !== 'all') {
    query = query.eq('vote_type', filter);
  }

  const { data: mainComments, count, error } = await query;

  if (!error && mainComments) {
    const commentIds = mainComments.map(c => c.id);
    
    // 2. すべての返信を一括取得
    const { data: allReplies } = await supabase
      .from('comments')
      .select('*')
      .in('parent_comment_id', commentIds)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });

    // 3. 返信をコメントごとにグループ化
    const repliesByComment = new Map();
    allReplies?.forEach(reply => {
      const parentId = reply.parent_comment_id;
      if (!repliesByComment.has(parentId)) {
        repliesByComment.set(parentId, []);
      }
      repliesByComment.get(parentId).push(reply);
    });

    // 4. コメントに返信データを付加
    const commentsWithReplies = mainComments.map(comment => ({
      ...comment,
      replies: repliesByComment.get(comment.id) || []
    }));

    setComments(commentsWithReplies);
    setTotalComments(count || 0);
  }
}, [personId, filter, page]);
```

### 3. Sidebar.tsx の RecentlyViewed エラー修正

```bash
# ファイルが存在するか確認
ls components/RecentlyViewed.tsx

# もし存在しない場合は作成済みのファイルを確認
# 既に作成済みなので、パスの問題かもしれません
```

## テスト手順

1. **Cookieをクリア**
   ```javascript
   // ブラウザのコンソールで実行
   document.cookie.split(";").forEach(function(c) { 
     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
   });
   ```

2. **ページをリロード**
   - 利用規約モーダルが表示されることを確認

3. **Captcha認証を完了**
   - Turnstileウィジェットが表示されることを確認

4. **「同意する」ボタンをクリック**
   - user_token がCookieに保存されることを確認（開発者ツール > Application > Cookies）

5. **投票・コメント投稿をテスト**
   - 正常に動作することを確認

## デプロイ前のチェックリスト

- [ ] `.env.local` に `SUPABASE_SERVICE_ROLE_KEY` が設定されている
- [ ] Supabase SQL Editorで `DROP POLICY "Enable insert access for all users" ON comments;` を実行済み
- [ ] 利用規約モーダルの表示ロジックを実装済み
- [ ] コメント取得の最適化を実装済み（オプション）
- [ ] テストでuser_tokenが正常に発行・保存されることを確認済み
- [ ] 投票・コメント投稿が正常に動作することを確認済み

## ロールバック手順（問題が発生した場合）

1. Gitで前のコミットに戻す
2. Vercelで再デプロイ
3. Supabaseで以下のSQLを実行（INSERTポリシーを復元）：
   ```sql
   CREATE POLICY "Enable insert access for all users" ON comments
     FOR INSERT WITH CHECK (true);
   ```
