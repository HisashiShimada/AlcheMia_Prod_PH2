-- コメント追加：問題存在確認とロック取得
-- POST /api/v1/issues/comments で使用（トランザクション内）
SELECT issue_id, organization_id, project_id
FROM issues
WHERE issue_id = $1 AND organization_id = $2
FOR UPDATE
