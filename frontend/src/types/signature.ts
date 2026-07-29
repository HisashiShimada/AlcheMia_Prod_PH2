/**
 * 電子署名（XMLDSig）・タイムスタンプ関連の型定義
 *
 * @description
 * MAIMLファイルのDocument要素に対するXML電子署名、タイムスタンプ、
 * 証明書検証、監査ログの型を定義する。
 *
 * @see PLAN.md: docs/tasks/20260717_0810_秘匿化改竄防止API接続実装/PLAN.md
 */

// ---------------------------------------------------------------------------
// 旧型定義（後方互換のため維持）
// ---------------------------------------------------------------------------

/**
 * 署名ステータス値
 * - 'none': 署名なし
 * - 'signed': 署名済み
 */
export type SignatureStatusValue = 'none' | 'signed';

/**
 * 署名ステータス情報
 */
export interface SignatureStatus {
  /** 署名ステータス */
  status: SignatureStatusValue;
  /** 最終署名日時（ISO 8601形式, 例: "2026-06-25T15:00:00.000Z"）署名済みの場合のみ設定 */
  signedAt?: string;
}

/**
 * 署名実行リクエスト
 */
export interface ApplySignatureRequest {
  /** 対象プロジェクト名 */
  projectName: string;
}

/**
 * 署名操作レスポンス
 */
export interface SignatureOperationResponse {
  success: boolean;
  signatureStatus: SignatureStatusValue;
  message?: string;
}

// ---------------------------------------------------------------------------
// ハッシュ
// ---------------------------------------------------------------------------

/**
 * MAIMLハッシュ計算結果
 */
export interface MaimlHashResult {
  /** Base64 ダイジェスト値 */
  digestValue: string;
  /** ハッシュアルゴリズム URI（例: http://www.w3.org/2001/04/xmlenc#sha256） */
  algorithmUri: string;
  /** 計算日時（ISO 8601） */
  computedAt: string;
  /** XML文字数 */
  xmlLength: number;
}

// ---------------------------------------------------------------------------
// 署名実行
// ---------------------------------------------------------------------------

/**
 * 署名実行レスポンス
 */
export interface SignMaimlResponse {
  /** 署名ID */
  signatureId: string;
  /** Base64 ダイジェスト値 */
  digestValue: string;
  /** ハッシュアルゴリズム URI */
  algorithmUri: string;
  /** ハッシュ計算日時（ISO 8601） */
  computedAt: string;
  /** Base64 署名値 */
  signatureValue: string;
  /** 署名アルゴリズム URI */
  signatureAlgorithmUri: string;
  /** 署名日時（ISO 8601） */
  signedAt: string;
  /** TST トークン（Base64） */
  timestampToken: string;
  /** TSA が返した時刻（ISO 8601） */
  timestamp: string;
  /** TSA 識別子 */
  tsaIdentifier: string;
}

// ---------------------------------------------------------------------------
// 署名検証
// ---------------------------------------------------------------------------

/**
 * 署名検証リクエスト
 */
export interface VerifyMaimlRequest {
  /** 検証対象の署名 ID */
  signatureId: string;
  /** Base64 署名値 */
  signatureValue: string;
  /** 保存済みダイジェスト値（Base64） */
  storedHash: string;
  /** 署名者証明書（PEM or 仮識別子） */
  signerCert?: string;
  /** TSA 証明書（PEM or 仮識別子） */
  tsaCert?: string;
}

/**
 * 署名検証レスポンス
 */
export interface VerifyMaimlResponse {
  /** 全体の検証結果 */
  overallValid: boolean;
  /** ハッシュ一致 */
  hashMatch: boolean;
  /** 再計算ダイジェスト */
  recomputedDigest: string;
  /** 保存済みダイジェスト */
  storedDigest: string;
  /** 署名有効 */
  signatureValid: boolean;
  /** 署名検証詳細メッセージ */
  signatureReason?: string;
  /** TST 有効 */
  timestampValid: boolean;
  /** TSA タイムスタンプ値 */
  timestampValue?: string;
  /** 時刻整合性 OK */
  timeConsistent: boolean;
  /** 時刻整合性詳細メッセージ */
  timeConsistencyReason?: string;
  /** 署名者証明書有効 */
  signerCertValid: boolean;
  /** 署名者証明書詳細メッセージ */
  signerCertReason?: string;
  /** 署名者証明書有効期限 */
  signerCertExpiresAt?: string;
  /** TSA 証明書有効 */
  tsaCertValid: boolean;
  /** TSA 証明書詳細メッセージ */
  tsaCertReason?: string;
  /** TSA 証明書有効期限 */
  tsaCertExpiresAt?: string;
}

// ---------------------------------------------------------------------------
// 証明書検証
// ---------------------------------------------------------------------------

/**
 * 証明書検証リクエスト
 */
export interface ValidateCertificateRequest {
  /** PEM 形式の証明書 */
  certificate: string;
  /** 証明書種別 */
  type: 'signer' | 'tsa';
}

/**
 * 証明書検証レスポンス
 */
export interface ValidateCertificateResponse {
  /** 証明書有効 */
  isValid: boolean;
  /** 有効期限（ISO 8601） */
  expiresAt?: string;
  /** 発行者 */
  issuer?: string;
  /** サブジェクト */
  subject?: string;
  /** 詳細メッセージ */
  reason?: string;
}

// ---------------------------------------------------------------------------
// 監査ログ
// ---------------------------------------------------------------------------

/**
 * 監査ログエントリ
 */
export interface AuditLogEntry {
  /** エントリ種別 */
  type: 'timestamp-request' | 'verification-result';
  /** 操作日時（ISO 8601） */
  timestamp: string;
  /** 成否 */
  success?: boolean;
  /** 詳細情報 */
  [key: string]: unknown;
}

/**
 * 監査ログ一覧レスポンス
 */
export interface AuditLogResponse {
  /** エントリ一覧 */
  entries: AuditLogEntry[];
  /** 合計件数 */
  total: number;
  /** データソース */
  source: 'local-log' | 'db-log';
  /** 警告メッセージ（ローカルログモード時） */
  _warning?: string;
}
