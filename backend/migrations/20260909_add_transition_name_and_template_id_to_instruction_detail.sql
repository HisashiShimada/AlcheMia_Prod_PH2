-- =============================================================
-- マイグレーション: experiment_instruction_detail に
--   transition_name / template_id カラムを追加し、
--   主キーを template_name → template_id に変更する
-- 作成日: 2026-09-09
-- 目的:
--   1. transition_name を追加することで ExperimentPlanDialog 保存時に
--      トランジション表示名をDBへ格納し、MAIMLパース不要で参照できるようにする
--   2. template_id（MAIMLの template.id）を追加して主キーに使用する
--      これまで主キーだった template_name はテンプレート表示ラベルであり
--      識別子として不適切なため、template_id を主キーに変更する
--      template_name カラムは残す（NULL許容、表示ラベルとして保持）
--
-- STEP 4 について:
--   既存レコードの template_id には仮値（transition_id '__' template_name）を設定する。
--   真の template_id（MAIMLの template.id）は次回 ExperimentPlanDialog 保存時に上書きされる。
-- =============================================================

-- STEP 1: カラム追加（NULL許容）
ALTER TABLE experiment_instruction_detail
  ADD COLUMN IF NOT EXISTS transition_name CHARACTER VARYING,
  ADD COLUMN IF NOT EXISTS template_id     CHARACTER VARYING;

-- STEP 2: 既存の主キー制約を削除
ALTER TABLE experiment_instruction_detail
  DROP CONSTRAINT IF EXISTS experiment_instruction_detail_PKC;

-- STEP 3: template_name の NOT NULL 制約を外す（主キーから外れるため）
ALTER TABLE experiment_instruction_detail
  ALTER COLUMN template_name DROP NOT NULL;

-- STEP 4: 既存レコード（template_id が NULL のもの）に仮値を設定
--   主キー制約を満たすために一意な仮値として
--   transition_id と template_name を '__' で結合した文字列を使用する
UPDATE experiment_instruction_detail
SET template_id = transition_id || '__' || COALESCE(template_name, '')
WHERE template_id IS NULL;

-- STEP 5: 新しい主キー制約を template_id ベースで再作成
ALTER TABLE experiment_instruction_detail
  ADD CONSTRAINT experiment_instruction_detail_PKC PRIMARY KEY (
    organization_id,
    project_id,
    method_id,
    task_no,
    transition_id,
    template_id,
    prop_key
  );

-- STEP 6: カラムコメント追加
COMMENT ON COLUMN experiment_instruction_detail.transition_name IS 'トランジション表示名: MAIMLから取得したトランジションのname属性（未設定時はNULL）';
COMMENT ON COLUMN experiment_instruction_detail.template_id IS 'テンプレートID（主キー6番目）: MAIMLの template.id（既存レコードは仮値、次回ExperimentPlanDialog保存時に正式値に更新される）';
COMMENT ON COLUMN experiment_instruction_detail.template_name IS 'テンプレート表示ラベル: MAIMLの template.name/label（非主キー、表示用）';

-- =============================================================
-- ロールバック:
--   ALTER TABLE experiment_instruction_detail DROP CONSTRAINT experiment_instruction_detail_PKC;
--   UPDATE experiment_instruction_detail
--     SET template_id = NULL
--     WHERE template_id LIKE '%__%';
--   ALTER TABLE experiment_instruction_detail ALTER COLUMN template_name SET NOT NULL;
--   ALTER TABLE experiment_instruction_detail ADD CONSTRAINT experiment_instruction_detail_PKC PRIMARY KEY (
--     organization_id, project_id, method_id, task_no, transition_id, template_name, prop_key
--   );
--   ALTER TABLE experiment_instruction_detail DROP COLUMN IF EXISTS transition_name;
--   ALTER TABLE experiment_instruction_detail DROP COLUMN IF EXISTS template_id;
-- =============================================================

