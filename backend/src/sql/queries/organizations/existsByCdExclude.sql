-- 組織CDの存在確認（特定IDを除外：更新時に使用）
SELECT EXISTS (
  SELECT 1
  FROM organization
  WHERE organization_cd = $1
    AND organization_id != $2
) AS exists
