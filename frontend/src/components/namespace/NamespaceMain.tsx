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
  description: string;
  type: string;
  unitHint?: string;
}

interface NewTermRow {
  _rowId: string; // 一時ID（テーブル行のkey用）
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
  unitHint: string;
}

interface AttributeMaster {
  attributeName: string;
  attributeValue: string;
  isActive: boolean;
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

// ──────────────────────────────────────────────
// prefix → スコープフルパス を返すユーティリティ
// uncertainty-scope.json のツリーを再帰的にたどる
// 例: "materials" → "🏢 株式会社サンプルテック › 研究開発部 › 材料グループ"
// ──────────────────────────────────────────────
type ScopeTreeNode = {
  key: string;
  label: string;
  icon?: string;
  prefix?: string;
  children?: ScopeTreeNode[];
};


// ルートを含めてツリー全体から検索するラッパー
const getScopeFullPath = (prefix: string): string => {
  const tree = namespaceTreeRaw as ScopeTreeNode[];
  // ルートノードのアイコンを付与したパスを構築
  const searchWithIcon = (nodes: ScopeTreeNode[], ancestors: string[]): string | null => {
    for (const node of nodes) {
      const icon = node.icon ? `${node.icon} ` : '';
      const nodeLabel = ancestors.length === 0 ? `${icon}${node.label}` : node.label;
      const currentPath = [...ancestors, nodeLabel];
      if ((node as any).prefix === prefix) {
        return currentPath.join(' › ');
      }
      if (node.children) {
        const found = searchWithIcon(node.children, currentPath);
        if (found) return found;
      }
    }
    return null;
  };
  return searchWithIcon(tree, []) ?? prefix;
};

// ──────────────────────────────────────────────
// モック: ログイン中ユーザーの所属ノードキー
// 本番実装では認証APIから取得する
// ──────────────────────────────────────────────
const CURRENT_USER_NS_KEY = 'rd-materials';

// モック: ログイン中ユーザーの Personal ノードキー
// 本番実装では認証APIから取得する
const CURRENT_USER_PERSONAL_KEY = 'user-me';

// ──────────────────────────────────────────────
// 指定キーの祖先ノードキー集合を返すユーティリティ
// ──────────────────────────────────────────────
const getAncestorKeys = (targetKey: string, nodes: NamespaceNode[], ancestors: string[] = []): string[] | null => {
  for (const node of nodes) {
    if (node.key === targetKey) return ancestors;
    if (node.children) {
      const found = getAncestorKeys(targetKey, node.children, [...ancestors, node.key]);
      if (found) return found;
    }
  }
  return null;
};

// グローバルノード配下の全 prefix を返す
const getGlobalPrefixes = (nodes: NamespaceNode[]): string[] => {
  const globalNode = nodes.find((n) => n.key === 'global');
  if (!globalNode?.children) return [];
  const collect = (ns: NamespaceNode[]): string[] =>
    ns.flatMap((n) => [(n as any).prefix as string | undefined, ...(n.children ? collect(n.children) : [])].filter(Boolean) as string[]);
  return collect(globalNode.children);
};

// 指定キーノード配下の全 prefix を再帰収集
const collectPrefixesUnder = (key: string, nodes: NamespaceNode[]): string[] => {
  for (const n of nodes) {
    if (n.key === key) {
      const collect = (ns: NamespaceNode[]): string[] =>
        ns.flatMap((c) => [
          (c as any).prefix as string | undefined,
          ...(c.children ? collect(c.children) : []),
        ].filter(Boolean) as string[]);
      const selfPrefix = (n as any).prefix as string | undefined;
      return [...(selfPrefix ? [selfPrefix] : []), ...(n.children ? collect(n.children) : [])];
    }
    if (n.children) {
      const r = collectPrefixesUnder(key, n.children);
      if (r.length > 0) return r;
    }
  }
  return [];
};

// 指定キーがどのルートノード（global/personal/company等）配下にあるかを返す
const getRootKey = (nsKey: string, nodes: NamespaceNode[]): string | null => {
  for (const root of nodes) {
    if (root.key === nsKey) return root.key;
    if (root.children) {
      const found = getAncestorKeys(nsKey, root.children, []);
      if (found !== null) return root.key;
    }
  }
  return null;
};

// ──────────────────────────────────────────────
// ログインユーザーの所属パスのみを残してツリーを剪定する
// - Global / Personal ルートはそのまま表示
// - company 配下は自分のノードへの祖先パス + 自分のノードのみ残す
// ──────────────────────────────────────────────
const filterTreeForUser = (nodes: NamespaceNode[], userNsKey: string): NamespaceNode[] => {
  // 自分のノードへの祖先キー集合（例: ['company', 'dept-rd']）
  const ancestorKeys = new Set<string>(getAncestorKeys(userNsKey, nodes) ?? []);

  const filterNodes = (ns: NamespaceNode[]): NamespaceNode[] =>
    ns
      .filter((n) => {
        // Global / Personal ルートは常に表示
        if (n.key === 'global' || n.key === 'personal') return true;
        // company ルートは常に表示（配下を剪定する）
        if (n.key === 'company') return true;
        // 自分のノード自身 → 表示
        if (n.key === userNsKey) return true;
        // 祖先ノード → 表示
        if (ancestorKeys.has(n.key)) return true;
        // それ以外（兄弟・他部署など）→ 非表示
        return false;
      })
      .map((n) => ({
        ...n,
        children: n.children ? filterNodes(n.children) : undefined,
      }));

  return filterNodes(nodes);
};

// ──────────────────────────────────────────────
// terms 配列から prefix に一致する件数を集計（子孫も含む）
// ──────────────────────────────────────────────
const countTermsByPrefix = (prefixes: Set<string>, terms: { prefix: string }[]): number =>
  terms.filter((t) => prefixes.has(t.prefix)).length;

const collectAllPrefixesUnder = (node: NamespaceNode): Set<string> => {
  const result = new Set<string>();
  const traverse = (n: NamespaceNode) => {
    const p = (n as any).prefix as string | undefined;
    if (p) result.add(p);
    n.children?.forEach(traverse);
  };
  traverse(node);
  return result;
};

// 選択ノード種別に応じた prefix 集合を返す
// - Global ノード選択 → Global 配下の prefix のみ
// - Personal ノード選択 → Personal（ログインユーザー）配下の prefix のみ
// - 組織ノード選択 → そのノード配下の全 prefix（自分 + 子孫）
const getRelatedPrefixes = (nsKey: string): Set<string> => {
  const tree = namespaceTreeRaw as NamespaceNode[];
  const result = new Set<string>();

  const rootKey = getRootKey(nsKey, tree);

  if (rootKey === 'global') {
    // Global ノード or 配下 → グローバルprefixは表示しない
    return result;
  }

  if (rootKey === 'personal') {
    // Personal ノード or 配下 → ログインユーザー配下の全 prefix
    for (const pp of collectPrefixesUnder(CURRENT_USER_PERSONAL_KEY, tree)) result.add(pp);
    return result;
  }

  // 組織ノード（company配下）→ ログインユーザーの自分 + 祖先の prefix のみ
  // （他部署・他チームの用語は表示しない）
  const findPrefix = (key: string, nodes: NamespaceNode[]): string | null => {
    for (const n of nodes) {
      if (n.key === key) return (n as any).prefix ?? null;
      if (n.children) { const r = findPrefix(key, n.children); if (r) return r; }
    }
    return null;
  };

  // ログインユーザーの所属ノードの prefix
  const selfPrefix = findPrefix(CURRENT_USER_NS_KEY, tree);
  if (selfPrefix) result.add(selfPrefix);

  // ログインユーザーの祖先ノードの prefix
  const ancestorKeys = getAncestorKeys(CURRENT_USER_NS_KEY, tree) ?? [];
  for (const ak of ancestorKeys) {
    const p = findPrefix(ak, tree);
    if (p) result.add(p);
  }

  return result;
};

const makeEmptyRow = (): NewTermRow => ({
  _rowId: `__new__${Date.now()}_${Math.random()}`,
  prefix: '',
  localName: '', displayName: '',
  description: '', type: '', unitHint: '',
});

// ──────────────────────────────────────────────
// Props定義
// ──────────────────────────────────────────────
interface NamespaceMainProps {
  /** trueのとき左ペイン（名前空間ツリー）を非表示にする */
  hideTree?: boolean;
  /** trueのときグローバル名前空間のみ表示・操作対象にする（ProviderMenu用） */
  globalOnly?: boolean;
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
  globalOnly = false,
  externalSelectedNsKey,
  onNsKeyChange,
}) => {
  const [nsSearch,      setNsSearch]      = useState('');
  const [termSearch,    setTermSearch]    = useState('');
  const [selectedNsKey, setSelectedNsKey] = useState<string | null>(
    globalOnly ? 'global' : CURRENT_USER_NS_KEY
  );
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
  const [teamEditUnitId,  setTeamEditUnitId]  = useState<string | undefined>(undefined);
  const [teamEditMembers, setTeamEditMembers] = useState<string[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ──── コンテキストメニュー状態（方針B: Tree.onRightClick 方式）
  const [ctxMenu, setCtxMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: NamespaceNode | null;
    parentLabel: string;
  }>({ visible: false, x: 0, y: 0, node: null, parentLabel: '' });

  const [filterPrefix,    setFilterPrefix]    = useState<string | null>(null);
  const [filterScope,     setFilterScope]     = useState<string | null>(null);
  const [filterType,      setFilterType]       = useState<string | null>(null);
  const [filterUnit,      setFilterUnit]       = useState<string | null>(null);
  const FALLBACK_UNITS = ['kg', 'g', 'mg', 'μg', 'L', 'mL', 'm', 'cm', 'mm', 'μm', 'nm', '℃', 'K', 'Pa', 'MPa', 'mol', 'wt%', 'vol%', '%', 'min', 'h', 's', 'なし'];
  const [unitAttributes,  setUnitAttributes]  = useState<string[]>(FALLBACK_UNITS);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(20);

  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{ prefix: string; localName: string; displayName: string; description: string; type: string; unitHint: string }>({ prefix: '', localName: '', displayName: '', description: '', type: '', unitHint: '' });

  // ──── 初回マウント時に属性テーブルから単位一覧を取得（失敗時はダミーデータにフォールバック）
  useEffect(() => {
    fetch('/api/v1/master/attribute', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json: { success: boolean; data: AttributeMaster[] }) => {
        const units = json.data
          .filter((a) => a.isActive)
          .map((a) => a.attributeValue);
        // データが0件の場合はフォールバックデータを使用
        if (units.length > 0) {
          setUnitAttributes(units);
        }
      })
      .catch(() => {
        // APIが失敗した場合はフォールバックデータをそのまま使用
      });
  }, []);

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
  setEditingValues({ prefix: record.prefix ?? '', localName: record.localName, displayName: record.displayName, description: record.description, type: record.type, unitHint: record.unitHint ?? '' });
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

  // ──── チームノード右クリック：チームを追加（親ノードのラベルを追加先として表示）
  const handleContextAddTeam = (_node: NamespaceNode) => {
    setTeamAddParentLabel('研究開発部');
    setTeamAddOpen(true);
  };

  // ──── チームノード右クリック：編集（メンバー追加）
  const handleContextEditTeam = (node: NamespaceNode) => {
    setTeamEditLabel(node.label);
    // node.key を departmentUnitId として使用（DBから取得したツリーであればUUIDが入る）
    setTeamEditUnitId((node as any).departmentUnitId ?? node.key ?? undefined);
    setTeamEditMembers([]);
    setTeamEditOpen(true);
  };

  // ──── コンテキストメニューを閉じる（mousedown で即座にキャッチ）
  useEffect(() => {
    const close = () => setCtxMenu((s) => ({ ...s, visible: false }));
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  // Global または Personal 配下のノードが選択中かどうか
  const isGlobalOrPersonalSelected = useMemo(() => {
    const key = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    if (!key) return false;
    const rootKey = getRootKey(key, namespaceTreeRaw as NamespaceNode[]);
    return rootKey === 'global' || rootKey === 'personal';
  }, [selectedNsKey, externalSelectedNsKey]);

  // Personal 配下のノードが選択中かどうか（組織共有ボタンの表示判定用）
  const isPersonalSelected = useMemo(() => {
    const key = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    if (!key) return false;
    return getRootKey(key, namespaceTreeRaw as NamespaceNode[]) === 'personal';
  }, [selectedNsKey, externalSelectedNsKey]);

  // ログインユーザーの所属組織Prefixを取得
  const currentUserOrgPrefix = useMemo(() => {
    const tree = namespaceTreeRaw as NamespaceNode[];
    const findPrefix = (key: string, nodes: NamespaceNode[]): string | null => {
      for (const n of nodes) {
        if (n.key === key) return (n as any).prefix ?? null;
        if (n.children) { const r = findPrefix(key, n.children); if (r) return r; }
      }
      return null;
    };
    return findPrefix(CURRENT_USER_NS_KEY, tree);
  }, []);

  // 選択中の用語を組織Prefixにコピーして共有する
  const handleShareToOrg = () => {
    if (selectedTermIds.length === 0) return;
    if (!currentUserOrgPrefix) {
      message.error('所属組織の名前空間が見つかりません');
      return;
    }
    const orgScopePath = getScopeFullPath(currentUserOrgPrefix);

    Modal.confirm({
      title: `${selectedTermIds.length}件の用語を組織に共有しますか？`,
      content: `選択した用語を「${orgScopePath}」にコピーします。個人の用語はそのまま残ります。`,
      okText: '共有する',
      cancelText: 'キャンセル',
      okButtonProps: { style: { background: '#52c41a', borderColor: '#52c41a' } },
      footer: (_: unknown, { OkBtn, CancelBtn }: { OkBtn: React.FC; CancelBtn: React.FC }) => (
        <><OkBtn /><CancelBtn /></>
      ),
      onOk: async () => {
        const targetTerms = terms.filter((t) => selectedTermIds.includes(t.id));
        const added: Term[] = [];
        const failed: string[] = [];

        for (const term of targetTerms) {
          try {
            const res = await fetch('/api/v1/namespaces/terms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                prefix:        currentUserOrgPrefix,
                localName:     term.localName,
                displayNameJa: term.displayName,
                description:   term.description,
                typeHint:      term.type,
                unitHint:      term.unitHint,
              }),
            });
            if (!res.ok) {
              failed.push(term.localName);
            } else {
              const created: Term = await res.json();
              added.push(created);
            }
          } catch {
            failed.push(term.localName);
          }
        }

        if (added.length > 0) {
          setTerms((prev) => [...added, ...prev]);
        }
        if (failed.length > 0) {
          message.warning(`${added.length}件共有完了、${failed.length}件失敗しました`);
        } else {
          message.success(`${added.length}件の用語を組織に共有しました`);
        }
      },
    });
  };

  // ──── ツリーノードのタイトル（件数は terms から動的計算）
  // companyDepth: 0 = Global/Personal/company ルート、1 = 部門、2 = グループ/チーム（depth 3 相当）
  // showUserHighlight: Global/Personal 選択中でない場合に CURRENT_USER_NS_KEY を薄い青背景で表示
  const renderTreeTitle = useCallback((node: NamespaceNode, companyDepth: number, termCount: number, showUserHighlight: boolean, parentLabel = '') => {
    const isCurrentUserNode = showUserHighlight && node.key === CURRENT_USER_NS_KEY;
    // チームノード（companyDepth === 3）のみ右クリックメニューを有効化
    const isTeam = companyDepth === 3;

    const handleContextMenu = isTeam
      ? (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, node, parentLabel });
        }
      : undefined;

    return (
      <span
        onContextMenu={handleContextMenu}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0,
          cursor: isTeam ? 'context-menu' : undefined,
          ...(isCurrentUserNode ? { background: '#e6f4ff', borderRadius: 4 } : {}),
        }}
      >
        <span style={{ flex: 1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.label}
        </span>
        {termCount > 0 && (
          <span style={{ color: '#8c8c8c', fontSize: 12, flexShrink: 0 }}>{termCount}</span>
        )}
      </span>
    );
  }, []);

  // ──── ノードの companyDepth を計算してツリーデータを構築（件数を terms から動的計算）
  const toAntTree = (nodes: NamespaceNode[], companyDepth = 0, showUserHighlight = false, parentLabel = ''): object[] =>
    nodes.map((n) => {
      // 自分自身の depth を決定
      const selfDepth = companyDepth > 0
        ? companyDepth           // 既に company 配下にいる
        : n.key === 'company'
          ? 1                    // company ノード自身 = depth 1
          : 0;                   // Global / Personal = カウント外
      // このノード配下の全 prefix を収集して terms から件数を集計
      const prefixes = collectAllPrefixesUnder(n);
      const termCount = countTermsByPrefix(prefixes, terms);
      return {
        key:      n.key,
        title:    renderTreeTitle(n, selfDepth, termCount, showUserHighlight, parentLabel),
        icon:     null,
        children: n.children ? toAntTree(n.children, selfDepth > 0 ? selfDepth + 1 : 0, showUserHighlight, n.label) : undefined,
      };
    });

  const treeData = useMemo(() => {
    const allNodes = namespaceTreeRaw as NamespaceNode[];
    // ログインユーザーの所属パスのみに絞り込む
    const userFilteredNodes = filterTreeForUser(allNodes, CURRENT_USER_NS_KEY);
    const filterBySearch = (nodes: NamespaceNode[]): NamespaceNode[] =>
      nodes
        .map((n) => ({ ...n, children: n.children ? filterBySearch(n.children) : undefined }))
        .filter(
          (n) =>
            !nsSearch ||
            n.label.toLowerCase().includes(nsSearch.toLowerCase()) ||
            (n.children && n.children.length > 0),
        );
    // Global/Personal が選択されていない時のみ CURRENT_USER_NS_KEY を薄い青背景で強調
    const showUserHighlight = !isGlobalOrPersonalSelected;
    return toAntTree(nsSearch ? filterBySearch(userFilteredNodes) : userFilteredNodes, 0, showUserHighlight, '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nsSearch, renderTreeTitle, terms, isGlobalOrPersonalSelected]);

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
    // globalOnly=true のときはグローバル prefix のみに絞り込む
    if (globalOnly) {
      const globalPrefixes = new Set(getGlobalPrefixes(namespaceTreeRaw as NamespaceNode[]));
      result = result.filter((t) => globalPrefixes.has(t.prefix));
    } else if (effectiveNsKey) {
      // 選択されているノードがある場合は「自分 + 祖先 + グローバル」prefix で絞り込む
      const relatedPrefixes = getRelatedPrefixes(effectiveNsKey);
      if (relatedPrefixes.size > 0) {
        result = result.filter((t) => relatedPrefixes.has(t.prefix));
      }
    }
    // Prefix フィルター
    if (filterPrefix) {
      result = result.filter((t) => t.prefix === filterPrefix);
    }
    // スコープフィルター
    if (filterScope) {
      result = result.filter((t) => t.prefix === filterScope);
    }
    // データ型フィルター
    if (filterType) {
      result = result.filter((t) => t.type === filterType);
    }
    // 単位フィルター
    if (filterUnit) {
      result = result.filter((t) => (t.unitHint ?? '') === filterUnit);
    }
    if (!termSearch) return result;
    return result.filter(
      (t) =>
        t.qname.toLowerCase().includes(termSearch.toLowerCase()) ||
        t.displayName.toLowerCase().includes(termSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(termSearch.toLowerCase()),
    );
  }, [terms, termSearch, effectiveNsKey, filterPrefix, filterScope, filterType, filterUnit]);

  // Prefix フィルターの選択肢（表示中用語の prefix 一覧）
  const prefixFilterOptions = useMemo(() => {
    const prefixSet = new Set<string>();
    let base = terms;
    if (effectiveNsKey) {
      const related = getRelatedPrefixes(effectiveNsKey);
      if (related.size > 0) base = base.filter((t) => related.has(t.prefix));
    }
    base.forEach((t) => prefixSet.add(t.prefix));
    return [
      { value: '', label: '用語Prefix: すべて' },
      ...[...prefixSet].sort().map((p) => ({ value: p, label: p })),
    ];
  }, [terms, effectiveNsKey]);

  // 単位フィルター選択肢（属性テーブルから取得）
  const unitFilterOptions = useMemo(() => [
    { value: '', label: '単位: すべて' },
    ...unitAttributes.map((u) => ({ value: u, label: u })),
  ], [unitAttributes]);

  // スコープフィルターの選択肢（表示中用語の prefix 一覧）
  const scopeFilterOptions = useMemo(() => {
    const prefixSet = new Set<string>();
    // effectiveNsKey でフィルタ済みの terms から prefix を収集
    let base = terms;
    if (effectiveNsKey) {
      const related = getRelatedPrefixes(effectiveNsKey);
      if (related.size > 0) base = base.filter((t) => related.has(t.prefix));
    }
    base.forEach((t) => prefixSet.add(t.prefix));
    return [
      { value: '', label: 'スコープ: すべて' },
      ...[...prefixSet].sort().map((p) => {
        const fullPath = getScopeFullPath(p);
        const parts = fullPath.split(' › ');
        const label = parts[parts.length - 1].trim();
        return { value: p, label };
      }),
    ];
  }, [terms, effectiveNsKey]);

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
    const header = 'qname,prefix,localName,displayName,description,type,unitHint';
    const rows = terms.filter((t) => selectedTermIds.includes(t.id)).map((t) =>
      [t.qname, t.prefix, t.localName, t.displayName, t.description, t.type, t.unitHint ?? '']
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
    reader.onload = async (ev) => {
      try {
        const text  = (ev.target?.result as string).replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) { message.error('CSVデータが空です'); return; }

        // CSV パース
        type ParsedRow = {
          prefix: string; localName: string; displayName: string;
          displayNameEn: string; description: string; type: string; unitHint: string;
        };
        const rows: ParsedRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((c) =>
            c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
          ) ?? [];
          if (cols.length < 6) continue;
          const [, prefix, localName, displayName, displayNameEn, description, type, unitHint] = cols;
          if (!localName) continue;
          rows.push({
            prefix:        prefix        ?? '',
            localName:     localName     ?? '',
            displayName:   displayName   ?? '',
            displayNameEn: displayNameEn ?? '',
            description:   description   ?? '',
            type:          type          ?? 'stringType',
            unitHint:      unitHint      ?? '',
          });
        }

        if (rows.length === 0) { message.error('取込可能なデータがありませんでした'); return; }

        // 各行を API で DB に保存
        const added: Term[] = [];
        const failed: string[] = [];

        for (const row of rows) {
          try {
            const res = await fetch('/api/v1/namespaces/terms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                prefix:        row.prefix,
                localName:     row.localName,
                displayNameJa: row.displayName,
                displayNameEn: row.displayNameEn,
                description:   row.description,
                typeHint:      row.type || 'stringType',
                unitHint:      row.unitHint,
              }),
            });
            if (!res.ok) {
              failed.push(row.localName);
            } else {
              const created: Term = await res.json();
              added.push(created);
            }
          } catch {
            failed.push(row.localName);
          }
        }

        if (added.length > 0) {
          setTerms((prev) => [...prev, ...added]);
        }
        if (failed.length > 0) {
          message.warning(`${added.length}件保存、${failed.length}件失敗しました（失敗: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}）`);
        } else {
          message.success(`${added.length} 件の用語をDBに保存しました`);
        }
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
      title: '用語Prefix', dataIndex: 'prefix', key: 'prefix_col', width: 140,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as Term).prefix.localeCompare((b as Term).prefix);
      },
      defaultSortOrder: 'ascend',
      render: (_: unknown, record: Term | NewTermRow) => {
        const globalPrefixSet = new Set(getGlobalPrefixes(namespaceTreeRaw as NamespaceNode[]));
        const prefixOptions = nsNodes
          .filter((n) => (n as any)._rawPrefix !== undefined ? (n as any)._rawPrefix : true)
          .filter((n) => !globalPrefixSet.has(n.prefix))
          .map((n) => ({ value: n.prefix, label: n.prefix }))
          .filter((o, i, arr) => o.value && arr.findIndex((x) => x.value === o.value) === i);

        if ('_rowId' in record) {
          const r = record as NewTermRow;
          return (
            <Select
              size="small"
              style={{ width: '100%' }}
              value={r.prefix || undefined}
              placeholder="Prefixを選択..."
              allowClear
              options={prefixOptions}
              onChange={(val) => updateNewTerm(r._rowId, 'prefix', val ?? '')}
            />
          );
        }
        const t = record as Term;
        return t.id === editingTermId
          ? (
            <Select
              size="small"
              style={{ width: '100%' }}
              value={editingValues.prefix || undefined}
              placeholder="Prefixを選択..."
              allowClear
              options={prefixOptions}
              onChange={(val) => setEditingValues((p) => ({ ...p, prefix: val ?? '' }))}
            />
          )
          : <Text strong>{t.prefix}</Text>;
      },
    },
    {
      title: 'ローカル名', dataIndex: 'localName', key: 'localName', width: 160,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as Term).localName.localeCompare((b as Term).localName);
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          return <Input size="small" placeholder="✎ ローカル名を入力..." value={record.localName} onChange={(e) => updateNewTerm(record._rowId, 'localName', e.target.value)} />;
        }
        const t = record as Term;
        return t.id === editingTermId
          ? <Input size="small" value={editingValues.localName} onChange={(e) => setEditingValues((p) => ({ ...p, localName: e.target.value }))} />
          : t.localName;
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
      title: 'スコープ', key: 'scope', width: 180, align: 'center' as const,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        const pathA = getScopeFullPath((a as Term).prefix);
        const pathB = getScopeFullPath((b as Term).prefix);
        return pathA.localeCompare(pathB);
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) return <span style={{ color: '#bbb' }}>—</span>;
        const t = record as Term;
        const fullPath = getScopeFullPath(t.prefix);
        const parts = fullPath.split(' › ');
        const label = parts[parts.length - 1].trim();
        return (
          <Tooltip title={fullPath}>
            <Tag
              style={{
                fontSize: 11,
                color: '#555',
                background: '#f5f5f5',
                borderColor: '#e8e8e8',
                maxWidth: 160,
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
      title: '型', dataIndex: 'type', key: 'type', width: 140, align: 'center' as const,
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
          : <Tag style={{ fontSize: 11, color: '#555', background: '#f5f5f5', borderColor: '#e8e8e8' }}>{t.type}</Tag>;
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
          return (
            <Select size="small" style={{ width: '100%' }} allowClear
              value={record.unitHint || undefined} placeholder="単位を選択..."
              options={unitAttributes.map((u) => ({ value: u, label: u }))}
              onChange={(val) => updateNewTerm(record._rowId, 'unitHint', val ?? '')} />
          );
        }
        const t = record as Term;
        return t.id === editingTermId
          ? (
            <Select size="small" style={{ width: '100%' }} allowClear
              value={editingValues.unitHint || undefined}
              options={unitAttributes.map((u) => ({ value: u, label: u }))}
              onChange={(val) => setEditingValues((p) => ({ ...p, unitHint: val ?? '' }))} />
          )
          : t.unitHint ?? '';
      },
    },
    {
      title: '操作', key: 'actions', width: 130,
      render: (_: unknown, record: Term | NewTermRow) =>
        '_rowId' in record ? null : actionCell(record as Term),
    },
  ];

  // スコープ列は globalOnly のとき非表示
  const visibleColumns = globalOnly
    ? columns.filter((c) => c.key !== 'scope')
    : columns;

  // 入力行を先頭に、既存行を後ろに結合
  const tableData: (Term | NewTermRow)[] = [
    ...newTerms,
    ...filteredTerms,
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── 左ペイン：名前空間ツリー（hideTree=true / globalOnly=true のとき非表示） ── */}
        {!hideTree && !globalOnly && (
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
              key={treeData.map((n: any) => n.key).join(',')}
              blockNode defaultExpandAll treeData={treeData}
              selectedKeys={isGlobalOrPersonalSelected && selectedNsKey ? [selectedNsKey] : []}
              style={{ background: 'transparent' }}
              onSelect={(keys) => {
                const key = (keys[0] as string) ?? null;
                // 会社・部門などの祖先ノードは選択不可
                const ancestorKeys = new Set<string>(
                  getAncestorKeys(CURRENT_USER_NS_KEY, namespaceTreeRaw as NamespaceNode[]) ?? []
                );
                ancestorKeys.add('company');
                if (key && ancestorKeys.has(key)) return;
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
                  onClick={() => {
                    setTeamAddParentLabel('研究開発部');
                    setTeamAddOpen(true);
                    setCtxMenu((s) => ({ ...s, visible: false }));
                  }}
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
          {/* 上段アクションバー（1件以上チェック時に表示） */}
          {selectedTermIds.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              padding: '6px 0',
            }}>
              {isPersonalSelected && (
                <Button
                  icon={<BankOutlined />}
                  onClick={handleShareToOrg}
                  style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
                >
                  組織に共有（{selectedTermIds.length}件）
                </Button>
              )}
              <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
                選択した用語を削除（{selectedTermIds.length}件）
              </Button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 2 }}>
            <Input
              prefix={<SearchOutlined />} placeholder="用語を検索..." allowClear
              value={termSearch} onChange={(e) => setTermSearch(e.target.value)}
              style={{ flex: 1, minWidth: 80 }}
            />
            {!globalOnly && (
              <Select
                style={{ width: 200, flexShrink: 0 }}
                value={filterPrefix ?? ''}
                options={prefixFilterOptions}
                onChange={(val) => { setFilterPrefix(val || null); setCurrentPage(1); }}
              />
            )}
            {!globalOnly && (
              <Select
                style={{ width: 160, flexShrink: 0 }}
                value={filterScope ?? ''}
                options={scopeFilterOptions}
                onChange={(val) => { setFilterScope(val || null); setCurrentPage(1); }}
              />
            )}
            <Select
              style={{ width: 160, flexShrink: 0 }}
              value={filterType ?? ''}
              options={[
                { value: '', label: '型: すべて' },
                { value: 'stringType',   label: 'stringType' },
                { value: 'integerType',  label: 'integerType' },
                { value: 'floatType',    label: 'floatType' },
                { value: 'booleanType',  label: 'booleanType' },
                { value: 'dateTimeType', label: 'dateTimeType' },
                { value: 'uriType',      label: 'uriType' },
              ]}
              onChange={(val) => { setFilterType(val || null); setCurrentPage(1); }}
            />
            <Select
              style={{ width: 140, flexShrink: 0 }}
              value={filterUnit ?? ''}
              options={unitFilterOptions}
              onChange={(val) => { setFilterUnit(val || null); setCurrentPage(1); }}
            />
            <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />
            <Button onClick={() => csvInputRef.current?.click()}>インポート</Button>
            <Button onClick={handleCsvDownload}>エクスポート</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
              用語を追加
            </Button>
            <Button type="primary" onClick={handleAddSave} disabled={newTerms.length === 0}>
              保存
            </Button>
            <Button onClick={() => setNewTerms([])} disabled={newTerms.length === 0}>
              キャンセル
            </Button>
          </div>

          <Table<Term | NewTermRow>
            rowKey={(record) => '_rowId' in record ? (record as NewTermRow)._rowId : (record as Term).id}
            size="small"
            loading={termsLoading}
            columns={visibleColumns}
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
        teamUnitId={teamEditUnitId}
        onClose={() => setTeamEditOpen(false)}
        onSaved={(members, newTeamName) => {
          const name = newTeamName ?? teamEditLabel;
          message.success(`「${name}」を更新しました（メンバー: ${members.length}名）`);
        }}
      />

      {/* ── 統合詳細モーダル ── */}
      <DetailModal
        open={modalOpen} target={modalTarget}
        onClose={() => setModalOpen(false)}
        onTermSaved={handleTermSaved}
        onNamespaceSaved={handleNamespaceSaved}
      />

      <style>{`
        .row-new-term td { background: #fffbe6 !important; }
      `}</style>
    </div>
  );
};

export default NamespaceMain;
