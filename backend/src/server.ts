import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables FIRST (before any other imports that might use them)
// override: true により OS 環境変数より .env の値を優先させる
dotenv.config({ override: true });

// Import middleware
import { setupSessionMiddleware } from './middleware/sessionMiddleware';
import { errorHandler } from './middleware/errorHandlerMiddleware';
import { RedisConnectionService } from './services/redisConnectionService';
import { TokenBlacklistService } from './services/tokenBlacklistService';
import { startMaimlPublishWorker,   stopMaimlPublishWorker   } from './workers/maimlPublishWorker';
import { startMaimlUnpublishWorker, stopMaimlUnpublishWorker } from './workers/maimlUnpublishWorker';
import { startMaimlScannerWorker,   stopMaimlScannerWorker   } from './workers/maimlScannerWorker';
import { getStorageService } from './services/storageService';

// Import routes after dotenv is configured
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import fileAccessRoutes from './routes/fileAccessRoutes';
import experimentInstructionRoutes from './routes/experimentInstructionRoutes';
import maimlRoutes from './routes/maimlRoutes';
import masterRoutes from './routes/masterRoutes';
import experimentRoutes from './routes/experimentRoutes';
import issueRoutes from './routes/issueRoutes';
import corporationRoutes from './routes/corporationRoutes';
import roleRoutes from './routes/roleRoutes';
import userRoutes from './routes/userRoutes';
import sessionRoutes from './routes/sessionRoutes';
import progressRoutes from './routes/progressRoutes';
import organizationRoutes from './routes/organizationRoutes';
import formatRoutes from './routes/formatRoutes';
import codeMasterRoutes from './routes/codeMasterRoutes';
import semanticSearchRoutes from './routes/semanticSearchRoutes';
import systemOverviewRoutes from './routes/systemOverviewRoutes';
import systemConfigRoutes from './routes/systemConfigRoutes';
import encryptionRoutes from './routes/encryptionRoutes';
import namespaceRoutes from './routes/namespaceRoutes';
import departmentUnitRoutes from './routes/departmentUnitRoutes';
import organizationGroupRoutes from './routes/organizationGroupRoutes';

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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

    // Swift/S3 バケット/コンテナの存在確認・自動作成
    // Swift 使用時に mmdpf-files コンテナが未作成でも自動で作成する
    if (process.env.STORAGE_TYPE === 'swift' || process.env.USE_S3_COMPATIBLE_API === 'true') {
      try {
        const storageService = getStorageService();
        await storageService.ensureBucketExists();
      } catch (storageErr) {
        console.warn('⚠️  Storage bucket check skipped:', (storageErr as Error).message);
      }
    }
    
    // Setup session middleware after Redis initialization
    app.use(setupSessionMiddleware());
    
    // Mount routes after session middleware
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/projects', projectRoutes);
    app.use('/api/v1/projects', experimentInstructionRoutes); // 実験指示API・実験計画API
    app.use('/api/v1/files', fileAccessRoutes); // 汎用ファイルアクセスAPI（共通化後）
    app.use('/api/v1/maiml', maimlRoutes);
    
    // Mount experiment routes
    app.use('/api/v1/experiments', experimentRoutes);

    // Mount systemManagement routes
    app.use('/api/v1/systemManagement', roleRoutes);
    app.use('/api/v1/systemManagement', userRoutes);
    
    // Mount session management routes
    app.use('/api/v1/sessions', sessionRoutes);
    
    // Mount provider routes
    app.use('/api/v1/provider', corporationRoutes);
    app.use('/api/v1/provider', organizationRoutes);
    app.use('/api/v1/provider', systemConfigRoutes);
    
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
    // Mount system overview routes
    app.use('/api/v1/systemManagement', systemOverviewRoutes);

    // Mount encryption routes（暗号化管理API）
    app.use('/api/v1/encryption', encryptionRoutes);
    // Mount namespace routes
    app.use('/api/v1/namespaces', namespaceRoutes);

    // Mount department unit routes
    app.use('/api/v1/department-units', departmentUnitRoutes);

    // Mount organization group routes
    app.use('/api/v1/organization-groups', organizationGroupRoutes);

    // エラーハンドリングミドルウェア（全ルートの後に登録する必要がある）
    app.use(errorHandler);

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

      // MaiML 公開/非公開/Scanner Worker の起動（bullmq 非同期処理）
      // Redis 未起動時はエラーをキャッチして続行（開発環境向けフォールバック）
      try {
        startMaimlPublishWorker();
        startMaimlUnpublishWorker();
        await startMaimlScannerWorker();
        console.log('✅ MaiML Publish/Unpublish/Scanner Workers started');
      } catch (workerErr) {
        console.warn('⚠️  MaiML Worker 起動スキップ（Redis 未接続の可能性）:', (workerErr as Error).message);
      }

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
          
          // MaiML Worker の停止
          await Promise.all([
            stopMaimlPublishWorker()
              .catch((err) => console.warn('PublishWorker 停止エラー:', (err as Error).message)),
            stopMaimlUnpublishWorker()
              .catch((err) => console.warn('UnpublishWorker 停止エラー:', (err as Error).message)),
            stopMaimlScannerWorker()
              .catch((err) => console.warn('ScannerWorker 停止エラー:', (err as Error).message)),
          ]);

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
