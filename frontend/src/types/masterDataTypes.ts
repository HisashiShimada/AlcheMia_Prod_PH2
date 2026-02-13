/**
 * マスタ管理画面の設定定義（Vendor、Creator、Instrument）
 */

/**
 * マスタデータタイプの列挙
 */
export type MasterDataType = 
  | 'instrument'      // Instrumentマスタ
  | 'vendor'          // Vendorマスタ
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
 * マスタデータ設定
 */
export interface MasterDataConfig {
  /** マスタID */
  masterId: string;
  /** マスタタイプ */
  type: MasterDataType;
  /** 表示名 */
  displayName: string;
  /** APIエンドポイント（ベースURL） */
  apiEndpoint: string;
  /** フィールド設定 */
  fields: FieldConfig[];
  /** CSVアップロード対応 */
  supportsCsvUpload: boolean;
  /** CSVダウンロード対応 */
  supportsCsvDownload: boolean;
}

/**
 * 全マスタデータの設定定義
 */
export const MASTER_DATA_CONFIGS: Record<MasterDataType, MasterDataConfig> = {
  /**
   * Instrumentマスタ
   */
  instrument: {
    masterId: '3',
    type: 'instrument',
    displayName: 'Instrument',
    apiEndpoint: '/master/instrument',
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
   * Vendorマスタ
   */
  vendor: {
    masterId: '2',
    type: 'vendor',
    displayName: 'Vendor',
    apiEndpoint: '/master/vendor',
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
    masterId: '1',
    type: 'creator',
    displayName: 'Creator',
    apiEndpoint: '/master/creator',
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
 * マスタタイプからマスタ設定を取得
 */
export function getMasterDataConfig(type: MasterDataType): MasterDataConfig {
  return MASTER_DATA_CONFIGS[type];
}

/**
 * 全てのマスタデータ設定を取得
 */
export function getAllMasterDataConfigs(): MasterDataConfig[] {
  return Object.values(MASTER_DATA_CONFIGS);
}