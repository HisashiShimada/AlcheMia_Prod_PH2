'use client';

/**
 * PasswordResetRequest - パスワードリセット要求フォームコンポーネント
 * 
 * ユーザー名を入力してパスワードリセット用のリンクをメールで送信します。
 */

import React, { useState } from 'react';
import { Form, Input, Button, Alert, Typography, theme } from 'antd';
import { UserOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { resetPasswordRequest } from '../../utils/authApi';
import { extractErrorMessage } from '@/utils/errorUtils';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

interface PasswordResetRequestProps {
  /**
   * リセットリンク送信成功時のコールバック
   */
  onSuccess: () => void;
  
  /**
   * エラー発生時のコールバック
   */
  onError: (error: string) => void;
  
  /**
   * ログイン画面に戻るコールバック
   */
  onBackToLogin: () => void;
  
  /**
   * 組織ID
   */
  organizationId: string;
}

interface ResetFormValues {
  username: string;
}

/**
 * PasswordResetRequest コンポーネント
 */
export default function PasswordResetRequest({
  onSuccess,
  onError,
  onBackToLogin,
  organizationId,
}: PasswordResetRequestProps) {
  const { token } = useToken();
  const [form] = Form.useForm<ResetFormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * フォーム送信ハンドラ
   */
  const handleSubmit = async (values: ResetFormValues) => {
    setLoading(true);
    setError(null);

    try {
      await resetPasswordRequest(values.username.trim(), organizationId);
      
      // 成功時は親コンポーネントに通知
      onSuccess();
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
      {/* タイトルと説明 */}
      <div style={{ marginBottom: token.marginLG }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: token.marginMD }}>
          パスワードリセット
        </Title>
        <Paragraph style={{ textAlign: 'center', color: token.colorTextSecondary }}>
          ユーザー名を入力してください。
          <br />
          パスワードリセット用のリンクをメールで送信します。
        </Paragraph>
      </div>

      {/* エラーメッセージ表示 */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: token.marginMD }}
        />
      )}

      <Form
        form={form}
        name="password-reset-request"
        onFinish={handleSubmit}
        size="large"
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

        {/* 送信ボタン */}
        <Form.Item style={{ marginBottom: token.marginSM }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            リセットリンクを送信
          </Button>
        </Form.Item>

        {/* ログイン画面に戻るリンク */}
        <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={onBackToLogin}
            disabled={loading}
            style={{ padding: 0 }}
          >
            ログイン画面に戻る
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
