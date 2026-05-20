-- 進行中のバッチ一覧を取得するクエリ（作成日時降順）
-- $1: organization_id
SELECT * FROM upload_batch
WHERE organization_id = $1
  AND status = 'in_progress'
ORDER BY create_at DESC
