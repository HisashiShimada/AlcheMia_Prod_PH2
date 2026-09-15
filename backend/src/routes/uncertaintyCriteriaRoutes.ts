/**
 * uncertainty_criteria 関連ルート
 *
 * @remarks
 * 不確かさ基準管理APIのルーティング定義。
 *
 * @module uncertaintyCriteriaRoutes
 * @version 1.0.0
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import multer from 'multer';
import * as uncertaintyCriteriaController from '../controllers/uncertaintyCriteriaController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

// インポート用 multer 設定（CSV/JSON ファイルをメモリストレージで受け取る）
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/csv', 'application/json', 'application/octet-stream'];
    const isAllowed = allowed.some((t) => file.mimetype.startsWith(t))
      || file.originalname.endsWith('.csv')
      || file.originalname.endsWith('.json');
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('CSV または JSON ファイルのみアップロード可能です'));
    }
  },
});

/**
 * 不確かさ基準一覧取得
 * GET /api/v1/uncertainty-criteria
 *
 * @remarks
 * authMiddleware  → セッション検証・req.user に認証情報をセット
 * tenantIsolation → req.user.organizationId を req.organizationId にセット
 */
router.get(
  '/',
  authMiddleware,
  tenantIsolation,
  [
    query('scopeKey')
      .optional()
      .isString()
      .withMessage('scopeKey must be a string'),
  ],
  handleValidationErrors,
  uncertaintyCriteriaController.getList
);

/**
 * 不確かさ基準セレクター用一覧取得
 * GET /api/v1/uncertainty-criteria/for-selector
 *
 * @remarks
 * /:uncertaintyKey より前に定義しないとパスが衝突するため注意。
 * 有効（is_Invalid = FALSE）なレコードのみ返す。定性評価の選択肢も含む。
 * クエリ: organizationGroupCd（省略可）
 *   指定時: グループ＋祖先グループ＋組織共通スコープの基準のみ返す
 *   未指定: 組織内全件返す（後方互換）
 */
router.get(
  '/for-selector',
  authMiddleware,
  tenantIsolation,
  [
    query('organizationGroupCd')
      .optional()
      .isString()
      .withMessage('organizationGroupCd must be a string'),
  ],
  handleValidationErrors,
  uncertaintyCriteriaController.getForSelector
);

/**
 * 不確かさ基準エクスポート
 * GET /api/v1/uncertainty-criteria/export
 *
 * @remarks
 * /:uncertaintyKey より前に定義することでパスの衝突を回避する。
 * クエリ: uncertaintyKeys（複数可）, format（xml|json）, includeDesc, includeExtends, includeHistory
 */
router.get(
  '/export',
  authMiddleware,
  tenantIsolation,
  [
    query('uncertaintyKeys')
      .notEmpty()
      .withMessage('uncertaintyKeys is required'),
    query('format')
      .optional()
      .isIn(['xml', 'json'])
      .withMessage('format must be xml or json'),
  ],
  handleValidationErrors,
  uncertaintyCriteriaController.exportCriteria
);

/**
 * 不確かさ基準インポート
 * POST /api/v1/uncertainty-criteria/import
 *
 * @remarks
 * multipart/form-data: file（CSV/JSON）, format, nameSpaceId
 */
router.post(
  '/import',
  authMiddleware,
  tenantIsolation,
  importUpload.single('file'),
  handleValidationErrors,
  uncertaintyCriteriaController.importCriteria
);

/**
 * 不確かさ基準 新バージョン保存
 * POST /api/v1/uncertainty-criteria
 *
 * @remarks
 * リクエストボディの uncertaintyKey + nameSpaceId をキーに、
 * MAX(version)+1 で uncertainty_criteria に新規 INSERT する。
 * 定性評価の場合は intuition_selector にも選択肢を INSERT する。
 */
router.post(
  '/',
  authMiddleware,
  tenantIsolation,
  [
    body('nameSpaceId')
      .notEmpty()
      .withMessage('nameSpaceId is required'),
    body('uncertaintyKey')
      .notEmpty()
      .withMessage('uncertaintyKey is required'),
    body('evaluationMethod')
      .notEmpty()
      .withMessage('evaluationMethod is required')
      .isInt({ min: 1, max: 2 })
      .withMessage('evaluationMethod must be 1 (quantitative) or 2 (qualitative)'),
    body('uncertaintyName')
      .optional()
      .isString()
      .withMessage('uncertaintyName must be a string'),
    body('isInvalid')
      .optional()
      .isBoolean()
      .withMessage('isInvalid must be a boolean'),
    body('qualitativeOptions')
      .optional()
      .isArray()
      .withMessage('qualitativeOptions must be an array'),
    body('qualitativeOptions.*.displayOrder')
      .optional()
      .isInt({ min: 1 })
      .withMessage('qualitativeOptions[].displayOrder must be a positive integer'),
    body('qualitativeOptions.*.value')
      .optional()
      .isString()
      .withMessage('qualitativeOptions[].value must be a string'),
    body('qualitativeOptions.*.displayColor')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('qualitativeOptions[].displayColor must be in #RRGGBB format'),
  ],
  handleValidationErrors,
  uncertaintyCriteriaController.createNewVersion
);

/**
 * 不確かさ基準詳細取得
 * GET /api/v1/uncertainty-criteria/:uncertaintyKey?version=:version
 *
 * @remarks
 * uncertainty_key + version で1件取得。定性評価の場合は intuition_selector も含む。
 */
router.get(
  '/:uncertaintyKey',
  authMiddleware,
  tenantIsolation,
  [
    param('uncertaintyKey')
      .notEmpty()
      .withMessage('uncertaintyKey is required'),
    query('version')
      .notEmpty()
      .withMessage('version (integer) is required')
      .isInt({ min: 1 })
      .withMessage('version must be an integer of 1 or more'),
  ],
  handleValidationErrors,
  uncertaintyCriteriaController.getDetail
);

export default router;
