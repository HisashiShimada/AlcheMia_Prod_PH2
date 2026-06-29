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
