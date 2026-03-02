-- project_id 型変更: uuid → character varying(20)
-- 目的: エディタの DocumentData.id 初期値として任意文字列（project_ + nanoid(12) = 20文字）を設定可能にする
-- 影響テーブル: project（主キー）、および project_id を持つ全関連テーブル
-- 新形式: 'project_' (8文字) + UUIDの先頭12文字（ハイフン除去） = 20文字固定
--         ※ 既存UUID → 'project_' + replace(project_id::text,'-','') の先頭12文字 で変換
-- 実行前提: 開発環境のデータをCSVに退避済み（docs/design/db/csv/）

BEGIN;

-- ============================================================
-- Step 1: 既存データを ID マッピング付きで一時テーブルに保存
-- ============================================================

-- project_id の新旧マッピング（UUID → varchar(20)）
CREATE TEMP TABLE project_id_mapping AS
SELECT
  project_id AS old_id,
  'project_' || substring(replace(project_id::text, '-', ''), 1, 12) AS new_id
FROM project;

-- ============================================================
-- Step 2: 子テーブルのデータを新 project_id で一時テーブルに保存
-- ============================================================

CREATE TEMP TABLE tmp_project AS
  SELECT * FROM project;

CREATE TEMP TABLE tmp_project_task AS
  SELECT * FROM project_task;

CREATE TEMP TABLE tmp_project_task_detail AS
  SELECT * FROM project_task_detail;

CREATE TEMP TABLE tmp_project_instruction AS
  SELECT * FROM project_instruction;

CREATE TEMP TABLE tmp_instruction_acknowledged_history AS
  SELECT * FROM instruction_acknowledged_history;

CREATE TEMP TABLE tmp_issue AS
  SELECT * FROM issue;

CREATE TEMP TABLE tmp_issue_comment AS
  SELECT * FROM issue_comment;

CREATE TEMP TABLE tmp_maiml_event_log AS
  SELECT * FROM maiml_event_log;

CREATE TEMP TABLE tmp_maiml_validation_history AS
  SELECT * FROM maiml_validation_history;

CREATE TEMP TABLE tmp_template_data AS
  SELECT * FROM template_data;

CREATE TEMP TABLE tmp_transition_data AS
  SELECT * FROM transition_data;

-- ============================================================
-- Step 3: 子テーブルから全データ削除（FK 制約の逆順）
-- ============================================================

DELETE FROM instruction_acknowledged_history;
DELETE FROM issue_comment;
DELETE FROM issue;
DELETE FROM maiml_event_log;
DELETE FROM maiml_validation_history;
DELETE FROM template_data;
DELETE FROM transition_data;
DELETE FROM project_instruction;
DELETE FROM project_task_detail;
DELETE FROM project_task;
DELETE FROM project;

-- ============================================================
-- Step 4: project_id カラムの型変更
-- ============================================================

ALTER TABLE project
  ALTER COLUMN project_id TYPE character varying(20) USING project_id::character varying;

ALTER TABLE project_task
  ALTER COLUMN project_id TYPE character varying(20) USING project_id::character varying;

ALTER TABLE project_task_detail
  ALTER COLUMN project_id TYPE character varying(20) USING project_id::character varying;

ALTER TABLE project_instruction
  ALTER COLUMN project_id TYPE character varying(20) USING project_id::character varying;

ALTER TABLE instruction_acknowledged_history
  ALTER COLUMN project_id TYPE character varying(20) USING project_id::character varying;

ALTER TABLE issue
  ALTER COLUMN project_id TYPE character varying(20) USING project_id::character varying;

ALTER TABLE issue_comment
  ALTER COLUMN project_id TYPE character varying(20) USING project_id::character varying;

ALTER TABLE maiml_event_log
  ALTER COLUMN project_id TYPE character varying(20) USING project_id::character varying;

ALTER TABLE maiml_validation_history
  ALTER COLUMN project_id TYPE character varying(20) USING project_id::character varying;

ALTER TABLE template_data
  ALTER COLUMN project_id TYPE character varying(20) USING project_id::character varying;

ALTER TABLE transition_data
  ALTER COLUMN project_id TYPE character varying(20) USING project_id::character varying;

-- ============================================================
-- Step 5: データを新 project_id で再投入
-- ============================================================

-- project
INSERT INTO project (
  organization_id, project_id, project_name, description, department_cd,
  owner_user_id, project_status, project_maiml_flg, checkout_status,
  create_user_id, create_at, update_user_id, update_at
)
SELECT
  p.organization_id,
  m.new_id,
  p.project_name,
  p.description,
  p.department_cd,
  p.owner_user_id,
  p.project_status,
  p.project_maiml_flg,
  p.checkout_status,
  p.create_user_id,
  p.create_at,
  p.update_user_id,
  p.update_at
FROM tmp_project p
JOIN project_id_mapping m ON m.old_id = p.project_id;

-- project_task
INSERT INTO project_task (
  organization_id, project_id, method_id, experiment_order, task_name,
  experiment_condition, attempts_count, create_user_id, create_at, update_user_id, update_at
)
SELECT
  pt.organization_id,
  m.new_id,
  pt.method_id,
  pt.experiment_order,
  pt.task_name,
  pt.experiment_condition,
  pt.attempts_count,
  pt.create_user_id,
  pt.create_at,
  pt.update_user_id,
  pt.update_at
FROM tmp_project_task pt
JOIN project_id_mapping m ON m.old_id = pt.project_id;

-- project_task_detail
INSERT INTO project_task_detail (
  organization_id, project_id, method_id, task_no, task_status,
  experiment_start_at, experiment_end_at, experiment_user_id,
  reviewed_at, review_user_id,
  create_user_id, create_at, update_user_id, update_at
)
SELECT
  ptd.organization_id,
  m.new_id,
  ptd.method_id,
  ptd.task_no,
  ptd.task_status,
  ptd.experiment_start_at,
  ptd.experiment_end_at,
  ptd.experiment_user_id,
  ptd.reviewed_at,
  ptd.review_user_id,
  ptd.create_user_id,
  ptd.create_at,
  ptd.update_user_id,
  ptd.update_at
FROM tmp_project_task_detail ptd
JOIN project_id_mapping m ON m.old_id = ptd.project_id;

-- project_instruction
INSERT INTO project_instruction (
  organization_id, project_id, experiment_instruction_id, method_id,
  instruction_target, priority, type, task_no, transition_id,
  instructions, instruction_user_id, instruction_date,
  create_user_id, create_at, update_user_id, update_at, instruction_status
)
SELECT
  pi.organization_id,
  m.new_id,
  pi.experiment_instruction_id,
  pi.method_id,
  pi.instruction_target,
  pi.priority,
  pi.type,
  pi.task_no,
  pi.transition_id,
  pi.instructions,
  pi.instruction_user_id,
  pi.instruction_date,
  pi.create_user_id,
  pi.create_at,
  pi.update_user_id,
  pi.update_at,
  pi.instruction_status
FROM tmp_project_instruction pi
JOIN project_id_mapping m ON m.old_id = pi.project_id;

-- instruction_acknowledged_history
INSERT INTO instruction_acknowledged_history (
  organization_id, project_id, experiment_instruction_id,
  experiment_user_id, acknowledged_at,
  create_user_id, create_at, update_user_id, update_at
)
SELECT
  iah.organization_id,
  m.new_id,
  iah.experiment_instruction_id,
  iah.experiment_user_id,
  iah.acknowledged_at,
  iah.create_user_id,
  iah.create_at,
  iah.update_user_id,
  iah.update_at
FROM tmp_instruction_acknowledged_history iah
JOIN project_id_mapping m ON m.old_id = iah.project_id;

-- issue（データなしだが構造は維持）
INSERT INTO issue (
  organization_id, project_id, issue_id, method_id, issue_target, task_no, transition_id,
  issue_title, issue_type, issue_contents, status,
  issue_reporter_id, issue_report_at, issue_completer_id, issue_complate_at,
  create_user_id, update_user_id, create_at, update_at
)
SELECT
  i.organization_id, m.new_id, i.issue_id, i.method_id, i.issue_target, i.task_no, i.transition_id,
  i.issue_title, i.issue_type, i.issue_contents, i.status,
  i.issue_reporter_id, i.issue_report_at, i.issue_completer_id, i.issue_complate_at,
  i.create_user_id, i.update_user_id, i.create_at, i.update_at
FROM tmp_issue i
JOIN project_id_mapping m ON m.old_id = i.project_id;

-- issue_comment
INSERT INTO issue_comment (
  organization_id, project_id, issue_id, sequence_no,
  comment, author_id, commented_at,
  create_user_id, update_user_id, create_at, update_at
)
SELECT
  ic.organization_id, m.new_id, ic.issue_id, ic.sequence_no,
  ic.comment, ic.author_id, ic.commented_at,
  ic.create_user_id, ic.update_user_id, ic.create_at, ic.update_at
FROM tmp_issue_comment ic
JOIN project_id_mapping m ON m.old_id = ic.project_id;

-- maiml_event_log
INSERT INTO maiml_event_log (
  organization_id, project_id, sequence_no, log,
  create_user_id, update_user_id, create_at, update_at
)
SELECT
  mel.organization_id, m.new_id, mel.sequence_no, mel.log,
  mel.create_user_id, mel.update_user_id, mel.create_at, mel.update_at
FROM tmp_maiml_event_log mel
JOIN project_id_mapping m ON m.old_id = mel.project_id;

-- maiml_validation_history
INSERT INTO maiml_validation_history (
  validation_id, organization_id, project_id, file_key, user_id,
  validation_mode, is_valid, total_errors, total_warnings,
  error_details, warning_details,
  validation_duration_ms, elements_validated, attributes_validated,
  nodes_validated, arcs_validated, created_at
)
SELECT
  mvh.validation_id, mvh.organization_id, m.new_id, mvh.file_key, mvh.user_id,
  mvh.validation_mode, mvh.is_valid, mvh.total_errors, mvh.total_warnings,
  mvh.error_details, mvh.warning_details,
  mvh.validation_duration_ms, mvh.elements_validated, mvh.attributes_validated,
  mvh.nodes_validated, mvh.arcs_validated, mvh.created_at
FROM tmp_maiml_validation_history mvh
JOIN project_id_mapping m ON m.old_id = mvh.project_id;

-- template_data
INSERT INTO template_data (
  organization_id, project_id, method_id, task_no, place_id,
  property_set, create_user_id, update_user_id, create_at, update_at
)
SELECT
  td.organization_id, m.new_id, td.method_id, td.task_no, td.place_id,
  td.property_set, td.create_user_id, td.update_user_id, td.create_at, td.update_at
FROM tmp_template_data td
JOIN project_id_mapping m ON m.old_id = td.project_id;

-- transition_data
INSERT INTO transition_data (
  organization_id, project_id, method_id, task_no, transition_id,
  status, progress_rate, create_user_id, update_user_id, create_at, update_at
)
SELECT
  trd.organization_id, m.new_id, trd.method_id, trd.task_no, trd.transition_id,
  trd.status, trd.progress_rate, trd.create_user_id, trd.update_user_id, trd.create_at, trd.update_at
FROM tmp_transition_data trd
JOIN project_id_mapping m ON m.old_id = trd.project_id;

COMMIT;
