'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button, Input, Select, Space, Tree, Typography, message } from 'antd';
import { ImportOutlined, ExportOutlined, PlusOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import UncertaintyListTable from './UncertaintyListTable';
import type { UncertaintyTemplate } from './UncertaintyListTable';
import UncertaintyDetailModal from './UncertaintyDetailModal';
import UncertaintyCreateModal from './UncertaintyCreateModal';
import UncertaintyImportModal from './UncertaintyImportModal';
import UncertaintyExportModal from './UncertaintyExportModal';
import { fetchUncertaintyCriteriaList } from '@/services/uncertaintyCriteriaApiService';
import NamespaceMain from '../namespace/NamespaceMain';
import PrefixManagement from '../namespace/PrefixManagement';
import { getOrganizationGroups } from '@/services/namespaceApiService';
import TeamAddDialog from '../team/TeamAddDialog';
import TeamEditDialog from '../team/TeamEditDialog';
import type { OrganizationGroupRow } from '@/types/namespace';
import type { User } from '@/types/auth';

// GlobalNamespaceView: グローバルノード選択時に右ペインへ表示（SSR無効）
const GlobalNamespaceView = dynamic(() => import('../namespace/GlobalNamespaceView'), { ssr: false });

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────
interface NamespaceNode {
  key: string;
  label: string;
  count: number;
  icon?: string;
  children?: NamespaceNode[];
}

// ──────────────────────────────────────────────
// localStorage の userInfo から organizationName を取得する
// ──────────────────────────────────────────────
const getOrganizationNameFromStorage = (): string => {
  if (typeof window === 'undefined') return 'Organization';
  try {
    const raw = localStorage.getItem('userInfo');
    if (!raw) return 'Organization';
    const info = JSON.parse(raw) as { organizationName?: string };
    return info.organizationName ?? 'Organization';
  } catch {
    return 'Organization';
  }
};

// ──────────────────────────────────────────────
// ツリーの静的骨格（Global / company / Personal）
// company.children は API データで動的に差し替える
// company の label は useLanguage() で動的生成するため関数化
// ──────────────────────────────────────────────
const buildNsTreeSkeleton = (companyLabel: string): NamespaceNode[] => [
  {
    key: 'global',
    label: 'Global',
    count: 0,
    icon: '🌐',
    children: [],
  },
  {
    key: 'company',
    label: companyLabel,
    count: 0,
    icon: '🏢',
    children: [],
  },
  {
    key: 'personal',
    label: 'Personal',
    count: 0,
    icon: '👤',
    children: [],
  },
];

// ──────────────────────────────────────────────
// organization_group フラットリスト → NamespaceNode ツリー変換
// ──────────────────────────────────────────────
const buildOrgTree = (groups: OrganizationGroupRow[]): NamespaceNode[] => {
  if (!Array.isArray(groups)) return [];
  // 重複排除: organization_group_cd で一意化（同じCDが複数回含まれていても1件として扱う）
  const uniqueGroups = Array.from(
    new Map(groups.map((g) => [g.organization_group_cd, g])).values()
  );
  const map = new Map<string, NamespaceNode>();
  const roots: NamespaceNode[] = [];

  for (const g of uniqueGroups) {
    map.set(g.organization_group_cd, {
      key: g.organization_group_cd,
      label: g.organization_group_name,
      count: 0,
      children: [],
    });
  }

  for (const g of uniqueGroups) {
    const node = map.get(g.organization_group_cd)!;
    if (g.parent_group_cd && map.has(g.parent_group_cd)) {
      map.get(g.parent_group_cd)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  // children が空配列のノードはリーフ扱い
  const stripEmpty = (nodes: NamespaceNode[]): NamespaceNode[] =>
    nodes.map((n) => ({
      ...n,
      children: n.children && n.children.length > 0 ? stripEmpty(n.children) : undefined,
    }));

  return stripEmpty(roots);
};

// ──────────────────────────────────────────────
// モック: ログイン中ユーザーの所属ノードキー
// 本番実装では認証APIから取得する
// ──────────────────────────────────────────────
// チーム代表者（解析チーム）としてログインしている想定
const CURRENT_USER_NS_KEY = 'rd-analysis'; // TODO:[MOCK] 認証APIから取得する実装に置き換える

// ツリーの最下層リーフキーを返すユーティリティ（最も深い depth のリーフを優先）
const findDeepestLeafKey = (nodes: NamespaceNode[]): string | null => {
  let bestKey: string | null = null;
  let bestDepth = -1;
  const traverse = (ns: NamespaceNode[], depth: number) => {
    for (const node of ns) {
      if (!node.children || node.children.length === 0) {
        if (depth > bestDepth) {
          bestDepth = depth;
          bestKey = node.key;
        }
      } else {
        traverse(node.children, depth + 1);
      }
    }
  };
  traverse(nodes, 0);
  return bestKey;
};

// 指定キーの祖先ノードキー集合を返すユーティリティ
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

// 指定キーのノードとその全子孫キーを収集する
const collectDescendantKeys = (targetKey: string, nodes: NamespaceNode[]): string[] => {
  const result: string[] = [];
  const collectAll = (ns: NamespaceNode[]) => {
    for (const node of ns) {
      result.push(node.key);
      if (node.children) collectAll(node.children);
    }
  };
  const findAndCollect = (ns: NamespaceNode[]): boolean => {
    for (const node of ns) {
      if (node.key === targetKey) {
        result.push(node.key);
        if (node.children) collectAll(node.children);
        return true;
      }
      if (node.children && findAndCollect(node.children)) return true;
    }
    return false;
  };
  findAndCollect(nodes);
  return result;
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



interface UncertaintyManagementProps {
  user?: User;
}

/**
 * 不確かさ基準管理メイン画面コンポーネント
 * 左ペイン（名前空間ツリー固定）＋右ペイン（タブ：用語管理 / 不確かさ基準管理）
 */
export default function UncertaintyManagement({ user }: UncertaintyManagementProps = {}) {
  const { t } = useLanguage();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchText, setSearchText] = useState('');
  const [evalFilter, setEvalFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'namespace' | 'prefix' | 'criteria'>('prefix');
  // 名前空間ツリー選択（左ペイン）→ NamespaceMain に連携
  const [selectedNsKey,    setSelectedNsKey]    = useState<string | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<UncertaintyTemplate | null>(null);
  const [isLatestVersion, setIsLatestVersion] = useState(true);

  // ── コンテキストメニュー状態
  const [ctxMenu, setCtxMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: NamespaceNode | null;
  }>({ visible: false, x: 0, y: 0, node: null });

  // ── チーム追加ダイアログ
  const [teamAddOpen,        setTeamAddOpen]        = useState(false);
  const [teamAddParentLabel, setTeamAddParentLabel] = useState('');

  // ── チーム編集ダイアログ
  const [teamEditOpen,    setTeamEditOpen]    = useState(false);
  const [teamEditLabel,   setTeamEditLabel]   = useState('');
  const [teamEditGroupCd,  setTeamEditGroupCd]  = useState<string | undefined>(undefined);

  const [teamEditMembers, setTeamEditMembers] = useState<string[]>([]);

  // ── organization_group 取得ステート
  const [orgGroups, setOrgGroups] = useState<OrganizationGroupRow[]>([]);

  // ── 動的ツリー（buildNsTreeSkeleton の company / personal children を API データで差し替え）
  const namespaceTree = useMemo((): NamespaceNode[] => {
    // Personal 配下には常にログインユーザーのユーザー名ノードを1件表示する。
    // DB の namespace レコード（scope_key = user.id）の有無に関わらず表示するため、
    // user Props から直接生成する。
    const userNode: NamespaceNode = {
      key: `personal-${user?.id ?? 'me'}`,
      label: user?.username ?? 'Personal',
      count: 0,
    };

    const skeleton = buildNsTreeSkeleton(t('namespaceTree.company'));
    return skeleton.map((n) => {
      if (n.key === 'company') return { ...n, children: buildOrgTree(orgGroups) };
      if (n.key === 'personal') return { ...n, children: [userNode] };
      return n;
    });
  }, [orgGroups, user?.id, user?.username, t]);

  // ── 初回マウント時に organization_group 一覧 & 個人名前空間を取得してツリーを構築
  useEffect(() => {
    getOrganizationGroups()
      .then((groups) => {
        const safeGroups = Array.isArray(groups) ? groups : [];
        setOrgGroups(safeGroups);
        // 組織ノードの最下層リーフを初期選択状態にする
        const orgNodes = buildOrgTree(safeGroups);
        const leafKey = findDeepestLeafKey(orgNodes);
        if (leafKey) {
          setSelectedNsKey(leafKey);
        }
      })
      .catch(() => {
        // 取得失敗時は空ツリーのまま表示を継続
      });

  }, [user?.id]);

  // ── mousedown でコンテキストメニューを閉じる
  // visible が既に false の場合は同じ参照を返して不要な再レンダーを防ぐ
  useEffect(() => {
    const close = () => setCtxMenu((s) => s.visible ? { ...s, visible: false } : s);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  const [templates, setTemplates] = useState<UncertaintyTemplate[]>([]);

  // 初回マウント時にDBから不確かさ基準一覧を取得
  useEffect(() => {
    fetchUncertaintyCriteriaList()
      .then((data) => setTemplates(data))
      .catch((err) => console.error('[UncertaintyManagement] 一覧取得エラー:', err));
  }, []);

  /**
   * バージョン文字列を数値配列に変換（例: "v2.1" → [2, 1]）
   */
  const parseVersion = (v: string): number[] =>
    v.replace(/^v/i, '').split('.').map(Number);

  /**
   * 対象テンプレートが同名基準の中で最新バージョンかどうかを判定
   */
  const checkIsLatestVersion = (template: UncertaintyTemplate): boolean => {
    const sameNameTemplates = templates.filter((t) => t.name === template.name);
    const targetVer = parseVersion(template.version);
    return sameNameTemplates.every((t) => {
      const otherVer = parseVersion(t.version);
      for (let i = 0; i < Math.max(targetVer.length, otherVer.length); i++) {
        const a = targetVer[i] ?? 0;
        const b = otherVer[i] ?? 0;
        if (a > b) return true;
        if (a < b) return false;
      }
      return true;
    });
  };

  const handleOpenDetail = (template: UncertaintyTemplate) => {
    setSelectedTemplate(template);
    setIsLatestVersion(checkIsLatestVersion(template));
    setDetailModalOpen(true);
  };

  // selectedNsKey から API に渡す実際の scopeKey を算出
  // 個人ノードは "personal-{userId}" 形式 → DB の scope_key はユーザーID部分のみ
  const effectiveNsKey = useMemo(() => {
    if (!selectedNsKey) return null;
    if (selectedNsKey.startsWith('personal-')) {
      return selectedNsKey.replace(/^personal-/, '');
    }
    return selectedNsKey;
  }, [selectedNsKey]);

  // Global または Personal 配下のノードが選択中かどうか
  const isGlobalOrPersonalSelected = useMemo(() => {
    if (!selectedNsKey) return false;
    const rootKey = getRootKey(selectedNsKey, namespaceTree);
    return rootKey === 'global' || rootKey === 'personal';
  }, [selectedNsKey, namespaceTree]);

  // グローバルノード自体（'global' / 'ns-maiml' / 'ns-xsi'）が選択中かどうか
  // → 右ペイン全体を GlobalNamespaceView に切り替えるために使用
  const isGlobalNodeSelected = useMemo(() => {
    return selectedNsKey === 'global' || selectedNsKey === 'ns-maiml' || selectedNsKey === 'ns-xsi';
  }, [selectedNsKey]);

  // PrefixManagement に渡す orgGroupCds をメモ化する。
  // インライン IIFE のままだと親が再レンダーするたびに新しい配列参照が生成され、
  // PrefixManagement 内の useEffect([selectedNsKey, orgGroupCds]) が誤発火して
  // 編集状態（editingId）がリセットされてしまう問題を防ぐ。
  const filteredOrgGroupCds = useMemo(() => {
    const allCds = orgGroups.map((g) => g.organization_group_cd);
    if (!selectedNsKey || selectedNsKey === 'company') return allCds;
    const STATIC_KEYS = new Set(['global', 'ns-maiml', 'ns-xsi', 'personal']);
    if (STATIC_KEYS.has(selectedNsKey)) return allCds;
    // org group CD 選択時: 選択ノード＋子孫 CDs のみ渡す
    const companyNode = namespaceTree.find((n) => n.key === 'company');
    const descendants = companyNode
      ? collectDescendantKeys(selectedNsKey, companyNode.children ?? [])
      : [];
    const filtered = descendants.filter((k) => allCds.includes(k));
    return filtered.length > 0 ? filtered : allCds;
  }, [orgGroups, selectedNsKey, namespaceTree]);

  // ── チームノードのタイトル（companyDepth === 3 のみ右クリックメニューを有効化）
  const renderTreeTitle = useCallback((node: NamespaceNode, companyDepth: number) => {
    // Global/Personal が選択されていない時のみ CURRENT_USER_NS_KEY を薄い青背景で強調
    const isCurrentUserNode = !isGlobalOrPersonalSelected && node.key === CURRENT_USER_NS_KEY;
    const isTeam = companyDepth === 3;

    const handleContextMenu = isTeam
      ? (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, node });
        }
      : undefined;

    return (
      <span
        onContextMenu={handleContextMenu}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          cursor: isTeam ? 'context-menu' : undefined,
        }}
      >
        <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
          {node.label}
        </span>
      </span>
    );
  }, [isGlobalOrPersonalSelected]);

  // ── companyDepth を計算してツリーデータを構築
  const toAntTree = useCallback((nodes: NamespaceNode[], companyDepth = 0): object[] =>
    nodes.map((n) => {
      const selfDepth = companyDepth > 0
        ? companyDepth
        : n.key === 'company'
          ? 1
          : 0;
      return {
        key:      n.key,
        title:    renderTreeTitle(n, selfDepth),
        children: n.children ? toAntTree(n.children, selfDepth > 0 ? selfDepth + 1 : 0) : undefined,
      };
    }), [renderTreeTitle]);

  // ──── 名前空間ツリーデータ（APIから取得した全ノードをそのまま表示）
  const treeData = useMemo(() => {
    return toAntTree(namespaceTree);
  }, [toAntTree, namespaceTree]);

  const TAB_LABELS: { key: 'namespace' | 'prefix' | 'criteria'; label: string }[] = [
    { key: 'prefix',    label: t('uncertainty.management.tabPrefix') },
    { key: 'namespace', label: t('uncertainty.management.tabNamespace') },
    { key: 'criteria',  label: t('uncertainty.management.tabCriteria') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── 左ペイン：名前空間ツリー（固定） ── */}
        <div style={{
          width: '22%', minWidth: 240, maxWidth: 360,
          borderRight: '1px solid #e8e8e8',
          display: 'flex', flexDirection: 'column', overflow: 'auto',
        }}>
          <div style={{ background: '#fafafa', minWidth: 'max-content', flex: 1, padding: '12px 12px 8px' }}>
          <Tree
            key={orgGroups.map((g) => g.organization_group_cd).join(',') || 'empty'}
            defaultExpandAll
            treeData={treeData}
            selectedKeys={selectedNsKey ? [selectedNsKey] : []}
            style={{ background: 'transparent' }}
            onSelect={(keys) => {
              const key = (keys[0] as string) ?? null;
              setSelectedNsKey(key);
            }}
          />

          </div>
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
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <li
                style={{ padding: '6px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  setTeamAddParentLabel(ctxMenu.node!.label);
                  setTeamAddOpen(true);
                  setCtxMenu((s) => ({ ...s, visible: false }));
                }}
              >
                <PlusOutlined style={{ fontSize: 12, color: '#52c41a' }} />
                {t('uncertainty.management.ctxMenuAddTeam')}
              </li>
              <li
                style={{ padding: '6px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  setTeamEditLabel(ctxMenu.node!.label);
                  setTeamEditGroupCd(ctxMenu.node!.key ?? undefined);


                  setTeamEditMembers([]);
                  setTeamEditOpen(true);
                  setCtxMenu((s) => ({ ...s, visible: false }));
                }}
              >
                <EditOutlined style={{ fontSize: 12, color: '#1677ff' }} />
                {t('common.edit')}
              </li>
            </ul>
          )}
        </div>

        {/* ── 右ペイン ── */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#f5f7fa', display: 'flex', flexDirection: 'column' }}>

          {isGlobalNodeSelected ? (
            /* グローバルノード選択時: タブなし、GlobalNamespaceView のみ表示（ProviderMenu と同一） */
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
              <GlobalNamespaceView viewOnly={true} />
            </div>
          ) : (
          <>
          {/* タブバー */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e8e8e8',
            background: '#fff',
            padding: '0 16px',
            flexShrink: 0,
          }}>
          {TAB_LABELS.map((tab) => (
              <div
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? '#1677ff' : '#595959',
                  borderBottom: activeTab === tab.key ? '2px solid #1677ff' : '2px solid transparent',
                  fontSize: 14,
                  userSelect: 'none',
                }}
              >
                {tab.label}
              </div>
            ))}
          </div>

          {/* タブコンテンツ */}
          <div style={{ flex: 1, overflow: 'hidden' }}>

            {/* 用語管理タブ：NamespaceMain（hideTree=true で左ツリー非表示、選択キーを外部連携） */}
            <div style={{ display: activeTab === 'namespace' ? 'flex' : 'none', height: '100%', overflow: 'hidden' }}>
              <NamespaceMain
                hideTree
                externalSelectedNsKey={selectedNsKey}
              />
            </div>

            {/* Prefix管理タブ */}
            {/* filteredOrgGroupCds: 選択ノード配下（自身含む）の CDs のみに絞る。
                未選択 or 組織ルートノード選択時は全 CDs を渡す。
                useMemo でメモ化済み（インラインIIFEによる毎回新参照生成を防ぐ） */}
            <div style={{ display: activeTab === 'prefix' ? 'flex' : 'none', height: '100%', overflow: 'hidden' }}>
              <PrefixManagement
                showShareButton={true}
                selectedNsKey={effectiveNsKey}
                orgGroupCds={filteredOrgGroupCds}
              />
            </div>

              {/* 不確かさ基準管理タブ：一覧のみ */}
            <div style={{ display: activeTab === 'criteria' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* ツールバー */}
              <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid #e8e8e8',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                gap: 8,
              }}>
                {/* 左側：フィルタ */}
                <Space size={8} wrap>
                  <Select
                    size="small"
                    style={{ width: 150 }}
                    placeholder={t('uncertainty.management.filterEvalMethodAll')}
                    value={evalFilter || undefined}
                    onChange={(v) => setEvalFilter(v ?? '')}
                    allowClear
                    options={[
                      { value: 'quantitative', label: t('uncertainty.listTable.evalQuantitative') },
                      { value: 'qualitative', label: t('uncertainty.listTable.evalQualitative') },
                    ]}
                  />
                  <Select
                    size="small"
                    style={{ width: 130 }}
                    placeholder={t('uncertainty.management.filterStatusAll')}
                    value={statusFilter || undefined}
                    onChange={(v) => setStatusFilter(v ?? '')}
                    allowClear
                    options={[
                      { value: 'active', label: t('uncertainty.listTable.statusActive') },
                      { value: 'deprecated', label: t('uncertainty.listTable.statusDeprecated') },
                    ]}
                  />
                  <Input
                    size="small"
                    prefix={<SearchOutlined />}
                    placeholder={t('uncertainty.management.searchPlaceholder')}
                    style={{ width: 220 }}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                  />
                </Space>
                {/* 右側：操作ボタン */}
                <Space>
                  <Button icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)}>
                    {t('uncertainty.management.btnImport')}
                  </Button>
                  <Button
                    icon={<ExportOutlined />}
                    disabled={selectedIds.length === 0}
                    onClick={() => setExportModalOpen(true)}
                  >
                    {t('uncertainty.management.btnExport')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalOpen(true)}
                  >
                    {t('uncertainty.management.btnCreateNew')}
                  </Button>
                </Space>
              </div>
              {/* 一覧テーブル */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <UncertaintyListTable
                  templates={templates}
                  currentScopeLabel={t('uncertainty.management.scopeAll')}
                  onOpenDetail={handleOpenDetail}
                  onSelectionChange={setSelectedIds}
                  searchText={searchText}
                  evalFilter={evalFilter}
                  statusFilter={statusFilter}
                />
              </div>
            </div>

          </div>
          </>
          )}
        </div>
      </div>

      {/* チーム追加ダイアログ */}
      <TeamAddDialog
        open={teamAddOpen}
        onClose={() => setTeamAddOpen(false)}
        onCreated={(_groupCd, groupName) => {
          message.success(t('uncertainty.management.toastTeamCreated', { name: groupName, count: '0' }));
          setTeamAddOpen(false);
        }}
      />


      {/* チーム編集ダイアログ */}
      <TeamEditDialog
        open={teamEditOpen}
        teamLabel={teamEditLabel}
        teamGroupCd={teamEditGroupCd}
        onClose={() => setTeamEditOpen(false)}
        onSaved={(members) => {
          message.success(t('uncertainty.management.toastTeamUpdated', { name: teamEditLabel, count: String(members.length) }));
          setTeamEditMembers(members);
        }}
      />


      {/* モーダル群 */}
      <UncertaintyDetailModal
        open={detailModalOpen}
        template={selectedTemplate}
        isLatestVersion={isLatestVersion}
        allCriteria={templates}
        onClose={() => setDetailModalOpen(false)}
        onSaved={() => {
          // 保存後に不確かさ基準一覧を再取得して画面を最新化する
          fetchUncertaintyCriteriaList()
            .then((data) => setTemplates(data))
            .catch((err) => console.error('[UncertaintyManagement] 一覧再取得エラー:', err));
        }}
      />
      <UncertaintyCreateModal
        open={createModalOpen}
        allCriteria={templates}
        onClose={() => setCreateModalOpen(false)}
        onSaved={() => {
          setCreateModalOpen(false);
          fetchUncertaintyCriteriaList()
            .then((data) => setTemplates(data))
            .catch((err) => console.error('[UncertaintyManagement] 一覧再取得エラー:', err));
        }}
      />
      <UncertaintyImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
      <UncertaintyExportModal
        open={exportModalOpen}
        selectedCount={selectedIds.length}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}
