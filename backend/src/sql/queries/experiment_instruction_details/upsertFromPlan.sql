-- experiment_instruction_detail UPSERT（ExperimentPlanDialog 保存時）
--
-- ExperimentPlanDialog 保存時に呼び出す。
-- planned_values から展開した想定値を登録/更新する。
-- 既存レコードがある場合は expected_value / xsi_type / transition_name / template_name / update_user_id / update_at のみ更新する
-- （actual_value や不確かさ情報は上書きしない）。
--
-- パラメータ:
--   $1  organization_id
--   $2  project_id
--   $3  method_id
--   $4  task_no
--   $5  transition_id
--   $6  template_id          （MAIMLの template.id: 主キー6番目）
--   $7  prop_key
--   $8  xsi_type
--   $9  expected_value
--   $10 create_user_id / update_user_id
--   $11 transition_name      （MAIMLのトランジション表示名: NULL許容）
--   $12 template_name        （MAIMLのテンプレート表示ラベル: NULL許容）

INSERT INTO experiment_instruction_detail (
    organization_id,
    project_id,
    method_id,
    task_no,
    transition_id,
    template_id,
    prop_key,
    xsi_type,
    expected_value,
    create_user_id,
    create_at,
    update_user_id,
    update_at,
    transition_name,
    template_name
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $10, NOW(), $11, $12
)
ON CONFLICT (organization_id, project_id, method_id, task_no, transition_id, template_id, prop_key)
DO UPDATE SET
    xsi_type        = EXCLUDED.xsi_type,
    expected_value  = EXCLUDED.expected_value,
    transition_name = EXCLUDED.transition_name,
    template_name   = EXCLUDED.template_name,
    update_user_id  = EXCLUDED.update_user_id,
    update_at       = NOW()
