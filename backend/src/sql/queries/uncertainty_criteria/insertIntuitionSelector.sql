-- 定性評価選択肢 INSERT（intuition_selector）
-- uncertainty_criteria の新バージョンに紐づく選択肢を1件ずつ INSERT する
--
-- パラメータ:
--   $1  organization_id
--   $2  name_space_id
--   $3  uncertainty_key
--   $4  version          (uncertainty_criteria に INSERT した新バージョン番号)
--   $5  display_order    (1始まり)
--   $6  value            (選択肢の値)
--   $7  display_color    (#RRGGBB)
--   $8  create_user_id

INSERT INTO intuition_selector (
    organization_id,
    name_space_id,
    uncertainty_key,
    version,
    display_order,
    value,
    display_color,
    create_user_id,
    create_at,
    update_user_id,
    update_at
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    NOW(),
    $8,
    NOW()
)
