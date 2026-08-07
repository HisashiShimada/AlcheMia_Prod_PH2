/**
 * organizationGroup Repository
 *
 * 組織階層グループ管理のデータアクセスを提供
 *
 * @module organizationGroupRepository
 * @version 1.0.0
 */

import { getPool, getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import type { PoolClient } from 'pg';
import type { ITask } from 'pg-promise';


/**
 * organization_group テーブルの型定義
 *
 * @remarks
 * DDL: docs/design/db/ddl/organization_group.sql
 * 主キー: (organization_id, organization_group_cd)
 */
export interface OrganizationGroupRow {
  organization_id: string;
  organization_group_cd: string;
  organization_group_name: string;
  chief_user_id: string;
  /** 代表者ユーザー名（findAll / findById 取得時に JOIN で付与） */
  chief_user_name: string | null;
  parent_group_cd: string | null;
  layer: string | null;
  create_user_id: string | null;
  create_at: Date | null;
  update_user_id: string | null;
  update_at: Date | null;
  /** findAll 取得時のみ付与されるメンバー数（一覧表示用） */
  member_count?: number;
}

/**
 * 一覧取得フィルタ
 */
export interface OrganizationGroupFilters {
  search?: string;
}

/**
 * organization_group 一覧取得
 *
 * @param organizationId - 組織ID
 * @param filters - 検索フィルタ
 * @returns 組織グループ一覧
 */
export async function findAll(
  organizationId: string,
  filters?: OrganizationGroupFilters
): Promise<OrganizationGroupRow[]> {
  const pool = getPool();

  let sql = await loadSqlFile('organization_groups/findAll.sql');
  const params: unknown[] = [organizationId];

  // 動的検索フィルタを付加
  if (filters?.search) {
    const paramIndex = params.length + 1;
    sql = sql.replace(
      'ORDER BY',
      `AND (organization_group_cd ILIKE $${paramIndex} OR organization_group_name ILIKE $${paramIndex})
ORDER BY`
    );
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query<OrganizationGroupRow>(sql, params);
  return result.rows;
}

/**
 * organization_group 単件取得
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @returns 組織グループ（存在しない場合は null）
 */
export async function findById(
  organizationId: string,
  groupCd: string
): Promise<OrganizationGroupRow | null> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/findById.sql');
  const result = await pool.query<OrganizationGroupRow>(sql, [organizationId, groupCd]);
  return result.rows[0] ?? null;
}

/**
 * organization_group 存在確認
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @returns 存在する場合 true
 */
export async function existsById(
  organizationId: string,
  groupCd: string
): Promise<boolean> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/existsById.sql');
  const result = await pool.query<{ exists: boolean }>(sql, [organizationId, groupCd]);
  return result.rows[0]?.exists ?? false;
}

/**
 * organization_group 新規作成
 *
 * @param data - 登録するグループデータ
 * @param t - pg-promise トランザクションオブジェクト（省略時はプール接続を使用）
 * @returns 登録された組織グループ
 */
export async function create(data: {
  organization_id: string;
  organization_group_cd: string;
  organization_group_name: string;
  chief_user_id: string;
  parent_group_cd?: string | null;
  layer?: string | null;
  create_user_id?: string | null;
}, t?: ITask<unknown>): Promise<OrganizationGroupRow> {
  const sql = await loadSqlFile('organization_groups/create.sql');
  const params = [
    data.organization_id,
    data.organization_group_cd,
    data.organization_group_name,
    data.chief_user_id,
    data.parent_group_cd ?? null,
    data.layer ?? null,
    data.create_user_id ?? null,
  ];

  if (t) {
    // pg-promise トランザクション経由
    return t.one<OrganizationGroupRow>(sql, params);
  } else {
    // 通常の pg プール経由（後方互換）
    const pool = getPool();
    const result = await pool.query<OrganizationGroupRow>(sql, params);
    return result.rows[0];
  }
}

/**
 * organization_group の祖先チェーンを取得（URI 構築用）
 *
 * 指定した parentGroupCd を起点として、再帰的に parent_group_cd を遡り
 * ルート → 直近親 の順に CD 配列を返す。
 *
 * @param organizationId - 組織ID
 * @param parentGroupCd - 起点となる親グループのCD（null の場合は空配列を返す）
 * @returns 祖先グループの organization_group_cd 配列（ルート → 直近親の順）
 *
 * @example
 * // RD-ANALYSIS の parent が RD、RD の parent が null の場合
 * await findAncestorChain('org1', 'RD-ANALYSIS')
 * // => ['RD', 'RD-ANALYSIS'] は呼ばない点に注意。parentGroupCd を渡すこと
 * await findAncestorChain('org1', 'RD')
 * // => ['RD']
 */
export async function findAncestorChain(
  organizationId: string,
  parentGroupCd: string | null
): Promise<string[]> {
  if (!parentGroupCd) return [];

  const pgp = getPgp();
  const sql = await loadSqlFile('organization_groups/findAncestorChain.sql');
  const rows = await pgp.any<{ organization_group_cd: string }>(sql, [organizationId, parentGroupCd]);
  return rows.map((r) => r.organization_group_cd);
}

/**
 * organization_group 更新
 *
 * @param data - 更新するグループデータ（organization_id・organization_group_cd はWHERE条件）
 * @returns 更新された組織グループ（存在しない場合は null）
 */
export async function update(data: {
  organization_id: string;
  organization_group_cd: string;
  organization_group_name: string;
  chief_user_id: string;
  parent_group_cd?: string | null;
  layer?: string | null;
  update_user_id?: string | null;
}): Promise<OrganizationGroupRow | null> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/update.sql');
  const result = await pool.query<OrganizationGroupRow>(sql, [
    data.organization_group_name,
    data.chief_user_id,
    data.parent_group_cd ?? null,
    data.layer ?? null,
    data.update_user_id ?? null,
    data.organization_id,
    data.organization_group_cd,
  ]);
  return result.rows[0] ?? null;
}

/**
 * organization_group ユーザー所属グループ取得
 *
 * ログインユーザーが所属するグループと、その全祖先グループを返す（ツリー表示用）。
 * 未所属の場合は空配列を返す。
 *
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns 所属グループ＋祖先グループ一覧
 */
export async function findByUser(
  organizationId: string,
  userId: string
): Promise<OrganizationGroupRow[]> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/findByUser.sql');
  const result = await pool.query<OrganizationGroupRow>(sql, [organizationId, userId]);
  return result.rows;
}

/**
 * organization_group 子孫CD一覧取得（再帰）
 *
 * 指定されたルートグループCD群とその全配下グループのCDを返す。
 * WITH RECURSIVE を使用して組織階層ツリーを再帰的に辿る。
 *
 * @param organizationId - 組織ID
 * @param rootCds - ルートグループCDの配列（空の場合は空配列を返す）
 * @returns ルート群とその全配下のグループCDの配列（重複なし）
 */
export async function findDescendantCds(
  organizationId: string,
  rootCds: string[]
): Promise<string[]> {
  // ルートCDが空の場合は0件を返す（グループ未所属ユーザー対策）
  if (rootCds.length === 0) {
    return [];
  }
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/findDescendantCds.sql');
  const result = await pool.query<{ organization_group_cd: string }>(sql, [organizationId, rootCds]);
  return result.rows.map((row) => row.organization_group_cd);
}

/**
 * organization_group 削除
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @returns 削除された行数
 */
export async function deleteById(
  organizationId: string,
  groupCd: string
): Promise<number> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/deleteById.sql');
  const result = await pool.query(sql, [organizationId, groupCd]);
  return result.rowCount ?? 0;
}

// ──────────────────────────────────────────────────────────────────────────
// organization_group_user メンバー管理
// ──────────────────────────────────────────────────────────────────────────

/**
 * organization_group_user 型定義
 *
 * @remarks
 * DDL: docs/design/db/ddl/organization_group_user.sql
 */
export interface OrganizationGroupMemberRow {
  user_id: string;
  user_name: string;
  mail_address: string;
}

/**
 * グループメンバー一覧取得
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @returns メンバー一覧
 */
export async function findMembersByGroupCd(
  organizationId: string,
  groupCd: string
): Promise<OrganizationGroupMemberRow[]> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/findMembers.sql');
  const result = await pool.query<OrganizationGroupMemberRow>(sql, [organizationId, groupCd]);
  return result.rows;
}

/**
 * グループメンバー1件挿入（pg-promise ITask 対応版）
 *
 * `createOrganizationGroup` などのトランザクション内から代表者を直接メンバー登録するために使用。
 * 重複の場合は何もしない（ON CONFLICT DO NOTHING）。
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @param userId - 挿入するユーザーID
 * @param t - pg-promise トランザクションオブジェクト
 */
export async function insertMemberInTransaction(
  organizationId: string,
  groupCd: string,
  userId: string,
  t: ITask<unknown>
): Promise<void> {
  const sql = await loadSqlFile('organization_groups/insertMember.sql');
  await t.none(sql, [organizationId, groupCd, userId]);
}

/**
 * グループメンバー一括更新（既存メンバーをすべて削除し新規メンバーを挿入）
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @param userIds - 設定するユーザーIDの配列（空配列の場合はメンバーを全削除）
 * @param client - トランザクション用クライアント（省略時は新規接続）
 */
export async function setMembers(
  organizationId: string,
  groupCd: string,
  userIds: string[],
  client?: PoolClient
): Promise<void> {
  const pool = getPool();
  const executor = client ?? pool;

  const deleteSql = await loadSqlFile('organization_groups/deleteMembers.sql');
  await executor.query(deleteSql, [organizationId, groupCd]);

  if (userIds.length === 0) return;

  const insertSql = await loadSqlFile('organization_groups/insertMember.sql');
  for (const userId of userIds) {
    await executor.query(insertSql, [organizationId, groupCd, userId]);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// organization_user ユーザー一覧取得（グループメンバー選択用）
// ──────────────────────────────────────────────────────────────────────────

/**
 * 組織内のアクティブなユーザー一覧を取得（グループメンバー選択用）
 *
 * @param organizationId - 組織ID
 * @returns ユーザー一覧（user_id, user_name, mail_address）
 */
export interface OrgUserRow {
  user_id: string;
  user_name: string;
  mail_address: string;
}

export async function findAllOrgUsers(
  organizationId: string
): Promise<OrgUserRow[]> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/findAllOrgUsers.sql');
  const result = await pool.query<OrgUserRow>(sql, [organizationId]);
  return result.rows;
}

