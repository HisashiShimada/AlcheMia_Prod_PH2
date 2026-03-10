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
import { handleValidationErrors } from '../middleware/validationMiddleware';

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
  handleValidationErrors,
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
  handleValidationErrors,
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
    body('content')
      .notEmpty()
      .withMessage('contentは必須です')
      .isString()
      .withMessage('contentは文字列である必要があります'),
    body('archive')
      .optional()
      .isBoolean()
      .withMessage('archiveはbooleanである必要があります'),
  ],
  handleValidationErrors,
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
  handleValidationErrors,
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
  handleValidationErrors,
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
  handleValidationErrors,
  maimlController.validate
);

/**
 * ファイル一覧取得
 * GET /api/v1/maiml/files
 * 
 * @middleware authMiddleware - JWT認証
 * @description S3/Swiftから組織別のMAIMLファイル一覧を取得
 * @reference Reference版: GET /api/s3/files (listingRoutes.js)
 * @requirements FR-MAIML-9, SEC-1
 * @features マルチテナント対応、チェックアウト状態、キャッシュ機能
 */
router.get(
  '/files',
  authMiddleware,
  [
    query('organizationId')
      .notEmpty()
      .withMessage('organizationIdは必須です')
      .isString()
      .withMessage('organizationIdは文字列である必要があります'),
  ],
  handleValidationErrors,
  maimlController.listFiles
);

/**
 * フォーマットテンプレートファイル一覧取得
 * GET /api/v1/maiml/formats
 *
 * @middleware authMiddleware - JWT認証
 * @description formats/ 配下を全部門横断で走査し、material/ condition/ result/ 配下の .xml ファイルのみ返す
 * @requirements FR-TEMPLATE-1, SEC-1
 */
router.get(
  '/formats',
  authMiddleware,
  maimlController.listFormats
);

/**
 * ファイル内容取得
 * GET /api/v1/maiml/file-content
 * 
 * @middleware authMiddleware - JWT認証
 * @description S3/Swiftから指定されたキーのファイル内容を取得
 * @reference Reference版: GET /api/s3/file-content (retrievalRoutes.js)
 * @requirements FR-MAIML-10, SEC-1
 */
router.get(
  '/file-content',
  authMiddleware,
  [
    query('key')
      .notEmpty()
      .withMessage('keyは必須です')
      .isString()
      .withMessage('keyは文字列である必要があります'),
  ],
  handleValidationErrors,
  maimlController.getFileContent
);

/**
 * MAIML自動補正（リアルタイム）
 * POST /api/v1/maiml/auto-correct
 * 
 * @middleware authMiddleware - JWT認証
 * @description MAIMLコンテンツのエラーを自動補正
 * @reference Reference版: POST /api/s3/maiml-auto-correct-realtime (validationRoutes.js)
 * @requirements FR-MAIML-11, SEC-1
 * @features Base64デコード、選択エラー補正、補正履歴
 */
router.post(
  '/auto-correct',
  authMiddleware,
  [
    body('maimlContent')
      .notEmpty()
      .withMessage('maimlContentは必須です')
      .isString()
      .withMessage('maimlContentは文字列である必要があります'),
    body('organizationId')
      .notEmpty()
      .withMessage('organizationIdは必須です')
      .isString()
      .withMessage('organizationIdは文字列である必要があります'),
    body('selectedErrors')
      .optional()
      .isArray()
      .withMessage('selectedErrorsは配列である必要があります'),
  ],
  handleValidationErrors,
  maimlController.autoCorrect
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
  handleValidationErrors,
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
  handleValidationErrors,
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
  handleValidationErrors,
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

// ========== Draft機能ルート ==========

/**
 * Draft保存
 * POST /api/v1/maiml/draft
 * 
 * @middleware authMiddleware - JWT認証
 * @description Draft（編集中データ）をDBに保存
 * @requirements FR-DRAFT-1, SEC-1
 */
router.post(
  '/draft',
  authMiddleware,
  [
    body('draftKey')
      .notEmpty()
      .withMessage('draftKeyは必須です')
      .isString()
      .withMessage('draftKeyは文字列である必要があります'),
    body('draftName')
      .notEmpty()
      .withMessage('draftNameは必須です')
      .isString()
      .withMessage('draftNameは文字列である必要があります'),
    body('originalFileKey')
      .optional()
      .isString()
      .withMessage('originalFileKeyは文字列である必要があります'),
  ],
  handleValidationErrors,
  maimlController.saveDraft
);

/**
 * Draft読み込み
 * GET /api/v1/maiml/draft/:draftKey
 * 
 * @middleware authMiddleware - JWT認証
 * @description 指定されたdraftKeyのDraftをDBから読み込む
 * @requirements FR-DRAFT-2, SEC-1
 */
router.get(
  '/draft/:draftKey',
  authMiddleware,
  [
    param('draftKey')
      .notEmpty()
      .withMessage('draftKeyは必須です')
      .isString()
      .withMessage('draftKeyは文字列である必要があります'),
  ],
  handleValidationErrors,
  maimlController.loadDraft
);

/**
 * Draft一覧取得
 * GET /api/v1/maiml/drafts
 * 
 * @middleware authMiddleware - JWT認証
 * @description ユーザーの全Draft一覧を取得
 * @requirements FR-DRAFT-3, SEC-1
 */
router.get(
  '/drafts',
  authMiddleware,
  maimlController.listDrafts
);

/**
 * Draft削除
 * DELETE /api/v1/maiml/draft/:draftKey
 * 
 * @middleware authMiddleware - JWT認証
 * @description 指定されたdraftKeyのDraftをDBから削除
 * @requirements FR-DRAFT-4, SEC-1
 */
router.delete(
  '/draft/:draftKey',
  authMiddleware,
  [
    param('draftKey')
      .notEmpty()
      .withMessage('draftKeyは必須です')
      .isString()
      .withMessage('draftKeyは文字列である必要があります'),
  ],
  handleValidationErrors,
  maimlController.deleteDraft
);

export default router;
