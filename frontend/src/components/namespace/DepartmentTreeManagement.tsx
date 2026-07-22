'use client';

import React, { useState, useMemo } from 'react';
import {
  Button,
  Input,
  Modal,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import namespaceTreeRaw from '../../../mock/namespace/uncertainty-scope.json';
import DepartmentNodeAddDialog from './DepartmentNodeAddDialog';
import { generateNamespaceUri } from '../../utils/namespaceUriGenerator';
import type { RawNode, FlatDeptRow, DeptTreeNode } from '@/types/namespace';

/** ログイン組織CD（本番実装では認証APIから取得） */
const MOCK_ORGANIZATION_CD = 'ORG';

const { Text } = Typography;

// ──────────────────────────────────────────────
// ツリーを平坦化（company 配下のみ対象）
// ──────────────────────────────────────────────
const flattenCompanyNodes = (nodes: RawNode[]): FlatDeptRow[] => {
  const result: FlatDeptRow[] = [];

  const companyNode = nodes.find((n) => n.key === 'company');
  if (!companyNode) return result;

  // company ノード自身を追加
  result.push({
    key:         companyNode.key,
    label:       companyNode.label,
    prefix:      (companyNode as any).prefix ?? '',
    uri:         (companyNode as any).uri ?? '',
    description: (companyNode as any).description ?? '',
    parentKey:   null,
    parentLabel: '（ルート）',
    depth:       0,
  });

  const traverse = (ns: RawNode[], parentKey: string, parentLabel: string, depth: number) => {
    for (const n of ns) {
      result.push({
        key:         n.key,
        label:       n.label,
        prefix:      n.prefix ?? '',
        uri:         n.uri ?? '',
        description: n.description ?? '',
        parentKey,
        parentLabel,
        depth,
      });
      if (n.children) traverse(n.children, n.key, n.label, depth + 1);
    }
  };

  if (companyNode.children) {
    traverse(companyNode.children, companyNode.key, companyNode.label, 1);
  }

  return result;
};

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const DepartmentTreeManagement: React.FC = () => {
  const [rows, setRows] = useState<FlatDeptRow[]>(() =>
    flattenCompanyNodes(namespaceTreeRaw as RawNode[])
  );
  const [searchText, setSearchText]     = useState('');
  const [addOpen, setAddOpen]           = useState(false);
  const [editingRow, setEditingRow]     = useState<FlatDeptRow | null>(null);
  const [editValues, setEditValues]     = useState<{ prefix: string; description: string }>({ prefix: '', description: '' });
  const [currentPage, setCurrentPage]   = useState(1);
  const [pageSize, setPageSize]         = useState(20);

  // 親ノード候補（自分自身や子孫は除外しない簡易実装）
  const parentOptions = useMemo(() =>
    rows.map((r) => ({ value: r.key, label: r.label })),
  [rows]);

  // 検索フィルター
  const filteredRows = useMemo(() => {
    if (!searchText.trim()) return rows;
    const q = searchText.toLowerCase();
    return rows.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.prefix.toLowerCase().includes(q) ||
        r.uri.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }, [rows, searchText]);

  // ──── 追加完了
  const handleCreated = (node: DeptTreeNode) => {
    const parentRow = rows.find((r) => r.key === node.parentKey);
    const newRow: FlatDeptRow = {
      key:         node.key,
      label:       node.label,
      prefix:      node.prefix ?? '',
      uri:         node.uri ?? '',
      description: node.description ?? '',
      parentKey:   node.parentKey,
      parentLabel: parentRow?.label ?? '',
      depth:       parentRow ? parentRow.depth + 1 : 0,
    };
    setRows((prev) => [...prev, newRow]);
    message.success(`部署ノード「${node.label}」を追加しました`);
  };

  // ──── 編集中のURI自動生成（編集行の部署CD＋ラベルから生成）
  const editAutoUri = useMemo(() => {
    if (!editingRow) return '';
    // 編集行の親ノードの departmentCd を parentKey から解決
    const parentRow = rows.find((r) => r.key === editingRow.parentKey);
    const deptCd = parentRow?.key ?? editingRow.parentKey ?? undefined;
    return generateNamespaceUri(MOCK_ORGANIZATION_CD, deptCd ?? undefined, editingRow.label ? [editingRow.label] : undefined);
  }, [editingRow, rows]);

  // ──── 編集開始
  const handleEditStart = (row: FlatDeptRow) => {
    setEditingRow(row);
    setEditValues({ prefix: row.prefix, description: row.description });
  };

  // ──── 編集保存
  const handleEditSave = async () => {
    if (!editingRow) return;
    if (!editValues.prefix) { message.error('Prefixは必須です'); return; }

    const savePayload = { ...editValues, uri: editAutoUri };

    try {
      await fetch(`/api/v1/department-nodes/${editingRow.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(savePayload),
      });
    } catch { /* APIが未実装でもローカル更新 */ }

    setRows((prev) =>
      prev.map((r) =>
        r.key === editingRow.key ? { ...r, ...savePayload } : r
      )
    );
    setEditingRow(null);
    message.success('部署ノードを更新しました');
  };

  // ──── 削除
  const handleDelete = (row: FlatDeptRow) => {
    Modal.confirm({
      title:   `「${row.label}」を削除しますか？`,
      content: '配下のノードも参照できなくなる可能性があります。',
      okText:  '削除',
      okButtonProps: { danger: true },
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          await fetch(`/api/v1/department-nodes/${row.key}`, {
            method: 'DELETE',
            credentials: 'include',
          });
        } catch { /* APIが未実装でもローカル削除 */ }
        setRows((prev) => prev.filter((r) => r.key !== row.key));
        message.success(`「${row.label}」を削除しました`);
      },
    });
  };

  // ──── カラム定義
  const columns: TableColumnsType<FlatDeptRow> = [
    {
      title: '表示名',
      dataIndex: 'label',
      key: 'label',
      width: 200,
      sorter: (a, b) => a.label.localeCompare(b.label),
      render: (text: string, record: FlatDeptRow) => (
        <span style={{ paddingLeft: record.depth * 16 }}>
          <Text strong>{text}</Text>
        </span>
      ),
    },
    {
      title: 'Prefix',
      dataIndex: 'prefix',
      key: 'prefix',
      width: 140,
      sorter: (a, b) => a.prefix.localeCompare(b.prefix),
      render: (text: string, record: FlatDeptRow) => {
        if (editingRow?.key === record.key) {
          return (
            <Input
              size="small"
              value={editValues.prefix}
              onChange={(e) => setEditValues((p) => ({ ...p, prefix: e.target.value }))}
            />
          );
        }
        return text ? <Tag color="blue">{text}</Tag> : <Text type="secondary">—</Text>;
      },
    },
    {
      title: '名前空間URI',
      dataIndex: 'uri',
      key: 'uri',
      ellipsis: true,
      render: (text: string, record: FlatDeptRow) => {
        if (editingRow?.key === record.key) {
          // 編集中は自動生成URIを読み取り専用で表示
          return (
            <div
              style={{
                padding: '3px 8px',
                background: '#f5f5f5',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#555',
                wordBreak: 'break-all',
              }}
            >
              {editAutoUri || '—'}
            </div>
          );
        }
        return <Text type="secondary" style={{ fontSize: 12 }}>{text || '—'}</Text>;
      },
    },
    {
      title: '説明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string, record: FlatDeptRow) => {
        if (editingRow?.key === record.key) {
          return (
            <Input
              size="small"
              value={editValues.description}
              onChange={(e) => setEditValues((p) => ({ ...p, description: e.target.value }))}
            />
          );
        }
        return text || <Text type="secondary">—</Text>;
      },
    },
    {
      title: '親ノード',
      dataIndex: 'parentLabel',
      key: 'parentLabel',
      width: 140,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{text || '—'}</Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      align: 'right',
      render: (_: unknown, record: FlatDeptRow) => {
        // 会社ルートノード（depth=0）はシステム管理者が操作不可
        if (record.depth === 0) {
          return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        }
        if (editingRow?.key === record.key) {
          return (
            <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <Button type="primary" size="small" onClick={handleEditSave}>✔ 保存</Button>
              <Button size="small" onClick={() => setEditingRow(null)}>キャンセル</Button>
            </span>
          );
        }
        return (
          <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEditStart(record)}>
              編集
            </Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
              削除
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#fafafa' }}>
      {/* ツールバー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderBottom: '1px solid #e8e8e8',
        background: '#fff',
        flexShrink: 0,
      }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="表示名・Prefix・URI・説明を検索..."
          allowClear
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
          style={{ flex: 1, minWidth: 80 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddOpen(true)}
        >
          部署ノードを追加
        </Button>
      </div>

      {/* テーブルエリア */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        <Table<FlatDeptRow>
          rowKey="key"
          size="small"
          columns={columns}
          dataSource={filteredRows}
          locale={{
            triggerAsc: '昇順にソート',
            triggerDesc: '降順にソート',
            cancelSort: 'ソートをキャンセル',
          }}
          pagination={{
            current: currentPage,
            pageSize,
            showTotal: (total) => `全 ${total} 件`,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </div>

      {/* 部署ノード追加ダイアログ */}
      <DepartmentNodeAddDialog
        open={addOpen}
        parentOptions={parentOptions}
        onClose={() => setAddOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default DepartmentTreeManagement;
