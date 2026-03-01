-- Instrumentフィルタ付き一覧取得クエリ（ベースクエリ）
-- 動的フィルタ条件はRepository層でWHERE句に追加する
-- display_scope='all' → corporation_idでフィルタ
-- display_scope='own'  → organization_idでフィルタ
SELECT
  instrument_id,
  instrument_uuid,
  instrument_name,
  instrument_description,
  instrument_annotation,
  is_active,
  update_at
FROM instrument
WHERE 1=1
ORDER BY instrument_id ASC
