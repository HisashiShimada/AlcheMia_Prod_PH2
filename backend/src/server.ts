import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables FIRST (before any other imports that might use them)
dotenv.config();

// Import middleware
import { setupSessionMiddleware } from './middleware/sessionMiddleware';
import { RedisConnectionService } from './services/redisConnectionService';

// Import routes after dotenv is configured
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';
import fileDownloadRoutes from './routes/fileDownloadRoutes';
import maimlRoutes from './routes/maimlRoutes';
import masterRoutes from './routes/masterRoutes';
import experimentRoutes from './routes/experimentRoutes';
import issueRoutes from './routes/issueRoutes';
import departmentRoutes from './routes/departmentRoutes';
import corporationRoutes from './routes/corporationRoutes';
import roleRoutes from './routes/roleRoutes';

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
    app.use('/api/v1/tasks', taskRoutes);
    app.use('/api/v1/projects', fileDownloadRoutes);
    app.use('/api/v1/maiml', maimlRoutes);
    
	// Mount experiment routes
	app.use('/api/v1/experiments', experimentRoutes);

    // Mount systemManagement routes
    app.use('/api/v1/systemManagement', departmentRoutes);
    app.use('/api/v1/systemManagement', roleRoutes);
    
    // Mount provider routes
    app.use('/api/v1/provider', corporationRoutes);
    
    // Mount master routes
    app.use('/api/v1/master', masterRoutes);

	// Mount issue routes
	app.use('/api/v1/issues', issueRoutes);

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
