'use client';

import React, { useState } from 'react';
import { Card, Input, Button, Typography, Alert, Space, Spin, theme } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, LoginOutlined } from '@ant-design/icons';
import { LoginCredentials } from '@/types/auth';
import { validateEmail, validatePassword } from '@/utils/validationUtils';
import { useLanguage } from '@/contexts/LanguageContext';

const { Title, Text } = Typography;

/**
 * ログインページのProps
 */
interface LoginPageProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  onForgotPassword?: () => void;
  error?: string | null;
  loading?: boolean;
  /** デバッグパネル（開発環境でのみ提供） */
  debugPanel?: React.ReactNode;
}

/**
 * ログイン画面コンポーネント
 * UIポリシーに基づいたモダンで清潔感のあるデザイン
 */
export default function LoginPage({ onLogin, onForgotPassword, error, loading = false, debugPanel }: LoginPageProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [userIdError, setUserIdError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ userId: false, password: false });

  // ユーザーIDの変更ハンドラ（リアルタイムバリデーション）
  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserId(value);
    
    // タッチされている場合のみバリデーション
    if (touched.userId) {
      const result = validateEmail(value);
      setUserIdError(result.isValid ? null : result.error || null);
    }
  };

  // パスワードの変更ハンドラ（リアルタイムバリデーション）
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    
    // タッチされている場合のみバリデーション
    if (touched.password) {
      const result = validatePassword(value);
      setPasswordError(result.isValid ? null : result.error || null);
    }
  };

  // フィールドのフォーカス喪失ハンドラ
  const handleUserIdBlur = () => {
    setTouched(prev => ({ ...prev, userId: true }));
    const result = validateEmail(userId);
    setUserIdError(result.isValid ? null : result.error || null);
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    const result = validatePassword(password);
    setPasswordError(result.isValid ? null : result.error || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // すべてのフィールドをタッチ済みにする
    setTouched({ userId: true, password: true });

    // バリデーション実行
    const userIdValidation = validateEmail(userId);
    const passwordValidation = validatePassword(password);

    // エラーを設定
    setUserIdError(userIdValidation.isValid ? null : userIdValidation.error || null);
    setPasswordError(passwordValidation.isValid ? null : passwordValidation.error || null);

    // バリデーション失敗時は送信しない
    if (!userIdValidation.isValid) {
      setValidationError(userIdValidation.error || t('auth.login.checkInputValues'));
      return;
    }

    if (!passwordValidation.isValid) {
      setValidationError(passwordValidation.error || t('auth.login.checkInputValues'));
      return;
    }

    // ログイン処理
    try {
      //TODO: クライアント証明書を導入するまでの仮実装
      await onLogin({ userId: userId.trim(), password, organizationId: ''});
    } catch (err) {
      // エラーは親コンポーネントで処理
      console.error('Login failed:', err);
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
                color: 'var(--color-primary)',
                fontWeight: token.fontWeightStrong,
              }}
            >
              {t('common.appName')}
            </Title>
            <Text
              type="secondary"
              style={{
                fontSize: token.fontSizeHeading4,
              }}
            >
              {t('common.appSubtitle')}
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

          {/* ログインフォーム */}
          <form onSubmit={handleSubmit}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <label
                  htmlFor="userId"
                  style={{
                    display: 'block',
                    marginBottom: token.marginSM,
                    fontSize: token.fontSize,
                    fontWeight: 500,
                    color: token.colorText,
                  }}
                >
                  {t('auth.login.userIdLabel')} <span style={{ color: token.colorError }}>*</span>
                </label>
                <Input
                  id="userId"
                  name="userId"
                  type="text"
                  size="large"
                  placeholder={t('auth.login.userIdPlaceholder')}
                  value={userId}
                  onChange={handleUserIdChange}
                  onBlur={handleUserIdBlur}
                  disabled={loading}
                  status={userIdError ? 'error' : ''}
                  autoComplete="username"
                  autoFocus
                />
                {userIdError && (
                  <div style={{ color: token.colorError, fontSize: token.fontSizeSM, marginTop: token.marginXS }}>
                    {userIdError}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    marginBottom: token.marginSM,
                    fontSize: token.fontSize,
                    fontWeight: 500,
                    color: token.colorText,
                  }}
                >
                  {t('auth.login.passwordLabel')} <span style={{ color: token.colorError }}>*</span>
                </label>
                <Input.Password
                  id="password"
                  name="password"
                  size="large"
                  placeholder={t('auth.login.passwordPlaceholder')}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  disabled={loading}
                  status={passwordError ? 'error' : ''}
                  autoComplete="current-password"
                  iconRender={(visible) =>
                    visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  }
                />
                {passwordError && (
                  <div style={{ color: token.colorError, fontSize: token.fontSizeSM, marginTop: token.marginXS }}>
                    {passwordError}
                  </div>
                )}
              </div>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                icon={loading ? <Spin /> : <LoginOutlined />}
                disabled={loading}
                style={{
                  marginTop: token.marginSM,
                  height: token.controlHeightLG * 1.55,
                }}
              >
                {loading ? t('auth.login.loggingIn') : t('auth.login.loginButton')}
              </Button>

              {/* パスワードを忘れた場合のリンク */}
              {onForgotPassword && (
                <div style={{ textAlign: 'center', marginTop: token.marginSM }}>
                  <Button
                    type="link"
                    onClick={onForgotPassword}
                    disabled={loading}
                    style={{
                      padding: 0,
                      height: 'auto',
                      fontSize: token.fontSize,
                    }}
                  >
                    {t('auth.login.forgotPassword')}
                  </Button>
                </div>
              )}

              {/* デバッグパネル（開発環境でのみ渡される） */}
              {debugPanel}
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
