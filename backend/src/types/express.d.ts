/**
 * Express型定義の拡張
 * 
 * @description Request型にuser、organizationIdプロパティを追加
 */

import { JwtPayload } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      organizationId?: string;
    }
  }
}

export {};