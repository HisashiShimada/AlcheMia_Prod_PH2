-- プロジェクトタスク・タスク詳細のテストデータ
-- public.projectテーブルのCSVデータとmockProjects.jsonを元に作成

-- ===================================
-- 1. HighTempSuperconductor (proj_001)
-- project_id: 9a92873d-9deb-471d-8ccf-bce2a2cd216b
-- ===================================

-- project_task
INSERT INTO project_task (organization_id, project_id, method_id, task_name, experiment_order, experiment_condition, attempts_count) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{9a92873d-9deb-471d-8ccf-bce2a2cd216b}', 'SamplePreparation', 'サンプル準備', 1, 1, 2),
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{9a92873d-9deb-471d-8ccf-bce2a2cd216b}', 'Characterization', '特性評価', 2, 1, 4);

-- project_task_detail
-- SamplePreparation_1 (completed)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{9a92873d-9deb-471d-8ccf-bce2a2cd216b}', 'SamplePreparation', 1, 2, '2024-12-08 08:00:00', '2024-12-08 16:00:00', '{0c5d7815-5bc1-477f-9749-230b8156901e}', '2024-12-08 17:00:00', '{686e0a8f-da93-48df-98b4-482fa4eb098b}');

-- SamplePreparation_2 (completed)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{9a92873d-9deb-471d-8ccf-bce2a2cd216b}', 'SamplePreparation', 2, 2, '2024-12-09 08:00:00', '2024-12-09 12:00:00', '{0c5d7815-5bc1-477f-9749-230b8156901e}', '2024-12-09 14:00:00', '{686e0a8f-da93-48df-98b4-482fa4eb098b}');

-- Characterization_1 (in_progress)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{9a92873d-9deb-471d-8ccf-bce2a2cd216b}', 'Characterization', 1, 1, '2024-12-09 13:00:00', NULL, '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- Characterization_2 (pending)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{9a92873d-9deb-471d-8ccf-bce2a2cd216b}', 'Characterization', 2, 0, NULL, NULL, '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- Characterization_3 (review_waiting)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{9a92873d-9deb-471d-8ccf-bce2a2cd216b}', 'Characterization', 3, 3, '2024-12-10 08:00:00', '2024-12-10 16:00:00', '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- Characterization_4 (pending)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{9a92873d-9deb-471d-8ccf-bce2a2cd216b}', 'Characterization', 4, 0, NULL, NULL, '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- ===================================
-- 2. PerovskiteSolarCell (proj_003)
-- project_id: ca80aca8-5a58-4148-826c-71545f1fb696
-- ===================================

-- project_task
INSERT INTO project_task (organization_id, project_id, method_id, task_name, experiment_order, experiment_condition, attempts_count) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{ca80aca8-5a58-4148-826c-71545f1fb696}', 'MaterialSynthesis', '材料合成', 1, 1, 1),
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{ca80aca8-5a58-4148-826c-71545f1fb696}', 'PerformanceEvaluation', '性能評価', 2, 1, 1),
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{ca80aca8-5a58-4148-826c-71545f1fb696}', 'StabilityTest', '安定性試験', 3, 1, 1);

-- project_task_detail
-- MaterialSynthesis_1 (completed)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{ca80aca8-5a58-4148-826c-71545f1fb696}', 'MaterialSynthesis', 1, 2, '2024-12-06 08:00:00', '2024-12-06 17:00:00', '{0c5d7815-5bc1-477f-9749-230b8156901e}', '2024-12-06 18:00:00', '{686e0a8f-da93-48df-98b4-482fa4eb098b}');

-- PerformanceEvaluation_1 (in_progress)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{ca80aca8-5a58-4148-826c-71545f1fb696}', 'PerformanceEvaluation', 1, 1, '2024-12-07 08:00:00', NULL, '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- StabilityTest_1 (pending)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{ca80aca8-5a58-4148-826c-71545f1fb696}', 'StabilityTest', 1, 0, NULL, NULL, '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- ===================================
-- 3. NanoparticleCatalyst (proj_004)
-- project_id: 5d9a7f7e-b464-4ec9-897b-2761e2cd8b4b
-- ===================================

-- project_task
INSERT INTO project_task (organization_id, project_id, method_id, task_name, experiment_order, experiment_condition, attempts_count) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{5d9a7f7e-b464-4ec9-897b-2761e2cd8b4b}', 'NanoparticleCatalyst', 'ナノ粒子触媒評価', 1, 1, 1);

-- project_task_detail
-- NanoparticleCatalyst_1 (completed)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{5d9a7f7e-b464-4ec9-897b-2761e2cd8b4b}', 'NanoparticleCatalyst', 1, 2, '2024-11-29 08:00:00', '2024-11-30 10:00:00', '{0c5d7815-5bc1-477f-9749-230b8156901e}', '2024-11-30 11:00:00', '{686e0a8f-da93-48df-98b4-482fa4eb098b}');

-- ===================================
-- 4. GrapheneComposite (proj_005)
-- project_id: 435b0667-af37-49e9-bc21-58f748587e49
-- ===================================

-- project_task
INSERT INTO project_task (organization_id, project_id, method_id, task_name, experiment_order, experiment_condition, attempts_count) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{435b0667-af37-49e9-bc21-58f748587e49}', 'GrapheneSynthesis', 'グラフェン合成', 1, 1, 1);

-- project_task_detail
-- GrapheneSynthesis_1 (in_progress)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{435b0667-af37-49e9-bc21-58f748587e49}', 'GrapheneSynthesis', 1, 1, '2024-12-01 09:00:00', NULL, '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- ===================================
-- 5. FuelCellElectrolyte (proj_008)
-- project_id: 91907679-cf1f-41f9-aa83-0b9e1c36bbbb
-- ===================================

-- project_task
INSERT INTO project_task (organization_id, project_id, method_id, task_name, experiment_order, experiment_condition, attempts_count) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{91907679-cf1f-41f9-aa83-0b9e1c36bbbb}', 'MaterialSynthesis', '材料合成', 1, 1, 1),
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{91907679-cf1f-41f9-aa83-0b9e1c36bbbb}', 'Characterization', '特性評価', 2, 1, 1);

-- project_task_detail
-- MaterialSynthesis_1 (error)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{91907679-cf1f-41f9-aa83-0b9e1c36bbbb}', 'MaterialSynthesis', 1, 4, '2024-12-10 09:00:00', NULL, '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- Characterization_1 (pending)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{91907679-cf1f-41f9-aa83-0b9e1c36bbbb}', 'Characterization', 1, 0, NULL, NULL, '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- ===================================
-- 6. QuantumDotLED (proj_009)
-- project_id: 10ee60f0-51cb-4bc7-b512-e1ee05a7d9f9
-- ===================================

-- project_task
INSERT INTO project_task (organization_id, project_id, method_id, task_name, experiment_order, experiment_condition, attempts_count) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{10ee60f0-51cb-4bc7-b512-e1ee05a7d9f9}', 'QuantumDotSynthesis', '量子ドット合成', 1, 1, 1),
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{10ee60f0-51cb-4bc7-b512-e1ee05a7d9f9}', 'LEDFabrication', 'LED作製', 2, 1, 1),
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{10ee60f0-51cb-4bc7-b512-e1ee05a7d9f9}', 'OpticalCharacterization', '光学特性評価', 3, 1, 1);

-- project_task_detail
-- QuantumDotSynthesis_1 (pending)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{10ee60f0-51cb-4bc7-b512-e1ee05a7d9f9}', 'QuantumDotSynthesis', 1, 0, NULL, NULL, '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- LEDFabrication_1 (pending)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{10ee60f0-51cb-4bc7-b512-e1ee05a7d9f9}', 'LEDFabrication', 1, 0, NULL, NULL, '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- OpticalCharacterization_1 (pending)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{10ee60f0-51cb-4bc7-b512-e1ee05a7d9f9}', 'OpticalCharacterization', 1, 0, NULL, NULL, '{0c5d7815-5bc1-477f-9749-230b8156901e}', NULL, NULL);

-- ===================================
-- 7. OrganicSolarCell (proj_007)
-- project_id: f7c59dde-d9e5-43f4-aa5d-db310f7f1d74
-- ===================================

-- project_task
INSERT INTO project_task (organization_id, project_id, method_id, task_name, experiment_order, experiment_condition, attempts_count) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{f7c59dde-d9e5-43f4-aa5d-db310f7f1d74}', 'OrganicSolarCell', '有機太陽電池評価', 1, 1, 1);

-- project_task_detail
-- OrganicSolarCell_1 (completed)
INSERT INTO project_task_detail (organization_id, project_id, method_id, task_no, task_status, experiment_start_at, experiment_end_at, experiment_user_id, reviewed_at, review_user_id) VALUES
('{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}', '{f7c59dde-d9e5-43f4-aa5d-db310f7f1d74}', 'OrganicSolarCell', 1, 2, '2024-08-27 08:00:00', '2024-12-10 16:30:00', '{0c5d7815-5bc1-477f-9749-230b8156901e}', '2024-12-10 17:00:00', '{686e0a8f-da93-48df-98b4-482fa4eb098b}');

-- ===================================
-- テストデータ投入完了
-- ===================================
-- 合計:
-- - project_task: 13レコード
-- - project_task_detail: 20レコード