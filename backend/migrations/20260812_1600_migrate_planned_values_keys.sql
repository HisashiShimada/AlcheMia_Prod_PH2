-- ============================================================
-- マイグレーション: experiment_plan.planned_values 旧キー変換・UUID系キー削除
-- 作成日時: 2026-08-12 16:00
-- タスク: 20260812_1600_planned-values-key-migration
-- ============================================================
-- 実行順序:
--   ① 注意事項系キー 変換（旧 mgr-instruction:Xxx → 新 Alchemia:SupervisorDirectiveXxx）
--   ② UUID系キー 削除（mgr-instruction:requiredCreatorUUID 等 3件）
--   ③ カラムコメント更新
-- ============================================================
-- 注意: 各 UPDATE は冪等（旧キーが存在しない行は WHERE 条件で除外される）
-- ============================================================

-- ① 注意事項系キー変換（5件）

-- 1-1. mgr-instruction:caution → Alchemia:SupervisorDirectiveCaution
UPDATE experiment_plan
SET planned_values = (
  SELECT jsonb_object_agg(
    transition_id,
    CASE
      WHEN transition_val ? 'mgr-instruction:caution'
      THEN (transition_val - 'mgr-instruction:caution')
           || jsonb_build_object('Alchemia:SupervisorDirectiveCaution',
                                 transition_val -> 'mgr-instruction:caution')
      ELSE transition_val
    END
  )
  FROM jsonb_each(planned_values) AS t(transition_id, transition_val)
)
WHERE planned_values::text LIKE '%mgr-instruction:caution%';

-- 1-2. mgr-instruction:operationNote → Alchemia:SupervisorDirectiveOperationNote
UPDATE experiment_plan
SET planned_values = (
  SELECT jsonb_object_agg(
    transition_id,
    CASE
      WHEN transition_val ? 'mgr-instruction:operationNote'
      THEN (transition_val - 'mgr-instruction:operationNote')
           || jsonb_build_object('Alchemia:SupervisorDirectiveOperationNote',
                                 transition_val -> 'mgr-instruction:operationNote')
      ELSE transition_val
    END
  )
  FROM jsonb_each(planned_values) AS t(transition_id, transition_val)
)
WHERE planned_values::text LIKE '%mgr-instruction:operationNote%';

-- 1-3. mgr-instruction:checkItem → Alchemia:SupervisorDirectiveCheckItem
UPDATE experiment_plan
SET planned_values = (
  SELECT jsonb_object_agg(
    transition_id,
    CASE
      WHEN transition_val ? 'mgr-instruction:checkItem'
      THEN (transition_val - 'mgr-instruction:checkItem')
           || jsonb_build_object('Alchemia:SupervisorDirectiveCheckItem',
                                 transition_val -> 'mgr-instruction:checkItem')
      ELSE transition_val
    END
  )
  FROM jsonb_each(planned_values) AS t(transition_id, transition_val)
)
WHERE planned_values::text LIKE '%mgr-instruction:checkItem%';

-- 1-4. mgr-instruction:prohibitedAction → Alchemia:SupervisorDirectiveProhibitedAction
UPDATE experiment_plan
SET planned_values = (
  SELECT jsonb_object_agg(
    transition_id,
    CASE
      WHEN transition_val ? 'mgr-instruction:prohibitedAction'
      THEN (transition_val - 'mgr-instruction:prohibitedAction')
           || jsonb_build_object('Alchemia:SupervisorDirectiveProhibitedAction',
                                 transition_val -> 'mgr-instruction:prohibitedAction')
      ELSE transition_val
    END
  )
  FROM jsonb_each(planned_values) AS t(transition_id, transition_val)
)
WHERE planned_values::text LIKE '%mgr-instruction:prohibitedAction%';

-- 1-5. mgr-instruction:OtherNotes → Alchemia:SupervisorDirectiveOtherNotes
UPDATE experiment_plan
SET planned_values = (
  SELECT jsonb_object_agg(
    transition_id,
    CASE
      WHEN transition_val ? 'mgr-instruction:OtherNotes'
      THEN (transition_val - 'mgr-instruction:OtherNotes')
           || jsonb_build_object('Alchemia:SupervisorDirectiveOtherNotes',
                                 transition_val -> 'mgr-instruction:OtherNotes')
      ELSE transition_val
    END
  )
  FROM jsonb_each(planned_values) AS t(transition_id, transition_val)
)
WHERE planned_values::text LIKE '%mgr-instruction:OtherNotes%';

-- ② UUID系キー削除（3件を一括）
UPDATE experiment_plan
SET planned_values = (
  SELECT jsonb_object_agg(
    transition_id,
    transition_val
      - 'mgr-instruction:requiredCreatorUUID'
      - 'mgr-instruction:requiredInstrumentUUID'
      - 'mgr-instruction:requiredOwnerUUID'
  )
  FROM jsonb_each(planned_values) AS t(transition_id, transition_val)
)
WHERE planned_values::text LIKE '%mgr-instruction:required%';

-- ③ カラムコメント更新
COMMENT ON COLUMN experiment_plan.planned_values IS
  '実験計画データ（Transition単位）: { [transitionId]: { "Alchemia:SupervisorDirectiveXxx": value, [templateId]: { [fieldKey]: value } } }';
