-- みなし進捗処理廃止に伴う不要カラム削除
-- 前提: 20260911_1200_みなし進捗処理削除（フェーズ1・2）の適用済み、および
--       20260924_1000 コードデプロイ済みであること
--
-- 削除対象:
--   1. organization.use_deemed_progress  （みなし進捗使用フラグ）
--   2. transition_data.progress_rate     （みなし進捗廃止により更新不要となった進捗率）

-- 1. organization.use_deemed_progress を削除
ALTER TABLE organization DROP COLUMN IF EXISTS use_deemed_progress;

-- 2. transition_data.progress_rate を削除
ALTER TABLE transition_data DROP COLUMN IF EXISTS progress_rate;
