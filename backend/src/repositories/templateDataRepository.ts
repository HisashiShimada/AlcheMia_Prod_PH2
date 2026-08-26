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
import { getPool, getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import type { Property, Content, Insertion } from '../types/maiml-unified';
import type { TemplateActualCount } from '../types/database';

/**
 * property_set JSONB の型定義
 * template_data.property_set カラムに格納されるJSONBの構造
 *
 * @remarks
 * - properties: <property> タグとして出力される通常プロパティ（insertion も含む）
 * - contents:   <content> タグとして出力されるリストデータ（contentXxxListType）
 *               カスタムプロパティの containerType === 'content' の場合に格納
 */
export interface PropertySet {
  templateId: string;
  templateType: 'material' | 'condition' | 'result';
  /** MAIMLファイル内のテンプレート名（<name>タグ）。存在しない場合はnull */
  templateName?: string | null;
  properties: Property[];
  /** insertion コンテナ型のカスタムプロパティ（containerType === 'insertion'） */
  insertions?: Insertion[];
  /** content コンテナ型のカスタムプロパティ（containerType === 'content'） */
  contents?: Content[];
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
      console.log(record.propertySet);

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
   * プレースID群ごとのテンプレート実績数をtype別に集計
   *
   * progressService の getSingleTransitionProgress() から移行。
   *
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @param methodId メソッドID
   * @param taskNo タスク番号
   * @param placeIds プレースIDの配列
   * @returns template_type / count の配列
   */
  async countActualByPlaceIds(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    placeIds: string[]
  ): Promise<TemplateActualCount[]> {
    try {
      const pgp = getPgp();
      const query = await loadSqlFile('template_data/countActualByPlaceIds.sql');
      return await pgp.any<TemplateActualCount>(query, [organizationId, projectId, methodId, taskNo, placeIds]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while counting actual by place ids',
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

  /**
   * planned_values のテンプレート想定値を property_set に反映して一括 UPDATE
   *
   * - `planValues`: { [fieldKey]: value } のフラットマップ
   * - `method_id` / `task_no` に一致する全 template_data を取得し、
   *   各行の properties[] を走査して fieldKey が一致するものの value を上書きする
   * - templateId によるフィルタは行わず、全行を対象に key 照合する
   * - 更新対象が 0 件でも エラーにしない（no-op）
   *
   * @param organizationId - 組織ID
   * @param projectId      - プロジェクトID
   * @param methodId       - メソッドID
   * @param taskNo         - タスク番号
   * @param planValues     - { [fieldKey]: value } 形式のフラットな想定値マップ
   * @param userId         - 更新ユーザーID
   * @param client         - トランザクション用 PoolClient
   */
  async updatePropertySetByPlan(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    planValues: Record<string, string>,
    userId: string,
    client: PoolClient
  ): Promise<void> {
    // 1. 対象の template_data を取得
    const rows = await this.findByTaskNo(organizationId, projectId, methodId, taskNo, client);

    for (const row of rows) {
      if (!row.property_set) continue;

      // 2. properties[] の value を更新（planValues に fieldKey が存在するもののみ）
      // planned_values の templateValues キーは以下2形式を許容する:
      //   1. 単純形式: prop.key そのまま（例: "condition1"）
      //   2. 複合形式: "{templateId}_{prop.key}"（例: "conditionTemplate_xxx_condition1"）
      // フロントエンドは {templateId}_{fieldKey} 形式で保存するため、両形式でフォールバック検索する
      const templateId = row.property_set.templateId as string | undefined;
      const updatedProperties = row.property_set.properties.map((prop) => {
        const simpleKey = prop.key;
        const compositeKey = templateId ? `${templateId}_${prop.key}` : undefined;
        const newValue =
          planValues[simpleKey] ??
          (compositeKey !== undefined ? planValues[compositeKey] : undefined) ??
          // フォールバック: templateId が取得できない場合に "_${prop.key}" で終わるキーを全スキャン
          Object.entries(planValues).find(([k]) => k === simpleKey || k.endsWith(`_${simpleKey}`))?.[1];
        if (newValue !== undefined) {
          return { ...prop, value: newValue };
        }
        return prop;
      });

      const updatedPropertySet: PropertySet = {
        ...row.property_set,
        properties: updatedProperties,
      };

      const record: TemplateDataRecord = {
        placeId: row.place_id,
        propertySet: updatedPropertySet,
        updateUserId: userId,
      };

      // 3. UPSERT で保存
      await this.upsert(organizationId, projectId, methodId, taskNo, record, client);
    }
  }

  /**
   * @deprecated 旧方式（ExperimentPlanDialog での __uncertainty__ 割り当て）専用メソッド。
   * 新方式（WorkRecordPanel での手入力 + uncertainty_judge テーブル）では使用しない。
   * 参照コードが残存している場合に備えて削除せず残置。
   *
   * planned_values の不確かさ情報を property_set.properties[].uncertainties に反映して一括 UPDATE
   */
  async updatePropertySetByPlanWithUncertainty(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    planUncertainties: Record<string, unknown[]>,
    userId: string,
    client: PoolClient
  ): Promise<void> {
    // 1. 対象の template_data を取得
    const rows = await this.findByTaskNo(organizationId, projectId, methodId, taskNo, client);

    for (const row of rows) {
      if (!row.property_set) continue;

      let changed = false;

      // 2. properties[] の uncertainties を更新（planUncertainties に propertyKey が存在するもののみ）
      // planned_values の __uncertainty__ キーは以下2形式を許容する:
      //   1. 単純形式: prop.key そのまま（例: "condition1"）
      //   2. 複合形式: "{templateId}_{prop.key}"（例: "conditionTemplate_xxx_condition1"）
      // どちらの形式でも照合できるようにフォールバック検索する
      const templateId = row.property_set.templateId as string | undefined;
      const updatedProperties = row.property_set.properties.map((prop) => {
        const simpleKey = prop.key;
        const compositeKey = templateId ? `${templateId}_${prop.key}` : undefined;
        const newUncertainties =
          planUncertainties[simpleKey] ??
          (compositeKey !== undefined ? planUncertainties[compositeKey] : undefined);
        if (newUncertainties !== undefined && Array.isArray(newUncertainties)) {
          changed = true;
          return { ...prop, uncertainties: newUncertainties };
        }
        return prop;
      });

      if (!changed) continue;

      const updatedPropertySet: PropertySet = {
        ...row.property_set,
        properties: updatedProperties,
      };

      const record: TemplateDataRecord = {
        placeId: row.place_id,
        propertySet: updatedPropertySet,
        updateUserId: userId,
      };

      // 3. UPSERT で保存
      await this.upsert(organizationId, projectId, methodId, taskNo, record, client);
    }
  }

  /**
   * プロジェクト全件のテンプレートデータを取得（実験指示一覧表示用）
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @returns テンプレートデータ行の配列（method_id / task_no / place_id 順）
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async findByProject(
    organizationId: string,
    projectId: string
  ): Promise<TemplateDataRow[]> {
    try {
      const pool = getPool();
      const query = await loadSqlFile('template_data/findByProject.sql');
      const result = await pool.query<TemplateDataRow>(query, [organizationId, projectId]);
      return result.rows;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while finding template data by project',
        error as Error
      );
    }
  }
}
