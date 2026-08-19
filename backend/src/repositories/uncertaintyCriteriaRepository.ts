/**
 * uncertaintyCriteria Repository
 *
 * uncertainty_criteria テーブルへのデータアクセスを提供
 *
 * @remarks
 * DDL: docs/design/db/ddl/uncertainty_criteria.sql
 * 主キー: (organization_id, name_space_id, uncertainty_key, version)
 *
 * @module uncertaintyCriteriaRepository
 * @version 1.0.0
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * uncertainty_criteria テーブルの型定義
 *
 * @remarks
 * DDL: docs/design/db/ddl/uncertainty_criteria.sql
 * 主キー: (organization_id, name_space_id, uncertainty_key, version)
 */
export interface UncertaintyCriteria {
  organization_id: string;
  name_space_id: string;
  uncertainty_key: string;
  version: number;
  evaluation_method: number;       // 1: 定量 / 2: 定性
  is_Invalid: boolean;             // 無効: true / その他: false
  inheritance_uncertainty_key: string | null;
  xsi_type: string | null;
  units: string | null;
  format_string: string | null;
  description: string | null;
  create_user_id: string | null;
  create_at: Date | null;
  update_user_id: string | null;
  update_at: Date | null;
}

/**
 * API レスポンス用の不確かさ基準型（フロントエンドの UncertaintyTemplate 型に対応）
 */
export interface UncertaintyCriteriaRow {
  /** 不確かさ基準Key（uncertainty_key） */
  uncertaintyKey: string;
  /** 不確かさ基準名（uncertainty_name） */
  uncertaintyName: string;
  /** 名前空間ID */
  nameSpaceId: string;
  /** バージョン番号（整数） */
  version: number;
  /** 評価方式（1: 定量 / 2: 定性） */
  evaluationMethod: number;
  /** 無効フラグ */
  isInvalid: boolean;
  /** 継承元不確かさ基準Key */
  inheritanceUncertaintyKey: string | null;
  /** xsi:type（定量のみ） */
  xsiType: string | null;
  /** 単位（定量のみ） */
  units: string | null;
  /** フォーマット文字列（定量のみ） */
  formatString: string | null;
  /** 説明 */
  description: string | null;
}

/**
 * API レスポンス用の不確かさ基準詳細型（intuition_selector を含む）
 */
export interface UncertaintyCriteriaDetailRow extends UncertaintyCriteriaRow {
  /** 定性評価の選択肢（定量の場合は空配列） */
  qualitativeOptions: QualitativeOptionRow[];
}

/**
 * 定性評価選択肢の型（intuition_selector テーブルに対応）
 */
export interface QualitativeOptionRow {
  /** 表示順（1始まり） */
  displayOrder: number;
  /** 選択肢の値 */
  selectorValue: string;
  /** 表示色（#RRGGBB） */
  displayColor: string;
  /** デフォルト選択肢フラグ */
  isDefault: boolean;
}

/**
 * セレクター用の不確かさ基準型（フロントエンドの UncertaintyCriteria 型に対応）
 */
export interface UncertaintyCriteriaSelectorRow {
  /** 不確かさ基準Key */
  uncertaintyKey: string;
  /** 不確かさ基準名（uncertainty_name） */
  uncertaintyName: string;
  /** 名前空間ID */
  nameSpaceId: string;
  /** バージョン番号 */
  version: number;
  /** 評価方式（1: 定量 / 2: 定性） */
  evaluationMethod: number;
  /** xsi:type（定量のみ） */
  xsiType: string | null;
  /** 単位（定量のみ） */
  units: string | null;
  /** フォーマット文字列（定量のみ） */
  formatString: string | null;
  /** 説明 */
  description: string | null;
  /** 定性評価の選択肢（定量の場合は空配列） */
  qualitativeOptions: QualitativeOptionRow[];
}

// ============================================================================
// 保存リクエスト型
// ============================================================================

/**
 * 不確かさ基準 新バージョン保存リクエストの型
 */
export interface InsertNewVersionRequest {
  /** 名前空間ID */
  nameSpaceId: string;
  /** 不確かさ基準Key */
  uncertaintyKey: string;
  /** 不確かさ基準名 */
  uncertaintyName: string;
  /** 評価方式（1: 定量 / 2: 定性） */
  evaluationMethod: number;
  /** 無効フラグ */
  isInvalid: boolean;
  /** 継承元不確かさ基準Key（NULL許容） */
  inheritanceUncertaintyKey: string | null;
  /** xsi:type（定量のみ / NULL許容） */
  xsiType: string | null;
  /** 単位（定量のみ / NULL許容） */
  units: string | null;
  /** フォーマット文字列（定量のみ / NULL許容） */
  formatString: string | null;
  /** 説明（NULL許容） */
  description: string | null;
  /** 定性評価の選択肢（定量の場合は空配列） */
  qualitativeOptions: {
    displayOrder: number;
    value: string;
    displayColor: string;
    isDefault: boolean;
  }[];
  /** 作成者ユーザID */
  createUserId: string;
}

/**
 * 不確かさ基準 新バージョン保存レスポンスの型
 */
export interface InsertNewVersionResponse {
  /** 新たに採番されたバージョン番号 */
  version: number;
}

// ============================================================================
// Repository 関数
// ============================================================================

/**
 * 組織に紐づく不確かさ基準一覧を取得
 *
 * @param organizationId - 組織ID
 * @returns 不確かさ基準一覧（フロントエンド用に整形済み）
 */
export async function findAllByOrganization(
  organizationId: string
): Promise<UncertaintyCriteriaRow[]> {
  const pgp = getPgp();

  // 外部SQLファイルを読み込み（pg-promise + SQLファイル外部管理パターン）
  const sqlQuery = await loadSqlFile('uncertainty_criteria/findAllByOrganization.sql');

  return await pgp.any<UncertaintyCriteriaRow>(sqlQuery, [organizationId]);
}

/**
 * 不確かさ基準1件を詳細取得（定性評価の選択肢も含む）
 *
 * @param organizationId - 組織ID
 * @param uncertaintyKey - 不確かさ基準Key
 * @param version - バージョン番号
 * @returns 不確かさ基準詳細（見つからない場合は null）
 */
export async function findByKey(
  organizationId: string,
  uncertaintyKey: string,
  version: number
): Promise<UncertaintyCriteriaDetailRow | null> {
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('uncertainty_criteria/findByKey.sql');

  // LEFT JOIN のため同一 uncertainty_criteria が複数行返る（intuition_selector の行数分）
  const rows = await pgp.any<
    UncertaintyCriteriaRow & {
      displayOrder: number | null;
      selectorValue: string | null;
      displayColor: string | null;
      isDefault: boolean | null;
    }
  >(sqlQuery, [organizationId, uncertaintyKey, version]);

  if (rows.length === 0) return null;

  // 1行目から uncertainty_criteria の共通フィールドを取り出す
  const first = rows[0];
  const detail: UncertaintyCriteriaDetailRow = {
    uncertaintyKey:            first.uncertaintyKey,
    uncertaintyName:           first.uncertaintyName,
    nameSpaceId:               first.nameSpaceId,
    version:                   first.version,
    evaluationMethod:          first.evaluationMethod,
    isInvalid:                 first.isInvalid,
    inheritanceUncertaintyKey: first.inheritanceUncertaintyKey,
    xsiType:                   first.xsiType,
    units:                     first.units,
    formatString:              first.formatString,
    description:               first.description,
    // intuition_selector の行を QualitativeOptionRow[] に変換
    qualitativeOptions: rows
      .filter((r) => r.displayOrder !== null)
      .map((r) => ({
        displayOrder:  r.displayOrder as number,
        selectorValue: r.selectorValue as string,
        displayColor:  r.displayColor as string,
        isDefault:     r.isDefault as boolean,
      })),
  };

  return detail;
}

/**
 * セレクター用の不確かさ基準一覧を取得（有効なもののみ、定性評価の選択肢も含む）
 *
 * @param organizationId - 組織ID
 * @returns セレクター用不確かさ基準一覧（intuition_selector を集約済み）
 */
export async function findForSelector(
  organizationId: string
): Promise<UncertaintyCriteriaSelectorRow[]> {
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('uncertainty_criteria/findForSelector.sql');

  // LEFT JOIN のため同一 uncertainty_criteria が複数行返る（intuition_selector の行数分）
  const rows = await pgp.any<{
    uncertaintyKey:   string;
    uncertaintyName:  string;
    nameSpaceId:      string;
    version:          number;
    evaluationMethod: number;
    xsiType:          string | null;
    units:            string | null;
    formatString:     string | null;
    description:      string | null;
    displayOrder:     number | null;
    selectorValue:    string | null;
    displayColor:     string | null;
    isDefault:        boolean | null;
  }>(sqlQuery, [organizationId]);

  if (rows.length === 0) return [];

  // uncertainty_key + version でグループ化して UncertaintyCriteriaSelectorRow[] に変換
  const map = new Map<string, UncertaintyCriteriaSelectorRow>();

  for (const row of rows) {
    const mapKey = `${row.uncertaintyKey}@${row.version}`;

    if (!map.has(mapKey)) {
      map.set(mapKey, {
        uncertaintyKey:   row.uncertaintyKey,
        uncertaintyName:  row.uncertaintyName,
        nameSpaceId:      row.nameSpaceId,
        version:          row.version,
        evaluationMethod: row.evaluationMethod,
        xsiType:          row.xsiType,
        units:            row.units,
        formatString:     row.formatString,
        description:      row.description,
        qualitativeOptions: [],
      });
    }

    // intuition_selector の行がある場合のみ選択肢を追加
    if (row.displayOrder !== null) {
      map.get(mapKey)!.qualitativeOptions.push({
        displayOrder:  row.displayOrder,
        selectorValue: row.selectorValue as string,
        displayColor:  row.displayColor as string,
        isDefault:     row.isDefault as boolean,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * 不確かさ基準を新バージョンとして保存する
 *
 * @remarks
 * トランザクション内で以下を実行する：
 *  1. uncertainty_criteria に MAX(version)+1 で新規 INSERT（insertNewVersion.sql）
 *  2. 定性評価（evaluationMethod=2）の場合、intuition_selector に選択肢を INSERT（insertIntuitionSelector.sql）
 *
 * @param organizationId - 組織ID
 * @param data - 保存リクエストデータ
 * @returns 新たに採番されたバージョン番号
 */
export async function insertNewVersion(
  organizationId: string,
  data: InsertNewVersionRequest
): Promise<InsertNewVersionResponse> {
  const pgp = getPgp();

  const insertCriteriaSql      = await loadSqlFile('uncertainty_criteria/insertNewVersion.sql');
  const insertSelectorSql      = await loadSqlFile('uncertainty_criteria/insertIntuitionSelector.sql');
  const invalidatePrevSql      = await loadSqlFile('uncertainty_criteria/invalidatePreviousVersions.sql');

  return await pgp.tx(async (t) => {
    // ── 1. uncertainty_criteria に新バージョンを INSERT ──
    const criteriaRow = await t.one(insertCriteriaSql, [
      organizationId,                       // $1  organization_id
      data.nameSpaceId,                     // $2  name_space_id
      data.uncertaintyKey,                  // $3  uncertainty_key
      data.uncertaintyName,                 // $4  uncertainty_name
      data.evaluationMethod,                // $5  evaluation_method
      data.isInvalid,                       // $6  is_Invalid
      data.inheritanceUncertaintyKey,       // $7  inheritance_uncertainty_key
      data.xsiType,                         // $8  xsi_type
      data.units,                           // $9  units
      data.formatString,                    // $10 format_string
      data.description,                     // $11 description
      data.createUserId,                    // $12 create_user_id
    ]);

    const newVersion = criteriaRow.version;

    // ── 2. 旧バージョンを一括無効化（is_Invalid = TRUE） ──
    await t.none(invalidatePrevSql, [
      organizationId,       // $1  organization_id
      data.nameSpaceId,     // $2  name_space_id
      data.uncertaintyKey,  // $3  uncertainty_key
      newVersion,           // $4  new_version（それより小さい version が対象）
      data.createUserId,    // $5  update_user_id
    ]);

    // ── 3. 定性評価の場合、intuition_selector に選択肢を INSERT ──
    if (data.evaluationMethod === 2 && data.qualitativeOptions.length > 0) {
      for (const opt of data.qualitativeOptions) {
        await t.none(insertSelectorSql, [
          organizationId,       // $1  organization_id
          data.nameSpaceId,     // $2  name_space_id
          data.uncertaintyKey,  // $3  uncertainty_key
          newVersion,           // $4  version
          opt.displayOrder,     // $5  display_order
          opt.value,            // $6  value
          opt.displayColor,     // $7  display_color
          opt.isDefault,        // $8  is_default
          data.createUserId,    // $9  create_user_id
        ]);
      }
    }

    return { version: newVersion };
  });
}

// ============================================================================
// 複数キー一括取得（experimentInstructionService 用）
// ============================================================================

/**
 * 複数の uncertainty_key に対応する最新有効レコードを一括取得する
 *
 * @remarks
 * - is_Invalid = FALSE かつ最大 version のレコードを返す
 * - 組織 ID でフィルタリングし、マルチテナント分離を維持する
 * - uncertainty_key が DB に存在しない場合は単に結果に含まれない（エラーにならない）
 *
 * @param organizationId - 組織ID
 * @param keys           - 検索する uncertainty_key の配列
 * @returns `{ key: string; uncertainty_name: string }[]`
 */
export async function findByKeys(
  organizationId: string,
  keys: string[]
): Promise<Array<{ key: string; uncertainty_name: string }>> {
  if (keys.length === 0) return [];

  const pgp = getPgp();

  // 外部SQLファイルからクエリを読み込み実行する
  const sqlQuery = await loadSqlFile('uncertainty_criteria/findByKeys.sql');
  const rows = await pgp.manyOrNone<{ key: string; uncertainty_name: string }>(
    sqlQuery,
    [organizationId, keys]
  );

  return rows;
}

// ============================================================================
// 複数キー詳細一括取得（experimentDataService 用）
// ============================================================================

/**
 * 定量/定性分類込みの不確かさ基準詳細を複数キーで一括取得する
 *
 * @remarks
 * - is_Invalid = FALSE かつ最大 version のレコードを返す
 * - evaluation_method（1=定量 / 2=定性）・termDisplayName・intuition_selector 選択肢を含む
 * - 組織 ID でフィルタリングし、マルチテナント分離を維持する
 *
 * @param organizationId - 組織ID
 * @param keys           - 検索する uncertainty_key の配列
 * @returns 各キーの詳細情報配列
 */
export async function findByKeysWithDetails(
  organizationId: string,
  keys: string[]
): Promise<UncertaintyKeyDetail[]> {
  if (keys.length === 0) return [];

  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('uncertainty_criteria/findByKeysWithDetails.sql');
  const rows = await pgp.manyOrNone<{
    uncertaintyKey:     string;
    uncertaintyName:    string;
    evaluationMethod:   number;
    termDisplayName:    string | null;
    qualitativeOptions: QualitativeOptionRow[];
  }>(sqlQuery, [organizationId, keys]);

  return rows.map((r) => ({
    uncertaintyKey:     r.uncertaintyKey,
    uncertaintyName:    r.uncertaintyName,
    evaluationMethod:   r.evaluationMethod,
    termDisplayName:    r.termDisplayName ?? null,
    qualitativeOptions: Array.isArray(r.qualitativeOptions) ? r.qualitativeOptions : [],
  }));
}

/**
 * findByKeysWithDetails の戻り値型
 */
export interface UncertaintyKeyDetail {
  /** 不確かさ基準Key */
  uncertaintyKey: string;
  /** 不確かさ基準名 */
  uncertaintyName: string;
  /** 評価方式（1: 定量 / 2: 定性） */
  evaluationMethod: number;
  /** 名前空間の表示名（namespace_term.display_name） */
  termDisplayName: string | null;
  /** 定性評価の選択肢（定量の場合は空配列） */
  qualitativeOptions: QualitativeOptionRow[];
}
