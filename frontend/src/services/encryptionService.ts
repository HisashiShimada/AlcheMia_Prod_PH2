/**
 * 暗号化管理APIサービス
 *
 * @description
 * バックエンドの暗号化管理API（/api/v1/encryption）を呼び出すサービス。
 * 現在のバックエンドはスタブ実装のため、インメモリデータを返す。
 * バックエンドが本実装に切り替わっても、このファイルの変更は不要。
 */

import axios from 'axios';
import type {
  MaimlTreeNode,
  EncryptionKey,
  EncryptionConfig,
  EncryptionPreviewResponse,
  EncryptResponse,
  DecryptResponse,
  KeyMethodType,
  LoadedKeyInfo,
  UpaCheckResult,
  EncryptionLevelType,
  KeySourceType,
} from '@/types/encryption';
import { fetchAndParseMockMaiml } from '@/utils/parseMaimlToEncryptionTree';

const BASE_URL = '/api/v1/encryption';

// ---------------------------------------------------------------------------
// MAIMLツリー構造
// ---------------------------------------------------------------------------

/**
 * MAIMLファイルの暗号化対象ツリー構造を取得
 *
 * @remarks
 * バックエンドAPI（/api/v1/encryption/projects/:name/structure）を試みる。
 * 失敗した場合は /public/mocks/Raman.maiml をフロントエンドでパースして返す。
 */
export async function getMaimlStructure(projectName: string): Promise<MaimlTreeNode[]> {
  try {
    const res = await axios.get<{ success: boolean; data: { structure: MaimlTreeNode[] } }>(
      `${BASE_URL}/projects/${encodeURIComponent(projectName)}/structure`,
    );
    return res.data.data.structure;
  } catch {
    // バックエンドAPI未実装 / 失敗時: Raman.maiml をフロントエンドでパース
    console.warn('[encryptionService] getMaimlStructure API failed → using Raman.maiml mock');
    return fetchAndParseMockMaiml();
  }
}

// ---------------------------------------------------------------------------
// 暗号化操作
// ---------------------------------------------------------------------------

/**
 * 暗号化プレビューXMLを取得
 */
export async function previewEncryption(
  projectName: string,
  config: EncryptionConfig,
): Promise<EncryptionPreviewResponse> {
  const res = await axios.post<{ success: boolean; data: EncryptionPreviewResponse }>(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/preview`,
    { config },
  );
  return res.data.data;
}

/**
 * 指定要素の暗号化を実行
 */
export async function encryptElement(
  projectName: string,
  targetPath: string,
  config: EncryptionConfig,
): Promise<EncryptResponse> {
  const res = await axios.post<{ success: boolean; data: EncryptResponse }>(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/encrypt`,
    { targetPath, config },
  );
  return res.data.data;
}

/**
 * 指定要素の復号化を実行
 */
export async function decryptElement(
  projectName: string,
  targetPath: string,
  decryptionKey: { method: KeyMethodType; keyName?: string; password?: string },
): Promise<DecryptResponse> {
  const res = await axios.post<{ success: boolean; data: DecryptResponse }>(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/decrypt`,
    { targetPath, decryptionKey },
  );
  return res.data.data;
}

// ---------------------------------------------------------------------------
// 暗号化鍵管理
// ---------------------------------------------------------------------------

/**
 * 暗号化鍵一覧を取得
 */
export async function listKeys(): Promise<EncryptionKey[]> {
  const res = await axios.get<{ success: boolean; data: { keys: EncryptionKey[] } }>(
    `${BASE_URL}/keys`,
  );
  return res.data.data.keys;
}

/**
 * 暗号化鍵の詳細を取得
 */
export async function getKey(keyId: string): Promise<EncryptionKey> {
  const res = await axios.get<{ success: boolean; data: { key: EncryptionKey } }>(
    `${BASE_URL}/keys/${encodeURIComponent(keyId)}`,
  );
  return res.data.data.key;
}

/**
 * 暗号化鍵を新規作成
 */
export async function createKey(params: {
  keyName: string;
  algorithm: string;
  expiresAt?: string;
  description?: string;
}): Promise<EncryptionKey> {
  const res = await axios.post<{ success: boolean; data: { key: EncryptionKey } }>(
    `${BASE_URL}/keys`,
    params,
  );
  return res.data.data.key;
}

/**
 * 暗号化鍵を削除
 */
export async function deleteKey(keyId: string): Promise<void> {
  await axios.delete(`${BASE_URL}/keys/${encodeURIComponent(keyId)}`);
}

/**
 * 鍵を1件 .key 形式でパスワード保護してエクスポート
 *
 * @param keyId エクスポートする鍵ID
 * @param password パスワード保護用パスワード
 * @returns Base64エンコードされたファイル内容とファイル名
 */
export async function exportKey(
  keyId: string,
  password: string,
): Promise<{ fileContent: string; fileName: string }> {
  const res = await axios.post<{
    success: boolean;
    data: { fileContent: string; fileName: string };
  }>(`${BASE_URL}/keys/${encodeURIComponent(keyId)}/export`, { password });
  return res.data.data;
}

/**
 * .key / .pem / .pfx 形式の鍵ファイルをインポート
 *
 * @param fileName ファイル名
 * @param fileContent Base64エンコードされたファイル内容
 * @param password パスワード（.key/.pfx の場合）
 * @returns インポートされた鍵情報
 */
export async function importKey(
  fileName: string,
  fileContent: string,
  password?: string,
): Promise<import('@/types/encryption').EncryptionKey> {
  const res = await axios.post<{
    success: boolean;
    data: { key: import('@/types/encryption').EncryptionKey };
  }>(`${BASE_URL}/keys/import`, { fileName, fileContent, password });
  return res.data.data.key;
}

/**
 * 鍵ローテーション: 選択した鍵で暗号化された EncryptedData を全て再暗号化
 *
 * @param keyId ローテーション対象の鍵ID
 * @returns ローテーション結果
 */
export async function rotateKey(
  keyId: string,
): Promise<import('@/types/encryption').RotateKeyResponse> {
  const res = await axios.post<{
    success: boolean;
    data: import('@/types/encryption').RotateKeyResponse;
  }>(`${BASE_URL}/keys/${encodeURIComponent(keyId)}/rotate`);
  return res.data.data;
}

// ---------------------------------------------------------------------------
// 鍵生成 / アップロード
// ---------------------------------------------------------------------------

/**
 * AES-256 鍵をランダム生成してファイルサーバに保存
 *
 * @param keyName 鍵名
 * @param algorithm 暗号化アルゴリズム
 * @returns ロード済み鍵情報
 */
export async function generateNewKey(
  keyName: string,
  algorithm: string,
): Promise<LoadedKeyInfo> {
  const res = await axios.post<{
    success: boolean;
    data: {
      keyId: string;
      keyIdentifier: string;
      fileName: string;
      algorithm: string;
      keySource: KeySourceType;
      createdAt: string;
    };
  }>(`${BASE_URL}/keys/generate`, { keyName, algorithm });

  return {
    keyIdentifier: res.data.data.keyIdentifier,
    fileName: res.data.data.fileName,
    source: 'new_key',
    serverKeyId: res.data.data.keyId,
  };
}

/**
 * 既存の鍵ファイルをサーバにアップロード
 *
 * @param file アップロードするファイル（.key/.pem/.pfx/.cer）
 * @param keyName 鍵名
 * @param algorithm 暗号化アルゴリズム
 * @param keySource 鍵ソース種別
 * @returns ロード済み鍵情報
 *
 * @remarks
 * 本実装では multipart/form-data で送信する。
 * 現在のバックエンドはスタブのため、固定値を返す。
 */
export async function uploadKeyFile(
  file: File,
  keyName: string,
  algorithm: string,
  keySource: 'load_file' | 'public_key',
): Promise<LoadedKeyInfo> {
  // TODO: 本実装では FormData を使用
  // const formData = new FormData();
  // formData.append('keyFile', file);
  // formData.append('keyName', keyName);
  // formData.append('algorithm', algorithm);
  // formData.append('keySource', keySource);
  // const res = await axios.post(`${BASE_URL}/keys/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

  // スタブ: ファイル名とSHA-256は Web Crypto API で計算（フロントエンド側）
  const fileBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const keyIdentifier = hashHex.substring(0, 16);

  // バックエンドへの通知（スタブ）
  const res = await axios.post<{
    success: boolean;
    data: { keyId: string; keyIdentifier: string; fileName: string };
  }>(`${BASE_URL}/keys/upload`, { keyName, algorithm, keySource });

  return {
    keyIdentifier,                      // フロントエンドで計算したSHA-256
    fileName: file.name,
    source: keySource,
    serverKeyId: res.data.data.keyId,
  };
}

// ---------------------------------------------------------------------------
// UPA制約チェック
// ---------------------------------------------------------------------------

/**
 * UPA（Unique Particle Attribution）制約チェックを実行
 *
 * @param projectName プロジェクト名
 * @param targetPath XPathパス
 * @param encryptionLevel 秘匿レベル
 * @returns UPA制約チェック結果
 */
export async function checkUpaConstraints(
  projectName: string,
  targetPath: string,
  encryptionLevel: EncryptionLevelType,
): Promise<UpaCheckResult> {
  const res = await axios.post<{ success: boolean; data: UpaCheckResult }>(
    `${BASE_URL}/upa-check`,
    { projectName, targetPath, encryptionLevel },
  );
  return res.data.data;
}

// ---------------------------------------------------------------------------
// insertion 存在確認
// ---------------------------------------------------------------------------

/**
 * 選択ノードの子要素に <insertion> が含まれるか確認
 *
 * @param projectName プロジェクト名
 * @param nodePath XPathパス
 * @returns insertion が存在するか
 */
export async function checkInsertion(
  projectName: string,
  nodePath: string,
): Promise<{ hasInsertion: boolean; insertionCount: number }> {
  const res = await axios.get<{
    success: boolean;
    data: { hasInsertion: boolean; insertionCount: number };
  }>(
    `${BASE_URL}/check-insertion/${encodeURIComponent(projectName)}/${encodeURIComponent(nodePath)}`,
  );
  return res.data.data;
}

// ---------------------------------------------------------------------------
// 暗号化済み子要素一覧
// ---------------------------------------------------------------------------

/**
 * 選択ノード配下の暗号化済み要素一覧を取得
 *
 * @param projectName プロジェクト名
 * @param nodePath 選択要素のXPathパス
 * @returns 暗号化済み子要素の一覧
 */
export async function getEncryptedChildren(
  projectName: string,
  nodePath: string,
): Promise<import('@/types/encryption').EncryptedChildElement[]> {
  const res = await axios.get<{
    success: boolean;
    data: { elements: import('@/types/encryption').EncryptedChildElement[] };
  }>(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/encrypted-children`,
    { params: { nodePath } },
  );
  return res.data.data.elements;
}

// ---------------------------------------------------------------------------
// 復号化プレビュー / 復号化実行
// ---------------------------------------------------------------------------

/**
 * 復号化プレビューXMLを取得
 *
 * @param projectName プロジェクト名
 * @param request 復号化プレビューリクエスト
 * @returns 復号化前後のXML
 */
export async function getDecryptPreview(
  projectName: string,
  request: import('@/types/encryption').DecryptPreviewRequest,
): Promise<import('@/types/encryption').DecryptPreviewResponse> {
  const res = await axios.post<{
    success: boolean;
    data: import('@/types/encryption').DecryptPreviewResponse;
  }>(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/decrypt-preview`,
    request,
  );
  return res.data.data;
}

/**
 * 復号化を実行してMAIMLファイルを更新
 *
 * @param projectName プロジェクト名
 * @param request 復号化実行リクエスト
 * @returns 復号化実行結果
 */
export async function executeDecrypt(
  projectName: string,
  request: import('@/types/encryption').DecryptExecuteRequest,
): Promise<import('@/types/encryption').DecryptExecuteResponse> {
  const res = await axios.post<{
    success: boolean;
    data: import('@/types/encryption').DecryptExecuteResponse;
  }>(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/decrypt-execute`,
    request,
  );
  return res.data.data;
}
