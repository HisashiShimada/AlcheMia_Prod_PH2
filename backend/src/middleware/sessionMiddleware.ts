import session from 'express-session';

/**
 * express-sessionミドルウェアのセットアップ
 * デフォルトのMemoryStoreを使用
 */
export function setupSessionMiddleware() {
  const sessionSecret = process.env.SESSION_SECRET || 'maiml-session-secret-change-in-production';

  return session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみ
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      sameSite: 'strict',
    },
    // storeオプション省略 = デフォルトのMemoryStore使用
  });
}
