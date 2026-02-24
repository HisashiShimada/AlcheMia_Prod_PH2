/**
 * EventLogRepository
 * 
 * maiml_event_logテーブルへのデータアクセスを担当するリポジトリ
 * イベントログの記録操作を提供します。
 */

import { PoolClient } from 'pg';
import { TransitionStatus } from '../types/transitionData';

/**
 * イベントタイプ
 */
export type EventType = 'transition_status_update' | 'template_data_saved';

/**
 * イベントログデータ
 */
export interface EventLogData {
  event_type: EventType;
  method_id: string;
  task_no: number;
  transition_id?: string;
  place_id?: string;
  status?: TransitionStatus; // 数値型（0-6）
  progress_rate?: number;
  comment?: string | null;
  updated_by: string;
  timestamp: Date;
}

/**
 * データベースエラー
 */
export class DatabaseError extends Error {
  originalError?: Error;

  constructor(message: string = 'Database error', originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * EventLogRepository
 * 
 * maiml_event_logテーブルへのイベント記録操作を提供します。
 * すべての操作でorganization_idによるマルチテナント分離を保証します。
 */
export class EventLogRepository {
  /**
   * イベントログを記録
   * 
   * maiml_event_logテーブルにイベントを記録します。
   * sequence_noは(organization_id, project_id)単位で自動採番されます。
   * 
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param eventData - イベントログデータ
   * @param client - トランザクション用のPoolClient
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async logEvent(
    organizationId: string,
    projectId: string,
    eventData: EventLogData,
    client: PoolClient
  ): Promise<void> {
    try {
      // sequence_noの自動採番
      // organization_idとproject_idの組み合わせで最大値を取得し、+1する
      const sequenceQuery = `
        SELECT COALESCE(MAX(sequence_no), 0) + 1 as next_sequence_no
        FROM maiml_event_log
        WHERE organization_id = $1 AND project_id = $2
      `;

      const sequenceResult = await client.query(sequenceQuery, [
        organizationId,
        projectId,
      ]);

      const nextSequenceNo = sequenceResult.rows[0].next_sequence_no;

      // イベントログをJSONB形式で保存
      // Parameterized Queryを使用してSQLインジェクション対策
      // organization_idフィルタを含め、マルチテナント分離を保証
      const insertQuery = `
        INSERT INTO maiml_event_log (
          organization_id,
          project_id,
          sequence_no,
          log,
          create_user_id,
          create_at,
          update_user_id,
          update_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::jsonb,
          $5,
          CURRENT_TIMESTAMP,
          $5,
          CURRENT_TIMESTAMP
        )
      `;

      // イベントデータをJSONオブジェクトとして構築
      // undefinedのフィールドはJSONに含めない
      const logData: Record<string, unknown> = {
        event_type: eventData.event_type,
        method_id: eventData.method_id,
        task_no: eventData.task_no,
        updated_by: eventData.updated_by,
        timestamp: eventData.timestamp.toISOString(),
      };

      // オプショナルフィールドの追加
      if (eventData.transition_id !== undefined) {
        logData.transition_id = eventData.transition_id;
      }
      if (eventData.place_id !== undefined) {
        logData.place_id = eventData.place_id;
      }
      if (eventData.status !== undefined) {
        logData.status = eventData.status;
      }
      if (eventData.progress_rate !== undefined) {
        logData.progress_rate = eventData.progress_rate;
      }
      if (eventData.comment !== undefined) {
        logData.comment = eventData.comment;
      }

      const params = [
        organizationId,
        projectId,
        nextSequenceNo,
        JSON.stringify(logData), // JSONB型として保存
        eventData.updated_by,
      ];

      await client.query(insertQuery, params);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while logging event',
        error as Error
      );
    }
  }
}
