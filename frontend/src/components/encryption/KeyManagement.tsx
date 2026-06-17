'use client';

/**
 * 暗号化鍵管理コンポーネント
 *
 * @description
 * 暗号化鍵の一覧表示・作成・削除を行う管理画面。
 */

import React, { useState } from 'react';
import {
  Table, Button, Tag, Space, Popconfirm, Tooltip, Typography, message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { EncryptionKey } from '@/types/encryption';
import * as encryptionService from '@/services/encryptionService';
import KeyCreateModal from './KeyCreateModal';
import dayjs from 'dayjs';

const { Text } = Typography;

interface KeyManagementProps {
  keys: EncryptionKey[];
  onKeysChange: () => void;
}

const KeyManagement: React.FC<KeyManagementProps> = ({ keys, onKeysChange }) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 削除処理
  // ---------------------------------------------------------------------------

  const handleDelete = async (keyId: string, keyName: string) => {
    setDeletingId(keyId);
    try {
      await encryptionService.deleteKey(keyId);
      message.success(`鍵「${keyName}」を削除しました。`);
      onKeysChange();
    } catch {
      message.error('鍵の削除に失敗しました。使用中の鍵は削除できません。');
    } finally {
      setDeletingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // テーブル列定義
  // ---------------------------------------------------------------------------

  const columns: ColumnsType<EncryptionKey> = [
    {
      title: '鍵名',
      dataIndex: 'keyName',
      key: 'keyName',
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{name}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 11 }}>{record.description}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'アルゴリズム',
      dataIndex: 'algorithm',
      key: 'algorithm',
      width: 160,
      render: (alg: string, record) => (
        <Space direction="vertical" size={0}>
          <Tag color="blue">{alg}</Tag>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.keySize} bit</Text>
        </Space>
      ),
    },
    {
      title: '状態',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (isActive: boolean) =>
        isActive ? (
          <Tag icon={<CheckCircleOutlined />} color="success">有効</Tag>
        ) : (
          <Tag icon={<StopOutlined />} color="error">無効</Tag>
        ),
    },
    {
      title: '有効期限',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 130,
      render: (expiresAt: string | null) => {
        if (!expiresAt) return <Text type="secondary">なし</Text>;
        const isExpired = dayjs(expiresAt).isBefore(dayjs());
        return (
          <Text type={isExpired ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
            {dayjs(expiresAt).format('YYYY/MM/DD')}
            {isExpired && <Tag color="error" style={{ marginLeft: 4, fontSize: 10 }}>期限切れ</Tag>}
          </Text>
        );
      },
    },
    {
      title: '使用回数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 90,
      align: 'right',
      render: (count: number) => (
        <Text style={{ fontSize: 13 }}>{count.toLocaleString()}</Text>
      ),
    },
    {
      title: '最終使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      width: 130,
      render: (lastUsedAt: string | null) =>
        lastUsedAt ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(lastUsedAt).format('YYYY/MM/DD HH:mm')}
          </Text>
        ) : (
          <Text type="secondary">未使用</Text>
        ),
    },
    {
      title: '作成日',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (createdAt: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(createdAt).format('YYYY/MM/DD')}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Tooltip
          title={record.usageCount > 0 ? '使用中の鍵は削除できません' : '鍵を削除'}
        >
          <Popconfirm
            title="鍵を削除しますか？"
            description="この操作は元に戻せません。"
            onConfirm={() => handleDelete(record.keyId, record.keyName)}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
            disabled={record.usageCount > 0}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === record.keyId}
              disabled={record.usageCount > 0}
            />
          </Popconfirm>
        </Tooltip>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          新規鍵を作成
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={keys}
        rowKey="keyId"
        size="small"
        pagination={{ pageSize: 10 }}
        rowClassName={(record) => (!record.isActive ? 'ant-table-row-disabled' : '')}
      />

      <KeyCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          setCreateModalOpen(false);
          onKeysChange();
        }}
      />
    </div>
  );
};

export default KeyManagement;
