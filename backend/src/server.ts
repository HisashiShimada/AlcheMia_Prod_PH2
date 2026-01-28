import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables FIRST (before any other imports that might use them)
dotenv.config();

// Import routes after dotenv is configured
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import fileDownloadRoutes from './routes/fileDownloadRoutes';
import maimlRoutes from './routes/maimlRoutes';

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
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // プリフライトリクエストのキャッシュ時間（24時間）
};

app.use(cors(corsOptions));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/projects', fileDownloadRoutes);
app.use('/api/v1/maiml', maimlRoutes);

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

// Start server
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // タイムアウト設定（大量ファイルの署名付きURL生成に対応）
  server.timeout = 180000; // 3分（180秒）
  server.headersTimeout = 240000; // 4分（240秒）
  server.keepAliveTimeout = 65000; // 65秒

  console.log('Server timeout settings:');
  console.log(`  - Request timeout: ${server.timeout}ms (${server.timeout / 1000}s)`);
  console.log(`  - Headers timeout: ${server.headersTimeout}ms (${server.headersTimeout / 1000}s)`);
  console.log(`  - Keep-Alive timeout: ${server.keepAliveTimeout}ms (${server.keepAliveTimeout / 1000}s)`);
}

export default app;
