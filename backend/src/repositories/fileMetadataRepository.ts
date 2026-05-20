/**
 * ファイルメタデータリポジトリ
 * 
 * Task 2.1: 単一ファイルメタデータ取得機能の実装
 * Requirements: 5 (ファイル存在確認), 11 (マルチテナント対応とセキュリティ)
 */

import { getPool, getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
/**
 * ファイルメタデータ型定義
 */
export interface FileMetadata {
  file_key: string;
  s3_bucket: string;
  organization_id: string;
  original_filename: string;
  file_size: number;
  file_type?: string;
  file_extension?: string;
  is_maiml_file?: boolean;
  maiml_analysis_status?: string;
  maiml_error_count?: number;
  maiml_warning_count?: number;
  maiml_version?: string;
  maiml_transitions_count?: number;
  maiml_places_count?: number;
  maiml_last_analyzed?: Date;
  uploaded_by: string;
  create_user_id?: string;
  update_user_id?: string;
  created_at?: Date;
  updated_at?: Date;
  file_hash?: string;
  parent_folder_path?: string;
  upload_batch_id?: string;
  upload_source?: string;
  upload_method?: string;
  /** プロジェクトUUID: project.project_uuidと同値。MAIMLファイル特定に使用 */
  project_uuid?: string;
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
   */
  async getFileMetadata(
    organizationId: string,
    _projectId: string,
    fileName: string
  ): Promise<FileMetadata | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM file_metadata
      WHERE organization_id = $1 AND file_name = $2
      LIMIT 1
    `;
    const params = [organizationId, fileName];
    try {
      const result = await pool.query(query, params);
      if (result.rowCount === 0 || !result.rows[0]) {
        return null;
      }
      return result.rows[0] as FileMetadata;
    } catch (error) {
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
  
  /**
   * ファイルメタデータを新規作成（ON CONFLICT DO NOTHING）
   * 既に同じ file_key が存在する場合は何もしない（二重登録防止）
   * 戻り値は void（storageService からの自動登録用）
   *
   * @param data - ファイルメタデータ（必要なフィールドのみ設定）
   */
  async insertIfNotExists(data: Partial<FileMetadata>): Promise<void> {
    const pool = getPool();

    const JSONB_COLUMNS = new Set<string>([]);
    const columns: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        columns.push(key);
        if (JSONB_COLUMNS.has(key)) {
          placeholders.push(`$${paramIndex}::jsonb`);
          values.push(typeof value === 'string' ? value : JSON.stringify(value));
        } else {
          placeholders.push(`$${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    const query = `
      INSERT INTO file_metadata (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (file_key) DO NOTHING
    `;

    await pool.query(query, values);
  }

  /**
   * ファイルメタデータを新規作成（動的INSERT）
   * 呼び出し元で設定されたフィールドのみをINSERTする
   * 
   * @param data - ファイルメタデータ（必要なフィールドのみ設定）
   * @returns 作成されたファイルメタデータ
   */
  async insertFileMetadata(data: Partial<FileMetadata>): Promise<FileMetadata> {
    const pool = getPool();

    // JSONB型カラムの一覧（::jsonbキャストが必要）
    // ※ 削除済み: custom_metadata, tags, search_keywords
    const JSONB_COLUMNS = new Set<string>([]);

    // 動的にカラムとプレースホルダーを構築
    const columns: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // データの各フィールドを処理
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        columns.push(key);
        
        // JSONB型のカラムは特別処理（::jsonbキャストが必要）
        if (JSONB_COLUMNS.has(key)) {
          placeholders.push(`$${paramIndex}::jsonb`);
          values.push(typeof value === 'string' ? value : JSON.stringify(value));
        } else {
          placeholders.push(`$${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    const query = `
      INSERT INTO file_metadata (
        ${columns.join(', ')}
      ) VALUES (
        ${placeholders.join(', ')}
      )
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      console.log(`✅ [FileMetadataRepository] ファイルメタデータ作成: ${data.original_filename} (${columns.length}カラム)`);
      return result.rows[0] as FileMetadata;
    } catch (error) {
      console.error(`❌ [FileMetadataRepository] ファイルメタデータ作成エラー: ${data.original_filename}`, error);
      throw error;
    }
  }

  async updateFileMetadata(fileKey:string, updates : any) {
    const pool = getPool();

    // JSONB型カラムの一覧（::jsonbキャストが必要）
    // ※ 削除済み: custom_metadata, tags, search_keywords
    const JSONB_COLUMNS = new Set([
      'draft_metadata',
    ]);

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // ✅ 修正: updated_atを除外してから処理
    const filteredUpdates = { ...updates };
    delete filteredUpdates.updated_at;

    for (const [key, value] of Object.entries(filteredUpdates)) {
      // JSONB型カラムは::jsonbキャストが必要
      if (JSONB_COLUMNS.has(key)) {
        setClause.push(`${key} = $${paramIndex}::jsonb`);
        values.push(typeof value === 'string' ? value : JSON.stringify(value));
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

  /**
   * 単一ファイルのメタデータを削除
   * 
   * @param organizationId - 組織ID（マルチテナント分離に必須）
   * @param fileKey - ファイルキー（S3/Swiftのキー）
   * @returns 削除された件数
   */
  async softDeleteByFileKey(
    organizationId: string,
    fileKey: string
  ): Promise<number> {
    const pool = getPool();

    // Parameterized Queryを使用してSQLインジェクション対策
    // organization_idとfile_keyでフィルタリング
    const query = `
      DELETE FROM file_metadata
      WHERE organization_id = $1
        AND file_key = $2
    `;

    const params = [organizationId, fileKey];

    try {
      const result = await pool.query(query, params);
      const deletedCount = result.rowCount || 0;
      
      if (deletedCount > 0) {
        console.log(`✅ [FileMetadataRepository] ファイルメタデータ削除: ${fileKey}`);
      } else {
        console.log(`ℹ️ [FileMetadataRepository] 削除対象なし（存在しない）: ${fileKey}`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error(`❌ [FileMetadataRepository] ファイルメタデータ削除エラー: ${fileKey}`, error);
      throw error;
    }
  }

  /**
   * 複数ファイルのメタデータを一括削除
   * 
   * @param organizationId - 組織ID（マルチテナント分離に必須）
   * @param fileKeys - ファイルキーの配列
   * @returns 削除された件数
   */
  async softDeleteBatch(
    organizationId: string,
    fileKeys: string[]
  ): Promise<number> {
    // 空の配列の場合は何もしない
    if (fileKeys.length === 0) {
      return 0;
    }

    const pool = getPool();

    // UNNESTを使用したバッチDELETE
    const query = `
      DELETE FROM file_metadata
      WHERE file_key IN (
        SELECT * FROM UNNEST($1::text[])
      )
      AND organization_id = $2
    `;

    const params = [fileKeys, organizationId];

    try {
      const result = await pool.query(query, params);
      const deletedCount = result.rowCount || 0;
      
      console.log(`✅ [FileMetadataRepository] ファイルメタデータ一括削除: ${deletedCount}/${fileKeys.length}件`);
      
      return deletedCount;
    } catch (error) {
      console.error(`❌ [FileMetadataRepository] ファイルメタデータ一括削除エラー`, error);
      throw error;
    }
  }

  /**
   * ファイルメタデータを物理削除（ロールバック用）
   *
   * アップロード後にフラグ更新などが失敗した場合のロールバックに使用する。
   * 通常の削除には softDeleteByFileKey() を使用すること。
   *
   * @param fileKey - ファイルキー（S3/Swiftのキー）
   * @returns 削除された件数
   */
  async deleteFileMetadata(fileKey: string): Promise<number> {
    const pool = getPool();

    const query = `
      DELETE FROM file_metadata
      WHERE file_key = $1
    `;

    const params = [fileKey];

    try {
      const result = await pool.query(query, params);
      const deletedCount = result.rowCount || 0;

      if (deletedCount > 0) {
        console.log(`✅ [FileMetadataRepository] ファイルメタデータ物理削除（ロールバック）: ${fileKey}`);
      } else {
        console.log(`ℹ️ [FileMetadataRepository] 削除対象なし（存在しない）: ${fileKey}`);
      }

      return deletedCount;
    } catch (error) {
      console.error(`❌ [FileMetadataRepository] ファイルメタデータ物理削除エラー: ${fileKey}`, error);
      throw error;
    }
  }

  /**
   * バッチIDに紐付けられたファイルメタデータを取得
   * 
   * Task: アップロードキャンセル機能実装
   * - 指定されたバッチIDに紐付けられたすべてのファイルメタデータを取得
   * - キャンセル時にファイルを削除するために使用
   * 
   * @param batchId - バッチID
   * @returns ファイルメタデータの配列
   */
  async findByBatchId(batchId: string): Promise<FileMetadata[]> {
    const pool = getPool();

    const query = `
      SELECT *
      FROM file_metadata
      WHERE upload_batch_id = $1
      ORDER BY created_at ASC
    `;

    const params = [batchId];

    try {
      const result = await pool.query(query, params);
      console.log(`✅ [FileMetadataRepository] バッチID紐付けファイル取得: ${result.rows.length}件 (batchId: ${batchId})`);
      return result.rows as FileMetadata[];
    } catch (error) {
      console.error(`❌ [FileMetadataRepository] バッチID紐付けファイル取得エラー (batchId: ${batchId})`, error);
      throw error;
    }
  }

  /**
   * 指定されたfile_keyの中でproject_uuidが設定されているレコードを取得
   *
   * フォルダ削除時にMAIMLファイルが含まれているか判定し、
   * 対応するproject_uuidを収集するために使用する。
   *
   * @param organizationId - 組織ID（マルチテナント分離に必須）
   * @param fileKeys - 削除対象のファイルキー配列
   * @returns project_uuidの一意な配列（重複除去済み）
   */
  async findProjectUuidsByFileKeys(
    organizationId: string,
    fileKeys: string[]
  ): Promise<string[]> {
    if (fileKeys.length === 0) {
      return [];
    }

    const pool = getPool();

    const query = `
      SELECT DISTINCT project_uuid
      FROM file_metadata
      WHERE organization_id = $1
        AND file_key = ANY($2::text[])
        AND project_uuid IS NOT NULL
    `;

    const result = await pool.query(query, [organizationId, fileKeys]);
    return result.rows.map((row: { project_uuid: string }) => row.project_uuid);
  }

  /**
   * プロジェクトUUIDからMAIMLファイルのfile_keyを取得
   *
   * project.project_uuid と紐付けられた最新のMAIMLファイルの
   * file_key と original_filename を返す。
   * MAIMLファイル特定に使用し、project_name に依存しないパス解決を実現する。
   *
   * @param projectUuid - project.project_uuid の値
   * @returns file_key と original_filename、存在しない場合は null
   */
  async findMaimlByProjectUuid(
    projectUuid: string
  ): Promise<{ file_key: string; original_filename: string } | null> {
    const pgp = getPgp();
    const sql = await loadSqlFile('file_metadata/findMaimlByProjectUuid.sql');
    return await pgp.oneOrNone<{ file_key: string; original_filename: string }>(sql, [projectUuid]);
  }

  /**
   * プロジェクト名からMAIMLファイルのfile_keyを取得（project_uuid未設定時のフォールバック）
   *
   * project.project_uuid が NULL または file_metadata に該当がない場合に、
   * organization_id と project_name でMAIMLファイルを特定する。
   *
   * @param organizationId - 組織ID（マルチテナント分離に必須）
   * @param projectName - プロジェクト名
   * @returns file_key, original_filename, project_uuid、存在しない場合は null
   */
  async findMaimlByProjectName(
    organizationId: string,
    projectName: string
  ): Promise<{ file_key: string; original_filename: string; project_uuid: string | null } | null> {
    const pgp = getPgp();
    const sql = await loadSqlFile('file_metadata/findMaimlByProjectName.sql');
    return await pgp.oneOrNone<{ file_key: string; original_filename: string; project_uuid: string | null }>(sql, [organizationId, projectName]);
  }

}
