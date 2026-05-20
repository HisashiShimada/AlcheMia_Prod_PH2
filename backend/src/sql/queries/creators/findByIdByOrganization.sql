-- Creator IDで1件取得（organization_idスコープ）
SELECT 
  cm.creator_id,
  cm.creator_uuid,
  cm.creator_name,
  cm.creator_description,
  cm.creator_annotation,
  cm.is_active,
  vm.vendor_name,
  vm.is_active as vendor_is_active,
  im.instrument_name,
  im.is_active as instrument_is_active,
  cm.update_at
FROM creator cm
LEFT JOIN vendor vm ON cm.vendor_uuid = vm.vendor_uuid 
  AND (
    (cm.corporation_id IS NOT NULL AND cm.corporation_id = vm.corporation_id) OR
    (cm.corporation_id IS NULL AND cm.organization_id = vm.organization_id)
  )
LEFT JOIN instrument im ON cm.instrument_uuid = im.instrument_uuid 
  AND (
    (cm.corporation_id IS NOT NULL AND cm.corporation_id = im.corporation_id) OR
    (cm.corporation_id IS NULL AND cm.organization_id = im.organization_id)
  )
WHERE cm.organization_id = $1 AND cm.creator_id = $2
