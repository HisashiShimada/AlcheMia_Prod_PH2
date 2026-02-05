import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables FIRST (before any other imports that might use them)
dotenv.config();

// Import middleware
import { setupSessionMiddleware } from './middleware/sessionMiddleware';

// Import routes after dotenv is configured
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';
import fileDownloadRoutes from './routes/fileDownloadRoutes';
import masterRoutes from './routes/masterRoutes';
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

// Session middleware
app.use(setupSessionMiddleware());

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes); // Task 3.3: タスク一覧取得API
app.use('/api/v1/projects', fileDownloadRoutes);

// Mount systemManagement routes
app.use('/api/v1/systemManagement', departmentRoutes);
app.use('/api/v1/systemManagement', roleRoutes);

// Mount provider routes
app.use('/api/v1/provider', corporationRoutes);

// Mount master routes
app.use('/api/v1/master', masterRoutes);

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
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
