-- 個人名前空間の scope_key を create_user_id で埋めるマイグレーション
-- 背景: createNamespaceUri.sql が scope_key = NULL でINSERTしていたため
--       個人ノード選択時の検索（WHERE scope_key = userId）にマッチしなかった
-- 対象: scope_key が NULL かつ create_user_id が存在するレコード（個人用URIとして登録されたもの）
UPDATE namespace
SET scope_key = create_user_id
WHERE scope_key IS NULL
  AND create_user_id IS NOT NULL;
