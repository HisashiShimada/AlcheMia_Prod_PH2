/**
 * TemplateDataRepository
 * 
 * template_dataテーブルへのデータアクセスを担当するリポジトリ
 * 実験データ（Material、Condition、Result）のCRUD操作を提供します。
 */

import { PoolClient } from 'pg';

/**
 * テンプレートタイプ
 */
export type TemplateType = 'material' | 'condition' | 'result';

/**
 * ステータス
 */
export type Status = 'initial' | 'preparing' | 'ready' | 'running' | 'paused' | 'completed' | 'error';

/**
 * テンプレートデータレコード（挿入/更新用）
 */
export interface TemplateDataRecord {
  placeId: string;
  templateType: TemplateType;
  templateId: string;
  data: Record<string, unknown>; // JSONB
  status?: Status;
  comment?: string;
}

/**
 * テンプレートデータのデータベース行型（取得結果）
 */
export interface TemplateDataRow {
  id: string; // UUID
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  place_id: string;
  template_type: TemplateType;
  template_id: string;
  data: Record<string, unknown>; // JSONB
  status: Status | null;
  comment: string | null;
  recorded_by: string; // UUID
  recorded_at: Date;
  created_at: Date;
  updated_at: Date;
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
 * TemplateDataRepository
 * 
 * template_dataテーブルへのCRUD操作を提供します。
 * すべての操作でorganization_idによるマルチテナント分離を保証します。
 */
export class TemplateDataRepository {
  /**
   * テンプレートデータをUPSERT（INSERT or UPDATE）
   * 
   * 一意キー(organization_id, project_id, method_id, task_no, place_id)で
   * 既存レコードを検索し、存在する場合は更新、存在しない場合は新規作成します。
   * 
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param record - テンプレートデータレコード
   * @param recordedBy - 記録者のユーザーID
   * @param client - トランザクション用のPoolClient
   * @returns 保存されたテンプレートデータ
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async upsert(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    record: TemplateDataRecord,
    recordedBy: string,
    client: PoolClient
  ): Promise<TemplateDataRow> {
    try {
      // Parameterized Queryを使用してSQLインジェクション対策
      // ON CONFLICT ... DO UPDATEでUPSERT操作を実現
      // organization_idフィルタを含め、マルチテナント分離を保証
      const query = `
        INSERT INTO template_data (
          organization_id,
          project_id,
          method_id,
          task_no,
          place_id,
          template_type,
          template_id,
          data,
          status,
          comment,
          recorded_by,
          recorded_at,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (organization_id, project_id, method_id, task_no, place_id)
        DO UPDATE SET
          template_type = EXCLUDED.template_type,
          template_id = EXCLUDED.template_id,
          data = EXCLUDED.data,
          status = EXCLUDED.status,
          comment = EXCLUDED.comment,
          recorded_by = EXCLUDED.recorded_by,
          recorded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING
          id,
          organization_id,
          project_id,
          method_id,
          task_no,
          place_id,
          template_type,
          template_id,
          data,
          status,
          comment,
          recorded_by,
          recorded_at,
          created_at,
          updated_at
      `;

      const params = [
        organizationId,
        projectId,
        methodId,
        taskNo,
        record.placeId,
        record.templateType,
        record.templateId,
        JSON.stringify(record.data), // JSONB型として保存
        record.status || null,
        record.comment || null,
        recordedBy,
      ];

      const result = await client.query(query, params);
      return result.rows[0] as TemplateDataRow;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while upserting template data',
        error as Error
      );
    }
  }

  /**
   * タスク番号でテンプレートデータを取得
   * 
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param client - トランザクション用のPoolClient
   * @returns テンプレートデータの配列
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async findByTaskNo(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    client: PoolClient
  ): Promise<TemplateDataRow[]> {
    try {
      // Parameterized Queryを使用してSQLインジェクション対策
      // organization_idフィルタを必須とし、マルチテナント分離を保証
      const query = `
        SELECT
          id,
          organization_id,
          project_id,
          method_id,
          task_no,
          place_id,
          template_type,
          template_id,
          data,
          status,
          comment,
          recorded_by,
          recorded_at,
          created_at,
          updated_at
        FROM template_data
        WHERE organization_id = $1
          AND project_id = $2
          AND method_id = $3
          AND task_no = $4
        ORDER BY place_id
      `;

      const params = [organizationId, projectId, methodId, taskNo];
      const result = await client.query(query, params);

      return result.rows as TemplateDataRow[];
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while finding template data by task number',
        error as Error
      );
    }
  }

  /**
   * プレースIDでテンプレートデータを取得
   * 
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param placeId - プレースID
   * @param client - トランザクション用のPoolClient
   * @returns テンプレートデータ、見つからない場合はnull
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async findByPlaceId(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    placeId: string,
    client: PoolClient
  ): Promise<TemplateDataRow | null> {
    try {
      // Parameterized Queryを使用してSQLインジェクション対策
      // organization_idフィルタを必須とし、マルチテナント分離を保証
      const query = `
        SELECT
          id,
          organization_id,
          project_id,
          method_id,
          task_no,
          place_id,
          template_type,
          template_id,
          data,
          status,
          comment,
          recorded_by,
          recorded_at,
          created_at,
          updated_at
        FROM template_data
        WHERE organization_id = $1
          AND project_id = $2
          AND method_id = $3
          AND task_no = $4
          AND place_id = $5
      `;

      const params = [organizationId, projectId, methodId, taskNo, placeId];
      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as TemplateDataRow;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while finding template data by place ID',
        error as Error
      );
    }
  }
}
