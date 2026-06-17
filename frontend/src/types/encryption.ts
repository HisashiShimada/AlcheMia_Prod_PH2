/**
 * 暗号化機能の型定義
 *
 * @remarks
 * MAIMLスキーマの暗号化仕様（W3C XML Encryption）に対応した型定義
 * 参照: docs/design/maiml/encrypted_data_summary.md
 */

// ---------------------------------------------------------------------------
// 暗号化アルゴリズム
// ---------------------------------------------------------------------------

/** 対応暗号化アルゴリズム */
export const EncryptionAlgorithm = {
  AES_256_CBC: 'aes256-cbc',
  AES_192_CBC: 'aes192-cbc',
  AES_128_CBC: 'aes128-cbc',
  AES_256_GCM: 'aes256-gcm',
  AES_128_GCM: 'aes128-gcm',
  TRIPLE_DES_CBC: 'tripledes-cbc',
  RSA_OAEP: 'rsa-oaep-mgf1p',
} as const;

export type EncryptionAlgorithmType = (typeof EncryptionAlgorithm)[keyof typeof EncryptionAlgorithm];

/** アルゴリズムの表示ラベルマップ */
export const EncryptionAlgorithmLabel: Record<EncryptionAlgorithmType, string> = {
  'aes256-cbc': 'AES-256-CBC（推奨）',
  'aes192-cbc': 'AES-192-CBC',
  'aes128-cbc': 'AES-128-CBC',
  'aes256-gcm': 'AES-256-GCM',
  'aes128-gcm': 'AES-128-GCM',
  'tripledes-cbc': 'Triple DES-CBC',
  'rsa-oaep-mgf1p': 'RSA-OAEP',
};

/** アルゴリズムのW3C URI マップ */
export const EncryptionAlgorithmUri: Record<EncryptionAlgorithmType, string> = {
  'aes256-cbc': 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
  'aes192-cbc': 'http://www.w3.org/2001/04/xmlenc#aes192-cbc',
  'aes128-cbc': 'http://www.w3.org/2001/04/xmlenc#aes128-cbc',
  'aes256-gcm': 'http://www.w3.org/2001/04/xmlenc#aes256-gcm',
  'aes128-gcm': 'http://www.w3.org/2001/04/xmlenc#aes128-gcm',
  'tripledes-cbc': 'http://www.w3.org/2001/04/xmlenc#tripledes-cbc',
  'rsa-oaep-mgf1p': 'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p',
};

// ---------------------------------------------------------------------------
// 暗号化スコープ
// ---------------------------------------------------------------------------

/** 暗号化の適用範囲 */
export const EncryptionScope = {
  ELEMENT: 'element',   // 要素全体（タグも含む）
  CONTENT: 'content',  // 内容のみ
} as const;

export type EncryptionScopeType = (typeof EncryptionScope)[keyof typeof EncryptionScope];

// ---------------------------------------------------------------------------
// 鍵管理方式
// ---------------------------------------------------------------------------

/** 鍵の指定方法 */
export const KeyMethod = {
  KEY_NAME: 'keyName',   // 既存の鍵名を参照
  PBKDF2: 'pbkdf2',     // パスワードから鍵を導出
  X509: 'x509',         // X.509証明書
} as const;

export type KeyMethodType = (typeof KeyMethod)[keyof typeof KeyMethod];

// ---------------------------------------------------------------------------
// 暗号化鍵
// ---------------------------------------------------------------------------

/** 暗号化鍵情報 */
export interface EncryptionKey {
  /** 鍵の一意ID */
  keyId: string;
  /** 鍵の識別名（ds:KeyName に使用） */
  keyName: string;
  /** 使用アルゴリズム */
  algorithm: EncryptionAlgorithmType;
  /** 鍵長（ビット） */
  keySize: number;
  /** 作成日時 */
  createdAt: string;
  /** 有効期限 */
  expiresAt: string | null;
  /** 作成者 */
  createdBy: string;
  /** 使用回数 */
  usageCount: number;
  /** 最終使用日時 */
  lastUsedAt: string | null;
  /** 説明 */
  description?: string;
  /** 有効フラグ */
  isActive: boolean;
}

/** 鍵作成リクエスト */
export interface CreateKeyRequest {
  keyName: string;
  algorithm: EncryptionAlgorithmType;
  expiresAt?: string;
  description?: string;
  generationMethod: 'auto' | 'pbkdf2';
  password?: string;
}

// ---------------------------------------------------------------------------
// MAIMLノード構造
// ---------------------------------------------------------------------------

/** MAIMLノードの種別 */
export const MaimlNodeType = {
  DOCUMENT: 'document',
  PNML: 'pnml',
  METHOD: 'method',
  PLACE: 'place',
  TRANSITION: 'transition',
  ARC: 'arc',
  PROPERTY: 'property',
  RESULTS: 'results',
  MATERIAL: 'material',
  CONDITION: 'condition',
  RESULT: 'result',
} as const;

export type MaimlNodeTypeValue = (typeof MaimlNodeType)[keyof typeof MaimlNodeType];

/** MAIMLのプレース種別（Materialなど） */
export const PlaceType = {
  MATERIAL: 'Material',
  CONDITION: 'Condition',
  RESULT: 'Result',
} as const;

export type PlaceTypeValue = (typeof PlaceType)[keyof typeof PlaceType];

/** MAIMLツリーノード */
export interface MaimlTreeNode {
  /** XPathパス（ツリーのkey） */
  path: string;
  /** タグ名 */
  tagName: MaimlNodeTypeValue | string;
  /** id属性 */
  id?: string;
  /** key属性（property要素用） */
  key?: string;
  /** プレース種別（place要素用） */
  placeType?: PlaceTypeValue;
  /** 表示ラベル */
  label?: string;
  /** 既に暗号化済みか */
  isEncrypted: boolean;
  /**
   * 暗号化可能かどうか（MAIML仕様に基づく）
   *
   * @remarks
   * - true: チェックボックスで選択可能
   * - false: グレーアウト（disabled + 灰色テキスト）
   *
   * 暗号化可能な要素:
   *   - globalObjectContentGroup を持つ型（document, creator, vendor, owner, instrument,
   *     protocol, method, pnml, program, instruction,
   *     materialTemplate, conditionTemplate, resultTemplate,
   *     data, results, material, condition, result, etc.）
   *   - property / content 要素（全派生型）
   *
   * 暗号化不可な要素（グレーアウト）:
   *   - uuid, name, description, annotation, insertion, date（メタデータ）
   *   - place, transition, arc（Petri Net構造要素・案A）
   *   - vendorRef その他
   */
  isEncryptable: boolean;
  /** 暗号化方式情報（暗号化済みの場合） */
  encryptionInfo?: EncryptedNodeInfo;
  /** 子ノード */
  children?: MaimlTreeNode[];
}

/** 暗号化済みノードの情報 */
export interface EncryptedNodeInfo {
  /** 使用アルゴリズムURI */
  algorithmUri: string;
  /** 鍵名 */
  keyName?: string;
  /** 暗号化ID */
  encryptionId?: string;
  /** 暗号化日時 */
  encryptedAt?: string;
}

// ---------------------------------------------------------------------------
// 暗号化設定
// ---------------------------------------------------------------------------

/** 子要素保持設定 */
export interface ChildInfoConfig {
  /** childUri（子要素のURI）を保持するか */
  childUri: boolean;
  /** childHash（ハッシュ値）を保持するか */
  childHash: boolean;
  /** childUuid（UUID）を保持するか */
  childUuid: boolean;
}

/** 暗号化プロパティ設定 */
export interface EncryptionPropertiesConfig {
  /** 暗号化日時を記録するか */
  recordTimestamp: boolean;
  /** 暗号化者を記録するか */
  recordEncryptor: boolean;
}

/** PBKDF2 設定 */
export interface Pbkdf2Config {
  /** パスワード */
  password: string;
  /** ソルト（自動生成） */
  salt?: string;
  /** 繰り返し回数 */
  iterationCount: number;
}

/** 暗号化設定 */
export interface EncryptionConfig {
  /** 暗号化アルゴリズム */
  algorithm: EncryptionAlgorithmType;
  /** 鍵指定方式 */
  keyMethod: KeyMethodType;
  /** 鍵名（keyMethod=keyName の場合） */
  keyName?: string;
  /** PBKDF2設定（keyMethod=pbkdf2 の場合） */
  pbkdf2Config?: Pbkdf2Config;
  /** 暗号化スコープ */
  encryptionScope: EncryptionScopeType;
  /** 子要素保持設定 */
  preserveChildInfo: ChildInfoConfig;
  /** 暗号化プロパティ設定 */
  encryptionProperties: EncryptionPropertiesConfig;
}

/** デフォルト暗号化設定 */
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: EncryptionAlgorithm.AES_256_CBC,
  keyMethod: KeyMethod.KEY_NAME,
  keyName: undefined,
  encryptionScope: EncryptionScope.ELEMENT,
  preserveChildInfo: {
    childUri: true,
    childHash: true,
    childUuid: true,
  },
  encryptionProperties: {
    recordTimestamp: true,
    recordEncryptor: false,
  },
};

// ---------------------------------------------------------------------------
// 暗号化操作リクエスト/レスポンス
// ---------------------------------------------------------------------------

/** MAIMLパースリクエスト（暗号化用） */
export interface ParseMaimlRequest {
  projectName: string;
  filePath?: string;
}

/** MAIMLパースレスポンス */
export interface ParseMaimlResponse {
  structure: MaimlTreeNode[];
}

/** 暗号化プレビューリクエスト */
export interface EncryptionPreviewRequest {
  originalXml: string;
  config: EncryptionConfig;
}

/** 暗号化プレビューレスポンス */
export interface EncryptionPreviewResponse {
  beforeXml: string;
  afterXml: string;
  algorithmUri: string;
  estimatedSize?: number;
}

/** 暗号化実行リクエスト */
export interface EncryptRequest {
  projectName: string;
  filePath: string;
  targetPath: string;
  config: EncryptionConfig;
}

/** 暗号化実行レスポンス */
export interface EncryptResponse {
  success: boolean;
  updatedFilePath?: string;
  backupFilePath?: string;
}

/** 復号化リクエスト */
export interface DecryptRequest {
  projectName: string;
  filePath: string;
  targetPath: string;
  decryptionKey: {
    method: KeyMethodType;
    keyName?: string;
    password?: string;
  };
}

/** 復号化レスポンス */
export interface DecryptResponse {
  success: boolean;
  decryptedXml?: string;
}
