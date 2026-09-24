/**
 * 組織・法人関連の型定義
 */

// ---------------------------------------------------------------------------
// 法人（Corporation）
// ---------------------------------------------------------------------------

/**
 * 法人データの型（インデックスシグネチャ付き）
 * corporationApiService / Provider/CorporationManagement で使用
 */
export interface CorporationRecord {
  corporationId: string; // UUID
  corporationName: string;
  isActive: boolean;
  is_active: boolean;
  create_user_id: string;
  update_user_id: string;
  create_at: Date;
  update_at: Date;

  // 動的プロパティアクセス用のインデックスシグネチャ
  [key: string]: unknown;
}

/**
 * 法人データの汎用型
 * corporationApiService で使用
 */
export type MasterRecord = CorporationRecord;

// ---------------------------------------------------------------------------
// 組織（Organization）
// ---------------------------------------------------------------------------

/**
 * 組織データ型
 * Provider/OrganizationManagement で使用
 */
export interface OrganizationData {
  organizationId: string;
  organizationCd: string;
  organizationDisplayName: string;
  organizationEmail: string;
  chiefUserId: string;
  chiefUserName: string;
  corporationName: string;
  isEntry: number;
  isActive: boolean;
  contractCapacity: number | null;
  contractedUsers: number | null;
  contractedProjects: number | null;
  defaultRetentionDays: number;
  updatedAt: string;
}

/**
 * 法人データ型（OrganizationManagement 内でも参照）
 * Provider/CorporationManagement / OrganizationManagement で使用
 */
export interface CorporationData {
  corporationId: string;
  corporationName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
