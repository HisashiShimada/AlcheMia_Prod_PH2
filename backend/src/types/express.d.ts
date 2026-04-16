import { JwtPayload } from './auth';
import 'express';
import 'express-session';
import { Session, SessionData } from 'express-session';

/**
 * Expressの型定義を拡張
 * req.sessionの型を明示的に指定
 */
declare module 'express' {
  interface Request {
    session: Session & Partial<SessionData>;
  }
}

/**
 * Express型定義の拡張
 * 
 * @description Request型にuser、organizationIdプロパティを追加
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
