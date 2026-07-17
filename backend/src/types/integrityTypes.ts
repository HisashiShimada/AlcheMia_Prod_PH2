/**
 * 改竄防止機能 バックエンド型定義
 *
 * @remarks
 * maimlIntegrityService で使用するハッシュ・署名・タイムスタンプ・証明書・監査の型定義
 */

// ---------------------------------------------------------------------------
// IntegrityPolicy（プロバイダ切り替え用ポリシー）
// ---------------------------------------------------------------------------

/**
 * 改竄防止機能のポリシー設定
 *
 * @remarks
 * signatureProvider / tsaProvider が未確定のため、現在は `local-dummy` / `local-mock` のみ実装済み。
 * 本実装フェーズで `hsm`, `external-tsa` 等への切り替えを行う。
 */
export interface IntegrityPolicy {
  /**
   * 署名鍵プロバイダ
   * - `local-file`: test-keys/signing/{keyName}.pem を読み込む（テスト用）
   * - `local-dummy`: インメモリで仮の鍵ペアを生成（非推奨 / deprecated）
   * - `hsm`: ハードウェアセキュリティモジュール（未実装）
   */
  signatureProvider: 'local-file' | 'local-dummy' | 'hsm';
  /**
   * タイムスタンプ局（TSA）プロバイダ
   * - `local-mock`: ローカル時刻を返すモック（仮実装、本番運用不可）
   * - `external-tsa`: 外部 TSA サーバーと通信（未実装）
   */
  tsaProvider: 'local-mock' | 'external-tsa';
  /**
   * ハッシュアルゴリズム（SHA-2 以上）
   */
  hashAlgorithm: 'sha256' | 'sha384' | 'sha512';
  /**
   * 監査ログの出力先
   * - `local-log`: サーバー上のログファイルに出力（仮実装）
   * - `cloudtrail`: AWS CloudTrail に出力（未実装）
   */
  auditTarget: 'local-log' | 'db-log' | 'cloudtrail';
}

/** デフォルトの IntegrityPolicy（テスト用: local-file を使用） */
export const DEFAULT_INTEGRITY_POLICY: IntegrityPolicy = {
  signatureProvider: 'local-file',
  tsaProvider: 'local-mock',
  hashAlgorithm: 'sha256',
  auditTarget: 'local-log',
} as const;

/** ハッシュアルゴリズム URI マップ（W3C XML Signature 準拠） */
export const HASH_ALGORITHM_URI_MAP: Record<IntegrityPolicy['hashAlgorithm'], string> = {
  sha256: 'http://www.w3.org/2001/04/xmlenc#sha256',
  sha384: 'http://www.w3.org/2001/04/xmldsig-more#sha384',
  sha512: 'http://www.w3.org/2001/04/xmlenc#sha512',
} as const;

// ---------------------------------------------------------------------------
// ハッシュ生成
// ---------------------------------------------------------------------------

/**
 * 正規化ハッシュの計算結果
 */
export interface CanonicalHashResult {
  /** ダイジェスト値（Base64 エンコード） */
  digestValue: string;
  /** 使用したアルゴリズムの URI */
  algorithmUri: string;
  /** 計算日時（ISO 8601） */
  computedAt: string;
}

/**
 * ハッシュ再計算・比較結果
 */
export interface HashCompareResult {
  /** 一致しているか */
  isMatch: boolean;
  /** 再計算したダイジェスト値 */
  recomputedDigest: string;
  /** 保存されていたダイジェスト値 */
  storedDigest: string;
}

// ---------------------------------------------------------------------------
// 署名鍵
// ---------------------------------------------------------------------------

/**
 * 仮実装用の秘密鍵表現
 *
 * @remarks
 * `local-dummy` プロバイダでのみ使用。
 * 本実装では HSM の鍵ハンドル等に置き換える。
 */
export interface DummyPrivateKey {
  /** 鍵の識別子 */
  keyId: string;
  /** 鍵素材（仮実装用: PEM 形式の文字列） */
  pem: string;
  /** 鍵生成日時（ISO 8601） */
  createdAt: string;
}

/**
 * 仮実装用の公開鍵表現
 */
export interface DummyPublicKey {
  /** 対応する秘密鍵の識別子 */
  keyId: string;
  /** 鍵素材（仮実装用: PEM 形式の文字列） */
  pem: string;
}

// ---------------------------------------------------------------------------
// 署名生成・検証
// ---------------------------------------------------------------------------

/**
 * 署名生成結果
 */
export interface SignatureResult {
  /** 署名 ID（`<Signature Id="...">` に使用） */
  signatureId: string;
  /** 署名値（Base64 エンコード） */
  signatureValue: string;
  /** 署名アルゴリズムの URI */
  signatureAlgorithmUri: string;
  /** 署名日時（ISO 8601） */
  signedAt: string;
}

/**
 * 署名検証結果
 */
export interface SignatureVerifyResult {
  /** 署名が有効か */
  isValid: boolean;
  /** 検証失敗の理由（失敗時のみ） */
  reason?: string;
}

// ---------------------------------------------------------------------------
// タイムスタンプ
// ---------------------------------------------------------------------------

/**
 * TSA へのリクエスト（RFC 3161 TSQ に相当）
 */
export interface TimestampRequest {
  /** 署名値のハッシュ（Base64 エンコード） */
  hashedMessage: string;
  /** 使用するハッシュアルゴリズムの OID または URI */
  hashAlgorithm: string;
  /** リクエスト ID（任意） */
  nonce?: string;
}

/**
 * タイムスタンプトークン（RFC 3161 TST に相当）
 *
 * @remarks
 * `local-mock` プロバイダでは `token` に仮の文字列を設定。
 * `external-tsa` では実際の DER/Base64 エンコードされたトークンを設定する。
 */
export interface TimestampToken {
  /** タイムスタンプトークン本体（Base64 エンコードまたは仮の文字列） */
  token: string;
  /** タイムスタンプ値（ISO 8601） */
  timestamp: string;
  /** TSA の識別子（エンドポイントURL または名前） */
  tsaIdentifier: string;
  /** 対応する署名 ID */
  signatureId: string;
}

/**
 * タイムスタンプトークン検証結果
 */
export interface TimestampVerifyResult {
  /** トークンが有効か */
  isValid: boolean;
  /** タイムスタンプ値（ISO 8601） */
  timestamp?: string;
  /** 検証失敗の理由（失敗時のみ） */
  reason?: string;
}

/**
 * タイムスタンプ時刻整合性チェック結果
 */
export interface TimeConsistencyResult {
  /** 整合性が取れているか（タイムスタンプ ≥ 作成日） */
  isConsistent: boolean;
  /** タイムスタンプ値（ISO 8601） */
  timestamp: string;
  /** 作成日（ISO 8601） */
  creationDate: string;
  /** 不整合の理由（不整合の場合のみ） */
  reason?: string;
}

// ---------------------------------------------------------------------------
// 証明書・信頼チェーン管理
// ---------------------------------------------------------------------------

/**
 * 証明書検証結果
 */
export interface CertificateValidationResult {
  /** 証明書が有効か */
  isValid: boolean;
  /** 有効期限（ISO 8601） */
  expiresAt?: string;
  /** 失効しているか */
  isRevoked?: boolean;
  /** 発行者 */
  issuer?: string;
  /** サブジェクト */
  subject?: string;
  /** 検証失敗の理由（失敗時のみ） */
  reason?: string;
}

// ---------------------------------------------------------------------------
// 記録・監査
// ---------------------------------------------------------------------------

/**
 * タイムスタンプ要求の記録エントリ
 */
export interface TimestampRequestRecord {
  /** 送信したハッシュ値 */
  hash: string;
  /** TSA エンドポイント */
  tsaEndpoint: string;
  /** 取得したタイムスタンプ（ISO 8601） */
  timestamp: string;
  /** 記録日時（ISO 8601） */
  recordedAt: string;
}

/**
 * 検証結果の記録エントリ
 */
export interface VerificationResultRecord {
  /** 検証成功したか */
  success: boolean;
  /** 失効の有無 */
  hasRevocation?: boolean;
  /** エラーメッセージ（失敗時のみ） */
  errorMessage?: string;
  /** 記録日時（ISO 8601） */
  recordedAt: string;
}
