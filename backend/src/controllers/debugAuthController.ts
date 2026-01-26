/**
 * デバッグ認証コントローラー
 * 
 * @description
 * 開発環境専用のデバッグログイン機能
 * test_dataのCSVファイルに基づいたユーザー情報でJWTトークンを生成
 */

import { Request, Response } from 'express';
import { JwtService } from '../services/jwtService';
import { v4 as uuidv4 } from 'uuid';

/**
 * テストデータに基づくユーザー情報マップ
 */
const DEBUG_USERS = {
  experiment_admin: {
    userId: '686e0a8f-da93-48df-98b4-482fa4eb098b',
    organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    role: 'experiment_admin' as const,
    organizationName: 'AIML研究所',
  },
  data_admin: {
    userId: '0a7acb10-753e-4bcc-b4ed-836d65e4598a',
    organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    role: 'data_admin' as const,
    organizationName: 'AIML研究所',
  },
  system_admin: {
    userId: '3b572113-40ed-44f7-9913-d797184b67d4',
    organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    role: 'system_admin' as const,
    organizationName: 'AIML研究所',
  },
  experiment_worker: {
    userId: '0c5d7815-5bc1-477f-9749-230b8156901e',
    organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    role: 'experiment_worker' as const,
    organizationName: 'AIML研究所',
  },
  provider: {
    userId: 'fa521054-6f45-43f8-b37e-3cd34ee6c87b',
    organizationId: 'c9621ed6-5def-4970-8e7f-fbe97c98e3ed',
    role: 'provider' as const,
    organizationName: 'システム管理組織',
  },
};

/**
 * デバッグログイン
 * 
 * @description
 * 開発環境専用。指定されたロールのユーザーでJWTトークンを生成し、
 * HTTPOnly Cookieに設定する。
 * 
 * @route POST /api/v1/auth/debug-login
 * @access Public (開発環境のみ)
 */
export async function debugLogin(req: Request, res: Response): Promise<void> {
  try {
    // 本番環境では使用不可
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'デバッグログインは本番環境では使用できません'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const { role } = req.body;

    // ロールのバリデーション
    if (!role || !(role in DEBUG_USERS)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '無効なロールが指定されました',
          details: [
            {
              field: 'role',
              message: `roleは以下のいずれかである必要があります: ${Object.keys(DEBUG_USERS).join(', ')}`
            }
          ]
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // デバッグユーザー情報を取得
    const userInfo = DEBUG_USERS[role as keyof typeof DEBUG_USERS];

    // セッションIDを生成
    const sessionId = uuidv4();

    // JWTトークンを生成
    const jwtService = new JwtService();
    const tokenResult = await jwtService.generate(
      {
        userId: userInfo.userId,
        organizationId: userInfo.organizationId,
        role: userInfo.role,
        sessionId,
      },
      userInfo.role // 第2引数: ロール（有効期限決定に使用）
    );

    if (!tokenResult.success) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TOKEN_GENERATION_FAILED',
          message: 'トークンの生成に失敗しました',
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // 成功レスポンス（トークンをレスポンスで返す）
    res.status(200).json({
      success: true,
      data: {
        token: tokenResult.data,
        user: {
          id: userInfo.userId,
          role: userInfo.role,
          organizationId: userInfo.organizationId,
          organizationName: userInfo.organizationName,
        },
        message: 'デバッグログインに成功しました'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('debugLogin error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  }
}
