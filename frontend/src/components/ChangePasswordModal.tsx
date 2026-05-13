/**
 * パスワード変更モーダル
 * 一時パスワードでログインした後、パスワード変更を促すモーダル
 */

import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Space } from 'antd';
import { LockOutlined, EyeTwoTone, EyeInvisibleOutlined } from '@ant-design/icons';
import { authService, AuthServiceError } from '@/services/authService';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChangePasswordModalProps {
  open: boolean;
  onSuccess: () => void;
  /** モーダルを表示する理由。'temporary': 仮パスワード, 'expired': 有効期限切れ */
  reason?: 'temporary' | 'expired';
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onSuccess,
  reason = 'temporary',
}) => {
  const { t } = useLanguage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * パスワード変更処理
   */
  const handleSubmit = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      // パスワード変更API呼び出し
      await authService.changePassword(values.currentPassword, values.newPassword);

      // フォームをリセットして成功コールバックを呼び出す
      form.resetFields();
      onSuccess();
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setError(err.message);
      } else {
        setError(t('auth.changePassword.errorMessage'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={t('auth.changePassword.title')}
      open={open}
      footer={null}
      maskClosable={false}
      closable={false}
      width={500}
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          title={
            reason === 'expired'
              ? t('auth.changePassword.expiredAlertTitle')
              : t('auth.changePassword.alertTitle')
          }
          description={
            reason === 'expired'
              ? t('auth.changePassword.expiredAlertDescription')
              : t('auth.changePassword.alertDescription')
          }
          type="warning"
          showIcon
        />

        {error && (
          <Alert
            title={t('common.error')}
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          {/* 現在のパスワード */}
          <Form.Item
            name="currentPassword"
            label={t('auth.changePassword.currentPasswordLabel')}
            rules={[
              { required: true, message: t('auth.changePassword.currentPasswordRequired') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.changePassword.currentPasswordPlaceholder')}
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          {/* 新しいパスワード */}
          <Form.Item
            name="newPassword"
            label={t('auth.changePassword.newPasswordLabel')}
            rules={[
              { required: true, message: t('auth.changePassword.newPasswordRequired') },
              { min: 8, message: t('auth.changePassword.newPasswordMin8') },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: t('auth.changePassword.newPasswordPattern'),
              },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.changePassword.newPasswordPlaceholder')}
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          {/* 新しいパスワード（確認） */}
          <Form.Item
            name="confirmPassword"
            label={t('auth.changePassword.confirmPasswordLabel')}
            dependencies={['newPassword']}
            hasFeedback
            rules={[
              { required: true, message: t('auth.changePassword.confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('auth.passwordReset.confirmPasswordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.passwordReset.confirmPasswordPlaceholder')}
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          {/* ボタン */}
          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
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
      </Space>
    </Modal>
  );
};

export default ChangePasswordModal;
