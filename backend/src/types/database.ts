/**
 * データベーステーブルの型定義
 * 
 * このファイルは各テーブルの型定義を集約します。
 * Repository層で使用するテーブル型はここで定義してください。
 * 
 * @remarks
 * 型定義は docs/design/db/ddl/ のDDLファイルに基づいています。
 */

/**
 * projectテーブルの型定義
 * 
 * @remarks
 * この型は project テーブルのスキーマに対応しています。
 * DDL: docs/design/db/ddl/project.sql
 * 主キー: (organization_id, project_id)
 */
export interface Project {
  /** 組織ID（主キー、UUID） */
  organization_id: string;
  
  /** プロジェクトID（主キー、UUID） */
  project_id: string;
  
  /** プロジェクト名（プロジェクト名かつフォルダ名） */
  project_name?: string;
  
  /** 概要 */
  description?: string;
  
  /** 組織グループCD */
  organization_group_cd?: string;
  
  /** 所有者ユーザID */
  owner_user_id?: string;
  
  /** プロジェクトステータス（数値、2桁） */
  project_status?: number;
  
  /** プロジェクトMaiml有無（false: ファイルなし、true: ファイルあり） */
  project_maiml_flg?: boolean;
  
  /** チェックアウトステータス（数値、2桁） */
  checkout_status?: number;
  
  /** プロジェクトUUID（MAIMLの<Document>タグのUUID、不変識別子） */
  project_uuid?: string;
  
  /** 作成者ユーザID */
  create_user_id?: string;
  
  /** 作成日時 */
  create_at?: Date;
  
  /** 更新者ユーザID */
  update_user_id?: string;
  
  /** 更新日時 */
  update_at?: Date;
}

/**
 * organization_groupテーブルの型定義
 *
 * @remarks
 * DDL: docs/design/db/ddl/organization_group.sql
 * 主キー: (organization_id, organization_group_cd)
 */
export interface OrganizationGroup {
  /** 組織ID（主キー、UUID） */
  organization_id: string;
  /** 組織階層グループCD（主キー） */
  organization_group_cd: string;
  /** 組織階層グループ名 */
  organization_group_name: string;
  /** 代表者ユーザID */
  chief_user_id: string;
  /** 親階層グループCD */
  parent_group_cd: string | null;
  /** レイヤー */
  layer: string | null;
  /** 作成者ユーザID */
  create_user_id: string | null;
  /** 作成日時 */
  create_at: Date | null;
  /** 更新者ユーザID */
  update_user_id: string | null;
  /** 更新日時 */
  update_at: Date | null;
}
/**
 * project_task_detailテーブルの型定義
 * 
 * @remarks
 * この型は project_task_detail テーブルのスキーマに対応しています。
 * DDL: docs/design/db/ddl/project_task_detail.sql
 * 主キー: (organization_id, project_id, method_id, task_no)
 */
export interface ProjectTaskDetail {
  /** 組織ID（主キー） */
  organization_id: string;
  
  /** プロジェクトID（主キー） */
  project_id: string;
  
  /** メソッドID（主キー） */
  method_id: string;
  
  /** タスク連番（主キー） */
  task_no: number;
  
  /** タスクステータス */
  task_status?: number | null;
  
  /** 実験開始日 */
  experiment_start_at?: Date | null;
  
  /** 実験終了日 */
  experiment_end_at?: Date | null;
  
  /** 実験作業者ID */
  experiment_user_id?: string | null;
  
  /** レビュー完了日 */
  reviewed_at?: Date | null;
  
  /** レビュアーID */
  review_user_id?: string | null;

  /** NG時のレビュー結果（NG理由・指摘内容）。承認時はNULL。DDL追加: 20260618_005 */
  review_result?: string | null;
  
  /** 作成者ユーザID */
  create_user_id?: string;
  
  /** 作成日時 */
  create_at?: Date;
  
  /** 更新者ユーザID */
  update_user_id?: string;
  
  /** 更新日時 */
  update_at?: Date;
}

/**
 * project_instructionテーブルの型定義
 * 
 * @remarks
 * この型は project_instruction テーブルのスキーマに対応しています。
 * DDL: docs/design/db/ddl/project_instruction.sql
 * 主キー: (organization_id, project_id, experiment_instruction_id)
 * 
 * instruction_status カラムは 20260224_add_instruction_status.sql マイグレーションで追加
 */
export interface ProjectInstruction {
  /** 組織ID（主キー） */
  organization_id: string;
  
  /** プロジェクトID（主キー） */
  project_id: string;
  
  /** 実験指示ID（主キー） */
  experiment_instruction_id: string;
  
  /** メソッドID */
  method_id?: string | null;
  
  /** タスク連番 */
  task_no?: number | null;
  
  /** トランジションID */
  transition_id?: string | null;
  
  /** 指示内容 */
  instructions?: string | null;
  
  /** 指示送信ステータス: 0=未送信、1=送信済 */
  instruction_status?: number;
  
  /** 実験指示ユーザID */
  instruction_user_id?: string | null;
  
  /** 指示送信日 */
  instruction_date?: Date | null;
  
  /** MAIMLのpropertyタグキー（mgr-instruction:caution 等。デフォルトは SupervisorDirectiveContent） */
  instruction_key: string;
  
  /** 作成者ユーザID */
  create_user_id?: string;
  
  /** 作成日時 */
  create_at?: Date;
  
  /** 更新者ユーザID */
  update_user_id?: string;
  
  /** 更新日時 */
  update_at?: Date;
}

/**
 * project_taskテーブルの型定義
 * 
 * @remarks
 * この型は project_task テーブルのスキーマに対応しています。
 * DDL: docs/design/db/ddl/project_task.sql
 * 主キー: (organization_id, project_id, method_id, experiment_order)
 */
export interface ProjectTask {
  /** 組織ID（主キー） */
  organization_id: string;
  
  /** プロジェクトID（主キー） */
  project_id: string;
  
  /** メソッドID（主キー） */
  method_id: string;
  
  /** 実験順序（主キー） */
  experiment_order?: number | null;
  
  /** 実験条件 */
  experiment_condition?: number | null;
  
  /** 試行回数 */
  attempts_count?: number | null;
  
  /** 作業者連携済フラグ */
  worker_linked_flg?: boolean | null;
  
  /** 作成者ユーザID */
  create_user_id?: string;
  
  /** 作成日時 */
  create_at?: Date;
  
  /** 更新者ユーザID */
  update_user_id?: string;
  
  /** 更新日時 */
  update_at?: Date;
}

/**
 * transition_dataテーブルの型定義
 * 
 * @remarks
 * この型は transition_data テーブルのスキーマに対応しています。
 * DDL: docs/design/db/ddl/transition_data.sql
 * 主キー: (organization_id, project_id, method_id, task_no, transition_id)
 */
export interface TransitionData {
  /** 組織ID（主キー） */
  organization_id: string;
  
  /** プロジェクトID（主キー） */
  project_id: string;
  
  /** メソッドID（主キー） */
  method_id: string;
  
  /** タスク連番（主キー） */
  task_no: number;
  
  /** トランジションID（主キー） */
  transition_id: string;
  
  /** ステータス（数値、2桁） */
  status?: number | null;
  
  /** 進捗率（数値、3桁） */
  progress_rate?: number | null;
  
  /** 作成者ユーザID */
  create_user_id?: string;
  
  /** 更新者ユーザID */
  update_user_id?: string;
  
  /** 作成日時 */
  create_at?: Date;
  
  /** 更新日時 */
  update_at?: Date;
}

/**
 * template_dataテーブルの型定義
 * 
 * @remarks
 * この型は template_data テーブルのスキーマに対応しています。
 * DDL: docs/design/db/ddl/template_data.sql
 * 主キー: (organization_id, project_id, method_id, task_no, place_id)
 */
export interface TemplateData {
  /** 組織ID（主キー） */
  organization_id: string;
  
  /** プロジェクトID（主キー） */
  project_id: string;
  
  /** メソッドID（主キー） */
  method_id: string;
  
  /** タスク連番（主キー） */
  task_no: number;
  
  /** プレースID（主キー） */
  place_id: string;
  
  /** プロパティセット（JSON） */
  property_set?: Record<string, any> | null;
  
  /** 作成者ユーザID */
  create_user_id?: string;
  
  /** 更新者ユーザID */
  update_user_id?: string;
  
  /** 作成日時 */
  create_at?: Date;
  
  /** 更新日時 */
  update_at?: Date;
}

/**
 * organization_userテーブルの型定義（JOINデータ含む）
 * 
 * @remarks
 * この型は organization_user テーブルと関連テーブル（role）を
 * JOINした結果に対応しています。
 * DDL: docs/design/db/ddl/organization_user.sql
 * 主キー: (organization_id, user_id)
 */
export interface User {
  /** ユーザーID（主キー、メールアドレス） */
  user_id: string;
  
  /** ユーザー名 */
  user_name: string;
  
  /** メールアドレス */
  mail_address: string;
  
  /** ロールCD（外部キー） */
  role_cd: string;
  
  /** ロール名（JOIN結果） */
  role_name: string | null;
  
  /** アクティブ状態 */
  is_active: boolean;
  
  /** 最終ログイン日時（login_historyテーブルのMAX(login_at)、ログイン成功のみ） */
  last_login_at?: Date | null;
  
  /** 作成日時 */
  create_at: Date;
  
  /** 更新日時 */
  update_at: Date;

  /** 所属組織グループCD一覧（多対多） */
  organization_group_cds: string[];
}

/**
 * maiml_event_logテーブルの型定義
 * 
 * @remarks
 * この型は maiml_event_log テーブルのスキーマに対応しています。
 * DDL: docs/design/db/ddl/maiml_event_log.sql
 * 主キー: (organization_id, project_id, sequence_no)
 */
export interface MaimlEventLog {
  /** 組織ID（主キー） */
  organization_id: string;

  /** プロジェクトID（主キー） */
  project_id: string;

  /** シーケンス番号（主キー、自動採番） */
  sequence_no: number;

  /** ログ（JSONB形式） */
  log?: Record<string, any> | null;

  /** 作成者ユーザID */
  create_user_id?: string;

  /** 更新者ユーザID */
  update_user_id?: string;

  /** 作成日時 */
  create_at?: Date;

  /** 更新日時 */
  update_at?: Date;
}

// ============================================================
// Repository メソッド戻り値型定義（progressService移行分）
// ============================================================

/**
 * findWithOwnerAndOrgGroup クエリの戻り値型
 *
 * @remarks
 * SQL: projects/findWithOwnerAndDept.sql
 * Repository: projectRepository.findWithOwnerAndOrgGroup()
 */
export interface ProjectWithOwnerAndOrgGroup {
  organization_id: string;
  project_id: string;
  project_name: string;
  description: string | null;
  organization_group_cd: string | null;
  organization_group_name: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  project_status: number;
  checkout_status: number | null;
  create_at: Date;
  update_at: Date;
}

/**
 * findForUpdate クエリの戻り値型（SELECT FOR UPDATE）
 *
 * @remarks
 * SQL: projects/findForUpdate.sql
 * Repository: projectRepository.findForUpdate()
 */
export interface ProjectForUpdate {
  project_id: string;
  project_name: string;
  project_status: number;
  project_maiml_flg: boolean;
  checkout_status: number;
  owner_user_id: string;
}

/**
 * findWithOwner クエリの戻り値型
 *
 * @remarks
 * SQL: projects/findWithOwner.sql
 * Repository: projectRepository.findWithOwner()
 */
export interface ProjectWithOwner {
  project_id: string;
  project_name: string;
  checkout_status: number;
  owner_user_id: string;
  owner_user_name: string | null;
}

/**
 * findByProjectId クエリの戻り値型
 *
 * @remarks
 * SQL: project_tasks/findByProjectId.sql
 * Repository: projectTaskRepository.findByProjectId()
 */
export interface ProjectTaskRow {
  organization_id: string;
  project_id: string;
  method_id: string;
  experiment_order: number;
  experiment_condition: number | null;
  attempts_count: number | null;
  create_at: Date;
  update_at: Date;
}

/**
 * findTaskDetailsByMethodId クエリの戻り値型
 *
 * @remarks
 * SQL: project_tasks/findTaskDetailsByMethodId.sql
 * Repository: projectTaskDetailRepository.findByMethodId()
 */
export interface ProjectTaskDetailByMethod {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  task_status: number | null;
  experiment_start_at: Date | null;
  experiment_end_at: Date | null;
  experiment_user_id: string | null;
  create_at: Date;
  update_at: Date;
}

/**
 * findByTask クエリの戻り値型
 *
 * @remarks
 * SQL: transition_data/findByTask.sql
 * Repository: transitionDataRepository.findByTask()
 */
export interface TransitionProgressRow {
  transition_id: string;
  status: number;
  progress_rate: number;
  update_user_id: string | null;
  worker_name: string | null;
  create_at: Date;
  update_at: Date;
}

/**
 * findByTransitionIdForUpdate クエリの戻り値型
 *
 * @remarks
 * SQL: transition_data/findByTransitionId.sql
 * Repository: transitionDataRepository.findByTransitionIdForUpdate()
 */
export interface TransitionForUpdate {
  method_id: string;
  task_no: number;
  status: number;
}

/**
 * countActualByPlaceIds クエリの戻り値型
 *
 * @remarks
 * SQL: template_data/countActualByPlaceIds.sql
 * Repository: templateDataRepository.countActualByPlaceIds()
 */
export interface TemplateActualCount {
  template_type: string;
  count: string;
}

/**
 * User検索フィルター型定義
 */
export interface UserSearchFilters {
  /** 検索キーワード（ユーザー名、メールアドレス） */
  search?: string;
  
  /** アクティブ状態フィルター */
  isActive?: boolean;
  
  /** ロールCDフィルター */
  roleCd?: string;
  
  /** ソートキー */
  sortBy?: 'user_id' | 'user_name' | 'update_at';
  
  /** ソート順 */
  sortOrder?: 'asc' | 'desc';
}

// ─────────────────────────────────────────────────────────
// experiment_plan テーブル
// ─────────────────────────────────────────────────────────

/**
 * Transition単位の実験計画値
 *
 * @remarks
 * planned_values の各 transitionId キー配下の型。
 * - `[templateId]` キーのテンプレート想定値（fieldKey → value）
 *
 * 予約キー（トランジションIDとして使用しないキー）:
 * - `__task__`       : タスク共通データ（creatorRefs / instrumentRefs / ownerRefs）
 * - `__uncertainty__`: 不確かさ付与情報（TemplateInputPanel の AssignPayload[]）
 * - `__meta__`       : トランジション実行順序情報（transitionOrder）
 */
export interface TransitionPlanValues {
  /** テンプレート想定値（templateId → { fieldKey: value }） */
  [templateId: string]: string[] | string | Record<string, string> | undefined;
}

/**
 * experiment_plan テーブルの planned_values JSONB 型
 *
 * @remarks
 * { [transitionId]: TransitionPlanValues } 形式
 */
export type ExperimentPlanValues = Record<string, TransitionPlanValues>;

// ─────────────────────────────────────────────────────────
// namespace / prefix テーブル
// ─────────────────────────────────────────────────────────

/**
 * updatePrefix.sql クエリの戻り値型
 *
 * @remarks
 * SQL: namespace_terms/updatePrefix.sql
 * Repository: namespaceTermRepository.updateNamespace()
 * namespace テーブルの uri / scope_key と prefix テーブルの prefix を
 * JOIN して返す RETURNING 結果に対応する型。
 * DDL: docs/design/db/ddl/namespace.sql, docs/design/db/ddl/prefix.sql
 */
export interface UpdatePrefixRow {
  /** 名前空間ID（namespace.namespace_id） */
  namespace_id: string;
  /** プレフィックス文字列（prefix.prefix） */
  prefix: string;
  /** 名前空間URI（namespace.uri） */
  uri: string;
  /** スコープキー（namespace.scope_key）。グローバル用語の場合は null */
  scope_key: string | null;
}

/**
 * experiment_plan テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260618_004_add_experiment_plan.sql
 * 主キー: (organization_id, project_id, method_id, task_no)
 * task_no は 1〜N（project_task_detail.task_no と対応）
 */
export interface ExperimentPlan {
  /** 組織ID（主キー） */
  organization_id: string;
  /** プロジェクトID（主キー） */
  project_id: string;
  /** MAIMLのMethodID（主キー） */
  method_id: string;
  /** タスク連番（主キー、1〜N） */
  task_no: number;
  /** 実験計画データ（Transition単位） */
  planned_values?: ExperimentPlanValues;
  /** 作成者ユーザID */
  create_user_id?: string;
  /** 作成日時 */
  create_at?: Date;
  /** 更新者ユーザID */
  update_user_id?: string;
  /** 更新日時 */
  update_at?: Date;
}

