import { Router } from 'express';
import { formatController } from '../controllers/formatController';
import { authMiddleware } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/permissionCheckMiddleware';

const router = Router();

/**
 * GET /api/v1/formats
 * フォーマット一覧取得
 * 
 * 認証: 必須（JWT + Session）
 * 権限: 実験管理者メニュー（040000）、読み取り専用（0）
 */
router.get(
  '/',
  authMiddleware,
  checkPermission('040000', 0),  // 実験管理者メニュー、読み取り専用
  formatController.getFormats
);

/**
 * GET /api/v1/formats/:folderName/files
 * フォーマットファイル一覧取得
 * 
 * 認証: 必須（JWT + Session）
 * 権限: 実験管理者メニュー（040000）、読み取り専用（0）
 * 
 * パラメータ:
 *   - folderName: フォルダ名（例: maiml_1）
 * クエリパラメータ:
 *   - path: サブフォルダパス（オプション、例: displayTest）
 */
router.get(
  '/:folderName/files',
  authMiddleware,
  checkPermission('040000', 0),  // 実験管理者メニュー、読み取り専用
  formatController.getFormatFiles
);

export default router;
