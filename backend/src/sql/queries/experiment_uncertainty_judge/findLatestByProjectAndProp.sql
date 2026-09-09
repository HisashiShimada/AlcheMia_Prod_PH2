-- experiment_uncertainty_judge 最新判定取得（プロパティ別）
--
-- 指定トランジション × プロパティ の最新判定結果を1件取得する。
-- judge_seq 降順で最新を取得。
--
-- パラメータ:
--   $1  organization_id
--   $2  project_id
--   $3  method_id
--   $4  task_no
--   $5  transition_id
--   $6  template_id
--   $7  property_key
--   $8  uncertainty_key

SELECT
    judge_seq               AS "judgeSeq",
    organization_id         AS "organizationId",
    project_id              AS "projectId",
    method_id               AS "methodId",
    task_no                 AS "taskNo",
    transition_id           AS "transitionId",
    template_id             AS "templateId",
    property_key            AS "propertyKey",
    uncertainty_key         AS "uncertaintyKey",
    uncertainty_version     AS "uncertaintyVersion",
    tolerance_upper         AS "toleranceUpper",
    tolerance_lower         AS "toleranceLower",
    recorded_value          AS "recordedValue",
    judge_result            AS "judgeResult",
    create_user_id          AS "createUserId",
    create_at               AS "createAt",
    update_user_id          AS "updateUserId",
    update_at               AS "updateAt"
FROM experiment_uncertainty_judge
WHERE organization_id  = $1
  AND project_id       = $2
  AND method_id        = $3
  AND task_no          = $4
  AND transition_id    = $5
  AND template_id      = $6
  AND property_key     = $7
  AND uncertainty_key  = $8
ORDER BY judge_seq DESC
LIMIT 1

