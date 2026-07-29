'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Input,
  Select,
  Table,
  message,
  Modal,
  Typography,
  Spin,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import {
  getNamespaceList,
  getTerms,
  createTerm,
  updateTerm,
} from '@/services/namespaceApiService';
import type { NamespaceTermRow } from '@/services/namespaceApiService';

const { Text } = Typography;

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────

interface TermManagementProps {
  /** true の場合、追加・編集ボタンを非活性にする */
  viewOnly?: boolean;
  /** true の場合、グローバルPrefix紐づき用語のみ対象（将来拡張用） */
  globalOnly?: boolean;
}

interface NewTermRow {
  _rowId: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  typeHint: string;
  unitHint: string;
}

interface EditValues {
  displayName: string;
  description: string;
  typeHint: string;
  unitHint: string;
}

const TYPE_OPTIONS = [
  { value: 'stringType',   label: 'stringType' },
  { value: 'integerType',  label: 'integerType' },
  { value: 'floatType',    label: 'floatType' },
  { value: 'booleanType',  label: 'booleanType' },
  { value: 'dateTimeType', label: 'dateTimeType' },
  { value: 'uriType',      label: 'uriType' },
];

const TYPE_COLOR: Record<string, string> = {
  stringType:   'blue',
  integerType:  'green',
  floatType:    'cyan',
  booleanType:  'orange',
  dateTimeType: 'purple',
  uriType:      'magenta',
};

const makeEmptyRow = (): NewTermRow => ({
  _rowId: `__new__${Date.now()}_${Math.random()}`,
  prefix: '',
  localName: '',
  displayName: '',
  description: '',
  typeHint: 'stringType',
  unitHint: '',
});

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────

const TermManagement: React.FC<TermManagementProps> = ({
  viewOnly = false,
  globalOnly = false,
}) => {
  const [terms, setTerms] = useState<NamespaceTermRow[]>([]);
  const [prefixOptions, setPrefixOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRows, setNewRows] = useState<NewTermRow[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<EditValues>({
    displayName: '',
    description: '',
    typeHint: 'stringType',
    unitHint: '',
  });
  const [searchText, setSearchText] = useState('');
  const [filterPrefix, setFilterPrefix] = useState<string | undefined>(undefined);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ── 初回ロード
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [namespaces, termList] = await Promise.all([
        getNamespaceList(),
        getTerms(),
      ]);
      setPrefixOptions(
        namespaces
          .map((n) => ({ value: n.prefix, label: n.prefix }))
          .filter((o, i, arr) => o.value && arr.findIndex((x) => x.value === o.value) === i)
      );
      setTerms(termList);
    } catch {
      message.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalOnly]);

  // ── 新規行追加
  const handleAddRow = () => {
    setNewRows((prev) => [...prev, makeEmptyRow()]);
  };

  const updateNewRow = (
    rowId: string,
    field: keyof Omit<NewTermRow, '_rowId'>,
    value: string
  ) => {
    setNewRows((prev) =>
      prev.map((r) => (r._rowId === rowId ? { ...r, [field]: value } : r))
    );
  };

  const removeNewRow = (rowId: string) => {
    setNewRows((prev) => prev.filter((r) => r._rowId !== rowId));
  };

  // ── 新規行を一括保存
  const handleSave = async () => {
    if (newRows.length === 0) return;
    for (const row of newRows) {
      if (!row.prefix) {
        message.error('すべての行でPrefixを選択してください');
        return;
      }
      if (!row.localName) {
        message.error('すべての行でローカル名を入力してください');
        return;
      }
    }

    const added: NamespaceTermRow[] = [];
    const failed: string[] = [];

    for (const row of newRows) {
      try {
        const created = await createTerm({
          prefix: row.prefix,
          localName: row.localName,
          displayName: row.displayName || undefined,
          description: row.description || undefined,
          typeHint: row.typeHint || undefined,
          unitHint: row.unitHint || undefined,
        });
        added.push(created);
      } catch {
        failed.push(`${row.prefix}:${row.localName}`);
      }
    }

    if (added.length > 0) {
      setTerms((prev) => [...added, ...prev]);
      message.success(`${added.length}件の用語を登録しました`);
    }
    if (failed.length > 0) {
      message.warning(
        `${failed.length}件の登録に失敗しました（${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}）`
      );
    }
    setNewRows([]);
  };

  // ── 既存行の編集
  const startEdit = (record: NamespaceTermRow) => {
    setEditingKey(`${record.prefix}:${record.localName}`);
    setEditingValues({
      displayName: record.displayName ?? '',
      description: record.description ?? '',
      typeHint: record.type ?? 'stringType',
      unitHint: record.unitHint ?? '',
    });
  };

  const saveEdit = async (record: NamespaceTermRow) => {
    try {
      const updated = await updateTerm(record.prefix, record.localName, {
        displayName: editingValues.displayName || undefined,
        description: editingValues.description || undefined,
        typeHint: editingValues.typeHint || undefined,
        unitHint: editingValues.unitHint || undefined,
      });
      setTerms((prev) =>
        prev.map((t) =>
          t.prefix === record.prefix && t.localName === record.localName ? updated : t
        )
      );
      message.success('用語を更新しました');
    } catch {
      message.error('用語の更新に失敗しました');
    } finally {
      setEditingKey(null);
    }
  };

  const cancelEdit = () => setEditingKey(null);

  // ── アクティブ/非アクティブ切替（ローカルのみ、APIは未対応のためトグル表示のみ）
  const handleToggleActive = (record: NamespaceTermRow) => {
    const isActive = (record as NamespaceTermRow & { isActive?: boolean }).isActive !== false;
    Modal.confirm({
      title: isActive
        ? `「${record.prefix}:${record.localName}」を非アクティブにしますか？`
        : `「${record.prefix}:${record.localName}」をアクティブにしますか？`,
      okText: isActive ? '非アクティブ' : 'アクティブ',
      cancelText: 'キャンセル',
      okButtonProps: { danger: isActive },
      onOk: () => {
        setTerms((prev) =>
          prev.map((t) =>
            t.prefix === record.prefix && t.localName === record.localName
              ? { ...t, isActive: !isActive } as NamespaceTermRow & { isActive: boolean }
              : t
          )
        );
        message.success(isActive ? '非アクティブにしました' : 'アクティブにしました');
      },
    });
  };

  // ── CSV エクスポート
  const handleCsvDownload = () => {
    const target = filteredTerms;
    if (target.length === 0) {
      message.error('エクスポートするデータがありません');
      return;
    }
    const header = 'prefix,localName,displayName,description,type,unitHint';
    const rows = target.map((t) =>
      [t.prefix, t.localName, t.displayName, t.description, t.type, t.unitHint ?? '']
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'terms.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── CSV インポート
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          message.error('CSVデータが空です');
          return;
        }
        const parsedRows: Array<{
          prefix: string; localName: string; displayName: string;
          description: string; typeHint: string; unitHint: string;
        }> = [];
        for (let i = 1; i < lines.length; i++) {
          const cols =
            lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((c) =>
              c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
            ) ?? [];
          if (cols.length < 2) continue;
          const [prefix, localName, displayName, description, typeHint, unitHint] = cols;
          if (!prefix || !localName) continue;
          parsedRows.push({
            prefix, localName,
            displayName: displayName ?? '',
            description: description ?? '',
            typeHint: typeHint ?? 'stringType',
            unitHint: unitHint ?? '',
          });
        }
        if (parsedRows.length === 0) {
          message.error('取込可能なデータがありませんでした');
          return;
        }
        const added: NamespaceTermRow[] = [];
        const failed: string[] = [];
        for (const row of parsedRows) {
          try {
            const created = await createTerm({
              prefix: row.prefix,
              localName: row.localName,
              displayName: row.displayName || undefined,
              description: row.description || undefined,
              typeHint: row.typeHint || undefined,
              unitHint: row.unitHint || undefined,
            });
            added.push(created);
          } catch {
            failed.push(`${row.prefix}:${row.localName}`);
          }
        }
        if (added.length > 0) {
          setTerms((prev) => [...prev, ...added]);
        }
        if (failed.length > 0) {
          message.warning(
            `${added.length}件保存、${failed.length}件失敗（${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}）`
          );
        } else {
          message.success(`${added.length}件の用語をDBに保存しました`);
        }
      } catch {
        message.error('CSVの解析に失敗しました');
      } finally {
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // ── フィルター
  const filteredTerms = terms.filter((t) => {
    if (filterPrefix && t.prefix !== filterPrefix) return false;
    if (filterType && t.type !== filterType) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      return (
        t.prefix.toLowerCase().includes(q) ||
        t.localName.toLowerCase().includes(q) ||
        (t.displayName ?? '').toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── 列定義
  const columns: TableColumnsType<NamespaceTermRow | NewTermRow> = [
    {
      title: 'Prefix',
      dataIndex: 'prefix',
      key: 'prefix',
      width: 140,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as NamespaceTermRow).prefix.localeCompare((b as NamespaceTermRow).prefix);
      },
      render: (_: unknown, record: NamespaceTermRow | NewTermRow) => {
        if ('_rowId' in record) {
          const r = record as NewTermRow;
          return (
            <Select
              size="small"
              style={{ width: '100%' }}
              value={r.prefix || undefined}
              placeholder="選択..."
              options={prefixOptions}
              onChange={(v) => updateNewRow(r._rowId, 'prefix', v ?? '')}
            />
          );
        }
        return <Text strong>{(record as NamespaceTermRow).prefix}</Text>;
      },
    },
    {
      title: 'ローカル名',
      dataIndex: 'localName',
      key: 'localName',
      width: 180,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as NamespaceTermRow).localName.localeCompare((b as NamespaceTermRow).localName);
      },
      render: (_: unknown, record: NamespaceTermRow | NewTermRow) => {
        if ('_rowId' in record) {
          const r = record as NewTermRow;
          return (
            <Input
              size="small"
              placeholder="例: SampleTemperature"
              value={r.localName}
              onChange={(e) => updateNewRow(r._rowId, 'localName', e.target.value)}
            />
          );
        }
        return <Text code>{(record as NamespaceTermRow).localName}</Text>;
      },
    },
    {
      title: '表示名',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 160,
      render: (_: unknown, record: NamespaceTermRow | NewTermRow) => {
        if ('_rowId' in record) {
          const r = record as NewTermRow;
          return (
            <Input
              size="small"
              placeholder="例: サンプル温度"
              value={r.displayName}
              onChange={(e) => updateNewRow(r._rowId, 'displayName', e.target.value)}
            />
          );
        }
        const r = record as NamespaceTermRow;
        const key = `${r.prefix}:${r.localName}`;
        if (key === editingKey) {
          return (
            <Input
              size="small"
              value={editingValues.displayName}
              onChange={(e) => setEditingValues((p) => ({ ...p, displayName: e.target.value }))}
            />
          );
        }
        return r.displayName ?? '';
      },
    },
    {
      title: '説明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (_: unknown, record: NamespaceTermRow | NewTermRow) => {
        if ('_rowId' in record) {
          const r = record as NewTermRow;
          return (
            <Input
              size="small"
              placeholder="任意"
              value={r.description}
              onChange={(e) => updateNewRow(r._rowId, 'description', e.target.value)}
            />
          );
        }
        const r = record as NamespaceTermRow;
        const key = `${r.prefix}:${r.localName}`;
        if (key === editingKey) {
          return (
            <Input
              size="small"
              value={editingValues.description}
              onChange={(e) => setEditingValues((p) => ({ ...p, description: e.target.value }))}
            />
          );
        }
        return r.description ?? '';
      },
    },
    {
      title: '型',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (_: unknown, record: NamespaceTermRow | NewTermRow) => {
        if ('_rowId' in record) {
          const r = record as NewTermRow;
          return (
            <Select
              size="small"
              style={{ width: '100%' }}
              value={r.typeHint || 'stringType'}
              options={TYPE_OPTIONS}
              onChange={(v) => updateNewRow(r._rowId, 'typeHint', v)}
            />
          );
        }
        const r = record as NamespaceTermRow;
        const key = `${r.prefix}:${r.localName}`;
        if (key === editingKey) {
          return (
            <Select
              size="small"
              style={{ width: '100%' }}
              value={editingValues.typeHint || 'stringType'}
              options={TYPE_OPTIONS}
              onChange={(v) => setEditingValues((p) => ({ ...p, typeHint: v }))}
            />
          );
        }
        return r.type ? (
          <Tag color={TYPE_COLOR[r.type] ?? 'default'} style={{ fontSize: 11 }}>
            {r.type}
          </Tag>
        ) : null;
      },
    },
    {
      title: '単位',
      dataIndex: 'unitHint',
      key: 'unitHint',
      width: 100,
      render: (_: unknown, record: NamespaceTermRow | NewTermRow) => {
        if ('_rowId' in record) {
          const r = record as NewTermRow;
          return (
            <Input
              size="small"
              placeholder="例: celsius"
              value={r.unitHint}
              onChange={(e) => updateNewRow(r._rowId, 'unitHint', e.target.value)}
            />
          );
        }
        const r = record as NamespaceTermRow;
        const key = `${r.prefix}:${r.localName}`;
        if (key === editingKey) {
          return (
            <Input
              size="small"
              value={editingValues.unitHint}
              onChange={(e) => setEditingValues((p) => ({ ...p, unitHint: e.target.value }))}
            />
          );
        }
        return r.unitHint ?? '';
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: NamespaceTermRow | NewTermRow) => {
        if ('_rowId' in record) {
          const r = record as NewTermRow;
          return (
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={() => removeNewRow(r._rowId)}
            >
              削除
            </Button>
          );
        }
        const r = record as NamespaceTermRow;
        const key = `${r.prefix}:${r.localName}`;
        const isActive = (r as NamespaceTermRow & { isActive?: boolean }).isActive !== false;

        if (key === editingKey) {
          return (
            <span style={{ display: 'flex', gap: 4 }}>
              <Button type="primary" size="small" icon={<SaveOutlined />} onClick={() => saveEdit(r)}>保存</Button>
              <Button size="small" onClick={cancelEdit}>キャンセル</Button>
            </span>
          );
        }
        return (
          <span style={{ display: 'flex', gap: 4 }}>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={viewOnly}
              onClick={() => !viewOnly && startEdit(r)}
            >
              編集
            </Button>
            <Button
              size="small"
              danger={!viewOnly && isActive}
              disabled={viewOnly}
              onClick={() => !viewOnly && handleToggleActive(r)}
              style={{ minWidth: 88 }}
            >
              {isActive ? '非アクティブ' : 'アクティブ'}
            </Button>
          </span>
        );
      },
    },
  ];

  const tableData: (NamespaceTermRow | NewTermRow)[] = [...newRows, ...filteredTerms];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: '#fafafa',
      }}
    >
      {/* ── ツールバー ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid #e8e8e8',
          background: '#fff',
          flexShrink: 0,
        }}
      >
        {/* 左：検索・フィルター */}
        <Input
          prefix={<SearchOutlined />}
          placeholder="Prefix・ローカル名・表示名・説明を検索..."
          allowClear
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
          style={{ flex: 1, minWidth: 180 }}
        />
        <Select
          allowClear
          placeholder="Prefixで絞り込み"
          style={{ width: 160 }}
          value={filterPrefix}
          options={prefixOptions}
          onChange={(v) => { setFilterPrefix(v); setCurrentPage(1); }}
        />
        <Select
          allowClear
          placeholder="型で絞り込み"
          style={{ width: 140 }}
          value={filterType}
          options={TYPE_OPTIONS}
          onChange={(v) => { setFilterType(v); setCurrentPage(1); }}
        />

        {/* 右：アクションボタン */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleCsvUpload}
          />
          <Button disabled={viewOnly} onClick={() => csvInputRef.current?.click()}>
            インポート
          </Button>
          <Button onClick={handleCsvDownload}>エクスポート</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={viewOnly}
            onClick={handleAddRow}
          >
            用語を追加
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

      {/* ── テーブルエリア ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        <Spin spinning={loading} tip="読み込み中...">
          <Table<NamespaceTermRow | NewTermRow>
            rowKey={(record) =>
              '_rowId' in record
                ? (record as NewTermRow)._rowId
                : `${(record as NamespaceTermRow).prefix}:${(record as NamespaceTermRow).localName}`
            }
            size="small"
            columns={columns}
            dataSource={tableData}
            rowClassName={(record) => ('_rowId' in record ? 'row-new-term' : '')}
            locale={{
              triggerAsc: '昇順にソート',
              triggerDesc: '降順にソート',
              cancelSort: 'ソートをキャンセル',
              emptyText: loading ? '読み込み中...' : 'データがありません',
            }}
            pagination={{
              current: currentPage,
              pageSize,
              showTotal: (total) => `全 ${total} 件`,
              showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100'],
              onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
            }}
          />
        </Spin>

        <style>{`
          .row-new-term td { background: #fffbe6 !important; }
        `}</style>
      </div>
    </div>
  );
};

export default TermManagement;
