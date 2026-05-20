-- ドラフトを削除するクエリ
-- $1: draft_key, $2: organization_id, $3: user_id
DELETE FROM maiml_drafts
WHERE draft_key = $1
  AND organization_id = $2
  AND user_id = $3
