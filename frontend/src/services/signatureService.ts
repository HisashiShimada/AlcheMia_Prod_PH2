/**
 * 改竄防止（署名・タイムスタンプ）APIサービス
 *
 * @description
 * バックエンドの改竄防止API（/api/v1/signature）を呼び出すサービス。
 * 仮実装（local-dummy / local-mock モード）のバックエンドに接続する。
 * バックエンドが本実装（HSM / 外部TSA）に切り替わっても、このファイルの変更は不要。
 *
 * @remarks
 * 旧スタブ関数（getSignatureStatus / applySignature / removeSignature）は
 * 後方互換のため維持しつつ、実APIに接続するよう更新。
 */

import axios from 'axios';
import type {
  SignatureStatus,
  MaimlHashResult,
  SignMaimlResponse,
  VerifyMaimlRequest,
  VerifyMaimlResponse,
  ValidateCertificateRequest,
  ValidateCertificateResponse,
  AuditLogResponse,
} from '@/types/signature';

const BASE_URL = '/api/v1/signature';

// ---------------------------------------------------------------------------
// 旧API（後方互換）
// ---------------------------------------------------------------------------

/**
 * 署名ステータスを取得する（後方互換）
 *
 * @param projectName - 対象プロジェクト名
 * @returns 署名ステータス情報
 *
 * @remarks
 * signMaiml() が成功していれば status: 'signed' を返す。
 * 現在のバックエンドはステータス管理テーブルを持たないため、
 * ハッシュ取得が成功する（= MAIMLが存在する）かどうかで判定する。
 */
export async function getSignatureStatus(projectName: string): Promise<SignatureStatus> {
  try {
    await axios.get<{ success: boolean; data: MaimlHashResult }>(
      `${BASE_URL}/projects/${encodeURIComponent(projectName)}/hash`,
    );
    // MAIMLが存在する場合、ステータスは 'none'（署名実施状況は別途管理が必要）
    return { status: 'none' };
  } catch {
    return { status: 'none' };
  }
}

/**
 * Document全体に対して電子署名を実行する（後方互換）
 *
 * @param projectName - 対象プロジェクト名
 *
 * @remarks
 * 旧インターフェース（void 返却）を維持。
 * 署名詳細が必要な場合は signMaiml() を使用。
 */
export async function applySignature(projectName: string): Promise<void> {
  await signMaiml(projectName);
}

/**
 * Document全体の電子署名を削除する（後方互換）
 *
 * @param projectName - 対象プロジェクト名
 *
 * @remarks
 * 現バックエンドでは署名削除（MAIML内 <Signature> 除去）は未実装（TODO）。
 * 本関数は呼び出し元の互換維持のためのプレースホルダー。
 */
export async function removeSignature(projectName: string): Promise<void> {
  // TODO: 本実装後に DELETE /api/v1/signature/projects/:name/signature を呼び出す
  console.warn('[signatureService] removeSignature: バックエンド未実装のためスキップ', projectName);
}

// ---------------------------------------------------------------------------
// ハッシュ
// ---------------------------------------------------------------------------

/**
 * MAIMLファイルの現在のハッシュ値を取得（署名は行わない）
 *
 * @param projectName - 対象プロジェクト名
 * @returns ハッシュ計算結果
 */
export async function getMaimlHash(projectName: string): Promise<MaimlHashResult> {
  const res = await axios.get<{ success: boolean; data: MaimlHashResult }>(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/hash`,
  );
  return res.data.data;
}

// ---------------------------------------------------------------------------
// 署名実行
// ---------------------------------------------------------------------------

/**
 * MAIMLファイルのハッシュ計算 → 署名 → TST取得 → 監査ログ記録を一括実行
 *
 * @param projectName - 対象プロジェクト名
 * @param signatureId - 署名ID（省略時はバックエンドで自動採番）
 * @returns 署名実行レスポンス（signatureId, digestValue, signatureValue, timestampToken 等）
 */
export async function signMaiml(
  projectName: string,
  signatureId?: string,
): Promise<SignMaimlResponse> {
  const res = await axios.post<{ success: boolean; data: SignMaimlResponse }>(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/sign`,
    signatureId ? { signatureId } : {},
  );
  return res.data.data;
}

// ---------------------------------------------------------------------------
// 署名検証
// ---------------------------------------------------------------------------

/**
 * MAIMLファイルの署名・TST・証明書を一括検証
 *
 * @param projectName - 対象プロジェクト名
 * @param request - 署名検証リクエスト（signatureId, signatureValue, storedHash 等）
 * @returns 署名検証レスポンス（overallValid, hashMatch, signatureValid 等）
 */
export async function verifyMaiml(
  projectName: string,
  request: VerifyMaimlRequest,
): Promise<VerifyMaimlResponse> {
  const res = await axios.post<{ success: boolean; data: VerifyMaimlResponse }>(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/verify`,
    request,
  );
  return res.data.data;
}

// ---------------------------------------------------------------------------
// 証明書検証
// ---------------------------------------------------------------------------

/**
 * 証明書（PEM 形式）の有効期限・発行者チェーンを検証
 *
 * @param request - 証明書検証リクエスト（certificate, type）
 * @returns 証明書検証レスポンス（isValid, expiresAt, issuer 等）
 */
export async function validateCertificate(
  request: ValidateCertificateRequest,
): Promise<ValidateCertificateResponse> {
  const res = await axios.post<{ success: boolean; data: ValidateCertificateResponse }>(
    `${BASE_URL}/certificates/validate`,
    request,
  );
  return res.data.data;
}

// ---------------------------------------------------------------------------
// 監査ログ
// ---------------------------------------------------------------------------

/**
 * 改竄防止監査ログ一覧を取得
 *
 * @returns 監査ログ一覧（entries, total, source）
 *
 * @remarks
 * local-log モード: インメモリバッファから返す（サーバー再起動で消える）。
 * db-log モード:    DB から返す（本実装後）。
 */
export async function getAuditLog(): Promise<AuditLogResponse> {
  const res = await axios.get<{ success: boolean; data: AuditLogResponse }>(
    `${BASE_URL}/audit-log`,
  );
  return res.data.data;
}
