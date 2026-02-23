-- 問題を削除する（物理削除）
DELETE FROM issues
WHERE issue_id = $1 AND organization_id = $2
