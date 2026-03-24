/**
 * セッション管理コントローラー
 * 
 * @description
 * - セッション一覧取得API
 * - セッション強制終了API
 * - バリデーションはルート層で実施
 */

import { Request, Response } from 'express';
import { SessionService } from '../services/sessionService';
import { JwtService } from '../services/jwtService';
import { v4 as uuidv4 } from 'uuid';
import { logError } from '../utils/logger';

/**
 * セッション管理コントローラークラス
 */
export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService();
  }

  /**
   * セッション一覧取得
   * 
   * GET /api/v1/sessions
   * 
   * @description
   * - System Admin権限必須
   * - 自組織のアクティブセッションのみ取得（マルチテナント分離）
   */
  async list(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();

    try {
      // organizationIdとuserIdはミドルウェアで設定済み
      const organizationId = req.organizationId!;
      const currentUserId = req.user!.userId;

      // 現在のリフレッシュトークンのtokenIdを取得
      let currentTokenId: string | undefined;
      const refreshToken = req.cookies?.refreshToken;
      
      if (refreshToken) {
        const jwtService = new JwtService();
        const decoded = jwtService.decode(refreshToken);
        if (decoded && 'tokenId' in decoded) {
          currentTokenId = decoded.tokenId;
        }
      }

      // セッション一覧を取得
      const result = await this.sessionService.listActiveSessions(
        organizationId,
        currentUserId,
        currentTokenId
      );

      if (!result.success) {
        const statusCode = result.error?.code === 'SYSTEM_REDIS_ERROR' ? 503 : 500;
        res.status(statusCode).json({
          success: false,
          error: result.error,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      }

      // 成功レスポンス
      res.status(200).json({
        success: true,
        data: {
          sessions: result.data,
          count: result.data.length,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    } catch (error) {
      logError('Session list failed', error as Error, {
        action: 'list_sessions',
        organizationId: req.organizationId,
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'E4001',
          message: 'セッション一覧の取得に失敗しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    }
  }

  /**
   * セッション強制終了
   * 
   * DELETE /api/v1/sessions/:tokenId
   * 
   * @description
   * - System Admin権限必須
   * - 自組織のセッションのみ終了可能（マルチテナント分離）
   * - 現在のセッション（tokenId）は終了不可
   */
  async terminate(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();

    try {
      // パラメータはミドルウェアでバリデーション済み
      const tokenId = req.params.tokenId;
      const organizationId = req.organizationId!;
      const currentUserId = req.user!.userId;

      // 現在のリフレッシュトークンのtokenIdを取得
      let currentTokenId: string | undefined;
      const refreshToken = req.cookies?.refreshToken;
      
      if (refreshToken) {
        const jwtService = new JwtService();
        const decoded = jwtService.decode(refreshToken);
        if (decoded && 'tokenId' in decoded) {
          currentTokenId = decoded.tokenId;
        }
      }

      // セッションを強制終了
      const result = await this.sessionService.terminateSession(
        tokenId,
        currentUserId,
        organizationId,
        currentTokenId
      );

      if (!result.success) {
        let statusCode = 500;
        
        switch (result.error?.code) {
          case 'E6001':
            statusCode = 404;
            break;
          case 'E1003':
            statusCode = 400;
            break;
          case 'E5015':
            statusCode = 403;
            break;
          case 'SYSTEM_REDIS_ERROR':
            statusCode = 503;
            break;
        }

        res.status(statusCode).json({
          success: false,
          error: result.error,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      }

      // 成功レスポンス
      res.status(200).json({
        success: true,
        data: {
          message: 'セッションを終了しました',
          tokenId,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    } catch (error) {
      logError('Session termination failed', error as Error, {
        action: 'terminate_session',
        tokenId: req.params.tokenId,
        organizationId: req.organizationId,
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'E4001',
          message: 'セッションの終了に失敗しました',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    }
  }
}

// コントローラーのインスタンスをエクスポート
const sessionController = new SessionController();

/**
 * セッション一覧取得エンドポイント
 */
export const list = (req: Request, res: Response) => {
  return sessionController.list(req, res);
};

/**
 * セッション強制終了エンドポイント
 */
export const terminate = (req: Request, res: Response) => {
  return sessionController.terminate(req, res);
};
