'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginPage from '@/components/LoginPage';
import PinCodeInputPage from '@/components/PinCodeInputPage';
import { authService, AuthServiceError } from '@/services/authService';
import type { LoginCredentials } from '@/types/auth';

/**
 * ログインステップ
 */
type LoginStep = 'login' | 'pin-code';

/**
 * ログインページコンテナ
 * 2段階認証フロー（ログイン → PINコード入力）を実装
 */
export default function LoginPageContainer() {
  const router = useRouter();
  
  // ステップ管理
  const [step, setStep] = useState<LoginStep>('login');
  
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
      // バックエンドAPIにログインリクエスト
      const response = await authService.login(credentials);

      // ログイン成功 - PINコード送信完了
      console.log('Login successful:', response);

      // 仮セッショントークンと組織IDを保存
      setSessionToken(response.sessionToken);
      setOrganizationId(credentials.organizationId);
      setMaskedEmail(response.email);

      // PINコード入力画面へ遷移
      setStep('pin-code');
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
      const response = await authService.verifyPin(pinCode, sessionToken);

      // 検証成功
      console.log('PIN verification successful:', response);

      // ユーザー情報をSessionStorageに保存（オプション）
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user', JSON.stringify(response.user));
      }

      // リダイレクト先に遷移
      router.push(response.redirectUrl);
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
      // PINコード再送信API呼び出し
      const response = await authService.resendPin(sessionToken);

      console.log('PIN resend successful:', response);

      // マスキングメールを更新（変更されている可能性がある）
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
    setStep('login');
    setError(null);
    setSessionToken('');
    setOrganizationId('');
    setMaskedEmail('');
  };

  // 条件分岐レンダリング
  if (step === 'pin-code') {
    return (
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
    );
  }

  return (
    <LoginPage 
      onLogin={handleLogin} 
      error={error} 
      loading={loading} 
    />
  );
}
