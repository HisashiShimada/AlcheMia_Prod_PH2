'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import namespaceTreeRaw from '../../../mock/namespace/uncertainty-scope.json';
import TeamAddDialog from '../namespace/TeamAddDialog';
import TeamEditDialog from '../namespace/TeamEditDialog';

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

// ──────────────────────────────────────────────
// TODO:[MOCK] ログイン中ユーザーの所属ノードキー
// バックエンド実装時に削除し、認証APIから取得した値に置き換えること
// ──────────────────────────────────────────────
// チーム代表者（解析チーム）としてログインしている想定
const CURRENT_USER_NS_KEY = 'rd-analysis'; // TODO:[MOCK] 認証APIから取得する実装に置き換える

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

// ログインユーザーの所属パスのみを残してツリーを剪定する
// - global: 常に表示
// - company/部門/チーム: 自分のチームと祖先のみ表示
// - personal: 自分のチーム (CURRENT_USER_NS_KEY) のメンバーのみ表示
const filterTreeForUser = (nodes: NamespaceNode[], userNsKey: string): NamespaceNode[] => {
  const ancestorKeys = new Set<string>(getAncestorKeys(userNsKey, nodes) ?? []);

  const filterNodes = (ns: NamespaceNode[], parentKey?: string): NamespaceNode[] =>
    ns
      .filter((n) => {
        // global は常に表示
        if (n.key === 'global') return true;
        // personal ノード自体は表示（中身はフィルタ）
        if (n.key === 'personal') return true;
        // company ルートは表示
        if (n.key === 'company') return true;
        // 自分のチームノードは表示
        if (n.key === userNsKey) return true;
        // 祖先ノードは表示
        if (ancestorKeys.has(n.key)) return true;
        // personal の直下ユーザーノードは teamKey が一致する場合のみ表示
        if (parentKey === 'personal') {
          return (n as any).teamKey === userNsKey;
        }
        return false;
      })
      .map((n) => ({
        ...n,
        children: n.children ? filterNodes(n.children, n.key) : undefined,
      }));

  return filterNodes(nodes);
};


/**
 * 不確かさ基準管理メイン画面コンポーネント
 * 左ペイン（名前空間ツリー固定）＋右ペイン（タブ：用語管理 / 不確かさ基準管理）
 */
export default function UncertaintyManagement() {
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
  const [teamEditUnitId,  setTeamEditUnitId]  = useState<string | undefined>(undefined);
  const [teamEditMembers, setTeamEditMembers] = useState<string[]>([]);

  // ── mousedown でコンテキストメニューを閉じる
  useEffect(() => {
    const close = () => setCtxMenu((s) => ({ ...s, visible: false }));
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

  // Global または Personal 配下のノードが選択中かどうか
  const isGlobalOrPersonalSelected = useMemo(() => {
    if (!selectedNsKey) return false;
    const rootKey = getRootKey(selectedNsKey, namespaceTreeRaw as NamespaceNode[]);
    return rootKey === 'global' || rootKey === 'personal';
  }, [selectedNsKey]);

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
          display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0,
          cursor: isTeam ? 'context-menu' : undefined,
        }}
      >
        <span style={{ flex: 1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.label}
        </span>
        {node.count > 0 && (
          <span style={{ color: '#8c8c8c', fontSize: 12, flexShrink: 0 }}>{node.count}</span>
        )}
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

  // ──── 名前空間ツリーデータ（ユーザーフィルタ付き）
  const treeData = useMemo(() => {
    const allNodes = namespaceTreeRaw as NamespaceNode[];
    // ログインユーザーの所属パスのみに絞り込む
    const userFilteredNodes = filterTreeForUser(allNodes, CURRENT_USER_NS_KEY);
    return toAntTree(userFilteredNodes);
  }, [toAntTree]);

  const { t } = useLanguage();

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
          background: '#fafafa', borderRight: '1px solid #e8e8e8',
          display: 'flex', flexDirection: 'column', padding: '12px 12px 8px', overflowY: 'auto',
        }}>
          <Tree
            key={treeData.map((n: any) => n.key).join(',')}
            blockNode
            defaultExpandAll
            treeData={treeData}
            selectedKeys={selectedNsKey ? [selectedNsKey] : []}
            style={{ background: 'transparent' }}
            onSelect={(keys) => {
              const key = (keys[0] as string) ?? null;
              setSelectedNsKey(key);
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
                  setTeamEditUnitId((ctxMenu.node as any).departmentUnitId ?? ctxMenu.node!.key ?? undefined);
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
            <div style={{ display: activeTab === 'prefix' ? 'flex' : 'none', height: '100%', overflow: 'hidden' }}>
              <PrefixManagement showShareButton={true} selectedNsKey={selectedNsKey} />
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
        </div>
      </div>

      {/* チーム追加ダイアログ */}
      <TeamAddDialog
        open={teamAddOpen}
        parentTeamLabel={teamAddParentLabel}
        onClose={() => setTeamAddOpen(false)}
        onCreated={(teamName, members) => {
          message.success(t('uncertainty.management.toastTeamCreated', { name: teamName, count: String(members.length) }));
          setTeamAddOpen(false);
        }}
      />

      {/* チーム編集ダイアログ */}
      <TeamEditDialog
        open={teamEditOpen}
        teamLabel={teamEditLabel}
        teamUnitId={teamEditUnitId}
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
