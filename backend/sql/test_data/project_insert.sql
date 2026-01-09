-- ===================================================================
-- プロジェクトテーブルのテストデータ INSERT文
-- ソース: frontend/src/data/mock/mockProjects.json
-- 生成日時: 2026-01-08
-- ===================================================================

-- 組織ID（AIML機関）
-- {a0718dc5-21f3-44e6-87e9-cc2ae83f3385}

-- ユーザーID
-- experiment_admin: {686e0a8f-da93-48df-98b4-482fa4eb098b}
-- experiment_worker: {0c5d7815-5bc1-477f-9749-230b8156901e}

-- プロジェクトステータス
-- 0: pending (計画待ち)
-- 1: planning (計画中)
-- 2: in_progress (進行中)
-- 3: review_waiting (レビュー待ち)
-- 4: completed (完了)
-- 5: error (エラー)

-- チェックアウトステータス
-- 0: チェックアウトされていない
-- 1: チェックアウト中

-- 既存データのクリーンアップ
DELETE FROM project WHERE organization_id = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}';

-- プロジェクトデータの挿入
INSERT INTO project (
    organization_id,
    project_name,
    description,
    department_id,
    owner_user_id,
    project_status,
    project_maiml_flg,
    checkout_status,
    create_at
) VALUES
-- proj_001: HighTempSuperconductor (レビュー待ち、チェックアウト中)
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}',
    'HighTempSuperconductor',
    'YBCO系高温超伝導体の合成条件最適化プロジェクト',
    NULL,
    '{0c5d7815-5bc1-477f-9749-230b8156901e}',
    3,  -- review_waiting
    TRUE,
    1,  -- checked_out
    '2024-11-01'
),

-- proj_002: LithiumBatteryCathode (計画中、チェックアウトされていない)
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}',
    'LithiumBatteryCathode',
    '高容量リチウムイオン電池用正極材料の開発と評価',
    NULL,
    '{0c5d7815-5bc1-477f-9749-230b8156901e}',
    1,  -- planning
    TRUE,
    0,  -- not_checked_out
    '2024-10-15'
),

-- proj_003: PerovskiteSolarCell (進行中、チェックアウトされていない)
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}',
    'PerovskiteSolarCell',
    'ペロブスカイト型太陽電池の変換効率向上に関する研究',
    NULL,
    '{0c5d7815-5bc1-477f-9749-230b8156901e}',
    2,  -- in_progress
    TRUE,
    0,  -- not_checked_out
    '2024-09-20'
),

-- proj_004: NanoparticleCatalyst (完了、チェックアウトされていない)
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}',
    'NanoparticleCatalyst',
    '金属ナノ粒子の触媒活性評価と構造解析',
    NULL,
    '{0c5d7815-5bc1-477f-9749-230b8156901e}',
    4,  -- completed
    TRUE,
    0,  -- not_checked_out
    '2024-08-10'
),

-- proj_005: GrapheneComposite (進行中、チェックアウト中)
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}',
    'GrapheneComposite',
    'グラフェン複合材料の合成と物性評価',
    NULL,
    '{686e0a8f-da93-48df-98b4-482fa4eb098b}',
    2,  -- in_progress
    TRUE,
    1,  -- checked_out
    '2024-07-05'
),

-- proj_006: RareEarthMagnet (計画中、チェックアウトされていない)
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}',
    'RareEarthMagnet',
    '希土類磁石の高性能化に関する研究',
    NULL,
    '{686e0a8f-da93-48df-98b4-482fa4eb098b}',
    1,  -- planning
    TRUE,
    0,  -- not_checked_out
    '2024-06-01'
),

-- proj_007: OrganicSolarCell (完了、チェックアウトされていない)
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}',
    'OrganicSolarCell',
    '有機太陽電池の長期安定性評価',
    NULL,
    '{686e0a8f-da93-48df-98b4-482fa4eb098b}',
    4,  -- completed
    TRUE,
    0,  -- not_checked_out
    '2024-07-15'
),

-- proj_008: FuelCellElectrolyte (エラー、チェックアウト中)
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}',
    'FuelCellElectrolyte',
    '固体酸化物形燃料電池用電解質材料の開発',
    NULL,
    '{686e0a8f-da93-48df-98b4-482fa4eb098b}',
    5,  -- error
    TRUE,
    1,  -- checked_out
    '2024-11-20'
),

-- proj_009: QuantumDotLED (計画待ち、チェックアウト中)
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}',
    'QuantumDotLED',
    '量子ドットLEDの発光効率向上プロジェクト',
    NULL,
    '{686e0a8f-da93-48df-98b4-482fa4eb098b}',
    0,  -- pending
    TRUE,
    1,  -- checked_out
    '2024-12-01'
);

-- 検証用クエリ
SELECT 
    project_id,
    project_name,
    description,
    owner_user_id,
    project_status,
    checkout_status,
    create_at
FROM project
WHERE organization_id = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'
ORDER BY create_at DESC;

-- ステータス別カウント
SELECT 
    CASE project_status
        WHEN 0 THEN 'pending'
        WHEN 1 THEN 'planning'
        WHEN 2 THEN 'in_progress'
        WHEN 3 THEN 'review_waiting'
        WHEN 4 THEN 'completed'
        WHEN 5 THEN 'error'
        ELSE 'unknown'
    END AS status_name,
    COUNT(*) as count
FROM project
WHERE organization_id = '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'
GROUP BY project_status
ORDER BY project_status;
