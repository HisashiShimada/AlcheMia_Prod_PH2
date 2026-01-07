/**
 * 認証型定義のテスト（TypeScript型アサーション）
 * 
 * このファイルはTypeScriptのコンパイラによって検証されます。
 * 型が正しく定義されていれば、このファイルはコンパイルエラーなく通過します。
 */

import type {
  UserRole,
  User,
  AuthFlowState,
  LoginResponse,
  VerifyPINResponse,
  ResendPINResponse,
  MessageResponse,
  ErrorResponse,
} from '../auth';

// ROLE_REDIRECT_MAPは値なので通常のimportを使用
import { ROLE_REDIRECT_MAP } from '../auth';

// ===== UserRole型のテスト =====

// mi_engineerが追加されているか
const validRole1: UserRole = 'mi_engineer';
const validRole2: UserRole = 'provider';
const validRole3: UserRole = 'system_admin';
const validRole4: UserRole = 'data_admin';
const validRole5: UserRole = 'experiment_admin';
const validRole6: UserRole = 'experiment_worker';

// @ts-expect-error - 無効なロール
const invalidRole: UserRole = 'invalid_role';

// ===== AuthFlowState型のテスト =====

const flowState1: AuthFlowState = 'login';
const flowState2: AuthFlowState = 'pin-input';
const flowState3: AuthFlowState = 'reset-request';
const flowState4: AuthFlowState = 'reset-sent';

// @ts-expect-error - 無効な状態
const invalidFlowState: AuthFlowState = 'invalid-state';

// ===== LoginResponse型のテスト =====

const loginResponse: LoginResponse = {
  sessionToken: 'maiml_session-abc123_1234567890',
  message: 'PINコードをメールに送信しました',
  email: 'use***@example.com',
  expiresIn: 300,
};

// sessionTokenが必須
// @ts-expect-error - sessionTokenが欠けているためエラーになる
const invalidLoginResponse1: LoginResponse = {
  message: 'PINコードをメールに送信しました',
  email: 'use***@example.com',
  expiresIn: 300,
};

// expiresInはnumber型
const invalidLoginResponse2: LoginResponse = {
  sessionToken: 'token',
  message: 'message',
  email: 'email@example.com',
  // @ts-expect-error - expiresInはnumber型であるべき
  expiresIn: '300',
};

// ===== VerifyPINResponse型のテスト =====

const verifyPINResponse: VerifyPINResponse = {
  user: {
    id: 'user_123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'experiment_admin',
    organizationId: 'org_001',
    organizationName: 'Test Organization',
    displayName: 'Test User',
  },
  session: {
    token: 'maiml_session-xyz789_9876543210',
    expiresAt: '2025-12-30T12:00:00Z',
  },
  redirectUrl: '/experiment-admin',
};

// userが必須
// @ts-expect-error - userプロパティが欠けているためエラーになる
const invalidVerifyPINResponse: VerifyPINResponse = {
  session: {
    token: 'token',
    expiresAt: '2025-12-30T12:00:00Z',
  },
  redirectUrl: '/path',
};

// ===== ResendPINResponse型のテスト =====

const resendPINResponse: ResendPINResponse = {
  message: 'PINコードを再送信しました',
  email: 'use***@example.com',
  expiresIn: 300,
};

// messageが必須
// @ts-expect-error - messageプロパティが欠けているためエラーになる
const invalidResendPINResponse: ResendPINResponse = {
  email: 'email@example.com',
  expiresIn: 300,
};

// ===== MessageResponse型のテスト =====

const messageResponse: MessageResponse = {
  message: '処理が成功しました',
};

// messageが必須
// @ts-expect-error - messageプロパティが欠けているためエラーになる
const invalidMessageResponse: MessageResponse = {};

// ===== ErrorResponse型のテスト =====

const errorResponse: ErrorResponse = {
  success: false,
  error: {
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'ユーザー名またはパスワードが正しくありません',
    details: [
      {
        field: 'username',
        message: 'ユーザー名が見つかりません',
        code: 'INVALID_USERNAME',
      },
    ],
  },
  meta: {
    timestamp: '2025-12-30T10:00:00Z',
    requestId: 'req_abc123',
  },
};

// successはfalse固定
const invalidErrorResponse1: ErrorResponse = {
  // @ts-expect-error - successはfalse固定でなければならない
  success: true,
  error: {
    code: 'ERROR_CODE',
    message: 'Error message',
  },
  meta: {
    timestamp: '2025-12-30T10:00:00Z',
    requestId: 'req_123',
  },
};

// errorが必須
// @ts-expect-error - errorプロパティが欠けているためエラーになる
const invalidErrorResponse2: ErrorResponse = {
  success: false,
  meta: {
    timestamp: '2025-12-30T10:00:00Z',
    requestId: 'req_123',
  },
};

// ===== ROLE_REDIRECT_MAP定数のテスト =====

// すべてのロールに対応するURLが定義されているか
const providerUrl: string = ROLE_REDIRECT_MAP['provider'];
const systemAdminUrl: string = ROLE_REDIRECT_MAP['system_admin'];
const dataAdminUrl: string = ROLE_REDIRECT_MAP['data_admin'];
const experimentAdminUrl: string = ROLE_REDIRECT_MAP['experiment_admin'];
const experimentWorkerUrl: string = ROLE_REDIRECT_MAP['experiment_worker'];
const miEngineerUrl: string = ROLE_REDIRECT_MAP['mi_engineer'];

// すべてのキーが定義されているか（型レベルで検証）
type AssertAllRolesCovered = {
  [K in UserRole]: typeof ROLE_REDIRECT_MAP[K] extends string ? true : never;
};

const _allRolesCovered: AssertAllRolesCovered = {
  provider: true,
  system_admin: true,
  data_admin: true,
  experiment_admin: true,
  experiment_worker: true,
  mi_engineer: true,
};

// 型テストが成功すれば、すべての型定義が正しい
export {};
