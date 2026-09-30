-- fix_uncertainty_judge_template_id.sql
--
-- 目的:
--   experiment_uncertainty_judge.template_id に誤って placeId が格納されているレコードを
--   正しい MAIMLの template.id（template_data.property_set->>'templateId'）に修正する。
--
-- 背景:
--   WorkRecordPanel.tsx の WorkTemplate.id が placeId で構築されていたため、
--   onUncertaintyValuesChange コールバック経由で placeId が templateId として
--   experiment_uncertainty_judge に INSERT されていた。
--
-- 適用手順:
--   1. 本番DB適用前に BEGIN; で開始し、SELECT で修正対象件数を確認する
--   2. 問題がなければ COMMIT; する
--   3. このSQLは冪等（既に正しい templateId が入っているレコードは変更されない）
--

BEGIN;

-- 修正対象件数の確認（適用前に確認推奨）
-- SELECT COUNT(*) AS target_count
-- FROM experiment_uncertainty_judge euj
-- WHERE EXISTS (
--   SELECT 1 FROM template_data td
--   WHERE td.organization_id = euj.organization_id
--     AND td.project_id       = euj.project_id
--     AND td.method_id        = euj.method_id
--     AND td.task_no          = euj.task_no
--     AND td.place_id         = euj.template_id
--     AND (td.property_set->>'templateId') IS NOT NULL
--     AND (td.property_set->>'templateId') <> ''
-- );

UPDATE experiment_uncertainty_judge euj
SET template_id = (
  SELECT (td.property_set->>'templateId')
  FROM template_data td
  WHERE td.organization_id = euj.organization_id
    AND td.project_id       = euj.project_id
    AND td.method_id        = euj.method_id
    AND td.task_no          = euj.task_no
    AND td.place_id         = euj.template_id
    AND (td.property_set->>'templateId') IS NOT NULL
    AND (td.property_set->>'templateId') <> ''
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM template_data td
  WHERE td.organization_id = euj.organization_id
    AND td.project_id       = euj.project_id
    AND td.method_id        = euj.method_id
    AND td.task_no          = euj.task_no
    AND td.place_id         = euj.template_id
    AND (td.property_set->>'templateId') IS NOT NULL
    AND (td.property_set->>'templateId') <> ''
);

COMMIT;
