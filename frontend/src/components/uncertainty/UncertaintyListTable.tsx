'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Tag,
  Typography,
  Tooltip,
  Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  EditOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

/**
 * 不確かさ基準データの型定義
 */
export interface UncertaintyTemplate {
  id: number;
  name: string;
  key: string;
  scope: string;
  eval: 'quantitative' | 'qualitative';
  type: string;
  desc: string;
  version: string;
  status: 'active' | 'deprecated';
  units: string;
  format: string;
  validFrom: string;
  validTo: string;
  extends: string;
}

/**
 * UncertaintyListTableのProps型定義
 */
interface UncertaintyListTableProps {
  /** 不確かさ基準データ一覧 */
  templates: UncertaintyTemplate[];
  /** 現在のスコープラベル */
  currentScopeLabel: string;
  /** 詳細モーダルを開くコールバック */
  onOpenDetail: (template: UncertaintyTemplate) => void;
  /** エクスポートボタン活性状態変更コールバック */
  onSelectionChange: (selectedIds: number[]) => void;
  /** 検索テキスト（外部から制御） */
  searchText: string;
  /** 評価方式フィルタ（外部から制御） */
  evalFilter: string;
  /** 状態フィルタ（外部から制御） */
  statusFilter: string;
}

/**
 * 不確かさ基準一覧テーブルコンポーネント
 * 検索・フィルタ・ソート・ページネーション・行選択を実装
 */
export default function UncertaintyListTable({
  templates,
  currentScopeLabel,
  onOpenDetail,
  onSelectionChange,
  searchText,
  evalFilter,
  statusFilter,
}: UncertaintyListTableProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** フィルタ済みデータ */
  const filteredData = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch =
        !searchText ||
        t.name.toLowerCase().includes(searchText.toLowerCase()) ||
        t.key.toLowerCase().includes(searchText.toLowerCase()) ||
        t.desc.toLowerCase().includes(searchText.toLowerCase());
      const matchEval = !evalFilter || t.eval === evalFilter;
      const matchStatus = !statusFilter || t.status === statusFilter;
      return matchSearch && matchEval && matchStatus;
    });
  }, [templates, searchText, evalFilter, statusFilter]);

  /** 行選択設定 */
  const rowSelection: TableRowSelection<UncertaintyTemplate> = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys);
      onSelectionChange(keys as number[]);
    },
  };

  const columns: ColumnsType<UncertaintyTemplate> = [
    {
      title: '不確かさ基準名',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      defaultSortOrder: 'ascend',
      minWidth: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            {record.name ? (
              <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{record.name}</div>
            ) : (
              <span style={{ color: '#bbb' }}>—</span>
            )}
            <div
              style={{
                fontSize: 11,
                color: '#888',
                fontFamily: 'Consolas, Monaco, monospace',
                marginTop: 1,
              }}
            >
              {record.key}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '評価方式',
      key: 'eval',
      width: 120,
      sorter: (a, b) => a.eval.localeCompare(b.eval),
      render: (_, record) => (
        <Tag
          color={record.eval === 'quantitative' ? 'blue' : 'purple'}
          style={{ fontWeight: 600 }}
        >
          {record.eval === 'quantitative' ? '定量' : '定性'}
        </Tag>
      ),
    },
    {
      title: '型',
      key: 'type',
      width: 130,
      align: 'center',
      sorter: (a, b) => a.type.localeCompare(b.type),
      render: (_, record) =>
        record.eval === 'qualitative' ? (
          <span style={{ color: '#bbb' }}>—</span>
        ) : (
          <Tag
            style={{
              fontFamily: 'Consolas, Monaco, monospace',
              fontWeight: 600,
              fontSize: 11,
              background: '#f6f8fa',
              borderColor: '#d0d7de',
              color: '#444',
            }}
          >
            {record.type}
          </Tag>
        ),
    },
    {
      title: '継承元',
      key: 'extends',
      width: 180,
      sorter: (a, b) => a.extends.localeCompare(b.extends),
      render: (_, record) => {
        if (!record.extends) return <span style={{ color: '#bbb' }}>—</span>;
        // 同一 templates 内から継承元 Key に対応する名前を取得
        const parentName = templates.find((t) => t.key === record.extends)?.name ?? '';
        return (
          <div>
            {parentName ? (
              <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{parentName}</div>
            ) : (
              <span style={{ color: '#bbb' }}>—</span>
            )}
            <div
              style={{
                fontSize: 11,
                color: '#888',
                fontFamily: 'Consolas, Monaco, monospace',
                marginTop: 1,
              }}
            >
              {record.extends}
            </div>
          </div>
        );
      },
    },
    {
      title: 'スコープ',
      key: 'scope',
      minWidth: 150,
      sorter: (a, b) => a.scope.localeCompare(b.scope),
      render: (_, record) => {
        if (!record.scope) return <span style={{ color: '#bbb' }}>—</span>;
        const parts = record.scope.split(' › ');
        const label = parts[parts.length - 1].trim();
        return (
          <Tooltip title={record.scope}>
            <Tag
              style={{
                fontSize: 11,
                color: '#555',
                background: '#f5f5f5',
                borderColor: '#e8e8e8',
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-block',
              }}
            >
              {label}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '説明',
      key: 'desc',
      minWidth: 160,
      sorter: (a, b) => a.desc.localeCompare(b.desc),
      render: (_, record) => (
        <Tooltip title={record.desc}>
          <Text
            style={{
              fontSize: 12,
              color: '#666',
              width: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {record.desc}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'バージョン',
      key: 'version',
      width: 120,
      sorter: (a, b) => a.version.localeCompare(b.version),
      render: (_, record) => (
        <Tag
          style={{
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: 11,
            color: '#666',
            background: '#f0f0f0',
            border: 'none',
          }}
        >
          {record.version.replace(/^v(\d+).*$/i, 'V$1')}
        </Tag>
      ),
    },
    {
      title: '状態',
      key: 'status',
      width: 90,
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (_, record) => (
        <Tag
          color={record.status === 'active' ? 'success' : 'default'}
          style={{ fontWeight: 600 }}
        >
          {record.status === 'active' ? '● 有効' : '○ 無効'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<EditOutlined />}
            disabled={record.status === 'deprecated'}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(record);
            }}
          >
            編集
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* テーブルエリア */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 0' }}>
        <Table<UncertaintyTemplate>
          rowKey="id"
          columns={columns}
          dataSource={filteredData}
          rowSelection={rowSelection}
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}〜${range[1]} 件 / 全 ${total} 件`,
            pageSizeOptions: ['20', '50', '100'],
          }}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0', color: '#bbb', textAlign: 'center' }}>
                <div>該当する不確かさ基準が見つかりません</div>
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
}
