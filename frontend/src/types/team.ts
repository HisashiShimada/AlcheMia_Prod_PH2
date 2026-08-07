/**
 * チーム（organization_group）管理機能の型定義
 *
 * @remarks
 * frontend/src/components/team/ 配下のコンポーネントで使用する型を集約。
 * チーム管理は名前空間管理とは独立した機能のため、namespace.ts とは分離する。
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
  /** 作成日時 */
  create_at?: string;
  /** 更新日時 */
  update_at?: string;
  /** メンバー数（findAll 取得時のみ付与） */
  member_count?: number;
}

// ──────────────────────────────────────────────
// API リクエスト/レスポンス型
// ──────────────────────────────────────────────

/**
 * organization_group 新規作成リクエスト
 */
export interface CreateOrganizationGroupRequest {
  /** 組織階層グループCD */
  organization_group_cd: string;
  /** 組織階層グループ名 */
  organization_group_name: string;
  /** 親階層グループCD */
  parent_group_cd?: string | null;
  /** レイヤー */
  layer?: string | null;
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
 * チームメンバー（表示用）
 */
export interface TeamMember {
  userId: string;
  userName: string;
}

/**
 * 組織ユーザー（チーム追加・編集ダイアログ用）
 */
export interface OrgUser {
  userId: string;
  userName: string;
  mailAddress?: string;
}

/**
 * チーム（organization_group ベースの表示モデル）
 *
 * @remarks
 * `groupCd` = organization_group_cd（主キー）
 */
export interface Team {
  /** organization_group_cd（主キー） */
  groupCd: string;
  /** グループ名（= organization_group_name） */
  groupName: string;
  /** 親グループCD */
  parentGroupCd?: string | null;
  /** レイヤー */
  layer?: string | null;
  /** チームの代表者表示名 */
  ownerName: string;
  /** チームの代表者 userId（= chief_user_id） */
  ownerUserId?: string;
  members: TeamMember[];
  /** 一覧表示用メンバー数（API から取得した確定値） */
  memberCount: number;
}

// ──────────────────────────────────────────────
// コンポーネント Props
// ──────────────────────────────────────────────

/**
 * TeamAddDialog の Props
 */
export interface TeamAddDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * グループ作成完了コールバック
   * @param groupCd - 作成されたグループCD
   * @param groupName - 作成されたグループ名
   * @param ownerUserId - 代表者ユーザーID（chief_user_id）
   * @param ownerName - 代表者表示名
   */
  onCreated: (groupCd: string, groupName: string, ownerUserId: string, ownerName: string) => void;
}

/**
 * TeamEditDialog の Props
 */
export interface TeamEditDialogProps {
  open: boolean;
  /** グループ名（編集前の初期値） */
  teamLabel: string;
  /** organization_group_cd（グループCD） */
  teamGroupCd?: string;
  /** チームの現在の代表者 userId（初期値として使用） */
  teamOwnerUserId?: string;
  onClose: () => void;
  onSaved: (members: string[], newTeamName?: string, newOwnerUserId?: string) => void;
}
