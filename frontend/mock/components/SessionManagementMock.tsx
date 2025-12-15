'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  message,
  Avatar,
  Typography,
  Row,
  Col,
  Badge,
  Select,
  Checkbox,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import sessionsData from '../data/sessions-management.json';

const { Text } = Typography;

/**
 * セッションデータの型定義
 */
interface SessionData {
  id: string;
  userId: string;
  lastName: string;
  firstName: string;
  email: string;
  sessionDuration: string;
  durationDays: number;
  loginTime: string;
  lastActivity: string;
  isCurrentUser: boolean;
  avatarText: string;
}

/**
 * セッション管理画面（モック）
 */
export default function SessionManagementMock() {
  const [sessions, setSessions] = useState<SessionData[]>(sessionsData as SessionData[]);
  const [searchText, setSearchText] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(5);

  // リロード（useEffectより前に定義）
  const handleReload = React.useCallback(() => {
    setSessions(sessionsData as SessionData[]);
    setSearchText('');
    message.success('データをリロードしました');
  }, []);

  // 自動更新の処理
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      handleReload();
    }, refreshInterval * 60 * 1000); // 分をミリ秒に変換

    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, handleReload]);

  // フィルタリングされたセッション
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const searchLower = searchText.toLowerCase();
      
      // 全フィールド検索
      return (
        session.lastName.toLowerCase().includes(searchLower) ||
        session.firstName.toLowerCase().includes(searchLower) ||
        session.email.toLowerCase().includes(searchLower) ||
        session.sessionDuration.toLowerCase().includes(searchLower)
      );
    });
  }, [sessions, searchText]);

  // テーブルカラム定義
  const columns: ColumnsType<SessionData> = [
    {
      title: (
        <Space size="middle">
          <span>ユーザー</span>
          <Badge
            count={filteredSessions.length}
            style={{
              backgroundColor: '#4169E1',
              fontSize: 14,
              height: 28,
              lineHeight: '28px',
              borderRadius: 14,
              paddingLeft: 12,
              paddingRight: 12,
            }}
          />
        </Space>
      ),
      key: 'user',
      width: 350,
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500, color: '#0093CF' }}>
            {record.lastName} {record.firstName}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.email}
          </Text>
        </div>
      ),
    },
    {
      title: 'セッション時間',
      dataIndex: 'sessionDuration',
      key: 'sessionDuration',
      width: 150,
      align: 'center',
      sorter: (a, b) => a.durationDays - b.durationDays,
      render: (text: string, record: SessionData) => (
        <Space>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#CF0027',
            }}
          />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'operation',
      width: 150,
      align: 'center',
      render: (_, record) => {
        if (record.isCurrentUser) {
          return (
            <Button
              size="small"
              style={{
                backgroundColor: '#f0f0f0',
                borderColor: '#d9d9d9',
                color: '#000',
                cursor: 'default',
              }}
              disabled
            >
              自分
            </Button>
          );
        } else {
          return (
            <Button
              size="small"
              onClick={() => handleTerminateSession(record.id)}
              style={{
                backgroundColor: '#fff',
                borderColor: '#CF0027',
                color: '#CF0027',
              }}
            >
              終了
            </Button>
          );
        }
      },
    },
  ];

  // セッション終了
  const handleTerminateSession = (sessionId: string) => {
    Modal.confirm({
      title: 'セッションを終了しますか？',
      content: 'このセッションは強制的に終了されます。ユーザーは再度ログインが必要になります。',
      okText: '終了',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: () => {
        setSessions(sessions.filter(s => s.id !== sessionId));
        message.success('セッションを終了しました');
      },
    });
  };

  // 自動更新切り替え
  const handleAutoRefreshChange = (checked: boolean) => {
    setAutoRefresh(checked);
    if (checked) {
      message.success(`自動更新を有効にしました（${refreshInterval}分間隔）`);
    } else {
      message.info('自動更新を無効にしました');
    }
  };

  // 更新間隔変更
  const handleRefreshIntervalChange = (value: number) => {
    setRefreshInterval(value);
    if (autoRefresh) {
      message.info(`更新間隔を${value}分に変更しました`);
    }
  };

  return (
    <div style={{ padding: 0 }}>
      {/* ヘッダーボタン */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: 24,
        gap: 8,
        alignItems: 'center',
      }}>
        <Checkbox
          checked={autoRefresh}
          onChange={(e) => handleAutoRefreshChange(e.target.checked)}
        >
          自動更新
        </Checkbox>
        <Select
          value={refreshInterval}
          onChange={handleRefreshIntervalChange}
          style={{ width: 100 }}
          options={[
            { value: 1, label: '1分' },
            { value: 5, label: '5分' },
            { value: 10, label: '10分' },
            { value: 30, label: '30分' },
          ]}
          suffixIcon={<span style={{ fontSize: 12 }}>▼</span>}
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={handleReload}
        >
          リロード
        </Button>
      </div>

      {/* セッション一覧セクション */}
      <div
        style={{
          padding: 0,
          backgroundColor: '#fff',
        }}
      >
        {/* 検索バー */}
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="曖昧検索可"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 400 }}
          />
        </div>

        {/* セッションテーブル */}
        <Table
          columns={columns}
          dataSource={filteredSessions}
          rowKey="id"
          size="small"
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `全 ${total} 件`,
          }}
        />
      </div>
    </div>
  );
}
