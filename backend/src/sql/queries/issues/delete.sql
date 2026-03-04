-- 問題を削除する（物理削除）
DELETE FROM issue
WHERE issue_id = $1 AND organization_id = $2
