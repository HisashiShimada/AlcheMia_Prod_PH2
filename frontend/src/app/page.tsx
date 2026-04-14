'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { message, Spin } from 'antd';
import LoginPage from '@/components/LoginPage';
import PinCodeInputPage from '@/components/PinCodeInputPage';
import PasswordResetRequest from '@/components/PasswordResetRequest';
import PasswordResetExecute from '@/components/PasswordResetExecute';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import ProviderMenu from '@/components/menus/ProviderMenu';
import SystemAdminMenu from '@/components/menus/SystemAdminMenu';
import DataAdminMenu from '@/components/menus/DataAdminMenu';
import ExperimentAdminMenu from '@/components/menus/ExperimentAdminMenu';
import ExperimentWorkerMenu from '@/components/menus/ExperimentWorkerMenu';
import { authService, AuthServiceError } from '@/services/authService';
import type { LoginCredentials, User, UserRole } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * 認証フロー状態
 */
type AuthStep = 'login' | 'pin-code' | 'password-reset-request' | 'password-reset-execute' | 'authenticated';

/**
 * ホームページのメインコンテンツ（useSearchParams使用のためSuspense内に配置）
 */
function HomeContent() {
  const searchParams = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useLanguage();

  // URLクエリパラメータから組織IDを取得（開発環境用）
  const orgIdFromUrl = searchParams.get('orgId') || undefined;

  // 認証フロー状態管理
  const [authStep, setAuthStep] = useState<AuthStep>('login');

  // ログイン後のユーザー情報とメニュー表示
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMenuType, setCurrentMenuType] = useState<string | null>(null);

  // 共通状態
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 自動ログイン判定中の状態
  const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(true);

  // PINコード入力に必要な情報
  const [sessionToken, setSessionToken] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');

  // パスワードリセット用の状態
  const [resetToken, setResetToken] = useState<string>('');

  // パスワード変更モーダル用の状態
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [pendingRedirectData, setPendingRedirectData] = useState<{
    user: User;
    menuType: string | null;
  } | null>(null);

  /**
   * ログイン成功後の共通処理
   * 通常ログイン（PIN免除/PIN検証成功）、自動ログインで共通の処理
   * @param user ユーザー情報
   * @param sessionToken セッショントークン
   * @param passwordChangeRequired パスワード変更が必要かどうか
   * @param context ログインコンテキスト（ログ出力用）
   * @param showSuccessMessage 成功メッセージを表示するか（自動ログイン時はfalse）
   */
  const handleLoginSuccess = (
    user: User,
    sessionToken: string,
    passwordChangeRequired: boolean,
    context: string,
    showSuccessMessage = true
  ): void => {
    // ユーザー情報とセッショントークンをLocal Storageに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem('sessionToken', sessionToken);
      localStorage.setItem('userInfo', JSON.stringify(user));
    }

    // 一時パスワードでログインした場合
    if (passwordChangeRequired) {
      console.log(`[${context}] 一時パスワードでログイン - パスワード変更モーダルを表示`);
      
      // メニュー遷移に必要な情報を保存
      setPendingRedirectData({
        user,
        menuType: user.initialScreenFunctionCd,
      });
      
      // パスワード変更モーダルを表示
      setShowChangePasswordModal(true);
    } else {
      // 通常のパスワードでログイン - メニュー画面へ遷移
      setCurrentUser(user);
      setCurrentMenuType(user.initialScreenFunctionCd);
      setAuthStep('authenticated');
      
      console.log(`[${context}] ログイン成功 - メニュー画面へ遷移`);
      
      // 通常ログイン時のみメッセージを表示（自動ログイン時は表示しない）
      if (showSuccessMessage) {
        // useEffectでメッセージを表示するため、次のティックで実行
        setTimeout(() => {
          messageApi.success(t('page.loginSuccess'));
        }, 0);
      }
    }
  };

  /**
   * ログイン処理（第1段階）
   */
  const handleLogin = async (credentials: LoginCredentials): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      // バックエンドAPIにログインリクエスト（開発環境用: URLのorgIdを渡す）
      const response = await authService.login(credentials, orgIdFromUrl);

      // 免除適用チェック: session.token が存在する場合は免除適用（直接認証完了）
      if (response.session?.token && response.user) {
        // 共通処理を呼び出し
        handleLoginSuccess(
          response.user,
          response.session.token,
          response.passwordChangeRequired || false,
          'PIN免除ログイン'
        );
      } else if (response.sessionToken && response.email) {
        // 免除非適用 - PINコード認証フロー
        // 仮セッショントークンと組織IDを保存
        setSessionToken(response.sessionToken);
        setOrganizationId(credentials.organizationId);
        setMaskedEmail(response.email);

        // Local Storageに保存（authServiceのインターセプターが参照）
        if (typeof window !== 'undefined') {
          localStorage.setItem('sessionToken', response.sessionToken);
        }

        // 開発環境の場合、PINコードをlocalStorageに保存
        if (response.devMode && response.pinCode) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('devPinCode', response.pinCode);
          }
        }

        // PINコード入力画面へ遷移
        setAuthStep('pin-code');
      } else {
        // 予期しないレスポンス形式
        setError(t('page.unexpectedResponse'));
        console.error('Unexpected response format:', response);
      }
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
        setError(t('page.unexpectedError'));
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

      // 共通処理を呼び出し
      handleLoginSuccess(
        response.user,
        response.session.token,
        response.passwordChangeRequired || false,
        'PIN検証ログイン'
      );
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
        setError(t('page.unexpectedError'));
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
        setError(t('page.unexpectedError'));
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
    // Local Storageをクリア
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sessionToken');
    }
    
    setAuthStep('login');
    setError(null);
    setSessionToken('');
    setOrganizationId('');
    setMaskedEmail('');
    setResetToken('');
  };

  /**
   * パスワードを忘れた場合のリンククリック処理
   */
  const handleForgotPassword = (): void => {
    setError(null);
    setAuthStep('password-reset-request');
  };

  /**
   * パスワードリセット要求処理
   */
  const handlePasswordResetRequest = async (email: string): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      const response = await authService.resetPasswordRequest(email, orgIdFromUrl);
      console.log('Password reset request successful:', response);
      
      messageApi.success(t('page.passwordResetEmailSent'), 5);
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setError(err.message);
        console.error('Password reset request error:', {
          code: err.code,
          message: err.message,
          details: err.details,
        });
      } else {
        setError(t('page.unexpectedError'));
        console.error('Unexpected error:', err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * パスワードリセット実行処理
   */
  const handlePasswordResetExecute = async (resetToken: string, newPassword: string): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      const response = await authService.resetPassword(resetToken, newPassword);
      console.log('Password reset successful:', response);
      
      messageApi.success(t('page.passwordResetSuccess'), 5);
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setError(err.message);
        console.error('Password reset error:', {
          code: err.code,
          message: err.message,
          details: err.details,
        });
      } else {
        setError(t('page.unexpectedError'));
        console.error('Unexpected error:', err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * パスワード変更成功ハンドラ
   */
  const handleChangePasswordSuccess = (): void => {
    // パスワード変更モーダルを閉じる
    setShowChangePasswordModal(false);
    
    // 保存しておいたリダイレクト情報を使用してメニュー画面へ遷移
    if (pendingRedirectData) {
      setCurrentUser(pendingRedirectData.user);
      setCurrentMenuType(pendingRedirectData.menuType);
      setAuthStep('authenticated');
      
      // リダイレクトデータをクリア
      setPendingRedirectData(null);
      
      messageApi.success(t('page.loginSuccess'));
    }
  };

  /**
   * 自動ログイン機能（ページロード時）
   * Redisのリフレッシュトークン確認 + Local Storageのユーザー情報で復元
   */
  React.useEffect(() => {
    // 既にログイン済み、またはPINコード入力中の場合はスキップ
    if (authStep !== 'login') {
      setIsCheckingAutoLogin(false);
      return;
    }

    // 初回のみ実行（無限ループ防止）
    let hasAttempted = false;

    const attemptAutoLogin = async () => {
      if (hasAttempted) {
        return;
      }
      hasAttempted = true;

      try {
        // 1. refreshAccessToken()でRedisのリフレッシュトークンを確認
        // （httpOnly Cookieが自動送信される）
        // DB負荷を避けるため、アクセストークンのみ取得（ユーザー情報は取得しない）
        const accessToken = await authService.refreshAccessToken();
        
        if (accessToken) {
          // 2. Redisにリフレッシュトークンが存在 → 新しいアクセストークンを取得
          // 3. Local Storageから既存のユーザー情報を取得（必須）
          if (typeof window !== 'undefined') {
            const existingUserInfo = localStorage.getItem('userInfo');
            
            if (existingUserInfo) {
              try {
                const user = JSON.parse(existingUserInfo);
                
                // バリデーション: 必須フィールドの確認
                if (user.id && user.username && user.initialScreenFunctionCd) {
                  // 4. Local Storageのユーザー情報 + 新しいアクセストークンでログイン
                  handleLoginSuccess(user, accessToken, false, 'Auto-Login', false);
                  return;
                }
              } catch (parseError) {
                // パースエラー: 通常ログイン画面を表示
                console.log('[Auto-Login] userInfo parse error:', parseError);
              }
            }
          }
        }
      } catch {
        // 失敗: 静かにログイン画面を表示（エラーメッセージなし）
        // エラー状態は設定しない（ユーザーに通知しない）
      } finally {
        // チェック完了
        setIsCheckingAutoLogin(false);
      }
    };

    attemptAutoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列を空にして初回のみ実行（authStepとhandleLoginSuccessは意図的に除外）

  /**
   * 自動ログアウトイベントのリスナー
   * authUtils.tsからのカスタムイベントを受信してログイン画面へ遷移
   */
  React.useEffect(() => {
    let isProcessing = false;

    const handleAutoLogout = (event: Event) => {
      const customEvent = event as CustomEvent<{ reason: string }>;
      console.log('[Auto-Logout] Session expired:', customEvent.detail);
      
      // 既にログイン画面の場合は何もしない
      if (authStep === 'login') {
        return;
      }
      
      // 重複実行を防ぐ
      if (isProcessing) {
        return;
      }
      
      isProcessing = true;
      
      // 状態をリセット（通常のログアウトと同じ処理）
      setCurrentUser(null);
      setCurrentMenuType(null);
      setAuthStep('login');
      setSessionToken('');
      setOrganizationId('');
      setMaskedEmail('');
      setError(null);
      
      // Local Storageをクリア
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('devPinCode');
      }
      
      // ユーザーに通知
      messageApi.warning(t('page.sessionExpired'));
      
      // 処理完了後、フラグをリセット
      setTimeout(() => {
        isProcessing = false;
      }, 1000);
    };

    // イベントリスナーを登録
    window.addEventListener('auth:auto-logout', handleAutoLogout);

    // クリーンアップ
    return () => {
      window.removeEventListener('auth:auto-logout', handleAutoLogout);
    };
  }, [authStep, messageApi]);

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    try {
      // バックエンドのログアウトAPIを呼び出し
      await authService.logout();
      messageApi.success(t('page.logoutSuccess'));
    } catch (error) {
      // エラーが発生してもローカル状態はクリアする
      console.error('Logout API error:', error);
      
      // 401エラーの場合は自動ログアウトイベントで処理されるため、メッセージを表示しない
      if (error instanceof AuthServiceError && error.code === 'E5002') {
        // メッセージ表示なし（自動ログアウトイベントで表示済み）
      } else if (error instanceof AuthServiceError) {
        messageApi.warning(`${t('page.logoutError')}: ${error.message}`);
      } else {
        messageApi.warning(t('page.logoutError'));
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
      
      // Local Storageをクリア
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('devPinCode');
      }
    }
  };

  /**
   * ナビゲーション処理（デモ用）
   */
  const handleNavigate = (path: string) => {
    messageApi.info(`${t('page.navigate')}: ${path}`);
  };

  /**
   * メニュー切り替え処理（デモ用）
   */
  const handleMenuChange = (menuType: UserRole) => {
    if (!currentUser) return;

    // UserRoleを数値コード（initialScreenFunctionCd）に変換
    const functionCodeMap: Record<UserRole, string> = {
      provider: '010000',
      system_admin: '020000',
      data_admin: '030000',
      experiment_admin: '040000',
      experiment_worker: '050000',
      mi_engineer: '060000',
    };

    const functionCode = functionCodeMap[menuType];
    if (!functionCode) {
      messageApi.error(`${t('page.undefinedMenuType')}: ${menuType}`);
      return;
    }

    // 数値コードで設定（switchケースと一致する形式）
    setCurrentMenuType(functionCode);

    // メニュー名の取得（多言語対応）
    const menuNames: Record<UserRole, string> = {
      provider: t('page.menuName.provider'),
      system_admin: t('page.menuName.systemAdmin'),
      data_admin: t('page.menuName.dataAdmin'),
      experiment_admin: t('page.menuName.experimentAdmin'),
      experiment_worker: t('page.menuName.experimentWorker'),
      mi_engineer: t('page.menuName.miEngineer'),
    };

    messageApi.success(`${menuNames[menuType]}${t('page.menuSwitched')}`);
  };

  // 条件分岐レンダリング
  
  // ローディング画面: 自動ログイン判定中
  if (isCheckingAutoLogin) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#f0f2f5',
        }}
      >
        <Spin size="large" />
        <div style={{ fontSize: '16px', color: '#595959' }}>
          {t('page.checkingLoginStatus')}
        </div>
      </div>
    );
  }
  
  // Step 1: ログイン画面
  if (authStep === 'login') {
    return (
      <>
        {contextHolder}
        <LoginPage
          onLogin={handleLogin}
          onForgotPassword={handleForgotPassword}
          error={error}
          loading={loading}
        />
        {/* パスワード変更モーダル（一時パスワードでログイン時に表示） */}
        <ChangePasswordModal
          open={showChangePasswordModal}
          onSuccess={handleChangePasswordSuccess}
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
        {/* パスワード変更モーダル（一時パスワードでログイン時に表示） */}
        <ChangePasswordModal
          open={showChangePasswordModal}
          onSuccess={handleChangePasswordSuccess}
        />
      </>
    );
  }

  // Step 3: パスワードリセット要求画面
  if (authStep === 'password-reset-request') {
    return (
      <>
        {contextHolder}
        <PasswordResetRequest
          onBack={handleBackToLogin}
          onSuccess={handlePasswordResetRequest}
          organizationId={orgIdFromUrl}
          error={error}
          loading={loading}
        />
      </>
    );
  }

  // Step 4: パスワードリセット実行画面
  if (authStep === 'password-reset-execute') {
    return (
      <>
        {contextHolder}
        <PasswordResetExecute
          resetToken={resetToken}
          onSuccess={handleBackToLogin}
          onSubmit={handlePasswordResetExecute}
          error={error}
          loading={loading}
        />
      </>
    );
  }

  // Step 5: ログイン済み - メニュー表示
  if (authStep === 'authenticated' && currentUser) {
    let MenuComponent: React.ReactNode;

    // initialScreenFunctionCd（数値コード）で分岐
    switch (currentMenuType) {
      case '010000':  // プロバイダーメニュー
        MenuComponent = (
          <ProviderMenu
            user={currentUser}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onMenuChange={handleMenuChange}
          />
        );
        break;
      case '020000':  // システム管理者メニュー
        MenuComponent = (
          <SystemAdminMenu
            user={currentUser}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onMenuChange={handleMenuChange}
          />
        );
        break;
      case '030000':  // データ管理者メニュー
        MenuComponent = (
          <DataAdminMenu
            user={currentUser}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onMenuChange={handleMenuChange}
          />
        );
        break;
      case '040000':  // 実験管理者メニュー
        MenuComponent = (
          <ExperimentAdminMenu
            user={currentUser}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onMenuChange={handleMenuChange}
          />
        );
        break;
      case '050000':  // 実験作業者メニュー
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
        MenuComponent = <div>{t('page.undefinedFunctionCode')}: {currentMenuType}</div>;
    }

    return (
      <>
        {contextHolder}
        {MenuComponent}
      </>
    );
  }

  // フォールバック
  return (
    <>
      {contextHolder}
      {/* パスワード変更モーダル（一時パスワードでログイン時に表示） */}
      <ChangePasswordModal
        open={showChangePasswordModal}
        onSuccess={handleChangePasswordSuccess}
      />
    </>
  );
}

/**
 * ホームページ（エクスポート用）
 * useSearchParams() を使用する HomeContent を Suspense でラップする
 */
export default function Home() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: '#f0f2f5',
          }}
        >
          <Spin size="large" />
          <div style={{ fontSize: '16px', color: '#595959' }}>
            読み込み中...
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
