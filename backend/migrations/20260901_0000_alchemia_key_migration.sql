-- マイグレーション: maiml_event_log の property キーを Alchemia: プレフィックス統一
-- 作成日: 2026-09-01
-- 目的:
--   システムが生成する maiml_event_log テーブル内の JSON に含まれる
--   property @key を "Alchemia:" プレフィックス統一ルールへ移行する。
--
-- 対象キー移行表:
--   旧キー                      → 新キー
--   -------------------------     --------------------------------
--   ns1:transitionComment       → Alchemia:transitionComment
--   worker_id                   → Alchemia:workerId
--   report_type                 → Alchemia:reportType
--     値: transition_progress   →   値: Alchemia:transitionProgress
--     値: transition_comment    →   値: Alchemia:transitionComment
--   status                      → Alchemia:status
--   progress_percentage         → Alchemia:progressPercentage
--   comments                    → Alchemia:comments
--   timestamp                   → 削除（time:timestamp と重複するため）
--   sent_at                     → Alchemia:sentAt
--   experiment_instruction_id   → Alchemia:experimentInstructionId
--   instruction_user_id         → Alchemia:instructionUserId
--   instructions                → Alchemia:instructions
--   acknowledged_at             → Alchemia:acknowledgedAt
--   experiment_user_id          → Alchemia:experimentUserId
--
-- 注意:
--   - lifecycle:transition と time:timestamp は Alchemia: プレフィックスに移行済み
--   - Alchemia:SupervisorDirective* / Alchemia:evaluation* は対応済みのため変更しない
--   - WHERE 条件で旧キーの存在チェックを行い冪等性を確保
--   - log カラムは JSONB 型


-- ────────────────────────────────────────────────────────────────
-- event > property 配列の一括キー置換
-- 対象構造: eventLog > log > trace > event > property[]
-- ────────────────────────────────────────────────────────────────
UPDATE maiml_event_log
SET log = (
  SELECT jsonb_build_object(
    'eventLog', jsonb_build_object(
      '@id', log->'eventLog'->>'@id',
      'log', jsonb_build_object(
        '@id',         (log->'eventLog'->'log'->>'@id'),
        '@ref',        (log->'eventLog'->'log'->>'@ref'),
        'name',        CASE WHEN log->'eventLog'->'log' ? 'name'        THEN log->'eventLog'->'log'->'name'        END,
        'description', CASE WHEN log->'eventLog'->'log' ? 'description' THEN log->'eventLog'->'log'->'description' END,
        'trace', jsonb_build_object(
          '@id',        (log->'eventLog'->'log'->'trace'->>'@id'),
          '@ref',       (log->'eventLog'->'log'->'trace'->>'@ref'),
          'name',        CASE WHEN log->'eventLog'->'log'->'trace' ? 'name'        THEN log->'eventLog'->'log'->'trace'->'name'        END,
          'description', CASE WHEN log->'eventLog'->'log'->'trace' ? 'description' THEN log->'eventLog'->'log'->'trace'->'description' END,
          'event', jsonb_build_object(
            '@id',  (log->'eventLog'->'log'->'trace'->'event'->>'@id'),
            '@ref', (log->'eventLog'->'log'->'trace'->'event'->>'@ref'),
            'property', (
              SELECT jsonb_agg(
                CASE p->>'@key'
                  WHEN 'worker_id'              THEN jsonb_set(p, '{@key}', '"Alchemia:workerId"')
                  WHEN 'status'                 THEN jsonb_set(p, '{@key}', '"Alchemia:status"')
                  WHEN 'progress_percentage'    THEN jsonb_set(p, '{@key}', '"Alchemia:progressPercentage"')
                  WHEN 'report_type'            THEN
                    jsonb_set(
                      jsonb_set(p, '{@key}', '"Alchemia:reportType"'),
                      '{#text}',
                      CASE p->>'#text'
                        WHEN 'transition_progress' THEN '"Alchemia:transitionProgress"'
                        WHEN 'transition_comment'  THEN '"Alchemia:transitionComment"'
                        ELSE p->'#text'
                      END
                    )
                  WHEN 'comments'               THEN jsonb_set(p, '{@key}', '"Alchemia:comments"')
                  WHEN 'ns1:transitionComment'  THEN jsonb_set(p, '{@key}', '"Alchemia:transitionComment"')
                  WHEN 'sent_at'                THEN jsonb_set(p, '{@key}', '"Alchemia:sentAt"')
                  WHEN 'experiment_instruction_id' THEN jsonb_set(p, '{@key}', '"Alchemia:experimentInstructionId"')
                  WHEN 'instruction_user_id'    THEN jsonb_set(p, '{@key}', '"Alchemia:instructionUserId"')
                  WHEN 'instructions'           THEN jsonb_set(p, '{@key}', '"Alchemia:instructions"')
                  WHEN 'acknowledged_at'        THEN jsonb_set(p, '{@key}', '"Alchemia:acknowledgedAt"')
                  WHEN 'experiment_user_id'     THEN jsonb_set(p, '{@key}', '"Alchemia:experimentUserId"')
                  WHEN 'lifecycle:transition'   THEN jsonb_set(p, '{@key}', '"Alchemia:lifecycleTransition"')
                  WHEN 'time:timestamp'         THEN jsonb_set(p, '{@key}', '"Alchemia:timestamp"')
                  ELSE p
                END
              ) FILTER (WHERE p->>'@key' <> 'timestamp')
              FROM jsonb_array_elements(
                log->'eventLog'->'log'->'trace'->'event'->'property'
              ) AS p
            )
          )
        )
      )
    )
  )
)
WHERE
  log->'eventLog'->'log'->'trace'->'event'->'property' IS NOT NULL
  AND jsonb_typeof(log->'eventLog'->'log'->'trace'->'event'->'property') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(log->'eventLog'->'log'->'trace'->'event'->'property') AS p
    WHERE p->>'@key' IN (
      'timestamp', 'worker_id', 'status', 'progress_percentage',
      'report_type', 'comments', 'ns1:transitionComment',
      'sent_at', 'experiment_instruction_id', 'instruction_user_id',
      'instructions', 'acknowledged_at', 'experiment_user_id',
      'lifecycle:transition', 'time:timestamp'
    )
  );

-- ────────────────────────────────────────────────────────────────
-- 完了確認（変換後に旧キーが残っていないことを検証）
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO remaining_count
  FROM maiml_event_log,
       jsonb_array_elements(log->'eventLog'->'log'->'trace'->'event'->'property') AS p
  WHERE p->>'@key' IN (
    'timestamp', 'worker_id', 'status', 'progress_percentage',
    'report_type', 'comments', 'ns1:transitionComment',
    'sent_at', 'experiment_instruction_id', 'instruction_user_id',
    'instructions', 'acknowledged_at', 'experiment_user_id',
    'lifecycle:transition', 'time:timestamp'
  );

  IF remaining_count > 0 THEN
    RAISE WARNING '% 件の旧キーが残存しています。手動確認してください。', remaining_count;
  ELSE
    RAISE NOTICE 'Alchemia キー移行が正常に完了しました。';
  END IF;
END $$;
