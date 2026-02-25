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
