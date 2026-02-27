/**
 * Corporation（会社）リポジトリ
 * データベースアクセス層
 * pg-promise + SQLファイル外部管理パターンを使用
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * Corporationのデータ型定義
 */
export interface CorporationRow {
  corporation_id: string; // UUID
  corporation_name: string;
  is_active: boolean;
  create_at: Date;
  update_at: Date;
}

/**
 * Corporation検索フィルター
 */
export interface CorporationSearchFilters {
  search?: string;
  isActive?: boolean;
  sortBy?: 'corporation_id' | 'corporation_name' | 'update_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Corporation一覧を取得
 *
 * @param filters 検索フィルター
 * @returns Corporationの配列
 */
export async function findAll(
  filters: CorporationSearchFilters = {}
): Promise<CorporationRow[]> {
  const pgp = getPgp();

  // 外部SQLファイルを読み込み（ベースクエリ）
  let sqlQuery = await loadSqlFile('corporations/findAll.sql');

  const params: any[] = [];
  let paramIndex = 1;

  // 検索フィルター（動的条件をWHERE 1=1の後に追加）
  if (filters.search) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND (
        corporation_id::text ILIKE $${paramIndex} OR
        corporation_name ILIKE $${paramIndex}
      )
ORDER BY`
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // アクティブフィルター
  if (filters.isActive !== undefined) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND is_active = $${paramIndex}
ORDER BY`
    );
    params.push(filters.isActive);
    paramIndex++;
  }

  // ソート順を置換
  const sortBy = filters.sortBy || 'create_at';
  const sortOrder = (filters.sortOrder || 'asc').toUpperCase();
  sqlQuery = sqlQuery.replace(
    'ORDER BY create_at ASC',
    `ORDER BY ${sortBy} ${sortOrder}`
  );

  return await pgp.any<CorporationRow>(sqlQuery, params);
}

/**
 * Corporation IDで1件取得
 *
 * @param corporationId Corporation ID (UUID)
 * @returns Corporation（見つからない場合はnull）
 */
export async function findById(
  corporationId: string
): Promise<CorporationRow | null> {
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('corporations/findById.sql');
  const result = await pgp.oneOrNone<CorporationRow>(sqlQuery, [corporationId]);
  return result ?? null;
}

/**
 * Corporationの件数を取得
 *
 * @returns 件数
 */
export async function count(): Promise<number> {
  const pgp = getPgp();

  const query = await loadSqlFile('corporations/count.sql');
  const result = await pgp.one<{ count: string }>(query);
  return parseInt(result.count, 10);
}

/**
 * Corporation名が既に存在するかチェック
 *
 * @param corporationName Corporation名
 * @param excludeId チェック時に除外するID（更新時に使用、UUID）
 * @returns 存在する場合true
 */
export async function existsByName(
  corporationName: string,
  excludeId?: string
): Promise<boolean> {
  const pgp = getPgp();

  if (excludeId !== undefined) {
    const query = await loadSqlFile('corporations/existsByNameExclude.sql');
    const result = await pgp.one<{ exists: boolean }>(query, [corporationName, excludeId]);
    return result.exists;
  } else {
    const query = await loadSqlFile('corporations/existsByName.sql');
    const result = await pgp.one<{ exists: boolean }>(query, [corporationName]);
    return result.exists;
  }
}

/**
 * Corporationを新規作成
 *
 * @param data Corporation情報
 * @param userId ログインユーザーID
 * @returns 作成されたCorporation
 */
export async function create(
  data: {
    corporationId: string; // UUID
    corporationName: string;
    isActive?: boolean;
  },
  userId: string
): Promise<CorporationRow> {
  const pgp = getPgp();

  const query = await loadSqlFile('corporations/create.sql');
  const values = [
    data.corporationId,
    data.corporationName,
    data.isActive !== undefined ? data.isActive : true,
    userId,
    userId,
  ];

  return await pgp.one<CorporationRow>(query, values);
}

/**
 * Corporationを更新
 *
 * @param corporationId Corporation ID (UUID)
 * @param data 更新情報
 * @param userId ログインユーザーID
 * @returns 更新されたCorporation（見つからない場合はnull）
 */
export async function update(
  corporationId: string,
  data: {
    corporationName?: string;
    isActive?: boolean;
  },
  userId: string
): Promise<CorporationRow | null> {
  const pgp = getPgp();

  const query = await loadSqlFile('corporations/update.sql');
  const values = [
    corporationId,
    data.corporationName ?? null,
    data.isActive ?? null,
    userId,
  ];

  const result = await pgp.oneOrNone<CorporationRow>(query, values);
  return result ?? null;
}

/**
 * Corporationのアクティブ状態を更新
 *
 * @param corporationId Corporation ID (UUID)
 * @param isActive アクティブ状態
 * @param userId ログインユーザーID
 * @returns 更新されたCorporation（見つからない場合はnull）
 */
export async function updateStatus(
  corporationId: string,
  isActive: boolean,
  userId: string
): Promise<CorporationRow | null> {
  const pgp = getPgp();

  const query = await loadSqlFile('corporations/updateStatus.sql');
  const result = await pgp.oneOrNone<CorporationRow>(query, [isActive, userId, corporationId]);
  return result ?? null;
}

/**
 * Corporationを削除（物理削除）
 * ※通常はupdateStatusで論理削除を使用することを推奨
 *
 * @param corporationId Corporation ID (UUID)
 * @returns 削除された場合true
 */
export async function deleteById(
  corporationId: string
): Promise<boolean> {
  const pgp = getPgp();

  const query = await loadSqlFile('corporations/deleteById.sql');
  const result = await pgp.result(query, [corporationId]);
  return result.rowCount > 0;
}
