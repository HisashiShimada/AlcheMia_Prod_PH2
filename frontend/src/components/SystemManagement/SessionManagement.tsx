'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  App,
  Typography,
  Badge,
  Select,
  Checkbox,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getActiveSessions, terminateSession } from '@/api/sessionApiService';
import type { SessionInfo } from '@/types/session';

const { Text } = Typography;

/**
 * セッション管理画面
 */
export default function SessionManagement() {
  const { modal, message: messageApi } = App.useApp();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(5);

  // セッション一覧取得
  const fetchSessions = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActiveSessions();
      setSessions(data.sessions);
    } catch (error) {
      console.error('セッション一覧取得エラー:', error);
      messageApi.error('セッション一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  // 初回データ取得
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // リロード
  const handleReload = React.useCallback(() => {
    setSearchText('');
    fetchSessions();
    messageApi.success('データをリロードしました');
  }, [fetchSessions, messageApi]);

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
        session.userName.toLowerCase().includes(searchLower) ||
        session.email.toLowerCase().includes(searchLower) ||
        session.sessionDuration.toLowerCase().includes(searchLower) ||
        session.ipAddress.toLowerCase().includes(searchLower)
      );
    });
  }, [sessions, searchText]);

  // テーブルカラム定義
  const columns: ColumnsType<SessionInfo> = [
    {
      title: (
        <div style={{ textAlign: 'center' }}>
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
        </div>
      ),
      key: 'user',
      width: 350,
      sorter: (a, b) => a.userName.localeCompare(b.userName),
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500, color: '#0093CF' }}>
            {record.userName}
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
      sorter: (a, b) => a.durationMinutes - b.durationMinutes,
      render: (text: string) => (
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
              onClick={() => handleTerminateSession(record.tokenId)}
              style={{
                backgroundColor: '#fff',
                borderColor: '#CF0027',
                color: '#CF0027',
              }}
              loading={loading}
            >
              終了
            </Button>
          );
        }
      },
    },
  ];

  // セッション終了
  const handleTerminateSession = (tokenId: string) => {
    modal.confirm({
      title: 'セッションを終了しますか？',
      content: 'このセッションは強制的に終了されます。ユーザーは再度ログインが必要になります。',
      okText: '終了',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await terminateSession(tokenId);
          messageApi.success('セッションを終了しました');
          // セッション一覧を再取得
          await fetchSessions();
        } catch (error) {
          console.error('セッション終了エラー:', error);
          messageApi.error('セッションの終了に失敗しました');
        }
      },
    });
  };

  // 自動更新切り替え
  const handleAutoRefreshChange = (checked: boolean) => {
    setAutoRefresh(checked);
    if (checked) {
      messageApi.success(`自動更新を有効にしました（${refreshInterval}分間隔）`);
    } else {
      messageApi.info('自動更新を無効にしました');
    }
  };

  // 更新間隔変更
  const handleRefreshIntervalChange = (value: number) => {
    setRefreshInterval(value);
    if (autoRefresh) {
      messageApi.info(`更新間隔を${value}分に変更しました`);
    }
  };

  return (
    <Spin spinning={loading}>
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
            loading={loading}
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
              placeholder="ユーザー名、メールアドレス、セッション時間で検索"
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
            rowKey="tokenId"
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
    </Spin>
  );
}
