-- チェックアウト時のトランジションステータス一括更新
-- prerequisite_transition_ids が空配列（'{}'）のトランジションを「2: 準備状態」に更新する
-- prerequisite_transition_ids が設定されているトランジションは「1: 初期状態」のままにする
--
-- Parameters:
--   $1: organization_id (UUID)
--   $2: project_id (UUID)
--   $3: update_user_id (VARCHAR)
--
-- Returns: 更新件数（0件の場合は対象なし）

UPDATE transition_data
SET
  status         = 2,                  -- 2: 準備状態（PREPARING）
  update_user_id = $3,
  update_at      = CURRENT_TIMESTAMP
WHERE organization_id              = $1
  AND project_id                   = $2
  AND status                       = 1  -- 1: 初期状態（INITIAL）のみ対象
  AND prerequisite_transition_ids  = '{}'  -- 前提トランジションなし（空配列）のもの
