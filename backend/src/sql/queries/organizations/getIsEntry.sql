-- 組織の二段階認証要否フラグ取得クエリ
SELECT is_entry
FROM organization
WHERE organization_id = $1
