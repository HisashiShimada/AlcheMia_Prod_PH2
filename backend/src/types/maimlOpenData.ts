/**
 * MaiML OpenData Pipeline 型定義
 *
 * @description MaiML公開処理パイプライン（maiml2Excel方式）で使用するDB・API・Worker関連の型定義
 * @reference docs/MaiML_OpenData_Pipeline/db.md
 * @reference docs/MaiML_OpenData_Pipeline/spec.md
 */

// ============================================================
// DB テーブル型定義（public スキーマ）
// ============================================================

/**
 * public.maiml_publish_job テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260312_create_maiml_opendata_new_schema.sql
 * 主キー: job_id (UUID)
 */
export interface MaimlPublishJob {
  job_id?:         string;
  job_type:        'publish' | 'unpublish';
  organization_id: string;
  project_id:      string;
  asset_id?:       bigint | null;
  status:          'pending' | 'running' | 'done' | 'error';
  triggered_by?:   string | null;
  trigger_type:    'manual' | 'schedule';
  error_message?:  string | null;
  started_at?:     Date | null;
  finished_at?:    Date | null;
  created_at?:     Date;
}

// ============================================================
// DB テーブル型定義（組織スキーマ）
// ============================================================

/**
 * {org_schema}.maiml_asset テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260312_create_org_schema_tables.sql
 * 主キー: asset_id (BIGSERIAL)
 */
export interface MaimlAsset {
  asset_id?:        bigint;
  file_uri:         string;
  doc_name?:        string | null;
  retention_until:  Date;
  created_at?:      Date;
  updated_at?:      Date;
}

/**
 * {org_schema}.maiml_instance テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260312_create_org_schema_tables.sql
 */
export interface MaimlInstance {
  instance_id?:      bigint;
  asset_id:          bigint;
  instance_type:     'result' | 'material' | 'condition';
  instance_key:      string;
  template_ref?:     string | null;
  instance_uuid?:    string | null;
  instance_name?:    string | null;
  instance_line_no?: number | null;
}

/**
 * {org_schema}.maiml_element テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260312_create_org_schema_tables.sql
 */
export interface MaimlElement {
  element_id?:         bigint;
  instance_id:         bigint;
  parent_element_id?:  bigint | null;
  hierarchy:           string;
  element_type:        string;
  description?:        string | null;
  element_data?:       string | null;
  hash_method?:        string | null;
  xsi_type?:           string | null;
  key?:                string | null;
  format_string?:      string | null;
  units?:              string | null;
  scale_factor?:       number | null;
  axis?:               string | null;
  size_value?:         number | null;
  element_id_attr?:    string | null;
  element_ref?:        string | null;
  maiml_line_no?:      number | null;
}

/**
 * {org_schema}.maiml_element_value テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260312_create_org_schema_tables.sql
 */
export interface MaimlElementValue {
  value_id?:    bigint;
  element_id:   bigint;
  value_idx:    number;
  value?:       string | null;
  value_array?: string[] | null;
}

/**
 * {org_schema}.maiml_insertion テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260312_create_org_schema_tables.sql
 */
export interface MaimlInsertion {
  insertion_id?:  bigint;
  instance_id:    bigint;
  uri:            string;
  hash_value?:    string | null;
  hash_method?:   string | null;
  file_uuid?:     string | null;
  mime_format?:   string | null;
  maiml_line_no?: number | null;
}

/**
 * {org_schema}.maiml_template テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260312_create_org_schema_tables.sql
 */
export interface MaimlTemplate {
  template_id?:      bigint;
  asset_id:          bigint;
  template_type:     'result' | 'material' | 'condition';
  template_key:      string;
  template_uuid?:    string | null;
  template_name?:    string | null;
  template_line_no?: number | null;
}

/**
 * {org_schema}.maiml_template_element テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260312_create_org_schema_tables.sql
 */
export interface MaimlTemplateElement {
  element_id?:         bigint;
  template_id:         bigint;
  parent_element_id?:  bigint | null;
  hierarchy:           string;
  element_type:        string;
  description?:        string | null;
  element_data?:       string | null;
  hash_method?:        string | null;
  xsi_type?:           string | null;
  key?:                string | null;
  format_string?:      string | null;
  units?:              string | null;
  scale_factor?:       number | null;
  axis?:               string | null;
  size_value?:         number | null;
  element_id_attr?:    string | null;
  element_ref?:        string | null;
  maiml_line_no?:      number | null;
}

/**
 * {org_schema}.maiml_template_element_value テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260312_create_org_schema_tables.sql
 */
export interface MaimlTemplateElementValue {
  value_id?:    bigint;
  element_id:   bigint;
  value_idx:    number;
  value?:       string | null;
  value_array?: string[] | null;
}

/**
 * {org_schema}.maiml_template_insertion テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260312_create_org_schema_tables.sql
 */
export interface MaimlTemplateInsertion {
  insertion_id?:  bigint;
  template_id:    bigint;
  uri:            string;
  hash_value?:    string | null;
  hash_method?:   string | null;
  file_uuid?:     string | null;
  mime_format?:   string | null;
  maiml_line_no?: number | null;
}

// ============================================================
// bullmq Worker ペイロード型定義
// ============================================================

/**
 * 公開ジョブ（bullmq）のペイロード型
 */
export interface PublishJobData {
  jobId:          string;
  organizationId: string;
  projectId:      string;
  projectName:    string;
  fileUri:        string;
  userId?:        string | null;
}

/**
 * 非公開ジョブ（bullmq）のペイロード型
 */
export interface UnpublishJobData {
  jobId:          string;
  organizationId: string;
  projectId:      string;
  projectName:    string;
  assetId:        bigint;
  triggerType:    'manual' | 'schedule';
  userId?:        string | null;
}

// ============================================================
// API レスポンス型定義
// ============================================================

/**
 * 公開・非公開 API の 202 レスポンス
 */
export interface PublishJobResponse {
  job_id:  string;
  status:  'pending';
  message: string;
}

/**
 * 公開ステータス取得 API のレスポンス
 */
export interface PublishStatusResponse {
  job_id?:      string | null;
  job_type?:    'publish' | 'unpublish' | null;
  status?:      'pending' | 'running' | 'done' | 'error' | null;
  asset_id?:    bigint | null;
  project_id:   string;
  started_at?:  Date | null;
  finished_at?: Date | null;
  error_message?: string | null;
}

// ============================================================
// ingest パーサー結果型定義
// ============================================================

/**
 * maimlIngestParserService.parseForIngest() の返り値
 * MaimlParserTyped で解析した MaimlRoot から各 DB テーブル用データにマッピングした結果
 */
export interface ParsedMaimlData {
  docName:                 string | null;
  instances:               MaimlInstanceInput[];
  elements:                MaimlElementInput[];
  elementValues:           MaimlElementValueInput[];
  insertions:              MaimlInsertionInput[];
  templates:               MaimlTemplateInput[];
  templateElements:        MaimlTemplateElementInput[];
  templateElementValues:   MaimlTemplateElementValueInput[];
  templateInsertions:      MaimlTemplateInsertionInput[];
  // eventLog 層
  events:                  MaimlEventInput[];
  eventElements:           MaimlEventElementInput[];
  eventElementValues:      MaimlEventElementValueInput[];
}

/**
 * asset_id 未確定状態の maiml_instance 挿入データ
 */
export interface MaimlInstanceInput {
  instance_type:     'result' | 'material' | 'condition';
  instance_key:      string;
  template_ref?:     string | null;
  instance_uuid?:    string | null;
  instance_name?:    string | null;
  instance_line_no?: number | null;
}

/**
 * 挿入前の maiml_element データ（instance_id は後処理で設定）
 * _tempId は parent_element_id 解決用の仮 ID
 */
export interface MaimlElementInput {
  _tempId:              number;
  _tempParentId?:       number | null;
  _instanceKey:         string;
  hierarchy:            string;
  element_type:         string;
  description?:         string | null;
  element_data?:        string | null;
  hash_method?:         string | null;
  xsi_type?:            string | null;
  key?:                 string | null;
  format_string?:       string | null;
  units?:               string | null;
  scale_factor?:        number | null;
  axis?:                string | null;
  size_value?:          number | null;
  element_id_attr?:     string | null;
  element_ref?:         string | null;
  maiml_line_no?:       number | null;
}

/**
 * 挿入前の maiml_element_value データ
 */
export interface MaimlElementValueInput {
  _tempElementId: number;
  value_idx:      number;
  value?:         string | null;
  value_array?:   string[] | null;
}

/**
 * 挿入前の maiml_insertion データ
 */
export interface MaimlInsertionInput {
  _instanceKey:   string;
  uri:            string;
  hash_value?:    string | null;
  hash_method?:   string | null;
  file_uuid?:     string | null;
  mime_format?:   string | null;
  maiml_line_no?: number | null;
}

/**
 * 挿入前の maiml_template データ
 */
export interface MaimlTemplateInput {
  template_type:     'result' | 'material' | 'condition';
  template_key:      string;
  template_uuid?:    string | null;
  template_name?:    string | null;
  template_line_no?: number | null;
}

/**
 * 挿入前の maiml_template_element データ
 */
export interface MaimlTemplateElementInput {
  _tempId:             number;
  _tempParentId?:      number | null;
  _templateKey:        string;
  hierarchy:           string;
  element_type:        string;
  description?:        string | null;
  element_data?:       string | null;
  hash_method?:        string | null;
  xsi_type?:           string | null;
  key?:                string | null;
  format_string?:      string | null;
  units?:              string | null;
  scale_factor?:       number | null;
  axis?:               string | null;
  size_value?:         number | null;
  element_id_attr?:    string | null;
  element_ref?:        string | null;
  maiml_line_no?:      number | null;
}

/**
 * 挿入前の maiml_template_element_value データ
 */
export interface MaimlTemplateElementValueInput {
  _tempElementId: number;
  value_idx:      number;
  value?:         string | null;
  value_array?:   string[] | null;
}

/**
 * 挿入前の maiml_template_insertion データ
 */
export interface MaimlTemplateInsertionInput {
  _templateKey:   string;
  uri:            string;
  hash_value?:    string | null;
  hash_method?:   string | null;
  file_uuid?:     string | null;
  mime_format?:   string | null;
  maiml_line_no?: number | null;
}

// ============================================================
// DB テーブル型定義（組織スキーマ - eventLog 層）
// @reference docs/MaiML_OpenData_Pipeline/db.md §7.2
// ============================================================

/**
 * {org_schema}.maiml_event テーブルの型定義
 */
export interface MaimlEvent {
  event_id?:        bigint;
  asset_id:         bigint;
  event_key?:       string | null;   // event/@id
  results_ref?:     string | null;   // event/resultsRef/@ref
  instruction_ref?: string | null;   // event/@ref
  event_uuid?:      string | null;
  event_name?:      string | null;
  description?:     string | null;
  annotation?:      string | null;
  maiml_line_no?:   number | null;
}

/**
 * {org_schema}.maiml_event_element テーブルの型定義
 *
 * @remarks
 * XSD上 event 配下には property / content の両方が配置可能。
 * maiml_element / maiml_template_element と同じカラム構成に統一。
 */
export interface MaimlEventElement {
  event_element_id?: bigint;
  event_id:          bigint;
  hierarchy:         string;
  element_type:      string;           // 'property' or 'content'
  description?:      string | null;
  xsi_type?:         string | null;    // @xsi:type 属性
  key?:              string | null;    // @key 属性
  format_string?:    string | null;    // @formatString 属性
  units?:            string | null;    // @units 属性
  scale_factor?:     number | null;    // @scaleFactor 属性
  axis?:             string | null;    // @axis 属性（content のみ）
  size_value?:       number | null;    // @size 属性（content のみ）
  element_id_attr?:  string | null;    // @id 属性（content のみ）
  element_ref?:      string | null;    // @ref 属性（content のみ）
  maiml_line_no?:    number | null;
}

/**
 * {org_schema}.maiml_event_element_value テーブルの型定義
 */
export interface MaimlEventElementValue {
  value_id?:        bigint;
  event_element_id: bigint;
  value_idx:        number;
  value?:           string | null;
  value_array?:     string[] | null;
}

// ============================================================
// ingest パーサー結果型定義（eventLog 層）
// ============================================================

/**
 * 挿入前の maiml_event データ
 */
export interface MaimlEventInput {
  event_key?:       string | null;
  results_ref?:     string | null;
  instruction_ref?: string | null;
  event_uuid?:      string | null;
  event_name?:      string | null;
  description?:     string | null;
  annotation?:      string | null;
  maiml_line_no?:   number | null;
}

/**
 * 挿入前の maiml_event_element データ
 *
 * @remarks
 * MaimlEventElement と同じカラム構成（event_id / event_element_id は Worker が解決）
 */
export interface MaimlEventElementInput {
  /** 対応する MaimlEventInput のインデックス（Worker が event_id を解決するために使用） */
  _eventIndex:    number;
  hierarchy:      string;
  element_type:   string;           // 'property' or 'content'
  description?:   string | null;
  xsi_type?:      string | null;
  key?:           string | null;
  format_string?: string | null;
  units?:         string | null;
  scale_factor?:  number | null;
  axis?:          string | null;
  size_value?:    number | null;
  element_id_attr?: string | null;
  element_ref?:   string | null;
  maiml_line_no?: number | null;
}

/**
 * 挿入前の maiml_event_element_value データ
 */
export interface MaimlEventElementValueInput {
  /** 対応する MaimlEventElementInput のインデックス */
  _eventElementIndex: number;
  value_idx:          number;
  value?:             string | null;
  value_array?:       string[] | null;
}
