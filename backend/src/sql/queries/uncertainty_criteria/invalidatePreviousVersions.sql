-- 旧バージョンを一括無効化（is_Invalid = TRUE）
-- 新バージョン INSERT 後に呼び出し、同一 (organization_id, name_space_id, uncertainty_key) の
-- 新バージョン未満の全レコードを無効にする
--
-- パラメータ:
--   $1  organization_id
--   $2  name_space_id
--   $3  uncertainty_key
--   $4  new_version  （新バージョン番号。それより小さいバージョンが対象）
--   $5  update_user_id

UPDATE uncertainty_criteria
SET
    is_invalid        = TRUE,
    update_user_id  = $5,
    update_at       = NOW()
WHERE
    organization_id   = $1
    AND name_space_id   = $2
    AND uncertainty_key = $3
    AND version         < $4
