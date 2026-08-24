/**
 * グループ（organization_group）管理機能の型定義
 *
 * @remarks
 * frontend/src/components/group/ 配下のコンポーネントで使用する型を集約。
 * グループ管理は名前空間管理とは独立した機能のため、namespace.ts とは分離する。
 *
 * DDL参照: docs/design/db/ddl/organization_group.sql
 */

// ──────────────────────────────────────────────
// DB テーブル型
// ──────────────────────────────────────────────

/**
 * organization_group テーブルの行型
 *
 * @remarks
 * DDL: docs/design/db/ddl/organization_group.sql
 * 主キー: (organization_id, organization_group_cd)
 */
export interface OrganizationGroupRow {
  /** 組織ID（UUID） */
  organization_id: string;
  /** 組織階層グループCD */
  organization_group_cd: string;
  /** 組織階層グループ名 */
  organization_group_name: string;
  /** 代表者ユーザID */
  chief_user_id: string;
  /** 代表者ユーザー名（findAll / findById 取得時に JOIN で付与） */
  chief_user_name?: string | null;
  /** 親階層グループCD（ルートの場合は null） */
  parent_group_cd: string | null;
  /** レイヤー */
  layer: string | null;
  /** アクティブ判定（論理削除フラグ） */
  is_active: boolean;
  /** 作成日時 */
  create_at?: string;
  /** 更新日時 */
  update_at?: string;
  /** メンバー数（findAll 取得時のみ付与） */
  member_count?: number;
  /** namespace テーブルから scope_key = organization_group_cd で JOIN して取得した URI */
  namespace_uri?: string | null;
}

// ──────────────────────────────────────────────
// API リクエスト/レスポンス型
// ──────────────────────────────────────────────

/**
 * organization_group 新規作成リクエスト
 *
 * @remarks
 * layer はバックエンドで parent_group_cd から自動算出されるため送信不要。
 */
export interface CreateOrganizationGroupRequest {
  /** 組織階層グループCD */
  organization_group_cd: string;
  /** 組織階層グループ名 */
  organization_group_name: string;
  /** 親階層グループCD */
  parent_group_cd?: string | null;
}

/**
 * organization_group 更新リクエスト
 */
export interface UpdateOrganizationGroupRequest {
  /** 組織階層グループ名 */
  organization_group_name?: string;
  /** 親階層グループCD */
  parent_group_cd?: string | null;
  /** レイヤー */
  layer?: string | null;
}

/**
 * API レスポンスのユーザー行型（organization-groups/users・members 共通）
 */
export interface OrgGroupUserApiRow {
  user_id: string;
  user_name: string;
  mail_address?: string;
}

// ──────────────────────────────────────────────
// フロントエンド表示用モデル
// ──────────────────────────────────────────────

/**
 * グループメンバー（表示用）
 */
export interface GroupMember {
  userId: string;
  userName: string;
}

/**
 * 組織ユーザー（グループ追加・編集ダイアログ用）
 */
export interface OrgUser {
  userId: string;
  userName: string;
  mailAddress?: string;
}

/**
 * グループ（organization_group ベースの表示モデル）
 *
 * @remarks
 * `groupCd` = organization_group_cd（主キー）
 */
export interface Group {
  /** organization_group_cd（主キー） */
  groupCd: string;
  /** グループ名（= organization_group_name） */
  groupName: string;
  /** 親グループCD */
  parentGroupCd?: string | null;
  /** レイヤー */
  layer?: string | null;
  /** グループの代表者表示名 */
  ownerName: string;
  /** グループの代表者 userId（= chief_user_id） */
  ownerUserId?: string;
  members: GroupMember[];
  /** 一覧表示用メンバー数（API から取得した確定値） */
  memberCount: number;
  /** アクティブ判定（論理削除フラグ）。未取得時は true 扱い */
  isActive?: boolean;
  /** namespace テーブルから取得した URI（グループ固有の名前空間 URI） */
  namespaceUri?: string | null;
}

// ──────────────────────────────────────────────
// コンポーネント Props
// ──────────────────────────────────────────────

/**
 * GroupAddDialog の Props
 */
export interface GroupAddDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * グループ作成完了コールバック
   * @param groupCd - 作成されたグループCD
   * @param groupName - 作成されたグループ名
   * @param ownerUserId - 代表者ユーザーID（chief_user_id）
   * @param ownerName - 代表者表示名
   * @param isActive - アクティブ状態
   * @param parentGroupCd - 親グループCD（ルートの場合は undefined）
   */
  onCreated: (
    groupCd: string,
    groupName: string,
    ownerUserId: string,
    ownerName: string,
    isActive: boolean,
    parentGroupCd?: string | null,
  ) => void;
}

/**
 * GroupEditDialog の Props
 */
export interface GroupEditDialogProps {
  open: boolean;
  /** グループ名（編集前の初期値） */
  groupLabel: string;
  /** organization_group_cd（グループCD） */
  groupCd?: string;
  /** グループの現在の代表者 userId（初期値として使用） */
  ownerUserId?: string;
  /** グループのアクティブ状態（省略時 true 扱い） */
  isActive?: boolean;
  onClose: () => void;
  onSaved: (
    members: string[],
    newGroupName?: string,
    newOwnerUserId?: string,
    newIsActive?: boolean,
  ) => void;
}
