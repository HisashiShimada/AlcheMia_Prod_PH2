/**
 * JWTサービス
 * 
 * @description JWTトークンの生成・検証・デコードを提供
 * Requirements: 2.2, 4.1
 */

import jwt from 'jsonwebtoken';
import type { JwtPayload, Result, ServiceError } from '../types/auth';

/**
 * JWTサービスクラス
 */
export class JwtService {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    // 環境変数から設定を取得
    this.secret = process.env.JWT_SECRET || '';
    this.issuer = process.env.JWT_ISSUER || 'mmdpf-auth-api';
    this.audience = process.env.JWT_AUDIENCE || 'mmdpf-client';

    // JWT_SECRETが設定されていない場合はエラー
    if (!this.secret) {
      throw new Error(
        'JWT_SECRET environment variable is required. ' +
        'Please set JWT_SECRET in your .env file. ' +
        'See docs/20250106_0930_環境変数設定ガイド.md for details.'
      );
    }
  }

  /**
   * JWTトークンを生成
   * 
   * @param payload - JWTペイロード（iat, expを除く）
   * @param role - ユーザーロール（有効期限決定に使用）
   * @returns maiml_session-{sessionId}_{timestamp} 形式のトークン
   */
  async generate(
    payload: Omit<JwtPayload, 'iat' | 'exp'>
  ): Promise<Result<string, ServiceError>> {
    try {
      // 現在時刻
      const now = Math.floor(Date.now() / 1000);
      
      // 完全なペイロードを構築
      const fullPayload: JwtPayload = {
        ...payload,
        iat: now,
        exp: now + 9999999999
        // TODO: トークンの有効期限をenvファイルから設定する
        // exp: now + expiresIn
      };

      // HS256署名でJWT生成
      const jwtToken = jwt.sign(fullPayload, this.secret, {
        algorithm: 'HS256',
        issuer: this.issuer,
        audience: this.audience
      });

      // トークン形式: maiml_session-{sessionId}_{timestamp}.{jwt}
      // セッションIDとJWT本体を結合して返す
      const sessionToken = `maiml_session-${payload.sessionId}_${now}.${jwtToken}`;

      return {
        success: true,
        data: sessionToken
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_JWT_GENERATION_FAILED',
          message: 'JWT token generation failed',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * JWTトークンを検証
   * 
   * @param token - 検証するトークン
   * @returns 検証されたペイロード
   */
  async verify(token: string): Promise<Result<JwtPayload, ServiceError>> {
    try {
      // トークンからJWT部分を抽出
      const parts = token.split('.');
      
      if (parts.length < 4) {
        // maiml_session-{sessionId}_{timestamp}.{jwt}の形式でない
        return {
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid token format'
          }
        };
      }

      // JWT部分を抽出（プレフィックス部分を除いた残り）
      const jwtToken = parts.slice(1).join('.');

      // JWT検証
      const decoded = jwt.verify(jwtToken, this.secret, {
        algorithms: ['HS256'],
        issuer: this.issuer,
        audience: this.audience
      }) as JwtPayload;

      return {
        success: true,
        data: decoded
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          success: false,
          error: {
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'Token has expired',
            originalError: error
          }
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid token',
            originalError: error
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'Token verification failed',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * JWTトークンをデコード（検証なし）
   * 
   * @param token - デコードするトークン
   * @returns デコードされたペイロード（検証なし）
   */
  decode(token: string): JwtPayload | null {
    try {
      // トークンからJWT部分を抽出
      const parts = token.split('.');
      if (parts.length < 4) {
        return null;
      }

      const jwtToken = parts.slice(1).join('.');

      // 検証なしでデコード
      const decoded = jwt.decode(jwtToken) as JwtPayload | null;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}
