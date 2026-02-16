/**
 * 進捗データ取得関連ルート
 * 
 * @description 進捗データ取得エンドポイント定義
 * Task: 6.1 ルート定義とミドルウェアチェーン
 */

import { Router } from 'express';
import * as progressController from '../controllers/progressController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * 進捗データ取得
 * GET /api/v1/progress/:projectId/:methodId/:taskNo
 * 
 * @middleware authMiddleware - JWT認証
 * @description 指定されたプロジェクト・メソッド・タスクに紐づくトランジションレベルの進捗情報を取得
 * @note Task 6.1: ルート定義とミドルウェアチェーン
 * @requirements REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-9, REQ-10
 * @roles experiment_admin, experiment_worker, system_admin (authMiddlewareで認証済みユーザーに限定)
 */
router.get(
  '/:projectId/:methodId/:taskNo',
  authMiddleware,
  progressController.getProgressData
);

export default router;
