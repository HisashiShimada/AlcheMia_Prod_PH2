/**
 * 実験作業者用プロジェクトサービス
 * 
 * @description
 * 実験作業者がアクセス可能なプロジェクト一覧を取得するサービス。
 * ロールベースアクセス制御とマルチテナント分離を実装。
 * 
 * @module services/workerProjectService
 */

import { getPool } from '../database/db';
import { logger } from '../utils/logger';
import type {
  WorkerProjectService as IWorkerProjectService,
  ListWorkerProjectsParams,
  WorkerProjectListResult,
  WorkerAccessibleProject,
  WorkerProjectPagination,
} from '../types/workerProject';

/**
 * データベースエラークラス
 */
class DatabaseError extends Error {
  originalError: Error;

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * 実験作業者用プロジェクトサービス実装
 * 
 * @implements {IWorkerProjectService}
 */
export class WorkerProjectService implements IWorkerProjectService {
  /**
   * 実験作業者がアクセス可能なプロジェクト一覧を取得
   * 
   * @param {string} userId - ユーザーID
   * @param {string} organizationId - 組織ID
   * @param {ListWorkerProjectsParams} params - 取得パラメータ
   * @returns {Promise<WorkerProjectListResult>} プロジェクト一覧とページネーション情報
   */
  async listWorkerAccessible(
    userId: string,
    organizationId: string,
    params: ListWorkerProjectsParams
  ): Promise<WorkerProjectListResult> {
    try {
      const pool = getPool();

      // SQLクエリの構築（Parameterized Query）
      const queryParams: any[] = [];
      let paramIndex = 1;

      // ベースクエリ（experiment_worker専用）
      let selectQuery = `
        SELECT DISTINCT
          project.project_id,
          project.project_name,
          project.description,
          project.project_status,
          project.create_at,
          project.update_at
        FROM project
        INNER JOIN project_task_detail 
          ON project.project_id = project_task_detail.project_id
      `;

      // WHERE句の構築
      const whereConditions: string[] = [];

      // マルチテナント分離: organization_id（必須）
      whereConditions.push(`project.organization_id = $${paramIndex++}`);
      queryParams.push(organizationId);

      // ユーザーIDフィルタ（自分に割り当てられたタスクがあるプロジェクト）
      whereConditions.push(`project_task_detail.experiment_user_id = $${paramIndex++}`);
      queryParams.push(userId);

      // マルチテナント分離（project_task_detail側）
      whereConditions.push(`project_task_detail.organization_id = $${paramIndex++}`);
      queryParams.push(organizationId);

      // ステータスフィルタ（文字列から数値に変換）
      if (params.status) {
        whereConditions.push(`project.project_status = $${paramIndex++}`);
        queryParams.push(parseInt(params.status, 10));
      } else {
        whereConditions.push(`project.project_status IN ($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        queryParams.push(1, 2, 3); // 1: タスク実行待ち, 2: タスク実行中, 3: タスク結果レビュー待ち
      }

      selectQuery += ` WHERE ` + whereConditions.join(' AND ');

      // ソート
      const sortColumn = params.sortBy === 'project_name' ? 'project.project_name' : `project.${params.sortBy}`;
      const sortOrder = params.order.toUpperCase();
      selectQuery += ` ORDER BY ${sortColumn} ${sortOrder}`;

      // ページネーション
      const offset = (params.page - 1) * params.limit;
      selectQuery += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(params.limit, offset);

      // クエリ実行
      const projectsResult = await pool.query(selectQuery, queryParams);
      const projects = projectsResult.rows;

      // 総件数取得（同じフィルタ条件で）
      let countQuery = `
        SELECT COUNT(DISTINCT project.project_id) as count 
        FROM project
        INNER JOIN project_task_detail 
          ON project.project_id = project_task_detail.project_id
      `;

      const countWhereConditions: string[] = [];
      const countParams: any[] = [];
      let countParamIndex = 1;

      // マルチテナント分離
      countWhereConditions.push(`project.organization_id = $${countParamIndex++}`);
      countParams.push(organizationId);

      // ユーザーIDフィルタ
      countWhereConditions.push(`project_task_detail.experiment_user_id = $${countParamIndex++}`);
      countParams.push(userId);

      // マルチテナント分離（project_task_detail側）
      countWhereConditions.push(`project_task_detail.organization_id = $${countParamIndex++}`);
      countParams.push(organizationId);

      // ステータスフィルタ
      if (params.status) {
        countWhereConditions.push(`project.project_status = $${countParamIndex++}`);
        countParams.push(parseInt(params.status, 10));
      } else {
        countWhereConditions.push(`project.project_status IN ($${countParamIndex++}, $${countParamIndex++}, $${countParamIndex++})`);
        countParams.push(1, 2, 3);
      }

      countQuery += ` WHERE ` + countWhereConditions.join(' AND ');

      const countResult = await pool.query(countQuery, countParams);
      const totalItems = parseInt(countResult.rows[0]?.count || '0', 10);
      const totalPages = Math.ceil(totalItems / params.limit);

      // データ変換
      const items: WorkerAccessibleProject[] = projects.map((project: any) => ({
        projectId: project.project_id,
        projectName: project.project_name,
        description: project.description || '',
        projectStatus: project.project_status,
        createdAt: new Date(project.create_at).toISOString(),
        updatedAt: new Date(project.update_at).toISOString(),
      }));

      // ページネーション情報
      const pagination: WorkerProjectPagination = {
        page: params.page,
        limit: params.limit,
        totalItems,
        totalPages,
        hasNext: params.page < totalPages,
        hasPrev: params.page > 1,
      };

      return {
        items,
        pagination,
      };
    } catch (error: any) {
      // エラーログの記録
      logger.error('Worker project list query failed', {
        userId,
        organizationId,
        params,
        error: error.message,
        stack: error.stack,
        originalError: {
          message: error.message,
          code: error.code,
          ...error,
        },
      });

      // タイムアウトエラーの特別処理
      if (error.code === 'ETIMEDOUT' || error.message?.toLowerCase().includes('timeout')) {
        throw new DatabaseError('クエリがタイムアウトしました', error);
      }

      // データベースエラーとして再スロー
      throw new DatabaseError('データベースエラーが発生しました', error);
    }
  }
}
