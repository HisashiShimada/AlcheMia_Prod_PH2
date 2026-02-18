/**
 * タスク管理コントローラー
 * 
 * @description タスクステータス更新などのリクエストハンドリング
 * Task: 2.1, 2.2 コントローラー層実装
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TaskService } from '../services/taskService';
import { TaskFilters } from '../types/task';
import { TaskRepository } from '../repositories/taskRepository';

// タスク一覧取得用のサービスインスタンス
const taskRepositoryInstance = new TaskRepository();
const taskServiceInstance = new TaskService(taskRepositoryInstance);


/**
 * タスク一覧取得ハンドラー
 * 
 * GET /api/v1/tasks
 * 
 * @description プロジェクト内の全タスクをメソッド単位でグループ化して取得
 * Feature: worker-task-list-api
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // バリデーションはhandleValidationErrorsミドルウェアで処理済み
    // パラメータ抽出
    const { organizationId } = req.user!;
    const projectId = req.query.projectId as string;

    // オプションパラメータの抽出
    const filters: TaskFilters = {
      methodId: req.query.methodId as string | undefined,
      status: req.query.status as any,
      assignUserId: req.query.assignUserId as string | undefined,
      sortBy: req.query.sortBy as any,
      order: req.query.order as any,
    };

    // TaskServiceを呼び出してタスク一覧を取得
    const methodGroups = await taskServiceInstance.getTasksGroupedByMethod(
      projectId,
      organizationId,
      filters
    );

    // 統一レスポンス形式で返却
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    res.json({
      success: true,
      data: methodGroups,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error) {
    // エラーハンドリングミドルウェアに委譲
    next(error);
  }
}
