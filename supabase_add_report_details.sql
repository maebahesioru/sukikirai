-- Add details column to reports table for storing additional information from users

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS details TEXT;

-- Add comment for the column
COMMENT ON COLUMN reports.details IS 'ユーザーが入力した通報の詳細・備考（任意）';
