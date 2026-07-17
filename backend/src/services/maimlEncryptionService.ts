/**
 * 秘匿化機能 Service
 *
 * @remarks
 * MAIMLファイル要素の暗号化・復号・鍵管理・Insertion連携を担う。
 *
 * 【現在の状態】仮実装（`EncryptionPolicy.keyProvider = 'local-dummy'` のみ動作）
 *
 * 【本実装への移行手順】
 * 1. `EncryptionPolicy` の `keyProvider` / `auditTarget` を変更する
 * 2. 各メソッド内の switch 分岐に対応するプロバイダの処理を追加する
 * 3. `local-dummy` の仮実装コードは必要に応じて残す（回帰テスト用）
 *
 * 【一連の動作フロー（仮実装で動作確認可能）】
 * 1. generateKey(policy)                     → { keyId, ... }
 * 2. encryptElement(keyId, xmlElement, policy) → CipherResult
 * 3. retrieveKeyForDecryption(keyId, policy)  → KeyEntry
 * 4. decryptElement(keyEntry, cipherResult)   → 平文 XML 文字列
 * 5. disposeKey(keyId)                        → ゼロクリア
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type {
  EncryptionPolicy,
  KeyEntry,
  CipherResult,
  InsertionRefs,
  EncryptionScopeValidationResult,
} from '../types/encryptionTypes';
import {
  DEFAULT_ENCRYPTION_POLICY,
  ALGORITHM_URI_MAP,
} from '../types/encryptionTypes';
import * as testKeyLoader from '../utils/testKeyLoader';

// ---------------------------------------------------------------------------
// 簡易鍵ストア（プロセス内インメモリ）
// ---------------------------------------------------------------------------

/**
 * モジュール内の簡易鍵ストア
 *
 * @remarks
 * プロセス再起動でリセットされる。
 * 本実装では KMS / S3 等の外部ストレージに置き換える。
 */
const keyStore = new Map<string, KeyEntry>();

// ---------------------------------------------------------------------------
// 鍵取得
// ---------------------------------------------------------------------------

/**
 * 暗号化用に新規の鍵（共通鍵）を生成する。
 *
 * @remarks
 * 【local-file】test-keys/encryption/{keyName}.key を読み込んで鍵エントリを生成。
 *   - テストモード（NODE_ENV !== production）でのみ動作。
 *   - 本番モードでは null を返す（呼び出し元で no-op 処理を行う）。
 * 【local-dummy】ローカルでランダムな AES-256 鍵を生成（非推奨）。
 * 【本実装】`policy.keyProvider` に応じて以下に切り替える:
 *   - `aws-kms`: KMS の GenerateDataKey を呼び出す
 *   - `ecdh`: ECDH 鍵導出を行う
 *
 * @param policy 暗号化ポリシー（省略時: DEFAULT_ENCRYPTION_POLICY）
 * @param keyName 鍵ファイルのベース名（local-file の場合のみ使用、省略時 'test-key'）
 * @returns 生成された鍵エントリ。本番モードまたは鍵ファイルなしの場合は null。
 */
export async function generateKey(
  policy: EncryptionPolicy = DEFAULT_ENCRYPTION_POLICY,
  // keyName は local-file では無視される（固定ファイルを使用）。後方互換のため引数を保持。
  _keyName: string = 'test-key',
): Promise<KeyEntry | null> {
  switch (policy.keyProvider) {
    case 'local-file': {
      // テストモードでは常にアルゴリズム別の固定ファイルを使用する
      // （DBの keyId やアップロードファイル名は無視）
      const keyBuffer = await testKeyLoader.loadEncryptionKeyByAlgorithm(policy.algorithm);
      if (!keyBuffer) {
        // 本番モード、またはファイルが存在しない場合は null を返す
        return null;
      }
      const keyId = `file:fixed:${policy.algorithm}`;
      const entry: KeyEntry = {
        keyId,
        keyBuffer,
        algorithm: policy.algorithm,
        createdAt: new Date().toISOString(),
      };
      keyStore.set(keyId, entry);
      return entry;
    }
    case 'local-dummy': {
      // アルゴリズムに応じた正しい鍵長でランダム生成
      const keyLength = policy.algorithm === 'aes-128-cbc' ? 16 : 32;
      const keyBuffer = crypto.randomBytes(keyLength);
      const keyId = uuidv4();
      const entry: KeyEntry = {
        keyId,
        keyBuffer,
        algorithm: policy.algorithm,
        createdAt: new Date().toISOString(),
      };
      keyStore.set(keyId, entry);
      return entry;
    }
    case 'aws-kms':
      // TODO: 本実装 — KMS の GenerateDataKey を呼び出す
      throw new Error('未実装: keyProvider=aws-kms は本実装フェーズで対応します');
    case 'ecdh':
      // TODO: 本実装 — ECDH 鍵導出を行う
      throw new Error('未実装: keyProvider=ecdh は本実装フェーズで対応します');
    default: {
      const _exhaustive: never = policy.keyProvider;
      throw new Error(`未知の keyProvider: ${_exhaustive}`);
    }
  }
}

/**
 * 復号時に、指定 keyId に対応する鍵を取得する。
 *
 * @remarks
 * 【local-file】keyId は 'file:{keyName}' 形式。インメモリストアにあればそれを返す。
 *   なければ test-keys/encryption/{keyName}.key から再読み込みする。
 *   本番モードでは null を返す。
 * 【local-dummy】generateKey() で保存した鍵をインメモリストアから返す（テスト用）。
 * 【本実装】`policy.keyProvider` に応じて KMS Decrypt 等に切り替える。
 *
 * @param keyId 取得する鍵 ID
 * @param policy 暗号化ポリシー（省略時: DEFAULT_ENCRYPTION_POLICY）
 * @returns 鍵エントリ（見つからない場合または本番モードの場合は null）
 */
export async function retrieveKeyForDecryption(
  keyId: string,
  policy: EncryptionPolicy = DEFAULT_ENCRYPTION_POLICY,
): Promise<KeyEntry | null> {
  switch (policy.keyProvider) {
    case 'local-file': {
      // インメモリストアにキャッシュがあればそれを使う
      const cached = keyStore.get(keyId);
      if (cached) return cached;

      // テストモードでは常にアルゴリズム別の固定ファイルを使用する
      // （DBの keyId やアップロードファイル名は無視）
      const keyBuffer = await testKeyLoader.loadEncryptionKeyByAlgorithm(policy.algorithm);
      if (!keyBuffer) {
        return null;
      }
      // 固定ファイル由来の keyId に正規化して保存
      const fixedKeyId = `file:fixed:${policy.algorithm}`;
      const entry: KeyEntry = {
        keyId: fixedKeyId,
        keyBuffer,
        algorithm: policy.algorithm,
        createdAt: new Date().toISOString(),
      };
      keyStore.set(fixedKeyId, entry);
      return entry;
    }
    case 'local-dummy': {
      const entry = keyStore.get(keyId) ?? null;
      return entry;
    }
    case 'aws-kms':
      throw new Error('未実装: keyProvider=aws-kms は本実装フェーズで対応します');
    case 'ecdh':
      throw new Error('未実装: keyProvider=ecdh は本実装フェーズで対応します');
    default: {
      const _exhaustive: never = policy.keyProvider;
      throw new Error(`未知の keyProvider: ${_exhaustive}`);
    }
  }
}

/**
 * 使用済みの鍵をメモリから消去する（ゼロクリア）。
 *
 * @remarks
 * 【仮実装時の挙動】keyStore から削除し、Buffer をゼロクリアする。
 * 【本実装】プロバイダに依らずこのゼロクリア処理は共通で必要。
 *
 * @param keyId 廃棄する鍵 ID
 */
export function disposeKey(keyId: string): void {
  const entry = keyStore.get(keyId);
  if (entry) {
    // Buffer をゼロクリアして GC 後もメモリ上に残らないようにする
    entry.keyBuffer.fill(0);
    keyStore.delete(keyId);
  }
}

// ---------------------------------------------------------------------------
// 暗号化
// ---------------------------------------------------------------------------

/**
 * 対象要素が暗号化可能なスコープ（UPA 制約）に適合するかを検証する。
 *
 * @remarks
 * 【仮実装時の挙動】常に isValid: true を返す（スタブ）。
 * 【本実装】対象 XML 要素のパスが「グローバル要素全体（uuid を除く）」または
 *   「汎用データコンテナのコンテンツ全体」であることを検証する。
 *   この検証を経ずに暗号化すると UPA 制約に違反した MaiML ファイルが生成される可能性がある。
 *
 * @param targetElement 検証対象の XML 要素文字列または XPath
 * @returns スコープ検証結果
 */
export function validateEncryptionScope(
  targetElement: string,
): EncryptionScopeValidationResult {
  // TODO: 本実装 — XPath を解析し UPA 制約への適合を確認する
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void targetElement;
  return {
    isValid: true,
  };
}

/**
 * 対象の MaiML XML 要素を暗号化し `<CipherData>` 相当の結果を生成する。
 *
 * @remarks
 * 【仮実装時の挙動】AES-256-CBC で固定。
 * 【精査ポイント】アルゴリズムは policy.algorithm から決定し、関数内にハードコードしない。
 *
 * @param keyEntry 使用する鍵エントリ（generateKey / retrieveKeyForDecryption の戻り値）
 * @param xmlElement 暗号化対象の XML 要素文字列
 * @param policy 暗号化ポリシー（省略時: DEFAULT_ENCRYPTION_POLICY）
 * @returns 暗号化結果（CipherData 相当）
 */
export function encryptElement(
  keyEntry: KeyEntry,
  xmlElement: string,
  policy: EncryptionPolicy = DEFAULT_ENCRYPTION_POLICY,
): CipherResult {
  const algorithmUri = ALGORITHM_URI_MAP[policy.algorithm];
  const encryptionId = `enc-${uuidv4()}`;
  const encryptedAt = new Date().toISOString();

  switch (policy.algorithm) {
    case 'aes-256-cbc': {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', keyEntry.keyBuffer, iv);
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(xmlElement, 'utf8')),
        cipher.final(),
      ]);
      // IV(16) を先頭に付与した形式で Base64 エンコード
      const cipherValueBase64 = Buffer.concat([iv, encrypted]).toString('base64');
      return {
        encryptionId,
        keyId: keyEntry.keyId,
        cipherValueBase64,
        algorithmUri,
        encryptedAt,
      };
    }
    case 'aes-128-cbc': {
      // AES-128-CBC: 鍵長 16 bytes、IV 16 bytes
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-128-cbc', keyEntry.keyBuffer, iv);
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(xmlElement, 'utf8')),
        cipher.final(),
      ]);
      // IV(16) を先頭に付与した形式で Base64 エンコード
      const cipherValueBase64 = Buffer.concat([iv, encrypted]).toString('base64');
      return {
        encryptionId,
        keyId: keyEntry.keyId,
        cipherValueBase64,
        algorithmUri,
        encryptedAt,
      };
    }
    case 'aes-256-gcm': {
      const iv = crypto.randomBytes(12); // GCM の推奨 IV は 96bit
      const cipher = crypto.createCipheriv('aes-256-gcm', keyEntry.keyBuffer, iv) as crypto.CipherGCM;
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(xmlElement, 'utf8')),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      // IV(12) + AuthTag(16) + 暗号文 の順で結合
      const cipherValueBase64 = Buffer.concat([iv, authTag, encrypted]).toString('base64');
      return {
        encryptionId,
        keyId: keyEntry.keyId,
        cipherValueBase64,
        algorithmUri,
        encryptedAt,
      };
    }
    default: {
      const _exhaustive: never = policy.algorithm;
      throw new Error(`未知のアルゴリズム: ${_exhaustive}`);
    }
  }
}

/**
 * 暗号化された `<CipherData>` を復号して元の XML 要素文字列を復元する。
 *
 * @remarks
 * 【精査ポイント】使用アルゴリズムは `cipherResult.algorithmUri` から判定する。
 *
 * @param keyEntry 復号に使用する鍵エントリ
 * @param cipherResult 暗号化結果（encryptElement の戻り値）
 * @returns 復号された XML 要素文字列
 */
export function decryptElement(
  keyEntry: KeyEntry,
  cipherResult: CipherResult,
): string {
  const cipherBuffer = Buffer.from(cipherResult.cipherValueBase64, 'base64');

  if (cipherResult.algorithmUri === ALGORITHM_URI_MAP['aes-256-cbc']) {
    const iv = cipherBuffer.subarray(0, 16);
    const encrypted = cipherBuffer.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyEntry.keyBuffer, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  if (cipherResult.algorithmUri === ALGORITHM_URI_MAP['aes-128-cbc']) {
    // AES-128-CBC: IV(16) + 暗号文 の形式
    const iv = cipherBuffer.subarray(0, 16);
    const encrypted = cipherBuffer.subarray(16);
    const decipher = crypto.createDecipheriv('aes-128-cbc', keyEntry.keyBuffer, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  if (cipherResult.algorithmUri === ALGORITHM_URI_MAP['aes-256-gcm']) {
    const iv = cipherBuffer.subarray(0, 12);
    const authTag = cipherBuffer.subarray(12, 28);
    const encrypted = cipherBuffer.subarray(28);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      keyEntry.keyBuffer,
      iv,
    ) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  throw new Error(`未知のアルゴリズム URI: ${cipherResult.algorithmUri}`);
}

/**
 * 使用した暗号化アルゴリズムの URI（W3C xmlenc-core1 準拠）を返す。
 *
 * @remarks
 * 【仮実装でも必ずこの情報を残す】
 * 後でアルゴリズムを変更しても、過去に暗号化したファイルの復号方法が分かる。
 *
 * @param policy 暗号化ポリシー（省略時: DEFAULT_ENCRYPTION_POLICY）
 * @returns アルゴリズム URI
 */
export function getAlgorithmIdentifier(
  policy: EncryptionPolicy = DEFAULT_ENCRYPTION_POLICY,
): string {
  return ALGORITHM_URI_MAP[policy.algorithm];
}

// ---------------------------------------------------------------------------
// Insertion 要素連携
// ---------------------------------------------------------------------------

/**
 * 暗号化対象要素が `<insertion>` 要素を含むか判定し、含む場合は参照情報を取得する。
 *
 * @remarks
 * 【仮実装時の挙動】対象要素の insertion 有無を判定し値を取得する（新規）。
 * 現時点では XML 解析は行わず、`<insertion>` タグの有無を文字列で簡易判定する。
 * 【本実装】XML パーサーで正確に解析する。
 *
 * @param targetElement 対象の XML 要素文字列
 * @returns insertion が存在する場合は InsertionRefs の配列、存在しない場合は空配列
 */
export function extractInsertionRefs(
  targetElement: string,
): InsertionRefs[] {
  // TODO: 本実装 — XML パーサーで <insertion> 要素を正確に解析する
  if (!targetElement.includes('<insertion')) {
    return [];
  }

  // 仮実装: <uri>, <hash>, <uuid> タグの値を正規表現で簡易抽出
  const uriMatches = [...targetElement.matchAll(/<uri[^>]*>([^<]+)<\/uri>/g)];
  const hashMatches = [...targetElement.matchAll(/<hash[^>]*>([^<]+)<\/hash>/g)];
  const uuidMatches = [...targetElement.matchAll(/<uuid[^>]*>([^<]+)<\/uuid>/g)];

  const count = Math.min(uriMatches.length, hashMatches.length, uuidMatches.length);
  const refs: InsertionRefs[] = [];
  for (let i = 0; i < count; i++) {
    refs.push({
      uri: uriMatches[i][1].trim(),
      hash: hashMatches[i][1].trim(),
      uuid: uuidMatches[i][1].trim(),
    });
  }
  return refs;
}

/**
 * 取得した Insertion 参照情報を `<childUri>` / `<childHash>` / `<childUuid>` として書き出す。
 *
 * @remarks
 * 【仮実装時の挙動】childUri / childHash / childUuid を含む XML フラグメント文字列を生成する（新規）。
 * 【本実装】`<EncryptedData>` 要素の直前に挿入するよう XML 操作を行う。
 *
 * @param uri insertion 要素の URI 値
 * @param hash insertion 要素のハッシュ値
 * @param uuid insertion 要素の UUID 値
 * @returns 生成された XML フラグメント文字列
 */
export function writeChildRefs(uri: string, hash: string, uuid: string): string {
  // TODO: 本実装 — XML ドキュメントの <EncryptedData> 直前に挿入する
  return [
    `<childUri>${uri}</childUri>`,
    `<childHash>${hash}</childHash>`,
    `<childUuid>${uuid}</childUuid>`,
  ].join('\n');
}
