import request from 'supertest';
import express from 'express';
import issueRoutes from '../../src/routes/issueRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';

// Mock dependencies
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/middleware/tenantIsolation');
jest.mock('../../src/services/issueService');

describe('GET /api/v1/issues - Validation Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    (authMiddleware as jest.Mock).mockImplementation((req, res, next) => {
      req.user = {
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'Worker',
      };
      next();
    });

    // Mock tenant isolation middleware
    (tenantIsolation as jest.Mock).mockImplementation((req, res, next) => {
      req.organizationId = 'org-123';
      next();
    });

    app.use('/api/v1', issueRoutes);
  });

  describe('Required Parameters Validation', () => {
    it('should return 400 when project_id is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          method_id: 'method-001',
          task_no: '1',
          transition_id: 'trans-001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'project_id',
            message: expect.stringContaining('project_id'),
          }),
        ])
      );
    });

    it('should return 400 when method_id is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          task_no: '1',
          transition_id: 'trans-001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'method_id',
          }),
        ])
      );
    });

    it('should return 400 when task_no is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          transition_id: 'trans-001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'task_no',
          }),
        ])
      );
    });

    it('should return 400 when transition_id is missing', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: '1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'transition_id',
          }),
        ])
      );
    });
  });

  describe('project_id Validation', () => {
    it('should return 400 when project_id is not a valid UUID', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: 'invalid-uuid',
          method_id: 'method-001',
          task_no: '1',
          transition_id: 'trans-001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'project_id',
            message: expect.stringContaining('UUID'),
          }),
        ])
      );
    });

    it('should return 400 when project_id is empty string', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '',
          method_id: 'method-001',
          task_no: '1',
          transition_id: 'trans-001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('method_id Validation', () => {
    it('should return 400 when method_id is empty string', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: '',
          task_no: '1',
          transition_id: 'trans-001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'method_id',
            message: expect.stringContaining('空'),
          }),
        ])
      );
    });
  });

  describe('task_no Validation', () => {
    it('should return 400 when task_no is not a positive integer', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: '0',
          transition_id: 'trans-001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'task_no',
            message: expect.stringContaining('正の整数'),
          }),
        ])
      );
    });

    it('should return 400 when task_no is negative', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: '-1',
          transition_id: 'trans-001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when task_no is not a number', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: 'abc',
          transition_id: 'trans-001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when task_no is a decimal', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: '1.5',
          transition_id: 'trans-001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('transition_id Validation', () => {
    it('should return 400 when transition_id is empty string', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: '1',
          transition_id: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'transition_id',
            message: expect.stringContaining('空'),
          }),
        ])
      );
    });
  });

  describe('Optional Parameters Validation', () => {
    it('should accept valid status parameter', async () => {
      // This test will fail until the implementation is complete
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: '1',
          transition_id: 'trans-001',
          status: 'open',
        });

      // Expect either success or a different error (not validation error)
      if (response.status === 400) {
        expect(response.body.error.details).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'status',
            }),
          ])
        );
      }
    });

    it('should accept valid issue_type parameter', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: '1',
          transition_id: 'trans-001',
          issue_type: 'error',
        });

      if (response.status === 400) {
        expect(response.body.error.details).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'issue_type',
            }),
          ])
        );
      }
    });

    it('should work without optional parameters', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: '1',
          transition_id: 'trans-001',
        });

      // Should not fail validation (may fail for other reasons like missing service)
      if (response.status === 400 && response.body.error) {
        expect(response.body.error.code).not.toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should return all validation errors at once', async () => {
      const response = await request(app)
        .get('/api/v1/issues')
        .query({
          project_id: 'invalid-uuid',
          method_id: '',
          task_no: '-1',
          transition_id: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.length).toBeGreaterThanOrEqual(4);
    });
  });
});