-- コメント追加：シーケンス番号の採番
-- POST /api/v1/issues/comments で使用（トランザクション内）
SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_seq
FROM issue_comment
WHERE organization_id = $1 AND issue_id = $2
