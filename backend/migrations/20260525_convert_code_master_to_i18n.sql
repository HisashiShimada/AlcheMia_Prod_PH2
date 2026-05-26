-- ================================================================
-- code_master の code_name を i18n キーに変換し、
-- code_remark / code_description を整理するマイグレーション
--
-- 変更内容:
--   - code_name:        日本語 → i18nキーのキー部分（例: 'materialShortage'）
--   - code_remark:      日本語コード名称（例: '材料不足'）
--   - code_description: カテゴリ説明（例: '問題のタイプ'）
--
-- i18nキー組み立てルール（Backend/Frontend 側で組み立て）:
--   codeMaster.{code_division}.{code_name}
--   例: codeMaster.issue_type.materialShortage
--
-- 対象: 全組織の全code_masterレコード（35件 × 組織数）
-- 日付: 2026-05-25
-- ================================================================

BEGIN;

UPDATE code_master SET
  code_name = CASE
    -- checkout_status
    WHEN code_division = 'checkout_status'       AND code_value = '0' THEN 'checkedIn'
    WHEN code_division = 'checkout_status'       AND code_value = '1' THEN 'checkedOut'
    -- experiment_condition
    WHEN code_division = 'experiment_condition'  AND code_value = '0' THEN 'allSameCondition'
    WHEN code_division = 'experiment_condition'  AND code_value = '1' THEN 'individualCondition'
    -- instruction_priority
    WHEN code_division = 'instruction_priority'  AND code_value = '0' THEN 'low'
    WHEN code_division = 'instruction_priority'  AND code_value = '1' THEN 'normal'
    WHEN code_division = 'instruction_priority'  AND code_value = '2' THEN 'medium'
    WHEN code_division = 'instruction_priority'  AND code_value = '3' THEN 'high'
    -- instruction_status
    WHEN code_division = 'instruction_status'    AND code_value = '0' THEN 'unsent'
    WHEN code_division = 'instruction_status'    AND code_value = '1' THEN 'sent'
    -- instruction_target
    WHEN code_division = 'instruction_target'    AND code_value = '0' THEN 'entireFile'
    WHEN code_division = 'instruction_target'    AND code_value = '1' THEN 'specificTask'
    WHEN code_division = 'instruction_target'    AND code_value = '2' THEN 'specificTransition'
    -- instruction_type
    WHEN code_division = 'instruction_type'      AND code_value = '0' THEN 'general'
    WHEN code_division = 'instruction_type'      AND code_value = '1' THEN 'setup'
    WHEN code_division = 'instruction_type'      AND code_value = '2' THEN 'measurement'
    WHEN code_division = 'instruction_type'      AND code_value = '3' THEN 'safety'
    WHEN code_division = 'instruction_type'      AND code_value = '4' THEN 'cleaning'
    -- issue_type
    WHEN code_division = 'issue_type'            AND code_value = '0' THEN 'materialShortage'
    WHEN code_division = 'issue_type'            AND code_value = '1' THEN 'equipmentFailure'
    WHEN code_division = 'issue_type'            AND code_value = '2' THEN 'unclearProcedure'
    WHEN code_division = 'issue_type'            AND code_value = '3' THEN 'safetyConcern'
    WHEN code_division = 'issue_type'            AND code_value = '4' THEN 'qualityIssue'
    WHEN code_division = 'issue_type'            AND code_value = '5' THEN 'timeConstraint'
    WHEN code_division = 'issue_type'            AND code_value = '6' THEN 'other'
    -- project_status
    WHEN code_division = 'project_status'        AND code_value = '0' THEN 'planning'
    WHEN code_division = 'project_status'        AND code_value = '1' THEN 'taskPending'
    WHEN code_division = 'project_status'        AND code_value = '2' THEN 'taskInProgress'
    WHEN code_division = 'project_status'        AND code_value = '3' THEN 'reviewPending'
    WHEN code_division = 'project_status'        AND code_value = '4' THEN 'completed'
    WHEN code_division = 'project_status'        AND code_value = '5' THEN 'taskFailed'
    -- task_status
    WHEN code_division = 'task_status'           AND code_value = '0' THEN 'pending'
    WHEN code_division = 'task_status'           AND code_value = '1' THEN 'inProgress'
    WHEN code_division = 'task_status'           AND code_value = '2' THEN 'reviewPending'
    WHEN code_division = 'task_status'           AND code_value = '3' THEN 'completed'
    WHEN code_division = 'task_status'           AND code_value = '4' THEN 'failed'
    -- 未知のcode_divisionはそのまま
    ELSE code_name
  END,
  code_remark = CASE
    -- checkout_status
    WHEN code_division = 'checkout_status'       AND code_value = '0' THEN 'チェックイン中'
    WHEN code_division = 'checkout_status'       AND code_value = '1' THEN 'チェックアウト済'
    -- experiment_condition
    WHEN code_division = 'experiment_condition'  AND code_value = '0' THEN '全て同一条件で実行'
    WHEN code_division = 'experiment_condition'  AND code_value = '1' THEN '実験ごとに条件を変更'
    -- instruction_priority
    WHEN code_division = 'instruction_priority'  AND code_value = '0' THEN '低'
    WHEN code_division = 'instruction_priority'  AND code_value = '1' THEN '通常'
    WHEN code_division = 'instruction_priority'  AND code_value = '2' THEN '中'
    WHEN code_division = 'instruction_priority'  AND code_value = '3' THEN '高'
    -- instruction_status
    WHEN code_division = 'instruction_status'    AND code_value = '0' THEN '未送信'
    WHEN code_division = 'instruction_status'    AND code_value = '1' THEN '送信済'
    -- instruction_target
    WHEN code_division = 'instruction_target'    AND code_value = '0' THEN 'ファイル全体'
    WHEN code_division = 'instruction_target'    AND code_value = '1' THEN '特定タスク'
    WHEN code_division = 'instruction_target'    AND code_value = '2' THEN '特定トランジション'
    -- instruction_type
    WHEN code_division = 'instruction_type'      AND code_value = '0' THEN '一般'
    WHEN code_division = 'instruction_type'      AND code_value = '1' THEN 'セットアップ'
    WHEN code_division = 'instruction_type'      AND code_value = '2' THEN '測定'
    WHEN code_division = 'instruction_type'      AND code_value = '3' THEN '安全'
    WHEN code_division = 'instruction_type'      AND code_value = '4' THEN '清掃'
    -- issue_type
    WHEN code_division = 'issue_type'            AND code_value = '0' THEN '材料不足'
    WHEN code_division = 'issue_type'            AND code_value = '1' THEN '機器故障'
    WHEN code_division = 'issue_type'            AND code_value = '2' THEN '手順不明確'
    WHEN code_division = 'issue_type'            AND code_value = '3' THEN '安全性の懸念'
    WHEN code_division = 'issue_type'            AND code_value = '4' THEN '品質問題'
    WHEN code_division = 'issue_type'            AND code_value = '5' THEN '時間制約'
    WHEN code_division = 'issue_type'            AND code_value = '6' THEN 'その他'
    -- project_status
    WHEN code_division = 'project_status'        AND code_value = '0' THEN 'プロジェクト計画中'
    WHEN code_division = 'project_status'        AND code_value = '1' THEN 'タスク実行待ち'
    WHEN code_division = 'project_status'        AND code_value = '2' THEN 'タスク実行中'
    WHEN code_division = 'project_status'        AND code_value = '3' THEN 'タスク結果レビュー待ち'
    WHEN code_division = 'project_status'        AND code_value = '4' THEN 'プロジェクト完了'
    WHEN code_division = 'project_status'        AND code_value = '5' THEN 'タスク異常終了'
    -- task_status
    WHEN code_division = 'task_status'           AND code_value = '0' THEN '実行待ち'
    WHEN code_division = 'task_status'           AND code_value = '1' THEN '実行中'
    WHEN code_division = 'task_status'           AND code_value = '2' THEN 'レビュー待ち'
    WHEN code_division = 'task_status'           AND code_value = '3' THEN '完了'
    WHEN code_division = 'task_status'           AND code_value = '4' THEN '異常終了'
    ELSE code_remark
  END,
  code_description = CASE
    WHEN code_division = 'checkout_status'      THEN 'プロジェクトのチェックアウト状態'
    WHEN code_division = 'experiment_condition' THEN '繰り返し実験時の条件指定'
    WHEN code_division = 'instruction_priority' THEN '実験指示の優先度'
    WHEN code_division = 'instruction_status'   THEN '指示送信ステータス'
    WHEN code_division = 'instruction_target'   THEN '指示送信時の指示範囲'
    WHEN code_division = 'instruction_type'     THEN '実験指示のタイプ'
    WHEN code_division = 'issue_type'           THEN '問題のタイプ'
    WHEN code_division = 'project_status'       THEN 'プロジェクトの進捗ステータス'
    WHEN code_division = 'task_status'          THEN 'タスクの進捗ステータス'
    ELSE code_description
  END,
  update_at = NOW()
WHERE code_division IN (
  'checkout_status',
  'experiment_condition',
  'instruction_priority',
  'instruction_status',
  'instruction_target',
  'instruction_type',
  'issue_type',
  'project_status',
  'task_status'
);

-- 更新確認用（コメントアウト）
-- SELECT code_division, code_value, code_name, code_description, code_remark
-- FROM code_master
-- ORDER BY code_division, code_value::int;

COMMIT;

-- ================================================================
-- ロールバック用SQL（問題発生時に実行）
-- ================================================================
-- BEGIN;
-- UPDATE code_master SET
--   code_name        = code_remark,
--   code_remark      = NULL,
--   code_description = NULL,
--   update_at        = NOW()
-- WHERE code_division IN (
--   'checkout_status', 'experiment_condition', 'instruction_priority',
--   'instruction_status', 'instruction_target', 'instruction_type',
--   'issue_type', 'project_status', 'task_status'
-- );
-- COMMIT;
