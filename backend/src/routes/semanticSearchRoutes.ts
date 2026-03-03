/**
 * セマンティック検索ルート
 *
 * @description セマンティック検索APIのルート定義
 * @remarks
 * - 認証・テナント分離ミドルウェア適用済み
 * - 検索はexperiment_admin以上の権限を要求（機能CD: 030000 データ管理）
 */

import { Router } from 'express';
import { body } from 'express-validator';
import * as semanticSearchController from '../controllers/semanticSearchController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { handleValidationErrors } from '../middleware/validationMiddleware';
import { checkPermission } from '../middleware/permissionCheckMiddleware';

const router = Router();

/**
 * セマンティック検索
 * POST /api/v1/semantic-search/search
 *
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @middleware checkPermission - 権限チェック（030000 データ管理、読取専用）
 */
router.post(
  '/search',
  authMiddleware,
  tenantIsolation,
  checkPermission('030000', 0),
  [
    body('input_query').optional().isString().withMessage('input_queryは文字列で指定してください'),
    body('transition_query').optional().isString().withMessage('transition_queryは文字列で指定してください'),
    body('output_query').optional().isString().withMessage('output_queryは文字列で指定してください'),
    body('structure_query').optional().isString().withMessage('structure_queryは文字列で指定してください'),
    body('top_k').optional().isInt({ min: 1, max: 50 }).withMessage('top_kは1〜50の整数で指定してください'),
    body('project_name').optional().isString().withMessage('project_nameは文字列で指定してください'),
    body('technique').optional().isString().withMessage('techniqueは文字列で指定してください'),
    body('weights.input').optional().isFloat({ min: 0, max: 1 }).withMessage('weights.inputは0〜1の数値で指定してください'),
    body('weights.transition').optional().isFloat({ min: 0, max: 1 }).withMessage('weights.transitionは0〜1の数値で指定してください'),
    body('weights.output').optional().isFloat({ min: 0, max: 1 }).withMessage('weights.outputは0〜1の数値で指定してください'),
    body('weights.structure').optional().isFloat({ min: 0, max: 1 }).withMessage('weights.structureは0〜1の数値で指定してください'),
  ],
  handleValidationErrors,
  semanticSearchController.search
);

/**
 * インデックス登録（1ファイル）
 * POST /api/v1/semantic-search/index
 *
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @middleware checkPermission - 権限チェック（030000 データ管理、書込可）
 */
router.post(
  '/index',
  authMiddleware,
  tenantIsolation,
  checkPermission('030000', 1),
  [
    body('filePath')
      .notEmpty()
      .isString()
      .withMessage('filePathは必須の文字列です'),
  ],
  handleValidationErrors,
  semanticSearchController.indexFile
);

/**
 * インデックス削除（ファイル単位）
 * DELETE /api/v1/semantic-search/index
 *
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @middleware checkPermission - 権限チェック（030000 データ管理、書込可）
 */
router.delete(
  '/index',
  authMiddleware,
  tenantIsolation,
  checkPermission('030000', 1),
  [
    body('filePath')
      .notEmpty()
      .isString()
      .withMessage('filePathは必須の文字列です'),
  ],
  handleValidationErrors,
  semanticSearchController.deleteIndex
);

/**
 * インデックス統計取得
 * GET /api/v1/semantic-search/stats
 *
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @middleware checkPermission - 権限チェック（030000 データ管理、読取専用）
 */
router.get(
  '/stats',
  authMiddleware,
  tenantIsolation,
  checkPermission('030000', 0),
  semanticSearchController.getStats
);

/**
 * ヘルスチェック
 * GET /api/v1/semantic-search/health
 *
 * @middleware authMiddleware - JWT認証
 */
router.get(
  '/health',
  authMiddleware,
  semanticSearchController.health
);

/**
 * バッチ処理開始
 * POST /api/v1/semantic-search/batch
 */
router.post(
  '/batch',
  authMiddleware,
  tenantIsolation,
  checkPermission('030000', 1),
  semanticSearchController.startBatch
);

/**
 * バッチジョブ一覧取得
 * GET /api/v1/semantic-search/batch
 */
router.get(
  '/batch',
  authMiddleware,
  tenantIsolation,
  checkPermission('030000', 0),
  semanticSearchController.getBatchJobs
);

/**
 * バッチ統計取得
 * GET /api/v1/semantic-search/batch/stats
 */
router.get(
  '/batch/stats',
  authMiddleware,
  tenantIsolation,
  checkPermission('030000', 0),
  semanticSearchController.getBatchStatsController
);

/**
 * バッチジョブキャンセル
 * DELETE /api/v1/semantic-search/batch/:jobId
 */
router.delete(
  '/batch/:jobId',
  authMiddleware,
  tenantIsolation,
  checkPermission('030000', 1),
  semanticSearchController.cancelBatch
);

export default router;
