'use client';

/**
 * PasswordResetRequest - パスワードリセット要求フォームコンポーネント
 * 
 * ユーザー名を入力してパスワードリセット用のリンクをメールで送信します。
 */

import React, { useState } from 'react';
import { Form, Input, Button, Alert, Typography, theme } from 'antd';
import { UserOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { authService } from '@/services/authService';
import { AuthServiceError } from '@/types/error';
import { extractErrorMessage } from '@/utils/errorUtils';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
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
      await authService.resetPasswordRequest(values.username.trim(), organizationId);
      
      // 成功時は親コンポーネントに通知
      onSuccess();
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
      {/* タイトルと説明 */}
      <div style={{ marginBottom: token.marginLG }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: token.marginMD }}>
          {t('auth.passwordReset.requestTitle')}
        </Title>
        <Paragraph style={{ textAlign: 'center', color: token.colorTextSecondary }}>
          {t('auth.passwordReset.requestDescription')}
          <br />
          {t('auth.passwordReset.requestDescriptionSub')}
        </Paragraph>
      </div>

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
        name="password-reset-request"
        onFinish={handleSubmit}
        size="large"
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

        {/* 送信ボタン */}
        <Form.Item style={{ marginBottom: token.marginSM }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            {t('auth.passwordReset.sendResetLinkButton')}
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
            {t('auth.passwordReset.backToLogin')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
