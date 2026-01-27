/**
 * デバッグログインパネル
 * 開発環境専用のデバッグ機能コンポーネント
 * 本番環境では使用されません
 */
'use client';

import React, { useState, useMemo } from 'react';
import { Button, Card, Divider, Select, Space, Typography, theme } from 'antd';
import { LoginOutlined, UserOutlined } from '@ant-design/icons';
import type { DebugLoginPanelProps } from '@/types/debug';
import type { UserRole } from '@/types/auth';

const { Text } = Typography;

/**
 * ロール名の日本語マッピング
 */
const getRoleDisplayName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    provider: 'プロバイダー',
    system_admin: 'システム管理者',
    data_admin: 'データ管理者',
    experiment_admin: '実験管理者',
    experiment_worker: '実験作業者',
    mi_engineer: 'MI技術者',
  };
  return roleNames[role] || role;
};

/**
 * デバッグログインパネルコンポーネント
 * 開発環境でのテストログインを簡易化
 */
export default function DebugLoginPanel({ onLogin, loading = false, debugUsers }: DebugLoginPanelProps) {
  const { token } = theme.useToken();
  const [selectedDebugUser, setSelectedDebugUser] = useState<string | undefined>(undefined);

  // 選択中のユーザー情報を取得
  const selectedUser = useMemo(() => {
    return debugUsers.find(u => u.username === selectedDebugUser);
  }, [debugUsers, selectedDebugUser]);

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
        
        {/* 選択中のユーザー情報を表示 */}
        {selectedUser && (
          <Card 
            size="small" 
            style={{ 
              marginTop: token.marginXS,
              backgroundColor: token.colorBgContainer,
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                選択中の情報:
              </Text>
              <div>
                <Text strong style={{ fontSize: token.fontSizeSM }}>ユーザー名: </Text>
                <Text style={{ fontSize: token.fontSizeSM }}>{selectedUser.username}</Text>
              </div>
              <div>
                <Text strong style={{ fontSize: token.fontSizeSM }}>パスワード: </Text>
                <Text code style={{ fontSize: token.fontSizeSM }}>{selectedUser.password}</Text>
              </div>
              <div>
                <Text strong style={{ fontSize: token.fontSizeSM }}>ロール: </Text>
                <Text style={{ fontSize: token.fontSizeSM }}>{getRoleDisplayName(selectedUser.role)}</Text>
              </div>
            </Space>
          </Card>
        )}

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
