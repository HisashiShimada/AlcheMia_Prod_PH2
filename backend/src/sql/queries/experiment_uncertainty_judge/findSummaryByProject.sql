-- experiment_uncertainty_judge プロジェクト集計取得
--
-- 指定プロジェクトの判定結果（最新判定のみ）を集計し、
-- 総件数・良好件数・不良件数を返す。
--
-- パラメータ:
--   $1  organization_id
--   $2  project_id

SELECT
    COUNT(*)                                          AS "total",
    COUNT(*) FILTER (WHERE judge_result = '良好')     AS "good",
    COUNT(*) FILTER (WHERE judge_result = '不良')     AS "bad"
FROM (
    SELECT DISTINCT ON (method_id, task_no, transition_id, place_id, property_key, uncertainty_key)
        judge_result
    FROM experiment_uncertainty_judge
    WHERE organization_id = $1
      AND project_id      = $2
    ORDER BY
        method_id       ASC,
        task_no         ASC,
        transition_id   ASC,
        place_id        ASC,
        property_key    ASC,
        uncertainty_key ASC,
        judge_seq       DESC
) AS latest_judges
