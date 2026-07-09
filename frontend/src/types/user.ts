/**
 * ユーザー管理関連の型定義
 * 移動元: services/userApiService.ts
 */

/**
 * ユーザーデータの型（4テーブルJOIN）
 * バックエンドからcamelCaseで返却されるため、フロントエンド側もcamelCaseで定義
 */
export interface UserRecord {
  userId: string; // メールアドレス（主キー）
  userName: string;
  mailAddress: string;
  departmentCd?: string;
  departmentName?: string; // JOINで取得
  roleCd: string;
  roleName?: string; // JOINで取得
  isActive: boolean;
  createUserId?: string;
  updateUserId?: string;
  createAt?: Date;
  updateAt?: Date;

  // 動的プロパティアクセス用のインデックスシグネチャ
  [key: string]: unknown;
}

/**
 * ユーザー作成リクエストの型（パスワード含む）
 */
export interface CreateUserRequest {
  userId: string; // メールアドレス
  userName: string;
  mailAddress: string;
  departmentCd?: string;
  roleCd: string;
  isActive?: boolean;
  password?: string; // パスワード（オプション）
  namespacePrefix?: string; // 名前空間Prefix（オプション）
  namespaceUri?: string; // 名前空間URI（オプション）
}

/**
 * ユーザー更新リクエストの型（パスワード不要）
 */
export interface UpdateUserRequest {
  userName?: string;
  departmentCd?: string;
  roleCd?: string;
  isActive?: boolean;
}

/**
 * ユーザー一覧検索フィルターの型
 */
export interface UserFilters {
  search?: string;
  is_active?: boolean;
  department_cd?: string;
  role_cd?: string;
  sort_by?: 'user_id' | 'user_name' | 'update_at';
  sort_order?: 'asc' | 'desc';
}
