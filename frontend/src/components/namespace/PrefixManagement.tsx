'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button, Input, Table, message, Modal, Typography, Tooltip, Spin } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import {
  getNamespaceList,
  createNamespace,
  updateNamespace,
  deleteNamespace,
} from '@/services/namespaceApiService';
import type {
  PrefixManagementProps,
  PrefixRowLocal as PrefixRow,
  NewPrefixRowLocal as NewPrefixRow,
  PrefixEditValuesWithUri,
} from '@/types/namespace';

const { Text } = Typography;

// ──────────────────────────────────────────────
// コンポーネント補助
// ──────────────────────────────────────────────

const makeEmptyRow = (): NewPrefixRow => ({
  _rowId: `__new__${Date.now()}_${Math.random()}`,
  prefix: '',
  uri: '',
  description: '',
});

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────

const PrefixManagement: React.FC<PrefixManagementProps> = ({
  viewOnly = false,
  globalOnly = false,
  selectedNsKey,
  scopeKey,
}) => {
  const { t } = useLanguage();
  const [rows, setRows] = useState<PrefixRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRows, setNewRows] = useState<NewPrefixRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<PrefixEditValuesWithUri>({
    prefix: '',
    uri: '',
    description: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ── Prefix一覧取得: selectedNsKey が変化するたびに再フェッチ
  const fetchNamespaces = async (scopeKey?: string) => {
    setLoading(true);
    try {
      const options = scopeKey ? { scopeKeys: [scopeKey] } : undefined;
      const list = await getNamespaceList(options);
      setRows(
        list.map((ns) => ({
          id: ns.prefix,
          prefix: ns.prefix,
          uri: ns.uri,
          description: '',
          /** DB由来のスコープ名（organization_group_name または user_name） */
          scopePath: (ns as any).scopeName ?? '',
        }))
      );
    } catch {
      message.error(t('prefixManagement.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // スコープ変更時に未保存のインライン入力行・編集中状態をクリアする
    setNewRows([]);
    setEditingId(null);
    fetchNamespaces(selectedNsKey ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNsKey]);

  // ── 新規行を追加
  const handleAddRow = () => {
    setNewRows((prev) => [...prev, makeEmptyRow()]);
  };

  // ── 新規行の値更新
  const updateNewRow = (rowId: string, field: 'prefix' | 'uri' | 'description', value: string) => {
    setNewRows((prev) =>
      prev.map((r) => (r._rowId === rowId ? { ...r, [field]: value } : r))
    );
  };

  // ── 新規行を削除
  const removeNewRow = (rowId: string) => {
    setNewRows((prev) => prev.filter((r) => r._rowId !== rowId));
  };

  // ── 新規行を保存（実処理）
  const executeSave = async () => {
    const added: PrefixRow[] = [];
    const failed: string[] = [];

    for (const row of newRows) {
      try {
        const created = await createNamespace({
          prefix: row.prefix,
          uri: row.uri,
          description: row.description || undefined,
          isGlobal: globalOnly,
          scopeKey: scopeKey ?? selectedNsKey ?? undefined,
        });
        added.push({
          id: created.prefix,
          prefix: created.prefix,
          uri: created.uri,
          description: row.description,
        });
      } catch {
        failed.push(row.prefix);
      }
    }

    if (added.length > 0) {
      setRows((prev) => [...added, ...prev]);
      message.success(t('prefixManagement.saveSuccess', { count: String(added.length) }));
    }
    if (failed.length > 0) {
      message.warning(
        t('prefixManagement.savePartialFailure', { failCount: String(failed.length), names: `${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}` })
      );
    }
    setNewRows([]);
  };

  // ── 新規行を保存
  const handleSave = async () => {
    if (newRows.length === 0) return;
    for (const row of newRows) {
      if (!row.prefix) {
        message.error(t('prefixManagement.prefixRequired'));
        return;
      }
      if (!row.uri) {
        message.error(t('prefixManagement.uriRequired'));
        return;
      }
    }

    // 並列チームに同名 prefix が存在するか確認
    // rows（既存prefix一覧）から重複を検索し、最初に見つかった1件を代表として警告表示する
    const firstDuplicate = newRows
      .map((newRow) => {
        const existing = rows.find(
          (r) => r.prefix.toLowerCase() === newRow.prefix.toLowerCase()
        ) as (PrefixRow & { scopePath?: string }) | undefined;
        return existing ? { prefix: newRow.prefix, scopeName: existing.scopePath ?? existing.prefix } : null;
      })
      .find((d) => d !== null);

    if (firstDuplicate) {
      Modal.confirm({
        title: t('prefixManagement.warnTitle'),
        icon: <WarningOutlined style={{ color: '#faad14' }} />,
        content: t('prefixManagement.warnAlreadyRegistered', {
          prefix: firstDuplicate.prefix,
          scopeName: firstDuplicate.scopeName,
        }),
        okText: t('prefixManagement.warnOk'),
        cancelText: t('prefixManagement.warnCancel'),
        onOk: () => executeSave(),
      });
      return;
    }

    await executeSave();
  };

  // ── 既存行の編集開始
  const startEdit = (record: PrefixRow) => {
    setEditingId(record.id);
    setEditingValues({
      prefix: record.prefix,
      uri: record.uri,
      description: record.description ?? '',
    });
  };

  // ── 既存行の編集保存（PATCH /api/v1/namespaces/:prefix でDB更新）
  const saveEdit = async () => {
    if (!editingId) return;
    if (!editingValues.prefix) {
      message.error(t('prefixManagement.prefixRequiredEdit'));
      return;
    }
    if (!editingValues.uri) {
      message.error(t('prefixManagement.uriRequired'));
      return;
    }
    try {
      await updateNamespace(editingId, { uri: editingValues.uri });
      setEditingId(null);
      message.success(t('prefixManagement.updateSuccess'));
      await fetchNamespaces(selectedNsKey ?? undefined);
    } catch {
      message.error(t('prefixManagement.updateError'));
    }
  };

  const cancelEdit = () => setEditingId(null);

  // ── 削除（DBから削除）
  const handleDelete = (record: PrefixRow) => {
    Modal.confirm({
      title: t('prefixManagement.deleteConfirm', { prefix: record.prefix }),
      content: t('prefixManagement.deleteContent'),
      okText: t('prefixManagement.deleteOk'),
      cancelText: t('prefixManagement.deleteCancelBtn'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteNamespace(record.prefix);
          setRows((prev) => prev.filter((r) => r.id !== record.id));
          message.success(t('prefixManagement.deleteSuccess', { prefix: record.prefix }));
        } catch {
          message.error(t('prefixManagement.deleteError', { prefix: record.prefix }));
        }
      },
    });
  };

  // ── エクスポート（CSV）
  const handleCsvDownload = () => {
    if (rows.length === 0) {
      message.error(t('prefixManagement.exportEmptyError'));
      return;
    }
    const header = 'prefix,uri,description';
    const csvRows = rows.map((r) =>
      [r.prefix, r.uri, r.description ?? '']
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
        if (lines.length < 2) {
          message.error(t('prefixManagement.csvEmpty'));
          return;
        }

        const parsedRows: Array<{ prefix: string; uri: string; description: string }> = [];
        for (let i = 1; i < lines.length; i++) {
          const cols =
            lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((c) =>
              c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
            ) ?? [];
          if (cols.length < 2) continue;
          const [prefix, uri, description] = cols;
          if (!prefix || !uri) continue;
          parsedRows.push({ prefix, uri, description: description ?? '' });
        }

        if (parsedRows.length === 0) {
          message.error(t('prefixManagement.csvNoData'));
          return;
        }

        const added: PrefixRow[] = [];
        const failed: string[] = [];
        for (const row of parsedRows) {
          try {
            const created = await createNamespace({
              prefix: row.prefix,
              uri: row.uri,
              description: row.description || undefined,
              isGlobal: globalOnly,
            });
            added.push({
              id: created.prefix,
              prefix: created.prefix,
              uri: created.uri,
              description: row.description,
            });
          } catch {
            failed.push(row.prefix);
          }
        }

        if (added.length > 0) {
          setRows((prev) => [...prev, ...added]);
        }
        if (failed.length > 0) {
          message.warning(
            t('prefixManagement.csvImportPartial', { saved: String(added.length), failCount: String(failed.length), names: `${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}` })
          );
        } else {
          message.success(t('prefixManagement.csvImportSuccess', { count: String(added.length) }));
        }
      } catch {
        message.error(t('prefixManagement.csvParseError'));
      } finally {
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // ── 列定義
  const columns: TableColumnsType<PrefixRow | NewPrefixRow> = [
    {
      title: 'Prefix',
      dataIndex: 'prefix',
      key: 'prefix',
      width: 160,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as PrefixRow).prefix.localeCompare((b as PrefixRow).prefix);
      },
      render: (_: unknown, record: PrefixRow | NewPrefixRow) => {
        if ('_rowId' in record) {
          return (
              <Input
                size="small"
                placeholder={t('prefixManagement.placeholderPrefix')}
                value={(record as NewPrefixRow).prefix}
              onChange={(e) =>
                updateNewRow((record as NewPrefixRow)._rowId, 'prefix', e.target.value)
              }
            />
          );
        }
        const r = record as PrefixRow;
        return r.id === editingId ? (
          <Input
            size="small"
            value={editingValues.prefix}
            onChange={(e) =>
              setEditingValues((p) => ({ ...p, prefix: e.target.value }))
            }
          />
        ) : (
          <Text strong>{r.prefix}</Text>
        );
      },
    },
    {
      title: 'URI',
      dataIndex: 'uri',
      key: 'uri',
      ellipsis: true,
      render: (_: unknown, record: PrefixRow | NewPrefixRow) => {
        if ('_rowId' in record) {
          return (
            <Input
              size="small"
              placeholder={t('prefixManagement.placeholderUri')}
              value={(record as NewPrefixRow).uri}
              onChange={(e) =>
                updateNewRow((record as NewPrefixRow)._rowId, 'uri', e.target.value)
              }
            />
          );
        }
        const r = record as PrefixRow;
        return r.id === editingId ? (
          <Input
            size="small"
            value={editingValues.uri}
            onChange={(e) =>
              setEditingValues((p) => ({ ...p, uri: e.target.value }))
            }
          />
        ) : (
          <Tooltip title={r.uri}>
            <Text style={{ fontSize: 12, color: '#1677ff' }}>{r.uri}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: t('prefixManagement.colDescription'),
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (_: unknown, record: PrefixRow | NewPrefixRow) => {
        if ('_rowId' in record) {
          return (
            <Input
              size="small"
              placeholder={t('prefixManagement.placeholderDescription')}
              value={(record as NewPrefixRow).description}
              onChange={(e) =>
                updateNewRow((record as NewPrefixRow)._rowId, 'description', e.target.value)
              }
            />
          );
        }
        const r = record as PrefixRow;
        return r.id === editingId ? (
          <Input
            size="small"
            value={editingValues.description}
            onChange={(e) =>
              setEditingValues((p) => ({ ...p, description: e.target.value }))
            }
          />
        ) : (
          r.description ?? ''
        );
      },
    },
    {
      title: t('prefixManagement.colScope'),
      key: 'scopePath',
      dataIndex: 'scopePath',
      width: 160,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        const sA = (a as PrefixRow & { scopePath?: string }).scopePath ?? '';
        const sB = (b as PrefixRow & { scopePath?: string }).scopePath ?? '';
        return sA.localeCompare(sB);
      },
      render: (_: unknown, record: PrefixRow | NewPrefixRow) => {
        if ('_rowId' in record) return <span style={{ color: '#bbb' }}>—</span>;
        const r = record as PrefixRow & { scopePath?: string };
        const label = r.scopePath || '—';
        return (
          <Tooltip title={label}>
            <span
              style={{
                fontSize: 11,
                color: '#555',
                background: '#f5f5f5',
                border: '1px solid #e8e8e8',
                borderRadius: 4,
                padding: '1px 6px',
                display: 'inline-block',
                maxWidth: 140,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: t('prefixManagement.colActions'),
      key: 'actions',
      width: 180,
      render: (_: unknown, record: PrefixRow | NewPrefixRow) => {
        if ('_rowId' in record) {
          return null;
        }
        const r = record as PrefixRow;
        if (r.id === editingId) {
          return (
            <span style={{ display: 'flex', gap: 4 }}>
              <Button
                type="primary"
                size="small"
                icon={<SaveOutlined />}
                onClick={saveEdit}
              >
                {t('prefixManagement.btnSaveEdit')}
              </Button>
              <Button size="small" onClick={cancelEdit}>
                {t('prefixManagement.btnCancelEdit')}
              </Button>
            </span>
          );
        }
        return (
          <span style={{ display: 'flex', gap: 4 }}>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={viewOnly}
              onClick={() => startEdit(r)}
            >
              {t('prefixManagement.btnEdit')}
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={viewOnly}
              onClick={() => handleDelete(r)}
            >
              {t('prefixManagement.btnDelete')}
            </Button>
          </span>
        );
      },
    },
  ];

  // ── 検索フィルター
  const filteredRows = searchText
    ? rows.filter(
        (r) =>
          r.prefix.toLowerCase().includes(searchText.toLowerCase()) ||
          r.uri.toLowerCase().includes(searchText.toLowerCase()) ||
          (r.description ?? '').toLowerCase().includes(searchText.toLowerCase())
      )
    : rows;

  const tableData: (PrefixRow | NewPrefixRow)[] = [...newRows, ...filteredRows];

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
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid #e8e8e8',
          background: '#fff',
          flexShrink: 0,
        }}
      >
        {/* 左：検索欄 */}
        <Input
          prefix={<SearchOutlined />}
          placeholder={t('prefixManagement.searchPlaceholder')}
          allowClear
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setCurrentPage(1);
          }}
          style={{ flex: 1, minWidth: 80 }}
        />
        {/* 右：ボタン群 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleCsvUpload}
          />
          <Button disabled={viewOnly} onClick={() => csvInputRef.current?.click()}>
            {t('prefixManagement.btnImport')}
          </Button>
          <Button onClick={handleCsvDownload}>{t('prefixManagement.btnExport')}</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={viewOnly}
            onClick={handleAddRow}
          >
            {t('prefixManagement.btnAddPrefix')}
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={viewOnly || newRows.length === 0}
          >
            {t('prefixManagement.btnSave')}
          </Button>
          <Button
            onClick={() => setNewRows([])}
            disabled={viewOnly || newRows.length === 0}
          >
            {t('prefixManagement.btnCancel')}
          </Button>
        </div>
      </div>

      {/* ── テーブルエリア ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        <Spin spinning={loading} tip={t('prefixManagement.loading')}>
          <Table<PrefixRow | NewPrefixRow>
            rowKey={(record) =>
              '_rowId' in record
                ? (record as NewPrefixRow)._rowId
                : (record as PrefixRow).id
            }
            size="small"
            columns={columns}
            dataSource={tableData}
            rowSelection={{
              selectedRowKeys,
              columnTitle: (
                <input
                  type="checkbox"
                  checked={filteredRows.length > 0 && selectedRowKeys.length === filteredRows.length}
                  style={{ cursor: 'pointer' }}
                  onChange={() => {
                    if (selectedRowKeys.length === filteredRows.length) {
                      setSelectedRowKeys([]);
                    } else {
                      setSelectedRowKeys(filteredRows.map((r) => r.id));
                    }
                  }}
                />
              ),
              onChange: (keys) => setSelectedRowKeys(keys),
              getCheckboxProps: (record) => ({
                disabled: '_rowId' in record,
              }),
            }}
            rowClassName={(record) =>
              '_rowId' in record ? 'row-new-prefix' : ''
            }
            locale={{
              triggerAsc: t('prefixManagement.sortAsc'),
              triggerDesc: t('prefixManagement.sortDesc'),
              cancelSort: t('prefixManagement.sortCancel'),
              emptyText: loading ? t('prefixManagement.loading') : t('prefixManagement.emptyText'),
            }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              showTotal: (total) => t('prefixManagement.showTotal', { total: String(total) }),
              showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100'],
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
          />
        </Spin>

        <style>{`
          .row-new-prefix td { background: #fffbe6 !important; }
        `}</style>
      </div>
    </div>
  );
};

export default PrefixManagement;
