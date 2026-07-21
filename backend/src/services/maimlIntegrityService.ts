/**
 * 改竄防止機能 Service
 *
 * @remarks
 * MAIMLファイルのハッシュ生成・署名・タイムスタンプ・証明書管理・監査を担う。
 *
 * 【現在の状態】仮実装
 *   - signatureProvider='local-dummy': インメモリ鍵ペアで署名
 *   - tsaProvider='local-mock': ローカル時刻を返すモックトークン（本番運用不可）
 *   - auditTarget='local-log': console.log で出力
 *
 * 【本実装への移行手順】
 * 1. `IntegrityPolicy` の各プロバイダ値を変更する
 * 2. 各メソッド内の switch 分岐に対応プロバイダの処理を追加する
 *
 * 【一連の動作フロー（仮実装で動作確認可能）】
 * 1. computeCanonicalHash(xmlDoc, policy) → CanonicalHashResult
 * 2. getSigningPrivateKey(policy)         → DummyPrivateKey
 * 3. signHash(privateKey, hash, signatureId) → SignatureResult
 * 4. getSigningPublicKey(policy)          → DummyPublicKey
 * 5. verifySignature(publicKey, hash, signatureValue) → SignatureVerifyResult
 * 6. buildTimestampRequest(signatureValue) → TimeStampReq
 * 7. requestTimestamp(request, policy)   → Rfc3161TimestampToken
 * 8. parseTimestampResponse(tsaResponse) → Rfc3161TimestampToken
 * 9. embedTimestampToken(signatureId, token) → void（インメモリ格納）
 * 10. extractTimestampToken(maimlFile, signatureId) → Rfc3161TimestampToken | null
 * 11. verifyTimestampToken(token)         → TimestampVerifyResult
 * 12. checkTimeConsistency(timestamp, creationDate) → TimeConsistencyResult
 * 13. validateSignerCertificate(cert)     → CertificateValidationResult
 * 14. validateTsaCertificate(cert)        → CertificateValidationResult
 * 15. recordTimestampRequest(...)         → void（監査ログ）
 * 16. recordVerificationResult(...)       → void（監査ログ）
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { DOMParser } from '@xmldom/xmldom';
import * as forge from 'node-forge';
import type { Pool } from 'pg';
import { loadSigningKeySync, loadVerificationKeySync } from '../utils/testKeyLoader';
import type {
  IntegrityPolicy,
  CanonicalHashResult,
  HashCompareResult,
  DummyPrivateKey,
  DummyPublicKey,
  SignatureResult,
  SignatureVerifyResult,
  TimestampVerifyResult,
  TimeConsistencyResult,
  CertificateValidationResult,
  TimestampRequestRecord,
  VerificationResultRecord,
  TimeStampReq,
  TimeStampResp,
  TSTInfo,
  Rfc3161TimestampToken,
} from '../types/integrityTypes';
import {
  DEFAULT_INTEGRITY_POLICY,
  HASH_ALGORITHM_URI_MAP,
  PKIStatus,
  OID,
} from '../types/integrityTypes';
import * as integrityAuditLogRepository from '../repositories/integrityAuditLogRepository';

// ---------------------------------------------------------------------------
// インメモリストア
// ---------------------------------------------------------------------------

/**
 * 仮実装用の署名鍵ペアストア（プロセス内インメモリ）
 *
 * @remarks
 * 本実装では HSM や KMS に置き換える。
 */
const signingKeyStore = new Map<string, { privateKey: DummyPrivateKey; publicKey: DummyPublicKey }>();

/**
 * タイムスタンプトークンストア（signatureId → Rfc3161TimestampToken）
 *
 * @remarks
 * `embedTimestampToken` で格納し `extractTimestampToken` で取得する。
 * 本実装では XML ドキュメントへの書き込みに置き換える。
 */
const timestampTokenStore = new Map<string, Rfc3161TimestampToken>();

/**
 * 監査ログバッファ（プロセス内インメモリ）
 *
 * @remarks
 * `local-log` モードで使用。本実装では外部ログシステムに出力する。
 */
const auditLog: Array<TimestampRequestRecord | VerificationResultRecord> = [];

// ---------------------------------------------------------------------------
// 仮実装用の共有鍵ペア（プロセス起動時に1回生成）
// ---------------------------------------------------------------------------

const DUMMY_KEY_ID = 'local-dummy-signing-key';
let _dummyKeyPairInitialized = false;

function ensureDummyKeyPair(): void {
  if (_dummyKeyPairInitialized) return;
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  signingKeyStore.set(DUMMY_KEY_ID, {
    privateKey: {
      keyId: DUMMY_KEY_ID,
      pem: privateKey,
      createdAt: new Date().toISOString(),
    },
    publicKey: {
      keyId: DUMMY_KEY_ID,
      pem: publicKey,
    },
  });
  _dummyKeyPairInitialized = true;
}

// ---------------------------------------------------------------------------
// ハッシュ生成
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// C14N 正規化ヘルパー（内部使用）
// ---------------------------------------------------------------------------

/**
 * DOM ノードを Canonical XML（C14N）形式の文字列にシリアライズする。
 *
 * @remarks
 * 対応範囲（主要ケース）:
 *   - 要素ノード: 属性をアルファベット順にソートして出力
 *   - テキストノード: &amp; &lt; &gt; &#xD; を正規化エスケープ
 *   - 属性値: &amp; &quot; &lt; &#x9; &#xA; &#xD; を正規化エスケープ
 *   - 処理命令・コメントノード: 除外（C14N with comments を使用しない）
 *   - 名前空間宣言: 親から継承済みの宣言を再出力しない（簡易実装）
 *
 * 制限事項（本実装フェーズで対応予定）:
 *   - XPath サブセット指定による部分正規化には未対応
 *   - Exclusive C14N（exc-c14n）には未対応
 *   - 名前空間の完全な継承チェーンには未対応（シンプルなルートからの直列化のみ）
 *
 * @param node シリアライズ対象の DOM ノード
 * @param inheritedNs 親要素から継承している名前空間宣言（prefix → uri）
 * @returns C14N 形式の文字列
 */
function canonicalizeNode(
  node: Node,
  inheritedNs: Map<string, string> = new Map(),
): string {
  const ELEMENT_NODE = 1;
  const TEXT_NODE = 3;

  if (node.nodeType === TEXT_NODE) {
    // テキストノード: &amp; &lt; &gt; &#xD; を正規化
    const text = node.nodeValue ?? '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r/g, '&#xD;');
  }

  if (node.nodeType !== ELEMENT_NODE) {
    // コメント・処理命令等は C14N without comments では除外
    return '';
  }

  const elem = node as Element;
  let result = `<${elem.nodeName}`;

  // 属性をアルファベット順にソートして出力
  const attrs: Array<{ name: string; value: string }> = [];
  if (elem.attributes) {
    for (let i = 0; i < elem.attributes.length; i++) {
      const attr = elem.attributes.item(i);
      if (attr) {
        attrs.push({ name: attr.nodeName, value: attr.nodeValue ?? '' });
      }
    }
  }
  attrs.sort((a, b) => a.name.localeCompare(b.name));

  for (const attr of attrs) {
    const escapedValue = attr.value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/\t/g, '&#x9;')
      .replace(/\n/g, '&#xA;')
      .replace(/\r/g, '&#xD;');
    result += ` ${attr.name}="${escapedValue}"`;
  }

  result += '>';

  // 子ノードを再帰的に処理
  if (elem.childNodes) {
    for (let i = 0; i < elem.childNodes.length; i++) {
      const child = elem.childNodes.item(i);
      if (child) {
        result += canonicalizeNode(child as Node, inheritedNs);
      }
    }
  }

  result += `</${elem.nodeName}>`;
  return result;
}

/**
 * XML 文字列を C14N 形式に正規化する。
 *
 * @param xmlDoc 正規化対象の XML 文字列
 * @returns C14N 形式の文字列
 */
function canonicalizeXml(xmlDoc: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlDoc, 'text/xml');

  // パースエラーチェック（@xmldom/xmldom はパースエラーを parsererror 要素で返す）
  const parseErrors = doc.getElementsByTagName('parsererror');
  if (parseErrors.length > 0) {
    throw new Error(`XML パースエラー: ${parseErrors.item(0)?.textContent ?? '不明なエラー'}`);
  }

  return canonicalizeNode(doc.documentElement as unknown as Node);
}

/**
 * C14N 正規化後、SHA-2 以上で MaiML 本文のダイジェストを計算する。
 *
 * @remarks
 * 【本実装】`@xmldom/xmldom` で XML をパースし、属性のアルファベット順ソートを含む
 *   簡易 C14N 正規化を行ってからハッシュを計算する。
 * 【制限】XPath サブセット指定・Exclusive C14N・完全な名前空間継承チェーンには未対応。
 *   本格的な C14N が必要な場合は W3C 準拠ライブラリへの移行を推奨。
 *
 * @param xmlDoc MaiML XML 文字列
 * @param policy 改竄防止ポリシー（省略時: DEFAULT_INTEGRITY_POLICY）
 * @returns ハッシュ計算結果
 */
export function computeCanonicalHash(
  xmlDoc: string,
  policy: IntegrityPolicy = DEFAULT_INTEGRITY_POLICY,
): CanonicalHashResult {
  // C14N 正規化を行ってからハッシュを計算する
  const canonicalized = canonicalizeXml(xmlDoc);
  const hash = crypto.createHash(policy.hashAlgorithm);
  hash.update(canonicalized, 'utf8');
  const digestValue = hash.digest('base64');
  return {
    digestValue,
    algorithmUri: HASH_ALGORITHM_URI_MAP[policy.hashAlgorithm],
    computedAt: new Date().toISOString(),
  };
}

/**
 * 検証時にハッシュを再計算し、`<DigestValue>` と比較する。
 *
 * @remarks
 * 【仮実装時の挙動】computeCanonicalHash を呼び出して再計算し、文字列比較する。
 *
 * @param xmlDoc MaiML XML 文字列
 * @param storedHash 保存されていた DigestValue（Base64）
 * @param policy 改竄防止ポリシー（省略時: DEFAULT_INTEGRITY_POLICY）
 * @returns ハッシュ比較結果
 */
export function recomputeAndCompare(
  xmlDoc: string,
  storedHash: string,
  policy: IntegrityPolicy = DEFAULT_INTEGRITY_POLICY,
): HashCompareResult {
  const { digestValue } = computeCanonicalHash(xmlDoc, policy);
  return {
    isMatch: digestValue === storedHash,
    recomputedDigest: digestValue,
    storedDigest: storedHash,
  };
}

// ---------------------------------------------------------------------------
// 署名鍵取得
// ---------------------------------------------------------------------------

/**
 * 署名専用の秘密鍵を取得する。暗号化用の鍵とは別系統とする。
 *
 * @remarks
 * 【仮実装時の挙動】インメモリで生成した RSA-2048 仮鍵を返す。
 * 【本実装】`policy.signatureProvider` に応じて HSM 等から取得する。
 *
 * @param policy 改竄防止ポリシー（省略時: DEFAULT_INTEGRITY_POLICY）
 * @returns 秘密鍵
 */
export function getSigningPrivateKey(
  policy: IntegrityPolicy = DEFAULT_INTEGRITY_POLICY,
): DummyPrivateKey {
  switch (policy.signatureProvider) {
    case 'local-file': {
      const pem = loadSigningKeySync();
      if (!pem) {
        // test-keys が存在しない場合は local-dummy へフォールバック
        ensureDummyKeyPair();
        const pair = signingKeyStore.get(DUMMY_KEY_ID)!;
        return pair.privateKey;
      }
      return { keyId: 'local-file-signing-key', pem, createdAt: new Date().toISOString() };
    }
    case 'local-dummy': {
      ensureDummyKeyPair();
      const pair = signingKeyStore.get(DUMMY_KEY_ID)!;
      return pair.privateKey;
    }
    case 'hsm':
      // TODO: 本実装 — HSM から秘密鍵ハンドルを取得する
      throw new Error('未実装: signatureProvider=hsm は本実装フェーズで対応します');
    default: {
      const _exhaustive: never = policy.signatureProvider;
      throw new Error(`未知の signatureProvider: ${_exhaustive}`);
    }
  }
}

/**
 * 検証者に渡す公開鍵・証明書を取得する。
 *
 * @remarks
 * 【仮実装時の挙動】getSigningPrivateKey と対になる仮公開鍵を返す。
 * 【本実装】証明書チェーン付きの公開鍵を返す。
 *
 * @param policy 改竄防止ポリシー（省略時: DEFAULT_INTEGRITY_POLICY）
 * @returns 公開鍵
 */
export function getSigningPublicKey(
  policy: IntegrityPolicy = DEFAULT_INTEGRITY_POLICY,
): DummyPublicKey {
  switch (policy.signatureProvider) {
    case 'local-file': {
      const pem = loadVerificationKeySync();
      if (!pem) {
        // test-keys が存在しない場合は local-dummy へフォールバック
        ensureDummyKeyPair();
        const pair = signingKeyStore.get(DUMMY_KEY_ID)!;
        return pair.publicKey;
      }
      return { keyId: 'local-file-signing-key', pem };
    }
    case 'local-dummy': {
      ensureDummyKeyPair();
      const pair = signingKeyStore.get(DUMMY_KEY_ID)!;
      return pair.publicKey;
    }
    case 'hsm':
      throw new Error('未実装: signatureProvider=hsm は本実装フェーズで対応します');
    default: {
      const _exhaustive: never = policy.signatureProvider;
      throw new Error(`未知の signatureProvider: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 署名生成・検証
// ---------------------------------------------------------------------------

/**
 * 秘密鍵でハッシュ値を署名し `<SignatureValue>` を生成する。
 *
 * @remarks
 * 【仮実装時の挙動】RSA-SHA256 で署名する。
 * 【本実装】signatureProvider に応じてアルゴリズムを切り替える。
 *
 * @param privateKey 秘密鍵（getSigningPrivateKey の戻り値）
 * @param hash ダイジェスト値（Base64）
 * @param signatureId 署名 ID（XML の `<Signature Id="...">` に使用）
 * @returns 署名結果
 */
export function signHash(
  privateKey: DummyPrivateKey,
  hash: string,
  signatureId: string,
): SignatureResult {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(hash, 'utf8');
  sign.end();
  const signatureValue = sign.sign(privateKey.pem, 'base64');
  return {
    signatureId,
    signatureValue,
    signatureAlgorithmUri: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    signedAt: new Date().toISOString(),
  };
}

/**
 * 公開鍵で署名を検証する。
 *
 * @remarks
 * 【仮実装時の挙動】RSA-SHA256 で検証する。
 *
 * @param publicKey 公開鍵（getSigningPublicKey の戻り値）
 * @param hash 元のダイジェスト値（Base64）
 * @param signatureValue 署名値（Base64）
 * @returns 署名検証結果
 */
export function verifySignature(
  publicKey: DummyPublicKey,
  hash: string,
  signatureValue: string,
): SignatureVerifyResult {
  try {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(hash, 'utf8');
    verify.end();
    const isValid = verify.verify(publicKey.pem, signatureValue, 'base64');
    return { isValid };
  } catch (err) {
    return {
      isValid: false,
      reason: err instanceof Error ? err.message : '署名検証中にエラーが発生しました',
    };
  }
}

// ---------------------------------------------------------------------------
// タイムスタンプ取得
// ---------------------------------------------------------------------------

/**
 * TSA へのリクエスト（TSQ）を組み立てる。
 *
 * @remarks
 * 【仮実装時の挙動】署名値を SHA-256 でハッシュし、RFC 3161 TimeStampReq 構造を組み立てる。
 * 内部で RFC 3161 準拠の `TimeStampReq` 型を生成したうえで、
 * 既存の呼び出し元との互換性を保つため簡易型 `TimestampRequest` も返す。
 *
 * @param signatureValue 署名値（Base64）
 * @returns TSA リクエスト（簡易型 `TimestampRequest`）
 */
export function buildTimestampRequest(signatureValue: string): TimeStampReq {
  const hashedMessage = crypto
    .createHash('sha256')
    .update(signatureValue, 'utf8')
    .digest('base64');
  const nonce = uuidv4().replace(/-/g, '');

  // RFC 3161 準拠の TimeStampReq 構造を組み立てる（仮実装: DER エンコードなし）
  const tsq: TimeStampReq = {
    version: 1,
    messageImprint: {
      hashAlgorithm: {
        algorithm: OID.sha256, // '2.16.840.1.101.3.4.2.1'
      },
      hashedMessage,
    },
    nonce,
    certReq: false,
    // reqPolicy: 外部 TSA 選定後に設定
  };

  // 【仮実装時の挙動】ハッシュ値をログ出力
  console.log(
    `[maimlIntegrityService] buildTimestampRequest: hashedMessage=${tsq.messageImprint.hashedMessage}`,
    `policy=${tsq.messageImprint.hashAlgorithm.algorithm}`,
    `nonce=${tsq.nonce}`,
  );

  return tsq;
}

/**
 * TSA と通信してタイムスタンプトークン（TST）を取得する。
 *
 * @remarks
 * 【仮実装時の挙動】ローカル時刻を使い RFC 3161 準拠の TimeStampResp / TSTInfo 構造を組み立て、
 * 既存の呼び出し元との互換性を保つため簡易型 `TimestampToken` に変換して返す（本番運用不可）。
 * 【本実装】`policy.tsaProvider='external-tsa'` で外部 TSA サーバーと RFC 3161 通信を行い、
 * DER エンコードされた `TimeStampResp` を受信・デコードして返す。
 *
 * @param request TSA リクエスト（buildTimestampRequest の戻り値）
 * @param signatureId 対応する署名 ID
 * @param policy 改竄防止ポリシー（省略時: DEFAULT_INTEGRITY_POLICY）
 * @returns タイムスタンプトークン（簡易型 `TimestampToken`）
 */
export function requestTimestamp(
  request: TimeStampReq,
  signatureId: string,
  policy: IntegrityPolicy = DEFAULT_INTEGRITY_POLICY,
): Rfc3161TimestampToken {
  switch (policy.tsaProvider) {
    case 'local-mock': {
      // 【仮実装】RFC 3161 準拠の TSTInfo 構造を組み立てる（DER エンコードなし）
      const now = new Date().toISOString();
      const serialNumber = uuidv4().replace(/-/g, '');

      const tstInfo: TSTInfo = {
        version: 1,
        policy: '1.3.6.1.4.1.99999.1.1', // 仮の TSA ポリシー OID
        messageImprint: {
          hashAlgorithm: {
            algorithm: OID.sha256,
          },
          hashedMessage: request.messageImprint.hashedMessage,
        },
        serialNumber,
        genTime: now,
        accuracy: { seconds: 1 }, // 仮: ±1秒の精度
        ordering: false,
        nonce: request.nonce,
        tsa: {
          directoryName: 'CN=Local Mock TSA, O=LocalTest',
        },
      };

      // RFC 3161 TimeStampToken（仮実装: TSTInfo を JSON→Base64 した疑似 rawToken）
      const rfc3161Token: Rfc3161TimestampToken = {
        contentType: OID.signedData,
        tstInfo,
        rawToken: Buffer.from(JSON.stringify(tstInfo)).toString('base64'),
      };

      // RFC 3161 TimeStampResp（仮実装: granted ステータス）
      const tsResp: TimeStampResp = {
        status: { status: PKIStatus.granted },
        timeStampToken: rfc3161Token,
      };

      return tsResp.timeStampToken!;
    }
    case 'external-tsa':
      // TODO: 本実装 — RFC 3161 で外部 TSA と HTTP 通信し DER エンコードされた TimeStampResp を受信する
      throw new Error('未実装: tsaProvider=external-tsa は本実装フェーズで対応します');
    default: {
      const _exhaustive: never = policy.tsaProvider;
      throw new Error(`未知の tsaProvider: ${_exhaustive}`);
    }
  }
}

/**
 * TSA からの応答を解析してタイムスタンプトークンを取得する。
 *
 * @remarks
 * 【仮実装時の挙動】`requestTimestamp` が返す簡易型 `TimestampToken` をそのまま返す
 *   アダプター関数として機能する。
 * 【本実装】RFC 3161 の TSA 応答（DER エンコードされた `TimeStampResp`）を受け取り、
 *   `TimeStampResp.timeStampToken.tstInfo.genTime` を timestamp として抽出する。
 *   DER デコードには本実装フェーズで ASN.1 ライブラリ（例: `@peculiar/asn1-schema`）を使用する。
 *
 * @param tsaResponse TSA 応答（requestTimestamp の戻り値）
 * @returns 解析済みタイムスタンプトークン（簡易型 `TimestampToken`）
 */
export function parseTimestampResponse(
  tsaResponse: Rfc3161TimestampToken,
): Rfc3161TimestampToken {
  // TODO: 本実装 — DER エンコードされた RFC 3161 TimeStampResp を受け取り以下を実施する:
  //   1. DER デコードして TimeStampResp を取得
  //   2. status.status が granted / grantedWithMods であることを確認
  //   3. timeStampToken.tstInfo.genTime を timestamp に変換
  //   4. timeStampToken.rawToken（DER全体のBase64）を token に設定
  //   5. tsa.directoryName を tsaIdentifier に設定

  // 仮実装: requestTimestamp が返す簡易 TimestampToken をそのまま返すアダプター
  return tsaResponse;
}

// ---------------------------------------------------------------------------
// タイムスタンプ検証
// ---------------------------------------------------------------------------

/**
 * TSA の署名及び証明書の有効性を検証する。
 *
 * @remarks
 * 【仮実装時の挙動】`local-mock` トークンは常に有効として返す。
 * 【本実装】TSA 証明書を検証し、トークンの署名を確認する。
 *
 * @param token タイムスタンプトークン
 * @returns 検証結果
 */
export function verifyTimestampToken(
  token: Rfc3161TimestampToken,
): TimestampVerifyResult {
  // TODO: 本実装 — TSA 証明書を検証し、トークン署名を確認する
  const tsaId = token.tstInfo.tsa?.directoryName ?? '';
  if (tsaId === 'CN=Local Mock TSA, O=LocalTest' || token.contentType === OID.signedData) {
    // 仮実装: local-mock トークンは常に有効
    return {
      isValid: true,
      timestamp: token.tstInfo.genTime,
    };
  }
  // 未知の TSA は一旦有効とする（本実装で要変更）
  return {
    isValid: true,
    timestamp: token.tstInfo.genTime,
  };
}

/**
 * タイムスタンプが `<date>` 要素の作成日以降であることを確認する。
 *
 * @remarks
 * 【仮実装時の挙動】タイムスタンプ日時と作成日を比較し整合性を確認する。
 *
 * @param timestamp タイムスタンプ値（ISO 8601）
 * @param creationDate MaiML の作成日（ISO 8601）
 * @returns 時刻整合性チェック結果
 */
export function checkTimeConsistency(
  timestamp: string,
  creationDate: string,
): TimeConsistencyResult {
  const tsTime = new Date(timestamp).getTime();
  const cdTime = new Date(creationDate).getTime();

  if (isNaN(tsTime) || isNaN(cdTime)) {
    return {
      isConsistent: false,
      timestamp,
      creationDate,
      reason: '日時のパースに失敗しました',
    };
  }

  if (tsTime < cdTime) {
    return {
      isConsistent: false,
      timestamp,
      creationDate,
      reason: 'タイムスタンプが作成日より前になっています',
    };
  }

  return { isConsistent: true, timestamp, creationDate };
}

// ---------------------------------------------------------------------------
// 格納・抽出
// ---------------------------------------------------------------------------

/**
 * タイムスタンプトークンを `<SignatureProperty Target="#{signatureId}">` として格納する。
 *
 * @remarks
 * 【本実装】インメモリストアに格納する（signMaiml で buildSignatureXml を呼び MAIML に書き込む）。
 *
 * @param signatureId 対象の Signature の Id
 * @param token 格納するタイムスタンプトークン
 */
export function embedTimestampToken(
  signatureId: string,
  token: Rfc3161TimestampToken,
): void {
  timestampTokenStore.set(signatureId, token);
}

/**
 * `<Signature>` の Id を取得し、一致する Target を持つ `<SignatureProperty>` を抽出する。
 *
 * @remarks
 * まず MAIML XML から `<ds:Signature Id="{signatureId}">` を解析して抽出を試みる。
 * MAIML に埋め込みがない場合（古い署名等）はインメモリストアにフォールバックする。
 *
 * @param maimlFile MaiML ファイル内容
 * @param signatureId 取得対象の Signature の Id
 * @returns タイムスタンプトークン（存在しない場合は null）
 */
export function extractTimestampToken(
  maimlFile: string,
  signatureId: string,
): Rfc3161TimestampToken | null {
  // まず MAIML XML から抽出を試みる
  const extracted = extractSignatureFromXml(maimlFile, signatureId);
  if (extracted?.timestampToken) {
    // rawToken（Base64）から TSTInfo を復元する（仮実装: JSON.parse）
    try {
      const tstInfo = JSON.parse(Buffer.from(extracted.timestampToken, 'base64').toString('utf-8'));
      return {
        contentType: OID.signedData,
        tstInfo,
        rawToken: extracted.timestampToken,
      };
    } catch {
      // パース失敗時はインメモリストアにフォールバック
    }
  }
  // MAIML に埋め込みがない場合はインメモリストアにフォールバック
  return timestampTokenStore.get(signatureId) ?? null;
}

// ---------------------------------------------------------------------------
// XML 埋め込み・抽出ヘルパー
// ---------------------------------------------------------------------------

/**
 * 署名結果と TST から `<ds:Signature>` XML フラグメントを組み立てる。
 *
 * @remarks
 * XML Digital Signature 仕様（W3C XML-DSig）に準拠した構造を生成する。
 * `<ds:SignatureProperties>` 内に TST を Base64 で格納する。
 *
 * 生成される XML 構造:
 * ```xml
 * <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="{signatureId}">
 *   <ds:SignedInfo>
 *     <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
 *     <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
 *     <ds:Reference URI="">
 *       <ds:DigestMethod Algorithm="{algorithmUri}"/>
 *       <ds:DigestValue>{digestValue}</ds:DigestValue>
 *     </ds:Reference>
 *   </ds:SignedInfo>
 *   <ds:SignatureValue>{signatureValue}</ds:SignatureValue>
 *   <ds:SignatureProperties>
 *     <ds:SignatureProperty Id="tst-{signatureId}" Target="#{signatureId}">
 *       <TimestampToken>{timestampToken}</TimestampToken>
 *     </ds:SignatureProperty>
 *   </ds:SignatureProperties>
 * </ds:Signature>
 * ```
 *
 * @param signatureId 署名 ID（Signature の Id 属性値）
 * @param digestValue SHA-256 ダイジェスト値（Base64）
 * @param algorithmUri ハッシュアルゴリズム URI
 * @param signatureValue RSA-SHA256 署名値（Base64）
 * @param signatureAlgorithmUri 署名アルゴリズム URI
 * @param timestampToken タイムスタンプトークン（Base64）
 * @returns `<ds:Signature>` XML 文字列
 */
export function buildSignatureXml(
  signatureId: string,
  digestValue: string,
  algorithmUri: string,
  signatureValue: string,
  signatureAlgorithmUri: string,
  timestampToken: string,
): string {
  return [
    `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${signatureId}">`,
    `  <ds:SignedInfo>`,
    `    <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>`,
    `    <ds:SignatureMethod Algorithm="${signatureAlgorithmUri}"/>`,
    `    <ds:Reference URI="">`,
    `      <ds:DigestMethod Algorithm="${algorithmUri}"/>`,
    `      <ds:DigestValue>${digestValue}</ds:DigestValue>`,
    `    </ds:Reference>`,
    `  </ds:SignedInfo>`,
    `  <ds:SignatureValue>${signatureValue}</ds:SignatureValue>`,
    `  <ds:SignatureProperties>`,
    `    <ds:SignatureProperty Id="tst-${signatureId}" Target="#${signatureId}">`,
    `      <TimestampToken>${timestampToken}</TimestampToken>`,
    `    </ds:SignatureProperty>`,
    `  </ds:SignatureProperties>`,
    `</ds:Signature>`,
  ].join('\n');
}

/**
 * MAIML XML から `<ds:Signature Id="{signatureId}">` を抽出し、内容を解析して返す。
 *
 * @remarks
 * `<ds:Signature>` が複数存在する場合は `Id` 属性で一致するものを優先する。
 * `signatureId` が空文字または未指定の場合は最初の `<ds:Signature>` を返す。
 *
 * @param maimlXml MAIML ファイルの XML 文字列
 * @param signatureId 取得対象の署名 ID（省略時は最初の Signature）
 * @returns 抽出した署名情報（存在しない場合は null）
 */
export function extractSignatureFromXml(
  maimlXml: string,
  signatureId?: string,
): {
  signatureId: string;
  digestValue: string;
  algorithmUri: string;
  signatureValue: string;
  signatureAlgorithmUri: string;
  timestampToken: string | null;
} | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(maimlXml, 'text/xml');

    // <ds:Signature> 要素を全て取得
    const signatures = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    if (signatures.length === 0) {
      return null;
    }

    // signatureId で絞り込む（指定なし or 一致しない場合は先頭）
    let targetSig: Element | null = null;
    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures.item(i) as Element;
      if (!signatureId || sig.getAttribute('Id') === signatureId) {
        targetSig = sig;
        break;
      }
    }
    if (!targetSig) {
      // ID 一致なし → 先頭
      targetSig = signatures.item(0) as Element;
    }

    const extractText = (ns: string, localName: string, parent: Element): string => {
      const els = parent.getElementsByTagNameNS(ns, localName);
      return els.length > 0 ? (els.item(0)?.textContent ?? '') : '';
    };

    const DS = 'http://www.w3.org/2000/09/xmldsig#';

    const sigIdAttr = targetSig.getAttribute('Id') ?? (signatureId ?? '');
    const digestValueEl = extractText(DS, 'DigestValue', targetSig);
    const signatureValueEl = extractText(DS, 'SignatureValue', targetSig);

    // DigestMethod Algorithm 属性
    const digestMethodEls = targetSig.getElementsByTagNameNS(DS, 'DigestMethod');
    const algorithmUri = digestMethodEls.length > 0
      ? (digestMethodEls.item(0) as Element).getAttribute('Algorithm') ?? ''
      : '';

    // SignatureMethod Algorithm 属性
    const signatureMethodEls = targetSig.getElementsByTagNameNS(DS, 'SignatureMethod');
    const signatureAlgorithmUri = signatureMethodEls.length > 0
      ? (signatureMethodEls.item(0) as Element).getAttribute('Algorithm') ?? ''
      : '';

    // TimestampToken（<ds:SignatureProperty> 内）
    const signaturePropertyEls = targetSig.getElementsByTagNameNS(DS, 'SignatureProperty');
    let timestampToken: string | null = null;
    for (let i = 0; i < signaturePropertyEls.length; i++) {
      const prop = signaturePropertyEls.item(i) as Element;
      const target = prop.getAttribute('Target');
      if (!signatureId || target === `#${sigIdAttr}`) {
        const tstEls = prop.getElementsByTagName('TimestampToken');
        if (tstEls.length > 0) {
          timestampToken = tstEls.item(0)?.textContent ?? null;
          break;
        }
      }
    }

    return {
      signatureId: sigIdAttr,
      digestValue: digestValueEl,
      algorithmUri,
      signatureValue: signatureValueEl,
      signatureAlgorithmUri,
      timestampToken,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 証明書・信頼チェーン管理
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 証明書検証ヘルパー（内部使用）
// ---------------------------------------------------------------------------

/**
 * node-forge で PEM 証明書を解析し、有効期限・発行者・サブジェクトを取得する。
 *
 * @param pem PEM 形式の証明書文字列
 * @returns 証明書検証結果
 */
function validatePemCertificate(pem: string): CertificateValidationResult {
  try {
    const cert = forge.pki.certificateFromPem(pem);
    const now = new Date();
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;

    if (now < notBefore) {
      return {
        isValid: false,
        expiresAt: notAfter.toISOString(),
        issuer: cert.issuer.getField('CN')?.value ?? 'unknown',
        subject: cert.subject.getField('CN')?.value ?? 'unknown',
        reason: `証明書はまだ有効期間が開始していません（notBefore: ${notBefore.toISOString()}）`,
      };
    }

    if (now > notAfter) {
      return {
        isValid: false,
        expiresAt: notAfter.toISOString(),
        issuer: cert.issuer.getField('CN')?.value ?? 'unknown',
        subject: cert.subject.getField('CN')?.value ?? 'unknown',
        reason: `証明書の有効期限が切れています（notAfter: ${notAfter.toISOString()}）`,
      };
    }

    // TODO: 本実装フェーズで CRL / OCSP による失効確認を追加する

    return {
      isValid: true,
      expiresAt: notAfter.toISOString(),
      issuer: cert.issuer.getField('CN')?.value ?? 'unknown',
      subject: cert.subject.getField('CN')?.value ?? 'unknown',
    };
  } catch (err) {
    return {
      isValid: false,
      reason: err instanceof Error ? `証明書の解析に失敗しました: ${err.message}` : '証明書の解析中に予期しないエラーが発生しました',
    };
  }
}

/**
 * 署名者証明書の有効期限・発行者チェーンを確認する。
 *
 * @remarks
 * 【本実装】`node-forge` で PEM 証明書を解析し、有効期限・発行者・サブジェクトを検証する。
 *   CRL / OCSP による失効確認は今後の本実装フェーズで追加予定。
 * 【仮識別子の場合】`local-dummy` の場合は有効として返す（仮実装との後方互換性）。
 *
 * @param cert 証明書（PEM 形式または仮識別子）
 * @returns 証明書検証結果
 */
export function validateSignerCertificate(
  cert: string,
): CertificateValidationResult {
  // PEM 形式の証明書は node-forge で実検証
  if (cert.includes('-----BEGIN CERTIFICATE-----')) {
    return validatePemCertificate(cert);
  }

  // 仮識別子（local-dummy）の後方互換
  if (cert === DUMMY_KEY_ID) {
    return {
      isValid: true,
      issuer: 'local-dummy-ca',
      subject: 'local-dummy-signer',
    };
  }

  // 未知の識別子は拒否（本実装では必ず PEM を渡すこと）
  return {
    isValid: false,
    reason: `未知の証明書識別子: ${cert}。PEM 形式の証明書を渡してください。`,
  };
}

/**
 * TSA 証明書の有効期限・発行者チェーンを確認する。
 *
 * @remarks
 * 【本実装】`node-forge` で PEM 証明書を解析し、有効期限・発行者・サブジェクトを検証する。
 *   CRL / OCSP による失効確認は今後の本実装フェーズで追加予定。
 * 【仮識別子の場合】`local-mock-tsa` の場合は有効として返す（仮実装との後方互換性）。
 *
 * @param cert 証明書（PEM 形式または仮識別子）
 * @returns 証明書検証結果
 */
export function validateTsaCertificate(
  cert: string,
): CertificateValidationResult {
  // PEM 形式の証明書は node-forge で実検証
  if (cert.includes('-----BEGIN CERTIFICATE-----')) {
    return validatePemCertificate(cert);
  }

  // 仮識別子（local-mock-tsa）の後方互換
  if (cert === 'local-mock-tsa') {
    return {
      isValid: true,
      issuer: 'local-mock-tsa-root',
      subject: 'local-mock-tsa',
    };
  }

  // 未知の識別子は拒否
  return {
    isValid: false,
    reason: `未知の TSA 証明書識別子: ${cert}。PEM 形式の証明書を渡してください。`,
  };
}

// ---------------------------------------------------------------------------
// 記録・監査
// ---------------------------------------------------------------------------

/**
 * TSA への要求履歴（いつ・どの TSA に・何を送ったか）を記録する。
 *
 * @remarks
 * 【仮実装時の挙動】`policy.auditTarget='local-log'` の場合は console.log と
 *   インメモリバッファに記録する。
 * 【本実装】`cloudtrail` では AWS CloudTrail に送信する。
 *
 * @param hash 送信したハッシュ値
 * @param tsaEndpoint TSA エンドポイント
 * @param timestamp 取得したタイムスタンプ（ISO 8601）
 * @param policy 改竄防止ポリシー（省略時: DEFAULT_INTEGRITY_POLICY）
 * @param pool データベース接続プール（db-log モード時に使用）
 * @param organizationId 組織ID（db-log モード時に使用）
 * @param createdBy 操作ユーザーID（db-log モード時に任意）
 */
export async function recordTimestampRequest(
  hash: string,
  tsaEndpoint: string,
  timestamp: string,
  policy: IntegrityPolicy = DEFAULT_INTEGRITY_POLICY,
  pool?: Pool,
  organizationId?: string,
  createdBy?: string | null,
): Promise<void> {
  const recordedAt = new Date().toISOString();
  const record: TimestampRequestRecord = {
    hash,
    tsaEndpoint,
    timestamp,
    recordedAt,
  };

  switch (policy.auditTarget) {
    case 'local-log':
      console.log('[maimlIntegrityService] TSA request recorded:', JSON.stringify(record));
      auditLog.push(record);
      break;
    case 'db-log':
      if (!pool || !organizationId) {
        throw new Error('db-log モードでは pool と organizationId が必要です');
      }
      await integrityAuditLogRepository.insertTimestampRequest(pool, {
        organizationId,
        hash,
        tsaEndpoint,
        timestamp,
        recordedAt,
        createdBy: createdBy ?? null,
      });
      break;
    case 'cloudtrail':
      // TODO: 本実装 — AWS CloudTrail に送信する
      throw new Error('未実装: auditTarget=cloudtrail は本実装フェーズで対応します');
    default: {
      const _exhaustive: never = policy.auditTarget;
      throw new Error(`未知の auditTarget: ${_exhaustive}`);
    }
  }
}

/**
 * 検証結果（成功・失敗・失効の有無）を記録する。
 *
 * @remarks
 * 【仮実装時の挙動】`policy.auditTarget='local-log'` の場合は console.log と
 *   インメモリバッファに記録する。
 * 【db-log】`integrity_audit_log` テーブルに永続化する。
 *
 * @param result 検証結果
 * @param policy 改竄防止ポリシー（省略時: DEFAULT_INTEGRITY_POLICY）
 * @param pool データベース接続プール（db-log モード時に使用）
 * @param organizationId 組織ID（db-log モード時に使用）
 * @param createdBy 操作ユーザーID（db-log モード時に任意）
 */
export async function recordVerificationResult(
  result: VerificationResultRecord,
  policy: IntegrityPolicy = DEFAULT_INTEGRITY_POLICY,
  pool?: Pool,
  organizationId?: string,
  createdBy?: string | null,
): Promise<void> {
  const recordedAt = result.recordedAt ?? new Date().toISOString();
  const record: VerificationResultRecord = {
    ...result,
    recordedAt,
  };

  switch (policy.auditTarget) {
    case 'local-log':
      console.log('[maimlIntegrityService] Verification result recorded:', JSON.stringify(record));
      auditLog.push(record);
      break;
    case 'db-log':
      if (!pool || !organizationId) {
        throw new Error('db-log モードでは pool と organizationId が必要です');
      }
      await integrityAuditLogRepository.insertVerificationResult(pool, {
        organizationId,
        success: result.success,
        hasRevocation: result.hasRevocation ?? null,
        errorMessage: result.errorMessage ?? null,
        recordedAt,
        createdBy: createdBy ?? null,
      });
      break;
    case 'cloudtrail':
      // TODO: 本実装 — AWS CloudTrail に送信する
      throw new Error('未実装: auditTarget=cloudtrail は本実装フェーズで対応します');
    default: {
      const _exhaustive: never = policy.auditTarget;
      throw new Error(`未知の auditTarget: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// テスト・デバッグ用ヘルパー（エクスポートしない）
// ---------------------------------------------------------------------------

/**
 * 監査ログの全エントリを取得する（テスト・デバッグ用）
 *
 * @internal
 */
export function _getAuditLog(): ReadonlyArray<TimestampRequestRecord | VerificationResultRecord> {
  return auditLog;
}

/**
 * インメモリストアをクリアする（テスト用）
 *
 * @internal
 */
export function _clearStores(): void {
  timestampTokenStore.clear();
  auditLog.length = 0;
}
