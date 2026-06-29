'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button, Dropdown, Input, Modal, Select, Table, Tree, Tag, Tooltip, message, Typography } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  BankOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useRef } from 'react';
import type { TableColumnsType } from 'antd';
import namespaceTreeRaw from '../../../mock/namespace/uncertainty-scope.json';
import termsMockRaw from '../../../mock/namespace/terms.json';
import DetailModal, { type DetailTarget, type TermSaved, type NamespaceSaved } from './DetailModal';
import NamespaceAddDialog from './NamespaceAddDialog';
import TeamAddDialog from './TeamAddDialog';
import TeamEditDialog from './TeamEditDialog';

const { Text } = Typography;

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────
interface NamespaceNode {
  key: string;
  label: string;
  count: number;
  icon: string;
  children?: NamespaceNode[];
}

interface Term {
  id: string;
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  displayNameEn?: string;
  description: string;
  type: string;
  unitHint?: string;
}

interface NewTermRow {
  _rowId: string; // 一時ID（テーブル行のkey用）
  prefix: string;  // 現在選択中の名前空間 prefix（QName生成に使用）
  localName: string;
  displayName: string;
  displayNameEn: string;
  description: string;
  type: string;
  unitHint: string;
}

// 組織に共有の共有先型
interface ShareTarget {
  prefix: string;
  departmentName: string;
  teamName: string;
}

interface FlatNsNode {
  key: string;
  prefix: string;
  uri: string;
  level: 'global' | 'organization' | 'personal';
  termCount: number;
  displayName?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ──────────────────────────────────────────────
// レベル別アイコン
// ──────────────────────────────────────────────
const levelIcon = (level: string) => {
  if (level === 'global')       return <GlobalOutlined style={{ color: '#1677ff' }} />;
  if (level === 'organization') return <BankOutlined   style={{ color: '#52c41a' }} />;
  return <UserOutlined style={{ color: '#fa8c16' }} />;
};

// ──────────────────────────────────────────────
// ツリーを再帰的にフラット化
// ──────────────────────────────────────────────
const flattenTree = (nodes: NamespaceNode[]): FlatNsNode[] =>
  nodes.flatMap((n) => [
    // uncertainty-scope.json に "prefix" フィールドがある場合はそれを使用し、なければ label にフォールバック
    { key: n.key, prefix: (n as any).prefix ?? n.label, uri: (n as any).uri ?? '', level: 'organization' as const, termCount: n.count },
    ...(n.children ? flattenTree(n.children) : []),
  ]);

const makeEmptyRow = (prefix = ''): NewTermRow => ({
  _rowId: `__new__${Date.now()}_${Math.random()}`,
  prefix,
  localName: '', displayName: '', displayNameEn: '',
  description: '', type: 'stringType', unitHint: '',
});

// ──────────────────────────────────────────────
// Props定義
// ──────────────────────────────────────────────
interface NamespaceMainProps {
  /** trueのとき左ペイン（名前空間ツリー）を非表示にする */
  hideTree?: boolean;
  /** 外部から名前空間選択キーを制御する場合に指定 */
  externalSelectedNsKey?: string | null;
  /** 外部から名前空間選択が変わったときのコールバック */
  onNsKeyChange?: (key: string | null) => void;
}

// ──────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────
const NamespaceMain: React.FC<NamespaceMainProps> = ({
  hideTree = false,
  externalSelectedNsKey,
  onNsKeyChange,
}) => {
  const [nsSearch,      setNsSearch]      = useState('');
  const [termSearch,    setTermSearch]    = useState('');
  const [selectedNsKey, setSelectedNsKey] = useState<string | null>(null);
  const [terms,         setTerms]         = useState<Term[]>([]);
  const [termsLoading,  setTermsLoading]  = useState(true);

  // 複数行入力用配列（空配列 = 入力行なし）
  const [newTerms, setNewTerms] = useState<NewTermRow[]>([]);

  const [modalOpen,       setModalOpen]       = useState(false);
  const [modalTarget,     setModalTarget]     = useState<DetailTarget | null>(null);
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);

  const [nsNodes, setNsNodes] = useState<FlatNsNode[]>(() => flattenTree(namespaceTreeRaw as NamespaceNode[]));
  const [contextNode, setContextNode] = useState<NamespaceNode | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addChildParentKey, setAddChildParentKey] = useState<string | null>(null);

  // チーム追加ダイアログ
  const [teamAddOpen,       setTeamAddOpen]       = useState(false);
  const [teamAddParentLabel, setTeamAddParentLabel] = useState('');

  // チーム編集ダイアログ（メンバー追加）
  const [teamEditOpen,    setTeamEditOpen]    = useState(false);
  const [teamEditLabel,   setTeamEditLabel]   = useState('');
  const [teamEditMembers, setTeamEditMembers] = useState<string[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(20);

  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{ localName: string; displayName: string; displayNameEn: string; description: string; type: string; unitHint: string }>({ localName: '', displayName: '', displayNameEn: '', description: '', type: '', unitHint: '' });

  // ──── 用語フィルター（C）
  const [filterPrefix, setFilterPrefix] = useState<string | undefined>(undefined);
  const [filterType,   setFilterType]   = useState<string | undefined>(undefined);
  const [filterUnit,   setFilterUnit]   = useState<string | undefined>(undefined);

  // ──── 組織に共有モーダル（A）
  const [shareModalOpen, setShareModalOpen] = useState(false);
  // モック共有先（実際は API から取得）
  const shareTargetMock: ShareTarget = { prefix: 'rd', departmentName: '研究開発部', teamName: '材料チーム' };

  // ──── 初回マウント時に API から用語一覧を取得（失敗時はモックにフォールバック）
  useEffect(() => {
    setTermsLoading(true);
    fetch('/api/v1/namespaces/terms', { credentials: 'include', cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Term[]) => setTerms(data))
      .catch(() => {
        // 未ログイン(401)等でAPIが失敗した場合はモックデータを表示
        setTerms(termsMockRaw as Term[]);
      })
      .finally(() => setTermsLoading(false));
  }, []);

  // ──── 「用語を追加」ボタン：常に活性、押すたびに空行を追加
  const handleAddRow = () => {
    setNewTerms((prev) => [...prev, makeEmptyRow()]);
  };

  // ──── 入力行の値更新
  const updateNewTerm = (rowId: string, field: keyof Omit<NewTermRow, '_rowId'>, value: string) => {
    setNewTerms((prev) => prev.map((r) => r._rowId === rowId ? { ...r, [field]: value } : r));
  };

  // ──── 入力行を1件削除
  const removeNewRow = (rowId: string) => {
    setNewTerms((prev) => prev.filter((r) => r._rowId !== rowId));
  };

  // ──── 「保存」ボタン：全入力行を API POST でDBに保存
  const handleAddSave = async () => {
    if (newTerms.length === 0) return;
    if (!selectedPrefix) {
      message.error('名前空間を選択してから用語を追加してください');
      return;
    }
    for (const row of newTerms) {
      if (!row.localName) { message.error('すべての行でローカル名を入力してください'); return; }
    }

    const added: Term[] = [];
    for (const row of newTerms) {
      try {
        const res = await fetch('/api/v1/namespaces/terms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prefix:       selectedPrefix,
            localName:    row.localName,
            displayNameJa: row.displayName,
            displayNameEn: row.displayNameEn,
            description:  row.description,
            typeHint:     row.type || 'stringType',
            unitHint:     row.unitHint,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          message.error(`「${row.localName}」の保存に失敗しました: ${(err as any).error ?? res.status}`);
          continue;
        }
        const created: Term = await res.json();
        added.push(created);
      } catch {
        message.error(`「${row.localName}」の保存中にエラーが発生しました`);
      }
    }

    if (added.length > 0) {
      setTerms((prev) => [...added, ...prev]);
      message.success(`${added.length}件の用語をDBに保存しました`);
    }
    setNewTerms([]);
  };

  const startEditTerm = (record: Term) => {
    setEditingTermId(record.id);
    setEditingValues({ localName: record.localName, displayName: record.displayName, displayNameEn: record.displayNameEn ?? '', description: record.description, type: record.type, unitHint: record.unitHint ?? '' });
  };

  const saveEditTerm = async () => {
    if (!editingTermId) return;
    if (!editingValues.localName) { message.error('ローカル名は必須です'); return; }

    try {
      const res = await fetch(`/api/v1/namespaces/terms/${editingTermId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localName:    editingValues.localName,
          displayNameJa: editingValues.displayName,
          displayNameEn: editingValues.displayNameEn,
          description:  editingValues.description,
          typeHint:     editingValues.type,
          unitHint:     editingValues.unitHint,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        message.error(`更新に失敗しました: ${(err as any).error ?? res.status}`);
        return;
      }

      const updated: Term = await res.json();
      setTerms((prev) => prev.map((t) => t.id === editingTermId ? updated : t));
      setEditingTermId(null);
      message.success('用語を更新しました');
    } catch {
      message.error('用語の更新中にエラーが発生しました');
    }
  };

  const cancelEditTerm = () => setEditingTermId(null);

  // ──── チームノード右クリック：チームを追加
  const handleContextAddTeam = (node: NamespaceNode) => {
    setTeamAddParentLabel(node.label);
    setTeamAddOpen(true);
  };

  // ──── チームノード右クリック：編集（メンバー追加）
  const handleContextEditTeam = (node: NamespaceNode) => {
    setTeamEditLabel(node.label);
    // モック：既存メンバーは空（実際はAPIから取得）
    setTeamEditMembers([]);
    setTeamEditOpen(true);
  };

  // ──── コンテキストメニュー状態
  const [ctxMenu, setCtxMenu] = useState<{ visible: boolean; x: number; y: number; node: NamespaceNode | null }>({
    visible: false, x: 0, y: 0, node: null,
  });

  // ──── コンテキストメニューを閉じる（mousedown で即座にキャッチ）
  useEffect(() => {
    const close = () => setCtxMenu((s) => ({ ...s, visible: false }));
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  // ──── ツリーノードのタイトル（チームノードは onContextMenu を直接付与）
  // companyDepth: 0 = Global/Personal/company ルート、1 = 部門、2 = グループ/チーム（depth 3 相当）
  const renderTreeTitle = useCallback((node: NamespaceNode, companyDepth: number) => {
    // チームノード（companyDepth === 3）のみコンテキストメニューを表示
    const isTeam = companyDepth === 3;

    const teamMenuItems = [
      {
        key: 'add-team',
        label: 'チームを追加',
        icon: <PlusOutlined />,
        onClick: () => handleContextAddTeam(node),
      },
      {
        key: 'edit-team',
        label: '編集',
        icon: <EditOutlined />,
        onClick: () => handleContextEditTeam(node),
      },
    ];

    const titleContent = (
      <span
        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0 }}
      >
        <span style={{ flex: 1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.label}
        </span>
        {node.count > 0 && (
          <span style={{ color: '#8c8c8c', fontSize: 12, flexShrink: 0 }}>{node.count}</span>
        )}
      </span>
    );

    if (isTeam) {
      return (
        <Dropdown menu={{ items: teamMenuItems }} trigger={['contextMenu']}>
          {titleContent}
        </Dropdown>
      );
    }
    return titleContent;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleContextAddTeam, handleContextEditTeam]);

  // ──── ノードの companyDepth を計算してツリーデータを構築
  const toAntTree = (nodes: NamespaceNode[], companyDepth = 0): object[] =>
    nodes.map((n) => {
      // 自分自身の depth を決定
      const selfDepth = companyDepth > 0
        ? companyDepth           // 既に company 配下にいる
        : n.key === 'company'
          ? 1                    // company ノード自身 = depth 1
          : 0;                   // Global / Personal = カウント外
      return {
        key:      n.key,
        title:    renderTreeTitle(n, selfDepth),
        icon:     null,
        children: n.children ? toAntTree(n.children, selfDepth > 0 ? selfDepth + 1 : 0) : undefined,
      };
    });

  const treeData = useMemo(() => {
    const allNodes = namespaceTreeRaw as NamespaceNode[];
    const filterNodes = (nodes: NamespaceNode[]): NamespaceNode[] =>
      nodes
        .map((n) => ({ ...n, children: n.children ? filterNodes(n.children) : undefined }))
        .filter(
          (n) =>
            !nsSearch ||
            n.label.toLowerCase().includes(nsSearch.toLowerCase()) ||
            (n.children && n.children.length > 0),
        );
    return toAntTree(nsSearch ? filterNodes(allNodes) : allNodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nsSearch, renderTreeTitle]);

  // 外部キーが渡された場合はそちらを優先
  const effectiveNsKey = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;

  // ツリーで選択中のノードに対応する prefix を特定
  const selectedPrefix = useMemo(() => {
    if (!effectiveNsKey) return null;
    // nsNodes は FlatNsNode[] だが prefix をそのまま持つ
    const found = nsNodes.find((n) => n.key === effectiveNsKey);
    if (found) return found.prefix;
    // ツリー JSON から直接検索（ネスト構造）
    const findInTree = (nodes: NamespaceNode[]): string | null => {
      for (const node of nodes) {
        if (node.key === effectiveNsKey) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (node as any).prefix ?? null;
        }
        if (node.children) {
          const r = findInTree(node.children);
          if (r) return r;
        }
      }
      return null;
    };
    return findInTree(namespaceTreeRaw as NamespaceNode[]);
  }, [selectedNsKey, nsNodes]);

  const filteredTerms = useMemo(() => {
    let result = terms;
    // ツリーでリーフノード（prefix あり）が選択されていれば絞り込む
    if (selectedPrefix) {
      result = result.filter((t) => t.prefix === selectedPrefix);
    }
    // フィルター（C）
    if (filterPrefix) result = result.filter((t) => t.prefix === filterPrefix);
    if (filterType)   result = result.filter((t) => t.type === filterType);
    if (filterUnit)   result = result.filter((t) => (t.unitHint ?? '') === filterUnit);
    if (!termSearch) return result;
    return result.filter(
      (t) =>
        t.qname.toLowerCase().includes(termSearch.toLowerCase()) ||
        t.displayName.toLowerCase().includes(termSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(termSearch.toLowerCase()),
    );
  }, [terms, termSearch, selectedPrefix, filterPrefix, filterType, filterUnit]);

  // ──── フィルター用オプション（重複排除）
  const prefixOptions = useMemo(() =>
    [...new Set(terms.map((t) => t.prefix))].sort().map((p) => ({ value: p, label: p })),
  [terms]);
  const typeOptionsForFilter = useMemo(() =>
    [...new Set(terms.map((t) => t.type))].sort().map((v) => ({ value: v, label: v })),
  [terms]);
  const unitOptions = useMemo(() =>
    [...new Set(terms.map((t) => t.unitHint ?? '').filter(Boolean))].sort().map((v) => ({ value: v, label: v })),
  [terms]);

  // ──── 選択中のツリーノードが Personal かどうか
  const isPersonalSelected = useMemo(() => {
    if (!effectiveNsKey) return false;
    const findLevel = (nodes: NamespaceNode[]): string | null => {
      for (const n of nodes) {
        if (n.key === effectiveNsKey) return (n as any).level ?? null;
        if (n.children) { const r = findLevel(n.children); if (r) return r; }
      }
      return null;
    };
    return findLevel(namespaceTreeRaw as NamespaceNode[]) === 'personal';
  }, [effectiveNsKey]);

  // ──── 「組織に共有」実行
  const handleShare = () => {
    message.success(`${selectedTermIds.length}件の用語を「${shareTargetMock.departmentName} / ${shareTargetMock.teamName}」に共有しました`);
    setShareModalOpen(false);
    setSelectedTermIds([]);
  };

  const handleDelete = (termId: string) => {
    Modal.confirm({
      title:   'この用語を削除しますか？',
      content: '削除すると元に戻せません。',
      okText:  '削除',
      okButtonProps: { danger: true },
      cancelText: 'キャンセル',
      footer: (_: unknown, { OkBtn, CancelBtn }: { OkBtn: React.FC; CancelBtn: React.FC }) => (<><OkBtn /><CancelBtn /></>),
      onOk: async () => {
        try {
          const res = await fetch(`/api/v1/namespaces/terms/${termId}`, {
            method: 'DELETE',
          });
          if (!res.ok && res.status !== 404) {
            message.error(`削除に失敗しました: ${res.status}`);
            return;
          }
          setTerms((prev) => prev.filter((t) => t.id !== termId));
          setSelectedTermIds((prev) => prev.filter((id) => id !== termId));
          message.success('用語を削除しました');
        } catch {
          message.error('用語の削除中にエラーが発生しました');
        }
      },
    });
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title:   `選択した ${selectedTermIds.length} 件の用語を削除しますか？`,
      content: '削除すると元に戻せません。',
      okText:  '削除',
      okButtonProps: { danger: true },
      cancelText: 'キャンセル',
      footer: (_: unknown, { OkBtn, CancelBtn }: { OkBtn: React.FC; CancelBtn: React.FC }) => (<><OkBtn /><CancelBtn /></>),
      onOk: async () => {
        const failed: string[] = [];
        for (const termId of selectedTermIds) {
          try {
            const res = await fetch(`/api/v1/namespaces/terms/${termId}`, {
              method: 'DELETE',
            });
            if (!res.ok && res.status !== 404) {
              failed.push(termId);
            }
          } catch {
            failed.push(termId);
          }
        }
        const deletedIds = selectedTermIds.filter((id) => !failed.includes(id));
        setTerms((prev) => prev.filter((t) => !deletedIds.includes(t.id)));
        setSelectedTermIds([]);
        if (failed.length > 0) {
          message.warning(`${deletedIds.length}件削除、${failed.length}件失敗しました`);
        } else {
          message.success(`${deletedIds.length}件の用語を削除しました`);
        }
      },
    });
  };

  const handleTermSaved = (updated: TermSaved) => {
    setTerms((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    setModalOpen(false);
  };

  const handleCsvDownload = () => {
    if (selectedTermIds.length === 0) {
      message.error('エクスポートする用語を1件以上選択してください');
      return;
    }
    const header = 'qname,prefix,localName,displayName,displayNameEn,description,type,unitHint';
    const rows = terms.map((t) =>
      [t.qname, t.prefix, t.localName, t.displayName, t.displayNameEn ?? '', t.description, t.type, t.unitHint ?? '']
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'terms.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text  = (ev.target?.result as string).replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) { message.error('CSVデータが空です'); return; }
        const added: Term[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((c) =>
            c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
          ) ?? [];
          if (cols.length < 6) continue;
          const [, prefix, localName, displayName, displayNameEn, description, type, unitHint] = cols;
          if (!localName) continue;
          added.push({
            id:            `term-${Date.now()}-${i}`,
            qname:         `${prefix}:${localName}`,
            prefix:        prefix        ?? '',
            localName:     localName     ?? '',
            displayName:   displayName   ?? '',
            displayNameEn: displayNameEn ?? '',
            description:   description   ?? '',
            type:          type          ?? 'stringType',
            unitHint:      unitHint      ?? '',
          });
        }
        if (added.length === 0) { message.error('取込可能なデータがありませんでした'); return; }
        setTerms((prev) => [...prev, ...added]);
        message.success(`${added.length} 件の用語を取り込みました`);
      } catch {
        message.error('CSVの解析に失敗しました');
      } finally {
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleNamespaceSaved = (updated: NamespaceSaved) => {
    setNsNodes((prev) => prev.map((n) => (n.key === updated.key ? { ...n, ...updated } : n)));
    setModalOpen(false);
  };

  // ──── 既存行の操作セル
  const actionCell = (record: Term) => {
    if (record.id === editingTermId) {
      return (
        <span style={{ display: 'flex', gap: 4 }}>
          <Button type="primary" size="small" onClick={saveEditTerm}>✔ 保存</Button>
          <Button size="small" onClick={cancelEditTerm}>キャンセル</Button>
        </span>
      );
    }
    return (
      <span style={{ display: 'flex', gap: 4 }}>
        <Button size="small" icon={<EditOutlined />} onClick={() => startEditTerm(record)}>編集</Button>
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>削除</Button>
      </span>
    );
  };

  const typeOptions = [
    { value: 'stringType',   label: 'stringType' },
    { value: 'integerType',  label: 'integerType' },
    { value: 'floatType',    label: 'floatType' },
    { value: 'booleanType',  label: 'booleanType' },
    { value: 'dateTimeType', label: 'dateTimeType' },
    { value: 'uriType',      label: 'uriType' },
  ];

  const columns: TableColumnsType<Term | NewTermRow> = [
    {
      title: 'QName', dataIndex: 'qname', key: 'qname', width: 220,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as Term).qname.localeCompare((b as Term).qname);
      },
      defaultSortOrder: 'ascend',
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          // 入力行：ローカル名入力欄
          return <Input size="small" placeholder="✎ ローカル名を入力..." value={record.localName} onChange={(e) => updateNewTerm(record._rowId, 'localName', e.target.value)} />;
        }
        const t = record as Term;
        return t.id === editingTermId
          ? <Input size="small" value={editingValues.localName} onChange={(e) => setEditingValues((p) => ({ ...p, localName: e.target.value }))} />
          : <Text strong>{t.qname}</Text>;
      },
    },
    {
      title: '表示名', dataIndex: 'displayName', key: 'displayName', width: 130,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as Term).displayName.localeCompare((b as Term).displayName);
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          return <Input size="small" placeholder="表示名..." value={record.displayName} onChange={(e) => updateNewTerm(record._rowId, 'displayName', e.target.value)} />;
        }
        const t = record as Term;
        return t.id === editingTermId
          ? <Input size="small" value={editingValues.displayName} onChange={(e) => setEditingValues((p) => ({ ...p, displayName: e.target.value }))} />
          : t.displayName;
      },
    },
    {
      title: '説明', dataIndex: 'description', key: 'description', width: 180, ellipsis: true,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as Term).description.localeCompare((b as Term).description);
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          return <Input size="small" placeholder="説明..." value={record.description} onChange={(e) => updateNewTerm(record._rowId, 'description', e.target.value)} />;
        }
        const t = record as Term;
        return t.id === editingTermId
          ? <Input size="small" value={editingValues.description} onChange={(e) => setEditingValues((p) => ({ ...p, description: e.target.value }))} />
          : t.description;
      },
    },
    {
      title: '型', dataIndex: 'type', key: 'type', width: 140,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as Term).type.localeCompare((b as Term).type);
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          return (
            <Select size="small" style={{ width: '100%' }} value={record.type || undefined} placeholder="型を選択..."
              onChange={(val) => updateNewTerm(record._rowId, 'type', val)} options={typeOptions} />
          );
        }
        const t = record as Term;
        return t.id === editingTermId
          ? <Select size="small" style={{ width: '100%' }} value={editingValues.type || undefined} onChange={(val) => setEditingValues((p) => ({ ...p, type: val }))} options={typeOptions} />
          : <Tag>{t.type}</Tag>;
      },
    },
    {
      title: '単位', dataIndex: 'unitHint', key: 'unitHint', width: 100,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return ((a as Term).unitHint ?? '').localeCompare(((b as Term).unitHint ?? ''));
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          return <Input size="small" placeholder="単位..." value={record.unitHint} onChange={(e) => updateNewTerm(record._rowId, 'unitHint', e.target.value)} />;
        }
        const t = record as Term;
        return t.id === editingTermId
          ? <Input size="small" value={editingValues.unitHint} onChange={(e) => setEditingValues((p) => ({ ...p, unitHint: e.target.value }))} />
          : t.unitHint ?? '';
      },
    },
    {
      title: '操作', key: 'actions', width: 130,
      render: (_: unknown, record: Term | NewTermRow) =>
        '_rowId' in record ? null : actionCell(record as Term),
    },
  ];

  // 入力行を先頭に、既存行を後ろに結合
  const tableData: (Term | NewTermRow)[] = [
    ...newTerms,
    ...filteredTerms,
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── 左ペイン：名前空間ツリー（hideTree=true のとき非表示） ── */}
        {!hideTree && (
          <div style={{
            width: '30%', minWidth: 280, maxWidth: 420,
            background: '#fafafa', borderRight: '1px solid #f0f0f0',
            overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '12px 12px 8px',
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Input
                prefix={<SearchOutlined />} placeholder="名前空間を検索..." allowClear
                value={nsSearch} onChange={(e) => setNsSearch(e.target.value)} style={{ flex: 1 }}
              />
            </div>
            <Tree
              blockNode defaultExpandAll treeData={treeData}
              style={{ background: 'transparent' }}
              onSelect={(keys) => {
                const key = (keys[0] as string) ?? null;
                setSelectedNsKey(key);
                onNsKeyChange?.(key);
              }}
            />

            {/* コンテキストメニュー（右クリックメニュー） */}
            {ctxMenu.visible && ctxMenu.node && (
              <ul
                style={{
                  position: 'fixed',
                  left: ctxMenu.x,
                  top: ctxMenu.y,
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  borderRadius: 6,
                  listStyle: 'none',
                  margin: 0,
                  padding: '4px 0',
                  zIndex: 1050,
                  minWidth: 140,
                  border: '1px solid #f0f0f0',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <li
                  style={{ padding: '6px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { handleContextAddTeam(ctxMenu.node!); setCtxMenu((s) => ({ ...s, visible: false })); }}
                >
                  <PlusOutlined style={{ fontSize: 12, color: '#52c41a' }} />
                  チームを追加
                </li>
                <li
                  style={{ padding: '6px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { handleContextEditTeam(ctxMenu.node!); setCtxMenu((s) => ({ ...s, visible: false })); }}
                >
                  <EditOutlined style={{ fontSize: 12, color: '#1677ff' }} />
                  編集
                </li>
              </ul>
            )}
          </div>
        )}

        {/* ── 右ペイン：用語リスト ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 40px', background: '#fafafa' }}>
          {/* ── 1段目: ボタン群（右寄せ） ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0, paddingBottom: 8, borderBottom: '1px solid #f0f0f0', gap: 8 }}>
            <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />
            <Button onClick={() => csvInputRef.current?.click()}>インポート</Button>
            <Button onClick={handleCsvDownload}>エクスポート</Button>
            {/* 用語を追加：常に活性 */}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
              用語を追加
            </Button>
            {/* 保存：入力行が1件以上あれば活性 */}
            <Button type="primary" onClick={handleAddSave} disabled={newTerms.length === 0}>
              保存
            </Button>
            {/* キャンセル：入力行が1件以上あれば活性 */}
            <Button onClick={() => setNewTerms([])} disabled={newTerms.length === 0}>
              キャンセル
            </Button>
          </div>

          {/* ── アクションバー（B/A）: チェック1件以上のとき表示 ── */}
          {selectedTermIds.length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
              gap: 8, padding: '6px 0 6px', borderBottom: '1px solid #f0f0f0',
              background: '#fff7e6',
            }}>
              <span style={{ fontSize: 12, color: '#8c8c8c', marginRight: 4 }}>
                {selectedTermIds.length} 件を選択中
              </span>
              {/* 🏢 組織に共有（Personal ノード選択中のみ）*/}
              {isPersonalSelected && (
                <Button
                  icon={<BankOutlined />}
                  onClick={() => setShareModalOpen(true)}
                >
                  組織に共有（{selectedTermIds.length}件）
                </Button>
              )}
              <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
                削除（{selectedTermIds.length}件）
              </Button>
            </div>
          )}

          {/* ── 2段目: 検索欄 + フィルター（C）+ 件数表示 ── */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 0, paddingTop: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0', gap: 8, flexWrap: 'wrap' }}>
            <Input
              prefix={<SearchOutlined />} placeholder="用語を検索..." allowClear
              value={termSearch} onChange={(e) => setTermSearch(e.target.value)}
              style={{ maxWidth: 240 }}
            />
            <Select
              allowClear placeholder="Prefix" size="small"
              style={{ minWidth: 110 }}
              options={prefixOptions}
              value={filterPrefix}
              onChange={(v) => setFilterPrefix(v)}
            />
            <Select
              allowClear placeholder="型" size="small"
              style={{ minWidth: 120 }}
              options={typeOptionsForFilter}
              value={filterType}
              onChange={(v) => setFilterType(v)}
            />
            <Select
              allowClear placeholder="単位" size="small"
              style={{ minWidth: 90 }}
              options={unitOptions}
              value={filterUnit}
              onChange={(v) => setFilterUnit(v)}
            />
            <span style={{ fontSize: 12, color: '#8c8c8c', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
              {filteredTerms.length} 件
            </span>
          </div>

          <Table<Term | NewTermRow>
            rowKey={(record) => '_rowId' in record ? (record as NewTermRow)._rowId : (record as Term).id}
            size="small"
            loading={termsLoading}
            columns={columns}
            dataSource={tableData}
            rowClassName={(record) => '_rowId' in record ? 'row-new-term' : ''}
            locale={{ triggerAsc: '昇順にソート', triggerDesc: '降順にソート', cancelSort: 'ソートをキャンセル' }}
            pagination={{
              current: currentPage, pageSize, showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100'],
              showTotal: (total) => `全 ${total} 件`,
              onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
              onShowSizeChange: (_, size) => { setCurrentPage(1); setPageSize(size); },
            }}
            rowSelection={{
              type: 'checkbox', selectedRowKeys: selectedTermIds,
              columnTitle: (
                <input
                  type="checkbox"
                  checked={filteredTerms.length > 0 && selectedTermIds.length === filteredTerms.length}
                  style={{ cursor: 'pointer' }}
                  onChange={() => {
                    if (selectedTermIds.length === filteredTerms.length) {
                      setSelectedTermIds([]);
                    } else {
                      setSelectedTermIds(filteredTerms.map((t) => t.id));
                    }
                  }}
                />
              ),
              onChange: (keys) => setSelectedTermIds(keys as string[]),
              getCheckboxProps: (record) => ({ disabled: '_rowId' in record }),
            }}
          />
        </div>
      </div>

      {/* ── ステータスバー ── */}
      <div style={{
        height: 28, background: '#f5f5f5', color: '#595959', borderTop: '1px solid #e8e8e8',
        display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 12, gap: 16, flexShrink: 0,
      }}>
        <span>✅ 準備完了</span>
        <span>名前空間: 7件</span>
        <span>用語: {terms.length}件</span>
        <span>最終保存: 2026-05-29 08:30</span>
        <span>UTF-8</span>
      </div>

      {/* ── 組織追加ダイアログ ── */}
      <NamespaceAddDialog
        open={addDialogOpen}
        onClose={() => { setAddDialogOpen(false); setAddChildParentKey(null); }}
        onRegistered={(values) => {
          const newNode: FlatNsNode = {
            key: `ns-${Date.now()}`, prefix: values.prefix, uri: values.uri, level: values.level,
            termCount: 0, displayName: values.displayName || undefined, description: values.description || undefined,
          };
          setNsNodes((prev) => [...prev, newNode]);
          setAddDialogOpen(false);
          setAddChildParentKey(null);
        }}
      />

      {/* ── チーム追加ダイアログ ── */}
      <TeamAddDialog
        open={teamAddOpen}
        parentTeamLabel={teamAddParentLabel}
        onClose={() => setTeamAddOpen(false)}
        onCreated={(teamName, members) => {
          message.success(`チーム「${teamName}」を作成しました（メンバー: ${members.length}名）`);
          setTeamAddOpen(false);
        }}
      />

      {/* ── チーム編集ダイアログ（メンバー追加）── */}
      <TeamEditDialog
        open={teamEditOpen}
        teamLabel={teamEditLabel}
        onClose={() => setTeamEditOpen(false)}
        onSaved={(members) => {
          message.success(`「${teamEditLabel}」のメンバーを更新しました（${members.length}名）`);
        }}
      />

      {/* ── 統合詳細モーダル ── */}
      <DetailModal
        open={modalOpen} target={modalTarget}
        onClose={() => setModalOpen(false)}
        onTermSaved={handleTermSaved}
        onNamespaceSaved={handleNamespaceSaved}
      />

      {/* ── 組織に共有 確認モーダル（A）── */}
      <Modal
        open={shareModalOpen}
        onCancel={() => setShareModalOpen(false)}
        title={<span style={{ fontSize: 16, fontWeight: 600 }}>🏢 組織に共有</span>}
        width={480}
        okText="共有する"
        cancelText="キャンセル"
        onOk={handleShare}
      >
        <p style={{ marginBottom: 8 }}>
          選択した <strong>{selectedTermIds.length} 件</strong> の用語を、組織の名前空間に共有します。
        </p>
        <div style={{
          background: '#f5f5f5', borderRadius: 6, padding: '10px 14px', marginBottom: 12,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <span style={{ fontSize: 13 }}>
            <strong>共有先:</strong>{' '}
            {shareTargetMock.departmentName} / {shareTargetMock.teamName}
          </span>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            Prefix: <code>{shareTargetMock.prefix}</code>
          </span>
        </div>
        <div style={{ background: '#fff7e6', borderRadius: 6, padding: '8px 14px', border: '1px solid #ffd591' }}>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#595959' }}>
            {selectedTermIds.slice(0, 5).map((id) => {
              const t = terms.find((x) => x.id === id);
              return t ? <li key={id}>{t.qname} — {t.displayName}</li> : null;
            })}
            {selectedTermIds.length > 5 && (
              <li style={{ color: '#8c8c8c' }}>… 他 {selectedTermIds.length - 5} 件</li>
            )}
          </ul>
        </div>
        <p style={{ marginTop: 10, fontSize: 12, color: '#ff4d4f' }}>
          ⚠ 共有後は組織メンバー全員が参照できるようになります。
        </p>
      </Modal>

      <style>{`
        .row-new-term td { background: #fffbe6 !important; }
      `}</style>
    </div>
  );
};

export default NamespaceMain;
