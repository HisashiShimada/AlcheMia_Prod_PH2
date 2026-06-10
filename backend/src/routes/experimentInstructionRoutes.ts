/**
 * 実験指示ルート
 *
 * エンドポイント:
 *   GET  /api/v1/projects/:projectId/experiment-instructions
 *   GET  /api/v1/projects/:projectId/methods
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/approve
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/ng
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  getExperimentInstructions,
  getProjectMethods,
  approveTask,
  recordNg,
} from '../controllers/experimentInstructionController';

const router = Router();

// 実験指示一覧取得
router.get(
  '/:projectId/experiment-instructions',
  authMiddleware,
  getExperimentInstructions
);

// プロジェクトのメソッドID一覧取得
router.get(
  '/:projectId/methods',
  authMiddleware,
  getProjectMethods
);

// タスク承認
router.put(
  '/:projectId/tasks/:methodId/:taskNumber/approve',
  authMiddleware,
  approveTask
);

// タスク NG 記録
router.put(
  '/:projectId/tasks/:methodId/:taskNumber/ng',
  authMiddleware,
  recordNg
);

export default router;
