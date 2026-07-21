/**
 * 暗号化管理コントローラー
 *
 * @description
 * MAIMLファイルの暗号化・復号化・鍵管理APIのリクエストハンドラ。
 * maimlEncryptionService + testKeyLoader を使用した実装（DBレス）。
 *
 * @remarks
 * 【テストモード設計（DB不使用）】
 *   - 鍵管理: DB（encryption_keys）は使用しない
 *     → test-keys/encryption/ の固定ファイルのみを参照
 *   - 鍵一覧（GET /keys）: test-keys/encryption/*.key をスキャンして仮想鍵情報を返す
 *   - 鍵生成・アップロード（POST /keys/generate, /keys/upload）: 固定鍵情報を返す（実際には何も生成しない）
 *   - 鍵削除（DELETE /keys/:keyId）: 固定鍵は削除不可（409）
 *   - 暗号化・復号化: フロントのアルゴリズム指定を正しくPolicyに変換して処理
 *
 * 【TODO: 本実装が必要な範囲】
 *   - getMaimlStructure: MAIMLファイルをパースして暗号化対象ツリーを返す
 *   - previewEncryption: 対象ノードの実XMLを取得してプレビュー生成
 *   - getEncryptedChildren: MAIMLをパースして全 EncryptedData 要素を収集
 *   - rotateKey: バックグラウンドジョブで再暗号化
 */

import { Request, Response } from 'express';
import { getStorageService } from '../services/storageService';
import * as maimlEncryptionService from '../services/maimlEncryptionService';
import * as testKeyLoader from '../utils/testKeyLoader';
import {
  buildEncryptedDataXml,
  extractCipherResultFromXml,
  replaceElementInXml,
  getElementXmlByTargetPath,
  findEncryptedDataElements,
  parseMaimlToEncryptionTree,
  buildChildRefsXml,
} from '../utils/maimlEncryptionXmlHelper';
import type {
  EncryptionPolicy,
  EncryptionKeyResponse,
  KeyOperationResponse,
  InsertionCheckResponse,
  UpaCheckResponse,
} from '../types/encryptionTypes';
import {
  DEFAULT_ENCRYPTION_POLICY,
  ALGORITHM_URI_MAP,
} from '../types/encryptionTypes';

// ---------------------------------------------------------------------------
// アルゴリズム正規化ヘルパー
// ---------------------------------------------------------------------------

/**
 * フロントエンドが送る algorithm 文字列（例: 'aes256-gcm'）を
 * EncryptionPolicy['algorithm'] 形式（例: 'aes-256-gcm'）に変換する。
 *
 * フロントエンドの EncryptionAlgorithmType は ハイフン区切り2つ形式（'aes256-cbc'）
 * バックエンドの EncryptionPolicy は ハイフン区切り3つ形式（'aes-256-cbc'）
 *
 * @param raw フロントエンドから受け取った algorithm 文字列
 * @returns 正規化されたアルゴリズム識別子（デフォルト: 'aes-256-cbc'）
 */
function normalizeFrontAlgorithm(
  raw: string | undefined,
): 'aes-256-cbc' | 'aes-128-cbc' | 'aes-256-gcm' {
  // フロント値（aes256-xxx 形式）を Policy値（aes-256-xxx 形式）に変換
  if (raw === 'aes256-gcm') return 'aes-256-gcm';
  if (raw === 'aes128-cbc') return 'aes-128-cbc';
  if (raw === 'aes256-cbc') return 'aes-256-cbc';
  // 既にPolicy形式で来た場合もそのまま受け取る（後方互換）
  if (raw === 'aes-256-gcm') return 'aes-256-gcm';
  if (raw === 'aes-128-cbc') return 'aes-128-cbc';
  if (raw === 'aes-256-cbc') return 'aes-256-cbc';
  // デフォルト
  return 'aes-256-cbc';
}

/**
 * EncryptionPolicy['algorithm'] からフロントエンドの EncryptionAlgorithmType 形式に変換する
 */
function toFrontAlgorithm(
  algorithm: 'aes-256-cbc' | 'aes-128-cbc' | 'aes-256-gcm',
): 'aes256-cbc' | 'aes128-cbc' | 'aes256-gcm' {
  if (algorithm === 'aes-256-gcm') return 'aes256-gcm';
  if (algorithm === 'aes-128-cbc') return 'aes128-cbc';
  return 'aes256-cbc';
}

/**
 * アルゴリズムに対応する鍵長（bytes）を返す
 */
function getKeySize(algorithm: 'aes-256-cbc' | 'aes-128-cbc' | 'aes-256-gcm'): number {
  return algorithm === 'aes-128-cbc' ? 16 : 32;
}

// ---------------------------------------------------------------------------
// レスポンスヘルパー
// ---------------------------------------------------------------------------

function ok(res: Response, data: unknown): void {
  res.status(200).json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
}

function badRequest(res: Response, code: string, message: string): void {
  res.status(400).json({
    success: false,
    error: { code, message },
    meta: { timestamp: new Date().toISOString() },
  });
}

function notFound(res: Response, message: string): void {
  res.status(404).json({
    success: false,
    error: { code: 'E6001', message },
    meta: { timestamp: new Date().toISOString() },
  });
}

function serverError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'サーバーエラーが発生しました';
  res.status(500).json({
    success: false,
    error: { code: 'E4001', message },
    meta: { timestamp: new Date().toISOString() },
  });
}

// ---------------------------------------------------------------------------
// 固定鍵情報の生成ヘルパー（DBの代わりに test-keys/ から生成）
// ---------------------------------------------------------------------------

/**
 * ファイル名（拡張子なし）から仮想の EncryptionKeyResponse を生成する
 *
 * @remarks
 * test-keys/encryption/ の各 .key ファイルに対応する仮想鍵情報を生成する。
 * DB の encryption_keys テーブルは使用しない。
 *
 * ファイル名とアルゴリズムの対応:
 *   - test-encryption-key-aes128  → aes128-cbc
 *   - test-encryption-key-aes256  → aes256-cbc（GCMも同じファイルを使用）
 *   - test-encryption-key         → aes256-cbc（旧互換）
 *   - その他                      → aes256-cbc
 */
function buildKeyResponseFromFile(
  keyName: string,
  createdAt: string = new Date().toISOString(),
): EncryptionKeyResponse {
  // アルゴリズムをファイル名から推測
  let algorithm: 'aes256-cbc' | 'aes128-cbc' | 'aes256-gcm' = 'aes256-cbc';
  if (keyName.includes('aes128')) {
    algorithm = 'aes128-cbc';
  } else if (keyName.includes('aes256')) {
    algorithm = 'aes256-cbc';
  }

  return {
    keyId: keyName,
    keyName: keyName,
    keyIdentifier: keyName.substring(0, 16),
    algorithm,
    keySource: 'load_file',
    fileName: `${keyName}.key`,
    isActive: true,
    createdAt,
    expiresAt: null,
    lastUsedAt: null,
    usageCount: 0,
    description: `テスト用固定鍵ファイル: backend/test-keys/encryption/${keyName}.key`,
  };
}

// ---------------------------------------------------------------------------
// MAIMLファイル取得ヘルパー
// ---------------------------------------------------------------------------

/**
 * プロジェクト名から MAIML ファイルの内容を取得する
 */
async function getMaimlContent(
  organizationId: string,
  projectName: string,
): Promise<string | null> {
  try {
    const storageService = getStorageService();
    const filePath = `projects/${projectName}/${projectName}.maiml`;
    const buffer = await storageService.downloadFile(organizationId, filePath);
    return buffer.toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * MAIML ファイルを保存する（アーカイブバックアップ付き）
 */
async function saveMaimlContent(
  organizationId: string,
  projectName: string,
  content: string,
): Promise<{ updatedFilePath: string; backupFilePath: string }> {
  const storageService = getStorageService();
  const filePath = `projects/${projectName}/${projectName}.maiml`;
  const backupPath = `projects/${projectName}/archive/${projectName}_backup_${Date.now()}.maiml`;

  // バックアップを先に保存
  try {
    const current = await storageService.downloadFile(organizationId, filePath);
    await storageService.uploadFile(organizationId, backupPath, current, { contentType: 'application/xml' });
  } catch {
    // 既存ファイルが存在しない場合はバックアップをスキップ
  }

  // 更新後のファイルを保存
  await storageService.uploadFile(organizationId, filePath, Buffer.from(content, 'utf-8'), { contentType: 'application/xml' });

  return { updatedFilePath: filePath, backupFilePath: backupPath };
}

// ---------------------------------------------------------------------------
// MAIMLツリー構造取得
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/encryption/projects/:projectName/structure
 * MAIMLファイルの暗号化対象ツリー構造を取得
 *
 * @remarks
 * 【TODO: 本実装】MAIMLファイルをXMLパーサーで解析し、
 *   各要素の isEncryptable / isEncrypted 状態を動的に生成する。
 *   現在はファイルの取得のみ行い、構造はスタブを返す。
 */
export const getMaimlStructure = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  try {
    const xmlContent = await getMaimlContent(organizationId, projectName);
    if (!xmlContent) {
      notFound(res, `プロジェクト "${projectName}" のMAIMLファイルが見つかりません`);
      return;
    }

    // MAIMLをパースして暗号化対象ツリーを動的生成
    const structure = parseMaimlToEncryptionTree(xmlContent);
    ok(res, { structure });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 暗号化プレビュー
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/projects/:projectName/preview
 * 暗号化プレビューXMLを返す
 *
 * リクエストボディ:
 *   - config: { algorithm: string, keyName?: string, ... }
 *
 * @remarks
 * 【TODO: 本実装】指定ノードの実際のXMLを取得してプレビューを生成する。
 */
export const previewEncryption = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const { config } = req.body as {
    config: {
      algorithm?: string;
      keyMethod?: string;
      keyName?: string;
      encryptionProperties?: { recordTimestamp: boolean };
    };
  };

  if (!projectName) {
    badRequest(res, 'E1003', 'projectName は必須です');
    return;
  }

  try {
    const algorithm = normalizeFrontAlgorithm(config?.algorithm);
    const policy: EncryptionPolicy = {
      ...DEFAULT_ENCRYPTION_POLICY,
      algorithm,
    };
    const algorithmUri = maimlEncryptionService.getAlgorithmIdentifier(policy);

    // MAIMLファイルを取得
    const xmlContent = await getMaimlContent(req.organizationId ?? '', projectName);
    const targetPath = (req.body as { targetPath?: string }).targetPath;

    // 対象ノードの実XMLを取得してプレビューを生成する
    let beforeXml: string;
    if (xmlContent && targetPath) {
      const elementXml = getElementXmlByTargetPath(xmlContent, targetPath);
      beforeXml = elementXml ?? `<!-- 対象要素が見つかりません (targetPath=${targetPath}) -->`;
    } else {
      beforeXml = `<!-- MAIMLファイルまたは targetPath が指定されていません -->`;
    }

    const keyId = config?.keyName ?? `file:fixed:${algorithm}`;

    // beforeXml から要素名を取得してプレビュー afterXml を組み立てる
    // 実際の暗号化は行わず、EncryptedData のタグ構成（構造プレビュー）のみを返す
    const encPreviewId = `enc-preview-${Date.now()}`;
    let elementTag = 'Element';
    if (beforeXml && beforeXml.trim().startsWith('<')) {
      const tagMatch = beforeXml.trim().match(/^<([^\s/>]+)/);
      if (tagMatch) {
        elementTag = tagMatch[1];
      }
    }

    const afterXml = [
      `<xenc:EncryptedData xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"`,
      `                    xmlns:ds="http://www.w3.org/2000/09/xmldsig#"`,
      `                    Id="${encPreviewId}"`,
      `                    Type="http://www.w3.org/2001/04/xmlenc#Element">`,
      `  <!-- 暗号化対象要素: <${elementTag}> -->`,
      `  <xenc:EncryptionMethod Algorithm="${algorithmUri}"/>`,
      `  <ds:KeyInfo>`,
      `    <ds:KeyName>${keyId}</ds:KeyName>`,
      `  </ds:KeyInfo>`,
      `  <xenc:CipherData>`,
      `    <xenc:CipherValue>(暗号化後の Base64 データ)</xenc:CipherValue>`,
      `  </xenc:CipherData>`,
      `</xenc:EncryptedData>`,
    ].join('\n');

    ok(res, { beforeXml, afterXml, algorithmUri, elementTag });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 要素の暗号化
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/projects/:projectName/encrypt
 * 指定要素の暗号化を実行
 *
 * リクエストボディ（フロントエンドから送信）:
 *   - targetPaths: string[]          暗号化対象のXPathリスト
 *   - config: EncryptionConfig       暗号化設定（algorithm, loadedKey 等を含む）
 *
 * @remarks
 * フロントエンドの algorithm は 'aes256-cbc' 形式。
 * normalizeFrontAlgorithm() で EncryptionPolicy の 'aes-256-cbc' 形式に変換してから処理する。
 */
export const encryptElement = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const {
    targetPaths,
    config,
  } = req.body as {
    targetPaths?: string[];
    config?: {
      algorithm?: string;
      loadedKey?: { serverKeyId?: string };
      encryptionLevel?: string;
    };
    // 後方互換: 旧形式（targetPath 単数, keyId）もサポート
    targetPath?: string;
    keyId?: string;
  };
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  // targetPaths（新形式）または targetPath（旧形式）を取得
  const paths: string[] = targetPaths ?? (req.body.targetPath ? [req.body.targetPath] : []);
  if (paths.length === 0) {
    badRequest(res, 'E1003', 'targetPaths は必須です（1件以上指定してください）');
    return;
  }

  try {
    // フロントの algorithm 値 → EncryptionPolicy の algorithm 値に変換
    const algorithm = normalizeFrontAlgorithm(config?.algorithm);
    const policy: EncryptionPolicy = {
      ...DEFAULT_ENCRYPTION_POLICY,
      algorithm,
    };

    // MAIMLファイルを取得
    const xmlContent = await getMaimlContent(organizationId, projectName);
    if (!xmlContent) {
      notFound(res, `プロジェクト "${projectName}" のMAIMLファイルが見つかりません`);
      return;
    }

    // test-keys/encryption/ から algorithm に対応する固定鍵を読み込む
    const keyEntry = await maimlEncryptionService.generateKey(policy);
    if (!keyEntry) {
      ok(res, {
        skipped: true,
        message: '本番モードのため鍵が取得できず、暗号化処理をスキップしました',
      });
      return;
    }

    // 各 targetPath に対して暗号化処理し、XML を逐次書き換え
    // validateEncryptionScope が非同期のため、直列で処理する（updatedXml を逐次更新するため Promise.all は使わない）
    let updatedXml = xmlContent;
    const encryptedResults: Array<{
      targetPath: string;
      success: boolean;
      error?: string;
      warning?: string;
      encryptionId?: string;
      algorithmUri?: string;
      encryptedAt?: string;
      hasInsertionRefs?: boolean;
      insertionRefCount?: number;
    }> = [];

    for (const targetPath of paths) {
      // UPA 制約チェック（非同期）
      const scopeResult = await maimlEncryptionService.validateEncryptionScope(targetPath);
      if (!scopeResult.isValid) {
        encryptedResults.push({
          targetPath,
          success: false,
          error: `UPA 制約違反: ${scopeResult.message ?? '暗号化スコープが無効です'}`,
        });
        continue;
      }

      // targetPath の要素 XML を取得（実際の要素コンテンツを暗号化対象にする）
      const elementXml = getElementXmlByTargetPath(updatedXml, targetPath);
      if (!elementXml) {
        encryptedResults.push({
          targetPath,
          success: false,
          error: `対象要素が見つかりません: ${targetPath}`,
        });
        continue;
      }

      // insertion 確認（実際の要素XMLを渡す）
      const insertionRefs = maimlEncryptionService.extractInsertionRefs(elementXml);

      // 暗号化実行（実際の要素XMLを渡す）
      const cipherResult = maimlEncryptionService.encryptElement(keyEntry, elementXml, policy);

      // childRefs XML フラグメントを生成
      const childRefsXml = buildChildRefsXml(insertionRefs);

      // <EncryptedData> XML を生成
      const encryptedDataXml = buildEncryptedDataXml(cipherResult, childRefsXml || undefined);

      // XML 内の対象要素を <EncryptedData> に置換
      const { updated, replaced } = replaceElementInXml(updatedXml, targetPath, encryptedDataXml);
      updatedXml = updated;

      encryptedResults.push({
        targetPath,
        success: replaced,
        encryptionId: cipherResult.encryptionId,
        algorithmUri: cipherResult.algorithmUri,
        encryptedAt: cipherResult.encryptedAt,
        hasInsertionRefs: insertionRefs.length > 0,
        insertionRefCount: insertionRefs.length,
        ...(replaced ? {} : { warning: '要素の置換に失敗しました（targetPath の形式を確認してください）' }),
      });
    }

    // 更新後の XML を MAIML ファイルとして保存
    const { updatedFilePath, backupFilePath } = await saveMaimlContent(
      organizationId,
      projectName,
      updatedXml,
    );

    // 使用後に鍵を廃棄（固定鍵はインメモリキャッシュからクリア）
    maimlEncryptionService.disposeKey(keyEntry.keyId);

    ok(res, {
      success: true,
      encryptedCount: encryptedResults.filter((r) => r.success).length,
      results: encryptedResults,
      algorithm: toFrontAlgorithm(algorithm),
      algorithmUri: ALGORITHM_URI_MAP[algorithm],
      updatedFilePath,
      backupFilePath,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 要素の復号化（後方互換 POST /decrypt）
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/projects/:projectName/decrypt
 * 指定要素の復号化を実行（後方互換エンドポイント）
 *
 * リクエストボディ（フロントエンドから送信）:
 *   - targetPaths: string[]          復号化対象のXPathリスト
 *   - decryptionKey: { method, keyName?, password? }
 *
 * @remarks
 * 旧来 targetPath / keyId でリクエストしていた形式も後方互換で受け付ける。
 * algorithmUri は test-keys/ 固定鍵のデフォルト（aes-256-cbc）を使用。
 */
export const decryptElement = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const {
    targetPaths,
    decryptionKey,
  } = req.body as {
    targetPaths?: string[];
    decryptionKey?: {
      method?: string;
      keyName?: string;
      password?: string;
    };
    // 後方互換: 旧形式（targetPath 単数, keyId）もサポート
    targetPath?: string;
    keyId?: string;
  };
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  // targetPaths（新形式）または targetPath（旧形式）を取得
  const paths: string[] = targetPaths ?? (req.body.targetPath ? [req.body.targetPath] : []);
  if (paths.length === 0) {
    badRequest(res, 'E1003', 'targetPaths は必須です（1件以上指定してください）');
    return;
  }

  try {
    // test-keys/ から固定鍵を取得（デフォルト: aes-256-cbc）
    const keyEntry = await maimlEncryptionService.retrieveKeyForDecryption(
      decryptionKey?.keyName ?? 'test-key',
      DEFAULT_ENCRYPTION_POLICY,
    );
    if (!keyEntry) {
      notFound(res, '鍵が見つかりません。test-keys/encryption/ に鍵ファイルが存在するか確認してください。');
      return;
    }

    ok(res, {
      success: true,
      decryptedXml: `<!-- TODO: 本実装後に実際の復号結果を返す (targetPaths=${JSON.stringify(paths)}) -->`,
      _keyEntryId: keyEntry.keyId,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 鍵一覧取得（test-keys/ フォルダスキャン、DB不使用）
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/encryption/keys
 * 暗号化鍵一覧を取得（test-keys/encryption/ をスキャン）
 *
 * @remarks
 * DB（encryption_keys テーブル）は使用しない。
 * `backend/test-keys/encryption/` に存在する .key ファイルを一覧して、
 * 各ファイルに対応する仮想の EncryptionKeyResponse を生成して返す。
 */
export const listKeys = async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  try {
    const keyNames = await testKeyLoader.listEncryptionKeyNames();
    const keys: EncryptionKeyResponse[] = keyNames.map((name) => buildKeyResponseFromFile(name));
    ok(res, { keys });
  } catch (err) {
    serverError(res, err);
  }
};

/**
 * GET /api/v1/encryption/keys/:keyId
 * 暗号化鍵の詳細を取得（test-keys/ から検索）
 *
 * @remarks
 * keyId は test-keys/encryption/ のファイル名（拡張子なし）と一致する。
 */
export const getKey = async (req: Request, res: Response): Promise<void> => {
  const { keyId } = req.params;
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  try {
    const keyNames = await testKeyLoader.listEncryptionKeyNames();
    const found = keyNames.find((name) => name === keyId);
    if (!found) {
      notFound(res, `鍵が見つかりません: ${keyId}`);
      return;
    }
    ok(res, { key: buildKeyResponseFromFile(found) });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 鍵作成（後方互換 POST /keys — DB不使用）
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/keys
 * 鍵作成リクエスト（テストモードでは固定鍵情報を返す）
 *
 * @remarks
 * テストモードではDBへの書き込みを行わない。
 * リクエストされたアルゴリズムに対応する固定鍵情報を返す。
 */
export const createKey = async (req: Request, res: Response): Promise<void> => {
  const { keyName, algorithm } = req.body as {
    keyName: string;
    algorithm: string;
  };
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  if (!keyName || !algorithm) {
    badRequest(res, 'E1003', '鍵名とアルゴリズムは必須です');
    return;
  }

  try {
    const normalizedAlg = normalizeFrontAlgorithm(algorithm);

    // アルゴリズムに対応する固定鍵ファイル名を返す
    const fixedKeyName = normalizedAlg === 'aes-128-cbc'
      ? 'test-encryption-key-aes128'
      : 'test-encryption-key-aes256';

    const key: EncryptionKeyResponse = {
      ...buildKeyResponseFromFile(fixedKeyName),
      // リクエストの keyName と algorithm を反映して返す
      keyName,
      algorithm: toFrontAlgorithm(normalizedAlg),
    };

    res.status(201).json({
      success: true,
      data: { key },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 鍵削除（固定鍵は削除不可）
// ---------------------------------------------------------------------------

/**
 * DELETE /api/v1/encryption/keys/:keyId
 * 暗号化鍵削除（テストモードでは固定鍵のため削除不可）
 *
 * @remarks
 * テストモードでは test-keys/ の固定ファイルを参照するため、削除操作は行えない。
 * 409 を返して削除不可であることを伝える。
 */
export const deleteKey = async (req: Request, res: Response): Promise<void> => {
  const { keyId } = req.params;
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  try {
    const keyNames = await testKeyLoader.listEncryptionKeyNames();
    const found = keyNames.find((name) => name === keyId);
    if (!found) {
      notFound(res, `鍵が見つかりません: ${keyId}`);
      return;
    }

    // テストモードでは固定鍵ファイルのため削除不可
    res.status(409).json({
      success: false,
      error: {
        code: 'E7002',
        message: 'テストモードでは固定鍵ファイルのため削除できません（backend/test-keys/encryption/ を直接操作してください）',
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 鍵エクスポート
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/keys/:keyId/export
 * 指定した鍵を .key 形式でエクスポート
 *
 * @remarks
 * テストモードでは test-keys/encryption/ から鍵バイト列を読み込み、
 * Base64 エンコードして返す（パスワード保護はスタブ実装）。
 */
export const exportKey = async (req: Request, res: Response): Promise<void> => {
  const { keyId } = req.params as { keyId: string };
  const { password } = req.body as { password: string };
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  if (!password) {
    badRequest(res, 'E1003', 'パスワードは必須です');
    return;
  }

  try {
    // keyId に対応するアルゴリズムを判定
    const algorithm = keyId.includes('aes128') ? 'aes-128-cbc' as const : 'aes-256-cbc' as const;

    // test-keys/ から鍵バイト列を読み込む
    const keyBuffer = await testKeyLoader.loadEncryptionKeyByAlgorithm(algorithm);
    if (!keyBuffer) {
      notFound(res, `鍵ファイルが見つかりません: ${keyId}（npx ts-node backend/scripts/generate-test-keys.ts を実行してください）`);
      return;
    }

    // TODO: 本実装 — AES-256-CBC でパスワード暗号化して返す
    // 現状はBase64エンコードのみ（パスワード保護はスタブ）
    const fileContent = Buffer.from(
      JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        algorithm: toFrontAlgorithm(algorithm),
        keyId,
        encryptedKeyMaterial: keyBuffer.toString('base64'),
        _note: 'テストモード: パスワード保護は実装中',
      }),
    ).toString('base64');

    const fileName = `${keyId}.key`;
    ok(res, { fileContent, fileName });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 鍵インポート（テストモードでは固定鍵情報を返す）
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/keys/import
 * .key / .pem / .pfx 形式の外部ファイルを取り込む（テストモードではスタブ）
 *
 * @remarks
 * テストモードではアップロードされたファイルは実際には使用しない。
 * test-keys/ の固定鍵情報を返す。
 */
export const importKey = async (req: Request, res: Response): Promise<void> => {
  const { fileName, fileContent } = req.body as {
    fileName: string;
    fileContent: string;
    description?: string;
  };
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  if (!fileName || !fileContent) {
    badRequest(res, 'E1003', 'ファイル名とファイル内容は必須です');
    return;
  }

  const ext = fileName.toLowerCase().split('.').pop();
  if (!['key', 'pem', 'pfx'].includes(ext ?? '')) {
    badRequest(res, 'E1002', '.key, .pem, .pfx 形式のファイルのみインポート可能です');
    return;
  }

  try {
    // テストモードでは常に固定鍵情報を返す
    const key: EncryptionKeyResponse = {
      ...buildKeyResponseFromFile('test-encryption-key-aes256'),
      keyName: fileName.replace(/\.(key|pem|pfx)$/i, ''),
      description: `${fileName} からインポート（テストモード: test-keys/encryption/test-encryption-key-aes256.key を使用）`,
    };

    res.status(201).json({
      success: true,
      data: { key },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 鍵ローテーション（スタブ）
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/keys/:keyId/rotate
 * 選択した鍵で暗号化された EncryptedData を全て新しい鍵で再暗号化
 *
 * @remarks
 * 【TODO: 本実装】バックグラウンドジョブで再暗号化を実行する。
 * テストモードでは not_implemented を返す。
 */
export const rotateKey = async (req: Request, res: Response): Promise<void> => {
  const { keyId } = req.params;
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  try {
    const keyNames = await testKeyLoader.listEncryptionKeyNames();
    const found = keyNames.find((name) => name === keyId);
    if (!found) {
      notFound(res, `鍵が見つかりません: ${keyId}`);
      return;
    }

    ok(res, {
      jobId: undefined,
      targetCount: 0,
      status: 'not_implemented',
      message: '鍵ローテーション機能は現在実装中です。本機能は近日中に提供予定です。',
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 鍵生成（POST /keys/generate — テストモードでは固定鍵情報を返す）
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/keys/generate
 * AES 鍵生成リクエスト（テストモードでは固定鍵情報を返す）
 *
 * @remarks
 * テストモードではDBへの書き込みを行わない。
 * リクエストされたアルゴリズムに対応する固定鍵ファイル情報を返す。
 */
export const generateKey = async (req: Request, res: Response): Promise<void> => {
  const { keyName, algorithm, description, expiresAt } = req.body as {
    keyName: string;
    algorithm: string;
    description?: string;
    expiresAt?: string;
  };
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  if (!keyName || !algorithm) {
    badRequest(res, 'E1003', '鍵名とアルゴリズムは必須です');
    return;
  }

  try {
    const normalizedAlg = normalizeFrontAlgorithm(algorithm);

    // テストモード: 対応する固定鍵ファイルが存在するか確認
    const fixedKeyName = normalizedAlg === 'aes-128-cbc'
      ? 'test-encryption-key-aes128'
      : 'test-encryption-key-aes256';

    const keyBuffer = await testKeyLoader.loadEncryptionKeyByAlgorithm(normalizedAlg);
    if (!keyBuffer) {
      serverError(
        res,
        new Error(
          `テスト鍵ファイルが見つかりません: backend/test-keys/encryption/${fixedKeyName}.key\n` +
          'npx ts-node backend/scripts/generate-test-keys.ts を実行してください',
        ),
      );
      return;
    }

    const response: KeyOperationResponse = {
      keyId: fixedKeyName,
      keyIdentifier: fixedKeyName.substring(0, 16),
      fileName: `${fixedKeyName}.key`,
      algorithm: toFrontAlgorithm(normalizedAlg),
      keySource: 'load_file',
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 鍵ファイルアップロード（テストモードでは固定鍵情報を返す）
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/keys/upload
 * 鍵ファイルアップロードリクエスト（テストモードでは固定鍵情報を返す）
 *
 * @remarks
 * テストモードではアップロードされたファイルは実際には使用しない。
 * リクエストされたアルゴリズムに対応する固定鍵情報を返す。
 */
export const uploadKeyFile = async (req: Request, res: Response): Promise<void> => {
  const { keyName, algorithm, keySource } = req.body as {
    keyName: string;
    algorithm: string;
    keySource: 'load_file' | 'public_key';
  };
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  if (!keyName || !algorithm) {
    badRequest(res, 'E1003', '鍵名とアルゴリズムは必須です');
    return;
  }

  try {
    const normalizedAlg = normalizeFrontAlgorithm(algorithm);
    const fixedKeyName = normalizedAlg === 'aes-128-cbc'
      ? 'test-encryption-key-aes128'
      : 'test-encryption-key-aes256';

    const response: KeyOperationResponse = {
      keyId: fixedKeyName,
      keyIdentifier: fixedKeyName.substring(0, 16),
      fileName: `${fixedKeyName}.key`,
      algorithm: toFrontAlgorithm(normalizedAlg),
      keySource: keySource ?? 'load_file',
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// UPA 制約チェック
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/upa-check
 * UPA（Unique Particle Attribution）制約チェックを実行
 */
export const checkUpaConstraints = async (req: Request, res: Response): Promise<void> => {
  const { projectName, targetPath, encryptionLevel } = req.body as {
    projectName: string;
    targetPath: string;
    encryptionLevel: string;
  };

  if (!projectName || !targetPath || !encryptionLevel) {
    badRequest(res, 'E1003', 'projectName, targetPath, encryptionLevel は必須です');
    return;
  }

  try {
    const result = await maimlEncryptionService.validateEncryptionScope(targetPath);

    const response: UpaCheckResponse = {
      isValid: result.isValid,
      violations: result.isValid ? [] : [
        {
          elementPath: targetPath,
          message: result.message ?? 'UPA 制約に違反しています',
        },
      ],
    };

    ok(res, response);
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// insertion 存在確認
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/encryption/check-insertion/:projectName/:nodePath
 * 選択ノードの子要素に <insertion> が含まれるか確認
 */
export const checkInsertion = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const nodePath = decodeURIComponent(req.params.nodePath ?? '');
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  try {
    const xmlContent = await getMaimlContent(organizationId, projectName);
    if (!xmlContent) {
      notFound(res, `プロジェクト "${projectName}" のMAIMLファイルが見つかりません`);
      return;
    }

    // nodePath で指定した要素の XML を抽出してから extractInsertionRefs を呼ぶ
    // nodePath が指定されていれば部分XML、なければ全体に対して検索する
    let targetXml = xmlContent;
    if (nodePath) {
      const elementXml = getElementXmlByTargetPath(xmlContent, nodePath);
      if (elementXml) {
        targetXml = elementXml;
      }
    }
    const refs = maimlEncryptionService.extractInsertionRefs(targetXml);

    const response: InsertionCheckResponse = {
      hasInsertion: refs.length > 0,
      insertionCount: refs.length,
    };

    ok(res, response);
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 暗号化済み子要素一覧
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/encryption/projects/:projectName/encrypted-children
 * 対象MAIMLファイルに含まれる全ての暗号化済み要素一覧を返す
 *
 * @remarks
 * 【TODO: 本実装】MAIMLファイルをパースして全 EncryptedData 要素を収集する。
 */
export const getEncryptedChildren = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  try {
    const xmlContent = await getMaimlContent(organizationId, projectName);
    if (!xmlContent) {
      notFound(res, `プロジェクト "${projectName}" のMAIMLファイルが見つかりません`);
      return;
    }

    // MAIMLをパースして全 EncryptedData 要素を収集
    const elements = findEncryptedDataElements(xmlContent);
    ok(res, { elements });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 復号化プレビュー
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/projects/:projectName/decrypt-preview
 * 復号化プレビューXMLを返す（ファイルは保存しない）
 *
 * リクエストボディ:
 *   - targetPath: string    復号化対象のXPathパス
 *   - keyId: string         使用する鍵ID（test-keys/ のファイル名）
 *   - algorithm?: string    暗号化に使用したアルゴリズム（省略時: aes256-cbc）
 */
export const decryptPreview = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const { targetPath, keyId, algorithm } = req.body as {
    targetPath: string;
    keyId: string;
    algorithm?: string;
    password?: string;
  };
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  if (!targetPath || !keyId) {
    badRequest(res, 'E1003', 'targetPath と keyId は必須です');
    return;
  }

  try {
    // algorithm から EncryptionPolicy を構築
    const normalizedAlg = normalizeFrontAlgorithm(algorithm);
    const policy: EncryptionPolicy = {
      ...DEFAULT_ENCRYPTION_POLICY,
      algorithm: normalizedAlg,
    };

    // test-keys/ から algorithm に対応する固定鍵を取得
    const keyEntry = await maimlEncryptionService.retrieveKeyForDecryption(keyId, policy);
    if (!keyEntry) {
      notFound(res, `鍵が見つかりません（keyId=${keyId}, algorithm=${normalizedAlg}）。test-keys/encryption/ に鍵ファイルが存在するか確認してください。`);
      return;
    }

    const xmlContent = await getMaimlContent(organizationId, projectName);
    if (!xmlContent) {
      notFound(res, `プロジェクト "${projectName}" のMAIMLファイルが見つかりません`);
      return;
    }

    // targetPath の <EncryptedData> 要素の XML を取得 → before
    const encDataXml = getElementXmlByTargetPath(xmlContent, targetPath);
    if (!encDataXml) {
      notFound(res, `対象要素が見つかりません: ${targetPath}`);
      return;
    }

    // before = 現在の <EncryptedData> XML
    const beforeXml = encDataXml;

    // <EncryptedData> から CipherResult を抽出して実際に復号化
    const cipherResult = extractCipherResultFromXml(encDataXml);
    let afterXml: string;
    if (!cipherResult) {
      afterXml = `<!-- EncryptedData の解析に失敗しました。有効な xenc:EncryptedData 要素か確認してください -->`;
    } else {
      try {
        afterXml = maimlEncryptionService.decryptElement(keyEntry, cipherResult);
      } catch (decErr) {
        const msg = decErr instanceof Error ? decErr.message : '復号化に失敗しました';
        afterXml = `<!-- 復号化エラー: ${msg} -->`;
      }
    }

    // プレビューなのでファイルは保存しない
    ok(res, { beforeXml, afterXml });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 復号化実行
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/encryption/projects/:projectName/decrypt-execute
 * 復号化を実行してMAIMLファイルを更新する
 *
 * リクエストボディ:
 *   - targetPath: string    復号化対象のXPathパス（単数）
 *   - targetPaths?: string[] 復号化対象のXPathリスト（複数）
 *   - keyId: string         使用する鍵ID（test-keys/ のファイル名）
 *   - algorithm?: string    暗号化に使用したアルゴリズム（省略時: aes256-cbc）
 */
export const executeDecrypt = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const { targetPath, targetPaths, keyId, algorithm } = req.body as {
    targetPath?: string;
    targetPaths?: string[];
    keyId: string;
    algorithm?: string;
    password?: string;
  };
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  // targetPaths（複数）または targetPath（単数）を取得
  const paths: string[] = targetPaths ?? (targetPath ? [targetPath] : []);
  if (paths.length === 0) {
    badRequest(res, 'E1003', 'targetPath または targetPaths は必須です');
    return;
  }

  if (!keyId) {
    badRequest(res, 'E1003', 'keyId は必須です');
    return;
  }

  try {
    // algorithm から EncryptionPolicy を構築
    const normalizedAlg = normalizeFrontAlgorithm(algorithm);
    const policy: EncryptionPolicy = {
      ...DEFAULT_ENCRYPTION_POLICY,
      algorithm: normalizedAlg,
    };

    // test-keys/ から algorithm に対応する固定鍵を取得
    const keyEntry = await maimlEncryptionService.retrieveKeyForDecryption(keyId, policy);
    if (!keyEntry) {
      notFound(res, `鍵が見つかりません（keyId=${keyId}, algorithm=${normalizedAlg}）。test-keys/encryption/ に鍵ファイルが存在するか確認してください。`);
      return;
    }

    const xmlContent = await getMaimlContent(organizationId, projectName);
    if (!xmlContent) {
      notFound(res, `プロジェクト "${projectName}" のMAIMLファイルが見つかりません`);
      return;
    }

    // 各 targetPath に対して復号処理し、XML を逐次書き換え
    let updatedXml = xmlContent;
    const decryptedResults: Array<{
      targetPath: string;
      success: boolean;
      error?: string;
      warning?: string;
    }> = [];

    try {
      for (const tp of paths) {
        // targetPath の <EncryptedData> 要素の XML を取得
        const encDataXml = getElementXmlByTargetPath(updatedXml, tp);
        if (!encDataXml) {
          decryptedResults.push({
            targetPath: tp,
            success: false,
            error: `対象要素が見つかりません: ${tp}`,
          });
          continue;
        }

        // <EncryptedData> から CipherResult を抽出
        const cipherResult = extractCipherResultFromXml(encDataXml);
        if (!cipherResult) {
          decryptedResults.push({
            targetPath: tp,
            success: false,
            error: `EncryptedData の解析に失敗しました: ${tp}（有効な xenc:EncryptedData 要素か確認してください）`,
          });
          continue;
        }

        // 復号実行
        const decryptedXml = maimlEncryptionService.decryptElement(keyEntry, cipherResult);

        // XML 内の <EncryptedData> を復号した要素で置換
        const { updated, replaced } = replaceElementInXml(updatedXml, tp, decryptedXml);
        updatedXml = updated;

        decryptedResults.push({
          targetPath: tp,
          success: replaced,
          ...(replaced ? {} : { warning: '要素の置換に失敗しました（targetPath の形式を確認してください）' }),
        });
      }
    } finally {
      // 復号後に必ず鍵を廃棄（問題6: disposeKey が復号側で呼ばれていなかった）
      maimlEncryptionService.disposeKey(keyEntry.keyId);
    }

    // 更新後の XML を MAIML ファイルとして保存
    const { updatedFilePath } = await saveMaimlContent(
      organizationId,
      projectName,
      updatedXml,
    );

    ok(res, {
      success: true,
      decryptedCount: decryptedResults.filter((r) => r.success).length,
      results: decryptedResults,
      updatedFilePath,
    });
  } catch (err) {
    serverError(res, err);
  }
};
