-- ===================================================================
-- テーブル名: uncertainty_criteria (不確かさ基準)
-- 説明: 不確かさ評価の基準定義を管理するテーブル。
--       定量評価（数値）と定性評価（選択肢）の2種類をサポート。
--       編集されるたびにバージョンをインクリメントする。
-- バージョン: 1.0 (2026-06-30)
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS uncertainty_criteria CASCADE;

CREATE TABLE uncertainty_criteria (
    -- 主キー（複合キー）
    organization_id         UUID                    NOT NULL,
    name_space_id           CHARACTER VARYING(50)   NOT NULL,
    uncertainty_key         CHARACTER VARYING(50)   NOT NULL,  -- prefix + : + Key(名前空間.用語)
    version                 INTEGER                 NOT NULL,  -- 編集されたら+1ずつインクリメント

    -- 不確かさ基準名
    uncertainty_name        CHARACTER VARYING(50)   NOT NULL DEFAULT '',

    -- 評価方式
    evaluation_method       INTEGER                 NOT NULL,  -- 1:定量 / 2:定性

    -- 無効フラグ
    is_Invalid              BOOLEAN                 NOT NULL,  -- 無効:TRUE / その他:FALSE

    -- 継承元
    inheritance_uncertainty_key  CHARACTER VARYING(50),        -- 継承元不確かさ基準Key

    -- 定量評価（数値）専用カラム
    xsi_type                CHARACTER VARYING(20),             -- 定量評価(数値)のみ
    units                   CHARACTER VARYING(20),             -- 定量評価(数値)のみ
    format_string           CHARACTER VARYING(20),             -- 定量評価(数値)のみ

    -- 説明
    description             CHARACTER VARYING(200),

    -- 監査証跡
    create_user_id          VARCHAR(50),
    create_at               TIMESTAMP,
    update_user_id          VARCHAR(50),
    update_at               TIMESTAMP,

    -- 主キー制約
    CONSTRAINT uncertainty_criteria_PKC PRIMARY KEY (
        organization_id,
        name_space_id,
        uncertainty_key,
        version
    )
);

-- インデックス作成
-- organization_id検索用（マルチテナント分離）
CREATE INDEX idx_uncertainty_criteria_org
    ON uncertainty_criteria (organization_id);

-- 名前空間・キー単位の検索用（最新バージョン検索など）
CREATE INDEX idx_uncertainty_criteria_key
    ON uncertainty_criteria (organization_id, name_space_id, uncertainty_key);

-- 非推奨フィルタ用
CREATE INDEX idx_uncertainty_criteria_Invalid
    ON uncertainty_criteria (organization_id, is_Invalid);

-- テーブルコメント
COMMENT ON TABLE uncertainty_criteria IS '不確かさ基準テーブル - 不確かさ評価の基準定義を管理。定量(数値)と定性(選択肢)の2種類をサポート。編集時にバージョンをインクリメント。';

-- カラムコメント
COMMENT ON COLUMN uncertainty_criteria.organization_id IS '組織ID（主キー1）';
COMMENT ON COLUMN uncertainty_criteria.name_space_id IS '名前空間ID（主キー2）';
COMMENT ON COLUMN uncertainty_criteria.uncertainty_key IS '不確かさ基準Key（主キー3）:prefix + : + Key(名前空間.用語)';
COMMENT ON COLUMN uncertainty_criteria.version IS 'バージョン（主キー4）:編集されたら+1ずつインクリメントする';
COMMENT ON COLUMN uncertainty_criteria.uncertainty_name IS '不確かさ基準名';
COMMENT ON COLUMN uncertainty_criteria.evaluation_method IS '評価方式:1:定量 / 2:定性';
COMMENT ON COLUMN uncertainty_criteria.is_Invalid IS '無効フラグ:無効:TRUE / その他:FALSE';
COMMENT ON COLUMN uncertainty_criteria.inheritance_uncertainty_key IS '継承元不確かさ基準Key';
COMMENT ON COLUMN uncertainty_criteria.xsi_type IS 'xsi:type:定量評価(数値)のみ';
COMMENT ON COLUMN uncertainty_criteria.units IS 'units:定量評価(数値)のみ';
COMMENT ON COLUMN uncertainty_criteria.format_string IS 'formatString:定量評価(数値)のみ';
COMMENT ON COLUMN uncertainty_criteria.description IS '説明文(description)';
COMMENT ON COLUMN uncertainty_criteria.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN uncertainty_criteria.create_at IS '作成日時';
COMMENT ON COLUMN uncertainty_criteria.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN uncertainty_criteria.update_at IS '更新日時';
