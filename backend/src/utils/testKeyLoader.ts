/**
 * テストモード用 鍵ファイル読み込みユーティリティ
 *
 * @remarks
 * NODE_ENV !== 'production' の場合のみ、`backend/test-keys/` 配下の
 * 鍵ファイルを読み込む。本番モードでは常に `null` を返す。
 *
 * ディレクトリ構成:
 *   backend/test-keys/
 *     encryption/
 *       test-encryption-key-aes256.key  ← AES-256鍵（32byte raw binary）共用: CBC/GCM
 *       test-encryption-key-aes128.key  ← AES-128鍵（16byte raw binary）
 *       test-encryption-key.key         ← 旧互換ファイル（32byte）
 *     signing/
 *       {keyName}.pem   ← RSA秘密鍵（PKCS#8 PEM形式）
 *       {keyName}.pub.pem ← RSA公開鍵（SPKI PEM形式）
 *
 * 使い方:
 *   1. `npx ts-node backend/scripts/generate-test-keys.ts` でテスト鍵を生成する
 *   2. 生成された鍵ファイルはgitignoreされているため、各開発環境で1回実行が必要
 *
 * テストモード時の固定鍵参照について:
 *   `loadEncryptionKeyByAlgorithm(algorithm)` を使用することで、
 *   アルゴリズムに応じた正しい鍵長のファイルが自動選択される。
 *   DBに登録された keyId やアップロードファイル名は無視される。
 */

import fs from 'fs';
import path from 'path';

// test-keys/ のルートパス（backend/ から見た相対パス）
const TEST_KEYS_DIR = path.resolve(__dirname, '../../test-keys');

/**
 * 現在がテストモードかどうかを判定する
 *
 * @returns NODE_ENV !== 'production' の場合 true
 */
function isTestMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * 暗号化用 AES 鍵ファイルを読み込む
 *
 * @param keyName 鍵ファイル名（拡張子 .key を除く）
 *   例: 'test-key' → `backend/test-keys/encryption/test-key.key` を読み込む
 * @returns テストモード: 鍵バイト列（Buffer）。ファイルが存在しない場合 null。
 *          本番モード: 常に null（処理スキップを促す）
 */
export async function loadEncryptionKey(keyName: string): Promise<Buffer | null> {
  if (!isTestMode()) {
    return null;
  }

  const filePath = path.join(TEST_KEYS_DIR, 'encryption', `${keyName}.key`);

  try {
    const data = await fs.promises.readFile(filePath);
    if (data.length < 16) {
      console.warn(`[testKeyLoader] 鍵ファイルが短すぎます（${data.length} bytes）: ${filePath}`);
      return null;
    }
    return data;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      console.warn(`[testKeyLoader] 鍵ファイルが見つかりません: ${filePath}`);
      console.warn(`[testKeyLoader] npx ts-node backend/scripts/generate-test-keys.ts を実行してください`);
    } else {
      console.error(`[testKeyLoader] 鍵ファイルの読み込みに失敗しました: ${filePath}`, err);
    }
    return null;
  }
}

/**
 * 署名用 RSA 秘密鍵ファイルを読み込む（PEM形式）
 *
 * @param keyName 鍵ファイル名（拡張子 .pem を除く）
 *   例: 'test-key' → `backend/test-keys/signing/test-key.pem` を読み込む
 * @returns テストモード: PEM形式の秘密鍵文字列。ファイルが存在しない場合 null。
 *          本番モード: 常に null（処理スキップを促す）
 */
export async function loadSigningKey(keyName: string): Promise<string | null> {
  if (!isTestMode()) {
    return null;
  }

  const filePath = path.join(TEST_KEYS_DIR, 'signing', `${keyName}.pem`);

  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    if (!data.includes('PRIVATE KEY')) {
      console.warn(`[testKeyLoader] 署名鍵ファイルの形式が不正です（PEM秘密鍵ではありません）: ${filePath}`);
      return null;
    }
    return data;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      console.warn(`[testKeyLoader] 署名鍵ファイルが見つかりません: ${filePath}`);
      console.warn(`[testKeyLoader] npx ts-node backend/scripts/generate-test-keys.ts を実行してください`);
    } else {
      console.error(`[testKeyLoader] 署名鍵ファイルの読み込みに失敗しました: ${filePath}`, err);
    }
    return null;
  }
}

/**
 * 署名検証用 RSA 公開鍵ファイルを読み込む（PEM形式）
 *
 * @param keyName 鍵ファイル名（拡張子 .pub.pem を除く）
 *   例: 'test-key' → `backend/test-keys/signing/test-key.pub.pem` を読み込む
 * @returns テストモード: PEM形式の公開鍵文字列。ファイルが存在しない場合 null。
 *          本番モード: 常に null
 */
export async function loadVerificationKey(keyName: string): Promise<string | null> {
  if (!isTestMode()) {
    return null;
  }

  const filePath = path.join(TEST_KEYS_DIR, 'signing', `${keyName}.pub.pem`);

  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    if (!data.includes('PUBLIC KEY')) {
      console.warn(`[testKeyLoader] 公開鍵ファイルの形式が不正です（PEM公開鍵ではありません）: ${filePath}`);
      return null;
    }
    return data;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      console.warn(`[testKeyLoader] 公開鍵ファイルが見つかりません: ${filePath}`);
    } else {
      console.error(`[testKeyLoader] 公開鍵ファイルの読み込みに失敗しました: ${filePath}`, err);
    }
    return null;
  }
}

/**
 * 署名用 RSA 秘密鍵ファイルを同期的に読み込む（PEM形式）
 *
 * @remarks
 * `getSigningPrivateKey` のように同期関数から呼ばれる場合に使用する。
 *
 * @param keyName 鍵ファイル名（拡張子 .pem を除く）。省略時は 'test-signing-key'
 * @returns テストモード: PEM形式の秘密鍵文字列。ファイルが存在しない場合 null。
 *          本番モード: 常に null
 */
export function loadSigningKeySync(keyName: string = 'test-signing-key'): string | null {
  if (!isTestMode()) {
    return null;
  }

  const filePath = path.join(TEST_KEYS_DIR, 'signing', `${keyName}.pem`);

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    if (!data.includes('PRIVATE KEY')) {
      console.warn(`[testKeyLoader] 署名鍵ファイルの形式が不正です（PEM秘密鍵ではありません）: ${filePath}`);
      return null;
    }
    return data;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      console.warn(`[testKeyLoader] 署名鍵ファイルが見つかりません: ${filePath}`);
      console.warn(`[testKeyLoader] npx ts-node backend/scripts/generate-test-keys.ts を実行してください`);
    } else {
      console.error(`[testKeyLoader] 署名鍵ファイルの読み込みに失敗しました: ${filePath}`, err);
    }
    return null;
  }
}

/**
 * 署名検証用 RSA 公開鍵ファイルを同期的に読み込む（PEM形式）
 *
 * @param keyName 鍵ファイル名（拡張子 .pub.pem を除く）。省略時は 'test-signing-key'
 * @returns テストモード: PEM形式の公開鍵文字列。ファイルが存在しない場合 null。
 *          本番モード: 常に null
 */
export function loadVerificationKeySync(keyName: string = 'test-signing-key'): string | null {
  if (!isTestMode()) {
    return null;
  }

  const filePath = path.join(TEST_KEYS_DIR, 'signing', `${keyName}.pub.pem`);

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    if (!data.includes('PUBLIC KEY')) {
      console.warn(`[testKeyLoader] 公開鍵ファイルの形式が不正です（PEM公開鍵ではありません）: ${filePath}`);
      return null;
    }
    return data;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      console.warn(`[testKeyLoader] 公開鍵ファイルが見つかりません: ${filePath}`);
    } else {
      console.error(`[testKeyLoader] 公開鍵ファイルの読み込みに失敗しました: ${filePath}`, err);
    }
    return null;
  }
}

/**
 * アルゴリズムに応じた固定テスト鍵ファイルを読み込む（テストモード専用）
 *
 * @remarks
 * テストモード時の暗号化・復号化では、DBの keyId やアップロードファイル名に関わらず
 * このメソッドで固定鍵ファイルを取得して使用する。
 *
 * アルゴリズムと鍵ファイルの対応:
 *   - 'aes-256-cbc' → test-encryption-key-aes256.key（32 bytes）
 *   - 'aes-256-gcm' → test-encryption-key-aes256.key（32 bytes）
 *   - 'aes-128-cbc' → test-encryption-key-aes128.key（16 bytes）
 *
 * フォールバック:
 *   アルゴリズム別ファイルが存在しない場合、旧互換ファイル
 *   `test-encryption-key.key` を試みる（AES-128以外のみ）。
 *
 * @param algorithm 暗号化アルゴリズム（EncryptionPolicy['algorithm']）
 * @returns テストモード: 鍵バイト列（Buffer）。ファイルが存在しない場合 null。
 *          本番モード: 常に null
 */
export async function loadEncryptionKeyByAlgorithm(
  algorithm: 'aes-256-cbc' | 'aes-128-cbc' | 'aes-256-gcm',
): Promise<Buffer | null> {
  if (!isTestMode()) {
    return null;
  }

  // アルゴリズム別の固定鍵ファイル名を決定
  const fixedKeyName = algorithm === 'aes-128-cbc'
    ? 'test-encryption-key-aes128'
    : 'test-encryption-key-aes256';

  const fixedKeyPath = path.join(TEST_KEYS_DIR, 'encryption', `${fixedKeyName}.key`);

  // まず固定鍵ファイルを試みる
  try {
    const data = await fs.promises.readFile(fixedKeyPath);
    // アルゴリズムごとの鍵長チェック
    const expectedLength = algorithm === 'aes-128-cbc' ? 16 : 32;
    if (data.length < expectedLength) {
      console.warn(
        `[testKeyLoader] 鍵ファイルの長さが不足しています` +
        `（期待: ${expectedLength} bytes, 実際: ${data.length} bytes）: ${fixedKeyPath}`,
      );
      return null;
    }
    return data;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.error(`[testKeyLoader] 鍵ファイルの読み込みに失敗しました: ${fixedKeyPath}`, err);
      return null;
    }
    // ENOENT の場合は旧互換ファイルにフォールバック（AES-128 は鍵長が違うためスキップ）
    if (algorithm === 'aes-128-cbc') {
      console.warn(
        `[testKeyLoader] AES-128 用鍵ファイルが見つかりません: ${fixedKeyPath}\n` +
        `[testKeyLoader] npx ts-node backend/scripts/generate-test-keys.ts を実行してください`,
      );
      return null;
    }
  }

  // 旧互換ファイル（test-encryption-key.key）へのフォールバック
  const legacyKeyPath = path.join(TEST_KEYS_DIR, 'encryption', 'test-encryption-key.key');
  console.warn(
    `[testKeyLoader] 固定鍵ファイルが見つからないため旧互換ファイルを使用します: ${legacyKeyPath}`,
  );
  try {
    const data = await fs.promises.readFile(legacyKeyPath);
    if (data.length < 32) {
      console.warn(`[testKeyLoader] 旧互換鍵ファイルが短すぎます（${data.length} bytes）: ${legacyKeyPath}`);
      return null;
    }
    return data;
  } catch (err2) {
    const code2 = (err2 as NodeJS.ErrnoException).code;
    if (code2 === 'ENOENT') {
      console.warn(
        `[testKeyLoader] 旧互換鍵ファイルも見つかりません: ${legacyKeyPath}\n` +
        `[testKeyLoader] npx ts-node backend/scripts/generate-test-keys.ts を実行してください`,
      );
    } else {
      console.error(`[testKeyLoader] 旧互換鍵ファイルの読み込みに失敗しました: ${legacyKeyPath}`, err2);
    }
    return null;
  }
}

/**
 * 利用可能な暗号化鍵の一覧を返す（テストモード専用）
 *
 * @returns テストモード: .key ファイルのベース名の配列（拡張子なし）
 *          本番モード: 空配列
 */
export async function listEncryptionKeyNames(): Promise<string[]> {
  if (!isTestMode()) {
    return [];
  }

  const dirPath = path.join(TEST_KEYS_DIR, 'encryption');

  try {
    const files = await fs.promises.readdir(dirPath);
    return files
      .filter((f) => f.endsWith('.key'))
      .map((f) => f.replace(/\.key$/, ''));
  } catch {
    return [];
  }
}

/**
 * 利用可能な署名鍵の一覧を返す（テストモード専用）
 *
 * @returns テストモード: .pem ファイルのベース名の配列（拡張子なし、公開鍵は除く）
 *          本番モード: 空配列
 */
export async function listSigningKeyNames(): Promise<string[]> {
  if (!isTestMode()) {
    return [];
  }

  const dirPath = path.join(TEST_KEYS_DIR, 'signing');

  try {
    const files = await fs.promises.readdir(dirPath);
    return files
      .filter((f) => f.endsWith('.pem') && !f.endsWith('.pub.pem'))
      .map((f) => f.replace(/\.pem$/, ''));
  } catch {
    return [];
  }
}
