/**
 * UploadBatchRepository
 * アップロードバッチ管理のRepository層
 * Phase 2-1: バッチ管理機能
 */

import { getPool } from '../database/db';
import { 
  UploadBatch, 
  CreateBatchParams, 
  UpdateBatchParams,
  BatchSearchParams,
  BatchProgress 
} from '../types/uploadBatch';

export class UploadBatchRepository {
  /**
   * バッチID生成
   * 形式: batch_YYYYMMDD_HHMMSS_ランダム文字列
   */
  generateBatchId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 8);
    return `batch_${dateStr}_${timeStr}_${random}`;
  }

  /**
   * バッチ作成
   */
  async create(params: CreateBatchParams): Promise<UploadBatch> {
    const batchId = this.generateBatchId();
    const batchName = params.batchName || `Upload ${new Date().toISOString()}`;

    console.log('📦 [UploadBatchRepository] バッチ作成:', { batchId, batchName, uploadType: params.uploadType });

    const query = `
      INSERT INTO upload_batch (
        batch_id, batch_name, upload_type, organization_id, 
        uploaded_by, total_files, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'in_progress')
      RETURNING *
    `;

    const values = [
      batchId,
      batchName,
      params.uploadType,
      params.organizationId,
      params.uploadedBy,
      params.totalFiles
    ];

    const pool = getPool();
    const result = await pool.query(query, values);
    
    console.log('✅ [UploadBatchRepository] バッチ作成成功:', batchId);
    
    return this.mapRowToBatch(result.rows[0]);
  }

  /**
   * バッチ更新
   */
  async update(batchId: string, params: UpdateBatchParams): Promise<UploadBatch> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.completedFiles !== undefined) {
      setClauses.push(`completed_files = $${paramIndex++}`);
      values.push(params.completedFiles);
    }

    if (params.failedFiles !== undefined) {
      setClauses.push(`failed_files = $${paramIndex++}`);
      values.push(params.failedFiles);
    }

    if (params.status) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.endTime) {
      setClauses.push(`end_time = $${paramIndex++}`);
      values.push(params.endTime);
    }

    // 常に更新日時を更新
    setClauses.push(`updated_at = NOW()`);
    
    // バッチIDを最後のパラメータとして追加
    values.push(batchId);

    const query = `
      UPDATE upload_batch
      SET ${setClauses.join(', ')}
      WHERE batch_id = $${paramIndex}
      RETURNING *
    `;

    console.log('📦 [UploadBatchRepository] バッチ更新:', { batchId, params });

    const pool = getPool();
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    console.log('✅ [UploadBatchRepository] バッチ更新成功:', batchId);

    return this.mapRowToBatch(result.rows[0]);
  }

  /**
   * バッチ取得（ID指定）
   */
  async findById(batchId: string): Promise<UploadBatch | null> {
    console.log('📦 [UploadBatchRepository] バッチ取得:', batchId);

    const pool = getPool();
    const query = 'SELECT * FROM upload_batch WHERE batch_id = $1';
    const result = await pool.query(query, [batchId]);
    
    if (result.rows.length === 0) {
      console.log('⚠️ [UploadBatchRepository] バッチが見つかりません:', batchId);
      return null;
    }

    return this.mapRowToBatch(result.rows[0]);
  }

  /**
   * バッチ検索
   */
  async search(params: BatchSearchParams): Promise<UploadBatch[]> {
    const conditions: string[] = ['organization_id = $1'];
    const values: any[] = [params.organizationId];
    let paramIndex = 2;

    if (params.uploadedBy) {
      conditions.push(`uploaded_by = $${paramIndex++}`);
      values.push(params.uploadedBy);
    }

    if (params.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(params.endDate);
    }

    const limit = params.limit || 50;
    const offset = params.offset || 0;

    const query = `
      SELECT * FROM upload_batch
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    values.push(limit, offset);

    console.log('📦 [UploadBatchRepository] バッチ検索:', { organizationId: params.organizationId, conditions: conditions.length });

    const pool = getPool();
    const result = await pool.query(query, values);
    
    console.log('✅ [UploadBatchRepository] バッチ検索結果:', result.rows.length, '件');

    return result.rows.map((row: any) => this.mapRowToBatch(row));
  }

  /**
   * バッチ進捗取得
   */
  async getProgress(batchId: string): Promise<BatchProgress | null> {
    console.log('📦 [UploadBatchRepository] バッチ進捗取得:', batchId);

    const query = `
      SELECT 
        batch_id,
        batch_name,
        total_files,
        completed_files,
        failed_files,
        status,
        ROUND(
          CASE 
            WHEN total_files > 0 THEN (completed_files::NUMERIC / total_files * 100)
            ELSE 0
          END,
          2
        ) as progress_percent
      FROM upload_batch
      WHERE batch_id = $1
    `;

    const pool = getPool();
    const result = await pool.query(query, [batchId]);
    
    if (result.rows.length === 0) {
      console.log('⚠️ [UploadBatchRepository] バッチが見つかりません:', batchId);
      return null;
    }

    const row = result.rows[0];
    
    return {
      batchId: row.batch_id,
      batchName: row.batch_name,
      totalFiles: row.total_files,
      completedFiles: row.completed_files,
      failedFiles: row.failed_files,
      progressPercent: parseFloat(row.progress_percent),
      status: row.status
    };
  }

  /**
   * バッチ削除
   */
  async delete(batchId: string): Promise<void> {
    console.log('📦 [UploadBatchRepository] バッチ削除:', batchId);

    const pool = getPool();
    const query = 'DELETE FROM upload_batch WHERE batch_id = $1';
    const result = await pool.query(query, [batchId]);

    if (result.rowCount === 0) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    console.log('✅ [UploadBatchRepository] バッチ削除成功:', batchId);
  }

  /**
   * 組織内のバッチ件数取得
   */
  async countByOrganization(organizationId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM upload_batch
      WHERE organization_id = $1
    `;

    const pool = getPool();
    const result = await pool.query(query, [organizationId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * 進行中のバッチ一覧取得
   */
  async findInProgress(organizationId: string): Promise<UploadBatch[]> {
    console.log('📦 [UploadBatchRepository] 進行中バッチ取得:', organizationId);

    const query = `
      SELECT * FROM upload_batch
      WHERE organization_id = $1 AND status = 'in_progress'
      ORDER BY created_at DESC
    `;

    const pool = getPool();
    const result = await pool.query(query, [organizationId]);
    
    console.log('✅ [UploadBatchRepository] 進行中バッチ:', result.rows.length, '件');

    return result.rows.map((row: any) => this.mapRowToBatch(row));
  }

  /**
   * DB行をUploadBatch型にマッピング
   */
  private mapRowToBatch(row: any): UploadBatch {
    return {
      id: row.id,
      batchId: row.batch_id,
      batchName: row.batch_name,
      uploadType: row.upload_type,
      organizationId: row.organization_id,
      uploadedBy: row.uploaded_by,
      totalFiles: row.total_files,
      completedFiles: row.completed_files,
      failedFiles: row.failed_files,
      status: row.status,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// シングルトンインスタンスをエクスポート
export default new UploadBatchRepository();
