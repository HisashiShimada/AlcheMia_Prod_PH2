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
  
  /** 部署CD */
  department_cd?: string;
  
  /** 所有者ユーザID */
  owner_user_id?: string;
  
  /** プロジェクトステータス（数値、2桁） */
  project_status?: number;
  
  /** プロジェクトMaiml有無（false: ファイルなし、true: ファイルあり） */
  project_maiml_flg?: boolean;
  
  /** チェックアウトステータス（数値、2桁） */
  checkout_status?: number;
  
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
  
  /** 指示対象: 1=ファイル全体、2=タスク、3=トランジション */
  instruction_target?: number | null;
  
  /** 優先度 */
  priority?: number | null;
  
  /** タイプ */
  type?: number | null;
  
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
 * 主キー: (organization_id, project_id, method_id)
 */
export interface ProjectTask {
  /** 組織ID（主キー） */
  organization_id: string;
  
  /** プロジェクトID（主キー） */
  project_id: string;
  
  /** メソッドID（主キー） */
  method_id: string;
  
  /** 実験順序 */
  experiment_order?: number | null;
  
  /** 実験条件 */
  experiment_condition?: number | null;
  
  /** 試行回数 */
  attempts_count?: number | null;
  
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
 * この型は organization_user テーブルと関連テーブル（department, role）を
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
  
  /** 部署CD（外部キー） */
  department_cd: string | null;
  
  /** 部署名（JOIN結果） */
  department_name: string | null;
  
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

/**
 * User検索フィルター型定義
 */
export interface UserSearchFilters {
  /** 検索キーワード（ユーザー名、メールアドレス） */
  search?: string;
  
  /** アクティブ状態フィルター */
  isActive?: boolean;
  
  /** 部署CDフィルター */
  departmentCd?: string;
  
  /** ロールCDフィルター */
  roleCd?: string;
  
  /** ソートキー */
  sortBy?: 'user_id' | 'user_name' | 'update_at';
  
  /** ソート順 */
  sortOrder?: 'asc' | 'desc';
}
