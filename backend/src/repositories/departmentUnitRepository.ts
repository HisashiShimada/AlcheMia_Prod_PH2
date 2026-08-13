/**
 * department_unit Repository
 *
 * 部署ユニット（チーム）管理のデータアクセスを提供
 *
 * @module departmentUnitRepository
 * @version 1.0.0
 */

import { getPool } from '../database/db';

/**
 * department_unit テーブルの型定義
 *
 * @remarks
 * DDL: docs/design/db/ddl/department_unit.sql
 * 主キー: (organization_id, department_unit_id)
 */
export interface DepartmentUnit {
  organization_id: string;
  department_unit_id: string;
  department_cd: string | null;
  unit_name: string;
  layer: number;
  description: string | null;
  is_active: boolean;
  create_user_id: string | null;
  create_at: Date | null;
  update_user_id: string | null;
  update_at: Date | null;
}

/**
 * APIレスポンス用の部署ユニット型
 */
export interface DepartmentUnitRow {
  departmentUnitId: string;
  organizationId: string;
  departmentCd: string | null;
  unitName: string;
  layer: number;
  description: string | null;
  isActive: boolean;
}

/**
 * ユーザー一覧の型（TeamDialog用）
 */
export interface OrgUserRow {
  userId: string;
  userName: string;
  departmentUnitId: string | null;
}

/**
 * 部署ユニットを新規作成（INSERT）
 *
 * @param data - 登録するユニットデータ
 * @returns 登録された部署ユニット
 */
export async function create(data: {
  organizationId: string;
  departmentCd?: string;
  unitName: string;
  layer: number;
  description?: string;
  createUserId?: string;
}): Promise<DepartmentUnitRow> {
  const pool = getPool();

  const query = `
    INSERT INTO department_unit (
      organization_id
      , department_unit_id
      , department_cd
      , unit_name
      , layer
      , description
      , is_active
      , create_user_id
      , create_at
      , update_at
    ) VALUES (
      $1
      , gen_random_uuid()
      , $2, $3, $4, $5
      , TRUE
      , $6
      , CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING
      organization_id   AS "organizationId"
      , department_unit_id AS "departmentUnitId"
      , department_cd   AS "departmentCd"
      , unit_name       AS "unitName"
      , layer
      , description
      , is_active       AS "isActive"
  `;

  const result = await pool.query(query, [
    data.organizationId,
    data.departmentCd ?? null,
    data.unitName,
    data.layer,
    data.description ?? null,
    data.createUserId ?? null,
  ]);

  return result.rows[0];
}

/**
 * 組織内の全部署ユニットを取得
 *
 * @param organizationId - 組織ID
 * @returns 部署ユニット一覧
 */
export async function findAllByOrganization(
  organizationId: string
): Promise<DepartmentUnitRow[]> {
  const pool = getPool();

  const query = `
    SELECT
      organization_id   AS "organizationId"
      , department_unit_id AS "departmentUnitId"
      , department_cd   AS "departmentCd"
      , unit_name       AS "unitName"
      , layer
      , description
      , is_active       AS "isActive"
    FROM department_unit
    WHERE organization_id = $1
      AND is_active = TRUE
    ORDER BY layer ASC, unit_name ASC
  `;

  const result = await pool.query(query, [organizationId]);
  return result.rows;
}

/**
 * 指定ユニットのメンバー（organization_user）を取得
 *
 * @param organizationId - 組織ID
 * @param departmentUnitId - 部署ユニットID
 * @returns メンバー一覧
 */
export async function findMembersByUnitId(
  organizationId: string,
  departmentUnitId: string
): Promise<OrgUserRow[]> {
  const pool = getPool();

  const query = `
    SELECT
      user_id           AS "userId"
      , user_name       AS "userName"
      , department_unit_id AS "departmentUnitId"
    FROM organization_user
    WHERE organization_id = $1
      AND department_unit_id = $2
    ORDER BY user_name ASC
  `;

  const result = await pool.query(query, [organizationId, departmentUnitId]);
  return result.rows;
}

/**
 * 組織内の全ユーザーを取得（メンバー選択用）
 *
 * @param organizationId - 組織ID
 * @returns ユーザー一覧
 */
export async function findUsersByOrganization(
  organizationId: string
): Promise<OrgUserRow[]> {
  const pool = getPool();

  const query = `
    SELECT
      user_id              AS "userId"
      , user_name          AS "userName"
      , department_unit_id AS "departmentUnitId"
    FROM organization_user
    WHERE organization_id = $1
      AND is_active = TRUE
    ORDER BY user_name ASC
  `;

  const result = await pool.query(query, [organizationId]);
  return result.rows;
}

/**
 * ユニットのメンバーを一括更新
 * - 既存メンバーの department_unit_id を NULL にリセット後
 * - 新しいメンバーリストの department_unit_id を設定
 *
 * @param organizationId - 組織ID
 * @param departmentUnitId - 部署ユニットID
 * @param userIds - 新しいメンバーのユーザーID一覧
 */
export async function updateMembers(
  organizationId: string,
  departmentUnitId: string,
  userIds: string[]
): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 既存メンバーをリセット
    await client.query(
      `UPDATE organization_user
         SET department_unit_id = NULL
           , update_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1
         AND department_unit_id = $2`,
      [organizationId, departmentUnitId]
    );

    // 新しいメンバーを設定
    if (userIds.length > 0) {
      // プレースホルダーを動的生成（$3, $4, ... の形式）
      const placeholders = userIds.map((_, idx) => `$${idx + 3}`).join(', ');
      await client.query(
        `UPDATE organization_user
           SET department_unit_id = $2
             , update_at = CURRENT_TIMESTAMP
         WHERE organization_id = $1
           AND user_id IN (${placeholders})`,
        [organizationId, departmentUnitId, ...userIds]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
