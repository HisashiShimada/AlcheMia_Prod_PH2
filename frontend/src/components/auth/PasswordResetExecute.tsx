'use client';

/**
 * PasswordResetExecute - パスワード変更実行フォームコンポーネント
 * 
 * リセットトークンを使用して新しいパスワードを設定します。
 */

import React, { useState } from 'react';
import { Form, Input, Button, Alert, Typography, Space, theme } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { resetPassword } from '../../utils/authApi';
import { extractErrorMessage } from '@/utils/errorUtils';
import { useLanguage } from '@/contexts/LanguageContext';

const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

interface PasswordResetExecuteProps {
  /**
   * リセットトークン
   */
  resetToken: string;
  
  /**
   * パスワード変更成功時のコールバック
   */
  onSuccess: () => void;
  
  /**
   * エラー発生時のコールバック
   */
  onError: (error: string) => void;
}

interface ResetFormValues {
  newPassword: string;
  confirmPassword: string;
}

/**
 * PasswordResetExecute コンポーネント
 */
export default function PasswordResetExecute({
  resetToken,
  onSuccess,
  onError,
}: PasswordResetExecuteProps) {
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
      await resetPassword(resetToken, values.newPassword);
      
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
          {t('auth.passwordReset.executeTitle')}
        </Title>
        <Paragraph style={{ textAlign: 'center', color: token.colorTextSecondary }}>
          {t('auth.passwordReset.executeDescription')}
        </Paragraph>
      </div>

      {/* パスワード要件の表示 */}
      <Alert
        title={t('auth.passwordReset.requirementsTitle')}
        description={
          <Space orientation="vertical" size="small">
            <Text>
              <CheckCircleOutlined style={{ color: token.colorSuccess, marginRight: 8 }} />
              {t('auth.passwordReset.requirementsLength')}
            </Text>
            <Text>
              <CheckCircleOutlined style={{ color: token.colorSuccess, marginRight: 8 }} />
              {t('auth.passwordReset.requirementsComplexity')}
            </Text>
          </Space>
        }
        type="info"
        showIcon={false}
        style={{ marginBottom: token.marginMD }}
      />

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
        name="password-reset-execute"
        onFinish={handleSubmit}
        size="large"
        layout="vertical"
      >
        {/* 新しいパスワード入力 */}
        <Form.Item
          name="newPassword"
          label={t('auth.passwordReset.newPassword')}
          rules={[
            { required: true, message: t('auth.passwordReset.newPasswordRequired') },
            { min: 8, message: t('auth.passwordReset.newPasswordMinLength') },
            { max: 255, message: t('auth.passwordReset.newPasswordMaxLength') },
          ]}
          hasFeedback
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
            placeholder={t('auth.passwordReset.newPasswordPlaceholder')}
            autoComplete="new-password"
            disabled={loading}
          />
        </Form.Item>

        {/* パスワード確認入力 */}
        <Form.Item
          name="confirmPassword"
          label={t('auth.passwordReset.confirmPassword')}
          dependencies={['newPassword']}
          rules={[
            { required: true, message: t('auth.passwordReset.confirmPasswordRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('auth.passwordReset.confirmPasswordMismatch')));
              },
            }),
          ]}
          hasFeedback
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
            placeholder={t('auth.passwordReset.confirmPasswordPlaceholder')}
            autoComplete="new-password"
            disabled={loading}
          />
        </Form.Item>

        {/* 変更ボタン */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            {t('auth.passwordReset.changePasswordButton')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
