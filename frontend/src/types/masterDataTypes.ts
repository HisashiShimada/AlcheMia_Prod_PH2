/**
 * マスタ管理画面の設定定義（Vendor、Creator、Instrument）
 */

/**
 * マスタデータアイテムの型定義
 * （apiClient.ts の fetchCreators / fetchVendors の戻り値で使用）
 */
export interface MasterDataItem {
  id: string;
  uuid?: string;
  name: string;
  description?: string;
  annotation?: string;
}

/**
 * マスタデータレスポンスの型定義
 * （apiClient.ts の fetchCreators / fetchVendors の戻り値で使用）
 */
export interface MasterDataResponse {
  success: boolean;
  data: {
    items: MasterDataItem[];
  };
}


/**
 * マスタデータタイプの列挙
 */
// ---------------------------------------------------------------------------
// masterApiService から移動した型
// ---------------------------------------------------------------------------

/**
 * マスタレコードの共通フィールド
 */
export interface BaseMasterRecord {
  organizationId: string;
  corporationId: string;
  isActive: boolean;
  createUserId: string;
  updateUserId: string;
  createdAt: string;
  updatedAt: string;
  /** 動的プロパティアクセス用（MasterManagement等でキー名を動的に参照するため） */
  [key: string]: unknown;
}

/**
 * 作成者レコード
 */
export interface CreatorRecord extends BaseMasterRecord {
  creatorId: string;
  creatorUuid: string;
  creatorName: string;
  creatorDescription: string;
  creatorAnnotation: string;
  vendorName?: string;
  instrumentName?: string;
  vendorIsActive?: boolean;
  instrumentIsActive?: boolean;
}

/**
 * 機器レコード
 */
export interface InstrumentRecord extends BaseMasterRecord {
  instrumentId: string;
  instrumentUuid: string;
  instrumentName: string;
  instrumentDescription: string;
  instrumentAnnotation: string;
}

/**
 * ベンダーレコード
 */
export interface VendorRecord extends BaseMasterRecord {
  vendorId: string;
  vendorUuid: string;
  vendorName: string;
  vendorDescription: string;
  vendorAnnotation: string;
}

/**
 * 属性レコード
 */
export interface AttributeRecord extends BaseMasterRecord {
  attributeName: string;
  attributeValue: string;
  attributeRemark?: string;
  departmentCd: string;
  departmentName: string;
}

/**
 * マスタレコードのユニオン型
 */
export type MasterApiRecord = CreatorRecord | InstrumentRecord | VendorRecord | AttributeRecord;
/** MasterApiRecord の後方互換エイリアス */
export type MasterRecord = MasterApiRecord;

export type MasterDataType =
  | 'instrument'      // Instrumentマスタ
  | 'vendor'          // Vendorマスタ
  | 'creator'         // Creatorマスタ
  | 'attribute';      // Attributeマスタ

/**
 * フィールド定義
 */
export interface FieldConfig {
  /** データベースのフィールド名 */
  dbField: string;
  /** 表示名 */
  displayName: string;
  /** 翻訳キー（多言語化対応） */
  i18nKey?: string;
  /** 検索固定フィルターとして使用するか */
  searchFixed: boolean;
  /** 一覧に表示するか */
  isDisplay: boolean;
  /** 新規追加時に入力可能か */
  addable: boolean;
  /** 編集時に変更可能か */
  update: boolean;
  /** 入力必須か（省略時は addable が true のフィールドは必須扱い） */
  required?: boolean;
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
   * Attributeマスタ
   */
  attribute: {
    masterId: '4',
    type: 'attribute',
    displayName: 'Attribute',
    apiEndpoint: '/master/attribute',
    supportsCsvUpload: true,
    supportsCsvDownload: true,
    fields: [
      {
        dbField: 'attributeName',
        displayName: '属性名',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 180,
        align: 'left',
      },
      {
        dbField: 'attributeValue',
        displayName: '属性値',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        width: 250,
        align: 'left',
      },
      {
        dbField: 'attributeRemark',
        displayName: '属性_備考',
        searchFixed: false,
        isDisplay: true,
        addable: true,
        update: true,
        required: false,
        width: 350,
        align: 'left',
      },
      {
        dbField: 'departmentName',
        displayName: '部署名',
        searchFixed: true,
        isDisplay: true,
        addable: true,
        update: true,
        required: false,
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
        i18nKey: 'masterManagement.fields.id',
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
        i18nKey: 'masterManagement.fields.name',
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
        i18nKey: 'masterManagement.fields.description',
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
        i18nKey: 'masterManagement.fields.annotation',
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
        i18nKey: 'masterManagement.fields.id',
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
        i18nKey: 'masterManagement.fields.name',
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
        i18nKey: 'masterManagement.fields.description',
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
        i18nKey: 'masterManagement.fields.annotation',
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
        i18nKey: 'masterManagement.fields.id',
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
        i18nKey: 'masterManagement.fields.name',
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
        i18nKey: 'masterManagement.fields.description',
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
        i18nKey: 'masterManagement.fields.annotation',
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
        i18nKey: 'masterManagement.fields.vendorName',
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
        i18nKey: 'masterManagement.fields.instrumentName',
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

/**
 * CSVバリデーションエラーの型定義
 * （MasterManagement.tsx より移動）
 */
export interface CsvValidationError {
  row: number;
  field: string;
  message: string;
}

/**
 * 項目カテゴリの型定義
 * （MasterManagement.tsx より移動）
 */
export interface MasterItemCategory {
  headerName: string;
  searchFixed: boolean;
  isDisplay: boolean;
  addable: boolean;
  update: boolean;
  required?: boolean;
}
