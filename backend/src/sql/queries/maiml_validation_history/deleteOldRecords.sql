-- 古いバリデーション履歴を削除するクエリ
-- $1: organization_id, $2: days_to_keep（保持日数）
DELETE FROM maiml_validation_history
WHERE organization_id = $1
  AND created_at < CURRENT_TIMESTAMP - ($2 || ' days')::INTERVAL
