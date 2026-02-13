/**
 * 問題一覧取得ルートテスト (Task 1.1)
 * 
 * @description GET /api/v1/issues の新仕様テスト
 * - 必須パラメータのバリデーション
 * - handleValidationErrors middleware
 * 
 * Requirements: 3, 4
 */

import request from 'supertest';
import express from 'express';
import issueRoutes from '../../src/routes/issueRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';

// Mock middlewares
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/middleware/tenantIsolation');

// Mock controller
jest.mock('../../src/controllers/issueController', () => ({
  create: jest.fn((_req, res) => res.status(201).json({ success: true })),
  addComment: jest.fn((_req, res) => res.status(201).json({ success: true })),
  list: jest.fn((_req, res) => res.status(200).json({ success: true, data: [] })),
  getById: jest.fn((_req, res) => res.status(200).json({ success: true })),
  updateStatus: jest.fn((_req, res) => res.status(200).json({ success: true })),
}));

describe('GET /api/v1/issues - Task 1.1: Route Definition', () => {
  let app: express.Application;

  beforeEach(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/issues', issueRoutes);

    // Setup mock middlewares to pass through
    (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = { userId: 'user-123', role: 'worker' };
      req.organizationId = 'org-123';
      next();
    });

    (tenantIsolation as jest.Mock).mockImplementation((req, _res, next) => {
      req.organizationId = 'org-123';
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Required Parameters Validation (Requirement 3)', () => {
    test('should return 400 when project_id is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          method_id: 'method_001',
          task_no: 1,
          transition_id: 'trans_001'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should return 400 when method_id is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          task_no: 1,
          transition_id: 'trans_001'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 when task_no is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method_001',
          transition_id: 'trans_001'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 when transition_id is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method_001',
          task_no: 1
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 when project_id is not UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: 'invalid-uuid',
          method_id: 'method_001',
          task_no: 1,
          transition_id: 'trans_001'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 when method_id is empty string', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: '',
          task_no: 1,
          transition_id: 'trans_001'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 when task_no is not a positive integer', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method_001',
          task_no: 0,
          transition_id: 'trans_001'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 when transition_id is empty string', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method_001',
          task_no: 1,
          transition_id: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Middleware Chain (Requirement 4)', () => {
    test('should apply authMiddleware', async () => {
      await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method_001',
          task_no: 1,
          transition_id: 'trans_001'
        });

      expect(authMiddleware).toHaveBeenCalled();
    });

    test('should apply tenantIsolation middleware', async () => {
      await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method_001',
          task_no: 1,
          transition_id: 'trans_001'
        });

      expect(tenantIsolation).toHaveBeenCalled();
    });
  });

  describe('Success Response', () => {
    test('should return 200 with valid required parameters', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method_001',
          task_no: 1,
          transition_id: 'trans_001'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should accept optional status parameter', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method_001',
          task_no: 1,
          transition_id: 'trans_001',
          status: 'unresolved'
        });

      expect(response.status).toBe(200);
    });

    test('should accept optional issue_type parameter', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method_001',
          task_no: 1,
          transition_id: 'trans_001',
          issue_type: 'material_shortage'
        });

      expect(response.status).toBe(200);
    });
  });
});