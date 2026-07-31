-- namespace_term を削除（DELETE）
DELETE FROM namespace_term
WHERE organization_id = $1
  AND prefix = $2
  AND localname = $3
