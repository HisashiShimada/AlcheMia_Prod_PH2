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
  icon?: string;
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
 * CSVインポート時の1行パース結果
 */
export interface TermCsvParsedRow {
  prefix: string;
  localName: string;
  displayName: string;
  displayNameEn: string;
  description: string;
  type: string;
  unitHint: string;
}

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
  /** prefix に対応するスコープ名（organization_group_name または user_name） */
  scopeName?: string;
  /**
   * prefix が属する名前空間のスコープキー（organization_group_cd またはユーザーID）
   * ツリーの用語数バッジ計算に使用する
   * グローバル名前空間の場合は null
   */
  scopeKey?: string | null;
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
  /** true のとき同一 prefix:localName が既に登録されている（重複エラー表示用） */
  _isDuplicate?: boolean;
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
  displayNameEn?: string;
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
  /** 選択ノードの祖先スコープの行かどうか（グレーアウト表示用） */
  _isAncestor?: boolean;
}

/**
 * プレフィックスの新規入力行（テーブルインライン入力用）
 */
export interface NewPrefixRow {
  _rowId: string;
  prefix: string;
  description: string;
}

// チーム・メンバー関連の型は team.ts に移行済み
// 後方互換性のため re-export する
export type { TeamMember, Team, OrgUser } from '@/types/team';


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
  | { kind: 'team_owner'; teamKey: string; teamKeys?: string[] }
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
// コンポーネント Props
// ──────────────────────────────────────────────

/**
 * NamespaceAddDialog の Props
 */
export interface NamespaceAddDialogProps {
  open: boolean;
  onClose: () => void;
  onRegistered: (values: NamespaceFormValues) => void;
}

/**
 * PrefixManagement の Props
 */
export interface PrefixManagementProps {
  /** trueのとき Global 配下のPrefixのみ表示・操作可能 */
  globalOnly?: boolean;
  /** trueのとき「組織に共有」ボタンを表示する（実験管理者メニューのみ true を渡す） */
  showShareButton?: boolean;
  /** trueのとき閲覧モード（検索・フィルター以外のボタンを非活性） */
  viewOnly?: boolean;
  /** 外部から渡される選択中の名前空間ノードキー（左ツリー連動用） */
  selectedNsKey?: string | null;
  /**
   * 新規 Prefix を登録する際の公開スコープキー
   * DB の namespace.scope_key カラムに保存される
   * null/undefined のとき scope_key は NULL（全体公開）
   */
  scopeKey?: string | null;
  /**
   * 組織（company）ノード配下の全 organization_group_cd 一覧
   * company ノード選択時に scopeKeys として渡すことで配下全グループの Prefix を取得する
   * NamespaceMain から渡される（用語管理タブと同じ挙動を実現するために必要）
   */
  orgGroupCds?: string[];
}

/**
 * PrefixManagement のインライン編集値
 */
export interface PrefixEditValues {
  prefix: string;
  description: string;
}

/**
 * PrefixManagement のインライン編集値（URI付き）
 *
 * @remarks
 * PrefixManagement.tsx の既存行編集時に使用する一時的な入力値を保持する
 */
export interface PrefixEditValuesWithUri {
  prefix: string;
  uri: string;
  description: string;
}

/**
 * PrefixManagement コンポーネント内部のテーブル行
 *
 * @remarks
 * namespace.ts の PrefixRow（scopePath/isActive 等を持つ）とは別に、
 * PrefixManagement.tsx の内部テーブル表示用に uri フィールドを持つ行型
 */
export interface PrefixRowLocal {
  /** prefix を id として使用 */
  id: string;
  prefix: string;
  uri: string;
  description?: string;
  /** アクティブ状態（true: アクティブ、false: 非アクティブ） */
  isActive?: boolean;
}

/**
 * PrefixManagement の新規入力行（テーブルインライン入力用・URI付き）
 *
 * @remarks
 * PrefixManagement.tsx の新規行追加時に使用する入力行型（uri フィールドあり）
 */
export interface NewPrefixRowLocal {
  _rowId: string;
  prefix: string;
  uri: string;
  description: string;
}

/**
 * PrefixManagement の CSV インポート解析行
 */
export interface PrefixCsvParsedRow {
  prefix: string;
  description: string;
}

/**
 * DetailModal の Props
 */
export interface DetailModalProps {
  open: boolean;
  target: DetailTarget | null;
  onClose: () => void;
  onTermSaved: (updated: TermSaved) => void;
  onNamespaceSaved: (updated: NamespaceSaved) => void;
}

/**
 * ShareScopeModal の Props
 */
export interface ShareScopeModalProps {
  open: boolean;
  /** 共有する用語の件数 */
  termCount: number;
  /** ログインユーザーのロール（共有先の範囲を制限するため） */
  sourceRole: ShareSourceRole;
  /** 共有先ツリーデータ（NamespaceMain から渡す） */
  scopeNodes: ScopeNode[];
  onClose: () => void;
  /** 共有先が確定されたときのコールバック */
  onShare: (target: ShareTarget) => void;
}

// TeamAddDialogProps / TeamEditDialogProps は team.ts に移行済み
export type { TeamAddDialogProps, TeamEditDialogProps } from '@/types/team';


/**
 * DepartmentNodeAddDialog のツリーノード
 */
export interface DeptTreeNode {
  key: string;
  label: string;
  prefix?: string;
  uri?: string;
  description?: string;
  parentKey: string | null;
  children?: DeptTreeNode[];
}

/**
 * DepartmentNodeAddDialog の Props
 */
export interface DepartmentNodeAddDialogProps {
  open: boolean;
  /** 親ノード候補（会社ノード＋既存部署ノード） */
  parentOptions: { value: string; label: string; departmentCd?: string }[];
  /** ログイン組織CD（URI自動生成に使用） */
  organizationCd?: string;
  onClose: () => void;
  onCreated: (node: DeptTreeNode) => void;
}

// ──────────────────────────────────────────────
// ExperimentAdminNav
// ──────────────────────────────────────────────

/**
 * 実験管理者ナビゲーションのアクティブタブ識別子
 */
export type ExperimentAdminNavTab = 'project' | 'format' | 'progress' | 'namespace' | null;

/**
 * ExperimentAdminNav コンポーネントの Props
 */
export interface ExperimentAdminNavProps {
  activeTab?: ExperimentAdminNavTab;
}

// ──────────────────────────────────────────────
// NamespaceMain
// ──────────────────────────────────────────────

/**
 * NamespaceMain コンポーネントの Props
 */
export interface NamespaceMainProps {
  /** trueのとき左ペイン（名前空間ツリー）を非表示にする */
  hideTree?: boolean;
  /** trueのときグローバル名前空間のみ表示・操作対象にする（ProviderMenu用） */
  globalOnly?: boolean;
  /** 外部から名前空間選択キーを制御する場合に指定 */
  externalSelectedNsKey?: string | null;
  /** 外部から名前空間選択が変わったときのコールバック */
  onNsKeyChange?: (key: string | null) => void;
  /** trueのとき閲覧モード（検索・フィルター以外のボタンを非活性） */
  viewOnly?: boolean;
}

// ──────────────────────────────────────────────
// NamespaceMain 内部状態
// ──────────────────────────────────────────────

/**
 * コンテキストメニューの表示状態（NamespaceMain）
 *
 * @remarks
 * NamespaceMain.tsx の名前空間ツリーで右クリック時に表示するメニューの状態を管理する
 */
export interface ContextMenuState {
  /** メニューを表示するかどうか */
  visible: boolean;
  /** メニュー表示位置 X 座標（px） */
  x: number;
  /** メニュー表示位置 Y 座標（px） */
  y: number;
  /** 右クリック対象の名前空間ノード */
  node: NamespaceNode | null;
  /** 右クリック対象ノードの親ラベル */
  parentLabel: string;
}

/**
 * 用語テーブルのインライン編集値（NamespaceMain）
 *
 * @remarks
 * NamespaceMain.tsx の用語テーブルで既存行を編集するときの一時的な入力値を保持する
 */
export interface TermEditValues {
  /** 名前空間 Prefix */
  prefix: string;
  /** ローカル名 */
  localName: string;
  /** 表示名（日本語） */
  displayName: string;
  /** 説明 */
  description: string;
  /** 型ヒント（stringType / integerType / floatType / booleanType / dateTimeType / uriType） */
  type: string;
  /** 単位ヒント */
  unitHint: string;
}

// ──────────────────────────────────────────────
// TeamAddDialog
// ──────────────────────────────────────────────

/**
 * チーム作成 API レスポンス（TeamAddDialog）
 *
 * @remarks
 * POST /api/v1/department-units のレスポンスボディの型
 */
export interface CreateTeamResponse {
  /** 作成されたチームの ID */
  departmentUnitId: string;
  /** 作成されたチームの名前 */
  unitName: string;
}

// ──────────────────────────────────────────────
// TermManagement
// ──────────────────────────────────────────────

/**
 * TermManagement コンポーネントの Props
 */
export interface TermManagementProps {
  /** true の場合、追加・編集ボタンを非活性にする */
  viewOnly?: boolean;
  /** true の場合、グローバルPrefix紐づき用語のみ対象（将来拡張用） */
  globalOnly?: boolean;
  /**
   * 選択中の名前空間スコープキー（userId または organization_group_cd）。
   * 渡された場合、そのスコープに紐づく Prefix のみを取得して表示する。
   * 未指定時は全件取得（従来動作）。
   */
  selectedNsKey?: string;
}

/**
 * TermManagement の新規入力行（テーブルインライン入力用）
 *
 * @remarks
 * TermManagement.tsx の新規行追加時に使用する入力行型。
 * NamespaceMain の NewTermRow とは typeHint/type フィールド名が異なる点に注意。
 */
export interface NewTermRowLocal {
  _rowId: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  typeHint: string;
  unitHint: string;
}

/**
 * TermManagement の既存行インライン編集値
 *
 * @remarks
 * TermManagement.tsx の既存行編集時に使用する一時的な入力値を保持する
 */
export interface TermEditValuesLocal {
  displayName: string;
  description: string;
  typeHint: string;
  unitHint: string;
}

// ──────────────────────────────────────────────
// DepartmentTreeManagement
// ──────────────────────────────────────────────

/**
 * DepartmentTreeManagement コンポーネントの Props
 */
export interface DepartmentTreeManagementProps {
  /** 行クリック時に選択された organization_group_cd を通知するコールバック */
  onNodeSelect?: (scopeKey: string | null) => void;
}

// ──────────────────────────────────────────────
// organization_group（部署管理タブ）
// ──────────────────────────────────────────────

// OrganizationGroupRow / CreateOrganizationGroupRequest / UpdateOrganizationGroupRequest は team.ts に定義済み
export type {
  OrganizationGroupRow,
  CreateOrganizationGroupRequest,
  UpdateOrganizationGroupRequest,
} from '@/types/team';

// ──────────────────────────────────────────────
// GlobalNamespaceView（グローバル名前空間宣言・ファイルサーバ管理）
// ──────────────────────────────────────────────

/**
 * グローバル名前空間宣言の1エントリ
 * ファイルサーバ（system/namespaces/global-declarations.csv）で管理する
 */
export interface GlobalNamespaceEntry {
  /** XML prefix（例: "maiml", "xsi"） */
  prefix: string;
  /** 名前空間 URI（例: "http://www.maiml.org/schemas"） */
  uri: string;
}

/**
 * GlobalNamespaceView コンポーネントの Props
 */
export interface GlobalNamespaceViewProps {
  /**
   * true のとき、インポート・エクスポートボタンを disabled にして参照のみにする。
   * NamespaceMain でグローバルノード選択時に使用する。
   */
  viewOnly?: boolean;
}

