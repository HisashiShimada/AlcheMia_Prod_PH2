/**
 * 認証ミドルウェア
 * 
 * @description
 * JWT認証チェックを行うExpressミドルウェア
 * - Authorizationヘッダーからトークン抽出
 * - JWTトークン検証
 * - req.userへのユーザー情報格納
 * - 認証失敗時の401エラー返却
 */

import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../types/auth';
import { JwtService } from '../services/jwtService';

// Request型を拡張してuserプロパティを追加
declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}

/**
 * 認証ミドルウェア
 * 
 * @param req - Expressリクエストオブジェクト
 * @param res - Expressレスポンスオブジェクト
 * @param next - 次のミドルウェアを呼び出す関数
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // JwtServiceインスタンスを作成（テスト時にモック可能にするため関数内で作成）
    const jwtService = new JwtService();
    // Authorizationヘッダーからトークンを取得
    const authHeader = req.headers.authorization;

    // ヘッダーが存在しない、または空の場合
    if (!authHeader || authHeader.trim() === '') {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_MISSING',
          message: '認証トークンが提供されていません'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Bearer スキームを除去してトークンを抽出
    // "Bearer token" または "bearer token" または "token" の形式に対応
    let token = authHeader.trim();
    if (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }

    // トークンが空の場合
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_MISSING',
          message: '認証トークンが提供されていません'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // JWTトークンを検証
    const result = await jwtService.verify(token);

    // 検証失敗
    if (!result.success) {
      res.status(401).json({
        success: false,
        error: {
          code: result.error.code,
          message: result.error.message
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // 検証成功 - req.userにペイロードを格納
    req.user = result.data;

    // 次のミドルウェアへ
    next();
  } catch (error) {
    // 予期しないエラー
    console.error('authMiddleware error:', error);
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
