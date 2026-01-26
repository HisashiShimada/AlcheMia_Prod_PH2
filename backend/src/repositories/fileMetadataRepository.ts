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
  fileId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  lastModified: Date;
  organizationId: string;
}

/**
 * 拡張ファイルメタデータ型定義（リロードAPI用）
 * Task 1.1: file_metadataテーブルアクセス機能の実装
 */
export interface FileMetadataExtended {
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
  createdAt: Date;
  updatedAt: Date;
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
        organization_id,
        file_id,
        bucket_name,
        object_key,
        file_name,
        file_type,
        file_size,
        content_type,
        last_modified
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
        fileId: row.file_id,
        fileName: row.file_name,
        filePath: row.object_key,
        fileSize: row.file_size,
        contentType: row.content_type,
        lastModified: row.last_modified,
        organizationId: row.organization_id,
      };
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
  ): Promise<FileMetadataExtended[]> {
    const pool = getPool();

    // Parameterized Queryを使用してSQLインジェクション対策
    // organization_idとproject_idでフィルタリング
    // deleted_at IS NULLで論理削除されていないレコードのみ取得
    const query = `
      SELECT
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
      return result.rows.map((row) => ({
        fileId: row.file_id,
        organizationId: row.organization_id,
        projectId: row.project_id,
        bucketName: row.bucket_name,
        objectKey: row.object_key,
        fileName: row.file_name,
        fileType: row.file_type,
        fileSize: row.file_size,
        contentType: row.content_type,
        lastModified: row.last_modified,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
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
          organization_id,
          file_id,
          bucket_name,
          object_key,
          file_name,
          file_type,
          file_size,
          content_type,
          last_modified
        FROM file_metadata
        WHERE organization_id = $1
          AND object_key LIKE $2
        ORDER BY last_modified DESC
        LIMIT $3 OFFSET $4
      `;
      const selectParams = [organizationId, projectPathPrefix, limit, offset];
      const selectResult = await pool.query(selectQuery, selectParams);

      // データベースのスネークケースからキャメルケースに変換
      const files: FileMetadata[] = selectResult.rows.map((row) => ({
        fileId: row.file_id,
        fileName: row.file_name,
        filePath: row.object_key,
        fileSize: row.file_size,
        contentType: row.content_type,
        lastModified: row.last_modified,
        organizationId: row.organization_id,
      }));

      return {
        files,
        totalCount,
      };
    } catch (error) {
      // データベースエラーをそのままスロー（上位層でハンドリング）
      throw error;
    }
  }
}
