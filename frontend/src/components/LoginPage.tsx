'use client';

import React, { useState } from 'react';
import { Card, Input, Button, Typography, Alert, Space, Spin } from 'antd';
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
}

/**
 * ログイン画面コンポーネント
 * UIポリシーに基づいたモダンで清潔感のあるデザイン
 */
export default function LoginPage({ onLogin, error, loading = false }: LoginPageProps) {
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
        backgroundColor: '#fafafa',
      }}
    >
      <div style={{ width: '100%', maxWidth: 672, padding: '0 36px' }}>
        <Card
          style={{
            borderRadius: 18,
            boxShadow: '0px 6px 12px rgba(0,0,0,0.12)',
          }}
          styles={{
            body: {
              padding: 48,
            },
          }}
        >
          {/* ロゴ・タイトル */}
          <div style={{ marginBottom: 48, textAlign: 'center' }}>
            <Title
              level={1}
              style={{
                margin: 0,
                marginBottom: 12,
                color: '#CF0027',
                fontWeight: 600,
                fontSize: 45,
              }}
            >
              MMDPF
            </Title>
            <Text
              type="secondary"
              style={{
                fontSize: 24,
              }}
            >
              マルチモーダルデータプラットフォーム
            </Text>
          </div>

          {/* エラーメッセージ */}
          {(error || validationError) && (
            <Alert
              title={validationError || error}
              type="error"
              showIcon
              style={{
                marginBottom: 36,
                borderRadius: 12,
                fontSize: 16,
                padding: '16px 20px',
              }}
            />
          )}

          {/* ログインフォーム */}
          <form onSubmit={handleSubmit}>
            <Space orientation="vertical" size={32} style={{ width: '100%' }}>
              <div>
                <label
                  htmlFor="username"
                  style={{
                    display: 'block',
                    marginBottom: 10,
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#212121',
                  }}
                >
                  ユーザー名 <span style={{ color: '#d32f2f' }}>*</span>
                </label>
                <Input
                  id="username"
                  name="username"
                  placeholder="ユーザー名を入力"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  status={validationError && !username.trim() ? 'error' : ''}
                  autoComplete="username"
                  autoFocus
                  style={{
                    height: 52,
                    fontSize: 16,
                    borderRadius: 12,
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    marginBottom: 10,
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#212121',
                  }}
                >
                  パスワード <span style={{ color: '#d32f2f' }}>*</span>
                </label>
                <Input.Password
                  id="password"
                  name="password"
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  status={validationError && !password ? 'error' : ''}
                  autoComplete="current-password"
                  iconRender={(visible) =>
                    visible ? <EyeOutlined style={{ fontSize: 16 }} /> : <EyeInvisibleOutlined style={{ fontSize: 16 }} />
                  }
                  style={{
                    height: 52,
                    fontSize: 16,
                    borderRadius: 12,
                  }}
                />
              </div>

              <Button
                type="primary"
                htmlType="submit"
                block
                icon={loading ? <Spin /> : <LoginOutlined style={{ fontSize: 16 }} />}
                disabled={loading}
                style={{
                  height: 62,
                  fontSize: 16,
                  fontWeight: 500,
                  marginTop: 10,
                  borderRadius: 12,
                }}
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </Space>
          </form>

          {/* フッター */}
          <div style={{ marginTop: 48, textAlign: 'center' }}>
            <Text
              type="secondary"
              style={{
                fontSize: 18,
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
