/**
 * AuthContainer 統合テスト
 * 
 * 認証フロー全体の統合テストを実装
 * - login → pin-input → redirect フロー
 * - エラーケース（認証失敗、PINコード期限切れ、レート制限）
 * - パスワードリセットフロー
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthContainer from '../AuthContainer';
import { authService } from '@/services/authService';
import type {
  LoginResponseData,
  VerifyPinResponseData,
  ResendPinResponseData,
  ResetPasswordRequestResponseData,
} from '@/types/api';
import type { ROLE_REDIRECT_MAP } from '../../../types/auth';

// authServiceをモック化
jest.mock('@/services/authService', () => ({
  authService: {
    login: jest.fn(),
    verifyPin: jest.fn(),
    resendPin: jest.fn(),
    resetPasswordRequest: jest.fn(),
    resetPassword: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    changePassword: jest.fn(),
  },
  AuthServiceError: class AuthServiceError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));
const mockedAuthService = authService as jest.Mocked<typeof authService>;

// Next.js routerをモック化
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Ant Design messageをモック化
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      error: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
    },
  };
});

// テスト用の組織IDとロールリダイレクトマップ
const TEST_ORG_ID = 'org_test_001';
const TEST_ROLE_REDIRECT_MAP: typeof ROLE_REDIRECT_MAP = {
  provider: '/provider',
  system_admin: '/system-admin',
  data_admin: '/data-admin',
  experiment_admin: '/experiment-admin',
  experiment_worker: '/experiment-worker',
  mi_engineer: '/mi-engineer',
};

describe('AuthContainer 統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  describe('認証フロー全体（login → pin-input → redirect）', () => {
    test('成功フロー: ログイン → PINコード入力 → リダイレクト', async () => {
      const user = userEvent.setup();

      // Step 1: ログイン成功のモック
      const loginResponse: LoginResponseData = {
        sessionToken: 'temp_session_abc123_1735185000',
        message: 'PINコードをメールに送信しました',
        email: 'use***@example.com',
        expiresIn: 300,
      };
      mockedAuthService.login.mockResolvedValueOnce(loginResponse);

      // Step 2: PINコード検証成功のモック
      const verifyResponse: VerifyPinResponseData = {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          username: 'user001',
          email: 'user001@example.com',
          roleName: '実験管理者',
          roleCd: 'experiment_admin',
          organizationId: 'org_maiml_lab_001',
          organizationName: 'MAIML研究室',
            displayName: '山田 太郎',
            organizationGroupCds: [],
            initialScreenFunctionCd: '040000',
          },
          session: {
            token: 'maiml_session-abc123_1735185000',
          expiresAt: '2025-12-27T10:30:00.000Z',
        },
        passwordChangeRequired: false,
        redirectUrl: '/experiment-admin',
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            username: 'user001',
            email: 'user001@example.com',
            roleName: '実験管理者',
            roleCd: 'experiment_admin',
            organizationId: 'org_maiml_lab_001',
            organizationName: 'MAIML研究室',
            displayName: '山田 太郎',
            departmentCd: 'dept_001',
            initialScreenFunctionCd: '040000',
          },
          session: {
            token: 'maiml_session-abc123_1735185000',
            expiresAt: '2025-12-27T10:30:00.000Z',
          },
          passwordChangeRequired: false,
          redirectUrl: '/experiment-admin',
      };
      mockedAuthService.verifyPin.mockResolvedValueOnce(verifyResponse);

      // コンポーネントをレンダリング（必須propsを渡す）
      render(
        <AuthContainer
          organizationId={TEST_ORG_ID}
          roleRedirectMap={TEST_ROLE_REDIRECT_MAP}
        />
      );

      // 初期状態: ログイン画面が表示されている
      expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();

      // ユーザー名とパスワードを入力
      await user.type(screen.getByLabelText('ユーザー名'), 'user001');
      await user.type(screen.getByLabelText('パスワード'), 'password123');

      // ログインボタンをクリック
      const loginButton = screen.getByRole('button', { name: 'ログイン' });
      await user.click(loginButton);

      // APIが正しく呼ばれたことを確認
      await waitFor(() => {
        expect(mockedAuthService.login).toHaveBeenCalledWith(
          { userId: 'user001', password: 'password123', organizationId: TEST_ORG_ID },
          TEST_ORG_ID
        );
      });

      // PINコード入力画面に遷移したことを確認
      await waitFor(() => {
        expect(screen.getByText(/PINコード/)).toBeInTheDocument();
        expect(screen.getByText(/use\*\*\*@example\.com/)).toBeInTheDocument();
      });

      // PINコードを入力
      const pinInput = screen.getByLabelText('PINコード');
      await user.type(pinInput, '123456');

      // 確認ボタンをクリック
      const verifyButton = screen.getByRole('button', { name: '確認' });
      await user.click(verifyButton);

      // PINコード検証APIが呼ばれたことを確認
      await waitFor(() => {
        expect(mockedAuthService.verifyPin).toHaveBeenCalledWith(
          '123456',
          'temp_session_abc123_1735185000',
          TEST_ORG_ID
        );
      });

      // リダイレクトされたことを確認
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/experiment-admin');
      });
    });

    test('各ロールで正しいページにリダイレクトされる', async () => {
      const user = userEvent.setup();

      const roles: Array<{
        role: 'provider' | 'system_admin' | 'data_admin' | 'experiment_admin' | 'experiment_worker' | 'mi_engineer';
        expectedUrl: string;
      }> = [
        { role: 'provider', expectedUrl: '/provider' },
        { role: 'system_admin', expectedUrl: '/system-admin' },
        { role: 'data_admin', expectedUrl: '/data-admin' },
        { role: 'experiment_admin', expectedUrl: '/experiment-admin' },
        { role: 'experiment_worker', expectedUrl: '/experiment-worker' },
        { role: 'mi_engineer', expectedUrl: '/mi-engineer' },
      ];

      for (const { role, expectedUrl } of roles) {
        jest.clearAllMocks();

        const loginResponse: LoginResponseData = {
          sessionToken: `temp_session_${role}`,
          message: 'PINコードをメールに送信しました',
          email: 'use***@example.com',
          expiresIn: 300,
        };
        mockedAuthService.login.mockResolvedValueOnce(loginResponse);

        const verifyResponse: VerifyPinResponseData = {
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            username: 'testuser',
            email: 'test@example.com',
            roleName: role,
            roleCd: role,
            organizationId: 'org_001',
            organizationName: 'Test Org',
            displayName: 'Test User',
            organizationGroupCds: [],
            initialScreenFunctionCd: '040000',
          },
          session: {
            token: `maiml_session_${role}`,
            expiresAt: '2025-12-27T10:30:00.000Z',
          },
          passwordChangeRequired: false,
          redirectUrl: expectedUrl,
        };
        mockedAuthService.verifyPin.mockResolvedValueOnce(verifyResponse);

        const { unmount } = render(
          <AuthContainer
            organizationId={TEST_ORG_ID}
            roleRedirectMap={TEST_ROLE_REDIRECT_MAP}
          />
        );

        await user.type(screen.getByLabelText('ユーザー名'), 'testuser');
        await user.type(screen.getByLabelText('パスワード'), 'password');
        await user.click(screen.getByRole('button', { name: 'ログイン' }));

        await waitFor(() => {
          expect(screen.getByLabelText('PINコード')).toBeInTheDocument();
        });

        await user.type(screen.getByLabelText('PINコード'), '123456');
        await user.click(screen.getByRole('button', { name: '確認' }));

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(expectedUrl);
        });

        unmount();
      }
    });
  });

  describe('エラーケース', () => {
    test('認証失敗: 不正なユーザー名/パスワード', async () => {
      const user = userEvent.setup();

      mockedAuthService.login.mockRejectedValueOnce(
        new Error('ユーザー名またはパスワードが正しくありません')
      );

      render(
        <AuthContainer
          organizationId={TEST_ORG_ID}
          roleRedirectMap={TEST_ROLE_REDIRECT_MAP}
        />
      );

      await user.type(screen.getByLabelText('ユーザー名'), 'wronguser');
      await user.type(screen.getByLabelText('パスワード'), 'wrongpass');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(
          screen.getByText('ユーザー名またはパスワードが正しくありません')
        ).toBeInTheDocument();
      });

      // ログイン画面のまま（遷移していない）
      expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
    });

    test('PINコード不正: 試行回数超過でログイン画面に戻る', async () => {
      const user = userEvent.setup();

      // ログイン成功
      const loginResponse: LoginResponseData = {
        sessionToken: 'temp_session_abc123',
        message: 'PINコードをメールに送信しました',
        email: 'use***@example.com',
        expiresIn: 300,
      };
      mockedAuthService.login.mockResolvedValueOnce(loginResponse);

      // PINコード検証失敗（試行回数超過）
      mockedAuthService.verifyPin.mockRejectedValueOnce(
        new Error('PINコード入力試行回数の上限に達しました。最初からやり直してください')
      );

      render(
        <AuthContainer
          organizationId={TEST_ORG_ID}
          roleRedirectMap={TEST_ROLE_REDIRECT_MAP}
        />
      );

      // ログイン
      await user.type(screen.getByLabelText('ユーザー名'), 'user001');
      await user.type(screen.getByLabelText('パスワード'), 'password123');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(screen.getByLabelText('PINコード')).toBeInTheDocument();
      });

      // PINコード入力（試行回数超過エラー）
      await user.type(screen.getByLabelText('PINコード'), '999999');
      await user.click(screen.getByRole('button', { name: '確認' }));

      // ログイン画面に戻ったことを確認
      await waitFor(() => {
        expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
        expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
      });
    });

    test('PINコード期限切れ: 再送信が可能', async () => {
      const user = userEvent.setup();

      // ログイン成功
      const loginResponse: LoginResponseData = {
        sessionToken: 'temp_session_abc123',
        message: 'PINコードをメールに送信しました',
        email: 'use***@example.com',
        expiresIn: 300,
      };
      mockedAuthService.login.mockResolvedValueOnce(loginResponse);

      // PINコード期限切れ
      mockedAuthService.verifyPin.mockRejectedValueOnce(
        new Error('PINコードの有効期限が切れました。再送信してください')
      );

      render(
        <AuthContainer
          organizationId={TEST_ORG_ID}
          roleRedirectMap={TEST_ROLE_REDIRECT_MAP}
        />
      );

      // ログイン
      await user.type(screen.getByLabelText('ユーザー名'), 'user001');
      await user.type(screen.getByLabelText('パスワード'), 'password123');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(screen.getByLabelText('PINコード')).toBeInTheDocument();
      });

      // PINコード入力
      await user.type(screen.getByLabelText('PINコード'), '123456');
      await user.click(screen.getByRole('button', { name: '確認' }));

      // 期限切れエラーメッセージが表示される
      await waitFor(() => {
        expect(
          screen.getByText('PINコードの有効期限が切れました。再送信してください')
        ).toBeInTheDocument();
      });

      // 再送信ボタンが表示される（カウントダウンが終わっている想定）
      expect(screen.getByText(/PINコードを再送信/)).toBeInTheDocument();
    });

    test('レート制限超過: エラーメッセージを表示', async () => {
      const user = userEvent.setup();

      mockedAuthService.login.mockRejectedValueOnce(
        new Error(
          'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください'
        )
      );

      render(
        <AuthContainer
          organizationId={TEST_ORG_ID}
          roleRedirectMap={TEST_ROLE_REDIRECT_MAP}
        />
      );

      await user.type(screen.getByLabelText('ユーザー名'), 'user001');
      await user.type(screen.getByLabelText('パスワード'), 'password123');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(
          screen.getByText(
            'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください'
          )
        ).toBeInTheDocument();
      });

      // ログイン画面のまま
      expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
    });
  });

  describe('パスワードリセットフロー', () => {
    test('パスワードリセット要求 → リセットリンク送信完了', async () => {
      const user = userEvent.setup();

      const resetResponse: ResetPasswordRequestResponseData = {
        message: 'パスワードリセット用のリンクをメールに送信しました',
        email: 'use***@example.com',
      };
      mockedAuthService.resetPasswordRequest.mockResolvedValueOnce(resetResponse);

      render(
        <AuthContainer
          organizationId={TEST_ORG_ID}
          roleRedirectMap={TEST_ROLE_REDIRECT_MAP}
        />
      );

      // パスワードをお忘れですか？リンクをクリック
      const resetLink = screen.getByText('パスワードをお忘れですか？');
      await user.click(resetLink);

      // パスワードリセット要求画面に遷移
      await waitFor(() => {
        expect(screen.getByText('パスワードリセット')).toBeInTheDocument();
        expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
      });

      // ユーザー名を入力
      await user.type(screen.getByLabelText('ユーザー名'), 'user001');

      // リセットリンク送信ボタンをクリック
      const sendButton = screen.getByRole('button', {
        name: 'リセットリンクを送信',
      });
      await user.click(sendButton);

      // APIが呼ばれたことを確認
      await waitFor(() => {
        expect(mockedAuthService.resetPasswordRequest).toHaveBeenCalledWith(
          'user001',
          TEST_ORG_ID
        );
      });

      // 送信完了メッセージが表示される
      await waitFor(() => {
        expect(
          screen.getByText(/パスワードリセット用のリンクをメールに送信しました/)
        ).toBeInTheDocument();
      });

      // ログイン画面に戻るリンクが表示される
      expect(screen.getByText('ログイン画面に戻る')).toBeInTheDocument();
    });
  });

  describe('PINコード再送信機能', () => {
    test('PINコード再送信が成功する', async () => {
      const user = userEvent.setup();

      // ログイン成功
      const loginResponse: LoginResponseData = {
        sessionToken: 'temp_session_abc123',
        message: 'PINコードをメールに送信しました',
        email: 'use***@example.com',
        expiresIn: 1, // 1秒で期限切れ（再送信可能になるまで短縮）
      };
      mockedAuthService.login.mockResolvedValueOnce(loginResponse);

      // 再送信成功
      const resendResponse: ResendPinResponseData = {
        message: 'PINコードを再送信しました',
        email: 'use***@example.com',
        expiresIn: 300,
      };
      mockedAuthService.resendPin.mockResolvedValueOnce(resendResponse);

      render(
        <AuthContainer
          organizationId={TEST_ORG_ID}
          roleRedirectMap={TEST_ROLE_REDIRECT_MAP}
        />
      );

      // ログイン
      await user.type(screen.getByLabelText('ユーザー名'), 'user001');
      await user.type(screen.getByLabelText('パスワード'), 'password123');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(screen.getByLabelText('PINコード')).toBeInTheDocument();
      });

      // タイマーが0になるまで待機（1秒+バッファ）
      await waitFor(
        () => {
          expect(screen.getByText(/PINコードを再送信/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // 再送信ボタンをクリック
      const resendButton = screen.getByRole('button', {
        name: /PINコードを再送信/,
      });
      await user.click(resendButton);

      // APIが呼ばれたことを確認
      await waitFor(() => {
        expect(mockedAuthService.resendPin).toHaveBeenCalledWith(
          'temp_session_abc123',
          TEST_ORG_ID
        );
      });
    });

    test('PINコード再送信がレート制限に達する', async () => {
      const user = userEvent.setup();

      // ログイン成功
      const loginResponse: LoginResponseData = {
        sessionToken: 'temp_session_abc123',
        message: 'PINコードをメールに送信しました',
        email: 'use***@example.com',
        expiresIn: 1,
      };
      mockedAuthService.login.mockResolvedValueOnce(loginResponse);

      // 再送信失敗（レート制限）
      mockedAuthService.resendPin.mockRejectedValueOnce(
        new Error('PINコード再送信回数が上限に達しました')
      );

      render(
        <AuthContainer
          organizationId={TEST_ORG_ID}
          roleRedirectMap={TEST_ROLE_REDIRECT_MAP}
        />
      );

      // ログイン
      await user.type(screen.getByLabelText('ユーザー名'), 'user001');
      await user.type(screen.getByLabelText('パスワード'), 'password123');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(screen.getByLabelText('PINコード')).toBeInTheDocument();
      });

      // タイマーが0になるまで待機
      await waitFor(
        () => {
          expect(screen.getByText(/PINコードを再送信/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // 再送信ボタンをクリック
      await user.click(screen.getByRole('button', { name: /PINコードを再送信/ }));

      // エラーメッセージが表示される
      await waitFor(() => {
        expect(
          screen.getByText('PINコード再送信回数が上限に達しました')
        ).toBeInTheDocument();
      });
    });
  });
});
