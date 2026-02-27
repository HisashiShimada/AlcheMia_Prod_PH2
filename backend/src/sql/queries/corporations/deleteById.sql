-- Corporation物理削除クエリ
DELETE FROM corporation
WHERE corporation_id = $1
