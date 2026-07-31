-- 組織内の namespace_id 最大連番を取得（NS0001 形式の採番用）
-- createNamespaceUri() / createNamespace() で共通使用
SELECT COALESCE(MAX(CAST(SUBSTRING(namespace_id FROM 3) AS INTEGER)), 0) + 1 AS next_seq
FROM namespace
WHERE organization_id = $1
