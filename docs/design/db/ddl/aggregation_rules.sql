-- Project Name : noname
-- Date/Time    : 2026/08/20 8:16:44
-- Author       : mi_ito
-- RDBMS Type   : PostgreSQL
-- Application  : A5:SQL Mk-2

/*
  << 注意！！ >>
  BackupToTempTable, RestoreFromTempTable疑似命令が付加されています。
  これにより、drop table, create table 後もデータが残ります。
  この機能は一時的に $$TableName のような一時テーブルを作成します。
  この機能は A5:SQL Mk-2でのみ有効であることに注意してください。
*/

-- 集約ルール
-- * BackupToTempTable
DROP TABLE if exists aggregation_rules CASCADE;

-- * RestoreFromTempTable
CREATE TABLE aggregation_rules (
  organization_id uuid NOT NULL
  , rule_id uuid NOT NULL
  , version integer DEFAULT 1 NOT NULL
  , is_active BOOLEAN DEFAULT true NOT NULL
  , score_good integer DEFAULT 100 NOT NULL
  , score_caution integer DEFAULT 50 NOT NULL
  , score_bad integer DEFAULT 0 NOT NULL
  , target_rollup character varying(20) DEFAULT 'WORST_CASE' NOT NULL
  , level_status_rule character varying(20) DEFAULT 'WORST_CASE' NOT NULL
  , level_score_rule character varying(20) DEFAULT 'MEAN' NOT NULL
  , missing_handling character varying(30) DEFAULT 'SEPARATE_COUNT' NOT NULL
  , transition_hierarchy character varying(20) DEFAULT 'MERGE' NOT NULL
  , create_user_id character varying(50)
  , create_at timestamp with time zone
  , update_user_id character varying(50)
  , update_at timestamp with time zone
  , CONSTRAINT aggregation_rules_PKC PRIMARY KEY (organization_id,rule_id,version)
) ;


COMMENT ON TABLE aggregation_rules IS '集約ルール';
COMMENT ON COLUMN aggregation_rules.organization_id IS '組織ID';
COMMENT ON COLUMN aggregation_rules.rule_id IS 'ルールID';
COMMENT ON COLUMN aggregation_rules.version IS 'バージョン';
COMMENT ON COLUMN aggregation_rules.is_active IS 'アクティブ判定';
COMMENT ON COLUMN aggregation_rules.score_good IS 'スコア(良好)';
COMMENT ON COLUMN aggregation_rules.score_caution IS 'スコア(要確認)';
COMMENT ON COLUMN aggregation_rules.score_bad IS 'スコア(不良)';
COMMENT ON COLUMN aggregation_rules.target_rollup IS 'ロールアップ対象';
COMMENT ON COLUMN aggregation_rules.level_status_rule IS '階層代表ステータスルール';
COMMENT ON COLUMN aggregation_rules.level_score_rule IS '階層スコアルール';
COMMENT ON COLUMN aggregation_rules.missing_handling IS '未評価対象の扱い';
COMMENT ON COLUMN aggregation_rules.transition_hierarchy IS 'トランジション階層粒度';
COMMENT ON COLUMN aggregation_rules.create_user_id IS '作成ユーザID';
COMMENT ON COLUMN aggregation_rules.create_at IS '作成日時';
COMMENT ON COLUMN aggregation_rules.update_user_id IS '更新ユーザID';
COMMENT ON COLUMN aggregation_rules.update_at IS '更新日時';
