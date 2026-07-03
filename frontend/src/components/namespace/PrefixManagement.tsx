'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Button, Input, Table, message, Typography, Tooltip, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined, SearchOutlined, BankOutlined } from '@ant-design/icons';
import namespaceTreeRaw from '../../../mock/namespace/uncertainty-scope.json';
import type { TableColumnsType } from 'antd';
import ShareScopeModal, { type ShareSourceRole, type ShareTarget, type ScopeNode } from './ShareScopeModal';

const { Text } = Typography;

// ──────────────────────────────────────────────
// モック: ログイン中ユーザーの所属ノードキー
// 本番実装では認証APIから取得する
// ──────────────────────────────────────────────
const CURRENT_USER_NS_KEY = 'rd-materials';

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────
interface PrefixRow {
  id: string;
  prefix: string;
  description: string;
  /** ノードの階層ラベルパス（スコープ列表示用） */
  scopePath: string;
  isActive?: boolean;
}

interface NewPrefixRow {
  _rowId: string;
  prefix: string;
  description: string;
}

// ──────────────────────────────────────────────
// モックデータ: uncertainty-scope.json からフラット化
// ──────────────────────────────────────────────
interface RawNode {
  key: string;
  label: string;
  icon?: string;
  prefix?: string;
  description?: string;
  children?: RawNode[];
}

// ── 指定キーへの祖先キー一覧を返す
const getAncestorKeys = (targetKey: string, nodes: RawNode[], ancestors: string[] = []): string[] | null => {
  for (const node of nodes) {
    if (node.key === targetKey) return ancestors;
    if (node.children) {
      const found = getAncestorKeys(targetKey, node.children, [...ancestors, node.key]);
      if (found) return found;
    }
  }
  return null;
};

// ── ノードキー → 階層ラベルパス（例: "🌐 Global" / "🏢 株式会社サンプルテック › 研究開発部"）
const buildScopePath = (targetKey: string, nodes: RawNode[], ancestors: { label: string; icon?: string }[] = []): string | null => {
  for (const node of nodes) {
    const selfLabel = node.label;
    const currentPath = [...ancestors, { label: selfLabel, icon: node.icon }];
    if (node.key === targetKey) {
      return currentPath.map((p) => p.label).join(' › ');
    }
    if (node.children) {
      const found = buildScopePath(targetKey, node.children, currentPath);
      if (found) return found;
    }
  }
  return null;
};

// ── Globalのみをフラット化（GlobalPrefix管理タブ用）
const flattenGlobalPrefixes = (nodes: RawNode[]): PrefixRow[] => {
  const result: PrefixRow[] = [];
  const globalNode = nodes.find((n) => n.key === 'global');
  if (!globalNode?.children) return result;

  const traverse = (ns: RawNode[]) => {
    for (const n of ns) {
      if (n.prefix) {
        const scopePath = buildScopePath(n.key, nodes) ?? n.label;
        result.push({ id: n.key, prefix: n.prefix, description: n.description ?? n.label ?? '', scopePath });
      }
      if (n.children) traverse(n.children);
    }
  };
  traverse(globalNode.children);
  return result;
};

// ── ログインユーザーが閲覧できるPrefixのみに絞り込んでフラット化
// 表示対象: Global配下の全Prefix ＋ 自分のノード ＋ 自分の祖先ノード
const flattenPrefixes = (nodes: RawNode[]): PrefixRow[] => {
  const result: PrefixRow[] = [];

  // ログインユーザーの祖先キー集合
  const ancestorKeys = new Set<string>(getAncestorKeys(CURRENT_USER_NS_KEY, nodes) ?? []);

  const traverse = (ns: RawNode[], isGlobal: boolean) => {
    for (const n of ns) {
      if (n.prefix) {
        // 自分のノード / 自分の祖先ノード のみ追加（Globalは除外）
        if (!isGlobal && (n.key === CURRENT_USER_NS_KEY || ancestorKeys.has(n.key))) {
          const scopePath = buildScopePath(n.key, nodes) ?? n.label;
          result.push({
            id: n.key,
            prefix: n.prefix,
            description: n.description ?? n.label ?? '',
            scopePath,
          });
        }
      }
      if (n.children) traverse(n.children, isGlobal);
    }
  };

  for (const root of nodes) {
    const isGlobal = root.key === 'global';
    traverse([root], isGlobal);
  }

  return result;
};

// ── 全スコープのPrefixをフラット化（閲覧モード用: Global含む全ノード）
const flattenAllPrefixes = (nodes: RawNode[]): PrefixRow[] => {
  const result: PrefixRow[] = [];

  const traverse = (ns: RawNode[]) => {
    for (const n of ns) {
      if (n.prefix) {
        const scopePath = buildScopePath(n.key, nodes) ?? n.label;
        result.push({
          id: n.key,
          prefix: n.prefix,
          description: n.description ?? n.label ?? '',
          scopePath,
        });
      }
      if (n.children) traverse(n.children);
    }
  };
  traverse(nodes);
  return result;
};

// ── RawNode[] → ScopeNode[]（ShareScopeModal 用ツリー構築）
// Global / Personal を除いた company配下のみを返す
const buildScopeNodes = (nodes: RawNode[]): ScopeNode[] =>
  nodes.map((n) => ({
    key: n.key,
    label: n.label,
    prefix: n.prefix,
    children: n.children ? buildScopeNodes(n.children) : undefined,
  }));

const makeEmptyRow = (): NewPrefixRow => ({
  _rowId: `__new__${Date.now()}_${Math.random()}`,
  prefix: '',
  description: '',
});

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
interface PrefixManagementProps {
  /** trueのとき Global 配下のPrefixのみ表示・操作可能 */
  globalOnly?: boolean;
  /** trueのとき「組織に共有」ボタンを表示する（実験管理者メニューのみ true を渡す） */
  showShareButton?: boolean;
  /** trueのとき閲覧モード（検索・フィルター以外のボタンを非活性） */
  viewOnly?: boolean;
}

const PrefixManagement: React.FC<PrefixManagementProps> = ({ globalOnly = false, showShareButton = false, viewOnly = false }) => {
  // ── viewOnly / globalOnly に応じてベースデータを動的に決定
  // 閲覧モード(viewOnly=true): Global含む全スコープ表示
  // 編集モード(viewOnly=false): グローバル以外のみ表示（編集対象外のGlobalを除外）
  const [rows, setRows] = useState<PrefixRow[]>(() => {
    if (globalOnly) return flattenGlobalPrefixes(namespaceTreeRaw as RawNode[]);
    if (viewOnly) return flattenAllPrefixes(namespaceTreeRaw as RawNode[]);
    return flattenPrefixes(namespaceTreeRaw as RawNode[]);
  });

  // viewOnly が変化したらデータを再計算（閲覧モード↔編集モード切替）
  useEffect(() => {
    if (globalOnly) return;
    setRows(
      viewOnly
        ? flattenAllPrefixes(namespaceTreeRaw as RawNode[])
        : flattenPrefixes(namespaceTreeRaw as RawNode[])
    );
    setSelectedPrefixIds([]);
    setNewRows([]);
    setEditingId(null);
  }, [viewOnly, globalOnly]);

  // ── 共有先ツリー: company配下のみ（Global/Personal を除外）
  const shareScopeNodes = useMemo<ScopeNode[]>(() => {
    const nodes = namespaceTreeRaw as RawNode[];
    const companyNode = nodes.find((n) => n.key === 'company');
    if (!companyNode) return [];
    return buildScopeNodes([companyNode]);
  }, []);
  const [newRows, setNewRows] = useState<NewPrefixRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{ prefix: string; description: string }>({
    prefix: '', description: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedPrefixIds, setSelectedPrefixIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);

  // 共有先選択モーダル
  const [shareScopeOpen, setShareScopeOpen] = useState(false);

  // ── 1件以上選択されているか（組織共有ボタン表示判定）
  const hasPersonalSelected = useMemo(() => {
    return selectedPrefixIds.length > 0;
  }, [selectedPrefixIds]);

  // ── ShareScopeModal: 共有先が確定されたときに選択中Prefixをコピー
  const handleShareToTarget = async (target: ShareTarget) => {
    setShareScopeOpen(false);
    const targetRows = rows.filter((r) => selectedPrefixIds.includes(r.id));
    const added: PrefixRow[] = [];
    const failed: string[] = [];

    for (const row of targetRows) {
      try {
        const res = await fetch('/api/v1/namespaces/prefixes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ prefix: row.prefix, description: row.description, nsKey: target.key }),
        });
        if (!res.ok) {
          failed.push(row.prefix);
        } else {
          const created: PrefixRow = await res.json();
          added.push({ ...created, scopePath: created.scopePath ?? '' });
        }
      } catch {
        failed.push(row.prefix);
      }
    }

    if (added.length > 0) {
      setRows((prev) => [...added, ...prev]);
    }
    if (failed.length > 0) {
      message.warning(`${added.length}件共有完了、${failed.length}件失敗しました`);
    } else {
      message.success(`${added.length}件のPrefixを「${target.label}」に共有しました`);
    }
    setSelectedPrefixIds([]);
  };

  // ── エクスポート（選択行のみCSV出力）
  const handleCsvDownload = () => {
    if (selectedPrefixIds.length === 0) {
      message.error('エクスポートするPrefixを1件以上選択してください');
      return;
    }
    const header = 'prefix,description';
    const csvRows = rows
      .filter((r) => selectedPrefixIds.includes(r.id))
      .map((r) =>
        [r.prefix, r.description]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      );
    const csv = [header, ...csvRows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prefixes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── インポート（CSVからDBに保存）
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) { message.error('CSVデータが空です'); return; }

        type ParsedRow = { prefix: string; description: string };
        const parsedRows: ParsedRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((c) =>
            c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
          ) ?? [];
          if (cols.length < 1) continue;
          const [prefix, description] = cols;
          if (!prefix) continue;
          parsedRows.push({ prefix: prefix ?? '', description: description ?? '' });
        }

        if (parsedRows.length === 0) { message.error('取込可能なデータがありませんでした'); return; }

        const added: PrefixRow[] = [];
        const failed: string[] = [];
        for (const row of parsedRows) {
          try {
            const res = await fetch('/api/v1/namespaces/prefixes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ prefix: row.prefix, description: row.description }),
            });
            if (!res.ok) {
              failed.push(row.prefix);
            } else {
              const created: PrefixRow = await res.json();
              added.push(created);
            }
          } catch {
            failed.push(row.prefix);
          }
        }

        if (added.length > 0) {
          setRows((prev) => [...prev, ...added]);
        }
        if (failed.length > 0) {
          message.warning(`${added.length}件保存、${failed.length}件失敗しました（失敗: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}）`);
        } else {
          message.success(`${added.length}件のPrefixをDBに保存しました`);
        }
      } catch {
        message.error('CSVの解析に失敗しました');
      } finally {
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // ── 新規行を追加
  const handleAddRow = () => {
    setNewRows((prev) => [...prev, makeEmptyRow()]);
  };

  // ── 新規行の値更新
  const updateNewRow = (rowId: string, field: 'prefix' | 'description', value: string) => {
    setNewRows((prev) =>
      prev.map((r) => r._rowId === rowId ? { ...r, [field]: value } : r)
    );
  };

  // ── 新規行を削除
  const removeNewRow = (rowId: string) => {
    setNewRows((prev) => prev.filter((r) => r._rowId !== rowId));
  };

  // ── 新規行を保存
  const handleSave = async () => {
    if (newRows.length === 0) return;
    for (const row of newRows) {
      if (!row.prefix) { message.error('すべての行でPrefixを入力してください'); return; }
    }

    const added: PrefixRow[] = [];
    for (const row of newRows) {
      try {
        const res = await fetch('/api/v1/namespaces/prefixes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ prefix: row.prefix, description: row.description }),
        });
        if (!res.ok) {
          // APIが未実装の場合はモックで追加
          added.push({ id: `mock-${Date.now()}-${row.prefix}`, prefix: row.prefix, description: row.description, scopePath: '' });
          continue;
        }
        const created: PrefixRow = await res.json();
        added.push({ ...created, scopePath: created.scopePath ?? '' });
      } catch {
        // APIが未実装の場合はモックで追加
        added.push({ id: `mock-${Date.now()}-${row.prefix}`, prefix: row.prefix, description: row.description, scopePath: '' });
      }
    }

    if (added.length > 0) {
      setRows((prev) => [...added, ...prev]);
      message.success(`${added.length}件のPrefixを登録しました`);
    }
    setNewRows([]);
  };

  // ── 既存行の編集開始
  const startEdit = (record: PrefixRow) => {
    setEditingId(record.id);
    setEditingValues({ prefix: record.prefix, description: record.description });
  };

  // ── 既存行の編集保存
  const saveEdit = async () => {
    if (!editingId) return;
    if (!editingValues.prefix) { message.error('Prefixは必須です'); return; }

    try {
      const res = await fetch(`/api/v1/namespaces/prefixes/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prefix: editingValues.prefix, description: editingValues.description }),
      });
      if (!res.ok) {
        // APIが未実装の場合はローカルで更新
      }
    } catch { /* APIが未実装の場合はローカルで更新 */ }

    setRows((prev) =>
      prev.map((r) => r.id === editingId ? { ...r, ...editingValues } : r)
    );
    setEditingId(null);
    message.success('Prefixを更新しました');
  };

  const cancelEdit = () => setEditingId(null);

  // ── アクティブ/非アクティブ切り替え
  const handleToggleActive = (id: string, prefix: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    setRows((prev) =>
      prev.map((r) => r.id === id ? { ...r, isActive: nextActive } : r)
    );
    message.success(`Prefix「${prefix}」を${nextActive ? 'アクティブ' : '非アクティブ'}にしました`);
  };

  // ── 列定義
  const columns: TableColumnsType<PrefixRow | NewPrefixRow> = [
    {
      title: 'Prefix',
      dataIndex: 'prefix',
      key: 'prefix',
      width: 200,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as PrefixRow).prefix.localeCompare((b as PrefixRow).prefix);
      },
      render: (_: unknown, record: PrefixRow | NewPrefixRow) => {
        if ('_rowId' in record) {
          return (
            <Input
              size="small"
              placeholder="例: materials"
              value={(record as NewPrefixRow).prefix}
              onChange={(e) => updateNewRow((record as NewPrefixRow)._rowId, 'prefix', e.target.value)}
            />
          );
        }
        const r = record as PrefixRow;
        return r.id === editingId
          ? <Input size="small" value={editingValues.prefix} onChange={(e) => setEditingValues((p) => ({ ...p, prefix: e.target.value }))} />
          : <Text strong>{r.prefix}</Text>;
      },
    },
    {
      title: '説明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as PrefixRow).description.localeCompare((b as PrefixRow).description);
      },
      render: (_: unknown, record: PrefixRow | NewPrefixRow) => {
        if ('_rowId' in record) {
          return (
            <Input
              size="small"
              placeholder="Prefixの説明..."
              value={(record as NewPrefixRow).description}
              onChange={(e) => updateNewRow((record as NewPrefixRow)._rowId, 'description', e.target.value)}
            />
          );
        }
        const r = record as PrefixRow;
        return r.id === editingId
          ? <Input size="small" value={editingValues.description} onChange={(e) => setEditingValues((p) => ({ ...p, description: e.target.value }))} />
          : r.description;
      },
    },
    ...(globalOnly ? [] : [{
      title: 'スコープ',
      key: 'scope',
      width: 200,
      align: 'center' as const,
      sorter: (a: PrefixRow | NewPrefixRow, b: PrefixRow | NewPrefixRow) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as PrefixRow).scopePath.localeCompare((b as PrefixRow).scopePath);
      },
      render: (_: unknown, record: PrefixRow | NewPrefixRow) => {
        if ('_rowId' in record) return <span style={{ color: '#bbb' }}>—</span>;
        const r = record as PrefixRow;
        const parts = (r.scopePath ?? '').split(' › ');
        const label = parts[parts.length - 1].trim();
        return (
          <Tooltip title={r.scopePath}>
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
    }]),
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: PrefixRow | NewPrefixRow) => {
        if ('_rowId' in record) {
          const r = record as NewPrefixRow;
          return (
            <Tooltip title="この行を削除">
              <Button size="small" icon={<CloseOutlined />} onClick={() => removeNewRow(r._rowId)} />
            </Tooltip>
          );
        }
        const r = record as PrefixRow;
        if (r.id === editingId) {
          return (
            <span style={{ display: 'flex', gap: 4 }}>
              <Button type="primary" size="small" icon={<SaveOutlined />} onClick={saveEdit}>保存</Button>
              <Button size="small" onClick={cancelEdit}>キャンセル</Button>
            </span>
          );
        }
        return (
          <span style={{ display: 'flex', gap: 4 }}>
            <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(r)}>編集</Button>
            <Button
              size="small"
              danger={r.isActive !== false}
              onClick={() => handleToggleActive(r.id, r.prefix, r.isActive !== false)}
              style={{ minWidth: '90px' }}
            >
              {r.isActive !== false ? '非アクティブ' : 'アクティブ'}
            </Button>
          </span>
        );
      },
    },
  ];

  // ── 検索フィルター適用
  const filteredRows = searchText
    ? rows.filter(
        (r) =>
          r.prefix.toLowerCase().includes(searchText.toLowerCase()) ||
          r.description.toLowerCase().includes(searchText.toLowerCase())
      )
    : rows;

  const tableData: (PrefixRow | NewPrefixRow)[] = [...newRows, ...filteredRows];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#fafafa' }}>
      {/* 組織共有バー（showShareButton=true かつ 1件以上選択中のみ表示） */}
      {showShareButton && hasPersonalSelected && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '6px 16px',
          borderBottom: '1px solid #e8e8e8',
          flexShrink: 0,
        }}>
          <Button
            icon={<BankOutlined />}
            onClick={() => setShareScopeOpen(true)}
            style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
          >
            共有する（{selectedPrefixIds.length}件）
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              const targets = rows.filter((r) => selectedPrefixIds.includes(r.id));
              targets.forEach((r) => handleToggleActive(r.id, r.prefix, r.isActive !== false));
              setSelectedPrefixIds([]);
            }}
          >
            選択したPrefixを非アクティブ（{selectedPrefixIds.length}件）
          </Button>
        </div>
      )}
      {/* ツールバー（左：検索欄、右：ボタン群） */}
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
        {/* 左：検索欄 */}
        <Input
          prefix={<SearchOutlined />}
          placeholder="Prefix・説明を検索..."
          allowClear
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
          style={{ flex: 1, minWidth: 80 }}
        />
        {/* 右：ボタン群 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />
          <Button disabled={viewOnly} onClick={() => csvInputRef.current?.click()}>インポート</Button>
          <Button disabled={viewOnly} onClick={handleCsvDownload}>エクスポート</Button>
          <Button type="primary" icon={<PlusOutlined />} disabled={viewOnly} onClick={handleAddRow}>
            Prefixを追加
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={viewOnly || newRows.length === 0}
          >
            保存
          </Button>
          <Button
            onClick={() => setNewRows([])}
            disabled={viewOnly || newRows.length === 0}
          >
            キャンセル
          </Button>
        </div>
      </div>

      {/* テーブルエリア */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {/* テーブル */}
        <Table<PrefixRow | NewPrefixRow>
        rowKey={(record) => '_rowId' in record ? (record as NewPrefixRow)._rowId : (record as PrefixRow).id}
        size="small"
        columns={columns}
        dataSource={tableData}
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys: selectedPrefixIds,
          columnTitle: (
            <input
              type="checkbox"
              checked={rows.length > 0 && selectedPrefixIds.length === rows.length}
              style={{ cursor: 'pointer' }}
              onChange={() => {
                if (selectedPrefixIds.length === rows.length) {
                  setSelectedPrefixIds([]);
                } else {
                  setSelectedPrefixIds(rows.map((r) => r.id));
                }
              }}
            />
          ),
          onChange: (keys) => setSelectedPrefixIds(keys as string[]),
          getCheckboxProps: (record) => ({ disabled: '_rowId' in record }),
        }}
        rowClassName={(record) => '_rowId' in record ? 'row-new-prefix' : ''}
        locale={{ triggerAsc: '昇順にソート', triggerDesc: '降順にソート', cancelSort: 'ソートをキャンセル' }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          showTotal: (total) => `全 ${total} 件`,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
        }}
      />

      <style>{`
          .row-new-prefix td { background: #fffbe6 !important; }
        `}</style>
      </div>

      {/* ── 共有先選択モーダル ── */}
      <ShareScopeModal
        open={shareScopeOpen}
        termCount={selectedPrefixIds.length}
        sourceRole={{ kind: 'dept_owner', deptKey: 'dept-rd', deptLabel: '研究開発部' } as ShareSourceRole}
        scopeNodes={shareScopeNodes}
        onClose={() => setShareScopeOpen(false)}
        onShare={handleShareToTarget}
      />
    </div>
  );
};

export default PrefixManagement;
