'use client';

import React, { useState } from 'react';
import { Card, Input, Button, Typography, Alert, Space, Spin, theme } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, LoginOutlined } from '@ant-design/icons';
import { LoginCredentials } from '@/types/auth';

const { Title, Text } = Typography;

/**
 * ログインページのProps
 */
interface LoginPageProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  error?: string | null;
  loading?: boolean;
  /** デバッグパネル（開発環境でのみ提供） */
  debugPanel?: React.ReactNode;
}

/**
 * ログイン画面コンポーネント
 * UIポリシーに基づいたモダンで清潔感のあるデザイン
 */
export default function LoginPage({ onLogin, error, loading = false, debugPanel }: LoginPageProps) {
  const { token } = theme.useToken();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // バリデーション
    if (!username.trim()) {
      setValidationError('ユーザー名を入力してください');
      return;
    }

    if (!password) {
      setValidationError('パスワードを入力してください');
      return;
    }

    // ログイン処理
    try {
      await onLogin({ username: username.trim(), password });
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
                color: token.colorPrimary,
                fontWeight: token.fontWeightStrong,
              }}
            >
              MMDPF
            </Title>
            <Text
              type="secondary"
              style={{
                fontSize: token.fontSizeHeading4,
              }}
            >
              マルチモーダルデータプラットフォーム
            </Text>
          </Space>

          {/* エラーメッセージ */}
          {(error || validationError) && (
            <Alert
              message={validationError || error}
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
                  htmlFor="username"
                  style={{
                    display: 'block',
                    marginBottom: token.marginSM,
                    fontSize: token.fontSize,
                    fontWeight: 500,
                    color: token.colorText,
                  }}
                >
                  ユーザー名 <span style={{ color: token.colorError }}>*</span>
                </label>
                <Input
                  id="username"
                  name="username"
                  size="large"
                  placeholder="ユーザー名を入力"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  status={validationError && !username.trim() ? 'error' : ''}
                  autoComplete="username"
                  autoFocus
                />
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
                  パスワード <span style={{ color: token.colorError }}>*</span>
                </label>
                <Input.Password
                  id="password"
                  name="password"
                  size="large"
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  status={validationError && !password ? 'error' : ''}
                  autoComplete="current-password"
                  iconRender={(visible) =>
                    visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  }
                />
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
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>

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
