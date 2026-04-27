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
import { login } from '../../utils/authApi';
import type { LoginResponse } from '../../types/auth';
import { extractErrorMessage } from '@/utils/errorUtils';

const { useToken } = theme;

interface LoginFormProps {
  /**
   * ログイン成功時のコールバック
   * @param response - ログインAPIレスポンス
   */
  onSuccess: (response: LoginResponse) => void;
  
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
      const response = await login(
        values.username.trim(),
        values.password,
        organizationId
      );
      
      onSuccess(response);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
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
          label="ユーザー名"
          rules={[
            { required: true, message: 'ユーザー名を入力してください' },
            { min: 1, max: 100, message: 'ユーザー名は1-100文字で入力してください' },
          ]}
        >
          <Input
            prefix={<UserOutlined style={{ color: token.colorTextSecondary }} />}
            placeholder="ユーザー名を入力"
            autoComplete="username"
            disabled={loading}
          />
        </Form.Item>

        {/* パスワード入力 */}
        <Form.Item
          name="password"
          label="パスワード"
          rules={[
            { required: true, message: 'パスワードを入力してください' },
            { min: 8, max: 255, message: 'パスワードは8-255文字で入力してください' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
            placeholder="パスワードを入力"
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
            ログイン
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
            パスワードをお忘れですか？
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
