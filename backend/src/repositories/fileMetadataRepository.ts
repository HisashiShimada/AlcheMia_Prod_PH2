/**
 * ファイルメタデータリポジトリ
 * 
 * Task 2.1: 単一ファイルメタデータ取得機能の実装
 * Requirements: 5 (ファイル存在確認), 11 (マルチテナント対応とセキュリティ)
 */

import { getPool } from '../database/db';

/**
 * ファイルメタデータ型定義
 */
export interface FileMetadata {
  file_key:string;
  s3_bucket:string;
  organization_id:string;
  original_filename:string;
  file_size:number;
  file_type?:string;
  file_extension?:string;
  is_maiml_file?:boolean;
  maiml_analysis_status?:string;
  maiml_error_count?:number;
  maiml_warning_count?:number;
  maiml_version?:string;
  maiml_transitions_count?:number;
  maiml_places_count?:number;
  maiml_validation_result?:string;
  maiml_last_analyzed?:Date;
  uploaded_by:string;
  create_user_id?:string;
  update_user_id?:string;
  created_at?:Date;
  updated_at?:Date;
  custom_metadata?:string;
  tags?:string;
  search_keywords?:string[];
  description?:string;
  file_hash?:string;
  parent_folder_path?:string;
  upload_batch_id?:string;
  upload_source?:string;
  upload_method?:string;
  s3_storage_class?:string;
  s3_etag?:string;
  last_edit_timestamp?: Date;
}

/**
 * バッチ操作型定義（リロードAPI用）
 * Task 1.2: ファイルメタデータのバッチ更新機能の実装
 */
export type BatchOperation =
  | {
      type: 'INSERT';
      data: {
        fileId: string;
        organizationId: string;
        projectId: string;
        bucketName: string;
        objectKey: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        contentType: string;
        lastModified: Date;
      };
    }
  | {
      type: 'UPDATE';
      data: {
        fileId: string;
        organizationId: string;
        fileSize: number;
        lastModified: Date;
      };
    }
  | {
      type: 'DELETE';
      data: {
        fileId: string;
        organizationId: string;
      };
    };

/**
 * ファイルメタデータリポジトリクラス
 * 
 * file_metadataテーブルへのデータアクセスを提供します。
 * すべてのクエリでorganization_idフィルタを強制し、マルチテナント分離を保証します。
 */
export class FileMetadataRepository {
  /**
   * 単一ファイルのメタデータを取得
   * 
   * @param organizationId - 組織ID（マルチテナント分離に必須）
   * @param projectId - プロジェクトID（現在は使用しないが将来の拡張用）
   * @param fileName - ファイル名
   * @returns ファイルメタデータ、または存在しない場合はnull
   * 
   * @example
   * const metadata = await repository.getFileMetadata(
   *   'org_maiml_lab_001',
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   'sample_project.maiml'
   * );
   */
  async getFileMetadata(
    organizationId: string,
    _projectId: string,
    fileName: string
  ): Promise<FileMetadata | null> {
    const pool = getPool();

    // Parameterized Queryを使用してSQLインジェクション対策
    // organization_idフィルタを必須とすることでマルチテナント分離を保証
    const query = `
      SELECT
        *
      FROM file_metadata
      WHERE organization_id = $1
        AND file_name = $2
      LIMIT 1
    `;

    const params = [organizationId, fileName];

    try {
      const result = await pool.query(query, params);

      // レコードが存在しない場合はnullを返却
      if (result.rowCount === 0 || !result.rows[0]) {
        return null;
      }

      const row = result.rows[0];

      // データベースのスネークケースからキャメルケースに変換
      return {
        file_key:row.file_key,
        s3_bucket:row.s3_bucket,
        organization_id:row.organization_id,
        original_filename:row.original_filename,
        file_size:row.file_size,
        file_type:row.file_type,
        file_extension:row.file_extension,
        is_maiml_file:row.is_maiml_file,
        maiml_analysis_status:row.maiml_analysis_status,
        maiml_error_count:row.maiml_error_count,
        maiml_warning_count:row.maiml_warning_count,
        maiml_version:row.maiml_version,
        maiml_transitions_count:row.maiml_transitions_count,
        maiml_places_count:row.maiml_places_count,
        maiml_validation_result:row.maiml_validation_result,
        maiml_last_analyzed:row.maiml_last_analyzed,
        uploaded_by:row.uploaded_by,
        create_user_id:row.create_user_id,
        update_user_id:row.update_user_id,
        created_at:row.created_at,
        updated_at:row.updated_at,
        custom_metadata:row.custom_metadata,
        tags:row.tags,
        search_keywords:row.search_keywords,
        description:row.description,
        file_hash:row.file_hash,
        parent_folder_path:row.parent_folder_path,
        upload_batch_id:row.upload_batch_id,
        upload_source:row.upload_source,
        upload_method:row.upload_method,
        s3_storage_class:row.s3_storage_class,
        s3_etag:row.s3_etag,
        last_edit_timestamp:row.last_edit_timestamp,
      };
    } catch (error) {
      // データベースエラーをそのままスロー（上位層でハンドリング）
      throw error;
    }
  }
  async getFileMetadataByFileKey(
    fileKey: string
  ): Promise<FileMetadata | null> {
    const pool = getPool();

    // Parameterized Queryを使用してSQLインジェクション対策
    // organization_idフィルタを必須とすることでマルチテナント分離を保証
    const query = `
      SELECT
        *
      FROM file_metadata
      WHERE file_key = $1
    `;

    const params = [fileKey];

    try {
      const result = await pool.query(query, params);

      // レコードが存在しない場合はnullを返却
      if (result.rowCount === 0 || !result.rows[0]) {
        return null;
      }

      const row = result.rows[0];
      return row as FileMetadata;
    } catch (error) {
      // データベースエラーをそのままスロー（上位層でハンドリング）
      throw error;
    }
  }

  /**
   * プロジェクト配下の全ファイルメタデータを取得（リロードAPI用）
   * Task 1.1: file_metadataテーブルアクセス機能の実装
   * 
   * @param organizationId - 組織ID（マルチテナント分離に必須）
   * @param projectId - プロジェクトID
   * @returns 論理削除されていないファイルメタデータのリスト
   * 
   * @example
   * const files = await repository.getByProject(
   *   'org_maiml_lab_001',
   *   '550e8400-e29b-41d4-a716-446655440000'
   * );
   */
  async getByProject(
    organizationId: string,
    projectId: string
  ): Promise<FileMetadata[]> {
    const pool = getPool();

    // Parameterized Queryを使用してSQLインジェクション対策
    // organization_idとproject_idでフィルタリング
    // deleted_at IS NULLで論理削除されていないレコードのみ取得
    const query = `
      SELECT
        *
      FROM file_metadata
      WHERE organization_id = $1
        AND project_id = $2
        AND deleted_at IS NULL
      ORDER BY object_key
    `;

    const params = [organizationId, projectId];

    try {
      const result = await pool.query(query, params);

      // データベースのスネークケースからキャメルケースに変換
      return result.rows as FileMetadata[]
    } catch (error) {
      // データベースエラーをそのままスロー（上位層でハンドリング）
      throw error;
    }
  }

  /**
   * バッチ操作の実行（リロードAPI用）
   * Task 1.2: ファイルメタデータのバッチ更新機能の実装
   * 
   * @param operations - 実行する操作のリスト（INSERT/UPDATE/DELETE）
   * 
   * @example
   * await repository.executeBatch([
   *   { type: 'INSERT', data: { ... } },
   *   { type: 'UPDATE', data: { ... } },
   *   { type: 'DELETE', data: { ... } },
   * ]);
   */
  async executeBatch(operations: BatchOperation[]): Promise<void> {
    // 空の操作配列の場合は何もしない
    if (operations.length === 0) {
      return;
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      // トランザクション開始
      await client.query('BEGIN');

      // 操作タイプごとにグループ化
      const inserts = operations.filter((op) => op.type === 'INSERT');
      const updates = operations.filter((op) => op.type === 'UPDATE');
      const deletes = operations.filter((op) => op.type === 'DELETE');

      // INSERT操作
      if (inserts.length > 0) {
        await this.executeBatchInsert(client, inserts as Array<Extract<BatchOperation, { type: 'INSERT' }>>);
      }

      // UPDATE操作
      if (updates.length > 0) {
        await this.executeBatchUpdate(client, updates as Array<Extract<BatchOperation, { type: 'UPDATE' }>>);
      }

      // DELETE操作（論理削除）
      if (deletes.length > 0) {
        await this.executeBatchDelete(client, deletes as Array<Extract<BatchOperation, { type: 'DELETE' }>>);
      }

      // コミット
      await client.query('COMMIT');
    } catch (error) {
      // エラー時はロールバック
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // クライアントを解放
      client.release();
    }
  }

  /**
   * バッチINSERT操作の実行
   * @private
   */
  private async executeBatchInsert(
    client: any,
    operations: Array<Extract<BatchOperation, { type: 'INSERT' }>>
  ): Promise<void> {
    if (operations.length === 0) return;

    // UNNESTを使用したバッチINSERT
    const query = `
      INSERT INTO file_metadata (
        file_id,
        organization_id,
        project_id,
        bucket_name,
        object_key,
        file_name,
        file_type,
        file_size,
        content_type,
        last_modified,
        created_at,
        updated_at
      )
      SELECT * FROM UNNEST(
        $1::uuid[],
        $2::varchar[],
        $3::uuid[],
        $4::varchar[],
        $5::text[],
        $6::varchar[],
        $7::varchar[],
        $8::bigint[],
        $9::varchar[],
        $10::timestamp[],
        $11::timestamp[],
        $12::timestamp[]
      )
    `;

    const now = new Date();
    const params = [
      operations.map((op) => op.data.fileId),
      operations.map((op) => op.data.organizationId),
      operations.map((op) => op.data.projectId),
      operations.map((op) => op.data.bucketName),
      operations.map((op) => op.data.objectKey),
      operations.map((op) => op.data.fileName),
      operations.map((op) => op.data.fileType),
      operations.map((op) => op.data.fileSize),
      operations.map((op) => op.data.contentType),
      operations.map((op) => op.data.lastModified),
      operations.map(() => now),
      operations.map(() => now),
    ];

    await client.query(query, params);
  }

  /**
   * バッチUPDATE操作の実行
   * @private
   */
  private async executeBatchUpdate(
    client: any,
    operations: Array<Extract<BatchOperation, { type: 'UPDATE' }>>
  ): Promise<void> {
    if (operations.length === 0) return;

    // UNNESTを使用したバッチUPDATE
    const query = `
      UPDATE file_metadata
      SET
        file_size = updates.file_size,
        last_modified = updates.last_modified,
        updated_at = NOW()
      FROM (
        SELECT * FROM UNNEST(
          $1::uuid[],
          $2::varchar[],
          $3::bigint[],
          $4::timestamp[]
        ) AS t(file_id, organization_id, file_size, last_modified)
      ) AS updates
      WHERE file_metadata.file_id = updates.file_id
        AND file_metadata.organization_id = updates.organization_id
    `;

    const params = [
      operations.map((op) => op.data.fileId),
      operations.map((op) => op.data.organizationId),
      operations.map((op) => op.data.fileSize),
      operations.map((op) => op.data.lastModified),
    ];

    await client.query(query, params);
  }

  /**
   * バッチDELETE操作の実行（論理削除）
   * @private
   */
  private async executeBatchDelete(
    client: any,
    operations: Array<Extract<BatchOperation, { type: 'DELETE' }>>
  ): Promise<void> {
    if (operations.length === 0) return;

    // UNNESTを使用したバッチUPDATE（deleted_at設定）
    const query = `
      UPDATE file_metadata
      SET
        deleted_at = NOW(),
        updated_at = NOW()
      FROM (
        SELECT * FROM UNNEST(
          $1::uuid[],
          $2::varchar[]
        ) AS t(file_id, organization_id)
      ) AS deletes
      WHERE file_metadata.file_id = deletes.file_id
        AND file_metadata.organization_id = deletes.organization_id
        AND file_metadata.deleted_at IS NULL
    `;

    const params = [
      operations.map((op) => op.data.fileId),
      operations.map((op) => op.data.organizationId),
    ];

    await client.query(query, params);
  }

  /**
   * プロジェクト内の全ファイルメタデータを取得
   * 
   * @param organizationId - 組織ID（マルチテナント分離に必須）
   * @param projectName - プロジェクト名
   * @param page - ページ番号（デフォルト: 1）
   * @param limit - 1ページあたりの件数（デフォルト: 100、最大: 100）
   * @returns ファイルメタデータリストと総件数
   * 
   * @example
   * const result = await repository.listProjectFiles(
   *   'org_maiml_lab_001',
   *   'sample_project',
   *   1,
   *   10
   * );
   * console.log(result.files); // FileMetadata[]
   * console.log(result.totalCount); // 総件数
   */
  async listProjectFiles(
    organizationId: string,
    projectName: string,
    page: number = 1,
    limit: number = 100
  ): Promise<{ files: FileMetadata[]; totalCount: number }> {
    const pool = getPool();

    // プロジェクトフォルダのプレフィックスパターン
    // 例: "org_maiml_lab_001/projects/sample_project/%"
    const projectPathPrefix = `${organizationId}/projects/${projectName}/%`;

    // offset計算
    const offset = (page - 1) * limit;

    try {
      // 1. 総件数を取得
      const countQuery = `
        SELECT COUNT(*) as count
        FROM file_metadata
        WHERE organization_id = $1
          AND object_key LIKE $2
      `;
      const countParams = [organizationId, projectPathPrefix];
      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);

      // 2. ファイル一覧を取得（ページネーション + ソート）
      const selectQuery = `
        SELECT
          *
        FROM file_metadata
        WHERE organization_id = $1
          AND object_key LIKE $2
        ORDER BY last_modified DESC
        LIMIT $3 OFFSET $4
      `;
      const selectParams = [organizationId, projectPathPrefix, limit, offset];
      const selectResult = await pool.query(selectQuery, selectParams);

      // データベースのスネークケースからキャメルケースに変換
      const files: FileMetadata[] = selectResult.rows as FileMetadata[]

      return {
        files,
        totalCount,
      };
    } catch (error) {
      // データベースエラーをそのままスロー（上位層でハンドリング）
      throw error;
    }
  }
  
  async updateFileMetadata(fileKey:string, updates : any) {
    const pool = getPool();
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // ✅ 修正: updated_atを除外してから処理
    const filteredUpdates = { ...updates };
    delete filteredUpdates.updated_at;

    for (const [key, value] of Object.entries(filteredUpdates)) {
      if (key === 'draft_metadata' || key === 'custom_metadata' || key === 'tags') {
        setClause.push(`${key} = $${paramIndex}::jsonb`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }

    // updated_atは常に現在時刻で更新
    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(fileKey);

    const queryText = `
      UPDATE file_metadata 
      SET ${setClause.join(', ')}
      WHERE file_key = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await pool.query(queryText, values);
      if (result.rows.length === 0) {
        throw new Error(`ファイルが見つかりません: ${fileKey}`);
      }
      console.log('✅ [dbOperations] ファイルメタデータ更新:', fileKey);
      return result.rows[0];
    } catch (error) {
      console.error('❌ [dbOperations] ファイルメタデータ更新エラー:', error);
      throw error;
    }
  }
}
