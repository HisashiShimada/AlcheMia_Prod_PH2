'use client';

/**
 * 暗号化済み要素一覧タブ
 *
 * @description
 * 対象MAIMLファイルに含まれる全ての暗号化済み要素（EncryptedData）を一覧表示するタブコンポーネント。
 * ツリーのノード選択状態に依存せず、常にファイル全体を対象に表示する。
 * 行をクリックするとツリーでその要素が選択される。
 */

import React from 'react';
import { Table, Typography, Empty, Spin, Tag } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { EncryptedChildElement } from '@/types/encryption';

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EncryptedElementsListTabProps {
  /** 暗号化済み要素一覧（ファイル全体） */
  encryptedChildren: EncryptedChildElement[];
  /** ローディング状態 */
  loading: boolean;
  /** 一覧の行をクリックした時のコールバック（ツリーでその要素を選択） */
  onSelectElement: (path: string) => void;
}

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** 秘匿レベルの色マップ */
const LEVEL_COLOR: Record<string, string> = {
  L1: 'red',
  L2: 'orange',
};

/** 要素種別の日本語マップ */
const ELEMENT_TYPE_LABEL: Record<string, string> = {
  property: 'property',
  material: 'material',
  condition: 'condition',
  result: 'result',
  place: 'place',
  document: 'document',
};

// ---------------------------------------------------------------------------
// テーブルカラム定義
// ---------------------------------------------------------------------------

function buildColumns(
  onSelectElement: (path: string) => void,
): ColumnsType<EncryptedChildElement> {
  return [
    {
      title: '親要素ID',
      dataIndex: 'parentId',
      key: 'parentId',
      width: 150,
      ellipsis: true,
      render: (value: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{value}</Text>
      ),
    },
    {
      title: '種別',
      dataIndex: 'elementType',
      key: 'elementType',
      width: 130,
      render: (value: string) => (
        <Tag color="blue">{ELEMENT_TYPE_LABEL[value] ?? value}</Tag>
      ),
    },
    {
      title: '秘匿レベル',
      dataIndex: 'encryptionLevel',
      key: 'encryptionLevel',
      width: 90,
      align: 'center' as const,
      render: (value: string) => (
        <Tag color={LEVEL_COLOR[value] ?? 'default'}>{value}</Tag>
      ),
    },
    {
      title: 'アルゴリズム',
      dataIndex: 'algorithm',
      key: 'algorithm',
      width: 140,
      render: (value: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 11 }}>{value}</Text>
      ),
    },
  ];
}

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

const EncryptedElementsListTab: React.FC<EncryptedElementsListTabProps> = ({
  encryptedChildren,
  loading,
  onSelectElement,
}) => {
  const columns = buildColumns(onSelectElement);

  // ローディング中
  if (loading) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <Spin tip="暗号化済み要素を取得中..." />
      </div>
    );
  }

  // 暗号化済み要素なし
  if (encryptedChildren.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              <LockOutlined style={{ marginRight: 4 }} />
              対象ファイルに暗号化済み要素はありません
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {/* 件数バッジ */}
      <div style={{ padding: '0 16px 8px' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <LockOutlined style={{ marginRight: 4 }} />
          暗号化済み要素：
          <Text strong style={{ fontSize: 12 }}>
            {encryptedChildren.length}件
          </Text>
          （行をクリックするとツリーで選択されます）
        </Text>
      </div>

      {/* 一覧テーブル */}
      <Table<EncryptedChildElement>
        columns={columns}
        dataSource={encryptedChildren}
        rowKey="path"
        size="small"
        pagination={false}
        scroll={{ y: 300 }}
        onRow={(record) => ({
          onClick: () => onSelectElement(record.path),
          style: { cursor: 'pointer' },
          title: record.path,
        })}
        rowClassName={() => 'encryption-list-row'}
        locale={{
          emptyText: '暗号化済み要素はありません',
        }}
      />
    </div>
  );
};

export default EncryptedElementsListTab;
