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

/**
 * POST /api/v1/formats/folders
 * フォーマットフォルダ作成（部門直下）
 * 
 * 認証: 必須（JWT + Session）
 * 権限: 実験管理者メニュー（040000）、書込可（1）
 * 
 * リクエストボディ:
 *   - folderName: フォルダ名（1-255文字、英数字・アンダースコアのみ）
 */
router.post(
  '/folders',
  authMiddleware,
  checkPermission('040000', 1),  // 実験管理者メニュー、書込可
  formatController.createFormatFolder
);

/**
 * POST /api/v1/formats/subfolders
 * フォーマット内サブフォルダ作成
 * 
 * 認証: 必須（JWT + Session）
 * 権限: 実験管理者メニュー（040000）、書込可（1）
 * 
 * リクエストボディ:
 *   - formatName: フォーマット名（例: chemistry, materials）
 *   - subfolderName: サブフォルダ名（1-255文字、英数字・アンダースコア・ハイフン）
 *   - parentPath: 親フォルダのパス（オプション、空文字列=ルート直下）
 */
router.post(
  '/subfolders',
  authMiddleware,
  checkPermission('040000', 1),  // 実験管理者メニュー、書込可
  formatController.createFormatSubfolder
);

/**
 * POST /api/v1/formats/:folderName/files
 * フォーマットファイル作成
 * 
 * 認証: 必須（JWT + Session）
 * 権限: 実験管理者メニュー（040000）、書込可（1）
 * 
 * パラメータ:
 *   - folderName: フォーマットフォルダ名（例: chemistry）
 * リクエストボディ:
 *   - fileName: ファイル名（拡張子なし）
 *   - fileType: 'xml' | 'maiml'
 *   - templateType: 'material' | 'condition' | 'result'（xmlの場合のみ必須）
 *   - description: 概要（オプション）
 */
router.post(
  '/:folderName/files',
  authMiddleware,
  checkPermission('040000', 1),  // 実験管理者メニュー、書込可
  formatController.createFormatFile
);

export default router;
