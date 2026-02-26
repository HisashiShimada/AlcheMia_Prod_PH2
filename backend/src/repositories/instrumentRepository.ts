/**
 * Instrumentマスタリポジトリ
 * instrumentテーブルへのデータアクセスを担当
 * pg-promise + SQLファイル外部管理パターンを使用
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { v4 as uuidv4 } from 'uuid';

/**
 * Instrument情報の型定義
 */
export interface InstrumentMaster {
  instrument_id: string;
  instrument_uuid: string;
  instrument_name: string;
  instrument_description: string | null;
  instrument_annotation: string | null;
  is_active: boolean;
  update_at: Date | null;
}

/**
 * 指定された組織のInstrumentマスタを全件取得
 *
 * @param organizationId 組織ID
 * @returns Instrumentマスタの配列
 */
export const findAll = async (
  organizationId: string
): Promise<InstrumentMaster[]> => {
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('instruments/findAll.sql');
  return await pgp.any<InstrumentMaster>(sqlQuery, [organizationId]);
};

/**
 * IDでInstrumentマスタを取得
 *
 * @param organizationId 組織ID
 * @param instrumentId Instrument ID
 * @returns Instrumentマスタ または null
 */
export const findById = async (
  organizationId: string,
  instrumentId: string
): Promise<InstrumentMaster | null> => {
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('instruments/findById.sql');
  const result = await pgp.oneOrNone<InstrumentMaster>(sqlQuery, [organizationId, instrumentId]);
  return result ?? null;
};

/**
 * Instrumentマスタを新規作成
 *
 * @param organizationId 組織ID
 * @param data Instrument情報
 * @param userId ログインユーザーID
 * @param corporationId 会社ID（任意）
 * @returns 作成されたInstrumentマスタ
 */
export const create = async (
  organizationId: string,
  data: {
    instrumentId: string;
    instrumentName: string;
    instrumentDescription?: string;
    instrumentAnnotation?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null
): Promise<InstrumentMaster> => {
  const pgp = getPgp();

  const query = await loadSqlFile('instruments/create.sql');
  const values = [
    organizationId,
    uuidv4(),
    data.instrumentId,
    data.instrumentName,
    data.instrumentDescription || null,
    data.instrumentAnnotation || null,
    corporationId ?? null,
    data.isActive !== undefined ? data.isActive : true,
    userId,
    userId,
  ];

  return await pgp.one<InstrumentMaster>(query, values);
};

/**
 * Instrumentマスタを更新
 *
 * @param organizationId 組織ID
 * @param instrumentId Instrument ID
 * @param data 更新データ
 * @param userId ユーザーID
 * @param corporationId 会社ID
 * @returns 更新されたInstrumentマスタ
 */
export const update = async (
  organizationId: string,
  instrumentId: string,
  data: {
    instrumentName?: string;
    instrumentDescription?: string;
    instrumentAnnotation?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null
): Promise<InstrumentMaster | null> => {
  const pgp = getPgp();

  let query: string;
  let values: any[];

  if (corporationId !== null && corporationId !== undefined) {
    // corporation_idが存在する場合：corporation_idで照合
    query = await loadSqlFile('instruments/updateByCorporation.sql');
    values = [
      corporationId,
      instrumentId,
      data.instrumentName,
      data.instrumentDescription,
      data.instrumentAnnotation,
      data.isActive,
      userId,
    ];
  } else {
    // corporation_idがNULLの場合：organization_idで照合
    query = await loadSqlFile('instruments/updateByOrganization.sql');
    values = [
      organizationId,
      instrumentId,
      data.instrumentName,
      data.instrumentDescription,
      data.instrumentAnnotation,
      data.isActive,
      userId,
    ];
  }

  const result = await pgp.oneOrNone<InstrumentMaster>(query, values);
  return result ?? null;
};

/**
 * Instrumentマスタのアクティブ状態を更新
 *
 * @param organizationId 組織ID
 * @param instrumentId Instrument ID
 * @param isActive アクティブ状態
 * @param userId ユーザーID
 * @param corporationId 会社ID
 * @returns 更新されたInstrumentマスタ
 */
export const updateStatus = async (
  organizationId: string,
  instrumentId: string,
  isActive: boolean,
  userId: string,
  corporationId?: string | null
): Promise<InstrumentMaster | null> => {
  const pgp = getPgp();

  let query: string;
  let values: any[];

  if (corporationId !== null && corporationId !== undefined) {
    // corporation_idが存在する場合：corporation_idで照合
    query = await loadSqlFile('instruments/updateStatusByCorporation.sql');
    values = [corporationId, instrumentId, isActive, userId];
  } else {
    // corporation_idがNULLの場合：organization_idで照合
    query = await loadSqlFile('instruments/updateStatusByOrganization.sql');
    values = [organizationId, instrumentId, isActive, userId];
  }

  const result = await pgp.oneOrNone<InstrumentMaster>(query, values);
  return result ?? null;
};

/**
 * Instrument IDが既に存在するかチェック
 *
 * @param organizationId 組織ID
 * @param instrumentId Instrument ID
 * @returns 存在する場合true
 */
export const existsById = async (
  organizationId: string,
  instrumentId: string
): Promise<boolean> => {
  const pgp = getPgp();

  const query = await loadSqlFile('instruments/existsById.sql');
  const result = await pgp.one<{ exists: boolean }>(query, [organizationId, instrumentId]);
  return result.exists;
};

/**
 * フィルタ条件付きでInstrumentマスタを取得
 *
 * @param organizationId 組織ID
 * @param corporationId 会社ID
 * @param filters フィルタ条件
 * @returns Instrumentマスタの配列
 */
export const findAllWithFilters = async (
  organizationId: string,
  corporationId: string | null,
  filters: {
    displayScope?: string;
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<InstrumentMaster[]> => {
  const pgp = getPgp();

  // ベースクエリを外部ファイルから読み込み
  let sqlQuery = await loadSqlFile('instruments/findAllWithFilters.sql');

  const values: any[] = [];
  let paramIndex = 1;

  // 表示切替フィルタ（display_scope）
  if (filters.displayScope === 'all') {
    // 全体選択: corporation_idのみでフィルタ
    sqlQuery = sqlQuery.replace(
      'WHERE 1=1',
      `WHERE corporation_id = $${paramIndex}`
    );
    values.push(corporationId);
    paramIndex++;
  } else {
    // 自組織選択: organization_idのみでフィルタ
    sqlQuery = sqlQuery.replace(
      'WHERE 1=1',
      `WHERE organization_id = $${paramIndex}`
    );
    values.push(organizationId);
    paramIndex++;
  }

  // 検索フィルタ（ID・名称・説明・注釈での部分一致）
  if (filters.search) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND (
        instrument_id ILIKE $${paramIndex} OR
        instrument_name ILIKE $${paramIndex} OR
        instrument_description ILIKE $${paramIndex} OR
        instrument_annotation ILIKE $${paramIndex}
      )
ORDER BY`
    );
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  // アクティブ状態フィルタ
  if (filters.isActive !== undefined) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND is_active = $${paramIndex}
ORDER BY`
    );
    values.push(filters.isActive);
    paramIndex++;
  }

  return await pgp.any<InstrumentMaster>(sqlQuery, values);
};
