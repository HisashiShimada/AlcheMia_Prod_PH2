/**
 * 部署管理画面の設定定義
 */

/**
 * フィールド定義
 */
export interface FieldConfig {
  /** データベースのフィールド名 */
  dbField: string;
  /** 表示名 */
  displayName: string;
  /** 検索固定フィルターとして使用するか */
  searchFixed: boolean;
  /** 一覧に表示するか */
  isDisplay: boolean;
  /** 新規追加時に入力可能か */
  addable: boolean;
  /** 編集時に変更可能か */
  update: boolean;
  /** 列幅（ピクセル） */
  width?: number;
  /** 列の配置 */
  align?: 'left' | 'center' | 'right';
}

/**
 * 部署管理設定
 */
export interface DepartmentConfig {
  /** マスタID */
  masterId: string;
  /** 表示名 */
  displayName: string;
  /** APIエンドポイント（ベースURL） */
  apiEndpoint: string;
  /** フィールド設定 */
  fields: FieldConfig[];
  /** 主キーフィールド名 */
  primaryKeyField: string;
  /** CSVアップロード対応 */
  supportsCsvUpload: boolean;
  /** CSVダウンロード対応 */
  supportsCsvDownload: boolean;
}

/**
 * 部署管理の設定定義
 */
export const DEPARTMENT_CONFIG: DepartmentConfig = {
  masterId: '2',
  displayName: '部署管理',
  apiEndpoint: '/systemManagement/department',
  primaryKeyField: 'departmentId',
  supportsCsvUpload: true,
  supportsCsvDownload: true,
  fields: [
    {
      dbField: 'departmentCD',
      displayName: '部署CD',
      searchFixed: false,
      isDisplay: true,
      addable: true,
      update: false,
      width: 150,
      align: 'left',
    },
    {
      dbField: 'displayName',
      displayName: '部署名',
      searchFixed: false,
      isDisplay: true,
      addable: true,
      update: true,
      width: 200,
      align: 'left',
    },
    {
      dbField: 'isActive',
      displayName: 'ステータス',
      searchFixed: false,
      isDisplay: false,
      addable: true,
      update: true,
    },
    {
      dbField: 'updatedAt',
      displayName: '更新日時',
      searchFixed: false,
      isDisplay: true,
      addable: false,
      update: false,
      width: 150,
      align: 'right',
    },
  ],
};

/**
 * 部署管理設定を取得
 */
export function getDepartmentConfig(): DepartmentConfig {
  return DEPARTMENT_CONFIG;
}