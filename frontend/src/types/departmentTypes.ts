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