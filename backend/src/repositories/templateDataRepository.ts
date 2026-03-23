/**
 * TemplateDataRepository
 * 
 * template_dataテーブルへのデータアクセスを担当するリポジトリ
 * 実験データ（テンプレート実績）のCRUD操作を提供します。
 * 
 * @remarks
 * 実際のDBスキーマ（旧スキーマ）に準拠:
 *   PK: (organization_id, project_id, method_id, task_no, place_id)
 *   データ本体: property_set (JSONB)
 *   監査: create_user_id, update_user_id, create_at, update_at
 */

import { PoolClient } from 'pg';
import { loadSqlFile } from '../sql/loader';
import type { Property } from '../types/maiml-unified';

/**
 * property_set JSONB の型定義
 * template_data.property_set カラムに格納されるJSONBの構造
 *
 * @remarks
 * properties の型を maiml-unified.Property に統一。
 * PropertySetProperty インターフェースは廃止済み。
 */
export interface PropertySet {
  templateId: string;
  templateType: 'material' | 'condition' | 'result';
  properties: Property[];
}


/**
 * テンプレートデータレコード（UPSERT用）
 */
export interface TemplateDataRecord {
  placeId: string;
  propertySet: PropertySet;
  updateUserId: string;
}

/**
 * テンプレートデータのデータベース行型（取得結果）
 * docs/design/db/ddl/template_data.sql に準拠
 */
export interface TemplateDataRow {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  place_id: string;
  property_set: PropertySet | null;
  create_user_id: string | null;
  update_user_id: string | null;
  create_at: Date;
  update_at: Date;
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
    client: PoolClient
  ): Promise<TemplateDataRow> {
    try {
      // 外部SQLファイルを読み込み
      const query = await loadSqlFile('template_data/upsert.sql');

      const params = [
        organizationId,
        projectId,
        methodId,
        taskNo,
        record.placeId,
        JSON.stringify(record.propertySet), // JSONB型として保存
        record.updateUserId, // create_user_id（新規INSERT時）
        record.updateUserId, // update_user_id
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
      // 外部SQLファイルを読み込み
      const query = await loadSqlFile('template_data/findByTaskNo.sql');

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
      // 外部SQLファイルを読み込み
      const query = await loadSqlFile('template_data/findByPlaceId.sql');

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

  /**
   * テンプレート実績を1件INSERT（タスク登録時の初期レコード作成用）
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param placeId - プレースID
   * @param propertySet - テンプレートプロパティ定義（JSON形式）
   * @param userId - 作成・更新ユーザーID
   * @param client - トランザクション用PoolClient
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async insert(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    placeId: string,
    propertySet: Record<string, unknown> | null,
    userId: string,
    client: PoolClient
  ): Promise<void> {
    try {
      const query = await loadSqlFile('template_data/insert.sql');
      const params = [
        organizationId,
        projectId,
        methodId,
        taskNo,
        placeId,
        propertySet !== null ? JSON.stringify(propertySet) : null, // JSONB
        userId, // create_user_id
        userId  // update_user_id
      ];
      await client.query(query, params);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while inserting template data',
        error as Error
      );
    }
  }

  /**
   * プロジェクト内のテンプレート実績を全件削除（タスク登録再保存時）
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param client - トランザクション用PoolClient
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async deleteByProject(
    organizationId: string,
    projectId: string,
    client: PoolClient
  ): Promise<void> {
    try {
      const query = await loadSqlFile('template_data/deleteByProject.sql');
      await client.query(query, [organizationId, projectId]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while deleting template data by project',
        error as Error
      );
    }
  }
}
