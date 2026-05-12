'use client';

/**
 * LoginForm - ログインフォームコンポーネント
 * 
 * ユーザー名とパスワードを入力し、初回認証を行うフォーム。
 * 認証成功時はPINコード入力画面に遷移するための情報を返します。
 */

import React, { useState } from 'react';
import { Form, Input, Button, Alert, theme } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authService, AuthServiceError } from '@/services/authService';
import type { LoginResponseData } from '@/types/api';
import { extractErrorMessage } from '@/utils/errorUtils';
import { useLanguage } from '@/contexts/LanguageContext';

const { useToken } = theme;

interface LoginFormProps {
  /**
   * ログイン成功時のコールバック
   * @param response - ログインAPIレスポンス
   */
  onSuccess: (response: LoginResponseData) => void;
  
  /**
   * ログイン失敗時のコールバック
   * @param error - エラーメッセージ
   */
  onError: (error: string) => void;
  
  /**
   * パスワードリセットリンククリック時のコールバック
   */
  onPasswordReset: () => void;
  
  /**
   * 組織ID
   */
  organizationId: string;
}

interface LoginFormValues {
  username: string;
  password: string;
}

/**
 * LoginForm コンポーネント
 */
export default function LoginForm({
  onSuccess,
  onError,
  onPasswordReset,
  organizationId,
}: LoginFormProps) {
  const { token } = useToken();
  const { t } = useLanguage();
  const [form] = Form.useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * フォーム送信ハンドラ
   */
  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(
        { userId: values.username.trim(), password: values.password, organizationId },
        organizationId
      );
      
      onSuccess(response);
    } catch (err) {
      const errorMessage = err instanceof AuthServiceError ? err.message : extractErrorMessage(err);
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '0 auto',
        padding: token.paddingLG,
      }}
    >
      {/* エラーメッセージ表示 */}
      {error && (
        <Alert
          title={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: token.marginMD }}
        />
      )}

      <Form
        form={form}
        name="login"
        onFinish={handleSubmit}
        size="large"
        autoComplete="off"
        layout="vertical"
      >
        {/* ユーザー名入力 */}
        <Form.Item
          name="username"
          label={t('auth.login.username')}
          rules={[
            { required: true, message: t('auth.login.usernameRequired') },
            { min: 1, max: 100, message: t('auth.login.usernameLengthError') },
          ]}
        >
          <Input
            prefix={<UserOutlined style={{ color: token.colorTextSecondary }} />}
            placeholder={t('auth.login.usernamePlaceholder')}
            autoComplete="username"
            disabled={loading}
          />
        </Form.Item>

        {/* パスワード入力 */}
        <Form.Item
          name="password"
          label={t('auth.login.password')}
          rules={[
            { required: true, message: t('auth.login.passwordRequired') },
            { min: 8, max: 255, message: t('auth.login.passwordLengthError') },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
            placeholder={t('auth.login.passwordPlaceholder')}
            autoComplete="current-password"
            disabled={loading}
          />
        </Form.Item>

        {/* ログインボタン */}
        <Form.Item style={{ marginBottom: token.marginSM }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            {t('auth.login.loginButton')}
          </Button>
        </Form.Item>

        {/* パスワードリセットリンク */}
        <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
          <Button
            type="link"
            onClick={onPasswordReset}
            disabled={loading}
            style={{ padding: 0 }}
          >
            {t('auth.login.forgotPassword')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
