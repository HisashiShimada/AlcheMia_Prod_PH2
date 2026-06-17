/**
 * 暗号化管理ルート
 *
 * @description
 * MAIMLファイルの暗号化・復号化・鍵管理APIのルート定義。
 *
 * @remarks
 * 本実装への移行時はコントローラー（encryptionController.ts）のみ差し替える。
 * このルートファイルおよび server.ts の変更は不要。
 *
 * エンドポイント一覧:
 *   GET    /api/v1/encryption/projects/:projectName/structure  - MAIMLツリー取得
 *   POST   /api/v1/encryption/projects/:projectName/preview    - 暗号化プレビュー
 *   POST   /api/v1/encryption/projects/:projectName/encrypt    - 暗号化実行
 *   POST   /api/v1/encryption/projects/:projectName/decrypt    - 復号化実行
 *   GET    /api/v1/encryption/keys                             - 鍵一覧取得
 *   GET    /api/v1/encryption/keys/:keyId                      - 鍵詳細取得
 *   POST   /api/v1/encryption/keys                             - 鍵作成
 *   DELETE /api/v1/encryption/keys/:keyId                      - 鍵削除
 */

import { Router } from 'express';
import {
  getMaimlStructure,
  previewEncryption,
  encryptElement,
  decryptElement,
  listKeys,
  getKey,
  createKey,
  deleteKey,
} from '../controllers/encryptionController';

const router = Router();

// ---------------------------------------------------------------------------
// プロジェクト単位の暗号化操作
// ---------------------------------------------------------------------------

/** MAIMLファイルのツリー構造を取得 */
router.get('/projects/:projectName/structure', getMaimlStructure);

/** 暗号化プレビューXMLを取得 */
router.post('/projects/:projectName/preview', previewEncryption);

/** 要素の暗号化を実行 */
router.post('/projects/:projectName/encrypt', encryptElement);

/** 要素の復号化を実行 */
router.post('/projects/:projectName/decrypt', decryptElement);

// ---------------------------------------------------------------------------
// 暗号化鍵管理
// ---------------------------------------------------------------------------

/** 鍵一覧を取得 */
router.get('/keys', listKeys);

/** 鍵詳細を取得 */
router.get('/keys/:keyId', getKey);

/** 鍵を新規作成 */
router.post('/keys', createKey);

/** 鍵を削除 */
router.delete('/keys/:keyId', deleteKey);

export default router;
