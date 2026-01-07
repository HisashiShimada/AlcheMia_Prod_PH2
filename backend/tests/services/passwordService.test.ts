/**
 * passwordService のユニットテスト
 * 
 * TDD GREEN Phase: 実装に対するテスト
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PasswordService } from '../../src/services/passwordService';
import bcrypt from 'bcrypt';

describe('passwordService', () => {
  let mockPool: any;
  let passwordService: PasswordService;

  beforeEach(() => {
    // データベースモック作成
    mockPool = {
      query: jest.fn(),
    };
    
    passwordService = new PasswordService(mockPool);
  });

  describe('hash', () => {
    it('should hash password with 14 rounds for provider role', async () => {
      const result = await passwordService.hash('testPassword123', 'provider');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt format
        // bcrypt hash should start with $2a$14$ or $2b$14$ for 14 rounds
        expect(result.data.startsWith('$2a$14$') || result.data.startsWith('$2b$14$')).toBe(true);
      }
    });

    it('should hash password with 14 rounds for system_admin role', async () => {
      const result = await passwordService.hash('adminPass123', 'system_admin');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startsWith('$2a$14$') || result.data.startsWith('$2b$14$')).toBe(true);
      }
    });

    it('should hash password with 12 rounds for experiment_worker role', async () => {
      const result = await passwordService.hash('workerPass123', 'experiment_worker');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startsWith('$2a$12$') || result.data.startsWith('$2b$12$')).toBe(true);
      }
    });

    it('should return bcrypt hash format', async () => {
      const result = await passwordService.hash('testPassword123', 'data_admin');
      
      expect(result.success).toBe(true);
      if (result.success) {
        // bcrypt hash format: $2a$rounds$salt(22chars)hash(31chars)
        expect(result.data).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
      }
    });

    it('should return error for empty password', async () => {
      const result = await passwordService.hash('', 'provider');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('empty');
      }
    });

    it('should return error for too short password (less than 8 chars)', async () => {
      const result = await passwordService.hash('short', 'provider');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('at least 8 characters');
      }
    });
  });

  describe('verify', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      mockPool.query.mockResolvedValue({
        rows: [{ password: hashedPassword }],
        rowCount: 1,
      } as any);
      
      const result = await passwordService.verify('user123', 'org123', password);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
      
      // Verify query was called with correct parameters
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT password'),
        ['user123', 'org123']
      );
    });

    it('should return false for incorrect password', async () => {
      const correctPassword = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hashedPassword = await bcrypt.hash(correctPassword, 12);
      
      mockPool.query.mockResolvedValue({
        rows: [{ password: hashedPassword }],
        rowCount: 1,
      } as any);
      
      const result = await passwordService.verify('user123', 'org123', wrongPassword);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it('should query database with organization_id filter', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);
      
      await passwordService.verify('user123', 'org456', 'password');
      
      // Verify parameterized query with organization_id
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('organization_id = $2'),
        ['user123', 'org456']
      );
    });

    it('should return error when user not found', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);
      
      const result = await passwordService.verify('nonexistent', 'org123', 'password');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }
    });

    it('should return error for database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));
      
      const result = await passwordService.verify('user123', 'org123', 'password');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SYSTEM_DATABASE_ERROR');
      }
    });
  });

  describe('update', () => {
    it('should update password in database', async () => {
      const newHash = '$2b$12$hashedPasswordExample';
      
      mockPool.query.mockResolvedValue({
        rowCount: 1,
      } as any);
      
      const result = await passwordService.update('user123', 'org123', newHash);
      
      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_authentication'),
        [newHash, 'user123', 'org123']
      );
    });

    it('should use parameterized query', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 1,
      } as any);
      
      await passwordService.update('user123', 'org123', 'newHash');
      
      // Verify parameterized query format
      const call = mockPool.query.mock.calls[0];
      expect(call[0]).toContain('$1');
      expect(call[0]).toContain('$2');
      expect(call[0]).toContain('$3');
      expect(Array.isArray(call[1])).toBe(true);
    });

    it('should include organization_id in WHERE clause', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 1,
      } as any);
      
      await passwordService.update('user123', 'org456', 'newHash');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('organization_id = $3'),
        expect.arrayContaining(['user123', 'org456'])
      );
    });

    it('should return error when user not found', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 0,
      } as any);
      
      const result = await passwordService.update('nonexistent', 'org123', 'newHash');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }
    });

    it('should return error for database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));
      
      const result = await passwordService.update('user123', 'org123', 'newHash');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SYSTEM_DATABASE_ERROR');
      }
    });
  });
});
