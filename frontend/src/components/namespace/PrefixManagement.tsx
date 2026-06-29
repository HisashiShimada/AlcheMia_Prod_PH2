'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Button, Input, Table, message, Modal, Typography, Tooltip, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined, SearchOutlined, BankOutlined } from '@ant-design/icons';
import namespaceTreeRaw from '../../../mock/namespace/uncertainty-scope.json';
import type { TableColumnsType } from 'antd';

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
    const selfLabel = ancestors.length === 0 && node.icon ? `${node.icon} ${node.label}` : node.label;
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
}

const PrefixManagement: React.FC<PrefixManagementProps> = ({ globalOnly = false, showShareButton = false }) => {
  const [rows, setRows] = useState<PrefixRow[]>(() =>
    globalOnly
      ? flattenGlobalPrefixes(namespaceTreeRaw as RawNode[])
      : flattenPrefixes(namespaceTreeRaw as RawNode[])
  );
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

  // ── 1件以上選択されているか（組織共有ボタン表示判定）
  const hasPersonalSelected = useMemo(() => {
    return selectedPrefixIds.length > 0;
  }, [selectedPrefixIds]);

  // ── ログインユーザーの所属組織Prefixを取得
  const currentUserOrgPrefix = useMemo(() => {
    const findPrefix = (key: string, nodes: RawNode[]): string | null => {
      for (const n of nodes) {
        if (n.key === key) return n.prefix ?? null;
        if (n.children) { const r = findPrefix(key, n.children); if (r) return r; }
      }
      return null;
    };
    return findPrefix(CURRENT_USER_NS_KEY, namespaceTreeRaw as RawNode[]);
  }, []);

  // ── 選択中のPrefixを組織にコピーして共有する
  const handleShareToOrg = () => {
    if (!hasPersonalSelected) return;
    if (!currentUserOrgPrefix) {
      message.error('所属組織の名前空間が見つかりません');
      return;
    }
    const targetRows = rows.filter((r) => selectedPrefixIds.includes(r.id) && (r.scopePath ?? '').includes('👤'));

    Modal.confirm({
      title: `${targetRows.length}件のPrefixを組織に共有しますか？`,
      content: `選択したPrefixを組織（${currentUserOrgPrefix}）にコピーします。個人のPrefixはそのまま残ります。`,
      okText: '共有する',
      cancelText: 'キャンセル',
      okButtonProps: { style: { background: '#52c41a', borderColor: '#52c41a' } },
      onOk: async () => {
        const added: PrefixRow[] = [];
        const failed: string[] = [];

        for (const row of targetRows) {
          try {
            const res = await fetch('/api/v1/namespaces/prefixes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ prefix: row.prefix, description: row.description, nsKey: CURRENT_USER_NS_KEY }),
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
          message.success(`${added.length}件のPrefixを組織に共有しました`);
        }
      },
    });
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

  // ── 削除
  const handleDelete = async (id: string, prefix: string) => {
    try {
      await fetch(`/api/v1/namespaces/prefixes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch { /* APIが未実装でも継続 */ }

    setRows((prev) => prev.filter((r) => r.id !== id));
    message.success(`Prefix「${prefix}」を削除しました`);
  };

  // ── 列定義
  const columns: TableColumnsType<PrefixRow | NewPrefixRow> = [
    {
      title: '用語Prefix',
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
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id, r.prefix)}>削除</Button>
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
            onClick={handleShareToOrg}
            style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
          >
            組織に共有（{selectedPrefixIds.length}件）
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              const targets = rows.filter((r) => selectedPrefixIds.includes(r.id));
              targets.forEach((r) => handleDelete(r.id, r.prefix));
              setSelectedPrefixIds([]);
            }}
          >
            選択したPrefixを削除（{selectedPrefixIds.length}件）
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
          <Button onClick={() => csvInputRef.current?.click()}>インポート</Button>
          <Button onClick={handleCsvDownload}>エクスポート</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
            Prefixを追加
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={newRows.length === 0}
          >
            保存
          </Button>
          <Button
            onClick={() => setNewRows([])}
            disabled={newRows.length === 0}
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
    </div>
  );
};

export default PrefixManagement;
