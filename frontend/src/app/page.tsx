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

/**
 * 認証フロー状態
 */
type AuthStep = 'login' | 'pin-code' | 'authenticated';

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
  const [currentMenuType, setCurrentMenuType] = useState<string | null>(null);

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
      // initialScreenFunctionCdを使用して画面を決定
      setCurrentMenuType(response.user.initialScreenFunctionCd);
      setAuthStep('authenticated');

      // ユーザー情報とセッショントークンをSessionStorageに保存
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sessionToken', response.session.token); // セッショントークンを保存
        sessionStorage.setItem('userInfo', JSON.stringify(response.user)); // UserInfoを保存
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
   * 自動ログアウトイベントのリスナー
   * authUtils.tsからのカスタムイベントを受信してログイン画面へ遷移
   */
  React.useEffect(() => {
    // 重複実行を防ぐフラグ
    let isProcessing = false;

    const handleAutoLogout = (event: Event) => {
      const customEvent = event as CustomEvent<{ reason: string }>;
      
      // 既にログイン画面の場合は何もしない
      if (authStep === 'login') {
        console.log('[Home] 既にログイン画面です。処理をスキップします。');
        return;
      }
      
      // 重複実行を防ぐ
      if (isProcessing) {
        console.log('[Home] 自動ログアウト処理中です。重複実行を防ぎます。');
        return;
      }
      
      isProcessing = true;
      console.log('[Home] 自動ログアウトイベント受信:', customEvent.detail);
      
      // 状態をリセット（通常のログアウトと同じ処理）
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
        sessionStorage.removeItem('userInfo');
        sessionStorage.removeItem('devPinCode');
        
        // Cookieからリフレッシュトークンを削除
        document.cookie = 'refreshToken=; path=/api/v1/auth; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        console.log('[Home] Cookieからリフレッシュトークンを削除しました');
      }
      
      // ユーザーに通知（1回だけ）
      messageApi.warning('セッションが期限切れになりました。再度ログインしてください。');
      
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
      messageApi.success('ログアウトしました');
    } catch (error) {
      // エラーが発生してもローカル状態はクリアする
      console.error('Logout API error:', error);
      
      // 401エラーの場合は自動ログアウトイベントで処理されるため、メッセージを表示しない
      if (error instanceof AuthServiceError && error.code === 'AUTH_TOKEN_EXPIRED') {
        console.log('[handleLogout] セッション期限切れエラー: 自動ログアウトイベントで処理されます');
        // メッセージ表示なし（自動ログアウトイベントで表示済み）
      } else if (error instanceof AuthServiceError) {
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
        sessionStorage.removeItem('userInfo');
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
      messageApi.error(`未定義のメニュータイプ: ${menuType}`);
      return;
    }

    // 数値コードで設定（switchケースと一致する形式）
    setCurrentMenuType(functionCode);

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
    return (
      <>
        {contextHolder}
        <LoginPage
          onLogin={handleLogin}
          error={error}
          loading={loading}
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
        MenuComponent = <div>未定義の機能コード: {currentMenuType}</div>;
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
