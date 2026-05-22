-- 組織のみなし進捗使用フラグ取得クエリ
SELECT use_deemed_progress
FROM organization
WHERE organization_id = $1
