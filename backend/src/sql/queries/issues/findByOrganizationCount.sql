-- 組織の問題総件数を取得する（カウント用）
-- findByOrganization() メソッドで使用
-- 動的フィルタ（projectId, methodId, taskNo, transitionId, issueType, severity, status）はTypeScriptコードで追加される
SELECT COUNT(*) as count
FROM issue
WHERE organization_id = $1
