/**
 * デバッグログインパネル
 * 開発環境専用のデバッグ機能コンポーネント
 * 本番環境では使用されません
 */
'use client';

import React, { useState } from 'react';
import { Button, Divider, Select, Space, Typography, theme } from 'antd';
import { LoginOutlined, UserOutlined } from '@ant-design/icons';
import type { DebugLoginPanelProps } from '@/types/debug';

const { Text } = Typography;

/**
 * デバッグログインパネルコンポーネント
 * 開発環境でのテストログインを簡易化
 */
export default function DebugLoginPanel({ onLogin, loading = false, debugUsers }: DebugLoginPanelProps) {
  const { token } = theme.useToken();
  const [selectedDebugUser, setSelectedDebugUser] = useState<string | undefined>(undefined);

  /**
   * デバッグ用: 選択したユーザーでログイン
   */
  const handleDebugLogin = async () => {
    if (!selectedDebugUser) return;
    
    const user = debugUsers.find(u => u.username === selectedDebugUser);
    if (!user) return;

    try {
      await onLogin({
        username: user.username,
        password: user.password,
      });
    } catch (err) {
      console.error('Debug login failed:', err);
    }
  };

  return (
    <>
      <Divider style={{ margin: `${token.marginLG}px 0` }}>
        <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          デバッグログイン
        </Text>
      </Divider>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Select
          placeholder="デバッグユーザーを選択"
          value={selectedDebugUser}
          onChange={setSelectedDebugUser}
          style={{ width: '100%' }}
          size="middle"
          disabled={loading}
          options={debugUsers.map(user => ({
            value: user.username,
            label: (
              <Space>
                <UserOutlined />
                <span>{user.displayName}</span>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  ({user.role})
                </Text>
              </Space>
            ),
          }))}
        />
        <Button
          type="default"
          size="small"
          block
          icon={<LoginOutlined />}
          onClick={handleDebugLogin}
          disabled={loading || !selectedDebugUser}
          style={{
            borderStyle: 'dashed',
            color: token.colorTextSecondary,
          }}
        >
          選択したユーザーでログイン
        </Button>
      </Space>
    </>
  );
}
