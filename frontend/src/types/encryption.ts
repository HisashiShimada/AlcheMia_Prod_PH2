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

/**
 * 選択可能なアルゴリズム一覧（UI表示順）
 * 脆弱アルゴリズムは disabled: true
 */
export const ALGORITHM_OPTIONS: {
  value: EncryptionAlgorithmType;
  label: string;
  disabled: boolean;
  weak: boolean;
}[] = [
  { value: 'aes256-cbc', label: 'AES-256-CBC（推奨）', disabled: false, weak: false },
  { value: 'aes128-cbc', label: 'AES-128-CBC',          disabled: false, weak: false },
  { value: 'aes256-gcm', label: 'AES-256-GCM',          disabled: false, weak: false },
  { value: 'aes192-cbc', label: 'AES-192-CBC（脆弱）',  disabled: true,  weak: true  },
  { value: 'tripledes-cbc', label: 'Triple DES-CBC（脆弱）', disabled: true, weak: true },
  { value: 'rsa-oaep-mgf1p', label: 'RSA-OAEP（脆弱）', disabled: true, weak: true  },
];

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
// 秘匿レベル
// ---------------------------------------------------------------------------

/**
 * 秘匿レベル
 *
 * - auto: 選択ノードに応じて自動判定（グローバル要素→L1、property/content→L2）
 * - l1:   グローバル要素全体（UUID以外を一括暗号化）
 * - l2:   汎用データコンテナのコンテンツのみ暗号化
 */
export const EncryptionLevel = {
  AUTO: 'auto',
  L1: 'l1',
  L2: 'l2',
} as const;

export type EncryptionLevelType = (typeof EncryptionLevel)[keyof typeof EncryptionLevel];

/** L1 対象となるグローバル要素タグ名一覧 */
export const GLOBAL_ELEMENT_TAGS: string[] = [
  'document', 'creator', 'vendor', 'owner', 'instrument',
  'protocol', 'method', 'pnml', 'program', 'instruction',
  'materialTemplate', 'conditionTemplate', 'resultTemplate',
  'data', 'results', 'material', 'condition', 'result',
];

// ---------------------------------------------------------------------------
// 鍵ソース
// ---------------------------------------------------------------------------

/**
 * 鍵ソース種別
 *
 * - new_key:    AES-256鍵をランダム生成（.key形式で保存）
 * - load_file:  既存キーファイルを読み込む（.key/.pem/.pfx）
 * - public_key: 受信者公開鍵（.pem/.cer）
 */
export const KeySource = {
  NEW_KEY: 'new_key',
  LOAD_FILE: 'load_file',
  PUBLIC_KEY: 'public_key',
} as const;

export type KeySourceType = (typeof KeySource)[keyof typeof KeySource];

/** 鍵ソースごとの対応ファイル拡張子 */
export const KEY_SOURCE_ACCEPT: Record<KeySourceType, string> = {
  new_key: '',           // ファイル選択なし（自動生成）
  load_file: '.key,.pem,.pfx',
  public_key: '.pem,.cer',
};

/** ロード済み鍵情報 */
export interface LoadedKeyInfo {
  /** SHA-256ハッシュの先頭16文字 */
  keyIdentifier: string;
  /** 元のファイル名 */
  fileName: string;
  /** 鍵ソース */
  source: KeySourceType;
  /** サーバー保存後のID */
  serverKeyId?: string;
}

// ---------------------------------------------------------------------------
// UPA制約チェック
// ---------------------------------------------------------------------------

/** UPA制約違反情報 */
export interface UpaViolation {
  elementPath: string;
  message: string;
  suggestedFix?: string;
}

/** UPA制約チェック結果 */
export interface UpaCheckResult {
  isValid: boolean;
  violations: UpaViolation[];
}

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
  /** 鍵のフィンガープリント（SHA-256ハッシュ先頭16文字） */
  keyIdentifier?: string;
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
// 鍵エクスポート / インポート / ローテーション
// ---------------------------------------------------------------------------

/** 鍵エクスポートリクエスト */
export interface ExportKeyRequest {
  /** エクスポート対象の鍵ID一覧 */
  keyIds: string[];
  /** パスワード保護用パスワード（AES-256で鍵を暗号化） */
  password: string;
}

/** 鍵エクスポートレスポンス */
export interface ExportKeyResponse {
  /** Base64エンコードされた鍵ファイル内容 */
  fileContent: string;
  /** ダウンロードファイル名 */
  fileName: string;
}

/** 鍵インポートリクエスト */
export interface ImportKeyRequest {
  /** ファイル名 */
  fileName: string;
  /** Base64エンコードされたファイル内容 */
  fileContent: string;
  /** パスワード（.key/.pfx の場合） */
  password?: string;
}

/** 鍵インポートレスポンス */
export interface ImportKeyResponse {
  /** インポートされた鍵情報 */
  key: EncryptionKey;
}

/** 鍵ローテーションリクエスト */
export interface RotateKeyRequest {
  /** 新しい鍵のID（未指定の場合は新規生成） */
  newKeyId?: string;
}

/** 鍵ローテーションレスポンス */
export interface RotateKeyResponse {
  /** ジョブID（非同期処理の場合） */
  jobId?: string;
  /** 再暗号化対象データ件数 */
  targetCount: number;
  /** 処理ステータス */
  status: 'started' | 'completed' | 'not_implemented';
  /** メッセージ */
  message: string;
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
  /**
   * 子要素に <insertion> が含まれるか
   *
   * @remarks
   * true の場合、暗号化設定パネルに挿入履歴警告を表示する
   */
  hasInsertion?: boolean;
  /** UPA制約チェック結果（L2選択時にバックエンドから取得） */
  upaCheckResult?: UpaCheckResult;
  /**
   * ノード種別（秘匿レベル自動判定用）
   *
   * - global: グローバル要素 → 自動選択時 L1
   * - property / content: → 自動選択時 L2
   * - other: 暗号化対象外
   */
  nodeCategory?: 'global' | 'property' | 'content' | 'other';
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
  /**
   * 秘匿レベル（新規追加）
   *
   * - auto: ノード種別に応じて自動判定
   * - l1:   グローバル要素全体
   * - l2:   データコンテナのコンテンツのみ
   */
  encryptionLevel: EncryptionLevelType;
  /**
   * 鍵ソース（旧 keyMethod から変更）
   *
   * - new_key:    AES-256鍵をランダム生成
   * - load_file:  既存キーファイルを読み込む
   * - public_key: 受信者公開鍵
   */
  keySource: KeySourceType;
  /** ロード済み鍵情報（keySource が new_key/load_file/public_key いずれかで鍵を読み込んだ後に設定） */
  loadedKey?: LoadedKeyInfo;
  /**
   * @deprecated keySource を使用してください
   * 後方互換性のために残していますが、新規コードでは使用しないこと
   */
  keyMethod?: KeyMethodType;
  /** 鍵名（後方互換用） */
  keyName?: string;
  /** PBKDF2設定（後方互換用） */
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
  encryptionLevel: EncryptionLevel.AUTO,
  keySource: KeySource.NEW_KEY,
  loadedKey: undefined,
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

// ---------------------------------------------------------------------------
// 暗号化済み子要素一覧
// ---------------------------------------------------------------------------

/**
 * 暗号化済み子要素情報
 *
 * @remarks
 * ツリーで選択した要素の配下にある暗号化済み要素の情報。
 * 暗号化済み要素一覧タブで表示するデータ型。
 */
export interface EncryptedChildElement {
  /** 要素のXPathパス */
  path: string;
  /** 親要素のID属性値 */
  parentId: string;
  /** 要素の種別（タグ名: 'material', 'condition', 'property' など） */
  elementType: string;
  /** 秘匿レベル */
  encryptionLevel: 'L1' | 'L2';
  /** 使用アルゴリズム（表示用ラベル: 'AES-256-CBC' など） */
  algorithm: string;
  /** 暗号化日時 */
  encryptedAt?: string;
}

// ---------------------------------------------------------------------------
// 復号化プレビュー
// ---------------------------------------------------------------------------

/** 復号化プレビューリクエスト */
export interface DecryptPreviewRequest {
  /** 対象プロジェクト名 */
  projectName: string;
  /** 復号化対象のXPathパス */
  targetPath: string;
  /** 使用する鍵のID */
  keyId: string;
  /** パスワード（PBKDF2の場合のみ） */
  password?: string;
}

/** 復号化プレビューレスポンス */
export interface DecryptPreviewResponse {
  /** 復号化前XML（暗号化されたEncryptedData要素） */
  beforeXml: string;
  /** 復号化後XML（平文の要素） */
  afterXml: string;
}

/** 復号化実行リクエスト（拡張版）*/
export interface DecryptExecuteRequest {
  /** 対象プロジェクト名 */
  projectName: string;
  /** 復号化対象のXPathパス */
  targetPath: string;
  /** 使用する鍵のID */
  keyId: string;
  /** パスワード（PBKDF2の場合のみ） */
  password?: string;
}

/** 復号化実行レスポンス（拡張版）*/
export interface DecryptExecuteResponse {
  success: boolean;
  updatedFilePath?: string;
}
