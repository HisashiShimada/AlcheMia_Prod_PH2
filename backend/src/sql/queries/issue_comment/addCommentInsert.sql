-- コメント追加：コメントレコードの挿入
-- POST /api/v1/issues/comments で使用（トランザクション内）
INSERT INTO issue_comment (
  organization_id,
  project_id,
  issue_id,
  sequence_no,
  comment,
  author_id,
  commented_at,
  create_user_id,
  create_at,
  update_user_id,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, NOW(), $6, NOW(), $6, NOW()
)
RETURNING 
  organization_id,
  project_id,
  issue_id,
  sequence_no,
  comment,
  author_id,
  commented_at
