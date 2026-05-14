/**
 * 部署管理画面の設定定義
 */

/**
 * 部署管理設定
 */
export interface DepartmentConfig {
  /** 表示名 */
  displayName: string;
  /** APIエンドポイント（ベースURL） */
  apiEndpoint: string;
  /** CSVアップロード対応 */
  supportsCsvUpload: boolean;
  /** CSVダウンロード対応 */
  supportsCsvDownload: boolean;
}

/**
 * 部署管理の設定定義
 */
export const DEPARTMENT_CONFIG: DepartmentConfig = {
  displayName: '部署管理',
  apiEndpoint: '/systemManagement/department',
  supportsCsvUpload: true,
  supportsCsvDownload: true
};

/**
 * 部署管理設定を取得
 */
export function getDepartmentConfig(): DepartmentConfig {
  return DEPARTMENT_CONFIG;
}

/**
 * 部署データの型（インデックスシグネチャ付き）
 * 移動元: services/departmentApiService.ts
 */
export interface DepartmentRecord {
  organization_id: string; // UUID
  department_cd: string;
  department_name: string;
  is_active: boolean;
  create_user_id: string;
  update_user_id: string;
  create_at: Date;
  update_at: Date;

  // 動的プロパティアクセス用のインデックスシグネチャ
  [key: string]: unknown;
}

/**
 * 部署UIレコード型（DepartmentManagement.tsx 用・camelCase）
 */
export interface DepartmentUIRecord {
  departmentId: string;
  displayName: string;
  updatedAt?: string;
  isActive: boolean;
}

/**
 * 部署データの汎用型エイリアス
 * 移動元: services/departmentApiService.ts
 */
export type MasterRecord = DepartmentRecord;

/**
 * 部署新規作成 API リクエストの型（camelCase）
 * バックエンドの departmentRoutes.ts バリデーション（body('departmentCd') 等）に合わせた型定義
 */
export interface CreateDepartmentRequest {
  departmentCd: string;
  departmentName: string;
  isActive?: boolean;
}

/**
 * CSV一括操作の結果型
 * 移動元: services/departmentApiService.ts（CsvUploadResult）
 */
export interface CsvUploadResult {
  successCount: number;
  failureCount: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}
