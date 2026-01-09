import express, { Application } from 'express';
import dotenv from 'dotenv';

// Load environment variables FIRST (before any other imports that might use them)
dotenv.config();

// Import routes after dotenv is configured
import authRoutes from './routes/authRoutes';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount authentication routes
app.use('/api/v1/auth', authRoutes);

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
