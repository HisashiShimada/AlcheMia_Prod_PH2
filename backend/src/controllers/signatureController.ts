/**
 * 改竄防止（署名・タイムスタンプ）コントローラー
 *
 * @description
 * MAIMLファイルのハッシュ計算・署名・タイムスタンプ取得・検証 API のリクエストハンドラ。
 * maimlIntegrityService を使用した実装。
 *
 * @remarks
 * 【仮実装で動作する範囲（local-dummy / local-mock モード）】
 *   - POST /signature/projects/:projectName/sign        — ハッシュ計算 → 署名 → TSA → 監査ログ
 *   - POST /signature/projects/:projectName/verify      — 署名検証 → TST検証 → 監査ログ
 *   - GET  /signature/projects/:projectName/hash        — ハッシュ値のみ返す（軽量確認用）
 *   - POST /signature/certificates/validate             — 証明書有効期限チェック
 *   - GET  /signature/audit-log                         — 監査ログ一覧（db-log モード時 DB から取得）
 *
 * 【TODO: 本実装が必要な範囲】
 *   - signatureProvider='hsm' 対応
 *   - tsaProvider='external-tsa' 対応（RFC 3161）
 *   - auditTarget='cloudtrail' 対応
 *   - MAIMLファイルへの <Signature> / <SignatureProperty> 埋め込み・抽出
 */

import { Request, Response } from 'express';
import { getPool } from '../database/db';
import { getStorageService } from '../services/storageService';
import * as maimlIntegrityService from '../services/maimlIntegrityService';
import { DEFAULT_INTEGRITY_POLICY } from '../types/integrityTypes';
import type {
  VerificationResultRecord,
} from '../types/integrityTypes';

// ---------------------------------------------------------------------------
// MAIMLファイル保存ヘルパー
// ---------------------------------------------------------------------------

/**
 * MAIML ファイルを保存する（アーカイブバックアップ付き）
 */
async function saveMaimlContent(
  organizationId: string,
  projectName: string,
  content: string,
): Promise<{ updatedFilePath: string }> {
  const storageService = getStorageService();
  const filePath = `projects/${projectName}/${projectName}.maiml`;
  const backupPath = `projects/${projectName}/archive/${projectName}_backup_sig_${Date.now()}.maiml`;

  try {
    const current = await storageService.downloadFile(organizationId, filePath);
    await storageService.uploadFile(organizationId, backupPath, current, { contentType: 'application/xml' });
  } catch {
    // 既存ファイルが存在しない場合はバックアップをスキップ
  }

  await storageService.uploadFile(organizationId, filePath, Buffer.from(content, 'utf-8'), { contentType: 'application/xml' });
  return { updatedFilePath: filePath };
}

/**
 * MAIML XML に `<Signature>` を追記する（XAdES対応）。
 *
 * @remarks
 * ルート要素の閉じタグ直前に挿入する。
 * 既に同じ signatureId の `<Signature>` が存在する場合は上書きする。
 * デフォルト名前空間（prefixなし）と `ds:` prefix 付きの両方のパターンを除去する。
 */
function embedSignatureInXml(maimlXml: string, signatureXml: string, signatureId: string): string {
  // 既存の同 ID の <Signature> / <ds:Signature> を削除（上書き）
  const escapedId = signatureId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // prefixなし版
  const existingPattern = new RegExp(
    `\\s*<Signature[^>]*Id="${escapedId}"[^>]*>[\\s\\S]*?</Signature>`,
    'g',
  );
  // ds: prefix 版（旧構造との後方互換）
  const existingDsPattern = new RegExp(
    `\\s*<ds:Signature[^>]*Id="${escapedId}"[^>]*>[\\s\\S]*?</ds:Signature>`,
    'g',
  );
  let xmlWithoutOld = maimlXml.replace(existingPattern, '');
  xmlWithoutOld = xmlWithoutOld.replace(existingDsPattern, '');

  // ルート要素の閉じタグ直前に挿入
  const rootCloseMatch = xmlWithoutOld.match(/<\/[^>]+>\s*$/);
  if (!rootCloseMatch) {
    // ルート閉じタグが見つからない場合は末尾に追加
    return `${xmlWithoutOld}\n${signatureXml}`;
  }

  const insertPos = xmlWithoutOld.lastIndexOf(rootCloseMatch[0]);
  return (
    xmlWithoutOld.substring(0, insertPos) +
    '\n' + signatureXml + '\n' +
    xmlWithoutOld.substring(insertPos)
  );
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
// MAIMLファイル取得ヘルパー
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 署名実行
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/signature/projects/:projectName/sign
 * MAIMLファイルのハッシュ計算 → 署名 → TST取得 → 監査ログ記録 を一括実行
 *
 * リクエストボディ（任意）:
 *   - signatureId?: string    署名ID（省略時は自動採番）
 *
 * レスポンス:
 *   - signatureId: string
 *   - digestValue: string     Base64 ハッシュ値
 *   - algorithmUri: string    ハッシュアルゴリズム URI
 *   - signatureValue: string  Base64 署名値
 *   - signedAt: string        署名日時（ISO 8601）
 *   - timestampToken: string  TST トークン（Base64）
 *   - timestamp: string       TSA が返した時刻（ISO 8601）
 */
export const signMaiml = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const { signatureId: reqSignatureId } = req.body as { signatureId?: string };
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  try {
    // MAIMLファイルを取得
    const xmlContent = await getMaimlContent(organizationId, projectName);
    if (!xmlContent) {
      notFound(res, `プロジェクト "${projectName}" のMAIMLファイルが見つかりません`);
      return;
    }

    const policy = DEFAULT_INTEGRITY_POLICY;
    const signatureId = reqSignatureId ?? `sig-${projectName}-${Date.now()}`;

    // 1. ハッシュ計算（C14N 正規化）
    const hashResult = maimlIntegrityService.computeCanonicalHash(xmlContent, policy);

    // 2. 秘密鍵取得
    const privateKey = maimlIntegrityService.getSigningPrivateKey(policy);

    // 3. 署名生成
    const signResult = maimlIntegrityService.signHash(privateKey, hashResult.digestValue, signatureId);

    // 4. <SignatureValue> 要素を C14N 正規化してハッシュ計算し TSA リクエスト生成
    //    仕様書 ステップ4: <SignatureValue> 要素全体を exc-c14n 正規化してからハッシュする
    const DS_NS = 'http://www.w3.org/2000/09/xmldsig#';
    const signatureValueXml = `<SignatureValue xmlns="${DS_NS}">${signResult.signatureValue}</SignatureValue>`;
    const signatureValueHash = maimlIntegrityService.computeCanonicalHashOfFragment(signatureValueXml, policy);
    const tsRequest = maimlIntegrityService.buildTimestampRequest(signatureValueHash, policy.hashAlgorithm);

    // 5. TST 取得（tsaEndpoint を渡す）
    const tsaEndpoint = 'http://localhost/tsa-mock'; // TODO: 本実装で外部 TSA URL に変更
    const tsResp = maimlIntegrityService.requestTimestamp(tsRequest, tsaEndpoint, policy);

    // 5a. 送信した nonce をインメモリストアに保存（verifyMaiml で利用）
    if (tsRequest.nonce) {
      maimlIntegrityService.storeSentNonce(signatureId, tsRequest.nonce);
    }

    // 6. TST 解析（granted 確認 + timeStampToken 取得）
    const parsedToken = maimlIntegrityService.parseTimestampResponse(tsResp);

    // 6b. 仕様書 ステップ5b: 受信したTSTのmessageImprint/nonceを検証（リプレイ攻撃対策）
    const messageImprintCheck = maimlIntegrityService.verifyMessageImprintAndNonce(
      parsedToken,
      signatureValueHash,
      tsRequest.nonce ?? '',
    );
    if (!messageImprintCheck.isValid) {
      throw new Error(
        `TSAから受信したTSTのmessageImprint/nonce検証に失敗しました: ${messageImprintCheck.reason ?? ''}`,
      );
    }

    // 7. TST をインメモリに格納
    maimlIntegrityService.embedTimestampToken(signatureId, parsedToken);

    // 8. 監査ログ: TSA リクエスト記録
    const pool = getPool();
    const userId: string | null = (req.user as { userId?: string } | undefined)?.userId ?? null;
    await maimlIntegrityService.recordTimestampRequest(
      hashResult.digestValue,
      tsaEndpoint,
      parsedToken.tstInfo.genTime,
      policy,
      pool,
      organizationId,
      userId,
    );

    // 9. <ds:Signature> XML を組み立てて MAIML に埋め込み、保存する
    const signatureXml = maimlIntegrityService.buildSignatureXml(
      signatureId,
      hashResult.digestValue,
      hashResult.algorithmUri,
      signResult.signatureValue,
      signResult.signatureAlgorithmUri,
      parsedToken.rawToken,
    );

    const updatedXml = embedSignatureInXml(xmlContent, signatureXml, signatureId);
    const { updatedFilePath } = await saveMaimlContent(organizationId, projectName, updatedXml);

    ok(res, {
      signatureId,
      digestValue: hashResult.digestValue,
      algorithmUri: hashResult.algorithmUri,
      computedAt: hashResult.computedAt,
      signatureValue: signResult.signatureValue,
      signatureAlgorithmUri: signResult.signatureAlgorithmUri,
      signedAt: signResult.signedAt,
      timestampToken: parsedToken.rawToken,
      timestamp: parsedToken.tstInfo.genTime,
      tsaIdentifier: parsedToken.tstInfo.tsa?.directoryName ?? 'unknown',
      updatedFilePath,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 署名検証
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/signature/projects/:projectName/verify
 * MAIMLファイルの署名・TST・証明書を一括検証
 *
 * リクエストボディ:
 *   - signatureId: string       検証対象の署名 ID（必須）
 *   - signerCert?: string       署名者証明書（PEM or 仮識別子）
 *   - tsaCert?: string          TSA 証明書（PEM or 仮識別子）
 *
 * @remarks
 * signatureValue / storedHash はMAIMLファイル内の <ds:Signature> から自動取得する。
 * リクエストボディに不要なため廃止済み。先に /sign を実行してMAIMLに署名を埋め込むこと。
 *
 * レスポンス:
 *   - overallValid: boolean     全体の検証結果
 *   - hashMatch: boolean        ハッシュ一致（MAIMLのdigestValueと現在のMAIMLハッシュを比較）
 *   - signatureValid: boolean   署名有効
 *   - timestampValid: boolean   TST 有効
 *   - timeConsistent: boolean   時刻整合性 OK
 *   - signerCertValid: boolean  署名者証明書有効
 *   - tsaCertValid: boolean     TSA 証明書有効
 */
export const verifyMaiml = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const {
    signatureId,
    signerCert,
    tsaCert,
  } = req.body as {
    signatureId: string;
    signerCert?: string;
    tsaCert?: string;
  };
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  if (!signatureId) {
    badRequest(res, 'E1003', 'signatureId は必須です');
    return;
  }

  try {
    // MAIMLファイルを取得
    const xmlContent = await getMaimlContent(organizationId, projectName);
    if (!xmlContent) {
      notFound(res, `プロジェクト "${projectName}" のMAIMLファイルが見つかりません`);
      return;
    }

    // MAIMLファイルから署名情報を自動取得
    const extracted = maimlIntegrityService.extractSignatureFromXml(xmlContent, signatureId);
    if (!extracted || !extracted.digestValue || !extracted.signatureValue) {
      badRequest(
        res,
        'E6002',
        `MAIML ファイルに署名 ID "${signatureId}" が見つかりません。先に POST /sign を実行してMAIMLに署名を埋め込んでください`,
      );
      return;
    }

    const storedHash = extracted.digestValue;
    const signatureValue = extracted.signatureValue;

    const policy = DEFAULT_INTEGRITY_POLICY;
    const pool = getPool();
    const userId: string | null = (req.user as { userId?: string } | undefined)?.userId ?? null;

    // 1. 現在のMAIMLからハッシュを再計算し、MAIMLに保存されているdigestValueと比較
    const hashCompare = maimlIntegrityService.recomputeAndCompare(xmlContent, storedHash, policy);

    // 2. 公開鍵取得
    const publicKey = maimlIntegrityService.getSigningPublicKey(policy);

    // 3. 保存済みsignatureValueとstoredHashを使って署名検証
    const sigVerify = maimlIntegrityService.verifySignature(publicKey, storedHash, signatureValue);

    // 4. TST 取得（MAIML XML から、なければインメモリストアから）
    const tsToken = maimlIntegrityService.extractTimestampToken(xmlContent, signatureId);
    let tsVerify: { isValid: boolean; timestamp?: string; reason?: string } = { isValid: false };
    let timeConsistent: { isConsistent: boolean; timestamp: string; creationDate: string; reason?: string } = { isConsistent: false, timestamp: '', creationDate: '' };
    let messageImprintResult: { isValid: boolean; hashMatch: boolean; algorithmMatch: boolean; nonceMatch: boolean; reason?: string } = {
      isValid: false, hashMatch: false, algorithmMatch: false, nonceMatch: false,
    };

    if (tsToken) {
      // 5. TST 検証
      tsVerify = maimlIntegrityService.verifyTimestampToken(tsToken);

      // 6. 時刻整合性チェック（FIX-5: MAIML <date> 要素の値を使用する）
      const maimlDate = maimlIntegrityService.extractMaimlDate(xmlContent);
      if (!maimlDate) {
        // D-2: <date> 要素が存在しない場合はエラー
        throw new Error(
          'MAIML ファイルに <date> 要素が存在しないため、時刻整合性チェックを実行できません。MAIML に <date> 要素を追加してください。',
        );
      }
      timeConsistent = maimlIntegrityService.checkTimeConsistency(
        tsToken.tstInfo.genTime,
        maimlDate,
      );

      // 6a. messageImprint & nonce 検証
      //     signMaiml で保存した nonce と、<SignatureValue> のC14N正規化ハッシュを再計算して検証
      //     仕様書 ステップ4と同じ手順（FIX-3: exc-c14n 正規化）
      const sentNonce = maimlIntegrityService.getSentNonce(signatureId);
      const DS_NS = 'http://www.w3.org/2000/09/xmldsig#';
      const signatureValueXmlForVerify = `<SignatureValue xmlns="${DS_NS}">${signatureValue}</SignatureValue>`;
      const signatureValueHashForVerify = maimlIntegrityService.computeCanonicalHashOfFragment(
        signatureValueXmlForVerify,
        policy,
      );
      messageImprintResult = maimlIntegrityService.verifyMessageImprintAndNonce(
        tsToken,
        signatureValueHashForVerify,
        sentNonce ?? '',
      );
    }

    // 7. 証明書検証
    const signerCertResult = maimlIntegrityService.validateSignerCertificate(
      signerCert ?? 'local-dummy-signing-key',
    );
    const tsaCertResult = maimlIntegrityService.validateTsaCertificate(
      tsaCert ?? 'local-mock-tsa',
    );

    // 8. 総合判定（messageImprint 検証を追加）
    const overallValid =
      hashCompare.isMatch &&
      sigVerify.isValid &&
      tsVerify.isValid &&
      timeConsistent.isConsistent &&
      messageImprintResult.isValid &&
      signerCertResult.isValid &&
      tsaCertResult.isValid;

    // 9. 監査ログ: 検証結果記録
    const errorParts: string[] = [];
    if (!hashCompare.isMatch) errorParts.push('ハッシュ不一致');
    if (!sigVerify.isValid) errorParts.push(`署名無効: ${sigVerify.reason ?? ''}`);
    if (!tsVerify.isValid) errorParts.push('TST 無効');
    if (!timeConsistent.isConsistent) errorParts.push(`時刻不整合: ${timeConsistent.reason ?? ''}`);
    if (!messageImprintResult.isValid) errorParts.push(`メッセージインプリント検証失敗: ${messageImprintResult.reason ?? ''}`);
    if (!signerCertResult.isValid) errorParts.push(`署名者証明書無効: ${signerCertResult.reason ?? ''}`);
    if (!tsaCertResult.isValid) errorParts.push(`TSA 証明書無効: ${tsaCertResult.reason ?? ''}`);

    const verificationRecord: VerificationResultRecord = {
      success: overallValid,
      hasRevocation: false,
      errorMessage: overallValid ? undefined : errorParts.join('; ') || undefined,
      recordedAt: new Date().toISOString(),
    };

    await maimlIntegrityService.recordVerificationResult(
      verificationRecord,
      policy,
      pool,
      organizationId,
      userId,
    );

    ok(res, {
      overallValid,
      hashMatch: hashCompare.isMatch,
      recomputedDigest: hashCompare.recomputedDigest,
      storedDigest: hashCompare.storedDigest,
      signatureValid: sigVerify.isValid,
      signatureReason: sigVerify.reason,
      timestampValid: tsVerify.isValid,
      timestampValue: tsVerify.timestamp,
      timeConsistent: timeConsistent.isConsistent,
      timeConsistencyReason: timeConsistent.reason,
      messageImprintValid: messageImprintResult.isValid,
      messageImprintHashMatch: messageImprintResult.hashMatch,
      messageImprintAlgorithmMatch: messageImprintResult.algorithmMatch,
      messageImprintNonceMatch: messageImprintResult.nonceMatch,
      messageImprintReason: messageImprintResult.reason,
      signerCertValid: signerCertResult.isValid,
      signerCertReason: signerCertResult.reason,
      signerCertExpiresAt: signerCertResult.expiresAt,
      tsaCertValid: tsaCertResult.isValid,
      tsaCertReason: tsaCertResult.reason,
      tsaCertExpiresAt: tsaCertResult.expiresAt,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// ハッシュ値のみ取得（軽量確認用）
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/signature/projects/:projectName/hash
 * MAIMLファイルの現在のハッシュ値のみ返す（署名は行わない）
 */
export const getMaimlHash = async (req: Request, res: Response): Promise<void> => {
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

    const policy = DEFAULT_INTEGRITY_POLICY;
    const hashResult = maimlIntegrityService.computeCanonicalHash(xmlContent, policy);

    ok(res, {
      digestValue: hashResult.digestValue,
      algorithmUri: hashResult.algorithmUri,
      computedAt: hashResult.computedAt,
      xmlLength: xmlContent.length,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 証明書検証
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/signature/certificates/validate
 * 証明書（PEM 形式）の有効期限・発行者チェーンを検証
 *
 * リクエストボディ:
 *   - certificate: string   PEM 形式の証明書
 *   - type: 'signer' | 'tsa'
 */
export const validateCertificate = async (req: Request, res: Response): Promise<void> => {
  const { certificate, type } = req.body as {
    certificate: string;
    type: 'signer' | 'tsa';
  };

  if (!certificate || !type) {
    badRequest(res, 'E1003', 'certificate と type は必須です');
    return;
  }

  if (type !== 'signer' && type !== 'tsa') {
    badRequest(res, 'E1005', 'type は "signer" または "tsa" を指定してください');
    return;
  }

  try {
    const result =
      type === 'signer'
        ? maimlIntegrityService.validateSignerCertificate(certificate)
        : maimlIntegrityService.validateTsaCertificate(certificate);

    ok(res, {
      isValid: result.isValid,
      expiresAt: result.expiresAt,
      issuer: result.issuer,
      subject: result.subject,
      reason: result.reason,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ---------------------------------------------------------------------------
// 監査ログ一覧
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/signature/audit-log
 * 改竄防止監査ログを取得
 *
 * @remarks
 * 【local-log モード】インメモリバッファから返す（再起動で消える）。
 * 【db-log モード】integrity_audit_log テーブルから取得する（TODO: 本実装）。
 */
export const getAuditLog = async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.organizationId;

  if (!organizationId) {
    badRequest(res, 'E5012', '組織IDが取得できません');
    return;
  }

  try {
    const policy = DEFAULT_INTEGRITY_POLICY;

    if (policy.auditTarget === 'local-log') {
      // インメモリバッファから返す（テスト・開発用）
      const entries = maimlIntegrityService._getAuditLog();
      ok(res, {
        entries: [...entries],
        total: entries.length,
        source: 'local-log',
        _warning: 'local-log モードのデータはサーバー再起動で消えます',
      });
      return;
    }

    if (policy.auditTarget === 'db-log') {
      // TODO: 本実装 — integrity_audit_log テーブルから organizationId でフィルタして返す
      ok(res, {
        entries: [],
        total: 0,
        source: 'db-log',
        _todo: 'DB クエリ実装後に返す',
      });
      return;
    }

    badRequest(res, 'E4001', `監査ログ取得は auditTarget=${policy.auditTarget} では未対応です`);
  } catch (err) {
    serverError(res, err);
  }
};
