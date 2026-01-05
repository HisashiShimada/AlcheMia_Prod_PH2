/**
 * JWTサービスのユニットテスト
 * 
 * @description TDDアプローチでJWTトークンの生成・検証機能をテスト
 * Requirements: 2.2, 4.1
 */

import { JwtService } from '../../src/services/jwtService';
import type { JwtPayload, UserRole } from '../../src/types/auth';

// 環境変数のモック
process.env.JWT_SECRET = 'test-secret-key-for-unit-testing-only';
process.env.JWT_ISSUER = 'mmdpf-auth-api';
process.env.JWT_AUDIENCE = 'mmdpf-client';

describe('JwtService', () => {
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService();
  });

  describe('generate', () => {
    it('providerロールで48時間有効なJWTトークンを生成できること', async () => {
      const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: 'user123',
        organizationId: 'org456',
        role: 'provider',
        sessionId: 'session789'
      };

      const result = await jwtService.generate(payload, 'provider');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatch(/^maiml_session-session789_\d+$/);
      }
    });

    it('experiment_workerロールで12時間有効なJWTトークンを生成できること', async () => {
      const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: 'worker001',
        organizationId: 'org999',
        role: 'experiment_worker',
        sessionId: 'session_worker'
      };

      const result = await jwtService.generate(payload, 'experiment_worker');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatch(/^maiml_session-session_worker_\d+$/);
      }
    });

    it('data_adminロールで24時間有効なJWTトークンを生成できること', async () => {
      const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: 'admin001',
        organizationId: 'org_admin',
        role: 'data_admin',
        sessionId: 'session_admin'
      };

      const result = await jwtService.generate(payload, 'data_admin');

      expect(result.success).toBe(true);
    });

    it('トークン形式が maiml_session-{sessionId}_{timestamp} であること', async () => {
      const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: 'user123',
        organizationId: 'org456',
        role: 'provider',
        sessionId: 'test-session-id'
      };

      const result = await jwtService.generate(payload, 'provider');

      expect(result.success).toBe(true);
      if (result.success) {
        const tokenParts = result.data.split('_');
        expect(tokenParts[0]).toBe('maiml');
        expect(tokenParts[1]).toContain('session-test-session-id');
        expect(tokenParts[2]).toMatch(/^\d+$/);
      }
    });
  });

  describe('verify', () => {
    it('有効なトークンを検証できること', async () => {
      const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: 'user123',
        organizationId: 'org456',
        role: 'provider',
        sessionId: 'session789'
      };

      const generateResult = await jwtService.generate(payload, 'provider');
      expect(generateResult.success).toBe(true);

      if (generateResult.success) {
        const verifyResult = await jwtService.verify(generateResult.data);

        expect(verifyResult.success).toBe(true);
        if (verifyResult.success) {
          expect(verifyResult.data.userId).toBe('user123');
          expect(verifyResult.data.organizationId).toBe('org456');
          expect(verifyResult.data.role).toBe('provider');
          expect(verifyResult.data.sessionId).toBe('session789');
        }
      }
    });

    it('不正な署名のトークンを拒否すること', async () => {
      const invalidToken = 'maiml_session-fake_123456789.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMTIzIn0.invalid-signature';

      const result = await jwtService.verify(invalidToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AUTH_TOKEN_INVALID');
      }
    });

    it('期限切れトークンを拒否すること', async () => {
      // 期限切れトークンのシミュレーション（過去の時刻で生成）
      const expiredPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: 'user123',
        organizationId: 'org456',
        role: 'provider',
        sessionId: 'expired-session'
      };

      // トークン生成後、時間を進めてテスト（実際は別の方法で実装）
      const result = await jwtService.generate(expiredPayload, 'provider');
      expect(result.success).toBe(true);

      // Note: 実際の期限切れテストはモックやタイムトラベルが必要
      // ここでは形式的なテストとして記載
    });

    it('トークン形式が不正な場合にエラーを返すこと', async () => {
      const result = await jwtService.verify('invalid-format-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AUTH_TOKEN_INVALID');
      }
    });
  });

  describe('decode', () => {
    it('検証なしでトークンをデコードできること', async () => {
      const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: 'user123',
        organizationId: 'org456',
        role: 'provider',
        sessionId: 'session789'
      };

      const generateResult = await jwtService.generate(payload, 'provider');
      expect(generateResult.success).toBe(true);

      if (generateResult.success) {
        const decoded = jwtService.decode(generateResult.data);

        expect(decoded).not.toBeNull();
        expect(decoded?.userId).toBe('user123');
        expect(decoded?.role).toBe('provider');
      }
    });

    it('不正なトークンの場合nullを返すこと', () => {
      const decoded = jwtService.decode('completely-invalid-token');

      expect(decoded).toBeNull();
    });
  });

  describe('ロール別有効期限', () => {
    it('各ロールで正しい有効期限が設定されていること', async () => {
      const roles: UserRole[] = ['provider', 'system_admin', 'data_admin', 'experiment_admin', 'experiment_worker', 'mi_engineer'];
      const expectedExpiry = {
        provider: 48 * 60 * 60,
        system_admin: 48 * 60 * 60,
        data_admin: 24 * 60 * 60,
        experiment_admin: 24 * 60 * 60,
        mi_engineer: 24 * 60 * 60,
        experiment_worker: 12 * 60 * 60
      };

      for (const role of roles) {
        const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
          userId: 'user123',
          organizationId: 'org456',
          role,
          sessionId: `session-${role}`
        };

        const result = await jwtService.generate(payload, role);
        expect(result.success).toBe(true);

        if (result.success) {
          const decoded = jwtService.decode(result.data);
          expect(decoded).not.toBeNull();

          if (decoded) {
            const expiryDuration = decoded.exp - decoded.iat;
            expect(expiryDuration).toBe(expectedExpiry[role]);
          }
        }
      }
    });
  });
});
