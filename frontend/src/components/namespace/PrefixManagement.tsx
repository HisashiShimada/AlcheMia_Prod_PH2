'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SYSTEM_NAMESPACE_PREFIX } from '@/constants/systemNamespace';
import { isValidNCName } from '@/utils/ncname';
import { Button, Input, Table, message, Modal, Typography, Tooltip, Spin, Tag } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  SaveOutlined,
  SearchOutlined,
  WarningOutlined,
  BankOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import {
  getNamespaceList,
  createNamespace,
  updateNamespace,
  deleteNamespace,
  toggleNamespaceActive,
  fetchSuggestedUri,
  getGlobalDeclarations,
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
  showShareButton = false,
  onShareSelected,
  selectedNsKey,
  scopeKey,
  orgGroupCds,
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
  // scopeKeys（複数）を渡した場合は複数スコープの Prefix をまとめて取得する（company ノード選択時）
  // withAncestors=true の場合は scopeKey とその祖先グループの Prefix も含めて取得する
  const fetchNamespaces = async (
    singleScopeKey?: string,
    withAncestors?: boolean,
    scopeKeys?: string[]
  ) => {
    setLoading(true);
    try {
      let options: Parameters<typeof getNamespaceList>[0];
      if (scopeKeys && scopeKeys.length > 0) {
        // 複数 scopeKey 指定（company ノード選択時など）
        options = { scopeKeys, withAncestors };
      } else if (singleScopeKey) {
        // 単一 scopeKey 指定
        options = { scopeKey: singleScopeKey, withAncestors };
      } else {
        // スコープ指定なし → 全件取得
        options = undefined;
      }
      const list = await getNamespaceList(options);
      setRows(
        list.map((ns) => ({
          id: ns.prefix,
          prefix: ns.prefix,
          uri: ns.uri,
          description: (ns as any).description ?? '',
          /** DB由来のスコープ名（organization_group_name または user_name） */
          scopePath: (ns as any).scopeName ?? '',
          /** アクティブ状態（SQL の isActive カラム） */
          isActive: (ns as any).isActive !== false,
        }))
      );
    } catch {
      message.error(t('prefixManagement.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  // ── 現在の selectedNsKey / orgGroupCds に基づいて一覧を再フェッチ
  // saveEdit / useEffect 両方から呼ぶことでフェッチロジックを一元化する
  const reloadNamespaces = () => {
    const key = selectedNsKey ?? undefined;
    const STATIC_KEYS = new Set(['global', 'ns-maiml', 'ns-xsi', 'personal']);

    if (!key || key === 'company') {
      // company ノード or 選択なし → 配下の全グループ対象
      if (orgGroupCds && orgGroupCds.length > 0) {
        fetchNamespaces(undefined, undefined, orgGroupCds);
      } else {
        fetchNamespaces(undefined, undefined);
      }
    } else if (key.startsWith('personal-')) {
      // personal-{userId} ノード → personal- を除去して userId を scopeKey として渡す
      const userId = key.replace(/^personal-/, '');
      fetchNamespaces(userId, undefined);
    } else {
      const isOrgGroup = !STATIC_KEYS.has(key);
      if (isOrgGroup) {
        // 組織グループノード選択時:
        // 親から filteredOrgGroupCds（選択ノード＋子孫CD一覧）が渡されている場合は
        // それを scopeKeys として複数スコープ一括取得する。
        // orgGroupCds が空の場合は選択ノード単体＋祖先方向にフォールバックする。
        if (orgGroupCds && orgGroupCds.length > 0) {
          fetchNamespaces(undefined, undefined, orgGroupCds);
        } else {
          fetchNamespaces(key, true);
        }
      } else {
        // global / personal 等の静的キー
        fetchNamespaces(key, undefined);
      }
    }
  };

  useEffect(() => {
    // スコープ変更時に未保存のインライン入力行・編集中状態・チェック状態をクリアする
    setNewRows([]);
    setEditingId(null);
    setSelectedRowKeys([]);
    reloadNamespaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNsKey, JSON.stringify(orgGroupCds)]);

  // ──── タブを離れたときにチェック状態をリセット
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setSelectedRowKeys([]);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ── 新規行を追加（URI自動生成付き）
  const handleAddRow = async () => {
    const newRow = makeEmptyRow();
    // まず空の行を追加してインラインを即表示
    setNewRows((prev) => [...prev, newRow]);
    // バックエンドからURI候補を取得してセット
    try {
      const rawKey = scopeKey ?? selectedNsKey ?? undefined;
      // personal-{userId} 形式の場合は personal- を除去して DB の scope_key（userId）にする
      const apiKey = rawKey?.replace(/^personal-/, '');
      const uri = await fetchSuggestedUri(apiKey);
      setNewRows((prev) =>
        prev.map((r) => (r._rowId === newRow._rowId ? { ...r, uri } : r))
      );
    } catch {
      // 取得失敗時はURIを空のまま継続（保存時にバリデーションで検知）
    }
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
    let successCount = 0;
    const failed: { prefix: string; uri: string }[] = [];

    for (const row of newRows) {
      try {
        const rawScopeKey = scopeKey ?? selectedNsKey ?? undefined;
        // personal-{userId} 形式の場合は personal- を除去して DB の scope_key（userId）にする
        const apiScopeKey = rawScopeKey?.replace(/^personal-/, '');
        const createNamespaceRequest: Parameters<typeof createNamespace>[0] = {
          prefix: row.prefix,
          uri: row.uri,
          description: row.description || undefined,
          scopeKey: apiScopeKey,
        };
        await createNamespace(createNamespaceRequest);
        successCount++;
      } catch {
        failed.push({ prefix: row.prefix, uri: row.uri });
      }
    }

    if (successCount > 0) {
      message.success(t('prefixManagement.saveSuccess', { count: String(successCount) }));
    }
    if (failed.length > 0) {
      message.warning(t('prefixManagement.savePartialFailure', { failCount: String(failed.length) }));
    }
    setNewRows([]);
    // DBから再フェッチすることで scopeName（組織グループ名・ユーザー名）を含む正しいデータを取得する
    // （直接 setRows で追加すると scopePath が未設定のままスコープ列が「-」と表示されてしまうため）
    reloadNamespaces();
  };

  // ── 新規行を保存
  const handleSave = async () => {
    if (newRows.length === 0) return;
    for (const row of newRows) {
      if (!row.prefix) {
        message.error(t('prefixManagement.prefixRequired'));
        return;
      }
      if (!isValidNCName(row.prefix)) {
        message.error(t('prefixManagement.prefixNcnameInvalid'));
        return;
      }
      if (!row.uri) {
        message.error(t('prefixManagement.uriRequired'));
        return;
      }
    }

    // グローバルスコープに同名 prefix が存在するか確認
    // Global 登録済みの Prefix と重複する場合は登録不可（エラーメッセージ表示して終了）
    try {
      const globalDeclarations = await getGlobalDeclarations();
      const globalPrefixes = new Set(
        globalDeclarations.map((d: { prefix: string }) => d.prefix.toLowerCase())
      );
      const globalDuplicate = newRows.find((row) =>
        globalPrefixes.has(row.prefix.toLowerCase())
      );
      if (globalDuplicate) {
        message.error(
          t('prefixManagement.errorDuplicateGlobalPrefix', { prefix: globalDuplicate.prefix })
        );
        return;
      }
    } catch {
      // グローバル一覧の取得に失敗した場合は警告せずに続行
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
      const updateNamespaceRequest: Parameters<typeof updateNamespace>[1] = {
        newPrefix: editingValues.prefix !== editingId ? editingValues.prefix : undefined,
        description: editingValues.description,
      };
      await updateNamespace(editingId, updateNamespaceRequest);
      setEditingId(null);
      message.success(t('prefixManagement.updateSuccess'));
      // reloadNamespaces を使うことで selectedNsKey / orgGroupCds の両方を
      // 考慮した正しいスコープでデータを再取得する
      reloadNamespaces();
    } catch {
      message.error(t('prefixManagement.updateError'));
    }
  };

  const cancelEdit = () => setEditingId(null);

  // ── 非アクティブ化（is_active = false に設定）
  const handleDeactivate = (record: PrefixRow) => {
    Modal.confirm({
      title: t('prefixManagement.deactivateConfirm', { prefix: record.prefix }),
      content: t('prefixManagement.deactivateContent'),
      okText: t('prefixManagement.deactivateOk'),
      cancelText: t('prefixManagement.deactivateCancelBtn'),
      icon: <StopOutlined style={{ color: '#faad14' }} />,
      onOk: async () => {
        try {
          await toggleNamespaceActive(record.prefix, false);
          setRows((prev) =>
            prev.map((r) => (r.id === record.id ? { ...r, isActive: false } : r))
          );
          message.success(t('prefixManagement.deactivateSuccess', { prefix: record.prefix }));
        } catch {
          message.error(t('prefixManagement.deactivateError', { prefix: record.prefix }));
        }
      },
    });
  };

  // ── アクティブ化（is_active = true に設定）
  const handleActivate = (record: PrefixRow) => {
    Modal.confirm({
      title: t('prefixManagement.activateConfirm', { prefix: record.prefix }),
      content: t('prefixManagement.activateContent'),
      okText: t('prefixManagement.activateOk'),
      cancelText: t('prefixManagement.activateCancelBtn'),
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      onOk: async () => {
        try {
          await toggleNamespaceActive(record.prefix, true);
          setRows((prev) =>
            prev.map((r) => (r.id === record.id ? { ...r, isActive: true } : r))
          );
          message.success(t('prefixManagement.activateSuccess', { prefix: record.prefix }));
        } catch {
          message.error(t('prefixManagement.activateError', { prefix: record.prefix }));
        }
      },
    });
  };

  // ── 一括非アクティブ化
  const handleBulkDeactivate = () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: t('prefixManagement.bulkDeactivateConfirm', { count: String(selectedRowKeys.length) }),
      content: t('prefixManagement.bulkDeactivateContent'),
      okText: t('prefixManagement.bulkDeactivateOk'),
      cancelText: t('prefixManagement.bulkDeactivateCancelBtn'),
      okButtonProps: { danger: true },
      icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
      onOk: async () => {
        const keys = selectedRowKeys as string[];
        const failed: string[] = [];
        for (const prefix of keys) {
          try {
            await toggleNamespaceActive(prefix, false);
          } catch {
            failed.push(prefix);
          }
        }
        setRows((prev) =>
          prev.map((r) =>
            keys.includes(r.id) && !failed.includes(r.id) ? { ...r, isActive: false } : r
          )
        );
        setSelectedRowKeys([]);
        if (failed.length > 0) {
          message.warning(t('prefixManagement.bulkDeactivatePartialError', { count: String(failed.length) }));
        } else {
          message.success(t('prefixManagement.bulkDeactivateSuccess', { count: String(keys.length) }));
        }
      },
    });
  };

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
        const failed: { prefix: string; uri: string }[] = [];
        for (const row of parsedRows) {
          try {
            const csvCreateRequest: Parameters<typeof createNamespace>[0] = {
              prefix: row.prefix,
              uri: row.uri,
              description: row.description || undefined,
            };
            const created = await createNamespace(csvCreateRequest);
            added.push({
              id: created.prefix,
              prefix: created.prefix,
              uri: created.uri,
              description: row.description,
            });
          } catch {
            failed.push({ prefix: row.prefix, uri: row.uri });
          }
        }

        if (added.length > 0) {
          setRows((prev) => [...prev, ...added]);
        }
        if (failed.length > 0) {
          message.warning(t('prefixManagement.csvImportPartial', { saved: String(added.length), failCount: String(failed.length) }));
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
      width: 180,
      render: (_: unknown, record: PrefixRow | NewPrefixRow) => {
        if ('_rowId' in record) {
          // 新規行: URI は自動生成済み・編集不可（グレーアウト）
          const nr = record as NewPrefixRow;
          return (
            <Input
              size="small"
              placeholder={t('prefixManagement.placeholderUri')}
              value={nr.uri}
              disabled
              style={{ flex: 1 }}
            />
          );
        }
        const r = record as PrefixRow;
        return r.id === editingId ? (
          // 編集行: URI は自動生成のため編集不可（グレーアウト）
          <Input
            size="small"
            value={editingValues.uri}
            disabled
            style={{ flex: 1 }}
          />
        ) : (
          <Tooltip title={r.uri}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Text style={{ fontSize: 12, color: '#1677ff' }}>{r.uri}</Text>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: t('prefixManagement.colDescription'),
      dataIndex: 'description',
      key: 'description',
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
      width: 200,
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
        // システム名前空間（Alchemia）の行は操作不可
        if (r.prefix === SYSTEM_NAMESPACE_PREFIX) {
          return (
            <Tooltip title={t('prefixManagement.systemNamespaceTooltip')}>
              <Tag color="default">{t('prefixManagement.systemNamespaceBadge')}</Tag>
            </Tooltip>
          );
        }
        const isActive = r.isActive !== false; // undefined は active とみなす
        return (
          <span style={{ display: 'flex', gap: 4 }}>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={viewOnly || !isActive}
              onClick={() => startEdit(r)}
            >
              {t('prefixManagement.btnEdit')}
            </Button>
            <Button
              size="small"
              danger={!viewOnly && isActive}
              disabled={viewOnly}
              style={{ minWidth: '105px' }}
              onClick={() => isActive ? handleDeactivate(r) : handleActivate(r)}
            >
              {isActive ? t('prefixManagement.btnDeactivate') : t('prefixManagement.btnActivate')}
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
      {/* ── アクションバー（1件以上チェック時に表示） */}
      {selectedRowKeys.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          marginBottom: 0,
          padding: '6px 16px',
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          flexShrink: 0,
        }}>
          {showShareButton && (
            <Button
              onClick={() => onShareSelected?.(selectedRowKeys)}
              style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
            >
              {t('prefixManagement.btnShare', { count: String(selectedRowKeys.length) })}
            </Button>
          )}
          <Button
            danger
            disabled={viewOnly}
            onClick={handleBulkDeactivate}
          >
            {t('prefixManagement.btnBulkDeactivate', { count: String(selectedRowKeys.length) })}
          </Button>
        </div>
      )}
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
            onRow={(record) => {
              if ('_rowId' in record) return {};
              const r = record as PrefixRow;
              if (r.isActive === false) {
                return { style: { background: '#f0f0f0' } };
              }
              return {};
            }}
            rowClassName={(record) => {
              if ('_rowId' in record) return 'row-new-prefix';
              const r = record as PrefixRow;
              return r.isActive === false ? 'row-inactive-prefix' : '';
            }}
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

      </div>
    </div>
  );
};

export default PrefixManagement;
