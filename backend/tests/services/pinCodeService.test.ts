/**
 * pinCodeService のユニットテスト
 * 
 * TDD RED Phase → GREEN Phase
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PinCodeService } from '../../src/services/pinCodeService';

describe('pinCodeService', () => {
  let mockPool: any;
  let pinCodeService: PinCodeService;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    
    pinCodeService = new PinCodeService(mockPool);
  });

  describe('generateAndSave', () => {
    it('should generate 6-digit PIN code', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ pin_code: '123456', expires_at: new Date() }],
        rowCount: 1,
      });
      
      const result = await pinCodeService.generateAndSave('user123', 'org123', 'session_abc');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pinCode).toMatch(/^\d{6}$/);
        expect(result.data.pinCode.length).toBe(6);
      }
    });

    it('should set expiration time to 5 minutes from now', async () => {
      const now = new Date();
      mockPool.query.mockResolvedValue({
        rows: [{ pin_code: '123456', expires_at: new Date(now.getTime() + 5 * 60 * 1000) }],
        rowCount: 1,
      });
      
      const result = await pinCodeService.generateAndSave('user123', 'org123', 'session_abc');
      
      expect(result.success).toBe(true);
      if (result.success) {
        const expiresAt = result.data.expiresAt;
        const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
        expect(diffMinutes).toBeGreaterThanOrEqual(4.9);
        expect(diffMinutes).toBeLessThanOrEqual(5.1);
      }
    });

    it('should save PIN code to database with organization_id', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ pin_code: '123456', expires_at: new Date() }],
        rowCount: 1,
      });
      
      await pinCodeService.generateAndSave('user123', 'org456', 'session_xyz');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pin_codes'),
        expect.arrayContaining(['user123', 'org456', 'session_xyz'])
      );
    });

    it('should return error for database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));
      
      const result = await pinCodeService.generateAndSave('user123', 'org123', 'session_abc');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SYSTEM_DATABASE_ERROR');
      }
    });
  });

  describe('verify', () => {
    it('should return user info for valid PIN code', async () => {
      const futureTime = new Date(Date.now() + 4 * 60 * 1000); // 4 minutes from now
      
      mockPool.query.mockResolvedValue({
        rows: [{
          user_id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          role: 'experiment_worker',
          organization_id: 'org123',
          organization_name: 'Test Org',
          display_name: 'Test User',
          expires_at: futureTime,
          attempts_count: 0,
          max_attempts: 3,
        }],
        rowCount: 1,
      });
      
      const result = await pinCodeService.verify('123456', 'session_abc');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('user123');
        expect(result.data.username).toBe('testuser');
        expect(result.data.role).toBe('experiment_worker');
      }
    });

    it('should return error for expired PIN code', async () => {
      const pastTime = new Date(Date.now() - 1 * 60 * 1000); // 1 minute ago
      
      mockPool.query.mockResolvedValue({
        rows: [{
          expires_at: pastTime,
          attempts_count: 0,
          max_attempts: 3,
        }],
        rowCount: 1,
      });
      
      const result = await pinCodeService.verify('123456', 'session_abc');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AUTH_PIN_EXPIRED');
      }
    });

    it('should return error for max attempts exceeded', async () => {
      const futureTime = new Date(Date.now() + 4 * 60 * 1000);
      
      mockPool.query.mockResolvedValue({
        rows: [{
          expires_at: futureTime,
          attempts_count: 3,
          max_attempts: 3,
        }],
        rowCount: 1,
      });
      
      const result = await pinCodeService.verify('123456', 'session_abc');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AUTH_PIN_MAX_ATTEMPTS');
      }
    });

    it('should return error for invalid PIN code', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });
      
      const result = await pinCodeService.verify('999999', 'session_abc');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AUTH_PIN_INVALID');
      }
    });

    it('should use parameterized query with PIN and session token', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });
      
      await pinCodeService.verify('123456', 'session_xyz');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('pin_code = $1'),
        expect.arrayContaining(['123456', 'session_xyz'])
      );
    });
  });

  describe('delete', () => {
    it('should delete PIN code from database', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 1,
      });
      
      const result = await pinCodeService.delete('session_abc');
      
      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM pin_codes'),
        ['session_abc']
      );
    });

    it('should use parameterized query', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 1,
      });
      
      await pinCodeService.delete('session_xyz');
      
      const call = mockPool.query.mock.calls[0];
      expect(call[0]).toContain('$1');
      expect(Array.isArray(call[1])).toBe(true);
    });

    it('should return success even if PIN not found', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 0,
      });
      
      const result = await pinCodeService.delete('session_nonexistent');
      
      expect(result.success).toBe(true);
    });

    it('should return error for database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));
      
      const result = await pinCodeService.delete('session_abc');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SYSTEM_DATABASE_ERROR');
      }
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired PIN codes', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 5,
      });
      
      const result = await pinCodeService.deleteExpired();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(5);
      }
    });

    it('should use expires_at < CURRENT_TIMESTAMP condition', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 0,
      });
      
      await pinCodeService.deleteExpired();
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at < CURRENT_TIMESTAMP')
      );
    });

    it('should return 0 if no expired PIN codes', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 0,
      });
      
      const result = await pinCodeService.deleteExpired();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });

    it('should return error for database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));
      
      const result = await pinCodeService.deleteExpired();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SYSTEM_DATABASE_ERROR');
      }
    });
  });

  describe('incrementAttempts', () => {
    it('should increment attempts count', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 1,
      });
      
      const result = await pinCodeService.incrementAttempts('123456', 'session_abc');
      
      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pin_codes'),
        expect.arrayContaining(['123456', 'session_abc'])
      );
    });

    it('should use parameterized query with PIN and session', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 1,
      });
      
      await pinCodeService.incrementAttempts('123456', 'session_xyz');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('attempts_count = attempts_count + 1'),
        expect.arrayContaining(['123456', 'session_xyz'])
      );
    });

    it('should return error if PIN not found', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 0,
      });
      
      const result = await pinCodeService.incrementAttempts('999999', 'session_abc');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PIN_NOT_FOUND');
      }
    });

    it('should return error for database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));
      
      const result = await pinCodeService.incrementAttempts('123456', 'session_abc');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SYSTEM_DATABASE_ERROR');
      }
    });
  });
});
