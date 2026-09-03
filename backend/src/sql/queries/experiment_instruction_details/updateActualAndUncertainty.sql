-- experiment_instruction_detail 実績値・不確かさ更新（WorkRecordPanel 保存時）
--
-- WorkRecordPanel 保存時に呼び出す。
-- actual_value（実績値）および不確かさ情報を更新する。
-- レコードが存在しない場合は INSERT する（スケルトンがない環境への対応）。
--
-- パラメータ:
--   $1  organization_id
--   $2  project_id
--   $3  method_id
--   $4  task_no
--   $5  transition_id
--   $6  template_name
--   $7  prop_key
--   $8  actual_value               （NULL 可: 実績値）
--   $9  name_space_id              （NULL 可: 不確かさ紐づけ時のみ）
--   $10 uncertainty_key            （NULL 可: 不確かさ紐づけ時のみ）
--   $11 uncertainty_assigned_value （NULL 可: 定量/定性の入力値テキスト）
--   $12 uncertainty_assigned_by    （NULL 可: 付与ユーザID）
--   $13 uncertainty_assigned_at    （NULL 可: 付与日時）
--   $14 update_user_id

INSERT INTO experiment_instruction_detail (
    organization_id,
    project_id,
    method_id,
    task_no,
    transition_id,
    template_name,
    prop_key,
    actual_value,
    name_space_id,
    uncertainty_key,
    uncertainty_assigned_value,
    uncertainty_assigned_by,
    uncertainty_assigned_at,
    create_user_id,
    create_at,
    update_user_id,
    update_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11, $12, $13,
    $14, NOW(), $14, NOW()
)
ON CONFLICT (organization_id, project_id, method_id, task_no, transition_id, template_name, prop_key)
DO UPDATE SET
    actual_value               = COALESCE(EXCLUDED.actual_value, experiment_instruction_detail.actual_value),
    name_space_id              = COALESCE(EXCLUDED.name_space_id, experiment_instruction_detail.name_space_id),
    uncertainty_key            = COALESCE(EXCLUDED.uncertainty_key, experiment_instruction_detail.uncertainty_key),
    uncertainty_assigned_value = COALESCE(EXCLUDED.uncertainty_assigned_value, experiment_instruction_detail.uncertainty_assigned_value),
    uncertainty_assigned_by    = COALESCE(EXCLUDED.uncertainty_assigned_by, experiment_instruction_detail.uncertainty_assigned_by),
    uncertainty_assigned_at    = COALESCE(EXCLUDED.uncertainty_assigned_at, experiment_instruction_detail.uncertainty_assigned_at),
    update_user_id             = EXCLUDED.update_user_id,
    update_at                  = NOW()
