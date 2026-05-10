'use client';

/**
 * AuthContainer - 認証フロー統合コンポーネント
 * 
 * 認証フロー全体の状態管理とコンポーネント切り替えを行います。
 * State Machineパターンで状態遷移を管理します。
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Typography, message, theme } from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';
import LoginForm from './LoginForm';
import PINCodeForm from './PINCodeForm';
import PasswordResetRequest from './PasswordResetRequest';
import type {
  AuthFlowState,
  LoginResponse,
  VerifyPINResponse,
  UserRole,
  ROLE_REDIRECT_MAP,
} from '../../types/auth';

const { Title } = Typography;
const { useToken } = theme;

interface AuthContainerProps {
  /**
   * 組織ID
   */
  organizationId: string;
  
  /**
   * ロール別リダイレクトマップ
   */
  roleRedirectMap: typeof ROLE_REDIRECT_MAP;
}

/**
 * AuthContainer コンポーネント
 */
export default function AuthContainer({
  organizationId,
  roleRedirectMap,
}: AuthContainerProps) {
  const { token } = useToken();
  const router = useRouter();
  const { t } = useLanguage();
  
  // 認証フロー状態
  const [flowState, setFlowState] = useState<AuthFlowState>('login');
  
  // セッション情報
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [pinExpiresIn, setPinExpiresIn] = useState<number | null>(null);

  /**
   * ログイン成功ハンドラ
   */
  const handleLoginSuccess = (response: LoginResponse) => {
    // SessionStorageに保存（authServiceのインターセプターが参照）
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sessionToken', response.sessionToken);
    }
    
    setSessionToken(response.sessionToken);
    setMaskedEmail(response.email);
    setPinExpiresIn(response.expiresIn);
    setFlowState('pin-input');
    
    message.success(response.message);
  };

  /**
   * ログインエラーハンドラ
   */
  const handleLoginError = (error: string) => {
    message.error(error);
  };

  /**
   * PINコード検証成功ハンドラ
   */
  const handlePINVerifySuccess = (response: VerifyPINResponse) => {
    message.success(t('auth.loginSuccess'));
    
    // JWTトークンをsessionStorageに保存
    // 仮セッショントークンを上書き（同じキー名を使用）
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sessionToken', response.session.token);
    }
    
    // ロール別画面にリダイレクト
    const redirectUrl = response.redirectUrl || roleRedirectMap[response.user.roleCd as UserRole] || '/';
    router.push(redirectUrl);
  };

  /**
   * PINコード検証エラーハンドラ
   */
  const handlePINVerifyError = (error: string) => {
    message.error(error);
  };

  /**
   * PINコード試行回数超過ハンドラ
   */
  const handlePINMaxAttemptsExceeded = () => {
    message.error(t('auth.pinMaxAttemptsExceeded'));
    
    // SessionStorageをクリア
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sessionToken');
    }
    
    // ログイン画面に戻る
    setFlowState('login');
    setSessionToken(null);
    setMaskedEmail(null);
    setPinExpiresIn(null);
  };

  /**
   * パスワードリセット要求成功ハンドラ
   */
  const handleResetRequestSuccess = () => {
    setFlowState('reset-sent');
    message.success(t('auth.passwordReset.resetLinkSent'));
  };

  /**
   * パスワードリセット要求エラーハンドラ
   */
  const handleResetRequestError = (error: string) => {
    message.error(error);
  };

  /**
   * ログイン画面に戻るハンドラ
   */
  const handleBackToLogin = () => {
    // SessionStorageをクリア
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sessionToken');
    }
    
    setFlowState('login');
    setSessionToken(null);
    setMaskedEmail(null);
    setPinExpiresIn(null);
  };

  /**
   * パスワードリセット画面に遷移するハンドラ
   */
  const handleNavigateToPasswordReset = () => {
    setFlowState('reset-request');
  };

  /**
   * 状態に応じたタイトルを取得
   */
  const getTitle = (): string => {
    switch (flowState) {
      case 'login':
        return t('auth.title.login');
      case 'pin-input':
        return t('auth.title.pinInput');
      case 'reset-request':
        return t('auth.title.resetRequest');
      case 'reset-sent':
        return t('auth.title.resetSent');
      default:
        return t('auth.title.login');
    }
  };

  /**
   * 状態に応じたコンポーネントをレンダリング
   */
  const renderContent = () => {
    switch (flowState) {
      case 'login':
        return (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            onPasswordReset={handleNavigateToPasswordReset}
            organizationId={organizationId}
          />
        );

      case 'pin-input':
        if (!sessionToken || !maskedEmail || pinExpiresIn === null) {
          // 状態が不正な場合はログイン画面に戻る
          setFlowState('login');
          return null;
        }
        return (
          <PINCodeForm
            sessionToken={sessionToken}
            maskedEmail={maskedEmail}
            initialExpiresIn={pinExpiresIn}
            onSuccess={handlePINVerifySuccess}
            onError={handlePINVerifyError}
            onMaxAttemptsExceeded={handlePINMaxAttemptsExceeded}
            organizationId={organizationId}
          />
        );

      case 'reset-request':
        return (
          <PasswordResetRequest
            onSuccess={handleResetRequestSuccess}
            onError={handleResetRequestError}
            onBackToLogin={handleBackToLogin}
            organizationId={organizationId}
          />
        );

      case 'reset-sent':
        return (
          <div style={{ textAlign: 'center', padding: token.paddingLG }}>
            <Typography.Paragraph>
              {t('auth.passwordReset.resetSentDescription')}
            </Typography.Paragraph>
            <Typography.Link onClick={handleBackToLogin}>
              {t('auth.passwordReset.backToLogin')}
            </Typography.Link>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: token.colorBgLayout,
        padding: token.padding,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '500px',
          boxShadow: token.boxShadow,
        }}
      >
        <Title
          level={2}
          style={{
            textAlign: 'center',
            marginBottom: token.marginLG,
            color: token.colorPrimary,
          }}
        >
          {getTitle()}
        </Title>
        
        {renderContent()}
      </Card>
    </div>
  );
}
