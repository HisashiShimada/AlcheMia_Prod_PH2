'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button, Dropdown, Input, Modal, Select, Table, Tabs, Tree, Tag, Tooltip, message, Typography, Checkbox } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  BankOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useRef } from 'react';
import type { TableColumnsType } from 'antd';
import { SYSTEM_NAMESPACE_PREFIX } from '@/constants/systemNamespace';
import { isValidNCName } from '@/utils/ncname';

import { getTerms, createTerm, updateTerm, createNamespace, getOrganizationGroups, getNamespaceList, getOrganizationDisplayName, getAttributeMaster, toggleTermActive } from '@/services/namespaceApiService';
import { getOrgUsersForGroups, getGroupMembers } from '@/services/organizationGroupApiService';
import DetailModal from './DetailModal';
import NamespaceAddDialog from './NamespaceAddDialog';
import GroupManagementPanel from '../group/GroupManagementPanel';
import GroupAddDialog from '../group/GroupAddDialog';
import GroupEditDialog from '../group/GroupEditDialog';
import ShareScopeModal from './ShareScopeModal';
import type {
  NamespaceNode,
  Term,
  NewTermRow,
  AttributeMaster,
  FlatNsNode,
  ScopeTreeNode,
  UserNsRole,
  DetailTarget,
  TermSaved,
  NamespaceSaved,
  NamespaceMainProps,
  ContextMenuState,
  TermEditValues,
  TermCsvParsedRow,
  OrganizationGroupRow,
  ShareTarget,
  ShareSourceRole,
} from '@/types/namespace';

// GlobalNamespaceView: グローバルノード選択時に右ペインへ表示（SSR無効）
const GlobalNamespaceView = dynamic(() => import('./GlobalNamespaceView'), { ssr: false });

const { Text } = Typography;

// ──────────────────────────────────────────────
// localStorage の userInfo から organizationName を取得する
// ──────────────────────────────────────────────
const getOrganizationNameFromStorage = (): string => {
  if (typeof window === 'undefined') return 'company';
  try {
    const raw = localStorage.getItem('userInfo');
    if (!raw) return 'company';
    const info = JSON.parse(raw) as { organizationName?: string };
    return info.organizationName ?? 'company';
  } catch {
    return 'company';
  }
};

// ──────────────────────────────────────────────
// ツリーの静的骨格（DB接続前の初期値）
// Global ノードのみ定義し、company/personal は DB から取得して動的に構築する
// ──────────────────────────────────────────────
const NAMESPACE_TREE_RAW: NamespaceNode[] = [
  {
    key: 'global',
    label: 'Global',
    count: 0,
    icon: '🌐',
    children: [
      {
        key: 'ns-maiml',
        label: 'maiml',
        count: 0,
        icon: '📜',
        prefix: 'maiml',
        uri: 'http://www.maiml.org/schemas',
        description: 'MaiML標準スキーマ定義',
      } as any,
      {
        key: 'ns-xsi',
        label: 'xsi',
        count: 0,
        icon: '📜',
        prefix: 'xsi',
        uri: 'http://www.w3.org/2001/XMLSchema-instance',
        description: 'XMLスキーマインスタンス属性',
      } as any,
    ],
  },
  {
    key: 'company',
    label: getOrganizationNameFromStorage(),
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
  // 重複排除: organization_group_cd で一意化（同じCDが複数回含まれていても1件として扱う）
  const uniqueGroups = Array.from(
    new Map(groups.map((g) => [g.organization_group_cd, g])).values()
  );

  const map = new Map<string, NamespaceNode>();
  const roots: NamespaceNode[] = [];

  for (const g of uniqueGroups) {
    map.set(g.organization_group_cd, {
      key:   g.organization_group_cd,
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

  // children が空配列のノードはリーフ扱い（Ant Design Tree の仕様）
  const stripEmpty = (nodes: NamespaceNode[]): NamespaceNode[] =>
    nodes.map((n) => ({
      ...n,
      children: n.children && n.children.length > 0 ? stripEmpty(n.children) : undefined,
    }));

  return stripEmpty(roots);
};

// ──────────────────────────────────────────────
// localStorage のログインユーザー情報から Personal ノード children を構築
// Personal ノードにはログインユーザー自身のみ表示する
// ──────────────────────────────────────────────
const buildPersonalTreeFromStorage = (): NamespaceNode[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('userInfo');
    if (!raw) return [];
    const info = JSON.parse(raw) as { id?: string; username?: string };
    const userId   = info.id;
    const userName = info.username;
    if (!userId) return [];
    return [{ key: `personal-${userId}`, label: userName ?? userId, count: 0 }];
  } catch {
    return [];
  }
};

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
// ルートを含めてツリー全体から検索するラッパー
const getScopeFullPath = (prefix: string, tree: ScopeTreeNode[] = NAMESPACE_TREE_RAW as ScopeTreeNode[]): string => {
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
// ログインユーザー情報を localStorage から導出するユーティリティ
// ──────────────────────────────────────────────

/**
 * localStorage の userInfo から UserNsRole を導出する。
 *
 * - roleCd === 'sys_admin'        → { kind: 'sys_admin' }
 * - organizationGroupCds に値あり → 先頭を deptKey として { kind: 'dept_owner' }
 * - それ以外                      → { kind: 'member', nsKey: userId }
 * フォールバック: sys_admin
 */
const deriveUserNsRoleFromStorage = (): UserNsRole => {
  if (typeof window === 'undefined') return { kind: 'sys_admin' };
  try {
    const raw = localStorage.getItem('userInfo');
    if (!raw) return { kind: 'sys_admin' };
    const info = JSON.parse(raw) as {
      permissions?: Array<{ functionId: string }>;
      id?: string;
      organizationGroupCds?: string[];
    };
    const groupCds = info.organizationGroupCds ?? [];
    // functionId '020000'（システム管理者メニュー）の権限があれば sys_admin 扱い。
    // functionId '020000' はシステム内固定の機能CD。
    // roleCd はユーザーが変更可能なため判定には使用しない。
    if ((info.permissions ?? []).some((p) => p.functionId === '020000')) {
      return { kind: 'sys_admin' };
    }
    if (groupCds.length > 0) {
      // 最初のグループCDを deptKey として使用（dept_owner 扱い）
      return { kind: 'dept_owner', deptKey: groupCds[0] };
    }
    // グループ未所属はメンバー扱い
    const nsKey = info.id ?? 'unknown';
    return { kind: 'member', nsKey };
  } catch {
    return { kind: 'sys_admin' };
  }
};

/**
 * UserNsRole から初期選択キーを導出する。
 */
const deriveNsKeyFromRole = (role: UserNsRole): string => {
  if (role.kind === 'sys_admin')   return 'company';
  if (role.kind === 'dept_owner')  return role.deptKey;
  if (role.kind === 'team_owner')  return role.teamKey;
  return role.nsKey;
};

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

// ツリーの中で最も深い階層のリーフノードキーを返す（DFS）
// 同じ最深レベルに複数リーフがある場合は最初に見つかったものを返す
const findDeepestLeafKey = (nodes: NamespaceNode[]): string | null => {
  let bestKey: string | null = null;
  let bestDepth = -1;
  const traverse = (ns: NamespaceNode[], depth: number) => {
    for (const node of ns) {
      if (!node.children || node.children.length === 0) {
        if (depth > bestDepth) {
          bestDepth = depth;
          bestKey   = node.key;
        }
      } else {
        traverse(node.children, depth + 1);
      }
    }
  };
  traverse(nodes, 0);
  return bestKey;
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
// ログインユーザーのロールに応じてツリーを剪定する
//
// dept_owner（部署代表者）:
//   自分の部署ノード配下を全展開（全チーム + 全メンバーNS を表示）
//   Global / Personal ルートはそのまま表示
//
// team_owner（チーム代表者）:
//   自分のチームノード配下を全展開（全メンバーNS を表示）
//   祖先の部署ノードは非表示（いきなり自分のチームから始まる）
//   Global / Personal ルートはそのまま表示
//
// member（一般メンバー）:
//   自分のノードへの祖先パス + 自分のノードのみ表示（従来の動作）
//   Global / Personal ルートはそのまま表示
// ──────────────────────────────────────────────

/** 指定キーのノードを再帰検索して返す */
const findNode = (key: string, nodes: NamespaceNode[]): NamespaceNode | null => {
  for (const n of nodes) {
    if (n.key === key) return n;
    if (n.children) {
      const found = findNode(key, n.children);
      if (found) return found;
    }
  }
  return null;
};

const filterTreeForUser = (nodes: NamespaceNode[], _userNsKey: string, role: UserNsRole, allowedGroupCds?: Set<string>): NamespaceNode[] => {

  // ── Personal ルートのフィルタリングヘルパー
  // UIプロトタイプ: ロールに関わらず全メンバーを表示
  // ns子ノード（yamada等）はツリーに表示しない（リーフノードとして表示するため children プロパティ自体を除外）
  const filterPersonalNode = (personalNode: NamespaceNode): NamespaceNode => {
    const usersWithoutNsChildren = (personalNode.children ?? []).map((userNode) => {
      // destructuring で children プロパティ自体を除去（undefined 設定では Ant Design Tree がリーフと認識しない）
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { children: _removed, ...userWithoutChildren } = userNode as NamespaceNode & { children?: NamespaceNode[] };
      return userWithoutChildren as NamespaceNode;
    });
    return { ...personalNode, children: usersWithoutNsChildren };
  };

  if (role.kind === 'sys_admin') {
    // システム管理者: 全ツリーをそのまま表示
    return nodes.map((n) => n.key === 'personal' ? filterPersonalNode(n) : n);
  }

  if (role.kind === 'dept_owner') {
    // 部署代表者: deptKey 配下を全展開して表示
    return nodes
      .filter((n) => n.key === 'global' || n.key === 'company' || n.key === 'personal')
      .map((n) => {
        if (n.key === 'global') return n;
        if (n.key === 'personal') return filterPersonalNode(n);
        // company ノード配下から deptKey のノードだけを残す（再帰的に検索して祖先パスも保持）
        const keepDeptPath = (ns: NamespaceNode[]): NamespaceNode[] =>
          ns.reduce<NamespaceNode[]>((acc, c) => {
            // allowedGroupCds が渡された場合はその Set で判定、未指定時は従来の deptKey で判定
            const isAllowed = allowedGroupCds ? allowedGroupCds.has(c.key) : c.key === role.deptKey;
            if (isAllowed) {
              acc.push({ ...c });
            } else if (c.children) {
              const filtered = keepDeptPath(c.children);
              if (filtered.length > 0) acc.push({ ...c, children: filtered });
            }
            return acc;
  }, []);
        return { ...n, children: n.children ? keepDeptPath(n.children) : undefined };
      });
  }

  if (role.kind === 'team_owner') {
    // チーム代表者: 所属チームへの祖先パスを保持しつつ、チームノード配下を全展開して表示
    // 例: rd-analysis → 株式会社サンプルテック > 研究開発部 > 解析チーム
    const keys = role.teamKeys ?? [role.teamKey];

    // 各チームの祖先ノードキーを収集（company配下のみ）
    const ancestorKeySet = new Set<string>();
    for (const teamKey of keys) {
      const companyNode = nodes.find((n) => n.key === 'company');
      if (companyNode?.children) {
        const found = getAncestorKeys(teamKey, companyNode.children);
        if (found) found.forEach((k) => ancestorKeySet.add(k));
      }
    }

    // company 配下を再帰的にフィルタ: 祖先ノードまたはチームノードのみ残す
    const filterCompanyChildren = (ns: NamespaceNode[]): NamespaceNode[] =>
      ns
        .filter((n) => keys.includes(n.key) || ancestorKeySet.has(n.key))
        .map((n) => {
          if (keys.includes(n.key)) return n; // チームノード: そのまま（子孫含む）
          return { ...n, children: n.children ? filterCompanyChildren(n.children) : undefined };
        });

    // Personal ノードはログインユーザーが所属するチームのメンバーのみに絞り込む
    const filterPersonalForTeams = (personalNode: NamespaceNode): NamespaceNode => {
      const usersFiltered = (personalNode.children ?? [])
        .filter((userNode) => {
          const raw = userNode as NamespaceNode & { teamKey?: string };
          return userNode.key === _userNsKey || keys.includes(raw.teamKey ?? '');
        })
        .map((userNode) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { children: _removed, ...userWithoutChildren } = userNode as NamespaceNode & { children?: NamespaceNode[] };
          return userWithoutChildren as NamespaceNode;
        });
      return { ...personalNode, children: usersFiltered };
    };

    return nodes
      .filter((n) => n.key === 'global' || n.key === 'company' || n.key === 'personal')
      .map((n) => {
        if (n.key === 'global') return n;
        if (n.key === 'personal') return filterPersonalForTeams(n);
        return { ...n, children: n.children ? filterCompanyChildren(n.children) : undefined };
      });
  }

  // member（従来の動作）: 自分のノードへの祖先パス + 自分のノードのみ
  const userNsKey = role.nsKey;
  const ancestorKeys = new Set<string>(getAncestorKeys(userNsKey, nodes) ?? []);

  const filterNodes = (ns: NamespaceNode[]): NamespaceNode[] =>
    ns
      .filter((n) => {
        if (n.key === 'global') return true;
        if (n.key === 'personal') return true;
        if (n.key === 'company') return true;
        if (n.key === userNsKey) return true;
        if (ancestorKeys.has(n.key)) return true;
        // allowedGroupCds に含まれるグループノードも表示（所属グループ・代表グループ）
        if (allowedGroupCds && allowedGroupCds.has(n.key)) return true;
        return false;
      })
      .map((n) => {
        if (n.key === 'personal') return filterPersonalNode(n);
        return { ...n, children: n.children ? filterNodes(n.children) : undefined };
      });

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

// ──────────────────────────────────────────────
// チーム代表者（team_owner）が閲覧できる祖先ノードの prefix を収集
// 例: rd-analysis → [rd, CorpA]（研究開発部・株式会社サンプルテックの prefix）
// ──────────────────────────────────────────────
const getAncestorPrefixes = (targetKey: string, nodes: NamespaceNode[]): string[] => {
  const result: string[] = [];
  const ancestorKeys = getAncestorKeys(targetKey, nodes) ?? [];
  for (const key of ancestorKeys) {
    const node = findNode(key, nodes);
    if (node) {
      const p = (node as any).prefix as string | undefined;
      if (p) result.push(p);
    }
  }
  return result;
};

/**
 * チーム代表者ロールの場合に編集不可とすべき prefix セットを計算する（コンポーネント内で使用）
 */
const computeTeamOwnerReadonlyPrefixes = (role: UserNsRole, tree: NamespaceNode[]): Set<string> => {
  if (role.kind !== 'team_owner') return new Set<string>();
  const ancestors = getAncestorPrefixes(role.teamKey, tree);
  return new Set<string>(ancestors);
};

// 選択ノード種別に応じた prefix 集合を返す
// - Global ノード選択 → Global 配下の prefix のみ
// - Personal ノード選択 → Personal（ログインユーザー）配下の prefix のみ
// - 組織ノード選択 → そのノード配下の全 prefix（自分 + 子孫）+ 祖先 prefix（team_owner 時）
const getRelatedPrefixes = (nsKey: string, currentPersonalKey = ''): Set<string> => {
  const tree = NAMESPACE_TREE_RAW as NamespaceNode[];
  const result = new Set<string>();

  const rootKey = getRootKey(nsKey, tree);

  if (rootKey === 'global') {
    // Global ノード or 配下 → グローバルprefixは表示しない
    return result;
  }

  if (rootKey === 'personal') {
    // Personal ノード選択 → 選択したユーザーノード配下の個人 prefix のみ
    // nsKey が 'personal' ルート自体の場合はログインユーザーの prefix を返す
    const targetKey = nsKey === 'personal' ? currentPersonalKey : nsKey;
    for (const pp of collectPrefixesUnder(targetKey, tree)) result.add(pp);
    return result;
  }

  // 組織ノード（company配下）→ 選択ノード配下の全 prefix ＋ そのノードに teamKey が一致するメンバーの個人 prefix
  const findPrefix = (key: string, nodes: NamespaceNode[]): string | null => {
    for (const n of nodes) {
      if (n.key === key) return (n as any).prefix ?? null;
      if (n.children) { const r = findPrefix(key, n.children); if (r) return r; }
    }
    return null;
  };

  // 【重要: 選択ノード自身の prefix のみ】
  // 子孫ノードのprefixは収集しない（混入防止）
  // 祖先ノードのprefixはグレーアウト用に ancestorPrefixesForSelected で別管理
  const selfPrefix = findPrefix(nsKey, tree);
  if (selfPrefix) result.add(selfPrefix);

  // 祖先のprefixも表示対象に含める（グレーアウト行として表示するため）
  // ただしグレーアウト判定は ancestorPrefixesForSelected で行うので、ここでは表示用に追加するのみ
  const ancestorPrefixes = getAncestorPrefixes(nsKey, tree);
  for (const p of ancestorPrefixes) result.add(p);

  return result;
};

const makeEmptyRow = (): NewTermRow => ({
  _rowId: `__new__${Date.now()}_${Math.random()}`,
  prefix: '',
  localName: '', displayName: '',
  description: '', type: '', unitHint: '',
  createDirectiveTerm: true,
});


// ──────────────────────────────────────────────
// CSV パースユーティリティ
// RFC 4180 準拠：クォートあり・なし・空列・"" エスケープすべてに対応
// ──────────────────────────────────────────────
const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // "" → " に変換してスキップ
      } else {
        inQuotes = !inQuotes; // クォート開始/終了
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current); // 最後の列
  return result;
};

// ──────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────
const NamespaceMain: React.FC<NamespaceMainProps> = ({
  hideTree = false,
  globalOnly = false,
  externalSelectedNsKey,
  onNsKeyChange,
  viewOnly = false,
}) => {
  const { t } = useLanguage();

  // ── ログインユーザー情報を localStorage から導出（useMemo でメモ化して依存配列に安定して渡せるようにする）
  const currentUserRole: UserNsRole = useMemo(() => deriveUserNsRoleFromStorage(), []);
  const currentUserNsKey: string = useMemo(() => deriveNsKeyFromRole(currentUserRole), [currentUserRole]);
  // Personal ノードキーは userId を使用（未取得時は空文字）
  const currentUserPersonalKey: string = (() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('userInfo');
      if (!raw) return '';
      const info = JSON.parse(raw) as { id?: string };
      return info.id ?? '';
    } catch { return ''; }
  })();
  // チーム代表者ロール時の編集不可 prefix セット
  const teamOwnerReadonlyPrefixes: Set<string> = computeTeamOwnerReadonlyPrefixes(currentUserRole, NAMESPACE_TREE_RAW as NamespaceNode[]);
  // 指定の prefix がチーム代表者にとって読み取り専用かどうか
  const isReadonlyPrefix = (prefix: string): boolean => teamOwnerReadonlyPrefixes.has(prefix);

  // ── 組織表示名（company ノードラベル用）
  // localStorage.userInfo.organizationName から初期値を取得（API 権限がないロールでも即時表示できるよう）
  const [companyLabel, setCompanyLabel] = useState(() => getOrganizationNameFromStorage());

  // ── organization_group 取得ステート
  const [orgGroups, setOrgGroups] = useState<OrganizationGroupRow[]>([]);

  // ── ログインユーザーが代表者（chief_user_id）であるグループCDの集合
  const [chiefGroupCds, setChiefGroupCds] = useState<Set<string>>(new Set());

  // ── 個人スコープ選択時の共有先候補グループ（selectedNsKey が personal-{userId} のときに取得）
  const [targetUserGroups, setTargetUserGroups] = useState<NamespaceNode[]>([]);

  // ── Personal ノードの children（クライアント mount 後に localStorage から取得）
  // SSR では localStorage にアクセスできないため useState + useEffect で分離する
  const [personalChildren, setPersonalChildren] = useState<NamespaceNode[]>([]);

  // ── 動的ツリー（NAMESPACE_TREE_RAW の company/personal.children を API データで差し替え）
  // Personal ノードはログインユーザー自身のみ表示（localStorage から取得）
  const namespaceTree = useMemo((): NamespaceNode[] =>
    NAMESPACE_TREE_RAW.map((n) => {
      if (n.key === 'company')  return { ...n, label: companyLabel || n.label, children: buildOrgTree(orgGroups) };
      if (n.key === 'personal') return { ...n, children: personalChildren.length > 0 ? personalChildren : undefined };
      return n;
    })
  , [orgGroups, personalChildren, companyLabel]);

  const [termSearch,    setTermSearch]    = useState('');
  const [selectedNsKey, setSelectedNsKey] = useState<string | null>(
    globalOnly ? 'global' : currentUserNsKey
  );
  const [terms,         setTerms]         = useState<Term[]>([]);
  /** バッジ計算専用・全件（選択ノードによる絞り込みなし） */
  const [allTerms,      setAllTerms]      = useState<Term[]>([]);
  const [termsLoading,  setTermsLoading]  = useState(true);

  // 複数行入力用配列（空配列 = 入力行なし）
  const [newTerms, setNewTerms] = useState<NewTermRow[]>([]);

  const [modalOpen,       setModalOpen]       = useState(false);
  const [modalTarget,     setModalTarget]     = useState<DetailTarget | null>(null);
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);

  const [nsNodes, setNsNodes] = useState<FlatNsNode[]>(() => flattenTree(NAMESPACE_TREE_RAW as NamespaceNode[]));
  // DB から取得した Prefix 一覧（グローバルPrefixを除いた用語追加可能なPrefix）
  const [dbPrefixes, setDbPrefixes] = useState<string[]>([]);
  const [contextNode, setContextNode] = useState<NamespaceNode | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addChildParentKey, setAddChildParentKey] = useState<string | null>(null);

  // グループ追加ダイアログ
  const [groupAddOpen,        setGroupAddOpen]        = useState(false);
  const [groupAddParentLabel, setGroupAddParentLabel] = useState('');

  // 共有先選択モーダル
  const [shareScopeOpen, setShareScopeOpen] = useState(false);

  // グループ編集ダイアログ（メンバー追加）
  const [groupEditOpen,    setGroupEditOpen]    = useState(false);
  const [groupEditLabel,   setGroupEditLabel]   = useState('');
  const [groupEditGroupCd, setGroupEditGroupCd] = useState<string | undefined>(undefined);

  const [groupEditMembers, setGroupEditMembers] = useState<string[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ──── コンテキストメニュー状態（方針B: Tree.onRightClick 方式）
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, node: null, parentLabel: '' });

  const [filterPrefix,    setFilterPrefix]    = useState<string | null>(null);
  const [filterScope,     setFilterScope]     = useState<string | null>(null);
  /** prefix → scopeName（DB由来） のマップ */
  const [prefixScopeNameMap, setPrefixScopeNameMap] = useState<Map<string, string>>(new Map());
  /** prefix → scopeKey（organization_group_cd / userId）のマップ（用語数バッジ計算用） */
  const [prefixToScopeKeyMap, setPrefixToScopeKeyMap] = useState<Map<string, string>>(new Map());
  const [filterType,      setFilterType]       = useState<string | null>(null);
  const [filterUnit,      setFilterUnit]       = useState<string | null>(null);
  const FALLBACK_UNITS = ['kg', 'g', 'mg', 'μg', 'L', 'mL', 'm', 'cm', 'mm', 'μm', 'nm', '℃', 'K', 'Pa', 'MPa', 'mol', 'wt%', 'vol%', '%', 'min', 'h', 's', 'なし'];
  const [unitAttributes,  setUnitAttributes]  = useState<string[]>(FALLBACK_UNITS);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(20);

  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<TermEditValues>({ prefix: '', localName: '', displayName: '', description: '', type: '', unitHint: '' });

  // ──── ツリーの展開キー（ルートノードを初期から展開しておく）
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['global', 'company', 'personal']);

  // ──── 初回マウント時に localStorage からログインユーザー自身のノードを Personal children として設定
  // APIコール不要: localStorage.userInfo から { id, username } を直接取得する
  
  useEffect(() => {
    const nodes = buildPersonalTreeFromStorage();
    setPersonalChildren(nodes);
    if (nodes.length > 0) {
      setExpandedKeys((prev) =>
        prev.includes('personal') ? prev : [...prev, 'personal']
      );
    }
  }, []);

  // ──── 初回マウント時に組織表示名を取得（company ノードラベル用）
  // localStorage.userInfo.organizationName を優先的に使用し、
  // API 取得に成功した場合はさらに最新値で上書きする（実験管理者など 401 になるロールでも正しく表示される）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('userInfo');
      if (!raw) return;
      const info = JSON.parse(raw) as { organizationId?: string; organizationName?: string };
      // まず localStorage の organizationName を即時反映
      if (info.organizationName) {
        setCompanyLabel(info.organizationName);
      }
      // API から最新の組織名を取得できればさらに上書き（権限がない場合は catch でスキップ）
      if (info.organizationId) {
        getOrganizationDisplayName(info.organizationId)
          .then((name) => { if (name) setCompanyLabel(name); })
          .catch(() => { /* 取得失敗時は localStorage の値のまま */ });
      }
    } catch { /* ignore */ }
  }, []);

  // ──── 初回マウント時に organization_group 一覧を取得してツリーを構築
  // 代表グループ（chiefUserId フィルタ）と所属グループ（memberOf）を並列取得してマージする。
  // 取得完了後、ロール別剪定済みの company 配下で最も深い階層のリーフを初期選択にする
  useEffect(() => {
    // system_admin の場合: all=true で全グループを一括取得し、全CDを chiefGroupCds に登録（全グループ編集可扱い）
    if (currentUserRole.kind === 'sys_admin') {
      // system_admin: 全グループと全ユーザーを並列取得
      Promise.all([
        getOrganizationGroups(undefined, { all: true }),
        getOrgUsersForGroups(),
      ])
        .then(([allGroups, orgUsers]) => {
          // 全グループを chiefGroupCds に登録 → 全グループで編集可能と判定される
          setChiefGroupCds(new Set(allGroups.map((g) => g.organization_group_cd)));
          setOrgGroups(allGroups);

          // Personal ノードを全ユーザーで構築してセット
          const allUserNodes: NamespaceNode[] = orgUsers.map((u) => ({
            key: `personal-${u.userId}`,
            label: u.userName,
            count: 0,
          }));
          if (allUserNodes.length > 0) {
            setPersonalChildren(allUserNodes);
          }

          // ロール別剪定を適用して最下層リーフを初期選択にする
          const orgTree = buildOrgTree(allGroups);
          const fullTree: NamespaceNode[] = NAMESPACE_TREE_RAW.map((n) =>
            n.key === 'company' ? { ...n, children: orgTree } : n
          );
          const allowedCds = new Set(allGroups.map((g) => g.organization_group_cd));
          const filteredTree = filterTreeForUser(fullTree, currentUserNsKey, currentUserRole, allowedCds);
          const companyNode = filteredTree.find((n) => n.key === 'company');
          const leafKey = companyNode?.children ? findDeepestLeafKey(companyNode.children) : null;
          if (leafKey) {
            setSelectedNsKey(leafKey);
            onNsKeyChange?.(leafKey);
          }
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

        setOrgGroups(mergedGroups);

        // 組織ツリーを構築し、ロール別に剪定したうえで最下層リーフを初期選択にする
        const orgTree = buildOrgTree(mergedGroups);
        const fullTree: NamespaceNode[] = NAMESPACE_TREE_RAW.map((n) =>
          n.key === 'company' ? { ...n, children: orgTree } : n
        );
        const allowedCds = new Set(mergedGroups.map((g) => g.organization_group_cd));
        const filteredTree = filterTreeForUser(fullTree, currentUserNsKey, currentUserRole, allowedCds);
        const companyNode = filteredTree.find((n) => n.key === 'company');
        const leafKey = companyNode?.children ? findDeepestLeafKey(companyNode.children) : null;
        if (leafKey) {
          setSelectedNsKey(leafKey);
          onNsKeyChange?.(leafKey);
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
              const userNodes: NamespaceNode[] = unique.map((u) => ({
                key: `personal-${u.userId}`,
                label: u.userName,
                count: 0,
              }));
              if (userNodes.length > 0) {
                setPersonalChildren(userNodes);
              }
            })
            .catch(() => {
              // 取得失敗時は Personal ノードにログインユーザーのみ表示（デフォルト動作）
            });
        }
      })
      .catch(() => {
        // 取得失敗時は空ツリーのまま表示を継続
      });
  // currentUserNsKey / currentUserRole は useMemo でメモ化済み、onNsKeyChange は安定した参照
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──── 初回マウント時に属性テーブルから単位一覧を取得（失敗時はダミーデータにフォールバック）
  useEffect(() => {
    getAttributeMaster()
      .then((items) => {
        const units = items
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

  // ──── DB から Prefix 一覧を取得（「用語を追加」ボタン活性判定 & Prefixプルダウン用 & スコープ列表示用）
  // scopeKey を指定した場合はそのスコープに紐づく Prefix のみ取得する（個人名前空間対応）
  // scopeKeys（複数）を指定した場合は複数スコープに紐づく Prefix をまとめて取得する（company ノード選択時）
  // withAncestors=true の場合は scopeKey とその祖先グループの Prefix も含めて取得する
  const fetchPrefixes = useCallback((scopeKey?: string, withAncestors?: boolean, scopeKeys?: string[]) => {
    let options: { scopeKey?: string; scopeKeys?: string[]; withAncestors?: boolean } | undefined;
    if (scopeKeys && scopeKeys.length > 0) {
      // 複数 scopeKey が指定されている場合（company ノード選択時など）
      options = { scopeKeys, withAncestors };
    } else if (scopeKey) {
      options = { scopeKey, withAncestors };
    }
    getNamespaceList(options)
      .then((list) => {
        const globalPrefixSet = new Set(getGlobalPrefixes(NAMESPACE_TREE_RAW as NamespaceNode[]));
        const nonGlobal = list
          .map((n) => n.prefix)
          .filter((p) => p && !globalPrefixSet.has(p));
        setDbPrefixes(nonGlobal);
        // prefix → scopeName のマップを構築（DB由来のスコープ名）
        const scopeMap = new Map<string, string>();
        for (const ns of list) {
          if (ns.prefix && (ns as any).scopeName) {
            scopeMap.set(ns.prefix, (ns as any).scopeName as string);
          }
        }
        setPrefixScopeNameMap(scopeMap);
        // prefix → scopeKey のマップを構築（用語数バッジ計算用）
        // scopeKey 指定時（スコープ絞り込み）はツリー全体のバッジ計算用マップを上書きしない
        // （初回フル取得・visibilityChange 時のみ全スコープ分を反映する）
        if (!scopeKey && !(scopeKeys && scopeKeys.length > 0)) {
          const scopeKeyMap = new Map<string, string>();
          for (const ns of list) {
            if (ns.prefix && ns.scopeKey) {
              scopeKeyMap.set(ns.prefix, ns.scopeKey);
            }
          }
          setPrefixToScopeKeyMap(scopeKeyMap);
        }
      })
      .catch(() => {
        // 取得失敗時は空のまま（ボタン非活性）
      });
  }, []);

  // ──── 初回マウント時に DB から Prefix 一覧を取得
  useEffect(() => {
    fetchPrefixes();
  }, [fetchPrefixes]);

  // ──── selectedNsKey 変化時に API から用語一覧を取得
  // externalSelectedNsKey（DepartmentTreeManagement で選択したノードキー）を scopeKey として渡す
  const fetchTerms = useCallback((options?: { scopeKey?: string; scopeKeys?: string[]; globalFlg?: boolean; withAncestors?: boolean }) => {
    setTermsLoading(true);
    getTerms(options)
      .then((data) => setTerms(data as Term[]))
      .catch(() => {
        // 未ログイン(401)等でAPIが失敗した場合は空配列を設定
        setTerms([]);
      })
      .finally(() => setTermsLoading(false));
  }, []);

  // ──── 現在の effectiveNsKey に対応するオプションで用語を再フェッチする共通関数
  // useEffect（ノード選択時）と handleAddSave（保存後再取得）の両方から呼ぶ
  const fetchTermsForCurrentNsKey = useCallback((nsKey: string | null) => {
    const GLOBAL_KEYS   = new Set(['global', 'ns-maiml', 'ns-xsi']);
    const COMPANY_KEYS  = new Set(['company']);
    const PERSONAL_ROOT = 'personal';
    const personalKeySet = new Set(personalChildren.map((n) => n.key));

    if (!nsKey || GLOBAL_KEYS.has(nsKey)) {
      fetchTerms();
    } else if (COMPANY_KEYS.has(nsKey)) {
      const allGroupCds = orgGroups.map((g) => g.organization_group_cd);
      if (allGroupCds.length > 0) {
        fetchTerms({ scopeKeys: allGroupCds } as any);
      } else {
        fetchTerms();
      }
    } else if (nsKey === PERSONAL_ROOT || personalKeySet.has(nsKey) || nsKey.startsWith('personal-')) {
      // personal- プレフィックスを除去して DB の scope_key（userId）を取り出す
      // nsKey.startsWith('personal-') の条件は system_admin が他ユーザーの個人スコープを選択した場合に対応
      const scopeKey = nsKey === PERSONAL_ROOT ? currentUserPersonalKey : nsKey.replace(/^personal-/, '');
      fetchTerms(scopeKey ? { scopeKey } : undefined);
    } else {
      // org group cd（組織グループノード） → scopeKey＋祖先グループでフィルタ
      fetchTerms({ scopeKey: nsKey, withAncestors: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTerms, personalChildren, orgGroups, currentUserPersonalKey]);

  // ──── 現在の effectiveNsKey に対応するオプションで Prefix 一覧を再フェッチする共通関数
  // visibilitychange（ブラウザ復帰時）から呼ぶ
  const fetchPrefixesForCurrentNsKey = useCallback((nsKey: string | null) => {
    const GLOBAL_KEYS   = new Set(['global', 'ns-maiml', 'ns-xsi']);
    const COMPANY_KEYS  = new Set(['company']);
    const PERSONAL_ROOT = 'personal';
    const personalKeySet = new Set(personalChildren.map((n) => n.key));

    if (!nsKey || GLOBAL_KEYS.has(nsKey)) {
      fetchPrefixes();
    } else if (COMPANY_KEYS.has(nsKey)) {
      const allGroupCds = orgGroups.map((g) => g.organization_group_cd);
      if (allGroupCds.length > 0) {
        fetchPrefixes(undefined, undefined, allGroupCds);
      } else {
        fetchPrefixes();
      }
    } else if (nsKey === PERSONAL_ROOT || personalKeySet.has(nsKey) || nsKey.startsWith('personal-')) {
      // personal- プレフィックスを除去して DB の scope_key（userId）を取り出す
      // nsKey.startsWith('personal-') の条件は system_admin が他ユーザーの個人スコープを選択した場合に対応
      const scopeKey = nsKey === PERSONAL_ROOT ? currentUserPersonalKey : nsKey.replace(/^personal-/, '');
      fetchPrefixes(scopeKey || undefined);
    } else {
      // org group cd（組織グループノード） → scopeKey＋祖先グループでフィルタ
      fetchPrefixes(nsKey, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPrefixes, personalChildren, orgGroups, currentUserPersonalKey]);

  // 初回マウント時は externalSelectedNsKey なしでフェッチ
  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  // ──── バッジ計算用の全件用語を取得（選択ノードによる絞り込みなし）
  // visibilityChange 時にも再取得して最新状態を反映する
  const fetchAllTerms = useCallback(() => {
    getTerms().then((data) => setAllTerms(data as Term[])).catch(() => setAllTerms([]));
  }, []);

  useEffect(() => {
    fetchAllTerms();
  }, [fetchAllTerms]);

  // ──── externalSelectedNsKey（ツリー選択）が変化したときに用語・Prefixを再フェッチ
  useEffect(() => {
    if (externalSelectedNsKey === undefined || externalSelectedNsKey === null) return;

    // ノード切り替え時にチェック状態をリセット
    setSelectedTermIds([]);

    const nsKey = externalSelectedNsKey as string;
    const GLOBAL_KEYS  = new Set(['global', 'ns-maiml', 'ns-xsi']);
    const COMPANY_KEYS = new Set(['company']);
    const PERSONAL_ROOT = 'personal';
    const personalKeySet = new Set(personalChildren.map((n) => n.key));

    // 用語フェッチ（共通関数で nsKey に応じた scopeKey を自動判定）
    fetchTermsForCurrentNsKey(nsKey);

    // Prefix フェッチ（fetchPrefixes はノード種別ごとに引数が異なるためここで分岐）
    if (GLOBAL_KEYS.has(nsKey)) {
      fetchPrefixes();
    } else if (COMPANY_KEYS.has(nsKey)) {
      const allGroupCds = orgGroups.map((g) => g.organization_group_cd);
      if (allGroupCds.length > 0) {
        fetchPrefixes(undefined, undefined, allGroupCds);
      } else {
        fetchPrefixes();
      }
    } else if (nsKey === PERSONAL_ROOT || personalKeySet.has(nsKey) || nsKey.startsWith('personal-')) {
      // personal- プレフィックスを除去して DB の scope_key（userId）を取り出す
      // nsKey.startsWith('personal-') の条件は system_admin が他ユーザーの個人スコープを選択した場合に対応
      const scopeKey = nsKey === PERSONAL_ROOT ? currentUserPersonalKey : nsKey.replace(/^personal-/, '');
      fetchPrefixes(scopeKey || undefined);
    } else {
      fetchPrefixes(nsKey, true);
    }
  // fetchTermsForCurrentNsKey / fetchPrefixes / personalChildren / currentUserPersonalKey / orgGroups は依存
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSelectedNsKey]);

  // ──── selectedNsKey（内部ツリー選択 state）が変化したときに用語を再フェッチ
  // externalSelectedNsKey が渡されていない場合（通常の namespace-management ページ）のみ動作する
  useEffect(() => {
    // externalSelectedNsKey が渡されている場合は上の useEffect に委譲
    if (externalSelectedNsKey !== undefined) return;
    if (!selectedNsKey) return;

    // ノード切り替え時にチェック状態をリセット
    setSelectedTermIds([]);

    const nsKey = selectedNsKey;
    const GLOBAL_KEYS  = new Set(['global', 'ns-maiml', 'ns-xsi']);
    const COMPANY_KEYS = new Set(['company']);
    const PERSONAL_ROOT = 'personal';
    const personalKeySet = new Set(personalChildren.map((n) => n.key));

    // 用語フェッチ（共通関数で nsKey に応じた scopeKey を自動判定）
    fetchTermsForCurrentNsKey(nsKey);

    // Prefix フェッチ
    if (GLOBAL_KEYS.has(nsKey)) {
      fetchPrefixes();
    } else if (COMPANY_KEYS.has(nsKey)) {
      const allGroupCds = orgGroups.map((g) => g.organization_group_cd);
      if (allGroupCds.length > 0) {
        fetchPrefixes(undefined, undefined, allGroupCds);
      } else {
        fetchPrefixes();
      }
    } else if (nsKey === PERSONAL_ROOT || personalKeySet.has(nsKey) || nsKey.startsWith('personal-')) {
      // personal- プレフィックスを除去して DB の scope_key（userId）を取り出す
      // nsKey.startsWith('personal-') の条件は system_admin が他ユーザーの個人スコープを選択した場合に対応
      const scopeKey = nsKey === PERSONAL_ROOT ? currentUserPersonalKey : nsKey.replace(/^personal-/, '');
      fetchPrefixes(scopeKey || undefined);
    } else {
      // org group cd（組織グループノード） → scopeKey＋祖先グループでフィルタ
      fetchPrefixes(nsKey, true);
    }
  // fetchTermsForCurrentNsKey / fetchPrefixes / personalChildren / currentUserPersonalKey / orgGroups は依存
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNsKey]);

  // ──── タブがアクティブになったときに再フェッチ（他タブで変更があった場合に反映）
  // personal ノードも再読み込みする（localStorage の userInfo を再取得）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // タブを離れたときにチェック状態をリセット
        setSelectedTermIds([]);
      }
      if (document.visibilityState === 'visible') {
        // 現在選択中のノードのスコープで再フェッチ（引数なし全件取得による他階層データ混入を防ぐ）
        const effectiveKey = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
        fetchTermsForCurrentNsKey(effectiveKey);
        fetchPrefixesForCurrentNsKey(effectiveKey);
        const nodes = buildPersonalTreeFromStorage();
        setPersonalChildren(nodes);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchTermsForCurrentNsKey, fetchPrefixesForCurrentNsKey, selectedNsKey, externalSelectedNsKey]);

  // ──── 個人スコープ（personal-{userId}）選択時: そのユーザーの所属グループ＋祖先を取得
  // 共有ダイアログに表示する共有先候補として使用する
  useEffect(() => {
    const effectiveKey = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    if (!effectiveKey?.startsWith('personal-')) {
      setTargetUserGroups([]);
      return;
    }
    const targetUserId = effectiveKey.replace(/^personal-/, '');
    getOrganizationGroups(undefined, { memberOfUser: targetUserId })
      .then((groups) => {
        const orgTree = buildOrgTree(Array.isArray(groups) ? groups : []);
        setTargetUserGroups(orgTree);
      })
      .catch(() => setTargetUserGroups([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNsKey, externalSelectedNsKey]);

  // ──── 「用語を追加」ボタン：常に活性、押すたびに空行を追加
  const handleAddRow = () => {
    setNewTerms((prev) => [...prev, makeEmptyRow()]);
  };

  // ──── 入力行の値更新（dept-rd 選択時は prefix:localName の重複チェックを実施）
  const updateNewTerm = (rowId: string, field: keyof Omit<NewTermRow, '_rowId'>, value: string | boolean) => {
    const isDeptRd = effectiveNsKey === 'dept-rd';
    setNewTerms((prev) => prev.map((r) => {
      if (r._rowId !== rowId) return r;
      const updated = { ...r, [field]: value };
      if (isDeptRd) {
        const p = field === 'prefix'    ? (value as string) : updated.prefix;
        const l = field === 'localName' ? (value as string) : updated.localName;
        updated._isDuplicate = !!(p && l && terms.some((t) => t.prefix === p && t.localName === l));
      } else {
        updated._isDuplicate = false;
      }
      return updated;
    }));
  };

  // ──── 入力行を1件削除
  const removeNewRow = (rowId: string) => {
    setNewTerms((prev) => prev.filter((r) => r._rowId !== rowId));
  };

  // ──── 「保存」ボタン：全入力行を API POST でDBに保存
  const handleAddSave = async () => {
    if (newTerms.length === 0) return;
    for (const row of newTerms) {
      if (!row.prefix)    { message.error(t('namespaceMain.prefixRequired')); return; }
      if (!row.localName) { message.error(t('namespaceMain.localNameRequired')); return; }
      if (!isValidNCName(row.localName)) { message.error(t('namespaceMain.localNameNcnameInvalid')); return; }
    }

    // 研究開発部（dept-rd）選択時は必ずエラーダイアログを表示して保存をブロック
    if (effectiveNsKey === 'dept-rd') {
      Modal.error({
        title: t('namespaceMain.duplicateErrorTitle'),
        content: t('namespaceMain.duplicateErrorContent'),
      });
      return;
    }

    // 木村涼子（user-010）選択時は同用語名・別Prefix重複の警告を表示（保存は続行）
    if (effectiveNsKey === 'user-010') {
      Modal.confirm({
        title: t('namespaceMain.warnDuplicateTitle'),
        content: t('namespaceMain.warnDuplicateContent'),
        okText: t('namespaceMain.warnRegister'),
        cancelText: t('namespaceMain.warnCancel'),
      });
    }

    // Personal ノードの場合は 'personal-' プレフィックスを除去して userId のみ scopeKey として渡す
    // DB の namespace.scope_key には userId（例: 'user-abc123'）が格納されており、
    // ツリーノードキー（例: 'personal-user-abc123'）のままでは SQL がヒットしないため変換が必要
    const PERSONAL_ROOT_KEY = 'personal';
    const personalKeySetForSave = new Set(personalChildren.map((n) => n.key));
    let scopeKeyForCreate: string | undefined;
    if (!effectiveNsKey || effectiveNsKey === PERSONAL_ROOT_KEY) {
      // personal ルートノード選択中: ログインユーザー自身の userId を使用
      scopeKeyForCreate = currentUserPersonalKey || undefined;
    } else if (personalKeySetForSave.has(effectiveNsKey)) {
      // personal-{userId} 形式: 'personal-' プレフィックスを除去して userId のみ取り出す
      scopeKeyForCreate = effectiveNsKey.replace(/^personal-/, '') || undefined;
    } else {
      // 組織グループノード / Global ノード: そのまま使用
      scopeKeyForCreate = effectiveNsKey ?? undefined;
    }

    const added: Term[] = [];
    for (const row of newTerms) {
      try {
        const createTermRequest: Parameters<typeof createTerm>[0] = {
          prefix:        row.prefix,
          localName:     row.localName,
          displayNameJa: row.displayName,
          description:   row.description,
          typeHint:      row.type || 'stringType',
          unitHint:      row.unitHint,
          createDirectiveTerm: row.createDirectiveTerm,
          scopeKey: scopeKeyForCreate,
        };
        const saved = await createTerm(createTermRequest);
        added.push(saved as Term);
      } catch (err: unknown) {
        const status = (err as any)?.response?.status;
        const errData = (err as any)?.response?.data?.error;

        if (status === 409 && errData?.code === 'E6005') {
          // 重複エラー → モーダル表示
          const qname = `${row.prefix}:${row.localName}`;
          const scopeName = errData?.details?.scopeName ?? row.prefix;
          Modal.error({
            title: t('termManagement.duplicateErrorTitle'),
            content: t('termManagement.duplicateError', { qname, scopeName }),
          });
        } else {
          // その他のエラー → トースト表示
          const errDetail =
            typeof errData === 'string'
              ? errData
              : (errData?.message ?? String(status ?? 'unknown'));
          message.error(t('termManagement.saveTermError', { localName: row.localName, detail: errDetail }));
        }
      }
    }

    if (added.length > 0) {
      // 指示用語同時登録があった行のカウント（メッセージ出し分け用）
      const directiveCount = newTerms.filter((r) => r.createDirectiveTerm).length;
      if (directiveCount > 0) {
        message.success(t('namespaceMain.saveTermSuccess', { count: String(added.length) }) + ' ' + t('namespaceMain.createDirectiveTermSuccess'));
      } else {
        message.success(t('namespaceMain.saveTermSuccess', { count: String(added.length) }));
      }
      // 指示用語（SupervisorDirective...）も含めて一覧に反映するため、APIから最新データを再取得する
      // 現在選択中のノードに対応する scopeKey で絞り込んで取得する
      fetchTermsForCurrentNsKey(effectiveNsKey);
    }
    setNewTerms([]);
  };

  const startEditTerm = (record: Term) => {
    setEditingTermId(`${record.prefix}:${record.localName}`);
    const initialEditingValues: TermEditValues = {
      prefix:      record.prefix ?? '',
      localName:   record.localName,
      displayName: record.displayName,
      description: record.description,
      type:        record.type,
      unitHint:    record.unitHint ?? '',
    };
    setEditingValues(initialEditingValues);
  };

  const saveEditTerm = async () => {
    if (!editingTermId) return;
    if (!editingValues.localName) { message.error(t('namespaceMain.localNameRequired2')); return; }

    try {
      const updateTermRequest: Parameters<typeof updateTerm>[2] = {
        localName:     editingValues.localName,
        displayNameJa: editingValues.displayName,
        description:   editingValues.description,
        typeHint:      editingValues.type,
        unitHint:      editingValues.unitHint,
      };
      const updated = await updateTerm(
        editingValues.prefix,
        editingValues.localName,
        updateTermRequest
      );
      setTerms((prev) => prev.map((t) => `${t.prefix}:${t.localName}` === editingTermId ? (updated as Term) : t));
      setEditingTermId(null);
      message.success(t('namespaceMain.updateSuccess'));
    } catch (err: unknown) {
      const errDetail =
        typeof (err as any)?.response?.data?.error === 'string'
          ? (err as any).response.data.error
          : ((err as any)?.response?.data?.error?.message ?? String((err as any)?.response?.status ?? 'unknown'));
      message.error(t('namespaceMain.updateError', { detail: errDetail }));
    }
  };

  const cancelEditTerm = () => setEditingTermId(null);

  // ──── グループノード右クリック：グループを追加（親ノードのラベルを追加先として表示）
  const handleContextAddGroup = (_node: NamespaceNode) => {
    setGroupAddParentLabel(t('namespaceMain.groupAddParentLabelDefault'));
    setGroupAddOpen(true);
  };

  // ──── グループノード右クリック：編集（メンバー追加）
  const handleContextEditGroup = (node: NamespaceNode) => {
    setGroupEditLabel(node.label);
    setGroupEditGroupCd(node.key ?? undefined);
    setGroupEditMembers([]);
    setGroupEditOpen(true);
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
    const rootKey = getRootKey(key, namespaceTree);
    return rootKey === 'global' || rootKey === 'personal';
  }, [selectedNsKey, externalSelectedNsKey, namespaceTree]);

  // グローバルノード自体（'global' / 'ns-maiml' / 'ns-xsi'）が選択中かどうか
  const isGlobalNodeSelected = useMemo(() => {
    const key = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    return key === 'global' || key === 'ns-maiml' || key === 'ns-xsi';
  }, [selectedNsKey, externalSelectedNsKey]);

  // 選択ノードが company 配下のノードかどうか
  const isCompanyNodeSelected = useMemo(() => {
    const key = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    if (!key) return false;
    return getRootKey(key, namespaceTree) === 'company';
  }, [selectedNsKey, externalSelectedNsKey, namespaceTree]);

  // 選択中のノードに対してログインユーザーが代表者（chief_user_id）かどうか
  const isRepresentativeOfSelected = useMemo(() => {
    const key = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    if (!key) return false;
    return chiefGroupCds.has(key);
  }, [selectedNsKey, externalSelectedNsKey, chiefGroupCds]);

  // orgグループノード（company 配下のグループノード）が選択中かどうか
  // 固定キーと personal- プレフィックスを除外することで判定する
  const isOrgGroupNodeSelected = useMemo(() => {
    const key = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    if (!key) return false;
    if (['global', 'ns-maiml', 'ns-xsi', 'company', 'personal'].includes(key)) return false;
    if (key.startsWith('personal-')) return false;
    return true;
  }, [selectedNsKey, externalSelectedNsKey]);

  // 実効的な閲覧専用フラグ
  // - 外部 props の viewOnly=true は常に優先
  // - sys_admin の場合:
  //     personal-{userId} ノード選択時のみ閲覧専用（個人スコープは閲覧のみ）
  //     グループノード・組織ノード選択時は編集可能
  // - sys_admin 以外:
  //     orgグループノード選択中 かつ 自分が代表者でない場合は閲覧専用
  // ※ currentUserRole は deriveUserNsRoleFromStorage() で算出済み（localStorage.userInfo.roleCd 参照）
  const isPersonalNodeSelected = useMemo(() => {
    const key = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    // 'personal-{userId}' 形式のキー（buildPersonalTreeFromStorage のキー生成ルールに準拠）
    return (key ?? '').startsWith('personal-');
  }, [selectedNsKey, externalSelectedNsKey]);

  // 他ユーザーの個人スコープが選択中かどうか（ログインユーザー自身のノードを除く）
  const isOtherPersonalSelected = useMemo(() => {
    if (!isPersonalNodeSelected) return false;
    const key = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    // 自分の個人スコープキー: 'personal-{currentUserPersonalKey}'
    return key !== `personal-${currentUserPersonalKey}`;
  }, [isPersonalNodeSelected, selectedNsKey, externalSelectedNsKey, currentUserPersonalKey]);

  const isSysAdminRole = currentUserRole.kind === 'sys_admin';
  const effectiveViewOnly =
    viewOnly ||
    isOtherPersonalSelected ||          // 他ユーザーの個人スコープは閲覧専用（共有機能のみ使用可）
    (isSysAdminRole
      ? false                           // sys_admin: グループ・組織ノードは編集可
      : isOrgGroupNodeSelected && !isRepresentativeOfSelected  // 既存ロジック（変更なし）
    );



  // 選択ノードの祖先ノードの prefix セット（company配下選択時のグレーアウト判定用）
  const ancestorPrefixesForSelected = useMemo((): Set<string> => {
    const key = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    if (!key || !isCompanyNodeSelected) return new Set<string>();
    const ancestorKeys = getAncestorKeys(key, namespaceTree) ?? [];
    const result = new Set<string>();
    for (const aKey of ancestorKeys) {
      // company ルートも含めて祖先ノードの prefix をすべてグレーアウト対象にする
      const node = findNode(aKey, namespaceTree);
      const p = (node as any)?.prefix as string | undefined;
      if (p) result.add(p);
    }
    return result;
  }, [selectedNsKey, externalSelectedNsKey, isCompanyNodeSelected, namespaceTree]);

  // Personal 配下のノードが選択中かどうか（組織共有ボタンの表示判定用）
  const isPersonalSelected = useMemo(() => {
    const key = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    if (!key) return false;
    return getRootKey(key, namespaceTree) === 'personal';
  }, [selectedNsKey, externalSelectedNsKey, namespaceTree]);

  // ログインユーザーの所属組織Prefixを取得
  const currentUserOrgPrefix = useMemo(() => {
    const findPrefix = (key: string, nodes: NamespaceNode[]): string | null => {
      for (const n of nodes) {
        if (n.key === key) return (n as any).prefix ?? null;
        if (n.children) { const r = findPrefix(key, n.children); if (r) return r; }
      }
      return null;
    };
    return findPrefix(currentUserNsKey, namespaceTree);
  }, [currentUserNsKey, namespaceTree]);

  // 共有先が確定されたときに用語をコピーする
  const handleShareToTarget = async (target: ShareTarget) => {
    setShareScopeOpen(false);
    const targetTerms = terms.filter((t) => selectedTermIds.includes(t.id));
    const added: Term[] = [];
    const failed: string[] = [];

    for (const term of targetTerms) {
      try {
        const shareCreateTermRequest: Parameters<typeof createTerm>[0] = {
          prefix:        target.prefix,
          localName:     term.localName,
          displayNameJa: term.displayName,
          description:   term.description,
          typeHint:      term.type,
          unitHint:      term.unitHint,
        };
        const saved = await createTerm(shareCreateTermRequest);
        added.push(saved as Term);
      } catch {
        failed.push(term.localName);
      }
    }

    if (added.length > 0) {
      setTerms((prev) => [...added, ...prev]);
    }
    if (failed.length > 0) {
      message.warning(t('namespaceMain.sharePartialFailure', { saved: String(added.length), failCount: String(failed.length) }));
    } else {
      message.success(t('namespaceMain.shareSuccess', { count: String(added.length), target: target.label }));
    }
    setSelectedTermIds([]);
  };

  // ShareScopeModal 用：選択中ノードの祖先（上位階層）をツリー構造で返す。
  // ロールに応じて表示・活性状態を制御する：
  //   system_admin: 組織ノード含む全祖先を表示・活性
  //   それ以外: 組織ノードは非表示、代表者グループは活性、非代表者グループは非活性（グレー）
  // personal-{userId} 選択時: そのユーザーの所属グループ＋祖先をツリー表示する
  const shareScopeNodes = useMemo(() => {
    const effectiveKey = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    const isSysAdminUser = currentUserRole.kind === 'sys_admin';

    // 選択ノードなし・組織ルートは共有先なし
    if (!effectiveKey || effectiveKey === 'company' || effectiveKey === 'personal') {
      return [];
    }

    // personal-{userId} ノード選択時: そのユーザーの所属グループ＋祖先をツリー表示
    if (effectiveKey.startsWith('personal-')) {
      if (targetUserGroups.length === 0) return [];
      const toScopeNode = (n: NamespaceNode): any => ({
        key: n.key,
        label: n.label,
        selectable: isSysAdminUser ? true : chiefGroupCds.has(n.key),
        children: n.children ? n.children.map(toScopeNode) : undefined,
      });
      // system_admin は組織ノードも表示
      if (isSysAdminUser) {
        return [{
          key: 'company',
          label: t('namespaceTree.company'),
          selectable: true,
          children: targetUserGroups.map(toScopeNode),
        }];
      }
      return targetUserGroups.map(toScopeNode);
    }

    const companyNode = namespaceTree.find((n) => n.key === 'company');
    if (!companyNode) return [];

    // effectiveKey の祖先キーを取得（company 直下から検索し、company 自身を先頭に付加）
    const ancestorKeysUnderCompany = getAncestorKeys(
      effectiveKey,
      companyNode.children ?? [],
      []
    );

    // effectiveKey が namespaceTree 上に見つからない場合
    if (ancestorKeysUnderCompany === null) return [];

    // company 自身を含めた祖先キー配列を構築
    // 例: グループ1-1 → ['company', 'group-1']
    const allAncestorKeys = ['company', ...ancestorKeysUnderCompany];

    // 祖先キー配列をたどり、ネストした ScopeNode ツリーを再帰的に構築
    const buildAncestorTree = (depth: number): any | null => {
      const key = allAncestorKeys[depth];
      if (!key) return null;

      const node = findNode(key, namespaceTree);
      if (!node) return null;

      const child = buildAncestorTree(depth + 1);

      // company ノード: system_admin のみ表示（それ以外はスキップして子を直接返す）
      if (key === 'company') {
        if (!isSysAdminUser) {
          // company 自体は非表示、子（直下グループ）をそのまま返す
          return child;
        }
        // system_admin: 組織ノードを活性で表示
        return {
          key: node.key,
          label: t('namespaceTree.company'),
          selectable: true,
          children: child ? [child] : undefined,
        };
      }

      // グループノード: system_admin は全活性、それ以外は代表者グループのみ活性
      const isSelectable = isSysAdminUser || chiefGroupCds.has(key);
      return {
        key: node.key,
        label: node.label,
        selectable: isSelectable,
        children: child ? [child] : undefined,
      };
    };

    const root = buildAncestorTree(0);
    return root ? [root] : [];
  }, [namespaceTree, selectedNsKey, externalSelectedNsKey, currentUserRole, chiefGroupCds, t, targetUserGroups]);

  // ──── ツリーノードのタイトル（件数は terms から動的計算）
  // companyDepth: 0 = Global/Personal/company ルート、1 = 部門、2 = グループ/チーム（depth 3 相当）
  // showUserHighlight: Global/Personal 選択中でない場合に CURRENT_USER_NS_KEY を薄い青背景で表示
  const renderTreeTitle = useCallback((node: NamespaceNode, companyDepth: number, termCount: number, showUserHighlight: boolean, parentLabel = '') => {
    const isCurrentUserNode = showUserHighlight && node.key === currentUserNsKey;
    // namespaceTree useMemo で既に label: companyLabel || n.label が適用済みなので node.label を直接使う
    const displayLabel = node.label;

    return (
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          ...(isCurrentUserNode ? { background: '#e6f4ff', borderRadius: 4 } : {}),
        }}
      >
        <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <Tag
          color="blue"
          style={{ flex: '0 0 auto', marginLeft: 2, fontSize: 11, lineHeight: '16px', padding: '0 4px', minWidth: 20, textAlign: 'center' }}
        >
          {typeof termCount === 'number' && !isNaN(termCount) ? termCount : 0}
        </Tag>
      </span>
    );
  }, [companyLabel, t, prefixToScopeKeyMap]);

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
      // 静的ツリーに prefix が存在する場合（Global の ns-maiml 等）は従来通り prefix マッチ
      // org group ノード等で prefix が存在しない場合は term.scopeKey と n.key を直接比較して集計する
      const prefixes = collectAllPrefixesUnder(n);
      let termCount: number;
      if (prefixes.size > 0) {
        // 静的ツリーノード（prefix あり）: prefix セットで集計
        termCount = countTermsByPrefix(prefixes, allTerms);
      } else {
        // 動的ノード（org group / personal user）: 自分＋全子孫のキーを収集して合算
        // allTerms の各 term には findAllByOrganization.sql の JOIN により scopeKey が付与されている
        const descendantKeys = new Set<string>();
        const collectKeys = (node: NamespaceNode) => {
          descendantKeys.add(node.key);
          node.children?.forEach(collectKeys);
        };
        collectKeys(n);
        termCount = allTerms.filter((t) => t.scopeKey != null && descendantKeys.has(t.scopeKey)).length;
      }
      return {
        key:   n.key,
        title: renderTreeTitle(n, selfDepth, termCount, showUserHighlight, parentLabel),
        icon:  null,
        // children が undefined の場合はプロパティ自体を含めない
        // （children: undefined が存在すると Ant Design Tree が展開可能ノードとみなしてしまうため）
        ...(n.children
          ? { children: toAntTree(n.children, selfDepth > 0 ? selfDepth + 1 : 0, showUserHighlight, n.label) }
          : {}),
      };
    });

  const treeData = useMemo(() => {
    // namespaceTree は company.children が API データで動的に構築される
    // ロールに応じてツリーをフィルタリングし、所属していない書式を非表示にする
    // Global/Personal が選択されていない時のみ currentUserNsKey を薄い青背景で強調
    const allowedGroupCds = new Set(orgGroups.map((g) => g.organization_group_cd));
    const filteredTree = filterTreeForUser(namespaceTree, currentUserNsKey, currentUserRole, allowedGroupCds);
    const showUserHighlight = !isGlobalOrPersonalSelected;
    return toAntTree(filteredTree, 0, showUserHighlight, '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderTreeTitle, allTerms, isGlobalOrPersonalSelected, namespaceTree, prefixToScopeKeyMap, orgGroups]);

  // treeData の全ノードキーを収集して常に全展開する
  const allTreeKeys = useMemo(() => {
    const collect = (nodes: object[]): string[] =>
      nodes.flatMap((n: any) => [n.key, ...(n.children ? collect(n.children) : [])]);
    return collect(treeData);
  }, [treeData]);

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
    return findInTree(NAMESPACE_TREE_RAW as NamespaceNode[]);
  }, [selectedNsKey, nsNodes]);

  const filteredTerms = useMemo(() => {
    let result = terms;
    // globalOnly=true のときはグローバル prefix のみに絞り込む
    if (globalOnly) {
      const globalPrefixes = new Set(getGlobalPrefixes(NAMESPACE_TREE_RAW as NamespaceNode[]));
      result = result.filter((t) => globalPrefixes.has(t.prefix));
    } else if (effectiveNsKey) {
      const rootKey = getRootKey(effectiveNsKey, NAMESPACE_TREE_RAW as NamespaceNode[]);
      if (rootKey === 'global') {
        // Global ノード（またはその配下）が選択されている場合: グローバル prefix のみ表示
        const globalPrefixes = new Set(getGlobalPrefixes(NAMESPACE_TREE_RAW as NamespaceNode[]));
        result = result.filter((t) => globalPrefixes.has(t.prefix));
      } else {
        // 組織ノード（company/部門/チーム）が選択されている場合:
        // getRelatedPrefixes はグローバル prefix を含まないため、そのまま使用
        const relatedPrefixes = getRelatedPrefixes(effectiveNsKey);
        if (relatedPrefixes.size > 0) {
          result = result.filter((t) => relatedPrefixes.has(t.prefix));
        }
      }
    } else {
      // ノード未選択時: グローバルデータを除外（自チームのデータのみ表示）
      const globalPrefixes = new Set(getGlobalPrefixes(NAMESPACE_TREE_RAW as NamespaceNode[]));
      result = result.filter((t) => !globalPrefixes.has(t.prefix));
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
      { value: '', label: t('namespaceMain.prefixFilterAll') },
      ...[...prefixSet].sort().map((p) => ({ value: p, label: p })),
    ];
  }, [terms, effectiveNsKey]);

  // Prefix プルダウン選択肢（DBから取得したグローバルPrefix除外済みの一覧）
  // ボタン活性判定にも使用する
  const availablePrefixOptions = useMemo(() => {
    return dbPrefixes
      .filter((p) => p)
      .map((p) => ({ value: p, label: p }))
      .filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i);
  }, [dbPrefixes]);

  // データ型フィルター選択肢
  const typeFilterOptions = useMemo(() => [
    { value: '', label: t('namespaceMain.typeFilterAll') },
    { value: 'stringType',   label: 'stringType' },
    { value: 'intType',      label: 'intType' },
    { value: 'floatType',    label: 'floatType' },
    { value: 'booleanType',  label: 'booleanType' },
    { value: 'dateTimeType', label: 'dateTimeType' },
    { value: 'uriType',      label: 'uriType' },
  ], [t]);

  // 単位フィルター選択肢（属性テーブルから取得）
  const unitFilterOptions = useMemo(() => [
    { value: '', label: t('namespaceMain.unitFilterAll') },
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
      { value: '', label: t('namespaceMain.scopeFilterAll') },
      ...[...prefixSet].sort().map((p) => {
        const label = prefixScopeNameMap.get(p) ?? p;
        return { value: p, label };
      }),
    ];
  }, [terms, effectiveNsKey, prefixScopeNameMap]);

  const handleToggleTermActive = (termId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    const term = terms.find((tt) => tt.id === termId);
    if (!term) return;

    const doToggle = async () => {
      try {
        await toggleTermActive(term.prefix, term.localName, nextActive);
        setTerms((prev) =>
          prev.map((tt) => tt.id === termId ? { ...tt, isActive: nextActive } : tt)
        );
        message.success(
          nextActive
            ? t('namespaceMain.activateSuccess')
            : t('namespaceMain.deactivateSuccess')
        );
      } catch {
        message.error(t('namespaceMain.updateError', { detail: '' }));
      }
    };

    // 非アクティブにする場合のみ確認ダイアログを表示
    if (currentActive) {
      const label = `${term.prefix}:${term.localName}`;
      Modal.confirm({
        title: t('namespaceMain.deactivateConfirmTitle', { label }),
        content: t('namespaceMain.deactivateConfirmContent'),
        okText: t('namespaceMain.deactivate'),
        cancelText: t('namespaceMain.cancel'),
        okButtonProps: { danger: true },
        onOk: doToggle,
      });
    } else {
      doToggle();
    }
  };

  const handleBulkToggleActive = (targetIds: string[]) => {
    const count = targetIds.length;
    Modal.confirm({
      title: t('namespaceMain.bulkDeactivateTitle'),
      content: t('namespaceMain.bulkDeactivateContent', { count: String(count) }),
      okText: t('namespaceMain.deactivate'),
      cancelText: t('namespaceMain.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        const succeeded: string[] = [];
        for (const termId of targetIds) {
          const term = terms.find((tt) => tt.id === termId);
          if (!term) continue;
          try {
            await toggleTermActive(term.prefix, term.localName, false);
            succeeded.push(termId);
          } catch {
            // 失敗した term はスキップ
          }
        }
        if (succeeded.length > 0) {
          setTerms((prev) =>
            prev.map((tt) => succeeded.includes(tt.id) ? { ...tt, isActive: false } : tt)
          );
        }
        setSelectedTermIds([]);
        message.success(t('namespaceMain.bulkDeactivateSuccess', { count: String(succeeded.length) }));
      },
    });
  };

  const handleTermSaved = (updated: TermSaved) => {
    setTerms((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    setModalOpen(false);
  };

  const handleCsvDownload = () => {
    if (selectedTermIds.length === 0) {
      message.error(t('termManagement.csv.exportSelectAtLeastOne'));
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
        if (lines.length < 2) { message.error(t('namespaceMain.csvEmpty2')); return; }

        // CSV パース（parseCsvLine: RFC 4180 準拠、クォートあり・なし・空列・"" エスケープ対応）
        const rows: TermCsvParsedRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          if (cols.length < 6) continue;
          const [, prefix, localName, displayName, description, type, unitHint] = cols;
          if (!prefix) continue;
          if (!localName) continue;
          rows.push({
            prefix:        prefix        ?? '',
            localName:     localName     ?? '',
            displayName:   displayName   ?? '',
            displayNameEn: '',
            description:   description   ?? '',
            type:          type          ?? 'stringType',
            unitHint:      unitHint      ?? '',
          });
        }

        if (rows.length === 0) { message.error(t('namespaceMain.csvNoData2')); return; }

        // 各行を API で DB に保存
        const added: Term[] = [];
        const failed: string[] = [];

        for (const row of rows) {
          try {
            const csvTermRequest: Parameters<typeof createTerm>[0] = {
              prefix:        row.prefix,
              localName:     row.localName,
              displayNameJa: row.displayName,
              description:   row.description,
              typeHint:      row.type || 'stringType',
              unitHint:      row.unitHint,
            };
            const saved = await createTerm(csvTermRequest);
            added.push(saved as Term);
          } catch {
            failed.push(row.localName);
          }
        }

        if (added.length > 0) {
          setTerms((prev) => [...prev, ...added]);
        }
        if (failed.length > 0) {
          message.warning(t('namespaceMain.csvImportPartial2', { saved: added.length.toString(), failCount: failed.length.toString(), names: failed.slice(0, 3).join(', ') + (failed.length > 3 ? '...' : '') }));
        } else {
          message.success(t('namespaceMain.csvImportSuccess2', { count: added.length.toString() }));
        }
      } catch {
        message.error(t('namespaceMain.csvParseError2'));
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
    // システム名前空間（Alchemia）の行は操作不可
    const isSystemNs = record.prefix === SYSTEM_NAMESPACE_PREFIX;
    // 編集ボタン用: 非アクティブ時・読み取り専用時・システムNS時は編集不可
    const readonlyEdit =
      isSystemNs ||
      record.isActive === false ||
      (isCompanyNodeSelected && ancestorPrefixesForSelected.has(record.prefix)) ||
      (!isCompanyNodeSelected && isReadonlyPrefix(record.prefix)) ||
      effectiveViewOnly;
    // アクティブ切り替えボタン用: 読み取り専用時・システムNS時は操作不可（非アクティブ行のアクティブ化は許可）
    const readonlyToggle =
      isSystemNs ||
      (isCompanyNodeSelected && ancestorPrefixesForSelected.has(record.prefix)) ||
      (!isCompanyNodeSelected && isReadonlyPrefix(record.prefix)) ||
      effectiveViewOnly;
    if (`${record.prefix}:${record.localName}` === editingTermId) {
      return (
        <span style={{ display: 'flex', gap: 4 }}>
          <Button type="primary" size="small" onClick={saveEditTerm}>✔ {t('namespaceMain.actionSave')}</Button>
          <Button size="small" onClick={cancelEditTerm}>{t('namespaceMain.actionCancel')}</Button>
        </span>
      );
    }
    if (isSystemNs) {
      return (
        <Tooltip title={t('namespaceMain.systemNamespaceTooltip')}>
          <Tag color="default">{t('namespaceMain.systemNamespaceBadge')}</Tag>
        </Tooltip>
      );
    }
    return (
      <span style={{ display: 'flex', gap: 4 }}>
        <Button size="small" icon={<EditOutlined />} disabled={readonlyEdit} onClick={() => !readonlyEdit && startEditTerm(record)}>{t('namespaceMain.actionEdit')}</Button>
        <Button
          size="small"
          danger={!readonlyToggle && record.isActive !== false}
          disabled={readonlyToggle}
          onClick={() => !readonlyToggle && handleToggleTermActive(record.id, record.isActive !== false)}
          style={{ minWidth: '90px' }}
        >
          {record.isActive !== false ? t('namespaceMain.actionDeactivate') : t('namespaceMain.actionActivate')}
        </Button>
      </span>
    );
  };

  const typeOptions = [
    { value: 'stringType',   label: 'stringType' },
    { value: 'intType',      label: 'intType' },
    { value: 'floatType',    label: 'floatType' },
    { value: 'booleanType',  label: 'booleanType' },
    { value: 'dateTimeType', label: 'dateTimeType' },
    { value: 'uriType',      label: 'uriType' },
  ];

  const columns: TableColumnsType<Term | NewTermRow> = [
    {
      title: 'Prefix', dataIndex: 'prefix', key: 'prefix_col', width: 140,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as Term).prefix.localeCompare((b as Term).prefix);
      },
      defaultSortOrder: 'ascend',
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          const r = record as NewTermRow;
          return (
            <Select
              size="small"
              style={{ width: '100%' }}
              value={r.prefix || undefined}
              placeholder={t('namespaceMain.prefixSelectPlaceholder')}
              allowClear
              options={availablePrefixOptions}
              onChange={(val) => updateNewTerm(r._rowId, 'prefix', val ?? '')}
            />
          );
        }
        const term = record as Term;
        return term.id === editingTermId
          ? <Input disabled size="small" value={editingValues.prefix} />
          : <Text strong>{term.prefix}</Text>;
      },
    },
    {
      title: t('namespaceMain.colLocalName'), dataIndex: 'localName', key: 'localName', width: 160,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as Term).localName.localeCompare((b as Term).localName);
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          const r = record as NewTermRow;
          return (
            <div>
              <Input
                size="small"
                placeholder={t('namespaceMain.localNamePlaceholder')}
                value={r.localName}
                status={r._isDuplicate ? 'error' : undefined}
                onChange={(e) => updateNewTerm(r._rowId, 'localName', e.target.value)}
              />
              {r._isDuplicate && (
                <div style={{ color: '#ff4d4f', fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>
                  <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                  {t('namespaceMain.duplicateRegistered', { prefix: r.prefix, localName: r.localName })}
                </div>
              )}
            </div>
          );
        }
        const term = record as Term;
        return term.id === editingTermId
          ? <Input size="small" value={editingValues.localName} onChange={(e) => setEditingValues((p) => ({ ...p, localName: e.target.value }))} />
          : term.localName;
      },
    },
    {
      title: t('namespaceMain.colDisplayName'), dataIndex: 'displayName', key: 'displayName', width: 130,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as Term).displayName.localeCompare((b as Term).displayName);
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          return <Input size="small" placeholder={t('namespaceMain.displayNamePlaceholder')} value={record.displayName} onChange={(e) => updateNewTerm(record._rowId, 'displayName', e.target.value)} />;
        }
        const term = record as Term;
        return term.id === editingTermId
          ? <Input size="small" value={editingValues.displayName} onChange={(e) => setEditingValues((p) => ({ ...p, displayName: e.target.value }))} />
          : term.displayName;
      },
    },
    {
      title: t('namespaceMain.colDescription'), dataIndex: 'description', key: 'description', width: 180, ellipsis: true,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as Term).description.localeCompare((b as Term).description);
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          return <Input size="small" placeholder={t('namespaceMain.descriptionPlaceholder')} value={record.description} onChange={(e) => updateNewTerm(record._rowId, 'description', e.target.value)} />;
        }
        const term = record as Term;
        return term.id === editingTermId
          ? <Input size="small" value={editingValues.description} onChange={(e) => setEditingValues((p) => ({ ...p, description: e.target.value }))} />
          : term.description;
      },
    },
    {
      title: t('namespaceMain.colScope'), key: 'scope', width: 180, align: 'center' as const,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        const sA = prefixScopeNameMap.get((a as Term).prefix) ?? '';
        const sB = prefixScopeNameMap.get((b as Term).prefix) ?? '';
        return sA.localeCompare(sB);
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) return <span style={{ color: '#bbb' }}>—</span>;
        const term = record as Term;
        const globalPrefixSet = new Set(getGlobalPrefixes(NAMESPACE_TREE_RAW as NamespaceNode[]));
        const isGlobal = globalPrefixSet.has(term.prefix);
        // Prefix管理タブと共通の prefixScopeNameMap（正しいJOIN結果）を優先して使用する
        // term.scopeName は findAllByOrganization.sql の JOIN が誤っている場合があるためフォールバック扱い
        const label = isGlobal ? 'Global' : (prefixScopeNameMap.get(term.prefix) || term.scopeName || '—');
        return (
          <Tooltip title={label}>
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
      title: t('namespaceMain.colType'), dataIndex: 'type', key: 'type', width: 140, align: 'center' as const,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return (a as Term).type.localeCompare((b as Term).type);
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          return (
            <Select size="small" style={{ width: '100%' }} value={record.type || undefined} placeholder={t('namespaceMain.typeSelectPlaceholder')}
              onChange={(val) => updateNewTerm(record._rowId, 'type', val)} options={typeOptions} />
          );
        }
        const term = record as Term;
        return term.id === editingTermId
          ? <Select size="small" style={{ width: '100%' }} value={editingValues.type || undefined} onChange={(val) => setEditingValues((p) => ({ ...p, type: val }))} options={typeOptions} />
          : <Tag style={{ fontSize: 11, color: '#555', background: '#f5f5f5', borderColor: '#e8e8e8' }}>{term.type}</Tag>;
      },
    },
    {
      title: t('namespaceMain.colUnit'), dataIndex: 'unitHint', key: 'unitHint', width: 100,
      sorter: (a, b) => {
        if ('_rowId' in a || '_rowId' in b) return 0;
        return ((a as Term).unitHint ?? '').localeCompare(((b as Term).unitHint ?? ''));
      },
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          return (
            <Select size="small" style={{ width: '100%' }} allowClear
              value={record.unitHint || undefined} placeholder={t('namespaceMain.unitSelectPlaceholder')}
              options={unitAttributes.map((u) => ({ value: u, label: u }))}
              onChange={(val) => updateNewTerm(record._rowId, 'unitHint', val ?? '')} />
          );
        }
        const term = record as Term;
        return term.id === editingTermId
          ? (
            <Select size="small" style={{ width: '100%' }} allowClear
              value={editingValues.unitHint || undefined}
              options={unitAttributes.map((u) => ({ value: u, label: u }))}
              onChange={(val) => setEditingValues((p) => ({ ...p, unitHint: val ?? '' }))} />
          )
          : term.unitHint ?? '';
      },
    },
    {
      title: (
        <Tooltip title={t('namespaceMain.createDirectiveTermTooltip')}>
          {t('namespaceMain.colCreateDirectiveTerm')}
        </Tooltip>
      ),
      key: 'createDirectiveTerm',
      width: 90,
      align: 'center' as const,
      render: (_: unknown, record: Term | NewTermRow) => {
        if ('_rowId' in record) {
          const r = record as NewTermRow;
          return (
            <Checkbox
              checked={!!r.createDirectiveTerm}
              disabled={!r.localName}
              onChange={(e) => updateNewTerm(r._rowId, 'createDirectiveTerm', e.target.checked)}
            />
          );
        }
        const term = record as Term;
        return term.hasDirectiveTerm
          ? <Tag color="blue" style={{ fontSize: 11 }}>{t('namespaceMain.hasDirectiveTermBadge')}</Tag>
          : null;
      },
    },
    {
      title: t('namespaceMain.colActions'), key: 'actions', width: 180,
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
      <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── 左ペイン：名前空間ツリー（hideTree=true / globalOnly=true のとき非表示） ── */}
        {!hideTree && !globalOnly && (
          <div style={{
            width: '30%', minWidth: 280, maxWidth: 420,
            background: '#fafafa', borderRight: '1px solid #f0f0f0',
            overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '12px 12px 8px',
          }}>
            <Tree
              treeData={treeData}
              expandedKeys={allTreeKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              selectedKeys={selectedNsKey ? [selectedNsKey] : []}
              style={{ background: 'transparent', minWidth: 'max-content' }}
              onSelect={(keys) => {
                const key = (keys[0] as string) ?? null;
                // 全ノード選択可（company含む）
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
                    setGroupAddParentLabel(t('namespaceMain.groupAddParentLabelDefault'));
                    setGroupAddOpen(true);
                    setCtxMenu((s) => ({ ...s, visible: false }));
                  }}
                >
                  <PlusOutlined style={{ fontSize: 12, color: '#52c41a' }} />
                  {t('namespaceMain.ctxMenuAddGroup')}
                </li>
                <li
                  style={{ padding: '6px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { handleContextEditGroup(ctxMenu.node!); setCtxMenu((s) => ({ ...s, visible: false })); }}
                >
                  <EditOutlined style={{ fontSize: 12, color: '#1677ff' }} />
                  {t('namespaceMain.ctxMenuEdit')}
                </li>
              </ul>
            )}
          </div>
        )}

        {/* ── 右ペイン：用語リスト / グローバルノード選択時は GlobalNamespaceView ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 40px', background: '#fafafa' }}>
          {isGlobalNodeSelected ? (
            <GlobalNamespaceView viewOnly={true} />
          ) : (
          <>
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
              <Button
                onClick={() => setShareScopeOpen(true)}
                style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
              >
                {t('namespaceMain.shareBtnLabel', { count: String(selectedTermIds.length) })}
              </Button>
              <Button danger onClick={() => handleBulkToggleActive(selectedTermIds)}>
                {t('namespaceMain.bulkDeactivateBtnLabel', { count: String(selectedTermIds.length) })}
              </Button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 2 }}>
            <Input
              prefix={<SearchOutlined />} placeholder={t('namespaceMain.searchPlaceholder')} allowClear
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
              options={typeFilterOptions}
              onChange={(val) => { setFilterType(val || null); setCurrentPage(1); }}
            />
            <Select
              style={{ width: 140, flexShrink: 0 }}
              value={filterUnit ?? ''}
              options={unitFilterOptions}
              onChange={(val) => { setFilterUnit(val || null); setCurrentPage(1); }}
            />
            <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />
            <Button disabled={effectiveViewOnly} onClick={() => csvInputRef.current?.click()}>{t('namespaceMain.btnImport')}</Button>
            <Button disabled={effectiveViewOnly} onClick={handleCsvDownload}>{t('namespaceMain.btnExport')}</Button>
            <Tooltip title={!effectiveViewOnly && availablePrefixOptions.length === 0 ? t('namespaceMain.noPrefixTooltip') : ''}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={effectiveViewOnly || availablePrefixOptions.length === 0}
                onClick={handleAddRow}
              >
                {t('namespaceMain.btnAddTerm')}
              </Button>
            </Tooltip>
            <Tooltip title={newTerms.some((r) => r._isDuplicate) ? t('namespaceMain.duplicateTooltip') : ''}>
              <Button type="primary" onClick={handleAddSave} disabled={effectiveViewOnly || newTerms.length === 0 || newTerms.some((r) => r._isDuplicate)}>
                {t('namespaceMain.btnSave')}
              </Button>
            </Tooltip>
            <Button onClick={() => setNewTerms([])} disabled={effectiveViewOnly || newTerms.length === 0}>
              {t('namespaceMain.btnCancel')}
            </Button>
          </div>

          {(() => {
            const tablePagination = {
              current: currentPage, pageSize, showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100'],
              showTotal: (total: number) => t('namespaceMain.showTotal', { total: String(total) }),
              onChange: (page: number, size: number) => { setCurrentPage(page); setPageSize(size); },
              onShowSizeChange: (_: number, size: number) => { setCurrentPage(1); setPageSize(size); },
            };
            const tableRowSelection = {
              type: 'checkbox' as const, selectedRowKeys: selectedTermIds,
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
              onChange: (keys: React.Key[]) => setSelectedTermIds(keys as string[]),
              getCheckboxProps: (record: Term | NewTermRow) => ({ disabled: '_rowId' in record }),
            };
            return (
              <Table<Term | NewTermRow>
                rowKey={(record) => '_rowId' in record ? (record as NewTermRow)._rowId : (record as Term).id}
                size="small"
                loading={termsLoading}
                columns={visibleColumns}
                dataSource={tableData}
                rowClassName={(record) => {
                  if ('_rowId' in record) return 'row-new-term';
                  const term = record as Term;
                  // 非アクティブ用語行（グレーアウト）
                  if (!term.isActive) return 'row-inactive-term';
                  // company配下ノード選択時: 選択ノードの祖先prefixはグレーアウト
                  if (isCompanyNodeSelected && ancestorPrefixesForSelected.has(term.prefix)) return 'row-readonly-scope';
                  // company配下ノード以外が選択されている場合のみ isReadonlyPrefix を適用
                  if (!isCompanyNodeSelected && isReadonlyPrefix(term.prefix)) return 'row-readonly-scope';
                  return '';
                }}
                locale={{ triggerAsc: t('namespaceMain.sortAsc'), triggerDesc: t('namespaceMain.sortDesc'), cancelSort: t('namespaceMain.cancelSort') }}
                pagination={tablePagination}
                rowSelection={tableRowSelection}
              />
            );
          })()}
          </>
          )}
        </div>
      </div>

      {/* ── 組織追加ダイアログ ── */}
      <NamespaceAddDialog
        open={addDialogOpen}
        onClose={() => { setAddDialogOpen(false); setAddChildParentKey(null); }}
        onRegistered={async (values) => {
          try {
          const createNamespaceRequest: Parameters<typeof createNamespace>[0] = {
              prefix:      values.prefix,
              uri:         values.uri,
              displayName: values.displayName || undefined,
              description: values.description || undefined,
              // グローバルレベル以外の場合は選択中ノードキーをスコープキーとして渡す
              scopeKey:    values.level !== 'global' ? (effectiveNsKey ?? undefined) : undefined,
            };
          const result = await createNamespace(createNamespaceRequest);
            const newNode: FlatNsNode = {
              key: result.namespaceId,
              prefix: result.prefix,
              uri: result.uri,
              level: values.level,
              termCount: 0,
              displayName: values.displayName || undefined,
              description: values.description || undefined,
            };
            setNsNodes((prev) => [...prev, newNode]);
            message.success(t('namespaceMain.nsRegisterSuccess', { prefix: result.prefix }));
          } catch (err: any) {
            const msg = err?.response?.data?.error?.message ?? err?.message ?? t('namespaceMain.nsRegisterSuccess');
            message.error(msg);
          } finally {
            setAddDialogOpen(false);
            setAddChildParentKey(null);
          }
        }}
      />

      {/* ── グループ追加ダイアログ ── */}
      <GroupAddDialog
        open={groupAddOpen}
        onClose={() => setGroupAddOpen(false)}
        onCreated={(_groupCd, groupName) => {
          message.success(t('namespaceMain.groupCreated', { groupName }));
          setGroupAddOpen(false);
        }}
      />


      {/* ── グループ編集ダイアログ（メンバー追加）── */}
      <GroupEditDialog
        open={groupEditOpen}
        groupLabel={groupEditLabel}
        groupCd={groupEditGroupCd}
        onClose={() => setGroupEditOpen(false)}
        onSaved={(members, newGroupName) => {
          const name = newGroupName ?? groupEditLabel;
          message.success(t('namespaceMain.memberUpdated', { name, count: members.length.toString() }));
        }}
      />


      {/* ── 共有先選択モーダル ── */}
      <ShareScopeModal
        open={shareScopeOpen}
        termCount={selectedTermIds.length}
        sourceRole={{ kind: 'sys_admin' }}
        scopeNodes={shareScopeNodes}
        onClose={() => setShareScopeOpen(false)}
        onShare={(target) => {
          handleShareToTarget(target);
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
        .row-readonly-scope td { background: #f5f5f5 !important; opacity: 0.55; pointer-events: none; }
        .row-inactive-term td { color: #bbb !important; background: #f0f0f0 !important; }
      `}</style>
      </div>
    </div>
  );
};

export default NamespaceMain;
