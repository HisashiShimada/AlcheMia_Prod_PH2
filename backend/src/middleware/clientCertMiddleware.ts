/**
 * クライアント証明書認証ミドルウェア
 * Nginxから渡されるクライアント証明書情報を検証し、organizationIdを設定
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Expressリクエストオブジェクトの拡張
 */
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      clientCert?: {
        dn: string;
        cn: string;
        verified: string;
      };
    }
  }
}

/**
 * クライアント証明書検証ミドルウェア
 * 
 * Nginxから以下のヘッダーを受け取る:
 * - X-Client-Cert-DN: 証明書のSubject DN
 * - X-Client-Cert-CN: 証明書のCN（Common Name）
 * - X-Client-Cert-Verify: 証明書の検証結果（SUCCESS/FAILED/NONE）
 * - X-Organization-Id: NginxがCNから抽出した組織ID
 * 
 * @param req - Expressリクエストオブジェクト
 * @param res - Expressレスポンスオブジェクト
 * @param next - 次のミドルウェア関数
 */
export const clientCertMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Nginxから渡される証明書情報
    const certDN = req.headers['x-client-cert-dn'] as string | undefined;
    const certCN = req.headers['x-client-cert-cn'] as string | undefined;
    const certVerify = req.headers['x-client-cert-verify'] as string | undefined;
    const organizationId = req.headers['x-organization-id'] as string | undefined;

    // 開発環境の判定
    const isDevelopment = process.env.NODE_ENV === 'development';

    // 開発環境でクライアント証明書が存在しない場合はスキップ
    if (isDevelopment && !certVerify) {
      console.warn('[ClientCert] 開発環境: クライアント証明書検証をスキップ');
      return next();
    }

    // 証明書検証結果の確認
    if (certVerify !== 'SUCCESS') {
      console.error('[ClientCert] 証明書検証失敗:', {
        verify: certVerify,
        cn: certCN,
        dn: certDN
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'CERT_VERIFICATION_FAILED',
          message: 'Client certificate verification failed',
          details: {
            verify: certVerify
          }
        }
      });
      return;
    }

    // 組織IDの検証
    if (!organizationId || organizationId.trim() === '') {
      console.error('[ClientCert] 組織IDが取得できません:', {
        cn: certCN,
        dn: certDN,
        organizationId
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_ORGANIZATION_ID',
          message: 'Failed to extract organization ID from certificate',
          details: {
            cn: certCN,
            hint: 'Certificate CN must be in format: {uuid}'
          }
        }
      });
      return;
    }

    // UUID形式の検証（簡易チェック）
    const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (!uuidPattern.test(organizationId)) {
      console.error('[ClientCert] 無効な組織ID形式:', {
        organizationId,
        cn: certCN
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_ORGANIZATION_ID_FORMAT',
          message: 'Organization ID must be a valid UUID',
          details: {
            organizationId,
            expectedFormat: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
          }
        }
      });
      return;
    }

    // リクエストオブジェクトに証明書情報とorganizationIdを設定
    req.clientCert = {
      dn: certDN || '',
      cn: certCN || '',
      verified: certVerify
    };
    req.organizationId = organizationId;

    // ログ出力（セキュリティ監査用）
    console.info('[ClientCert] 証明書検証成功:', {
      organizationId,
      cn: certCN,
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    next();
  } catch (error) {
    console.error('[ClientCert] ミドルウェアエラー:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CERT_MIDDLEWARE_ERROR',
        message: 'An error occurred during certificate validation'
      }
    });
    return;
  }
};

/**
 * 開発環境専用: クライアント証明書なしでアクセスを許可するミドルウェア
 * 
 * 本番環境では使用しないこと
 * 
 * @param req - Expressリクエストオブジェクト
 * @param res - Expressレスポンスオブジェクト
 * @param next - 次のミドルウェア関数
 */
export const skipClientCertInDev = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    console.warn('[ClientCert] ⚠️  開発環境: クライアント証明書検証を完全にスキップ');
    
    // 開発環境用のデフォルトorganizationIdを設定
    // X-Organization-Idヘッダーが存在しない場合のみ設定
    if (!req.headers['x-organization-id']) {
      const defaultOrgId = 'c9621ed6-5def-4970-8e7f-fbe97c98e3ed';
      req.headers['x-organization-id'] = defaultOrgId;
      console.warn(`[ClientCert] 開発環境: デフォルトorganizationIdを設定 (${defaultOrgId})`);
    }
    
    return next();
  }

  // 本番環境では必ず証明書検証を実行
  clientCertMiddleware(req, res, next);
};
