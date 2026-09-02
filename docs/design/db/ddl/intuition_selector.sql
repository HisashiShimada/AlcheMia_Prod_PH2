-- ===================================================================
-- テーブル名: intuition_selector (定性評価選択肢)
-- 説明: 不確かさ基準の定性評価で使用する選択肢を管理するテーブル。
--       uncertainty_criteria の定性評価（evaluation_method=2）に紐づく。
-- バージョン: 1.1 (2026-09-02) is_default カラム削除
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS intuition_selector CASCADE;

CREATE TABLE intuition_selector (
    -- 主キー（複合キー）
    organization_id     UUID                    NOT NULL,
    name_space_id       CHARACTER VARYING(50)   NOT NULL,
    uncertainty_key     CHARACTER VARYING(50)   NOT NULL,  -- prefix + : + Key(名前空間.用語)
    version             INTEGER                 NOT NULL,  -- 編集されたら+1ずつインクリメント
    display_order       INTEGER                 NOT NULL,  -- 選択肢の表示順（1始まり）

    -- 選択肢情報
    value               CHARACTER VARYING(100)  NOT NULL,
    display_color       CHARACTER VARYING(7)    NOT NULL,  -- #RRGGBB形式

    -- 監査証跡
    create_user_id      VARCHAR(50),
    create_at           TIMESTAMP,
    update_user_id      VARCHAR(50),
    update_at           TIMESTAMP,

    -- 主キー制約
    CONSTRAINT intuition_selector_PKC PRIMARY KEY (
        organization_id,
        name_space_id,
        uncertainty_key,
        version,
        display_order
    ),

    -- 外部キー制約（uncertainty_criteriaへの参照）
    CONSTRAINT fk_intuition_selector_criteria
        FOREIGN KEY (organization_id, name_space_id, uncertainty_key, version)
        REFERENCES uncertainty_criteria (organization_id, name_space_id, uncertainty_key, version)
);

-- インデックス作成
-- organization_id検索用（マルチテナント分離）
CREATE INDEX idx_intuition_selector_org
    ON intuition_selector (organization_id);

-- 不確かさ基準Key単位の検索用
CREATE INDEX idx_intuition_selector_key
    ON intuition_selector (organization_id, name_space_id, uncertainty_key, version);

-- テーブルコメント
COMMENT ON TABLE intuition_selector IS '定性評価選択肢テーブル - 不確かさ基準の定性評価（evaluation_method=2）で使用する選択肢を管理。';

-- カラムコメント
COMMENT ON COLUMN intuition_selector.organization_id IS '組織ID（主キー1）';
COMMENT ON COLUMN intuition_selector.name_space_id IS '名前空間ID（主キー2）';
COMMENT ON COLUMN intuition_selector.uncertainty_key IS '不確かさ基準Key（主キー3）:prefix + : + Key(名前空間.用語)';
COMMENT ON COLUMN intuition_selector.version IS 'バージョン（主キー4）:編集されたら+1ずつインクリメントする';
COMMENT ON COLUMN intuition_selector.display_order IS '順序（主キー5）:選択肢の表示順（1始まり）';
COMMENT ON COLUMN intuition_selector.value IS 'Value:選択肢の値';
COMMENT ON COLUMN intuition_selector.display_color IS '表示色:#RRGGBB形式';
COMMENT ON COLUMN intuition_selector.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN intuition_selector.create_at IS '作成日時';
COMMENT ON COLUMN intuition_selector.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN intuition_selector.update_at IS '更新日時';
