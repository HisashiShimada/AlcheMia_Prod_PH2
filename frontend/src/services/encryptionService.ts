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
