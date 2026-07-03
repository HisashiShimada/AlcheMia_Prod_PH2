/**
 * 名前空間管理機能の型定義
 *
 * @remarks
 * frontend/src/components/namespace/ 配下のコンポーネントで使用する型を集約
 */

// ──────────────────────────────────────────────
// ツリーノード
// ──────────────────────────────────────────────

/**
 * 名前空間ツリーノード（uncertainty-scope.json の構造に対応）
 */
export interface NamespaceNode {
  key: string;
  label: string;
  count: number;
  icon: string;
  children?: NamespaceNode[];
}

/**
 * スコープツリーノード（getScopeFullPath 用）
 */
export type ScopeTreeNode = {
  key: string;
  label: string;
  icon?: string;
  prefix?: string;
  children?: ScopeTreeNode[];
};

/**
 * 生ノード（JSON から読み込んだツリー構造）
 * PrefixManagement / DepartmentTreeManagement / DepartmentNodeAddDialog で共用
 */
export interface RawNode {
  key: string;
  label: string;
  count?: number;
  icon?: string;
  prefix?: string;
  uri?: string;
  description?: string;
  children?: RawNode[];
}

// ──────────────────────────────────────────────
// フラット化ノード
// ──────────────────────────────────────────────

/**
 * NamespaceMain のテーブル表示用フラット化ノード
 */
export interface FlatNsNode {
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

/**
 * DepartmentTreeManagement のテーブル表示用フラット化行
 */
export interface FlatDeptRow {
  key: string;
  label: string;
  prefix: string;
  uri: string;
  description: string;
  parentKey: string | null;
  parentLabel: string;
  depth: number;
}

// ──────────────────────────────────────────────
// 用語（Term）
// ──────────────────────────────────────────────

/**
 * 名前空間用語
 */
export interface Term {
  id: string;
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
  unitHint?: string;
  isActive?: boolean;
}

/**
 * 用語の新規入力行（テーブルインライン入力用）
 */
export interface NewTermRow {
  /** 一時ID（テーブル行のkey用） */
  _rowId: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
  unitHint: string;
}

/**
 * 詳細モーダルから返される用語保存後データ
 */
export interface TermSaved {
  id: string;
  displayName: string;
  description: string;
  type: string;
}

/**
 * モックデータ読み込み用 生用語データ
 */
export interface RawTerm {
  id: string;
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
}

/**
 * モックデータ読み込み用 生用語詳細データ
 */
export interface RawDetail {
  qname: string;
  localName: string;
  namespacePrefix: string;
  namespaceUri: string;
  level: string;
  displayNameJa: string;
  displayNameEn: string;
  description: string;
  typeHint: string;
  unitHint: string | null;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────
// プレフィックス（Prefix）
// ──────────────────────────────────────────────

/**
 * プレフィックス管理テーブル行
 */
export interface PrefixRow {
  id: string;
  prefix: string;
  description: string;
  /** ノードの階層ラベルパス（スコープ列表示用） */
  scopePath: string;
  isActive?: boolean;
}

/**
 * プレフィックスの新規入力行（テーブルインライン入力用）
 */
export interface NewPrefixRow {
  _rowId: string;
  prefix: string;
  description: string;
}

// ──────────────────────────────────────────────
// チーム・メンバー
// ──────────────────────────────────────────────

/**
 * チームメンバー
 */
export interface TeamMember {
  userId: string;
  userName: string;
  departmentUnitId: string | null;
}

/**
 * チーム
 */
export interface Team {
  departmentUnitId: string;
  unitName: string;
  /** 所属部署名 */
  departmentName?: string;
  /** チームの代表者（作成者） */
  ownerName: string;
  nsPrefix?: string;
  nsUri?: string;
  nsDisplayName?: string;
  members: TeamMember[];
}

/**
 * 組織ユーザー（チーム追加ダイアログ用）
 */
export interface OrgUser {
  userId: string;
  userName: string;
  departmentUnitId: string | null;
}

// ──────────────────────────────────────────────
// 共有機能
// ──────────────────────────────────────────────

/**
 * 共有元のロール
 */
export type ShareSourceRole =
  | { kind: 'sys_admin' }
  | { kind: 'dept_owner'; deptKey: string; deptLabel: string }
  | { kind: 'team_owner'; teamKey: string; teamLabel: string };

/**
 * 共有先として選択されたノード情報
 */
export interface ShareTarget {
  key: string;
  label: string;
  prefix: string;
}

/**
 * ツリーノード（共有先選択用）
 */
export interface ScopeNode {
  key: string;
  label: string;
  prefix?: string;
  icon?: React.ReactNode;
  selectable?: boolean;
  children?: ScopeNode[];
}

// ──────────────────────────────────────────────
// 詳細モーダル
// ──────────────────────────────────────────────

/**
 * DetailModal の表示対象の判別型
 */
export type DetailTarget =
  | { kind: 'term'; termId: string }
  | {
      kind: 'namespace';
      nsKey: string;
      prefix: string;
      uri: string;
      level: 'global' | 'organization' | 'personal';
      termCount: number;
      displayName?: string;
      description?: string;
      createdAt?: string;
      updatedAt?: string;
    };

/**
 * 詳細モーダルから返される名前空間保存後データ
 */
export interface NamespaceSaved {
  key: string;
  prefix: string;
  uri: string;
  displayName: string;
  description: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────
// 名前空間フォーム
// ──────────────────────────────────────────────

/**
 * 名前空間のレベル種別
 */
export type Level = 'global' | 'organization' | 'personal';

/**
 * 名前空間追加ダイアログのフォーム値
 */
export interface NamespaceFormValues {
  level: Level;
  prefix: string;
  uri: string;
  displayName: string;
  description: string;
  parentNamespace: string | null;
}

// ──────────────────────────────────────────────
// ユーザーロール
// ──────────────────────────────────────────────

/**
 * 名前空間ツリーにおけるログインユーザーのロール
 */
export type UserNsRole =
  | { kind: 'sys_admin' }
  | { kind: 'dept_owner'; deptKey: string }
  | { kind: 'team_owner'; teamKey: string }
  | { kind: 'member'; nsKey: string };

// ──────────────────────────────────────────────
// その他
// ──────────────────────────────────────────────

/**
 * 属性マスター（単位一覧取得用）
 */
export interface AttributeMaster {
  attributeName: string;
  attributeValue: string;
  isActive: boolean;
}

// ──────────────────────────────────────────────
// NamespaceMaimlEditor 専用
// ──────────────────────────────────────────────

/**
 * NamespaceMaimlEditor のセクションキー
 */
export type SectionKey = 'global' | 'organization' | 'department' | 'team' | 'personal';

/**
 * NamespaceMaimlEditor の名前空間アイテム行
 */
export interface NsItem {
  key: string;
  prefix: string;
  uri: string;
  order: number;
  auto: boolean;
  sectionKey: SectionKey;
  /** 部署名・チーム名・ユーザー名 */
  groupLabel: string;
  /** セクションヘッダー行に表示するURI */
  groupUri: string;
  deleted: boolean;
}

/**
 * NamespaceMaimlEditor 用スコープノード
 * （uncertainty-scope.json の構造に対応。ScopeNode より多くのフィールドを持つ）
 */
export interface MaimlScopeNode {
  key: string;
  label: string;
  count: number;
  icon?: string;
  prefix?: string;
  uri?: string;
  description?: string;
  /** 組織ノードが持つ複数の名前空間定義 */
  namespaces?: { key: string; prefix: string; uri: string }[];
  children?: MaimlScopeNode[];
}
