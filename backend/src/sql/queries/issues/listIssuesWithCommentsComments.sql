-- コメント付き問題一覧を取得する（コメント一括取得部分）
-- GET /api/v1/issues で使用
SELECT
  c.issue_id AS "issueId",
  c.sequence_no AS "sequenceNo",
  c.comment,
  c.author_id AS "authorId",
  u.user_name AS "authorName",
  c.commented_at AS "commentedAt"
FROM issue_comment c
INNER JOIN organization_user u ON u.organization_id = c.organization_id AND u.user_id = c.author_id
WHERE c.organization_id = $1 AND c.issue_id = ANY($2)
ORDER BY c.issue_id, c.sequence_no ASC
