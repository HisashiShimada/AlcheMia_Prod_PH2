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
import { JwtService } from '../services/jwtService';
import { TokenBlacklistService } from '../services/tokenBlacklistService';

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

    // 検証成功 - ペイロードを取得
    const decoded = result.data;

    // ブラックリストチェック（tokenIdが存在する場合のみ）
    if (decoded.tokenId) {
      const blacklistService = new TokenBlacklistService();
      const blacklistResult = await blacklistService.isBlacklisted(decoded.tokenId);

      if (blacklistResult.success && blacklistResult.data) {
        // ブラックリスト登録済み - トークンは無効化されている
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_BLACKLISTED',
            message: 'このトークンは無効化されています'
          },
          meta: {
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // ブラックリストチェックでエラーが発生した場合
      if (!blacklistResult.success) {
        console.error('Blacklist check error:', blacklistResult.error);
        // Redis障害時はフェイルセーフ: JWT検証が成功しているため通す
        // （本番環境では厳格モードにすることも検討）
      }
    }

    // req.userにペイロードを格納
    req.user = decoded;

    // 次のミドルウェアへ
    next();
  } catch (error) {
    // 予期しないエラー
    console.error('authMiddleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'E4001',
        message: 'システムエラーが発生しました'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  }
}
