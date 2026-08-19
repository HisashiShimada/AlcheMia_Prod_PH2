-- aggregation_rules: 既存のACTIVEルールをDEPRECATEDに遷移
UPDATE aggregation_rules
SET status = 'DEPRECATED'
WHERE organization_id = $1
  AND status = 'ACTIVE'
