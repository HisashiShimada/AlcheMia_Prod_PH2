import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../src/routes/authRoutes';

describe('Authentication Routes Integration', () => {
  let app: Application;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Mount auth routes
    app.use('/api/v1/auth', authRoutes);
  });

  describe('Route Mounting', () => {
    it('should mount all 6 authentication endpoints', async () => {
      // Test that each endpoint exists (will get 404 or other status, not "Cannot GET/POST")
      const endpoints = [
        { method: 'post', path: '/api/v1/auth/login' },
        { method: 'post', path: '/api/v1/auth/verify-pin' },
        { method: 'post', path: '/api/v1/auth/resend-pin' },
        { method: 'post', path: '/api/v1/auth/logout' },
        { method: 'post', path: '/api/v1/auth/reset-password-request' },
        { method: 'post', path: '/api/v1/auth/reset-password' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        // Route exists if we don't get 404
        expect(response.status).not.toBe(404);
      }
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).post('/api/v1/auth/non-existent');
      expect(response.status).toBe(404);
    });
  });

  describe('Middleware Application', () => {
    it('should accept JSON request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test', password: 'test123' })
        .set('Content-Type', 'application/json');
      
      // Should not return 415 Unsupported Media Type
      expect(response.status).not.toBe(415);
    });

    it('should require X-Organization-Id header for login endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'testpass123' });
      
      // Should fail validation without org header
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should require Authorization header for logout endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({});
      
      // Should fail authentication without token
      expect(response.status).toBe(401);
    });

    it('should validate request body format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ invalid: 'data' })
        .set('X-Organization-Id', '123e4567-e89b-12d3-a456-426614174000');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000');
      
      // Should have CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should allow credentials in CORS', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Error Response Format', () => {
    it('should return standardized error format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: '', password: '' })
        .set('X-Organization-Id', '123e4567-e89b-12d3-a456-426614174000');
      
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: expect.any(String),
          message: expect.any(String),
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: expect.any(String),
        }),
      });
    });
  });

  describe('Endpoint Availability', () => {
    it('should have login endpoint available', async () => {
      const response = await request(app).post('/api/v1/auth/login');
      expect(response.status).not.toBe(404);
    });

    it('should have verify-pin endpoint available', async () => {
      const response = await request(app).post('/api/v1/auth/verify-pin');
      expect(response.status).not.toBe(404);
    });

    it('should have resend-pin endpoint available', async () => {
      const response = await request(app).post('/api/v1/auth/resend-pin');
      expect(response.status).not.toBe(404);
    });

    it('should have logout endpoint available', async () => {
      const response = await request(app).post('/api/v1/auth/logout');
      expect(response.status).not.toBe(404);
    });

    it('should have reset-password-request endpoint available', async () => {
      const response = await request(app).post('/api/v1/auth/reset-password-request');
      expect(response.status).not.toBe(404);
    });

    it('should have reset-password endpoint available', async () => {
      const response = await request(app).post('/api/v1/auth/reset-password');
      expect(response.status).not.toBe(404);
    });
  });
});
