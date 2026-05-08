'use client';

import React, { useState } from 'react';
import { Card, Input, Button, Typography, Alert, Space, theme } from 'antd';
import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons';
import { validateUsername } from '@/utils/validation';
import { useLanguage } from '@/contexts/LanguageContext';

const { Title, Text } = Typography;

/**
 * パスワードリセット要求画面のProps
 */
interface PasswordResetRequestProps {
  onBack: () => void;
  onSuccess: (email: string) => Promise<void>;
  organizationId?: string;
  error?: string | null;
  loading?: boolean;
}

/**
 * パスワードリセット要求画面コンポーネント
 * メールアドレスを入力してパスワードリセットのご案内を送信
 */
export default function PasswordResetRequest({
  onBack,
  onSuccess,
  organizationId,
  error,
  loading = false,
}: PasswordResetRequestProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // メールアドレスの変更ハンドラ（リアルタイムバリデーション）
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setSuccessMessage(null); // 入力開始時に成功メッセージをクリア
    
    // タッチされている場合のみバリデーション
    if (touched.email) {
      const result = validateUsername(value);
      setEmailError(result.isValid ? null : result.error || null);
    }
  };

  // フィールドのフォーカス喪失ハンドラ
  const handleEmailBlur = () => {
    setTouched({ email: true });
    const result = validateUsername(email);
    setEmailError(result.isValid ? null : result.error || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    // すべてのフィールドをタッチ済みにする
    setTouched({ email: true });

    // バリデーション実行
    const emailValidation = validateUsername(email);

    // エラーを設定
    setEmailError(emailValidation.isValid ? null : emailValidation.error || null);

    // バリデーション失敗時は送信しない
    if (!emailValidation.isValid) {
      setValidationError(emailValidation.error || t('auth.passwordReset.checkInputValues'));
      return;
    }

    // パスワードリセット要求処理
    try {
      await onSuccess(email.trim());
      // 成功時のメッセージは親コンポーネントで処理されることを想定
      // しかし、画面遷移しない場合のために、ここでもメッセージを表示
      setSuccessMessage(t('page.passwordResetEmailSent'));
    } catch (err) {
      // エラーは親コンポーネントで処理
      console.error('Password reset request failed:', err);
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
              {t('auth.passwordReset.requestTitle')}
            </Title>
            <Text
              type="secondary"
              style={{
                fontSize: token.fontSize,
              }}
            >
              {t('auth.passwordReset.requestDescriptionEmail')}
              <br />
              {t('auth.passwordReset.requestDescriptionEmailSub')}
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

          {/* 成功メッセージ */}
          {successMessage && (
            <Alert
              description={successMessage}
              type="success"
              showIcon
              style={{
                marginBottom: token.marginXL * 1.5,
                borderRadius: token.borderRadiusLG,
                fontSize: token.fontSize,
              }}
            />
          )}

          {/* パスワードリセット要求フォーム */}
          <form onSubmit={handleSubmit}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    marginBottom: token.marginSM,
                    fontSize: token.fontSize,
                    fontWeight: 500,
                    color: token.colorText,
                  }}
                >
                  {t('auth.passwordReset.emailLabel')} <span style={{ color: token.colorError }}>*</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  size="large"
                  placeholder={t('auth.passwordReset.emailPlaceholder')}
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  disabled={loading}
                  status={emailError ? 'error' : ''}
                  autoComplete="email"
                  autoFocus
                />
                {emailError && (
                  <div style={{ color: token.colorError, fontSize: token.fontSizeSM, marginTop: token.marginXS }}>
                    {emailError}
                  </div>
                )}
              </div>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                icon={<SendOutlined />}
                disabled={loading}
                loading={loading}
                style={{
                  marginTop: token.marginSM,
                  height: token.controlHeightLG * 1.55,
                }}
              >
                {loading ? t('auth.passwordReset.sendingButton') : t('auth.passwordReset.sendRequestButton')}
              </Button>

              <Button
                type="text"
                block
                icon={<ArrowLeftOutlined />}
                onClick={onBack}
                disabled={loading}
                style={{
                  marginTop: token.marginXS,
                }}
              >
                {t('auth.passwordReset.backToLogin')}
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
