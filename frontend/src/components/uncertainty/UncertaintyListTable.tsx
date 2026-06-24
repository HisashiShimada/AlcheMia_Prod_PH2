'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  Input,
  Select,
  Button,
  Tag,
  Typography,
  Tooltip,
  Popconfirm,
  Space,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  SearchOutlined,
  DeleteOutlined,
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
}: UncertaintyListTableProps) {
  const [searchText, setSearchText] = useState('');
  const [evalFilter, setEvalFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
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

  /** 削除確認ハンドラー */
  const handleDelete = (template: UncertaintyTemplate) => {
    message.success(`不確かさ基準「${template.name}」を削除しました（デモ）`);
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
            <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{record.name}</div>
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
      width: 160,
      sorter: (a, b) => a.extends.localeCompare(b.extends),
      render: (_, record) => {
        if (!record.extends) return <span style={{ color: '#bbb' }}>—</span>;
        const parts = record.extends.split(' › ');
        const label = parts[0].trim();
        return (
          <Tooltip title={record.extends}>
            <Tag
              style={{
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: 11,
                color: '#5a3e8a',
                background: '#f5f0ff',
                borderColor: '#d3b8f5',
                maxWidth: 140,
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
      title: 'スコープ',
      key: 'scope',
      minWidth: 150,
      sorter: (a, b) => a.scope.localeCompare(b.scope),
      render: (_, record) => {
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
              maxWidth: 240,
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
          {record.status === 'active' ? '● 有効' : '○ 非推奨'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
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
          <Popconfirm
            title={`不確かさ基準「${record.name}」を削除しますか？`}
            description="この操作は取り消せません。"
            onConfirm={() => handleDelete(record)}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            >
              削除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ツールバー */}
      <div
        style={{
          background: '#fff',
          padding: '10px 16px 8px',
          borderBottom: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {/* 評価方式フィルタ */}
        <Select
          size="small"
          style={{ width: 150 }}
          placeholder="評価方式：すべて"
          value={evalFilter || undefined}
          onChange={(v) => setEvalFilter(v ?? '')}
          allowClear
          options={[
            { value: 'quantitative', label: '定量（数値）' },
            { value: 'qualitative', label: '定性（選択肢）' },
          ]}
        />

        {/* 状態フィルタ */}
        <Select
          size="small"
          style={{ width: 130 }}
          placeholder="状態：すべて"
          value={statusFilter || undefined}
          onChange={(v) => setStatusFilter(v ?? '')}
          allowClear
          options={[
            { value: 'active', label: '有効' },
            { value: 'deprecated', label: '非推奨' },
          ]}
        />

        {/* 検索 */}
        <Input
          size="small"
          prefix={<SearchOutlined />}
          placeholder="不確かさ基準名・キーで検索…"
          style={{ width: 220 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        {/* 件数 */}
        <Text style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>
          {filteredData.length} 件
        </Text>
      </div>

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
