/**
 * HTTPステータスコード定数
 *
 * @remarks
 * HTTPステータスコードを直接数値で記述することを避け、
 * 意味のある名前で管理するための定数定義。
 *
 * ルール:
 * - HTTPステータスコードの数値リテラルを直接比較することを推奨しない
 * - 必ずここで定義した定数を import して使用すること
 */
export const HTTP_STATUS = {
  // 2xx Success
  /** 成功 */
  OK: 200,
  /** 作成成功 */
  CREATED: 201,
  /** コンテンツなし */
  NO_CONTENT: 204,

  // 4xx Client Error
  /** 不正なリクエスト */
  BAD_REQUEST: 400,
  /** 認証必須 */
  UNAUTHORIZED: 401,
  /** アクセス拒否 */
  FORBIDDEN: 403,
  /** リソース未存在 */
  NOT_FOUND: 404,
  /** 競合（重複等） */
  CONFLICT: 409,
  /** リクエスト過多（レート制限） */
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Error
  /** サーバー内部エラー */
  INTERNAL_SERVER_ERROR: 500,
  /** ゲートウェイエラー */
  BAD_GATEWAY: 502,
  /** サービス利用不可 */
  SERVICE_UNAVAILABLE: 503,
  /** ゲートウェイタイムアウト */
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatusType = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
