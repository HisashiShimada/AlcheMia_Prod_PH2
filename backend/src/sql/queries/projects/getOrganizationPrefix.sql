-- 組織プレフィックス取得
-- 用途: S3パス構築に使用する組織プレフィックスを取得
-- パラメータ: $1 = organization_id
SELECT 
  organization_prefix
FROM organization
WHERE organization_id = $1
