-- maiml_event_log の次のsequence_noを取得
-- organization_id + project_id 単位で MAX+1 自動採番
SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_sequence_no
FROM maiml_event_log
WHERE organization_id = $1 AND project_id = $2
