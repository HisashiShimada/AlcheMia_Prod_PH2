'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { App, Button, Input, Select, Space, Tree } from 'antd';
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
import ShareScopeModal from '../namespace/ShareScopeModal';
import type { ScopeNode, ShareTarget, ShareSourceRole } from '@/types/namespace';
import { getOrganizationGroups, sharePrefixes } from '@/services/namespaceApiService';
import { getOrgUsersForGroups, getGroupMembers } from '@/services/organizationGroupApiService';
import GroupAddDialog from '../group/GroupAddDialog';
import GroupEditDialog from '../group/GroupEditDialog';
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
  /** タブ4（名前空間管理）がアクティブになった時刻（ms）
   * ExperimentAdminMenu からタブ切り替え時に更新される。
   * この値の変化をトリガーとして組織ツリーを再取得する。
   * undefined の場合はスキップ（初回マウント時は user?.id の useEffect に任せる）。
   */
  tabActivatedAt?: number;
}

/**
 * 不確かさ基準管理メイン画面コンポーネント
 * 左ペイン（名前空間ツリー固定）＋右ペイン（タブ：用語管理 / 不確かさ基準管理）
 */
export default function UncertaintyManagement({ user, tabActivatedAt }: UncertaintyManagementProps = {}) {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchText, setSearchText] = useState('');
  const [evalFilter, setEvalFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'namespace' | 'prefix' | 'criteria'>('prefix');
  // 名前空間ツリー選択（左ペイン）→ NamespaceMain に連携
  const [selectedNsKey,    setSelectedNsKey]    = useState<string | null>(null);
  // 用語管理タブがアクティブになったタイムスタンプ。用語管理タブへ切り替えた際に Date.now() をセットし、
  // NamespaceMain の terms と dbPrefixes を強制再取得させるために使用する。
  const [namespaceTabActivatedAt, setNamespaceTabActivatedAt] = useState<number | undefined>(undefined);
  // Prefix管理タブがアクティブになったタイムスタンプ。Prefix管理タブへ切り替えた際に Date.now() をセットし、
  // PrefixManagement の Prefix 一覧を強制再取得させるために使用する。
  const [prefixTabActivatedAt, setPrefixTabActivatedAt] = useState<number | undefined>(undefined);
  // 不確かさ基準管理タブがアクティブになったタイムスタンプ。タブへ切り替えた際に Date.now() をセットし、
  // 不確かさ基準一覧を強制再取得させるために使用する。
  const [criteriaTabActivatedAt, setCriteriaTabActivatedAt] = useState<number | undefined>(undefined);
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

  // ── グループ追加ダイアログ
  const [groupAddOpen,        setGroupAddOpen]        = useState(false);
  const [groupAddParentLabel, setGroupAddParentLabel] = useState('');

  // ── グループ編集ダイアログ
  const [groupEditOpen,    setGroupEditOpen]    = useState(false);
  const [groupEditLabel,   setGroupEditLabel]   = useState('');
  const [groupEditGroupCd, setGroupEditGroupCd] = useState<string | undefined>(undefined);

  const [groupEditMembers, setGroupEditMembers] = useState<string[]>([]);

  // ── Prefix 共有モーダル
  const [shareScopeOpen,    setShareScopeOpen]    = useState(false);
  const [selectedPrefixKeys, setSelectedPrefixKeys] = useState<string[]>([]);
  const [shareLoading,      setShareLoading]      = useState(false);

  // ── organization_group 取得ステート
  const [orgGroups, setOrgGroups] = useState<OrganizationGroupRow[]>([]);

  // ── ログインユーザーが代表者（chief_user_id）であるグループCDの集合
  const [chiefGroupCds, setChiefGroupCds] = useState<Set<string>>(new Set());

  // ── system_admin 用: 組織内の全ユーザー一覧（Personal ノード表示用）
  const [allOrgUsers, setAllOrgUsers] = useState<Array<{ userId: string; userName: string }>>([]);

  // ── 個人スコープ選択時の共有先候補グループ（selectedNsKey が personal-{userId} のときに取得）
  const [targetUserGroups, setTargetUserGroups] = useState<OrganizationGroupRow[]>([]);

  // ログインユーザーがシステム管理者かどうか
  // localStorage.userInfo.permissions に functionId '020000'（システム管理者メニュー）が含まれるかで判定する。
  // functionId '020000' はシステム内固定の機能CD。
  // roleCd はユーザーが変更可能なため判定には使用しない。
  // ※ namespaceTree useMemo より前に宣言が必要なためここに配置する
  const isSysAdmin = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem('userInfo');
      if (!raw) return false;
      const info = JSON.parse(raw) as { permissions?: Array<{ functionId: string }> };
      return (info.permissions ?? []).some((p) => p.functionId === '020000');
    } catch {
      return false;
    }
  }, []);

  // ── 動的ツリー（buildNsTreeSkeleton の company / personal children を API データで差し替え）
  const namespaceTree = useMemo((): NamespaceNode[] => {
    // Personal 配下の children を決定する:
    // - system_admin: 組織内の全ユーザーを表示（allOrgUsers に全ユーザーがセット済み）
    // - グループ代表者: 代表グループのメンバーを表示（allOrgUsers にメンバーがセット済み）
    // - それ以外: ログインユーザー自身のみ表示
    const personalChildren: NamespaceNode[] =
      allOrgUsers.length > 0
        ? allOrgUsers.map((u) => ({
            key: `personal-${u.userId}`,
            label: u.userName,
            count: 0,
          }))
        : [{ key: `personal-${user?.id ?? 'me'}`, label: user?.username ?? 'Personal', count: 0 }];

    const skeleton = buildNsTreeSkeleton(t('namespaceTree.company'));
    return skeleton.map((n) => {
      if (n.key === 'company') return { ...n, children: buildOrgTree(orgGroups) };
      if (n.key === 'personal') return { ...n, children: personalChildren };
      return n;
    });
  }, [orgGroups, user?.id, user?.username, t, allOrgUsers]);

  // ── 初回マウント時に organization_group 一覧 & 個人名前空間を取得してツリーを構築
  // 代表グループ（chiefUserId フィルタ）と所属グループ（memberOf）を並列取得してマージする
  useEffect(() => {
    // system_admin の場合: all=true で全グループを一括取得し、全CDを chiefGroupCds に登録（全グループ編集可扱い）
    // system_admin 判定: localStorage.userInfo.permissions に functionId '020000' が含まれるかで確認する。
    // functionId '020000' はシステム内固定の機能CD（システム管理者メニュー）。
    // roleCd はユーザーが変更可能なため判定には使用しない。
    const isAdminUser = (() => {
      try {
        const raw = localStorage.getItem('userInfo');
        if (!raw) return false;
        const info = JSON.parse(raw) as { permissions?: Array<{ functionId: string }> };
        return (info.permissions ?? []).some((p) => p.functionId === '020000');
      } catch { return false; }
    })();

    if (isAdminUser) {
      // system_admin: 全グループと全ユーザーを並列取得
      Promise.all([
        getOrganizationGroups(undefined, { all: true }),
        getOrgUsersForGroups(),
      ])
        .then(([allGroups, orgUsers]) => {
          const safeGroups = Array.isArray(allGroups) ? allGroups : [];
          // 全グループを chiefGroupCds に登録 → 全グループで編集可能と判定される
          setChiefGroupCds(new Set(safeGroups.map((g) => g.organization_group_cd)));
          setOrgGroups(safeGroups);
          // 全ユーザーを Personal ノード用にセット
          setAllOrgUsers(orgUsers);
          // 最下層リーフを初期選択にする
          const orgNodes = buildOrgTree(safeGroups);
          const leafKey = findDeepestLeafKey(orgNodes);
          if (leafKey) setSelectedNsKey(leafKey);
        })
        .catch(() => {
          // 取得失敗時は空ツリーのまま表示を継続
        });
      return;
    }

    // system_admin 以外: 既存ロジック（代表グループ + 所属グループを並列取得してマージ）
    Promise.all([
      getOrganizationGroups(),                               // ① chiefUserId フィルタ（代表グループ）
      getOrganizationGroups(undefined, { memberOf: true }), // ② 所属グループ＋祖先グループ
    ])
      .then(([chiefGroups, memberGroups]) => {
        // 代表グループCDを Set として保存（編集権限判定に使用）
        const chiefCds = new Set(chiefGroups.map((g) => g.organization_group_cd));
        setChiefGroupCds(chiefCds);

        // 重複を organization_group_cd で除去してマージ
        const mergedMap = new Map<string, OrganizationGroupRow>();
        [...chiefGroups, ...memberGroups].forEach((g) =>
          mergedMap.set(g.organization_group_cd, g)
        );
        const mergedGroups = Array.from(mergedMap.values());
        const safeGroups = Array.isArray(mergedGroups) ? mergedGroups : [];

        setOrgGroups(safeGroups);
        // 組織ノードの最下層リーフを初期選択状態にする
        const orgNodes = buildOrgTree(safeGroups);
        const leafKey = findDeepestLeafKey(orgNodes);
        if (leafKey) {
          setSelectedNsKey(leafKey);
        }

        // 代表グループがある場合: 代表グループのメンバーを Personal ノードに表示
        if (chiefCds.size > 0) {
          Promise.all([...chiefCds].map((cd) => getGroupMembers(cd)))
            .then((memberLists) => {
              const allMembers = memberLists.flat();
              // userId で重複除去
              const unique = Array.from(
                new Map(allMembers.map((u) => [u.userId, u])).values()
              );
              setAllOrgUsers(unique);
            })
            .catch(() => {
              // 取得失敗時は Personal ノードにログインユーザーのみ表示（デフォルト動作）
            });
        }
      })
      .catch(() => {
        // 取得失敗時は空ツリーのまま表示を継続
      });

  }, [user?.id]);

  // ── タブ4（名前空間管理）がアクティブになるたびに組織ツリーを再取得する
  // tabActivatedAt は ExperimentAdminMenu でタブ4への切り替え時に Date.now() で更新される。
  // undefined の場合はスキップ（初回マウント時は上の useEffect([user?.id]) に任せる）。
  // selectedNsKey（現在の選択ノード）はリセットせず、orgGroups のみ更新する。
  useEffect(() => {
    if (tabActivatedAt === undefined) return;

    const isAdminUser = (() => {
      try {
        const raw = localStorage.getItem('userInfo');
        if (!raw) return false;
        const info = JSON.parse(raw) as { permissions?: Array<{ functionId: string }> };
        return (info.permissions ?? []).some((p) => p.functionId === '020000');
      } catch { return false; }
    })();

    if (isAdminUser) {
      Promise.all([
        getOrganizationGroups(undefined, { all: true }),
        getOrgUsersForGroups(),
      ])
        .then(([allGroups, orgUsers]) => {
          const safeGroups = Array.isArray(allGroups) ? allGroups : [];
          setChiefGroupCds(new Set(safeGroups.map((g) => g.organization_group_cd)));
          setOrgGroups(safeGroups);
          setAllOrgUsers(orgUsers);
          // selectedNsKey はリセットしない
        })
        .catch(() => {
          // 取得失敗時は現在のツリーを維持
        });
      return;
    }

    Promise.all([
      getOrganizationGroups(),
      getOrganizationGroups(undefined, { memberOf: true }),
    ])
      .then(([chiefGroups, memberGroups]) => {
        const chiefCds = new Set(chiefGroups.map((g) => g.organization_group_cd));
        setChiefGroupCds(chiefCds);

        const mergedMap = new Map<string, OrganizationGroupRow>();
        [...chiefGroups, ...memberGroups].forEach((g) =>
          mergedMap.set(g.organization_group_cd, g)
        );
        const mergedGroups = Array.from(mergedMap.values());
        const safeGroups = Array.isArray(mergedGroups) ? mergedGroups : [];

        setOrgGroups(safeGroups);
        // selectedNsKey はリセットしない

        if (chiefCds.size > 0) {
          Promise.all([...chiefCds].map((cd) => getGroupMembers(cd)))
            .then((memberLists) => {
              const allMembers = memberLists.flat();
              const unique = Array.from(
                new Map(allMembers.map((u) => [u.userId, u])).values()
              );
              setAllOrgUsers(unique);
            })
            .catch(() => {
              // 取得失敗時は既存の allOrgUsers を維持
            });
        }
      })
      .catch(() => {
        // 取得失敗時は現在のツリーを維持
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActivatedAt]);

  // ── mousedown でコンテキストメニューを閉じる
  // visible が既に false の場合は同じ参照を返して不要な再レンダーを防ぐ
  useEffect(() => {
    const close = () => setCtxMenu((s) => s.visible ? { ...s, visible: false } : s);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  // ── 個人スコープ（personal-{userId}）選択時: そのユーザーの所属グループ＋祖先を取得
  // 共有ダイアログに表示する共有先候補として使用する
  useEffect(() => {
    if (!selectedNsKey?.startsWith('personal-')) {
      setTargetUserGroups([]);
      return;
    }
    const targetUserId = selectedNsKey.replace(/^personal-/, '');
    getOrganizationGroups(undefined, { memberOfUser: targetUserId })
      .then((groups) => setTargetUserGroups(Array.isArray(groups) ? groups : []))
      .catch(() => setTargetUserGroups([]));
  }, [selectedNsKey]);

  const [templates, setTemplates] = useState<UncertaintyTemplate[]>([]);

  // ──────────────────────────────────────────────
  // selectedNsKey から fetchUncertaintyCriteriaList に渡す scopeKey を解決する
  //
  // - 'global' / 'ns-maiml' / 'ns-xsi' / 'company' / 'personal' → undefined（全件）
  // - 'personal-{userId}' → userId を scopeKey として使用
  // - その他（organization_group_cd） → そのまま scopeKey として使用
  // ──────────────────────────────────────────────
  const FULL_SCOPE_KEYS = new Set(['global', 'ns-maiml', 'ns-xsi', 'company', 'personal']);

  const resolveScopeKey = useCallback((nsKey: string | null): string | undefined => {
    if (!nsKey) return undefined;
    if (FULL_SCOPE_KEYS.has(nsKey)) return undefined;
    if (nsKey.startsWith('personal-')) {
      const userId = nsKey.replace(/^personal-/, '');
      return userId || undefined;
    }
    return nsKey;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // selectedNsKey の変化に連動して不確かさ基準一覧を再取得する
  useEffect(() => {
    let cancelled = false;
    const scopeKey = resolveScopeKey(selectedNsKey);
    fetchUncertaintyCriteriaList(scopeKey)
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch((err) => {
        if (!cancelled) console.error('[UncertaintyManagement] 一覧取得エラー:', err);
      });
    return () => { cancelled = true; };
  }, [selectedNsKey, resolveScopeKey]);

  // ──── criteriaTabActivatedAt 変化時に不確かさ基準一覧を強制再取得
  // 外部タブから切り替えた際にタイムスタンプを更新することで最新データを反映させる。
  // undefined の場合はスキップ（初回マウント時は上の useEffect に任せる）。
  useEffect(() => {
    if (criteriaTabActivatedAt === undefined) return;
    let cancelled = false;
    const scopeKey = resolveScopeKey(selectedNsKey);
    fetchUncertaintyCriteriaList(scopeKey)
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch((err) => {
        if (!cancelled) console.error('[UncertaintyManagement] 一覧取得エラー:', err);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteriaTabActivatedAt]);

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

  // selectedNsKey から PrefixManagement に渡すキーを算出
  // personal-{userId} 形式のまま渡す（PrefixManagement 側で personal- 判定を行う）
  const effectiveNsKey = selectedNsKey;

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

  // 「組織」ノード（company 配下）が選択中かどうかを判定
  // rootKey の種類: 'global' / 'company' / 'personal' / null
  // 'company' は画面上「組織」と表示される（t('namespaceTree.company') = "組織"）
  const isCompanyNodeSelected = useMemo(() => {
    if (!selectedNsKey) return false;
    const rootKey = getRootKey(selectedNsKey, namespaceTree);
    return rootKey === 'company';
  }, [selectedNsKey, namespaceTree]);

  // orgグループノード（company 配下のグループノード）が選択中かどうか
  // 固定キーと personal- プレフィックスを除外することで判定する
  const isOrgGroupNodeSelected = useMemo(() => {
    if (!selectedNsKey) return false;
    if (['global', 'ns-maiml', 'ns-xsi', 'company', 'personal'].includes(selectedNsKey)) return false;
    if (selectedNsKey.startsWith('personal-')) return false;
    return true;
  }, [selectedNsKey]);

  // 選択中の orgグループノードに対して、ログインユーザーが代表者（chief_user_id）かどうか
  const isRepresentativeOfSelected = useMemo(() => {
    if (!selectedNsKey) return false;
    return chiefGroupCds.has(selectedNsKey);
  }, [selectedNsKey, chiefGroupCds]);

  // 実効的な閲覧専用フラグ
  // - personal-{userId} ノード選択時:
  //     ログインユーザー自身のノード → 編集可能
  //     他ユーザーのノード → 閲覧専用（共有機能のみ使用可）
  // - sys_admin の場合:
  //     グループノード・組織ノード選択時は編集可能
  // - sys_admin 以外:
  //     'company' ルートノード選択時 → 全ユーザー閲覧専用
  //     orgグループノード選択時 → 代表者のみ編集可、一般メンバーは閲覧専用
  const isViewOnlyForCompany = useMemo(() => {
    // personal- ノード選択時: ログインユーザー自身以外は閲覧専用
    if ((selectedNsKey ?? '').startsWith('personal-')) {
      const myKey = `personal-${user?.id ?? ''}`;
      return selectedNsKey !== myKey;
    }
    if (isSysAdmin) return false; // sys_admin: グループ・組織ノードは編集可
    // sys_admin 以外の既存ロジック
    if (selectedNsKey === 'company') return true;
    if (isOrgGroupNodeSelected) return !isRepresentativeOfSelected;
    return false;
  }, [isSysAdmin, selectedNsKey, user?.id, isOrgGroupNodeSelected, isRepresentativeOfSelected]);

  // PrefixManagement に渡す orgGroupCds をメモ化する。
  // インライン IIFE のままだと親が再レンダーするたびに新しい配列参照が生成され、
  // PrefixManagement 内の useEffect([selectedNsKey, orgGroupCds]) が誤発火して
  // 編集状態（editingId）がリセットされてしまう問題を防ぐ。
  const filteredOrgGroupCds = useMemo(() => {
    const allCds = orgGroups.map((g) => g.organization_group_cd);
    if (!selectedNsKey || selectedNsKey === 'company') return allCds;
    const STATIC_KEYS = new Set(['global', 'ns-maiml', 'ns-xsi', 'personal']);
    if (STATIC_KEYS.has(selectedNsKey)) return allCds;
    // personal-{userId} ノードは org group cd ではないため空配列を返す。
    // allCds（全グループCD）を返すと PrefixManagement の orgGroupCds 変化で
    // useEffect が誤発火し、他スコープの Prefix が混入するため空配列とする。
    if (selectedNsKey.startsWith('personal-')) return [];
    // org group CD 選択時: 選択ノード＋子孫 CDs のみ渡す
    const companyNode = namespaceTree.find((n) => n.key === 'company');
    const descendants = companyNode
      ? collectDescendantKeys(selectedNsKey, companyNode.children ?? [])
      : [];
    const filtered = descendants.filter((k) => allCds.includes(k));
    return filtered.length > 0 ? filtered : allCds;
  }, [orgGroups, selectedNsKey, namespaceTree]);

  // ── ツリーノードのタイトル
  const renderTreeTitle = useCallback((node: NamespaceNode, _companyDepth: number) => {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
          {node.label}
        </span>
      </span>
    );
  }, []);

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

  // ── 共有スコープノード（ShareScopeModal 用 ScopeNode ツリー）
  // 選択中のノードの祖先（上位階層）をロールに応じて制御してツリー構造で返す。
  //   system_admin: 組織ノード含む全祖先を表示・活性
  //   それ以外: 組織ノードは非表示、代表者グループは活性、非代表者グループは非活性（グレー）
  // personal-{userId} 選択時: そのユーザーの所属グループ＋祖先をツリー表示する
  const shareScopeNodes = useMemo((): ScopeNode[] => {
    // 選択ノードなし・組織ルート は共有先なし
    if (!selectedNsKey || selectedNsKey === 'company' || selectedNsKey === 'personal') {
      return [];
    }

    // personal-{userId} ノード選択時: そのユーザーの所属グループ＋祖先をツリー表示
    if (selectedNsKey.startsWith('personal-')) {
      if (targetUserGroups.length === 0) return [];
      // targetUserGroups（所属グループ＋祖先）をツリー構築して返す
      const orgTree = buildOrgTree(targetUserGroups);
      const toScopeNode = (n: NamespaceNode): ScopeNode => ({
        key: n.key,
        label: n.label,
        selectable: isSysAdmin ? true : chiefGroupCds.has(n.key),
        children: n.children ? n.children.map(toScopeNode) : undefined,
      });
      // system_admin は組織ノードも表示
      if (isSysAdmin) {
        return [{
          key: 'company',
          label: t('namespaceTree.company'),
          selectable: true,
          children: orgTree.map(toScopeNode),
        }];
      }
      return orgTree.map(toScopeNode);
    }

    const companyNode = namespaceTree.find((n) => n.key === 'company');
    if (!companyNode) return [];

    // selectedNsKey の祖先キーを取得（company 直下から検索し、company 自身を先頭に付加）
    const ancestorKeysUnderCompany = getAncestorKeys(
      selectedNsKey,
      companyNode.children ?? [],
      []
    );

    // selectedNsKey が namespaceTree 上に見つからない場合
    if (ancestorKeysUnderCompany === null) return [];

    // company 自身を含めた祖先キー配列を構築
    // 例: グループ1-1 → ['company', 'group-1']
    const allAncestorKeys = ['company', ...ancestorKeysUnderCompany];

    // キーに対応する NamespaceNode を namespaceTree 全体から検索するヘルパー
    const findNodeByKey = (targetKey: string, nodes: NamespaceNode[]): NamespaceNode | null => {
      for (const n of nodes) {
        if (n.key === targetKey) return n;
        if (n.children) {
          const found = findNodeByKey(targetKey, n.children);
          if (found) return found;
        }
      }
      return null;
    };

    // 祖先キー配列をたどり、ネストした ScopeNode ツリーを再帰的に構築
    // depth=0: company, depth=1: 直下グループ, ...
    const buildAncestorTree = (depth: number): ScopeNode | null => {
      const key = allAncestorKeys[depth];
      if (!key) return null;

      const node = findNodeByKey(key, namespaceTree);
      if (!node) return null;

      const child = buildAncestorTree(depth + 1);

      // company ノード: system_admin のみ表示（それ以外はスキップして子を直接返す）
      if (key === 'company') {
        if (!isSysAdmin) {
          // company 自体は非表示、子（直下グループ）をそのまま返す
          return child;
        }
        // system_admin: 組織ノードを活性で表示
        return {
          key: node.key,
          label: node.label,
          selectable: true,
          children: child ? [child] : undefined,
        };
      }

      // グループノード: system_admin は全活性、それ以外は代表者グループのみ活性
      const isSelectable = isSysAdmin || chiefGroupCds.has(key);
      return {
        key: node.key,
        label: node.label,
        selectable: isSelectable,
        children: child ? [child] : undefined,
      };
    };

    const root = buildAncestorTree(0);
    return root ? [root] : [];
  }, [namespaceTree, selectedNsKey, isSysAdmin, chiefGroupCds, targetUserGroups, t]);

  // ── 共有ボタンクリック: 選択 Prefix キーを保存してモーダルを開く
  const handleShareSelected = useCallback((keys: React.Key[]) => {
    setSelectedPrefixKeys(keys as string[]);
    setShareScopeOpen(true);
  }, []);

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
                  setGroupAddParentLabel(ctxMenu.node!.label);
                  setGroupAddOpen(true);
                  setCtxMenu((s) => ({ ...s, visible: false }));
                }}
              >
                <PlusOutlined style={{ fontSize: 12, color: '#52c41a' }} />
                {t('uncertainty.management.ctxMenuAddGroup')}
              </li>
              <li
                style={{ padding: '6px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  setGroupEditLabel(ctxMenu.node!.label);
                  setGroupEditGroupCd(ctxMenu.node!.key ?? undefined);


                  setGroupEditMembers([]);
                  setGroupEditOpen(true);
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
                onClick={() => {
                  // 各タブへの切り替え時（同タブ連打は除く）にタイムスタンプを更新し
                  // 各コンポーネントの最新データ再取得をトリガーする
                  if (tab.key !== activeTab) {
                    if (tab.key === 'namespace') setNamespaceTabActivatedAt(Date.now());
                    if (tab.key === 'prefix')    setPrefixTabActivatedAt(Date.now());
                    if (tab.key === 'criteria')  setCriteriaTabActivatedAt(Date.now());
                  }
                  setActiveTab(tab.key);
                }}
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
                viewOnly={isViewOnlyForCompany}
                tabActivatedAt={namespaceTabActivatedAt}
                onAfterShare={() => setNamespaceTabActivatedAt(Date.now())}
              />
            </div>

            {/* Prefix管理タブ */}
            {/* filteredOrgGroupCds: 選択ノード配下（自身含む）の CDs のみに絞る。
                未選択 or 組織ルートノード選択時は全 CDs を渡す。
                useMemo でメモ化済み（インラインIIFEによる毎回新参照生成を防ぐ） */}
            <div style={{ display: activeTab === 'prefix' ? 'flex' : 'none', height: '100%', overflow: 'hidden' }}>
              <PrefixManagement
                showShareButton={selectedNsKey !== 'company'}
                selectedNsKey={effectiveNsKey}
                orgGroupCds={filteredOrgGroupCds}
                onShareSelected={handleShareSelected}
                viewOnly={isViewOnlyForCompany}
                tabActivatedAt={prefixTabActivatedAt}
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
                    onClick={() => {
                      if (selectedIds.length === 0) {
                        message.error(t('uncertainty.management.exportSelectAtLeastOne'));
                        return;
                      }
                      setExportModalOpen(true);
                    }}
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

      {/* グループ追加ダイアログ */}
      <GroupAddDialog
        open={groupAddOpen}
        onClose={() => setGroupAddOpen(false)}
        onCreated={(_groupCd, groupName) => {
          message.success(t('uncertainty.management.toastGroupCreated', { name: groupName, count: '0' }));
          setGroupAddOpen(false);
        }}
      />


      {/* グループ編集ダイアログ */}
      <GroupEditDialog
        open={groupEditOpen}
        groupLabel={groupEditLabel}
        groupCd={groupEditGroupCd}
        onClose={() => setGroupEditOpen(false)}
        onSaved={(members) => {
          message.success(t('uncertainty.management.toastGroupUpdated', { name: groupEditLabel, count: String(members.length) }));
          setGroupEditMembers(members);
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
          // 保存後に選択スコープを維持したまま不確かさ基準一覧を再取得して画面を最新化する
          const scopeKey = resolveScopeKey(selectedNsKey);
          fetchUncertaintyCriteriaList(scopeKey)
            .then((data) => setTemplates(data))
            .catch((err) => console.error('[UncertaintyManagement] 一覧再取得エラー:', err));
        }}
      />
      <UncertaintyCreateModal
        open={createModalOpen}
        allCriteria={templates}
        selectedNsKey={selectedNsKey}
        onClose={() => setCreateModalOpen(false)}
        onSaved={() => {
          setCreateModalOpen(false);
          const scopeKey = resolveScopeKey(selectedNsKey);
          fetchUncertaintyCriteriaList(scopeKey)
            .then((data) => setTemplates(data))
            .catch((err) => console.error('[UncertaintyManagement] 一覧再取得エラー:', err));
        }}
      />
      <UncertaintyImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        scopeKey={resolveScopeKey(selectedNsKey) ?? null}
        onImported={() => {
          const scopeKey = resolveScopeKey(selectedNsKey);
          fetchUncertaintyCriteriaList(scopeKey)
            .then((data) => setTemplates(data))
            .catch((err) => console.error('[UncertaintyManagement] インポート後再取得エラー:', err));
        }}
      />
      <UncertaintyExportModal
        open={exportModalOpen}
        selectedCount={selectedIds.length}
        selectedKeys={templates
          .filter((tpl) => selectedIds.includes(tpl.id))
          .map((tpl) => tpl.key)}
        onClose={() => setExportModalOpen(false)}
      />

      {/* ── Prefix 共有モーダル ── */}
      <ShareScopeModal
        open={shareScopeOpen}
        scopeNodes={shareScopeNodes}
        onClose={() => setShareScopeOpen(false)}
        onShare={async (target: ShareTarget) => {
          setShareLoading(true);
          try {
            const result = await sharePrefixes(selectedPrefixKeys as string[], target.key);
            message.success(
              t('prefixShare.toastSuccess', {
                count: String(result.copiedCount ?? selectedPrefixKeys.length),
                target: target.label,
              })
            );
            setShareScopeOpen(false);
          } catch {
            message.error(t('prefixShare.toastError'));
          } finally {
            setShareLoading(false);
          }
        }}
      />
    </div>
  );
}
