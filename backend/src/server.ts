import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables FIRST (before any other imports that might use them)
dotenv.config();

// Import middleware
import { setupSessionMiddleware } from './middleware/sessionMiddleware';
import { RedisConnectionService } from './services/redisConnectionService';
import { TokenBlacklistService } from './services/tokenBlacklistService';

// Import routes after dotenv is configured
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import fileAccessRoutes from './routes/fileAccessRoutes';
import maimlRoutes from './routes/maimlRoutes';
import masterRoutes from './routes/masterRoutes';
import experimentRoutes from './routes/experimentRoutes';
import issueRoutes from './routes/issueRoutes';
import departmentRoutes from './routes/departmentRoutes';
import corporationRoutes from './routes/corporationRoutes';
import roleRoutes from './routes/roleRoutes';
import userRoutes from './routes/userRoutes';
import sessionRoutes from './routes/sessionRoutes';
import progressRoutes from './routes/progressRoutes';
import organizationRoutes from './routes/organizationRoutes';
import formatRoutes from './routes/formatRoutes';
import codeMasterRoutes from './routes/codeMasterRoutes';
import semanticSearchRoutes from './routes/semanticSearchRoutes';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// CORS設定
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://your-production-domain.com'
    : 'http://localhost:3000', // 開発環境用
  credentials: true, // Cookie送信を許可
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
  exposedHeaders: ['Set-Cookie', 'Content-Disposition'], // Content-Dispositionを追加
  maxAge: 86400, // プリフライトリクエストのキャッシュ時間（24時間）
};

app.use(cors(corsOptions));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Cookie解析ミドルウェア

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'MMDPF Backend API',
    version: '1.0.0',
    status: 'running',
  });
});

// Session middleware and routes will be set up after Redis initialization in startServer()
// Start server
async function startServer() {
  try {
    // Redis初期化（リフレッシュトークン管理用）
    // 開発環境ではRedis未起動でもサーバーを起動可能
    await RedisConnectionService.initialize();
    
    // Setup session middleware after Redis initialization
    app.use(setupSessionMiddleware());
    
    // Mount routes after session middleware
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/projects', projectRoutes);
    app.use('/api/v1/files', fileAccessRoutes); // 汎用ファイルアクセスAPI（共通化後）
    app.use('/api/v1/maiml', maimlRoutes);
    
    // Mount experiment routes
    app.use('/api/v1/experiments', experimentRoutes);

    // Mount systemManagement routes
    app.use('/api/v1/systemManagement', departmentRoutes);
    app.use('/api/v1/systemManagement', roleRoutes);
    app.use('/api/v1/systemManagement', userRoutes);
    
    // Mount session management routes
    app.use('/api/v1/sessions', sessionRoutes);
    
    // Mount provider routes
    app.use('/api/v1/provider', corporationRoutes);
    app.use('/api/v1/provider', organizationRoutes);
    
    // Mount master routes
    app.use('/api/v1/master', masterRoutes);

	// Mount issue routes
	app.use('/api/v1/issues', issueRoutes);

    // Mount progress routes
    app.use('/api/v1/progress', progressRoutes);

    // Mount format routes
    app.use('/api/v1/formats', formatRoutes);
    
    // Mount code master routes
    app.use('/api/v1/code-master', codeMasterRoutes);

    // Mount semantic search routes
    app.use('/api/v1/semantic-search', semanticSearchRoutes);

    if (process.env.NODE_ENV !== 'test') {
      const server = app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      });

      // タイムアウト設定（大量ファイルの署名付きURL生成に対応）
      server.timeout = 180000; // 3分（180秒）
      server.headersTimeout = 240000; // 4分（240秒）
      server.keepAliveTimeout = 65000; // 65秒

      console.log('Server timeout settings:');
      console.log(`  - Request timeout: ${server.timeout}ms (${server.timeout / 1000}s)`);
      console.log(`  - Headers timeout: ${server.headersTimeout}ms (${server.headersTimeout / 1000}s)`);
      console.log(`  - Keep-Alive timeout: ${server.keepAliveTimeout}ms (${server.keepAliveTimeout / 1000}s)`);

      // ブラックリストクリーンアップジョブの起動
      const cleanupInterval = parseInt(
        process.env.TOKEN_BLACKLIST_CLEANUP_INTERVAL || '1800',
        10
      ) * 1000; // ミリ秒に変換

      console.log(`🧹 Token blacklist cleanup job started (interval: ${cleanupInterval / 1000}s)`);

      setInterval(async () => {
        try {
          const blacklistService = new TokenBlacklistService();
          const result = await blacklistService.cleanup();
          
          if (result.success && result.data > 0) {
            console.log(`[INFO] Blacklist cleanup: ${result.data} tokens removed`);
          }
        } catch (error) {
          console.error('[ERROR] Blacklist cleanup job failed:', error);
        }
      }, cleanupInterval);

      // グレースフルシャットダウン
      const gracefulShutdown = async (signal: string) => {
        console.log(`\n${signal} signal received: closing HTTP server`);
        server.close(async () => {
          console.log('HTTP server closed');
          
          // Redis接続のクローズ
          await RedisConnectionService.disconnect();
          
          console.log('Graceful shutdown complete');
          process.exit(0);
        });

        // 強制終了タイマー（30秒）
        setTimeout(() => {
          console.error('Forced shutdown after timeout');
          process.exit(1);
        }, 30000);
      };

      // シグナルハンドラー登録
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// サーバー起動
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
