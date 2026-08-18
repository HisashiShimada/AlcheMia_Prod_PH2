-- 不確かさ基準 新バージョンINSERT
-- 同一 (organization_id, name_space_id, uncertainty_key) の最大 version + 1 を新バージョンとして INSERT する
--
-- パラメータ:
--   $1  organization_id
--   $2  name_space_id
--   $3  uncertainty_key
--   $4  uncertainty_name
--   $5  evaluation_method    (1:定量 / 2:定性)
--   $6  is_Invalid           (TRUE:無効 / FALSE:有効)
--   $7  inheritance_uncertainty_key  (NULL許容)
--   $8  xsi_type             (NULL許容 / 定量のみ)
--   $9  units                (NULL許容 / 定量のみ)
--   $10 scale_factor         (NULL許容 / 定量のみ)
--   $11 format_string        (NULL許容 / 定量のみ)
--   $12 description          (NULL許容)
--   $13 create_user_id

INSERT INTO uncertainty_criteria (
    organization_id,
    name_space_id,
    uncertainty_key,
    version,
    uncertainty_name,
    evaluation_method,
    is_invalid,
    inheritance_uncertainty_key,
    xsi_type,
    units,
    scale_factor,
    format_string,
    description,
    create_user_id,
    create_at,
    update_user_id,
    update_at
)
SELECT
    $1,
    $2,
    $3,
    COALESCE(MAX(version), 0) + 1,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    $11,
    $12,
    $13,
    NOW(),
    $13,
    NOW()
FROM uncertainty_criteria
WHERE organization_id = $1
  AND name_space_id   = $2
  AND uncertainty_key = $3
RETURNING version
