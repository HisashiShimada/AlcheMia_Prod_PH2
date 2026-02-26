/**
 * JWTサービス
 * 
 * @description JWTトークンの生成・検証・デコードを提供
 * - アクセストークン（15分 or 1時間）
 * - リフレッシュトークン（30分 or 8時間）
 * - Redis接続状態に応じて有効期限を自動切り替え
 * Requirements: 2.2, 4.1
 */

import jwt from 'jsonwebtoken';
import type { 
  JwtPayload, 
  RefreshTokenPayload,
  TokenPair,
  Result, 
  ServiceError 
} from '../types/auth';

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
   * Redis起動状態に応じてアクセストークンの有効期限を取得
   * 
   * @returns 有効期限（秒）
   */
  private getAccessTokenExpiresIn(): number {
    // 本番環境ではRedis必須
    return parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '900');
  }

  /**
   * Redis起動状態に応じてリフレッシュトークンの有効期限を取得
   * 
   * @returns 有効期限（秒）
   */
  private getRefreshTokenExpiresIn(): number {
    // 本番環境ではRedis必須
    return parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '1800');
  }

  /**
   * リフレッシュトークンCookie用のmaxAgeを取得（ミリ秒単位）
   * 
   * @returns 有効期限（ミリ秒）
   */
  public getRefreshTokenMaxAge(): number {
    return this.getRefreshTokenExpiresIn() * 1000;
  }

  /**
   * アクセストークンを生成
   * 
   * @param payload - JWTペイロード（iat, expを除く）
   * @returns maiml_session-{tokenId}_{timestamp} 形式のトークン
   */
  async generateAccessToken(
    payload: Omit<JwtPayload, 'iat' | 'exp'>
  ): Promise<Result<string, ServiceError>> {
    try {
      // 現在時刻
      const now = Math.floor(Date.now() / 1000);
      
      // 有効期限を取得（Redis接続状態に応じて自動切り替え）
      const expiresIn = this.getAccessTokenExpiresIn();
      
      // 完全なペイロードを構築
      const fullPayload: JwtPayload = {
        ...payload,
        iat: now,
        exp: now + expiresIn
      };

      // HS256署名でJWT生成
      const jwtToken = jwt.sign(fullPayload, this.secret, {
        algorithm: 'HS256',
        issuer: this.issuer,
        audience: this.audience
      });

      // トークン形式: maiml_session-{tokenId}_{timestamp}.{jwt}
      const sessionToken = `maiml_session-${payload.tokenId}_${now}.${jwtToken}`;

      return {
        success: true,
        data: sessionToken
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_JWT_GENERATION_FAILED',
          message: 'Access token generation failed',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * リフレッシュトークンを生成
   * 
   * @param userId - ユーザーID
   * @param organizationId - 組織ID
   * @param tokenId - トークンID（アクセストークンと共通）
   * @returns maiml_refresh-{tokenId}_{timestamp} 形式のトークン
   */
  async generateRefreshToken(
    userId: string,
    organizationId: string,
    tokenId: string
  ): Promise<Result<string, ServiceError>> {
    try {
      // 現在時刻
      const now = Math.floor(Date.now() / 1000);
      
      // 有効期限を取得（Redis接続状態に応じて自動切り替え）
      const expiresIn = this.getRefreshTokenExpiresIn();
      
      // リフレッシュトークンペイロードを構築
      const payload: RefreshTokenPayload = {
        userId,
        organizationId,
        sessionId: tokenId,  // sessionIdとtokenIdを同じ値に
        tokenId,
        iat: now,
        exp: now + expiresIn
      };

      // HS256署名でJWT生成
      const jwtToken = jwt.sign(payload, this.secret, {
        algorithm: 'HS256',
        issuer: this.issuer,
        audience: this.audience
      });

      // トークン形式: maiml_refresh-{tokenId}_{timestamp}.{jwt}
      const refreshToken = `maiml_refresh-${tokenId}_${now}.${jwtToken}`;

      return {
        success: true,
        data: refreshToken
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_JWT_GENERATION_FAILED',
          message: 'Refresh token generation failed',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * トークンペアを生成（アクセストークン + リフレッシュトークン）
   * 
   * @param payload - JWTペイロード（アクセストークン用）
   * @returns トークンペア
   */
  async generateTokenPair(
    payload: Omit<JwtPayload, 'iat' | 'exp'>
  ): Promise<Result<TokenPair, ServiceError>> {
    try {
      // アクセストークン生成
      const accessTokenResult = await this.generateAccessToken(payload);
      if (!accessTokenResult.success) {
        return {
          success: false,
          error: accessTokenResult.error
        };
      }

      // リフレッシュトークン生成（tokenIdを使用）
      const refreshTokenResult = await this.generateRefreshToken(
        payload.userId,
        payload.organizationId,
        payload.tokenId
      );
      if (!refreshTokenResult.success) {
        return {
          success: false,
          error: refreshTokenResult.error
        };
      }

      return {
        success: true,
        data: {
          accessToken: accessTokenResult.data,
          refreshToken: refreshTokenResult.data
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_JWT_GENERATION_FAILED',
          message: 'Token pair generation failed',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * JWTトークンを生成（後方互換性のため残す）
   * 
   * @deprecated generateTokenPair() または generateAccessToken() を使用してください
   * @param payload - JWTペイロード（iat, expを除く）
   * @returns maiml_session-{sessionId}_{timestamp} 形式のトークン
   */
  async generate(
    payload: Omit<JwtPayload, 'iat' | 'exp'>
  ): Promise<Result<string, ServiceError>> {
    // アクセストークンを生成して返す
    return this.generateAccessToken(payload);
  }

  /**
   * アクセストークンを検証
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
   * リフレッシュトークンを検証
   * 
   * @param token - 検証するリフレッシュトークン
   * @returns 検証されたリフレッシュトークンペイロード
   */
  async verifyRefreshToken(token: string): Promise<Result<RefreshTokenPayload, ServiceError>> {
    try {
      // トークンからJWT部分を抽出
      const parts = token.split('.');
      
      if (parts.length < 4) {
        // maiml_refresh-{tokenId}_{timestamp}.{jwt}の形式でない
        return {
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid refresh token format'
          }
        };
      }

      // JWT部分を抽出
      const jwtToken = parts.slice(1).join('.');

      // JWT検証
      const decoded = jwt.verify(jwtToken, this.secret, {
        algorithms: ['HS256'],
        issuer: this.issuer,
        audience: this.audience
      }) as RefreshTokenPayload;

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
            message: 'Refresh token has expired',
            originalError: error
          }
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid refresh token',
            originalError: error
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'Refresh token verification failed',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * アクセストークンの有効期限を取得（秒単位）
   * 外部から有効期限を参照する場合に使用
   * 
   * @returns 有効期限（秒）
   */
  public getAccessTokenExpiresInSeconds(): number {
    return this.getAccessTokenExpiresIn();
  }

  /**
   * リフレッシュトークンの有効期限を取得（秒単位）
   * 外部から有効期限を参照する場合に使用
   * 
   * @returns 有効期限（秒）
   */
  public getRefreshTokenExpiresInSeconds(): number {
    return this.getRefreshTokenExpiresIn();
  }

  /**
   * JWTトークンをデコード（検証なし）
   * 
   * @param token - デコードするトークン
   * @returns デコードされたペイロード（検証なし）
   */
  decode(token: string): JwtPayload | RefreshTokenPayload | null {
    try {
      // トークンからJWT部分を抽出
      const parts = token.split('.');
      if (parts.length < 4) {
        return null;
      }

      const jwtToken = parts.slice(1).join('.');

      // 検証なしでデコード
      const decoded = jwt.decode(jwtToken) as JwtPayload | RefreshTokenPayload | null;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}
