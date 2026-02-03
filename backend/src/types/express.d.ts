import { JwtPayload } from './auth';
import 'express';
import 'express-session';
import { Session, SessionData } from 'express-session';

/**
 * express-sessionの型定義を拡張
 * req.sessionに保存するカスタムデータの型を定義
 */
declare module 'express-session' {
  interface SessionData {
    /** 部門CD（NULL許容） */
    departmentCd?: string | null;
    
    // 将来の拡張用（任意のデータを保存可能）
    [key: string]: any;
  }
  
  interface Session {
    /** 部門CD（NULL許容） */
    departmentCd?: string | null;
  }
}

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
      organizationId?: string;
    }
  }
}

export {};
