/**
 * プロジェクト管理関連ルート
 * 
 * @description プロジェクト一覧取得などのエンドポイント定義
 * Task: 3.1, 3.2 Routes層実装
 */

import { Router } from 'express';
import { query, body, param } from 'express-validator';
import * as projectController from '../controllers/projectController';
import * as workerProjectController from '../controllers/workerProjectController';
import * as taskRegistrationController from '../controllers/taskRegistrationController';
import * as projectInstructionController from '../controllers/projectInstructionController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { handleValidationErrors } from '../middleware/validationMiddleware';
import { checkPermission } from '../middleware/permissionCheckMiddleware';

const router = Router();

/**
 * 実験作業者がアクセス可能なプロジェクト一覧取得
 * GET /api/v1/projects/worker-accessible
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 050000 実験作業者メニュー、読取専用）
 * @description 実験作業者が作業可能なプロジェクト一覧を取得する
 * @note Task 4.1: 実験作業者用プロジェクト一覧APIエンドポイント追加
 * @note 静的ルートは動的ルート（/:projectId等）より前に定義する必要がある
 * @requirements REQ-1, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7
 * @roles experiment_worker（読取専用）
 */
router.get(
  '/worker-accessible',
  authMiddleware,
  checkPermission('050000', 0),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('ページ番号は1以上の整数である必要があります'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limitは1〜100の範囲内の整数である必要があります'),
    query('status')
      .optional()
      .isIn(['1', '2', '3'])
      .withMessage("statusは'1', '2', '3'のいずれかを指定してください"),
    query('sort_by')
      .optional()
      .isIn(['create_at', 'project_name', 'update_at'])
      .withMessage("sort_byは'create_at', 'project_name', 'update_at'のいずれかを指定してください"),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage("orderは'asc'または'desc'を指定してください"),
  ],
  handleValidationErrors,
  workerProjectController.listWorkerAccessible
);

/**
 * プロジェクト一覧取得
 * GET /api/v1/projects
 * 
 * @middleware authMiddleware - JWT認証
 * @note テナント分離と権限チェックはController層で実装済み
 */
router.get(
  '/',
  authMiddleware,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('ページ番号は1以上の整数である必要があります'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limitは1〜100の範囲内の整数である必要があります'),
    query('include_completed')
      .optional()
      .isBoolean()
      .withMessage('include_completedはtrueまたはfalseである必要があります'),
    query('sort_by')
      .optional()
      .isIn(['create_at', 'project_name'])
      .withMessage('sort_byはcreate_atまたはproject_nameである必要があります'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('orderはascまたはdescである必要があります'),
  ],
  handleValidationErrors,
  projectController.list
);

/**
 * プロジェクト作成
 * POST /api/v1/projects
 * 
 * @middleware authMiddleware - JWT認証
 * @note Task 1.1: POST /api/v1/projectsエンドポイント追加
 */
router.post(
  '/',
  authMiddleware,
  [
    body('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります')
      .matches(/^[^\x00-\x1F\x7F]*$/)
      .withMessage('projectNameに制御文字を含めることはできません'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('descriptionは1000文字以内である必要があります'),
  ],
  handleValidationErrors,
  projectController.create
);

/**
 * プロジェクトMAIML取得
 * GET /api/v1/projects/:projectName/maiml
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトの最新MAIMLファイルをXML形式で取得する（プロジェクト管理画面で使用）
 * @note フロントエンドProjectMaimlContext用エンドポイント
 * @requirements REQ-1, REQ-2, REQ-3, REQ-8
 * @roles 全ロール（読み取り専用）
 */
router.get(
  '/:projectName/maiml',
  authMiddleware,
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
  ],
  handleValidationErrors,
  projectController.getProjectMaiml
);

/**
 * プロジェクト詳細取得
 * GET /api/v1/projects/:projectId
 * 
 * @middleware authMiddleware - JWT認証
 * @note Task 2.2: プロジェクト詳細取得エンドポイント追加
 */
router.get(
  '/:projectId',
  authMiddleware,
  [
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
  ],
  handleValidationErrors,
  projectController.getById
);

/**
 * プロジェクトチェックアウト
 * POST /api/v1/projects/:projectId/checkout
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトをチェックアウトし、排他編集を開始する
 * @note Task 1.1: チェックアウトエンドポイント追加
 * @requirements FR-1.1
 */
router.post(
  '/:projectId/checkout',
  authMiddleware,
  [
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
  ],
  handleValidationErrors,
  projectController.checkout
);

/**
 * プロジェクトチェックイン
 * POST /api/v1/projects/:projectId/checkin
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトをチェックインし、排他編集を終了する
 * @note Task 1.2: チェックインエンドポイント追加
 * @requirements FR-2.1
 */
router.post(
  '/:projectId/checkin',
  authMiddleware,
  [
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
  ],
  handleValidationErrors,
  projectController.checkin
);

/**
 * 承認依頼
 * PATCH /api/v1/projects/:projectName/approval-request
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @middleware checkPermission - 権限チェック（機能CD: 050000 実験作業者メニュー、書込可）
 * @description 実験作業者が実験作業完了後に実験管理者へ承認依頼を送信する
 * @note Task 1.1: 承認依頼エンドポイントのルーティング追加
 * @requirements REQ-1, REQ-2, REQ-3
 * @roles experiment_worker（書込可）
 */
router.patch(
  '/:projectName/approval-request',
  authMiddleware,
  tenantIsolation,
  checkPermission('050000', 1),
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
    body('comment')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('commentは1000文字以内である必要があります'),
  ],
  handleValidationErrors,
  projectController.requestApproval
);

/**
 * プロジェクトチェックアウト状態取得
 * GET /api/v1/projects/:projectId/checkout-status
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトの現在のチェックアウト状態を取得する
 * @note Task 1.3: チェックアウト状態照会エンドポイント追加
 * @requirements FR-3.1
 */
router.get(
  '/:projectId/checkout-status',
  authMiddleware,
  [
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
  ],
  handleValidationErrors,
  projectController.getCheckoutStatus
);

/**
 * プロジェクトファイル一覧取得
 * GET /api/v1/projects/:projectName/files
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトに関連するファイル一覧を取得する（署名付きURL付き）
 * @note archiveファイルは常に取得される（include_archiveパラメータ削除）
 * @requirements REQ-2, REQ-3, REQ-11
 */
router.get(
  '/:projectName/files',
  authMiddleware,
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です'),
  ],
  handleValidationErrors,
  projectController.getProjectFiles
);

/**
 * プロジェクトタスク一覧取得
 * GET /api/v1/projects/:projectName/tasks
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトに関連するタスク一覧を取得する
 * @note Task 3.3: タスク一覧取得エンドポイント追加
 * @requirements REQ-2, REQ-4
 */
router.get(
  '/:projectName/tasks',
  authMiddleware,
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です'),
    query('status')
      .optional()
      .isIn(['all', 'pending', 'in_progress', 'completed', 'failed'])
      .withMessage('statusはall, pending, in_progress, completed, failedのいずれかである必要があります'),
  ],
  handleValidationErrors,
  projectController.getProjectTasks
);

/**
 * 作業指示一覧取得
 * GET /api/v1/projects/:projectName/worker-instructions
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 050000 実験作業者メニュー、読取専用）
 * @description プロジェクトに関連する作業指示一覧を取得する
 * @note Task 1.1: 作業指示一覧取得エンドポイント追加
 * @note バリデーションはミドルウェアで処理済み
 * @requirements REQ-1, REQ-3
 * @roles experiment_worker（読取専用）
 */
router.get(
  '/:projectName/worker-instructions',
  authMiddleware,
  checkPermission('050000', 0),
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
    query('projectId')
      .optional()
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
  ],
  handleValidationErrors,
  projectController.getWorkerInstructions
);

/**
 * 指示確認完了
 * PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 050000 実験作業者メニュー、書込可）
 * @description 実験作業者が指示を確認したことを記録する
 * @note API 2.14: プロジェクト管理APIの一部として実装
 * @requirements REQ-001, REQ-002
 * @roles experiment_worker（書込可）
 */
router.put(
  '/:projectName/instructions/:instructionId/confirm',
  authMiddleware,
  checkPermission('050000', 1),
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
    param('instructionId')
      .isUUID()
      .withMessage('instructionIdはUUID形式である必要があります'),
  ],
  handleValidationErrors,
  projectController.confirmInstruction
);

/**
 * タスク登録情報取得
 * GET /api/v1/projects/:projectName/task-registration
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 040000 実験管理者メニュー、読取専用）
 * @description プロジェクトのタスク登録情報を取得する
 * @note タスク登録タブで使用
 * @requirements REQ-1, REQ-2
 * @roles experiment_admin（読取専用）
 */
router.get(
  '/:projectName/task-registration',
  authMiddleware,
  checkPermission('040000', 0),
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
  ],
  handleValidationErrors,
  taskRegistrationController.getTaskRegistration
);

/**
 * タスク登録情報保存
 * POST /api/v1/projects/:projectName/task-registration
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 040000 実験管理者メニュー、書込可）
 * @description プロジェクトのタスク登録情報を保存する
 * @note タスク登録タブで使用
 * @requirements REQ-1, REQ-2
 * @roles experiment_admin（書込可）
 */
router.post(
  '/:projectName/task-registration',
  authMiddleware,
  checkPermission('040000', 1),
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
    body('tasks')
      .isArray({ min: 1 })
      .withMessage('tasksは1要素以上の配列である必要があります'),
    body('tasks.*.methodId')
      .notEmpty()
      .withMessage('methodIdは必須です'),
    body('tasks.*.experimentCondition')
      .isInt({ min: 0 })
      .withMessage('experimentConditionは0以上の整数である必要があります'),
    body('tasks.*.trialCount')
      .isInt({ min: 1, max: 999 })
      .withMessage('trialCountは1〜999の範囲内の整数である必要があります'),
  ],
  handleValidationErrors,
  taskRegistrationController.saveTaskRegistration
);

/**
 * タスク登録状況取得（指示送信タブのボタン活性制御用）
 * GET /api/v1/projects/:projectName/instructions/status
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 040000 実験管理者メニュー、読取専用）
 * @description 指示送信タブでタスク登録状況を取得し、ボタンの活性/非活性を制御する
 * @note 指示送信タブで使用
 * @requirements REQ-1, REQ-2
 * @roles experiment_admin（読取専用）
 */
router.get(
  '/:projectName/instructions/status',
  authMiddleware,
  checkPermission('040000', 0),
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
  ],
  handleValidationErrors,
  projectInstructionController.getTaskRegistrationStatus
);

/**
 * 指示一覧取得
 * GET /api/v1/projects/:projectName/instructions
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 040000 実験管理者メニュー、読取専用）
 * @description プロジェクトの指示一覧を取得する（送信済・未送信両方）
 * @note 指示送信タブで使用
 * @requirements REQ-1, REQ-2
 * @roles experiment_admin（読取専用）
 */
router.get(
  '/:projectName/instructions',
  authMiddleware,
  checkPermission('040000', 0),
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
  ],
  handleValidationErrors,
  projectInstructionController.getInstructions
);

/**
 * 指示保存（未送信）
 * POST /api/v1/projects/:projectName/instructions
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 040000 実験管理者メニュー、書込可）
 * @description 指示を未送信状態で保存する
 * @note 指示送信タブで使用
 * @requirements REQ-1, REQ-2
 * @roles experiment_admin（書込可）
 */
router.post(
  '/:projectName/instructions',
  authMiddleware,
  checkPermission('040000', 1),
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
    body('priority')
      .isInt({ min: 0, max: 3 })
      .withMessage('priorityは0〜3の範囲内の整数である必要があります'),
    body('type')
      .isInt({ min: 0, max: 4 })
      .withMessage('typeは0〜4の範囲内の整数である必要があります'),
    body('content')
      .notEmpty()
      .withMessage('contentは必須です')
      .isLength({ max: 5000 })
      .withMessage('contentは5000文字以内である必要があります'),
  ],
  handleValidationErrors,
  projectInstructionController.saveInstruction
);

/**
 * 指示更新（未送信のみ）
 * PUT /api/v1/projects/:projectName/instructions/:instructionId
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 040000 実験管理者メニュー、書込可）
 * @description 未送信の指示を更新する（送信済は更新不可）
 * @note 指示送信タブで使用
 * @note instructionIdは「プロジェクト名_XXX」形式（例: sample_project_001）
 * @requirements REQ-1, REQ-2
 * @roles experiment_admin（書込可）
 */
router.put(
  '/:projectName/instructions/:instructionId',
  authMiddleware,
  checkPermission('040000', 1),
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
    param('instructionId')
      .notEmpty()
      .withMessage('instructionIdは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('instructionIdは1〜255文字である必要があります'),
    body('methodId')
      .notEmpty()
      .withMessage('methodIdは必須です'),
    body('priority')
      .isInt({ min: 0, max: 3 })
      .withMessage('priorityは0〜3の範囲内の整数である必要があります'),
    body('type')
      .isInt({ min: 0, max: 4 })
      .withMessage('typeは0〜4の範囲内の整数である必要があります'),
    body('content')
      .notEmpty()
      .withMessage('contentは必須です')
      .isLength({ max: 5000 })
      .withMessage('contentは5000文字以内である必要があります'),
  ],
  handleValidationErrors,
  projectInstructionController.updateInstruction
);

/**
 * 指示削除（未送信のみ）
 * DELETE /api/v1/projects/:projectName/instructions/:instructionId
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 040000 実験管理者メニュー、書込可）
 * @description 未送信の指示を削除する（送信済は削除不可）
 * @note 指示送信タブで使用
 * @note instructionIdは「プロジェクト名_XXX」形式（例: sample_project_001）
 * @requirements REQ-1, REQ-2
 * @roles experiment_admin（書込可）
 */
router.delete(
  '/:projectName/instructions/:instructionId',
  authMiddleware,
  checkPermission('040000', 1),
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
    param('instructionId')
      .notEmpty()
      .withMessage('instructionIdは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('instructionIdは1〜255文字である必要があります'),
  ],
  handleValidationErrors,
  projectInstructionController.deleteInstruction
);

/**
 * 未送信指示を一括送信
 * POST /api/v1/projects/:projectName/instructions/send
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 040000 実験管理者メニュー、書込可）
 * @description 未送信の指示を一括送信し、タスクを作成し、プロジェクトステータスを更新する
 * @note 指示送信タブで使用（トランザクション処理）
 * @requirements REQ-1, REQ-2
 * @roles experiment_admin（書込可）
 */
router.post(
  '/:projectName/instructions/send',
  authMiddleware,
  checkPermission('040000', 1),
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
  ],
  handleValidationErrors,
  projectInstructionController.sendInstructions
);

export default router;
