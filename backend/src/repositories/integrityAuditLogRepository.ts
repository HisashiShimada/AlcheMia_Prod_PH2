/**
 * IntegrityAuditLogRepository
 *
 * integrity_audit_log テーブルへのデータアクセスを担当するリポジトリ。
 * 改竄防止機能（署名・タイムスタンプ）の監査ログ記録操作を提供する。
 *
 * @remarks
 * テーブルは仮設計のため、後日カラム構成が変更される可能性がある。
 * Service層（maimlIntegrityService.ts）の recordTimestampRequest / recordVerificationResult から呼び出す。
 */

import { Pool } from 'pg';
import { loadSqlFile } from '../sql/loader';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/**
 * TSA要求記録の挿入パラメータ
 */
export interface InsertTimestampRequestParams {
  /** 組織ID（マルチテナント分離） */
  organizationId: string;
  /** 送信したハッシュ値 */
  hash: string;
  /** TSA エンドポイント */
  tsaEndpoint: string;
  /** 取得したタイムスタンプ（ISO 8601） */
  timestamp: string;
  /** Service層が記録した日時（ISO 8601） */
  recordedAt: string;
  /** 操作ユーザーID（任意） */
  createdBy?: string | null;
}

/**
 * 検証結果記録の挿入パラメータ
 */
export interface InsertVerificationResultParams {
  /** 組織ID（マルチテナント分離） */
  organizationId: string;
  /** 検証成功したか */
  success: boolean;
  /** 失効の有無（任意） */
  hasRevocation?: boolean | null;
  /** エラーメッセージ（失敗時のみ） */
  errorMessage?: string | null;
  /** 検証時刻（ISO 8601、任意） */
  eventTimestamp?: string | null;
  /** Service層が記録した日時（ISO 8601） */
  recordedAt: string;
  /** 操作ユーザーID（任意） */
  createdBy?: string | null;
}

// ---------------------------------------------------------------------------
// Repository 関数
// ---------------------------------------------------------------------------

/**
 * TSA要求履歴を integrity_audit_log テーブルに記録する。
 *
 * @param pool データベース接続プール
 * @param params 挿入パラメータ
 */
export async function insertTimestampRequest(
  pool: Pool,
  params: InsertTimestampRequestParams,
): Promise<void> {
  const sqlQuery = await loadSqlFile('integrity_audit_log/insertTimestampRequest.sql');
  await pool.query(sqlQuery, [
    params.organizationId,
    params.hash,
    params.tsaEndpoint,
    params.timestamp,
    params.recordedAt,
    params.createdBy ?? null,
  ]);
}

/**
 * 検証結果を integrity_audit_log テーブルに記録する。
 *
 * @param pool データベース接続プール
 * @param params 挿入パラメータ
 */
export async function insertVerificationResult(
  pool: Pool,
  params: InsertVerificationResultParams,
): Promise<void> {
  const sqlQuery = await loadSqlFile('integrity_audit_log/insertVerificationResult.sql');
  await pool.query(sqlQuery, [
    params.organizationId,
    params.success,
    params.hasRevocation ?? null,
    params.errorMessage ?? null,
    params.eventTimestamp ?? null,
    params.recordedAt,
    params.createdBy ?? null,
  ]);
}
