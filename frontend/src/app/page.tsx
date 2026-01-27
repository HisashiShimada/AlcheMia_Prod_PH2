'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { message } from 'antd';
import LoginPage from '@/components/LoginPage';
import PinCodeInputPage from '@/components/PinCodeInputPage';
import ProviderMenu from '@/components/menus/ProviderMenu';
import SystemAdminMenu from '@/components/menus/SystemAdminMenu';
import DataAdminMenu from '@/components/menus/DataAdminMenu';
import ExperimentAdminMenu from '@/components/menus/ExperimentAdminMenu';
import ExperimentWorkerMenu from '@/components/menus/ExperimentWorkerMenu';
import { authService, AuthServiceError } from '@/services/authService';
import type { LoginCredentials, User, UserRole } from '@/types/auth';

// デバッグ機能のインポート（開発環境専用）
import DebugLoginPanel from '@/components/common/DebugLoginPanel';

// 開発環境判定
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 認証フロー状態
 */
type AuthStep = 'login' | 'pin-code' | 'authenticated';

/**
 * デモ用ユーザーデータ（開発環境用）
 */
const demoUsers: Record<string, { password: string; user: User }> = {
  provider: {
    password: 'provider123',
    user: {
      id: '1',
      username: 'provider',
      email: 'provider@example.com',
      role: 'provider',
      organizationId: 'org_system',
      organizationName: 'システム管理組織',
      displayName: 'プロバイダー太郎',
    },
  },
  system_admin: {
    password: 'admin123',
    user: {
      id: '2',
      username: 'system_admin',
      email: 'system.admin@example.com',
      role: 'system_admin',
      organizationId: 'org_lab_001',
      organizationName: 'AIML研究所',
      displayName: 'システム管理者 花子',
    },
  },
  data_admin: {
    password: 'data123',
    user: {
      id: '3',
      username: 'data_admin',
      email: 'data.admin@example.com',
      role: 'data_admin',
      organizationId: 'org_lab_001',
      organizationName: 'AIML研究所',
      displayName: 'データ管理者 次郎',
    },
  },
  experiment_admin: {
    password: 'exp123',
    user: {
      id: '4',
      username: 'experiment_admin',
      email: 'exp.admin@example.com',
      role: 'experiment_admin',
      organizationId: 'org_lab_001',
      organizationName: 'AIML研究所',
      displayName: '実験管理者 三郎',
    },
  },
  experiment_worker: {
    password: 'worker123',
    user: {
      id: '5',
      username: 'experiment_worker',
      email: 'worker@example.com',
      role: 'experiment_worker',
      organizationId: 'org_lab_001',
      organizationName: 'AIML研究所',
      displayName: '実験作業者 四郎',
    },
  },
};

/**
 * ホームページ（統合ログイン画面）
 */
export default function Home() {
  const searchParams = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();

  // URLクエリパラメータから組織IDを取得（開発環境用）
  const orgIdFromUrl = searchParams.get('orgId') || undefined;

  // 認証フロー状態管理
  const [authStep, setAuthStep] = useState<AuthStep>('login');

  // ログイン後のユーザー情報とメニュー表示
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMenuType, setCurrentMenuType] = useState<UserRole | null>(null);

  // 共通状態
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // PINコード入力に必要な情報
  const [sessionToken, setSessionToken] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');

  /**
   * ログイン処理（第1段階）
   */
  const handleLogin = async (credentials: LoginCredentials): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      // バックエンドAPIにログインリクエスト（開発環境用: URLのorgIdを渡す）
      const response = await authService.login(credentials, orgIdFromUrl);

      // ログイン成功 - PINコード送信完了
      console.log('Login successful:', response);

      // 仮セッショントークンと組織IDを保存
      setSessionToken(response.sessionToken);
      setOrganizationId(credentials.organizationId);
      setMaskedEmail(response.email);

      // SessionStorageに保存（authServiceのインターセプターが参照）
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sessionToken', response.sessionToken);
      }

      // 開発環境の場合、PINコードをsessionStorageに保存
      if (response.devMode && response.pinCode) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('devPinCode', response.pinCode);
        }
      }

      // PINコード入力画面へ遷移
      setAuthStep('pin-code');
    } catch (err) {
      // エラーハンドリング
      if (err instanceof AuthServiceError) {
        setError(err.message);
        console.error('Login error:', {
          code: err.code,
          message: err.message,
          details: err.details,
        });
      } else {
        setError('予期しないエラーが発生しました');
        console.error('Unexpected error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * PINコード検証処理（第2段階）
   */
  const handleVerifyPin = async (pinCode: string): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      // PINコード検証API呼び出し
      const response = await authService.verifyPin(pinCode, sessionToken, orgIdFromUrl);

      // 検証成功
      console.log('PIN verification successful:', response);

      // ユーザー情報を設定
      setCurrentUser(response.user);
      setCurrentMenuType(response.user.role as UserRole);
      setAuthStep('authenticated');

      // ユーザー情報とセッショントークンをSessionStorageに保存
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user', JSON.stringify(response.user));
        sessionStorage.setItem('sessionToken', response.session.token); // ← session.tokenを保存
      }

      messageApi.success('ログインに成功しました');
    } catch (err) {
      // エラーハンドリング
      if (err instanceof AuthServiceError) {
        setError(err.message);
        console.error('PIN verification error:', {
          code: err.code,
          message: err.message,
          details: err.details,
        });
      } else {
        setError('予期しないエラーが発生しました');
        console.error('Unexpected error:', err);
      }

      // エラーを再スローしてPinCodeInputPageでの処理を継続
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * PINコード再送信処理
   */
  const handleResendPin = async (): Promise<void> => {
    setError(null);

    try {
      // PINコード再送信API呼び出し（ログイン画面では組織IDをURLから取得）
      const response = await authService.resendPin(sessionToken, orgIdFromUrl);

      console.log('PIN resend successful:', response);

      // マスキングメールを更新
      if (response.email) {
        setMaskedEmail(response.email);
      }
    } catch (err) {
      // エラーハンドリング
      if (err instanceof AuthServiceError) {
        setError(err.message);
        console.error('PIN resend error:', {
          code: err.code,
          message: err.message,
          details: err.details,
        });
      } else {
        setError('予期しないエラーが発生しました');
        console.error('Unexpected error:', err);
      }

      // エラーを再スローしてPinCodeInputPageでの処理を継続
      throw err;
    }
  };

  /**
   * ログイン画面に戻る処理
   */
  const handleBackToLogin = (): void => {
    // SessionStorageをクリア
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sessionToken');
    }
    
    setAuthStep('login');
    setError(null);
    setSessionToken('');
    setOrganizationId('');
    setMaskedEmail('');
  };

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    try {
      // バックエンドのログアウトAPIを呼び出し
      await authService.logout();
      messageApi.success('ログアウトしました');
    } catch (error) {
      // エラーが発生してもローカル状態はクリアする
      console.error('Logout API error:', error);
      if (error instanceof AuthServiceError) {
        messageApi.warning(`ログアウト処理でエラーが発生しましたが、ローカル状態をクリアしました: ${error.message}`);
      } else {
        messageApi.warning('ログアウト処理でエラーが発生しましたが、ローカル状態をクリアしました');
      }
    } finally {
      // 成功・失敗に関わらずローカル状態をクリア
      setCurrentUser(null);
      setCurrentMenuType(null);
      setAuthStep('login');
      setSessionToken('');
      setOrganizationId('');
      setMaskedEmail('');
      setError(null);
      
      // SessionStorageをクリア
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('sessionToken');
        sessionStorage.removeItem('devPinCode');
      }
    }
  };

  /**
   * ナビゲーション処理（デモ用）
   */
  const handleNavigate = (path: string) => {
    messageApi.info(`画面遷移: ${path}`);
  };

  /**
   * メニュー切り替え処理（デモ用）
   */
  const handleMenuChange = (menuType: UserRole) => {
    if (!currentUser) return;

    // ユーザー情報は一切変更せず、表示するメニューだけを変更
    setCurrentMenuType(menuType);

    // メニュー名の取得（日本語表示用）
    const menuNames: Record<UserRole, string> = {
      provider: 'プロバイダーメニュー',
      system_admin: 'システム管理者メニュー',
      data_admin: 'データ管理者メニュー',
      experiment_admin: '実験管理者メニュー',
      experiment_worker: '実験作業者メニュー',
      mi_engineer: 'MI技術者メニュー',
    };

    messageApi.success(`${menuNames[menuType]}に切り替えました`);
  };

  // 条件分岐レンダリング
  
  // Step 1: ログイン画面
  if (authStep === 'login') {
    // 開発環境ではデバッグパネル付きのLoginPageを表示
    const debugPanel = isDevelopment ? (
      <DebugLoginPanel
        onLogin={(cred) => handleLogin({ ...cred, organizationId: 'org_lab_001' })}
        loading={loading}
        debugUsers={Object.entries(demoUsers).map(([username, data]) => ({
          username,
          password: data.password,
          displayName: data.user.displayName,
          role: data.user.role as UserRole,
        }))}
      />
    ) : undefined;

    return (
      <>
        {contextHolder}
        <LoginPage
          onLogin={handleLogin}
          error={error}
          loading={loading}
          debugPanel={debugPanel}
        />
      </>
    );
  }

  // Step 2: PINコード入力画面
  if (authStep === 'pin-code') {
    return (
      <>
        {contextHolder}
        <PinCodeInputPage
          sessionToken={sessionToken}
          organizationId={organizationId}
          maskedEmail={maskedEmail}
          onVerify={handleVerifyPin}
          onBack={handleBackToLogin}
          onResend={handleResendPin}
          error={error}
          loading={loading}
        />
      </>
    );
  }

  // Step 3: ログイン済み - メニュー表示
  if (authStep === 'authenticated' && currentUser) {
    let MenuComponent: React.ReactNode;

    switch (currentMenuType) {
      case 'provider':
        MenuComponent = (
          <ProviderMenu
            user={currentUser}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onMenuChange={handleMenuChange}
          />
        );
        break;
      case 'system_admin':
        MenuComponent = (
          <SystemAdminMenu
            user={currentUser}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onMenuChange={handleMenuChange}
          />
        );
        break;
      case 'data_admin':
        MenuComponent = (
          <DataAdminMenu
            user={currentUser}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onMenuChange={handleMenuChange}
          />
        );
        break;
      case 'experiment_admin':
        MenuComponent = (
          <ExperimentAdminMenu
            user={currentUser}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onMenuChange={handleMenuChange}
          />
        );
        break;
      case 'experiment_worker':
        MenuComponent = (
          <ExperimentWorkerMenu
            user={currentUser}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onMenuChange={handleMenuChange}
          />
        );
        break;
      default:
        MenuComponent = <div>Unknown role</div>;
    }

    return (
      <>
        {contextHolder}
        {MenuComponent}
      </>
    );
  }

  // フォールバック
  return null;
}
