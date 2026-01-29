/**
 * マスタ管理画面の設定定義
 * 
 * 各マスタの設定を一元管理することで、冗長な処理を削減し、
 * 保守性と拡張性を向上させます。
 */

/**
 * マスタタイプの列挙
 */
export type MasterType = 
  | 'department'      // 部署マスタ
  | 'role'            // ロールマスタ
  | 'instrument'      // 実験装置マスタ
  | 'vendor'          // ベンダーマスタ
  | 'creator';        // Creatorマスタ

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
 * マスタ設定
 */
export interface MasterConfig {
  /** マスタID */
  masterId: string;
  /** マスタタイプ */
  type: MasterType;
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
 * 全マスタの設定定義
 */
export const MASTER_CONFIGS: Record<MasterType, MasterConfig> = {
  /**
   * 部署マスタ
   */
  department: {
    masterId: '2',
    type: 'department',
    displayName: '部署マスタ',
    apiEndpoint: '/api/v1/master/department',
    primaryKeyField: 'departmentId',
    supportsCsvUpload: true,
    supportsCsvDownload: true,
    fields: [
      {
        dbField: 'departmentId',
        displayName: '部署ID',
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
  },

  /**
   * ロールマスタ
   */
  role: {
    masterId: '4',
    type: 'role',
    displayName: 'ロールマスタ',
    apiEndpoint: '/api/v1/master/role',
    primaryKeyField: 'role',
    supportsCsvUpload: false,
    supportsCsvDownload: true,
    fields: [
      {
        dbField: 'role',
        displayName: 'ロールID',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: false,
        width: 150,
        align: 'left',
      },
      {
        dbField: 'roleName',
        displayName: 'ロール名',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 170,
        align: 'left',
      },
      {
        dbField: 'functionId',
        displayName: '機能ID',
        searchFixed: false,
        isDisplay: true,
        addable: false,
        update: false,
        width: 460,
        align: 'left',
      },
      {
        dbField: 'functionName',
        displayName: '機能名',
        searchFixed: false,
        isDisplay: true,
        addable: false,
        update: false,
        width: 500,
        align: 'left',
      },
      {
        dbField: 'functionWritePermissions',
        displayName: '書込可能機能ID',
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
        displayName: '更新日時',
        searchFixed: false,
        isDisplay: true,
        addable: false,
        update: false,
        width: 150,
        align: 'right',
      },
    ],
  },

  /**
   * 実験装置マスタ
   */
  instrument: {
    masterId: '5',
    type: 'instrument',
    displayName: 'Instrument',
    apiEndpoint: '/api/v1/master/instrument',
    primaryKeyField: 'instrumentId',
    supportsCsvUpload: true,
    supportsCsvDownload: true,
    fields: [
      {
        dbField: 'instrumentId',
        displayName: 'ID',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: false,
        width: 150,
        align: 'left',
      },
      {
        dbField: 'instrumentName',
        displayName: '名称',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 180,
        align: 'left',
      },
      {
        dbField: 'instrumentDescription',
        displayName: '説明',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 420,
        align: 'left',
      },
      {
        dbField: 'instrumentAnnotation',
        displayName: '注釈',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 420,
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
        isDisplay: false,
        addable: false,
        update: false,
        width: 150,
        align: 'right',
      },
    ],
  },

  /**
   * ベンダーマスタ
   */
  vendor: {
    masterId: '7',
    type: 'vendor',
    displayName: 'Vendor',
    apiEndpoint: '/api/v1/master/vendor',
    primaryKeyField: 'vendorId',
    supportsCsvUpload: true,
    supportsCsvDownload: true,
    fields: [
      {
        dbField: 'vendorId',
        displayName: 'ID',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: false,
        width: 150,
        align: 'left',
      },
      {
        dbField: 'vendorName',
        displayName: '名称',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 180,
        align: 'left',
      },
      {
        dbField: 'vendorDescription',
        displayName: '説明',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 420,
        align: 'left',
      },
      {
        dbField: 'vendorAnnotation',
        displayName: '注釈',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 420,
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
        isDisplay: false,
        addable: false,
        update: false,
        width: 150,
        align: 'right',
      },
    ],
  },

  /**
   * Creatorマスタ
   */
  creator: {
    masterId: '8',
    type: 'creator',
    displayName: 'Creator',
    apiEndpoint: '/api/v1/master/creator',
    primaryKeyField: 'creatorId',
    supportsCsvUpload: true,
    supportsCsvDownload: true,
    fields: [
      {
        dbField: 'creatorId',
        displayName: 'ID',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: false,
        width: 150,
        align: 'left',
      },
      {
        dbField: 'creatorName',
        displayName: '名称',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 180,
        align: 'left',
      },
      {
        dbField: 'creatorDescription',
        displayName: '説明',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 420,
        align: 'left',
      },
      {
        dbField: 'creatorAnnotation',
        displayName: '注釈',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 420,
        align: 'left',
      },
      {
        dbField: 'vendorName',
        displayName: 'Vendor名称',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 180,
        align: 'left',
      },
      {
        dbField: 'instrumentName',
        displayName: 'Instrument名称',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 180,
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
        isDisplay: false,
        addable: false,
        update: false,
        width: 150,
        align: 'right',
      },
    ],
  },
};

/**
 * マスタIDからマスタ設定を取得
 */
export function getMasterConfigById(masterId: string): MasterConfig | undefined {
  return Object.values(MASTER_CONFIGS).find(config => config.masterId === masterId);
}

/**
 * マスタタイプからマスタ設定を取得
 */
export function getMasterConfigByType(type: MasterType): MasterConfig {
  return MASTER_CONFIGS[type];
}

/**
 * 全てのマスタ設定を取得
 */
export function getAllMasterConfigs(): MasterConfig[] {
  return Object.values(MASTER_CONFIGS);
}
