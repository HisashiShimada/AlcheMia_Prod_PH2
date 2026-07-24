'use client';

/**
 * 暗号化鍵管理コンポーネント
 *
 * @description
 * 暗号化鍵の一覧表示・作成・エクスポート・インポート・削除・ローテーションを行う管理画面。
 *
 * @remarks
 * テーブル列:
 *   - 識別子（フィンガープリント）
 *   - 作成日時
 *   - 鍵方式（共通鍵 / 非対称鍵）
 *   - 最終使用日時
 */

import React, { useState } from 'react';
import {
  Table, Button, Space, Popconfirm, Tooltip, Typography, Tag, message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { EncryptionKey } from '@/types/encryption';
import * as encryptionService from '@/services/encryptionService';
import KeyCreateModal from './KeyCreateModal';
import KeyExportModal from './KeyExportModal';
import KeyImportModal from './KeyImportModal';
import KeyRotateModal from './KeyRotateModal';
import dayjs from 'dayjs';

const { Text } = Typography;

// ---------------------------------------------------------------------------
// 鍵方式の判定ヘルパー
// ---------------------------------------------------------------------------

/** アルゴリズム文字列から「共通鍵」か「非対称鍵」かを返す */
function resolveKeyType(algorithm: string): '共通鍵' | '非対称鍵' {
  const asymmetricPatterns = ['rsa', 'ec', 'dsa', 'dh', 'elgamal'];
  const lower = algorithm.toLowerCase();
  return asymmetricPatterns.some((p) => lower.includes(p)) ? '非対称鍵' : '共通鍵';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface KeyManagementProps {
  keys: EncryptionKey[];
  onKeysChange: () => void;
}

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

const KeyManagement: React.FC<KeyManagementProps> = ({ keys, onKeysChange }) => {
  // モーダル開閉
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [rotateModalOpen, setRotateModalOpen] = useState(false);

  // エクスポート対象鍵（単体）
  const [exportTargetKey, setExportTargetKey] = useState<EncryptionKey | null>(null);

  // 削除中のキーID
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ローテーション対象鍵
  const [rotateTargetKey, setRotateTargetKey] = useState<EncryptionKey | null>(null);

  // ---------------------------------------------------------------------------
  // エクスポート開始
  // ---------------------------------------------------------------------------

  const handleOpenExport = (record: EncryptionKey) => {
    setExportTargetKey(record);
    setExportModalOpen(true);
  };

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
  // ローテーション開始
  // ---------------------------------------------------------------------------

  const handleOpenRotate = (record: EncryptionKey) => {
    setRotateTargetKey(record);
    setRotateModalOpen(true);
  };

  // ---------------------------------------------------------------------------
  // テーブル列定義
  // ---------------------------------------------------------------------------

  const columns: ColumnsType<EncryptionKey> = [
    {
      title: '識別子（フィンガープリント）',
      dataIndex: 'keyIdentifier',
      key: 'keyIdentifier',
      render: (keyIdentifier: string | undefined, record) => {
        const display = keyIdentifier ?? record.keyId.substring(0, 16);
        return (
          <Space orientation="vertical" size={0}>
            <Text code style={{ fontSize: 12 }}>{display}</Text>
            {record.description && (
              <Text type="secondary" style={{ fontSize: 11 }}>{record.description}</Text>
            )}
          </Space>
        );
      },
    },
    {
      title: '作成日時',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (createdAt: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(createdAt).format('YYYY/MM/DD HH:mm')}
        </Text>
      ),
    },
    {
      title: '鍵方式',
      dataIndex: 'algorithm',
      key: 'keyType',
      width: 110,
      render: (algorithm: string) => {
        const keyType = resolveKeyType(algorithm);
        return (
          <Tag color={keyType === '共通鍵' ? 'blue' : 'purple'}>
            {keyType}
          </Tag>
        );
      },
    },
    {
      title: '最終使用日時',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      width: 150,
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
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space size={4}>
          {/* エクスポート */}
          <Tooltip title="鍵をエクスポート">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleOpenExport(record)}
            />
          </Tooltip>

          {/* ローテーション */}
          <Tooltip title="鍵ローテーション">
            <Button
              size="small"
              icon={<SyncOutlined />}
              onClick={() => handleOpenRotate(record)}
            />
          </Tooltip>

          {/* 削除 */}
          <Tooltip
            title={record.usageCount > 0 ? '使用中の鍵は削除できません' : '鍵を削除'}
          >
            <Popconfirm
              title="鍵を削除しますか？"
              description={
                <div style={{ maxWidth: 280 }}>
                  <div>この操作は元に戻せません。</div>
                  <div style={{ marginTop: 4, color: '#ff4d4f', fontWeight: 500 }}>
                    この鍵で暗号化されたデータは復号不能になります。
                  </div>
                </div>
              }
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
        </Space>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* ツールバー */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {/* 件数表示 */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          全 {keys.length} 件
        </Text>

        {/* アクションボタン群 */}
        <Space wrap>
          {/* 新規鍵の生成 */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            新規鍵を生成
          </Button>

          {/* インポート */}
          <Button
            icon={<UploadOutlined />}
            onClick={() => setImportModalOpen(true)}
          >
            インポート
          </Button>
        </Space>
      </div>

      {/* 鍵一覧テーブル */}
      <Table
        columns={columns}
        dataSource={keys}
        rowKey="keyId"
        size="small"
        pagination={{ pageSize: 10 }}
        rowClassName={(record) => (!record.isActive ? 'ant-table-row-disabled' : '')}
      />

      {/* 新規鍵生成モーダル */}
      <KeyCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          setCreateModalOpen(false);
          onKeysChange();
        }}
      />

      {/* エクスポートモーダル（単一鍵） */}
      <KeyExportModal
        open={exportModalOpen}
        targetKey={exportTargetKey}
        onClose={() => {
          setExportModalOpen(false);
          setExportTargetKey(null);
        }}
      />

      {/* インポートモーダル */}
      <KeyImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={() => {
          setImportModalOpen(false);
          onKeysChange();
        }}
      />

      {/* 鍵ローテーションモーダル */}
      <KeyRotateModal
        open={rotateModalOpen}
        targetKey={rotateTargetKey}
        onClose={() => {
          setRotateModalOpen(false);
          setRotateTargetKey(null);
        }}
        onRotated={onKeysChange}
      />
    </div>
  );
};

export default KeyManagement;
