-- Vendorフィルタ付き一覧取得クエリ（ベースクエリ）
-- 動的WHEREフィルタはRepository層で文字列置換して追加する
-- 表示切替: 'all' の場合はcorporation_idで、それ以外はorganization_idでフィルタ
SELECT
  vendor_id,
  vendor_uuid,
  vendor_name,
  vendor_description,
  vendor_annotation,
  is_active,
  update_at
FROM vendor
WHERE 1=1
ORDER BY vendor_id ASC
