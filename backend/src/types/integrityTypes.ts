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

// ---------------------------------------------------------------------------
// RFC 3161 準拠の型定義（TSA リクエスト・レスポンス構造）
// ---------------------------------------------------------------------------
// 参照: RFC 3161 "Internet X.509 PKI Time-Stamp Protocol (TSP)"
// 本セクションは ASN.1 構造の TypeScript 表現であり、仮実装フェーズでは
// DER エンコード・デコードは行わない（外部 TSA サービス選定後の本実装で対応）。

/**
 * PKIStatus — タイムスタンプ応答のステータスコード
 *
 * @remarks
 * RFC 3161 Section 2.4.2 PKIStatus に対応。
 * `granted`/`grantedWithMods` が正常応答、それ以外はエラー。
 */
export enum PKIStatus {
  /** タイムスタンプが要求通り発行された */
  granted = 0,
  /** タイムスタンプが発行されたが変更を加えた */
  grantedWithMods = 1,
  /** 要求が拒否された */
  rejection = 2,
  /** 処理待ち状態 */
  waiting = 3,
  /** 証明書失効警告 */
  revocationWarning = 4,
  /** 証明書失効通知 */
  revocationNotification = 5,
}

/**
 * PKIFailureInfo — タイムスタンプ応答の失敗情報
 *
 * @remarks
 * RFC 3161 Section 2.4.2 PKIFailureInfo に対応。
 * ASN.1 BIT STRING のビット位置を文字列 union で表現している（仮実装）。
 */
export type PKIFailureInfo =
  | 'badAlg'               // bit 0: 要求されたハッシュアルゴリズムが未サポート
  | 'badRequest'           // bit 2: 要求に問題がある
  | 'badDataFormat'        // bit 5: データ形式エラー
  | 'timeNotAvailable'     // bit 14: TSA の時刻情報が利用不可
  | 'unacceptedPolicy'     // bit 15: 要求されたポリシーがサポートされない
  | 'unacceptedExtension'  // bit 16: 要求された拡張がサポートされない
  | 'addInfoNotAvailable'  // bit 17: 追加情報が利用不可
  | 'systemFailure';       // bit 25: システム障害

/**
 * PKIStatusInfo — タイムスタンプ応答のステータス情報
 *
 * @remarks
 * RFC 3161 Section 2.4.2 PKIStatusInfo に対応。
 */
export interface PKIStatusInfo {
  /** ステータスコード */
  status: PKIStatus;
  /** エラーメッセージ（任意） */
  statusString?: string[];
  /** 失敗理由（rejection 時） */
  failInfo?: PKIFailureInfo;
}

/**
 * AlgorithmIdentifier — アルゴリズム識別子
 *
 * @remarks
 * X.509 / RFC 5280 AlgorithmIdentifier に対応。
 * 仮実装では `algorithm` に OID 文字列（例: '2.16.840.1.101.3.4.2.1' = sha256）を設定する。
 * `parameters` は本実装フェーズで DER エンコードされた値として使用予定。
 */
export interface AlgorithmIdentifier {
  /** アルゴリズム OID 文字列 */
  algorithm: string;
  /** アルゴリズムパラメータ（仮実装では未使用） */
  parameters?: string;
}

/**
 * OID定数: よく使うハッシュアルゴリズムのOID
 */
export const OID = {
  sha256: '2.16.840.1.101.3.4.2.1',
  sha384: '2.16.840.1.101.3.4.2.2',
  sha512: '2.16.840.1.101.3.4.2.3',
  /** RFC 3161 TimeStampToken の contentType */
  signedData: '1.2.840.113549.1.7.2',
  /** RFC 3161 id-smime-aa-timeStampToken */
  id_ct_TSTInfo: '1.2.840.113549.1.9.16.1.4',
} as const;

/**
 * MessageImprint — ハッシュ対象のメッセージイプリント
 *
 * @remarks
 * RFC 3161 Section 2.4.1 MessageImprint に対応。
 * `hashedMessage` は OCTET STRING の Base64 表現（仮実装）。
 */
export interface MessageImprint {
  /** 使用したハッシュアルゴリズム */
  hashAlgorithm: AlgorithmIdentifier;
  /**
   * ハッシュ値
   * @remarks OCTET STRING → Base64 文字列（仮実装）。
   * 本実装では DER エンコードされたバイト列を Base64 で保持。
   */
  hashedMessage: string;
}

/**
 * Accuracy — タイムスタンプの精度
 *
 * @remarks
 * RFC 3161 Section 2.4.2 Accuracy に対応。
 * 各フィールドは秒・ミリ秒・マイクロ秒の誤差範囲を示す。
 */
export interface Accuracy {
  /** 秒単位の誤差 */
  seconds?: number;
  /** ミリ秒単位の誤差 (0〜999) */
  millis?: number;
  /** マイクロ秒単位の誤差 (0〜999) */
  micros?: number;
}

/**
 * GeneralName — 一般名称（TSA の識別に使用）
 *
 * @remarks
 * X.509 GeneralName の簡易表現。
 * 仮実装では `directoryName`（Distinguished Name 文字列）のみを使用する。
 * 本実装ではより多くの GeneralName 形式（dNSName, uniformResourceIdentifier 等）に対応予定。
 */
export interface GeneralName {
  /** Distinguished Name 文字列（例: 'CN=Mock TSA, O=LocalTest'） */
  directoryName?: string;
  /** URI 形式（例: 'http://tsa.example.com'） */
  uri?: string;
}

/**
 * TSTInfo — タイムスタンプトークンの内容
 *
 * @remarks
 * RFC 3161 Section 2.4.2 TSTInfo に対応。
 * 本フィールドが TimeStampToken（CMS SignedData）の署名対象となる。
 * 仮実装では `genTime` に現在時刻を ISO 8601 形式で設定し、
 * `serialNumber` に UUID 文字列を設定する。
 */
export interface TSTInfo {
  /** バージョン（RFC 3161 では常に 1） */
  version: 1;
  /** TSA のポリシー OID（例: '1.3.6.1.4.1.99999.1.1'） */
  policy: string;
  /** リクエスト時と同じメッセージイプリント */
  messageImprint: MessageImprint;
  /**
   * シリアル番号（各 TSA トークンの一意識別子）
   * @remarks INTEGER → 文字列表現（仮実装では UUID を使用）
   */
  serialNumber: string;
  /**
   * タイムスタンプ発行時刻
   * @remarks GeneralizedTime → ISO 8601 文字列（仮実装）
   */
  genTime: string;
  /** 時刻精度（任意） */
  accuracy?: Accuracy;
  /**
   * 時刻順序保証フラグ（DEFAULT FALSE）
   * @remarks true の場合、同 TSA の連続する genTime は必ず単調増加
   */
  ordering: boolean;
  /** リクエスト時の nonce（任意） */
  nonce?: string;
  /** TSA の識別名（任意） */
  tsa?: GeneralName;
}

/**
 * Rfc3161TimestampToken — RFC 3161 TimeStampToken（CMS SignedData の表現）
 *
 * @remarks
 * RFC 3161 Section 3 TimeStampToken に対応。
 * ASN.1 上は `ContentInfo { contentType: id-signedData, content: SignedData }` だが、
 * 仮実装では `TSTInfo` をデコード済みオブジェクトとして直接保持し、
 * `rawToken` にJSON→Base64した疑似DERを設定する。
 * 本実装フェーズでは `rawToken` に実際の DER エンコードバイト列（Base64）が入る。
 *
 * ※ 既存の簡易型 `TimestampToken`（integrityTypes.ts）と名前が被るため `Rfc3161TimestampToken` とする。
 */
export interface Rfc3161TimestampToken {
  /**
   * ContentInfo の contentType OID
   * @remarks 常に `OID.signedData`（`'1.2.840.113549.1.7.2'`）
   */
  contentType: string;
  /** デコード済みの TSTInfo（署名対象の中身） */
  tstInfo: TSTInfo;
  /**
   * トークン全体のバイト列（Base64）
   * @remarks
   * 仮実装: `JSON.stringify(tstInfo)` を Base64 エンコードした疑似値。
   * 本実装: DER エンコードされた CMS SignedData 全体の Base64。
   */
  rawToken: string;
}

/**
 * TimeStampResp — TSA からのタイムスタンプ応答（RFC 3161 TimeStampResp）
 *
 * @remarks
 * RFC 3161 Section 2.4.2 TimeStampResp に対応。
 * `status.status === PKIStatus.granted` の場合のみ `timeStampToken` が存在する。
 */
export interface TimeStampResp {
  /** ステータス情報 */
  status: PKIStatusInfo;
  /** タイムスタンプトークン（発行成功時のみ） */
  timeStampToken?: Rfc3161TimestampToken;
}

/**
 * TimeStampReq — TSA へのタイムスタンプリクエスト（RFC 3161 TimeStampReq）
 *
 * @remarks
 * RFC 3161 Section 2.4.1 TimeStampReq に対応。
 * 仮実装では `certReq: false`、`reqPolicy` / `extensions` は省略する。
 */
export interface TimeStampReq {
  /** バージョン（RFC 3161 では常に 1） */
  version: 1;
  /** ハッシュ対象のメッセージイプリント */
  messageImprint: MessageImprint;
  /** 要求する TSA ポリシー OID（任意） */
  reqPolicy?: string;
  /**
   * ノンス（リプレイ攻撃防止用のランダム値、任意）
   * @remarks INTEGER → 文字列表現（仮実装では UUID 由来の hex 文字列）
   */
  nonce?: string;
  /**
   * TSA 証明書をレスポンスに含めるよう要求するか（DEFAULT FALSE）
   */
  certReq: boolean;
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
