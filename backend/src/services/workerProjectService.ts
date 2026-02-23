/**
 * 実験作業者用プロジェクトサービス
 * 
 * @description
 * 実験作業者がアクセス可能なプロジェクト一覧を取得するサービス。
 * ロールベースアクセス制御とマルチテナント分離を実装。
 * 
 * @module services/workerProjectService
 */

import { logger } from '../utils/logger';
import * as workerProjectRepository from '../repositories/workerProjectRepository';
import { PROJECT_STATUS_MAP } from '../types/project';
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
      // ページネーション計算
      const offset = (params.page - 1) * params.limit;

      // リポジトリフィルター構築
      const filters: workerProjectRepository.WorkerProjectFilters = {
        status: params.status,
        sortBy: params.sortBy,
        order: params.order,
        limit: params.limit,
        offset,
      };

      // リポジトリ層からプロジェクト一覧を取得
      const projects = await workerProjectRepository.findWorkerAccessible(
        organizationId,
        userId,
        filters
      );

      // リポジトリ層から総件数を取得
      const totalItems = await workerProjectRepository.countWorkerAccessible(
        organizationId,
        userId,
        params.status
      );

      // ページネーション情報の計算
      const totalPages = Math.ceil(totalItems / params.limit);

      // データ変換（DBの命名からAPIの命名へ + 数値→文字列ステータス変換）
      const items: WorkerAccessibleProject[] = projects.map((project) => ({
        projectId: project.project_id,
        projectName: project.project_name,
        description: project.description || '',
        projectStatus: PROJECT_STATUS_MAP[project.project_status] || 'pending',
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
