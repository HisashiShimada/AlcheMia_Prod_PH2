'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginPage from '@/components/LoginPage';
import { authService, AuthServiceError } from '@/services/authService';
import type { LoginCredentials } from '@/types/auth';

/**
 * ログインページコンテナ
 * LoginPageコンポーネントを使用してログイン機能を実装
 */
export default function LoginPageContainer() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * ログイン処理
   */
  const handleLogin = async (credentials: LoginCredentials): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      // バックエンドAPIにログインリクエスト
      const response = await authService.login(credentials);

      // ログイン成功
      console.log('Login successful:', response);

      // TODO: PINコード入力画面への遷移
      // 現在は一時的にメッセージを表示
      alert(`${response.message}\n${response.email}\n有効期限: ${response.expiresIn}秒`);

      // 将来的にはPINコード入力画面へ遷移
      // router.push(`/verify-pin?token=${response.sessionToken}`);
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

  return <LoginPage onLogin={handleLogin} error={error} loading={loading} />;
}
