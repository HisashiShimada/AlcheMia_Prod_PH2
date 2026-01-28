/**
 * MAIML編集関連ルート
 * 
 * @description MAIML編集、解析、バリデーション等のエンドポイント定義
 * @reference Reference版: reference/backend/routes/editRoutes.js
 * @task Phase 6 Step 2: ルート・コントローラー実装
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import * as maimlController from '../controllers/maimlController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * MAIMLファイル解析（基本）
 * POST /api/v1/maiml/parse
 * 
 * @middleware authMiddleware - JWT認証
 * @description MAIMLファイルを解析し、ペトリネット構造を抽出（基本機能）
 * @requirements FR-MAIML-1
 */
router.post(
  '/parse',
  authMiddleware,
  [
    body('content')
      .notEmpty()
      .withMessage('contentは必須です')
      .isString()
      .withMessage('contentは文字列である必要があります'),
  ],
  maimlController.parse
);

/**
 * ペトリネット構造解析（複数method対応・強化版）
 * POST /api/v1/maiml/parse-petri-net-structure
 * 
 * @middleware authMiddleware - JWT認証
 * @description Phase 4で実装した新しい解析API
 * - 複数methodの完全サポート（isMultiMethod判定）
 * - method別のplace/transition/arc抽出
 * - ステレオタイプ自動抽出（materialTemplate, conditionTemplate, resultTemplate）
 * - InstructionID自動紐付け
 * - 重複ID検証統合
 * - 後方互換性保持（フラット構造も返却）
 * @requirements FR-MAIML-1, FR-MAIML-MULTI-METHOD
 * @version 2.0
 * @since Phase 4
 */
router.post(
  '/parse-petri-net-structure',
  authMiddleware,
  [
    body('content')
      .notEmpty()
      .withMessage('contentは必須です')
      .isString()
      .withMessage('contentは文字列である必要があります'),
  ],
  maimlController.parsePetriNetStructure
);

/**
 * MAIMLファイル保存
 * POST /api/v1/maiml/save
 * 
 * @middleware authMiddleware - JWT認証
 * @description MAIMLファイルをS3/Swiftに保存（バックアップ作成含む）
 * @reference Reference版: POST /api/edit/save-maiml
 * @requirements FR-MAIML-2, SEC-1
 */
router.post(
  '/save',
  authMiddleware,
  [
    body('projectId')
      .notEmpty()
      .withMessage('projectIdは必須です')
      .isString()
      .withMessage('projectIdは文字列である必要があります'),
    body('content')
      .notEmpty()
      .withMessage('contentは必須です')
      .isString()
      .withMessage('contentは文字列である必要があります'),
    body('options')
      .optional()
      .isObject()
      .withMessage('optionsはオブジェクトである必要があります'),
  ],
  maimlController.save
);

/**
 * MAIMLファイル読込
 * POST /api/v1/maiml/load
 * 
 * @middleware authMiddleware - JWT認証
 * @description S3/SwiftからMAIMLファイルを読み込む
 * @requirements FR-MAIML-3, SEC-1
 */
router.post(
  '/load',
  authMiddleware,
  [
    body('filePath')
      .notEmpty()
      .withMessage('filePathは必須です')
      .isString()
      .withMessage('filePathは文字列である必要があります'),
  ],
  maimlController.load
);

/**
 * MAIMLファイル一覧取得
 * GET /api/v1/maiml/list
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトに関連するMAIMLファイル一覧を取得
 * @requirements FR-MAIML-4, SEC-1
 */
router.get(
  '/list',
  authMiddleware,
  [
    query('projectId')
      .notEmpty()
      .withMessage('projectIdは必須です')
      .isString()
      .withMessage('projectIdは文字列である必要があります'),
  ],
  maimlController.list
);

/**
 * MAIMLバリデーション
 * POST /api/v1/maiml/validate
 * 
 * @middleware authMiddleware - JWT認証
 * @description MAIML構造を検証（XML構文、ノードID重複、アーク参照等）
 * @reference Reference版: POST /api/edit/validate
 * @requirements FR-MAIML-5
 */
router.post(
  '/validate',
  authMiddleware,
  [
    body('content')
      .notEmpty()
      .withMessage('contentは必須です')
      .isString()
      .withMessage('contentは文字列である必要があります'),
  ],
  maimlController.validate
);

/**
 * MAIML自動補正
 * POST /api/v1/maiml/correct
 * 
 * @middleware authMiddleware - JWT認証
 * @description MAIML構造の基本的なエラーを自動修正
 * @requirements FR-MAIML-6
 * @note 優先度低（Phase 7で実装予定）
 */
router.post(
  '/correct',
  authMiddleware,
  [
    body('content')
      .notEmpty()
      .withMessage('contentは必須です')
      .isString()
      .withMessage('contentは文字列である必要があります'),
  ],
  maimlController.correct
);

/**
 * 編集セッション開始
 * POST /api/v1/maiml/session/start
 * 
 * @middleware authMiddleware - JWT認証
 * @description MAIML編集セッションを開始（ファイルロック）
 * @reference Reference版: POST /api/edit/session/start
 * @requirements FR-MAIML-7
 */
router.post(
  '/session/start',
  authMiddleware,
  [
    body('sessionId')
      .notEmpty()
      .withMessage('sessionIdは必須です')
      .isString()
      .withMessage('sessionIdは文字列である必要があります'),
    body('fileKey')
      .notEmpty()
      .withMessage('fileKeyは必須です')
      .isString()
      .withMessage('fileKeyは文字列である必要があります'),
    body('fileName')
      .notEmpty()
      .withMessage('fileNameは必須です')
      .isString()
      .withMessage('fileNameは文字列である必要があります'),
    body('userId')
      .optional()
      .isString()
      .withMessage('userIdは文字列である必要があります'),
  ],
  maimlController.startSession
);

/**
 * 編集セッション終了
 * POST /api/v1/maiml/session/end
 * 
 * @middleware authMiddleware - JWT認証
 * @description MAIML編集セッションを終了
 * @reference Reference版: POST /api/edit/session/end
 * @requirements FR-MAIML-8
 */
router.post(
  '/session/end',
  authMiddleware,
  [
    body('sessionId')
      .notEmpty()
      .withMessage('sessionIdは必須です')
      .isString()
      .withMessage('sessionIdは文字列である必要があります'),
  ],
  maimlController.endSession
);

/**
 * ヘルスチェック
 * GET /api/v1/maiml/health
 * 
 * @description MAIML編集機能のヘルスチェック
 * @reference Reference版: GET /api/edit/health
 */
router.get('/health', maimlController.health);

export default router;