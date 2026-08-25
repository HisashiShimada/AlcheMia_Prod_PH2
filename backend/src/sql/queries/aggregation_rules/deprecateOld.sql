-- aggregation_rules: 既存のACTIVEルールをis_active=falseに遷移
UPDATE aggregation_rules
SET is_active   = false,
    update_user_id = $2,
    update_at   = NOW()
WHERE organization_id = $1
  AND is_active = true
