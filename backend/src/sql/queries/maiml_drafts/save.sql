-- MAIMLドラフトをUPSERT（INSERT or UPDATE）するクエリ
-- $1: draft_key, $2: user_id, $3: organization_id, $4: draft_name
-- $5: original_file_key, $6: nodes, $7: arcs, $8: templates
-- $9: document_data, $10: node_count, $11: arc_count, $12: template_count, $13: project_id
INSERT INTO maiml_drafts (
  draft_key,
  user_id,
  organization_id,
  draft_name,
  original_file_key,
  nodes,
  arcs,
  templates,
  document_data,
  node_count,
  arc_count,
  template_count,
  project_id,
  created_at,
  last_saved_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (draft_key)
DO UPDATE SET
  draft_name = EXCLUDED.draft_name,
  original_file_key = EXCLUDED.original_file_key,
  nodes = EXCLUDED.nodes,
  arcs = EXCLUDED.arcs,
  templates = EXCLUDED.templates,
  document_data = EXCLUDED.document_data,
  node_count = EXCLUDED.node_count,
  arc_count = EXCLUDED.arc_count,
  template_count = EXCLUDED.template_count,
  project_id = EXCLUDED.project_id,
  last_saved_at = CURRENT_TIMESTAMP
WHERE maiml_drafts.organization_id = $3
  AND maiml_drafts.user_id = $2
RETURNING *
