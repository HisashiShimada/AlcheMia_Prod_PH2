/**
 * 暗号化鍵 Service
 *
 * @remarks
 * 鍵の生成・アップロード・削除・チェックのビジネスロジックを管理する。
 * 本実装フェーズで TODO 箇所を実装すること。
 */

import { v4 as uuidv4 } from 'uuid';
import * as encryptionKeyRepository from '../repositories/encryptionKeyRepository';
import type {
  EncryptionKeyRow,
  EncryptionAlgorithmType,
  KeySourceType,
  KeyOperationResponse,
  EncryptionKeyResponse,
  UpaCheckResponse,
  InsertionCheckResponse,
  GenerateKeyRequest,
  UploadKeyFileRequest,
  EncryptionLevelType,
} from '../types/encryptionTypes';
import { toJSTIsoString } from '../utils/dateUtils';

// ---------------------------------------------------------------------------
// 鍵一覧
// ---------------------------------------------------------------------------

/**
 * 組織の有効な鍵一覧を取得してレスポンス形式に変換
 */
export async function listKeys(
  organizationId: string,
): Promise<EncryptionKeyResponse[]> {
  const rows = await encryptionKeyRepository.findAllByOrganization(organizationId);
  return rows.map(rowToResponse);
}

// ---------------------------------------------------------------------------
// 鍵生成
// ---------------------------------------------------------------------------

/**
 * AES-256 鍵をランダム生成してS3/Swiftに保存し、DBに登録する
 *
 * @param organizationId 組織ID
 * @param userId 作成者ユーザーID
 * @param request 鍵生成リクエスト
 */
export async function generateKey(
  organizationId: string,
  userId: string,
  request: GenerateKeyRequest,
): Promise<KeyOperationResponse> {
  // TODO: 本実装
  // 1. const keyBuffer = crypto.randomBytes(32);  // AES-256 = 32バイト
  // 2. const hash = crypto.createHash('sha256').update(keyBuffer).digest('hex');
  // 3. const keyIdentifier = hash.substring(0, 16);
  // 4. const keyId = uuidv4();
  // 5. const fileName = `${request.keyName}.key`;
  // 6. const filePath = `keys/${keyId}.key`;
  // 7. await storageService.uploadFile(organizationId, filePath, keyBuffer);
  // 8. await encryptionKeyRepository.insert({ ... });

  // スタブ: 固定値を返す
  const keyId = uuidv4();
  const keyIdentifier = 'b8e3a7f1d2c94560'; // TODO: 本実装では実際のSHA-256値
  const fileName = `${request.keyName}.key`;
  const now = toJSTIsoString(new Date());

  // DBスタブ登録（本実装では実際のファイル保存後に呼び出す）
  // await encryptionKeyRepository.insert({ ... });

  return {
    keyId,
    keyIdentifier,
    fileName,
    algorithm: request.algorithm,
    keySource: 'new_key',
    createdAt: now,
  };
}

// ---------------------------------------------------------------------------
// 鍵ファイルアップロード
// ---------------------------------------------------------------------------

/**
 * 鍵ファイルをS3/Swiftに保存し、DBに登録する
 *
 * @param organizationId 組織ID
 * @param userId 作成者ユーザーID
 * @param fileBuffer ファイルバイナリ
 * @param originalName 元のファイル名
 * @param request リクエスト情報
 */
export async function uploadKeyFile(
  organizationId: string,
  userId: string,
  fileBuffer: Buffer,
  originalName: string,
  request: UploadKeyFileRequest,
): Promise<KeyOperationResponse> {
  // TODO: 本実装
  // 1. ファイル形式バリデーション
  //    const allowedExt = request.keySource === 'public_key'
  //      ? ['.pem', '.cer']
  //      : ['.key', '.pem', '.pfx'];
  //    const ext = path.extname(originalName).toLowerCase();
  //    if (!allowedExt.includes(ext)) throw new Error('Invalid key file format');
  //
  // 2. SHA-256ハッシュ計算
  //    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  //    const keyIdentifier = hash.substring(0, 16);
  //
  // 3. S3/Swiftに保存
  //    const keyId = uuidv4();
  //    const filePath = `keys/${keyId}${ext}`;
  //    await storageService.uploadFile(organizationId, filePath, fileBuffer);
  //
  // 4. DBに登録
  //    await encryptionKeyRepository.insert({ ... });

  // スタブ: 固定値を返す
  const keyId = uuidv4();
  const keyIdentifier = 'a3f5d9c2e4b81f7a'; // TODO: 本実装では実際のSHA-256値
  const now = toJSTIsoString(new Date());

  return {
    keyId,
    keyIdentifier,
    fileName: originalName,
    algorithm: request.algorithm,
    keySource: request.keySource,
    createdAt: now,
  };
}

// ---------------------------------------------------------------------------
// 鍵削除
// ---------------------------------------------------------------------------

/**
 * 鍵を論理削除する
 *
 * @param keyId 鍵ID
 * @param organizationId 組織ID
 * @returns 削除成功かどうか
 */
export async function deleteKey(
  keyId: string,
  organizationId: string,
): Promise<boolean> {
  // TODO: 本実装では、S3/Swiftからファイルを削除することも検討
  // 現在は論理削除のみ（物理削除はしない）
  return await encryptionKeyRepository.softDelete(keyId, organizationId);
}

// ---------------------------------------------------------------------------
// UPA制約チェック
// ---------------------------------------------------------------------------

/**
 * UPA（Unique Particle Attribution）制約チェックを実行する
 *
 * @param organizationId 組織ID
 * @param projectName プロジェクト名
 * @param targetPath XPathパス
 * @param encryptionLevel 秘匿レベル
 */
export async function checkUpaConstraints(
  organizationId: string,
  projectName: string,
  targetPath: string,
  encryptionLevel: EncryptionLevelType,
): Promise<UpaCheckResponse> {
  // TODO: 本実装
  // 1. MAIMLファイルをS3/Swiftから取得
  //    const maimlPath = `projects/${projectName}/${projectName}.maiml`;
  //    const maimlContent = await storageService.downloadFile(organizationId, maimlPath);
  //
  // 2. XMLパース
  //    const doc = new DOMParser().parseFromString(maimlContent.toString(), 'text/xml');
  //
  // 3. targetPathの要素を取得し、親要素のスキーマを検証
  //    const violations = validateUpaConstraints(doc, targetPath, encryptionLevel);
  //
  // 4. 違反結果を返す

  // スタブ: 常にOK
  return {
    isValid: true,
    violations: [],
  };
}

// ---------------------------------------------------------------------------
// insertion 存在確認
// ---------------------------------------------------------------------------

/**
 * 選択ノードの子要素に <insertion> が含まれるかチェックする
 *
 * @param organizationId 組織ID
 * @param projectName プロジェクト名
 * @param nodePath XPathパス
 */
export async function checkInsertion(
  organizationId: string,
  projectName: string,
  nodePath: string,
): Promise<InsertionCheckResponse> {
  // TODO: 本実装
  // 1. MAIMLファイルをS3/Swiftから取得
  //    const maimlPath = `projects/${projectName}/${projectName}.maiml`;
  //    const maimlContent = await storageService.downloadFile(organizationId, maimlPath);
  //
  // 2. XMLパース
  //    const doc = new DOMParser().parseFromString(maimlContent.toString(), 'text/xml');
  //
  // 3. nodePathの要素を取得
  //    const targetElement = xpathEvaluate(doc, nodePath);
  //
  // 4. <insertion>子要素の存在確認
  //    const insertionElements = targetElement.querySelectorAll('insertion');
  //    return { hasInsertion: insertionElements.length > 0, insertionCount: insertionElements.length };

  // スタブ: 常にfalse
  return {
    hasInsertion: false,
    insertionCount: 0,
  };
}

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/** DB行をAPIレスポンス形式に変換 */
function rowToResponse(row: EncryptionKeyRow): EncryptionKeyResponse {
  return {
    keyId: row.key_id,
    keyName: row.key_name,
    keyIdentifier: row.key_identifier,
    algorithm: row.algorithm,
    keySource: row.key_source,
    fileName: row.file_name,
    isActive: row.is_active,
    createdAt: toJSTIsoString(row.created_at),
    expiresAt: row.expires_at ? toJSTIsoString(row.expires_at) : null,
    lastUsedAt: row.last_used_at ? toJSTIsoString(row.last_used_at) : null,
    usageCount: row.usage_count,
    description: row.description ?? undefined,
  };
}
