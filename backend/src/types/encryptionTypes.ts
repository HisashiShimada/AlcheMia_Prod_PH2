/**
 * 暗号化機能 バックエンド型定義
 *
 * @remarks
 * encryption_keys テーブルおよびAPIリクエスト/レスポンスの型定義
 */

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** 対応暗号化アルゴリズム（選択可能なもののみ） */
export const EncryptionAlgorithm = {
  AES_256_CBC: 'aes256-cbc',
  AES_128_CBC: 'aes128-cbc',
  AES_256_GCM: 'aes256-gcm',
} as const;

export type EncryptionAlgorithmType =
  (typeof EncryptionAlgorithm)[keyof typeof EncryptionAlgorithm];

/** 鍵ソース種別 */
export const KeySource = {
  NEW_KEY: 'new_key',       // AES-256をランダム生成
  LOAD_FILE: 'load_file',   // 既存キーファイル (.key/.pem/.pfx)
  PUBLIC_KEY: 'public_key', // 受信者公開鍵 (.pem/.cer)
} as const;

export type KeySourceType = (typeof KeySource)[keyof typeof KeySource];

/** 秘匿レベル */
export const EncryptionLevel = {
  AUTO: 'auto',
  L1: 'l1',
  L2: 'l2',
} as const;

export type EncryptionLevelType =
  (typeof EncryptionLevel)[keyof typeof EncryptionLevel];

// ---------------------------------------------------------------------------
// DBテーブル型（encryption_keys）
// ---------------------------------------------------------------------------

/**
 * encryption_keys テーブルの型定義
 *
 * @remarks
 * DDL: backend/migrations/20260623_create_encryption_keys_table.sql
 * 主キー: key_id
 */
export interface EncryptionKeyRow {
  key_id: string;
  organization_id: string;
  key_name: string;
  key_identifier: string;   // SHA-256の先頭16文字
  algorithm: EncryptionAlgorithmType;
  key_source: KeySourceType;
  file_path: string;         // S3/Swiftの相対パス
  file_name: string;
  file_size: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  update_at: Date;
  expires_at: Date | null;
  last_used_at: Date | null;
  usage_count: number;
  description: string | null;
}

// ---------------------------------------------------------------------------
// APIリクエスト型
// ---------------------------------------------------------------------------

/** 鍵生成リクエスト */
export interface GenerateKeyRequest {
  keyName: string;
  algorithm: EncryptionAlgorithmType;
  description?: string;
  expiresAt?: string;
}

/** 鍵ファイルアップロードリクエスト（multipart） */
export interface UploadKeyFileRequest {
  keyName: string;
  algorithm: EncryptionAlgorithmType;
  keySource: 'load_file' | 'public_key';
  description?: string;
}

/** UPA制約チェックリクエスト */
export interface UpaCheckRequest {
  projectName: string;
  targetPath: string;
  encryptionLevel: EncryptionLevelType;
}

// ---------------------------------------------------------------------------
// APIレスポンス型
// ---------------------------------------------------------------------------

/** 鍵情報レスポンス */
export interface EncryptionKeyResponse {
  keyId: string;
  keyName: string;
  keyIdentifier: string;    // SHA-256の先頭16文字
  algorithm: EncryptionAlgorithmType;
  keySource: KeySourceType;
  fileName: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  description?: string;
}

/** 鍵生成/アップロードレスポンス */
export interface KeyOperationResponse {
  keyId: string;
  keyIdentifier: string;
  fileName: string;
  algorithm: EncryptionAlgorithmType;
  keySource: KeySourceType;
  createdAt: string;
}

/** UPA制約チェックレスポンス */
export interface UpaCheckResponse {
  isValid: boolean;
  violations: UpaViolation[];
}

/** UPA制約違反情報 */
export interface UpaViolation {
  elementPath: string;
  message: string;
  suggestedFix?: string;
}

/** insertion存在確認レスポンス */
export interface InsertionCheckResponse {
  hasInsertion: boolean;
  insertionCount: number;
}

// ---------------------------------------------------------------------------
// EncryptionPolicy（プロバイダ切り替え用ポリシー）
// ---------------------------------------------------------------------------

/**
 * 秘匿化機能のポリシー設定
 *
 * @remarks
 * keyProvider / auditTarget が未確定のため、現在は `local-dummy` のみ実装済み。
 * 本実装フェーズで `aws-kms`, `ecdh`, `cloudtrail` 等への切り替えを行う。
 */
export interface EncryptionPolicy {
  /**
   * 鍵管理プロバイダ
   * - `local-file`: test-keys/ ディレクトリのファイルから鍵を読み込む（テスト用）
   * - `local-dummy`: ローカルでランダム生成（非推奨 / deprecated）
   * - `aws-kms`: AWS Key Management Service（未実装）
   * - `ecdh`: ECDH 鍵導出（未実装）
   */
  keyProvider: 'local-file' | 'local-dummy' | 'aws-kms' | 'ecdh';
  /**
   * 暗号化アルゴリズム
   * - W3C XML Encryption Core 1.1 準拠の URI に変換される
   */
  algorithm: 'aes-256-cbc' | 'aes-128-cbc' | 'aes-256-gcm';
  /**
   * 鍵情報スキーマ
   * 現状は W3C XML Encryption Core 1.1 のみ対応
   */
  keyInfoSchema: 'w3c-xmlenc-core1';
  /**
   * 監査ログの出力先
   * - `local-log`: サーバー上のログファイルに出力（仮実装）
   * - `cloudtrail`: AWS CloudTrail に出力（未実装）
   */
  auditTarget: 'local-log' | 'cloudtrail';
}

/** アルゴリズム URI マップ（W3C xmlenc-core1 準拠） */
export const ALGORITHM_URI_MAP: Record<EncryptionPolicy['algorithm'], string> = {
  'aes-256-cbc': 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
  'aes-128-cbc': 'http://www.w3.org/2001/04/xmlenc#aes128-cbc',
  'aes-256-gcm': 'http://www.w3.org/2009/xmlenc11#aes256-gcm',
} as const;

/** デフォルトの EncryptionPolicy（テスト用: local-file を使用） */
export const DEFAULT_ENCRYPTION_POLICY: EncryptionPolicy = {
  keyProvider: 'local-file',
  algorithm: 'aes-256-cbc',
  keyInfoSchema: 'w3c-xmlenc-core1',
  auditTarget: 'local-log',
} as const;

// ---------------------------------------------------------------------------
// maimlEncryptionService 固有の型定義
// ---------------------------------------------------------------------------

/**
 * 鍵エントリ（簡易鍵ストア用）
 */
export interface KeyEntry {
  /** 鍵の一意ID */
  keyId: string;
  /** 鍵素材（AES バイト列） */
  keyBuffer: Buffer;
  /** 使用アルゴリズム */
  algorithm: EncryptionPolicy['algorithm'];
  /** 生成日時（ISO 8601） */
  createdAt: string;
}

/**
 * 暗号化結果
 */
export interface CipherResult {
  /** 暗号化 ID（XML の Id 属性に使用） */
  encryptionId: string;
  /** 暗号化に使用した鍵 ID */
  keyId: string;
  /** Base64 エンコードされた暗号文 */
  cipherValueBase64: string;
  /** 使用アルゴリズムの URI（W3C xmlenc-core1 準拠） */
  algorithmUri: string;
  /** 暗号化日時（ISO 8601） */
  encryptedAt: string;
}

/**
 * Insertion 要素の参照情報
 */
export interface InsertionRefs {
  /** 子要素の URI */
  uri: string;
  /** 子要素のハッシュ */
  hash: string;
  /** 子要素の UUID */
  uuid: string;
}

/**
 * ValidateEncryptionScope の結果
 */
export interface EncryptionScopeValidationResult {
  /** スコープが有効かどうか */
  isValid: boolean;
  /** 違反している場合のメッセージ */
  message?: string;
}
