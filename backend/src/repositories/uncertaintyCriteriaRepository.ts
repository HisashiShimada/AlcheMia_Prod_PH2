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
  /** スケールファクター（定量のみ） */
  scaleFactor: string | null;
  /** フォーマット文字列（定量のみ） */
  formatString: string | null;
  /** 許容上限値（手入力値の良好/不良判定用。NULL=判定なし） */
  toleranceUpper: number | null;
  /** 許容下限値（手入力値の良好/不良判定用。NULL=判定なし） */
  toleranceLower: number | null;
  /** 説明 */
  description: string | null;
  /** namespace.scope_key（organization_group_cd または user_id） */
  scopeKey: string | null;
  /** スコープ表示名（organization_group.organization_group_name または organization_user.user_name） */
  scopeName: string | null;
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
  /** スケールファクター（定量のみ） */
  scaleFactor: string | null;
  /** フォーマット文字列（定量のみ） */
  formatString: string | null;
  /** 許容上限値（手入力値の良好/不良判定用。NULL=判定なし） */
  toleranceUpper: number | null;
  /** 許容下限値（手入力値の良好/不良判定用。NULL=判定なし） */
  toleranceLower: number | null;
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
  /** スケールファクター（定量のみ / NULL許容） */
  scaleFactor: string | null;
  /** フォーマット文字列（定量のみ / NULL許容） */
  formatString: string | null;
  /** 許容上限値（手入力値判定用 / NULL許容） */
  toleranceUpper: number | null;
  /** 許容下限値（手入力値判定用 / NULL許容） */
  toleranceLower: number | null;
  /** 説明（NULL許容） */
  description: string | null;
  /** 定性評価の選択肢（定量の場合は空配列） */
  qualitativeOptions: {
    displayOrder: number;
    value: string;
    displayColor: string;
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
 * @param nameSpaceId    - 名前空間ID（省略または null の場合は全件取得）
 * @returns 不確かさ基準一覧（フロントエンド用に整形済み）
 */
export async function findAllByOrganization(
  organizationId: string,
  nameSpaceId?: string | null
): Promise<UncertaintyCriteriaRow[]> {
  const pgp = getPgp();

  // 外部SQLファイルを読み込み（pg-promise + SQLファイル外部管理パターン）
  const sqlQuery = await loadSqlFile('uncertainty_criteria/findAllByOrganization.sql');

  return await pgp.any<UncertaintyCriteriaRow>(sqlQuery, [organizationId, nameSpaceId ?? null]);
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
    scaleFactor:               (first as any).scaleFactor ?? null,
    formatString:              first.formatString,
    toleranceUpper:            (first as any).toleranceUpper ?? null,
    toleranceLower:            (first as any).toleranceLower ?? null,
    description:               first.description,
    // findByKey.sql にはスコープ情報の JOIN がないため null を設定（詳細画面では未使用）
    scopeKey:                  null,
    scopeName:                 null,
    // intuition_selector の行を QualitativeOptionRow[] に変換
    qualitativeOptions: rows
      .filter((r) => r.displayOrder !== null)
      .map((r) => ({
        displayOrder:  r.displayOrder as number,
        selectorValue: r.selectorValue as string,
        displayColor:  r.displayColor as string,
      })),
  };

  return detail;
}

/**
 * セレクター用の不確かさ基準一覧を取得（有効なもののみ、定性評価の選択肢も含む）
 *
 * @param organizationId - 組織ID
 * @param organizationGroupCd - 組織グループCD（省略または null の場合は全件取得）
 *   指定時: グループ＋祖先グループ＋組織共通スコープの基準のみ返す
 *   未指定: 組織内全件返す（後方互換）
 * @returns セレクター用不確かさ基準一覧（intuition_selector を集約済み）
 */
export async function findForSelector(
  organizationId: string,
  organizationGroupCd?: string | null
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
    scaleFactor:      string | null;
    formatString:     string | null;
    toleranceUpper:   number | null;
    toleranceLower:   number | null;
    description:      string | null;
    displayOrder:     number | null;
    selectorValue:    string | null;
    displayColor:     string | null;
  }>(sqlQuery, [organizationId, organizationGroupCd ?? null]);

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
        scaleFactor:      row.scaleFactor,
        formatString:     row.formatString,
        toleranceUpper:   row.toleranceUpper,
        toleranceLower:   row.toleranceLower,
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
      data.scaleFactor,                     // $10 scale_factor
      data.formatString,                    // $11 format_string
      data.toleranceUpper ?? null,          // $12 tolerance_upper
      data.toleranceLower ?? null,          // $13 tolerance_lower
      data.description,                     // $14 description
      data.createUserId,                    // $15 create_user_id
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
          data.createUserId,    // $8  create_user_id
        ]);
      }
    }

    return { version: newVersion };
  });
}

// ============================================================================
// エクスポート用複数キー詳細取得
// ============================================================================

/**
 * エクスポート用に複数の uncertainty_key の全バージョン詳細を一括取得する
 *
 * @remarks
 * - 指定した uncertainty_key の全バージョン（全 is_Invalid）を返す
 * - intuition_selector の選択肢も含む（LEFT JOIN で1レコードが複数行になる）
 * - 組織 ID でフィルタリングし、マルチテナント分離を維持する
 *
 * @param organizationId - 組織ID
 * @param uncertaintyKeys - 取得する uncertainty_key の配列
 * @returns エクスポート用の詳細行配列（intuition_selector は複数行で返る）
 */
export async function findByUncertaintyKeysForExport(
  organizationId: string,
  uncertaintyKeys: string[]
): Promise<ExportDetailRow[]> {
  if (uncertaintyKeys.length === 0) return [];

  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('uncertainty_criteria/findByUncertaintyKeys.sql');
  const rows = await pgp.manyOrNone<ExportDetailRow>(sqlQuery, [organizationId, uncertaintyKeys]);

  return rows;
}

/**
 * エクスポート用の詳細行型（intuition_selector を含む）
 */
export interface ExportDetailRow {
  uncertaintyKey: string;
  uncertaintyName: string;
  nameSpaceId: string;
  version: number;
  evaluationMethod: number;
  isInvalid: boolean;
  inheritanceUncertaintyKey: string | null;
  xsiType: string | null;
  units: string | null;
  scaleFactor: string | null;
  formatString: string | null;
  toleranceUpper: number | null;
  toleranceLower: number | null;
  description: string | null;
  displayOrder: number | null;
  selectorValue: string | null;
  displayColor: string | null;
}

// ============================================================================
// インポート用バルクINSERT
// ============================================================================

/**
 * インポート用バルクINSERT リクエストの1件型
 */
export interface BulkInsertCriteriaItem {
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
  /** スケールファクター（定量のみ / NULL許容） */
  scaleFactor: string | null;
  /** フォーマット文字列（定量のみ / NULL許容） */
  formatString: string | null;
  /** 許容上限値（NULL許容） */
  toleranceUpper: number | null;
  /** 許容下限値（NULL許容） */
  toleranceLower: number | null;
  /** 説明（NULL許容） */
  description: string | null;
  /** 作成ユーザーID */
  createUserId: string;
  /** 定性評価の選択肢（定量の場合は空配列） */
  qualitativeOptions: Array<{
    displayOrder: number;
    value: string;
    displayColor: string;
  }>;
}

/**
 * インポート用バルクINSERT レスポンス型
 */
export interface BulkInsertCriteriaResponse {
  /** 挿入に成功した件数 */
  insertedCount: number;
  /** スキップされた件数（重複キー・バージョン衝突） */
  skippedCount: number;
}

/**
 * 不確かさ基準を複数件インポートする（バルクINSERT）
 *
 * @remarks
 * - 各アイテムを個別トランザクションで insertNewVersion と同一ロジックで INSERT
 * - 重複エラーが発生した場合はスキップしてカウントする
 * - 全体はひとつのトランザクションで実行する
 *
 * @param organizationId - 組織ID
 * @param items - インポートするデータの配列
 * @returns 挿入成功件数とスキップ件数
 */
export async function bulkInsertCriteria(
  organizationId: string,
  items: BulkInsertCriteriaItem[]
): Promise<BulkInsertCriteriaResponse> {
  if (items.length === 0) return { insertedCount: 0, skippedCount: 0 };

  const pgp = getPgp();

  const insertCriteriaSql  = await loadSqlFile('uncertainty_criteria/insertNewVersion.sql');
  const insertSelectorSql  = await loadSqlFile('uncertainty_criteria/insertIntuitionSelector.sql');
  const invalidatePrevSql  = await loadSqlFile('uncertainty_criteria/invalidatePreviousVersions.sql');

  let insertedCount = 0;
  let skippedCount  = 0;

  await pgp.tx(async (t) => {
    for (const item of items) {
      try {
        // 新バージョン INSERT（MAX(version)+1 で採番）
        const criteriaRow = await t.one(insertCriteriaSql, [
          organizationId,
          item.nameSpaceId,
          item.uncertaintyKey,
          item.uncertaintyName,
          item.evaluationMethod,
          item.isInvalid,
          item.inheritanceUncertaintyKey ?? null,
          item.xsiType ?? null,
          item.units ?? null,
          item.scaleFactor ?? null,
          item.formatString ?? null,
          item.toleranceUpper !== undefined ? item.toleranceUpper : null,
          item.toleranceLower !== undefined ? item.toleranceLower : null,
          item.description ?? null,
          item.createUserId,
        ]);

        const newVersion = criteriaRow.version;

        // 旧バージョンを無効化
        await t.none(invalidatePrevSql, [
          organizationId,
          item.nameSpaceId,
          item.uncertaintyKey,
          newVersion,
          item.createUserId,
        ]);

        // 定性評価の場合は intuition_selector に選択肢を INSERT
        if (item.evaluationMethod === 2 && item.qualitativeOptions.length > 0) {
          for (const opt of item.qualitativeOptions) {
            await t.none(insertSelectorSql, [
              organizationId,
              item.nameSpaceId,
              item.uncertaintyKey,
              newVersion,
              opt.displayOrder,
              opt.value,
              opt.displayColor,
              item.createUserId,
            ]);
          }
        }

        insertedCount++;
      } catch {
        // 重複などのエラーはスキップ
        skippedCount++;
      }
    }
  });

  return { insertedCount, skippedCount };
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
