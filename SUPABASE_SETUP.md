# Supabase セットアップ手順

## 通報機能のdetailsカラム追加

Supabase Dashboard > SQL Editor で以下のSQLを実行してください：

```sql
-- Add details column to reports table for storing additional information from users
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS details TEXT;

-- Add comment for the column
COMMENT ON COLUMN reports.details IS 'ユーザーが入力した通報の詳細・備考（任意）';
```

## 確認方法

```sql
-- reportsテーブルの構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reports';
```

## トラブルシューティング

エラーが出た場合は、以下を確認してください：

1. **reportsテーブルが存在するか**
   ```sql
   SELECT * FROM reports LIMIT 1;
   ```

2. **RLS (Row Level Security) の設定**
   - INSERT権限が正しく設定されているか確認
   - 必要に応じてポリシーを更新

3. **エラーログの確認**
   - ブラウザのコンソールで詳細なエラーメッセージを確認
   - `通報エラー詳細:` で始まるログを探す
