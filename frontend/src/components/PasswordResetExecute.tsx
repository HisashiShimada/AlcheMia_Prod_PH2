'use client';

import React, { useState } from 'react';
import { Card, Input, Button, Typography, Alert, Space, theme } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, CheckOutlined } from '@ant-design/icons';
import { validatePassword } from '@/utils/validation';
import { useLanguage } from '@/contexts/LanguageContext';

const { Title, Text } = Typography;

/**
 * パスワードリセット実行画面のProps
 */
interface PasswordResetExecuteProps {
  resetToken: string;
  onSuccess: () => void;
  onSubmit: (resetToken: string, newPassword: string) => Promise<void>;
  error?: string | null;
  loading?: boolean;
}

/**
 * パスワードリセット実行画面コンポーネント
 * 新しいパスワードを入力してパスワードをリセット
 */
export default function PasswordResetExecute({
  resetToken,
  onSuccess,
  onSubmit,
  error,
  loading = false,
}: PasswordResetExecuteProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ newPassword: false, confirmPassword: false });

  // 新しいパスワードの変更ハンドラ（リアルタイムバリデーション）
  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    
    // タッチされている場合のみバリデーション
    if (touched.newPassword) {
      const result = validatePassword(value);
      setNewPasswordError(result.isValid ? null : result.error || null);
    }

    // 確認用パスワードもタッチされている場合は一致確認
    if (touched.confirmPassword && confirmPassword) {
      setConfirmPasswordError(
      value === confirmPassword ? null : t('auth.passwordReset.confirmPasswordMismatch')
      );
    }
  };

  // 確認用パスワードの変更ハンドラ（リアルタイムバリデーション）
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    
    // タッチされている場合のみバリデーション
    if (touched.confirmPassword) {
      setConfirmPasswordError(
        value === newPassword ? null : t('auth.passwordReset.confirmPasswordMismatch')
      );
    }
  };

  // フィールドのフォーカス喪失ハンドラ
  const handleNewPasswordBlur = () => {
    setTouched(prev => ({ ...prev, newPassword: true }));
    const result = validatePassword(newPassword);
    setNewPasswordError(result.isValid ? null : result.error || null);
  };

  const handleConfirmPasswordBlur = () => {
    setTouched(prev => ({ ...prev, confirmPassword: true }));
    setConfirmPasswordError(
      confirmPassword === newPassword ? null : t('auth.passwordReset.confirmPasswordMismatch')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // すべてのフィールドをタッチ済みにする
    setTouched({ newPassword: true, confirmPassword: true });

    // バリデーション実行
    const passwordValidation = validatePassword(newPassword);
    const passwordsMatch = newPassword === confirmPassword;

    // エラーを設定
    setNewPasswordError(passwordValidation.isValid ? null : passwordValidation.error || null);
    setConfirmPasswordError(passwordsMatch ? null : t('auth.passwordReset.confirmPasswordMismatch'));

    // バリデーション失敗時は送信しない
    if (!passwordValidation.isValid) {
      setValidationError(passwordValidation.error || t('auth.passwordReset.checkInputValues'));
      return;
    }

    if (!passwordsMatch) {
      setValidationError(t('auth.passwordReset.confirmPasswordMismatch'));
      return;
    }

    // パスワードリセット実行
    try {
      await onSubmit(resetToken, newPassword);
      // 成功時は親コンポーネントで処理（ログイン画面へ遷移）
      onSuccess();
    } catch (err) {
      // エラーは親コンポーネントで処理
      console.error('Password reset failed:', err);
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
      }}
    >
      <div style={{ width: '100%', maxWidth: 672, padding: `0 ${token.paddingLG * 1.5}px` }}>
        <Card
          style={{
            borderRadius: token.borderRadiusLG * 1.5,
            boxShadow: token.boxShadowSecondary,
          }}
          styles={{
            body: {
              padding: token.paddingXL * 1.5,
            },
          }}
        >
          {/* ロゴ・タイトル */}
          <Space orientation="vertical" size="middle" style={{ width: '100%', textAlign: 'center', marginBottom: token.marginXXL }}>
            <Title
              level={1}
              style={{
                margin: 0,
                color: token.colorPrimary,
                fontWeight: token.fontWeightStrong,
              }}
            >
              {t('common.appName')}
            </Title>
            <Title
              level={2}
              style={{
                margin: 0,
                fontSize: token.fontSizeHeading3,
                fontWeight: 'normal',
              }}
            >
              {t('auth.passwordReset.executeTitle')}
            </Title>
            <Text
              type="secondary"
              style={{
                fontSize: token.fontSize,
              }}
            >
              {t('auth.passwordReset.executeDescription')}
              <br />
              {t('auth.passwordReset.requirementsMin8')}
            </Text>
          </Space>

          {/* エラーメッセージ */}
          {(error || validationError) && (
            <Alert
              description={validationError || error}
              type="error"
              showIcon
              style={{
                marginBottom: token.marginXL * 1.5,
                borderRadius: token.borderRadiusLG,
                fontSize: token.fontSize,
              }}
            />
          )}

          {/* パスワードリセット実行フォーム */}
          <form onSubmit={handleSubmit}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <label
                  htmlFor="newPassword"
                  style={{
                    display: 'block',
                    marginBottom: token.marginSM,
                    fontSize: token.fontSize,
                    fontWeight: 500,
                    color: token.colorText,
                  }}
                >
                  {t('auth.passwordReset.newPassword')} <span style={{ color: token.colorError }}>*</span>
                </label>
                <Input.Password
                  id="newPassword"
                  name="newPassword"
                  size="large"
                  placeholder={t('auth.passwordReset.newPasswordPlaceholder')}
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  onBlur={handleNewPasswordBlur}
                  disabled={loading}
                  status={newPasswordError ? 'error' : ''}
                  autoComplete="new-password"
                  autoFocus
                  iconRender={(visible) =>
                    visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  }
                />
                {newPasswordError && (
                  <div style={{ color: token.colorError, fontSize: token.fontSizeSM, marginTop: token.marginXS }}>
                    {newPasswordError}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  style={{
                    display: 'block',
                    marginBottom: token.marginSM,
                    fontSize: token.fontSize,
                    fontWeight: 500,
                    color: token.colorText,
                  }}
                >
                  {t('auth.passwordReset.confirmPassword')} <span style={{ color: token.colorError }}>*</span>
                </label>
                <Input.Password
                  id="confirmPassword"
                  name="confirmPassword"
                  size="large"
                  placeholder={t('auth.passwordReset.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onBlur={handleConfirmPasswordBlur}
                  disabled={loading}
                  status={confirmPasswordError ? 'error' : ''}
                  autoComplete="new-password"
                  iconRender={(visible) =>
                    visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  }
                />
                {confirmPasswordError && (
                  <div style={{ color: token.colorError, fontSize: token.fontSizeSM, marginTop: token.marginXS }}>
                    {confirmPasswordError}
                  </div>
                )}
              </div>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                icon={<CheckOutlined />}
                disabled={loading}
                loading={loading}
                style={{
                  marginTop: token.marginSM,
                  height: token.controlHeightLG * 1.55,
                }}
              >
                {loading ? t('auth.passwordReset.changingButton') : t('auth.passwordReset.changePasswordButton')}
              </Button>
            </Space>
          </form>

          {/* フッター */}
          <div style={{ marginTop: token.marginXXL, textAlign: 'center' }}>
            <Text
              type="secondary"
              style={{
                fontSize: token.fontSizeLG,
              }}
            >
              © 2026 AIST SOLUTIONS. All rights reserved.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
