'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SYSTEM_NAMESPACE_PREFIX } from '@/constants/systemNamespace';
import { isValidNCName } from '@/utils/ncname';
import { isUnitAllowed, MAIML_PROPERTY_TYPES } from '@/utils/xsiTypeAttributes';
import { App, Button, Input, Table, Select, Spin, Tag } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import {
  getTerms,
  createTerm,
  updateTerm,
  toggleTermActive,
  getAttributeMaster,
} from '@/services/namespaceApiService';
import type { NamespaceTermRow, TermUpsertRequest } from '@/services/namespaceApiService';
import type { TermManagementProps } from '@/types/namespace';

// ──────────────────────────────────────────────
// 定数
// ──────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  stringType: 'blue', tokenType: 'cyan', idType: 'geekblue', idRefType: 'geekblue',
  qualifiedNameType: 'purple', dateTimeType: 'gold', decimalType: 'green', doubleType: 'green',
  floatType: 'green', intType: 'green', longType: 'green', shortType: 'green', byteType: 'green',
  unsignedIntType: 'lime', unsignedLongType: 'lime', unsignedShortType: 'lime', unsignedByteType: 'lime',
  booleanType: 'orange', base64BinaryType: 'magenta', hexBinaryType: 'magenta', uriType: 'volcano',
  uuidType: 'red', languageType: 'blue', propertyListType: 'default', stringListType: 'blue',
  idRefListType: 'geekblue', qualifiedNameListType: 'purple', dateTimeListType: 'gold',
  decimalListType: 'green', doubleListType: 'green', floatListType: 'green', intListType: 'green',
  longListType: 'green', shortListType: 'green', byteListType: 'green', unsignedIntListType: 'lime',
  unsignedLongListType: 'lime', unsignedShortListType: 'lime', unsignedByteListType: 'lime',
  booleanListType: 'orange', base64BinaryListType: 'magenta', hexBinaryListType: 'magenta',
  uriListType: 'volcano', uuidListType: 'red', languageListType: 'blue', stringEnumType: 'cyan',
};

const TYPE_SELECT_OPTIONS = [
  { label: 'Simple Types', options: MAIML_PROPERTY_TYPES.filter((t) => t.category === 'Simple').map((t) => ({ value: t.value, label: t.label })) },
  { label: 'List Types',   options: MAIML_PROPERTY_TYPES.filter((t) => t.category === 'List'  ).map((t) => ({ value: t.value, label: t.label })) },
];

const TYPE_FILTER_OPTIONS = MAIML_PROPERTY_TYPES.map((t) => ({ value: t.value, label: t.value }));

// ──────────────────────────────────────────────
// CSV パースユーティリティ
// ──────────────────────────────────────────────

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current); current = '';
    } else { current += char; }
  }
  result.push(current);
  return result;
};

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────

interface EditingValues {
  prefix: string; localName: string; displayName: string;
  description: string; typeHint: string; unitHint: string;
}

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────

const TermManagement: React.FC<TermManagementProps> = ({
  viewOnly = false,
  selectedNsKey,
  scopeKey,
  availablePrefixes = [],
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();

  const [terms,        setTerms]        = useState<NamespaceTermRow[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [searchText,   setSearchText]   = useState('');
  const [filterPrefix, setFilterPrefix] = useState<string | null>(null);
  const [filterType,   setFilterType]   = useState<string | null>(null);
  const [unitOptions,  setUnitOptions]  = useState<{ value: string; label: string }[]>([]);
  const [newRows,      setNewRows]      = useState<Array<{
    _rowId: string; prefix: string; localName: string;
    displayName: string; description: string; typeHint: string; unitHint: string;
  }>>([]);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<EditingValues>({
    prefix: '', localName: '', displayName: '', description: '', typeHint: 'stringType', unitHint: '',
  });

  const csvInputRef = useRef<HTMLInputElement>(null);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const options = scopeKey ? { scopeKey } : {};
      const data = await getTerms(options);
      setTerms(data);
    } catch {
      message.error(t('termManagement.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
    getAttributeMaster()
      .then((data) => setUnitOptions(data.map((d) => ({ value: d.attributeValue, label: d.attributeValue }))))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNsKey, scopeKey]);

  const filteredTerms = terms.filter((term) => {
    const matchSearch = !searchText || [term.localName, term.displayName, term.description].some(
      (s) => s?.toLowerCase().includes(searchText.toLowerCase())
    );
    const matchPrefix = !filterPrefix || term.prefix === filterPrefix;
    const matchType   = !filterType   || term.type   === filterType;
    return matchSearch && matchPrefix && matchType;
  });

  const handleAddRow = () => {
    const defaultPrefix = availablePrefixes[0] ?? '';
    setNewRows((prev) => [...prev, {
      _rowId: `__new__${Date.now()}_${Math.random()}`,
      prefix: defaultPrefix, localName: '', displayName: '',
      description: '', typeHint: 'stringType', unitHint: '',
    }]);
  };

  const handleSave = async () => {
    for (const row of newRows) {
      if (!row.localName) { message.error(t('termManagement.localNameRequired')); return; }
      if (!isValidNCName(row.localName)) { message.error(t('termManagement.localNameNcnameInvalid')); return; }
    }
    const added: NamespaceTermRow[] = [];
    const failed: string[] = [];
    for (const row of newRows) {
      try {
        const req: TermUpsertRequest = {
          prefix: row.prefix, localName: row.localName,
          displayNameJa: row.displayName || undefined, description: row.description || undefined,
          typeHint: row.typeHint || undefined, unitHint: row.unitHint || undefined,
        };
        const created = await createTerm(req);
        added.push(created);
      } catch { failed.push(`${row.prefix}:${row.localName}`); }
    }
    if (added.length > 0) setTerms((prev) => [...prev, ...added]);
    if (failed.length > 0) {
      message.warning(t('termManagement.registerFailure', {
        count: String(failed.length), names: failed.slice(0, 3).join(', ') + (failed.length > 3 ? '...' : ''),
      }));
    } else {
      message.success(t('termManagement.registerSuccess', { count: String(added.length) }));
    }
    setNewRows([]);
  };

  const startEdit = (term: NamespaceTermRow) => {
    setEditingId(`${term.prefix}:${term.localName}`);
    setEditingValues({
      prefix: term.prefix, localName: term.localName,
      displayName: term.displayName ?? '', description: term.description ?? '',
      typeHint: term.type ?? 'stringType', unitHint: term.unitHint ?? '',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const req: TermUpsertRequest = {
        prefix: editingValues.prefix, localName: editingValues.localName,
        displayNameJa: editingValues.displayName || undefined,
        description: editingValues.description || undefined,
        typeHint: editingValues.typeHint || undefined,
        unitHint: editingValues.unitHint || undefined,
      };
      await updateTerm(editingValues.prefix, editingValues.localName, req);
      setEditingId(null);
      message.success(t('termManagement.updateSuccess'));
      await fetchTerms();
    } catch {
      message.error(t('termManagement.updateError'));
    }
  };

  const handleToggleActive = async (term: NamespaceTermRow) => {
    try {
      await toggleTermActive(term.prefix, term.localName, !term.isActive);
      await fetchTerms();
      message.success(term.isActive ? t('termManagement.deactivateSuccess') : t('termManagement.activateSuccess'));
    } catch {
      message.error(t('termManagement.toggleActiveError'));
    }
  };

  const handleCsvDownload = () => {
    if (filteredTerms.length === 0) { message.error(t('termManagement.exportEmptyError')); return; }
    const header = 'prefix,localName,displayName,description,type,unitHint';
    const rows = filteredTerms.map((term) =>
      [term.prefix, term.localName, term.displayName, term.description, term.type, term.unitHint ?? '']
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'terms.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) { message.error(t('termManagement.csvEmpty')); return; }

        // ── ヘッダー検証（期待ヘッダー: prefix,localName,displayName,description,type,unitHint）
        const expectedHeader = 'prefix,localName,displayName,description,type,unitHint';
        const actualHeaderCols = parseCsvLine(lines[0]);
        const actualHeader = actualHeaderCols.join(',');
        if (actualHeader !== expectedHeader) {
          message.error(t('termManagement.csvHeaderMismatch'));
          if (csvInputRef.current) csvInputRef.current.value = '';
          return;
        }

        const parsedRows: Array<{
          prefix: string; localName: string; displayName: string;
          description: string; typeHint: string; unitHint: string;
        }> = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          if (cols.length < 2) continue;
          const [prefix, localName, displayName, description, typeHint, unitHint] = cols;
          if (!prefix || !localName) continue;
          parsedRows.push({
            prefix, localName,
            displayName: displayName ?? '', description: description ?? '',
            typeHint: typeHint ?? 'stringType', unitHint: unitHint ?? '',
          });
        }
        if (parsedRows.length === 0) { message.error(t('termManagement.csvEmpty')); return; }
        const added: NamespaceTermRow[] = [];
        const failed: string[] = [];
        for (const row of parsedRows) {
          try {
            const created = await createTerm({
              prefix: row.prefix, localName: row.localName,
              displayNameJa: row.displayName || undefined, description: row.description || undefined,
              typeHint: row.typeHint || undefined, unitHint: row.unitHint || undefined,
            });
            added.push(created);
          } catch { failed.push(`${row.prefix}:${row.localName}`); }
        }
        if (added.length > 0) setTerms((prev) => [...prev, ...added]);
        if (failed.length > 0) {
          message.warning(t('termManagement.registerFailure', {
            count: String(failed.length), names: failed.slice(0, 3).join(', ') + (failed.length > 3 ? '...' : ''),
          }));
        } else {
          message.success(t('termManagement.registerSuccess', { count: String(added.length) }));
        }
      } catch {
        message.error(t('termManagement.fetchError'));
      } finally {
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };



  const prefixOptions = Array.from(new Set(terms.map((term) => term.prefix))).map((p) => ({ value: p, label: p }));

  const columns: TableColumnsType<NamespaceTermRow> = [
    { title: 'Prefix', dataIndex: 'prefix', key: 'prefix', width: 120 },
    {
      title: t('termManagement.colLocalName'), dataIndex: 'localName', key: 'localName', width: 160,
      render: (localName: string, record) => {
        if (`${record.prefix}:${record.localName}` === editingId) {
          return <Input size="small" value={editingValues.localName} placeholder={t('termManagement.localNamePlaceholder')} onChange={(ev) => setEditingValues((prev) => ({ ...prev, localName: ev.target.value }))} />;
        }
        return localName;
      },
    },
    {
      title: t('termManagement.colDisplayName'), dataIndex: 'displayName', key: 'displayName', width: 160,
      render: (displayName: string, record) => {
        if (`${record.prefix}:${record.localName}` === editingId) {
          return <Input size="small" value={editingValues.displayName} placeholder={t('termManagement.displayNamePlaceholder')} onChange={(ev) => setEditingValues((prev) => ({ ...prev, displayName: ev.target.value }))} />;
        }
        return displayName;
      },
    },
    {
      title: t('termManagement.colDescription'), dataIndex: 'description', key: 'description',
      render: (description: string, record) => {
        if (`${record.prefix}:${record.localName}` === editingId) {
          return <Input size="small" value={editingValues.description} placeholder={t('termManagement.descriptionPlaceholder')} onChange={(ev) => setEditingValues((prev) => ({ ...prev, description: ev.target.value }))} />;
        }
        return description;
      },
    },
    {
      title: t('termManagement.colType'), dataIndex: 'type', key: 'type', width: 160,
      render: (type: string, record) => {
        if (`${record.prefix}:${record.localName}` === editingId) {
          return (
            <Select size="small" style={{ width: '100%' }} value={editingValues.typeHint} options={TYPE_SELECT_OPTIONS}
              onChange={(val) => setEditingValues((prev) => ({ ...prev, typeHint: val, unitHint: isUnitAllowed(val) ? prev.unitHint : '' }))} />
          );
        }
        return <Tag color={TYPE_COLOR[type] ?? 'default'}>{type}</Tag>;
      },
    },
    {
      title: t('termManagement.colUnit'), dataIndex: 'unitHint', key: 'unitHint', width: 120,
      render: (unitHint: string, record) => {
        if (`${record.prefix}:${record.localName}` === editingId) {
          const unitAllowed = isUnitAllowed(editingValues.typeHint);
          return (
            <Select size="small" style={{ width: '100%' }} value={editingValues.unitHint || undefined} allowClear disabled={!unitAllowed}
              placeholder={unitAllowed ? t('termManagement.unitHintPlaceholder') : t('termManagement.unitNotApplicable')}
              options={unitOptions} onChange={(val) => setEditingValues((prev) => ({ ...prev, unitHint: val ?? '' }))} />
          );
        }
        return unitHint ?? '';
      },
    },
    {
      title: t('termManagement.colScope'), dataIndex: 'scopeKey', key: 'scopeKey', width: 100,
      render: (sk: string | null | undefined) => sk ?? '-',
    },




    {
      title: t('termManagement.colActions'), key: 'actions', width: 180,
      render: (_: unknown, record) => {
        const isSystemNs = record.prefix === SYSTEM_NAMESPACE_PREFIX;
        if (isSystemNs) return <Tag color="default">{t('prefixManagement.systemNamespaceBadge')}</Tag>;
        if (`${record.prefix}:${record.localName}` === editingId) {
          return (
            <span style={{ display: 'flex', gap: 4 }}>
              <Button type="primary" size="small" icon={<SaveOutlined />} onClick={saveEdit}>{t('termManagement.btnSave')}</Button>
              <Button size="small" onClick={() => setEditingId(null)}>{t('termManagement.btnCancel')}</Button>
            </span>
          );
        }
        return (
          <span style={{ display: 'flex', gap: 4 }}>
            <Button size="small" icon={<EditOutlined />} disabled={viewOnly || record.isActive === false} onClick={() => !viewOnly && startEdit(record)}>{t('termManagement.btnEdit')}</Button>
            <Button size="small" danger={record.isActive !== false} disabled={viewOnly}
              icon={record.isActive !== false ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={() => !viewOnly && handleToggleActive(record)} style={{ minWidth: 80 }}>
              {record.isActive !== false ? t('termManagement.btnDeactivate') : t('termManagement.btnActivate')}
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Input prefix={<SearchOutlined />} placeholder={t('termManagement.searchPlaceholder')}
          value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 220 }} allowClear />
        <Select style={{ width: 160 }} allowClear placeholder={t('termManagement.filterPrefixPlaceholder')}
          value={filterPrefix} options={prefixOptions} onChange={(val) => setFilterPrefix(val ?? null)} />
        <Select style={{ width: 180 }} allowClear placeholder={t('termManagement.filterTypePlaceholder')}
          value={filterType} options={TYPE_FILTER_OPTIONS} onChange={(val) => setFilterType(val ?? null)} />
        <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />
        <Button disabled={viewOnly} onClick={() => csvInputRef.current?.click()}>{t('termManagement.btnImport')}</Button>
        <Button disabled={viewOnly} onClick={handleCsvDownload}>{t('termManagement.btnExport')}</Button>
        <Button type="primary" icon={<PlusOutlined />} disabled={viewOnly || availablePrefixes.length === 0} onClick={handleAddRow}>
          {t('termManagement.btnAddTerm')}
        </Button>
        {newRows.length > 0 && (
          <>
            <Button type="primary" onClick={handleSave} disabled={viewOnly}>{t('termManagement.btnSave')}</Button>
            <Button onClick={() => setNewRows([])} disabled={viewOnly}>{t('termManagement.btnCancel')}</Button>
          </>
        )}
      </div>
      <Spin spinning={loading}>
        <Table<NamespaceTermRow>
          dataSource={filteredTerms}
          columns={columns}
          rowKey={(r) => r.qname ?? `${r.prefix}:${r.localName}`}
          size="small"
          pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
          locale={{ emptyText: t('termManagement.emptyText') }}
          rowClassName={(r) => r.isActive === false ? 'row-inactive-term' : ''}
        />
      </Spin>
      <style>{`.row-inactive-term td { color: #bbb !important; background: #f0f0f0 !important; }`}</style>
    </div>
  );
};

export default TermManagement;

