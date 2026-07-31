-- 用語のアクティブ/非アクティブを切り替える
UPDATE namespace_term SET
  is_active = $4
  , update_at = CURRENT_TIMESTAMP
WHERE organization_id = $1
  AND prefix = $2
  AND localname = $3
