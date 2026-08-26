-- experiment_uncertainty_judge プロジェクト全件取得
--
-- 指定プロジェクトの全判定結果を取得する（承認時 MAiML 書き込み用）。
-- 各プロパティの最新判定のみを返す（DISTINCT ON）。
--
-- パラメータ:
--   $1  organization_id
--   $2  project_id
--   $3  method_id

SELECT DISTINCT ON (task_no, transition_id, place_id, property_key, uncertainty_key)
    id,
    organization_id         AS "organizationId",
    project_id              AS "projectId",
    method_id               AS "methodId",
    task_no                 AS "taskNo",
    transition_id           AS "transitionId",
    place_id                AS "placeId",
    property_key            AS "propertyKey",
    uncertainty_key         AS "uncertaintyKey",
    uncertainty_version     AS "uncertaintyVersion",
    tolerance_upper         AS "toleranceUpper",
    tolerance_lower         AS "toleranceLower",
    recorded_value          AS "recordedValue",
    judge_result            AS "judgeResult",
    create_user_id          AS "createUserId",
    create_at               AS "createAt"
FROM experiment_uncertainty_judge
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3
ORDER BY
    task_no ASC,
    transition_id ASC,
    place_id ASC,
    property_key ASC,
    uncertainty_key ASC,
    id DESC
