/**
 * ロール管理画面の設定定義
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
 * ロール管理設定
 */
export interface RoleConfig {
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
 * ロール管理の設定定義
 */
export const ROLE_CONFIG: RoleConfig = {
  masterId: '4',
  displayName: 'ロール管理',
  apiEndpoint: '/systemManagement/role',
  primaryKeyField: 'role',
  supportsCsvUpload: true,
  supportsCsvDownload: true,
  fields: [
    {
      dbField: 'role',
      displayName: 'roleManagement.columns.roleCd',
      searchFixed: false,
      isDisplay: true,
      addable: true,
      update: false,
      width: 150,
      align: 'left',
    },
    {
      dbField: 'roleName',
      displayName: 'roleManagement.columns.roleName',
      searchFixed: false,
      isDisplay: true,
      addable: true,
      update: true,
      width: 170,
      align: 'left',
    },
    {
      dbField: 'functionId',
      displayName: '機能CD',
      searchFixed: false,
      isDisplay: true,
      addable: false,
      update: false,
      width: 460,
      align: 'left',
    },
    {
      dbField: 'functionName',
      displayName: 'roleManagement.columns.functionName',
      searchFixed: false,
      isDisplay: true,
      addable: false,
      update: false,
      width: 500,
      align: 'left',
    },
    {
      dbField: 'initialScreenFunctionName',
      displayName: 'roleManagement.columns.initialScreenFunctionName',
      searchFixed: false,
      isDisplay: true,
      addable: false,
      update: false,
      width: 200,
      align: 'left',
    },
    {
      dbField: 'functionWritePermissions',
      displayName: '書込可能機能CD',
      searchFixed: false,
      isDisplay: false,
      addable: false,
      update: false,
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
      displayName: 'roleManagement.columns.updatedAt',
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
 * ロールマスタ設定を取得
 */
export function getRoleConfig(): RoleConfig {
  return ROLE_CONFIG;
}