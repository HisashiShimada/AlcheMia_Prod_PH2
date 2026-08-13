/**
 * 改竄防止（署名・タイムスタンプ）ルート
 *
 * @description
 * MAIMLファイルの署名・タイムスタンプ・検証・証明書管理 API のルート定義。
 *
 * エンドポイント一覧:
 *   POST /api/v1/signature/projects/:projectName/sign      - 署名実行（ハッシュ→署名→TST→監査ログ）
 *   POST /api/v1/signature/projects/:projectName/verify    - 署名・TST・証明書を一括検証
 *   GET  /api/v1/signature/projects/:projectName/hash      - ハッシュ値のみ取得（軽量確認用）
 *   POST /api/v1/signature/certificates/validate           - 証明書有効期限チェック
 *   GET  /api/v1/signature/audit-log                       - 監査ログ一覧
 */

import { Router } from 'express';
import {
  signMaiml,
  verifyMaiml,
  getMaimlHash,
  validateCertificate,
  getAuditLog,
} from '../controllers/signatureController';

const router = Router();

// ---------------------------------------------------------------------------
// プロジェクト単位の署名・検証操作
// ---------------------------------------------------------------------------

/** MAIMLファイルに署名（ハッシュ計算 → 署名 → TST取得 → 監査ログ） */
router.post('/projects/:projectName/sign', signMaiml);

/** MAIMLファイルの署名・TST・証明書を一括検証 */
router.post('/projects/:projectName/verify', verifyMaiml);

/** MAIMLファイルの現在のハッシュ値のみ取得（署名は行わない） */
router.get('/projects/:projectName/hash', getMaimlHash);

// ---------------------------------------------------------------------------
// 証明書管理
// ---------------------------------------------------------------------------

/** 証明書（PEM 形式）の有効期限・発行者チェーンを検証 */
router.post('/certificates/validate', validateCertificate);

// ---------------------------------------------------------------------------
// 監査ログ
// ---------------------------------------------------------------------------

/** 改竄防止監査ログ一覧を取得 */
router.get('/audit-log', getAuditLog);

export default router;
