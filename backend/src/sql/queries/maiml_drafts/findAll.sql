-- 組織・ユーザーのドラフト一覧を取得するクエリ（最終保存日時の降順）
-- $1: organization_id, $2: user_id
SELECT *
FROM maiml_drafts
WHERE organization_id = $1
  AND user_id = $2
ORDER BY last_saved_at DESC
