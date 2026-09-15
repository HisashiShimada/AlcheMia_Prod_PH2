/**
 * uncertaintyCriteria Service
 *
 * 不確かさ基準管理に関するビジネスロジック
 *
 * @remarks
 * Controller と Repository の間を仲介するサービス層。
 * 現時点ではロジックをそのまま委譲するが、将来的な処理追加（バリデーション・変換等）は
 * このファイルに実装する。
 *
 * @module uncertaintyCriteriaService
 * @version 1.0.0
 */

import * as uncertaintyCriteriaRepository from '../repositories/uncertaintyCriteriaRepository';
import type {
  UncertaintyCriteriaRow,
  UncertaintyCriteriaDetailRow,
  UncertaintyCriteriaSelectorRow,
  InsertNewVersionRequest,
  InsertNewVersionResponse,
  ExportDetailRow,
  BulkInsertCriteriaItem,
  BulkInsertCriteriaResponse,
} from '../repositories/uncertaintyCriteriaRepository';

// 呼び出し元がインポートしやすいよう型を再エクスポートする
export type {
  UncertaintyCriteriaRow,
  UncertaintyCriteriaDetailRow,
  UncertaintyCriteriaSelectorRow,
  InsertNewVersionRequest,
  InsertNewVersionResponse,
  BulkInsertCriteriaResponse,
};

// ─────────────────────────────────────────────────────────────────────────────
// エクスポート/インポート用型定義
// ─────────────────────────────────────────────────────────────────────────────

/** エクスポートオプション */
export interface ExportOptions {
  /** エクスポート対象の uncertainty_key の配列 */
  uncertaintyKeys: string[];
  /** エクスポート形式（'xml' | 'json'） */
  format: string;
  /** 説明を含めるか */
  includeDesc: boolean;
  /** 継承情報を含めるか */
  includeExtends: boolean;
  /** 全バージョン（履歴）を含めるか */
  includeHistory: boolean;
}

/** エクスポート結果 */
export interface ExportResult {
  /** ファイル内容 */
  content: string;
  /** Content-Type */
  contentType: string;
  /** ダウンロードファイル名 */
  fileName: string;
}

/** インポートオプション */
export interface ImportOptions {
  /** ファイル内容（文字列） */
  fileContent: string;
  /** インポート形式（'csv' | 'json'） */
  format: string;
  /** 作成ユーザーID */
  createUserId: string;
  /** 取り込み先の名前空間ID */
  nameSpaceId: string;
}

/** インポート結果 */
export interface ImportResult {
  /** 挿入成功件数 */
  insertedCount: number;
  /** スキップ件数 */
  skippedCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 内部ヘルパー
// ─────────────────────────────────────────────────────────────────────────────

const CSV_REQUIRED_HEADERS = ['uncertaintyKey', 'uncertaintyName', 'evaluationMethod'] as const;

export const EXPORT_CSV_HEADERS = [
  'uncertaintyKey', 'uncertaintyName', 'evaluationMethod', 'isInvalid',
  'inheritanceUncertaintyKey', 'xsiType', 'units', 'scaleFactor',
  'formatString', 'toleranceUpper', 'toleranceLower', 'description',
] as const;

type GroupedEntry = {
  row: ExportDetailRow;
  options: Array<{ displayOrder: number; selectorValue: string; displayColor: string }>;
};

function groupExportRows(rows: ExportDetailRow[]): Map<string, GroupedEntry> {
  const map = new Map<string, GroupedEntry>();
  for (const row of rows) {
    const key = `${row.uncertaintyKey}::v${row.version}`;
    if (!map.has(key)) { map.set(key, { row, options: [] }); }
    if (row.selectorValue !== null && row.displayOrder !== null && row.displayColor !== null) {
      map.get(key)!.options.push({
        displayOrder: row.displayOrder, selectorValue: row.selectorValue, displayColor: row.displayColor,
      });
    }
  }
  return map;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildJsonExport(rows: ExportDetailRow[], opts: ExportOptions): string {
  const grouped = groupExportRows(rows);
  const entries: object[] = [];
  for (const [, { row, options: qualOpts }] of grouped) {
    const entry: Record<string, unknown> = {
      uncertaintyKey: row.uncertaintyKey, uncertaintyName: row.uncertaintyName,
      nameSpaceId: row.nameSpaceId, version: row.version,
      evaluationMethod: row.evaluationMethod, isInvalid: row.isInvalid,
      xsiType: row.xsiType, units: row.units, scaleFactor: row.scaleFactor,
      formatString: row.formatString, toleranceUpper: row.toleranceUpper, toleranceLower: row.toleranceLower,
    };
    if (opts.includeDesc) { entry.description = row.description; }
    if (opts.includeExtends) { entry.inheritanceUncertaintyKey = row.inheritanceUncertaintyKey; }
    if (row.evaluationMethod === 2) {
      entry.qualitativeOptions = qualOpts.sort((a, b) => a.displayOrder - b.displayOrder);
    }
    entries.push(entry);
  }
  return JSON.stringify(entries, null, 2);
}

function buildXmlExport(rows: ExportDetailRow[], opts: ExportOptions): string {
  const grouped = groupExportRows(rows);
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<UncertaintyCriteriaList xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
  ];
  for (const [, { row, options: qualOpts }] of grouped) {
    lines.push('  <UncertaintyCriteria>');
    lines.push(`    <uncertaintyKey>${escapeXml(row.uncertaintyKey)}</uncertaintyKey>`);
    lines.push(`    <uncertaintyName>${escapeXml(row.uncertaintyName)}</uncertaintyName>`);
    lines.push(`    <nameSpaceId>${escapeXml(row.nameSpaceId)}</nameSpaceId>`);
    lines.push(`    <version>${row.version}</version>`);
    lines.push(`    <evaluationMethod>${row.evaluationMethod}</evaluationMethod>`);
    lines.push(`    <isInvalid>${row.isInvalid}</isInvalid>`);
    if (row.xsiType) { lines.push(`    <xsiType>${escapeXml(row.xsiType)}</xsiType>`); }
    if (row.units) { lines.push(`    <units>${escapeXml(row.units)}</units>`); }
    if (row.scaleFactor) { lines.push(`    <scaleFactor>${escapeXml(row.scaleFactor)}</scaleFactor>`); }
    if (row.formatString) { lines.push(`    <formatString>${escapeXml(row.formatString)}</formatString>`); }
    if (row.toleranceUpper !== null) { lines.push(`    <toleranceUpper>${row.toleranceUpper}</toleranceUpper>`); }
    if (row.toleranceLower !== null) { lines.push(`    <toleranceLower>${row.toleranceLower}</toleranceLower>`); }
    if (opts.includeDesc && row.description) {
      lines.push(`    <description>${escapeXml(row.description)}</description>`);
    }
    if (opts.includeExtends && row.inheritanceUncertaintyKey) {
      lines.push(`    <inheritanceUncertaintyKey>${escapeXml(row.inheritanceUncertaintyKey)}</inheritanceUncertaintyKey>`);
    }
    if (row.evaluationMethod === 2 && qualOpts.length > 0) {
      lines.push('    <qualitativeOptions>');
      for (const opt of qualOpts.sort((a, b) => a.displayOrder - b.displayOrder)) {
        lines.push(`      <option><displayOrder>${opt.displayOrder}</displayOrder><value>${escapeXml(opt.selectorValue)}</value><displayColor>${escapeXml(opt.displayColor)}</displayColor></option>`);
      }
      lines.push('    </qualitativeOptions>');
    }
    lines.push('  </UncertaintyCriteria>');
  }
  lines.push('</UncertaintyCriteriaList>');
  return lines.join('\n');
}

function parseCsvLines(csvContent: string): string[][] {
  const lines: string[][] = [];
  for (const row of csvContent.split(/\r?\n/)) {
    if (row.trim() === '') continue;
    lines.push(row.split(',').map((cell) => cell.trim().replace(/^"(.*)"$/, '$1')));
  }
  return lines;
}

function csvRowToInsertItem(
  headers: string[], cells: string[], createUserId: string
): BulkInsertCriteriaItem {
  const get = (col: string): string => cells[headers.indexOf(col)] ?? '';
  const getOrNull = (col: string): string | null => { const v = get(col); return v === '' ? null : v; };
  const getNum = (col: string): number | null => {
    const v = get(col); if (v === '') return null; const n = parseFloat(v); return isNaN(n) ? null : n;
  };
  // nameSpaceId はファイル内のカラム値を優先して使用する
  const nameSpaceId = get('nameSpaceId');
  return {
    nameSpaceId, uncertaintyKey: get('uncertaintyKey'), uncertaintyName: get('uncertaintyName'),
    evaluationMethod: parseInt(get('evaluationMethod'), 10) || 1,
    isInvalid: get('isInvalid') === 'true',
    inheritanceUncertaintyKey: getOrNull('inheritanceUncertaintyKey'),
    xsiType: getOrNull('xsiType'), units: getOrNull('units'),
    scaleFactor: getOrNull('scaleFactor'), formatString: getOrNull('formatString'),
    toleranceUpper: getNum('toleranceUpper'), toleranceLower: getNum('toleranceLower'),
    description: getOrNull('description'), createUserId, qualitativeOptions: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// サービス関数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 組織に紐づく不確かさ基準一覧を取得する
 *
 * @param organizationId - 組織ID
 * @param nameSpaceId    - 名前空間ID（省略または null の場合は全件取得）
 * @returns 不確かさ基準一覧
 */
export async function getList(
  organizationId: string,
  nameSpaceId?: string | null
): Promise<UncertaintyCriteriaRow[]> {
  return uncertaintyCriteriaRepository.findAllByOrganization(organizationId, nameSpaceId);
}

/**
 * セレクター用の不確かさ基準一覧を取得する（有効なもののみ・定性評価の選択肢も含む）
 *
 * @param organizationId - 組織ID
 * @param organizationGroupCd - 組織グループCD（省略または null の場合は全件取得）
 * @returns セレクター用不確かさ基準一覧
 */
export async function getForSelector(
  organizationId: string,
  organizationGroupCd?: string | null
): Promise<UncertaintyCriteriaSelectorRow[]> {
  return uncertaintyCriteriaRepository.findForSelector(organizationId, organizationGroupCd);
}

/**
 * 不確かさ基準1件を詳細取得する（定性評価の選択肢も含む）
 *
 * @param organizationId - 組織ID
 * @param uncertaintyKey - 不確かさ基準Key
 * @param version - バージョン番号
 * @returns 不確かさ基準詳細（見つからない場合は null）
 */
export async function getDetail(
  organizationId: string,
  uncertaintyKey: string,
  version: number
): Promise<UncertaintyCriteriaDetailRow | null> {
  return uncertaintyCriteriaRepository.findByKey(organizationId, uncertaintyKey, version);
}

/**
 * 不確かさ基準を新バージョンとして保存する
 *
 * @remarks
 * 同一 (organization_id, name_space_id, uncertainty_key) の MAX(version)+1 で INSERT し、
 * 旧バージョンを一括無効化する。定性評価の場合は intuition_selector にも登録する。
 *
 * @param organizationId - 組織ID
 * @param data - 保存リクエストデータ
 * @returns 新たに採番されたバージョン番号
 */
export async function createNewVersion(
  organizationId: string,
  data: InsertNewVersionRequest
): Promise<InsertNewVersionResponse> {
  return uncertaintyCriteriaRepository.insertNewVersion(organizationId, data);
}

/**
 * 選択した不確かさ基準を指定形式でエクスポートする
 *
 * @param organizationId - 組織ID
 * @param options - エクスポートオプション
 * @returns エクスポート結果（content, contentType, fileName）
 */
export async function exportCriteria(
  organizationId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const allRows = await uncertaintyCriteriaRepository.findByUncertaintyKeysForExport(
    organizationId,
    options.uncertaintyKeys
  );

  let filteredRows: ExportDetailRow[];
  if (!options.includeHistory) {
    const latestVersionMap = new Map<string, number>();
    for (const row of allRows) {
      const current = latestVersionMap.get(row.uncertaintyKey);
      if (current === undefined || row.version > current) {
        latestVersionMap.set(row.uncertaintyKey, row.version);
      }
    }
    filteredRows = allRows.filter(
      (row) => latestVersionMap.get(row.uncertaintyKey) === row.version
    );
  } else {
    filteredRows = allRows;
  }

  const format = (options.format ?? 'xml').toLowerCase();
  if (format === 'json') {
    return {
      content: buildJsonExport(filteredRows, options),
      contentType: 'application/json; charset=utf-8',
      fileName: 'uncertainty-criteria.json',
    };
  }
  return {
    content: buildXmlExport(filteredRows, options),
    contentType: 'application/xml; charset=utf-8',
    fileName: 'uncertainty-criteria.xml',
  };
}

/**
 * ファイル内容を解析して不確かさ基準をインポートする
 *
 * @param organizationId - 組織ID
 * @param options - インポートオプション
 * @returns インポート結果（insertedCount, skippedCount）
 */
export async function importCriteria(
  organizationId: string,
  options: ImportOptions
): Promise<ImportResult> {
  const format = (options.format ?? 'csv').toLowerCase();
  const items: BulkInsertCriteriaItem[] = [];

  if (format === 'json') {
    const parsed = JSON.parse(options.fileContent) as unknown[];
    if (!Array.isArray(parsed)) {
      throw new Error('JSONファイルは配列形式である必要があります');
    }
    for (const entry of parsed) {
      const obj = entry as Record<string, unknown>;
      const item: BulkInsertCriteriaItem = {
        nameSpaceId:               obj.nameSpaceId != null ? String(obj.nameSpaceId) : options.nameSpaceId,
        uncertaintyKey:            String(obj.uncertaintyKey ?? ''),
        uncertaintyName:           String(obj.uncertaintyName ?? ''),
        evaluationMethod:          Number(obj.evaluationMethod ?? 1),
        isInvalid:                 Boolean(obj.isInvalid ?? false),
        inheritanceUncertaintyKey: obj.inheritanceUncertaintyKey != null ? String(obj.inheritanceUncertaintyKey) : null,
        xsiType:                   obj.xsiType != null ? String(obj.xsiType) : null,
        units:                     obj.units != null ? String(obj.units) : null,
        scaleFactor:               obj.scaleFactor != null ? String(obj.scaleFactor) : null,
        formatString:              obj.formatString != null ? String(obj.formatString) : null,
        toleranceUpper:            obj.toleranceUpper != null ? Number(obj.toleranceUpper) : null,
        toleranceLower:            obj.toleranceLower != null ? Number(obj.toleranceLower) : null,
        description:               obj.description != null ? String(obj.description) : null,
        createUserId:              options.createUserId,
        qualitativeOptions:        [],
      };
      if (Array.isArray(obj.qualitativeOptions)) {
        for (const opt of obj.qualitativeOptions as Record<string, unknown>[]) {
          item.qualitativeOptions.push({
            displayOrder: Number(opt.displayOrder ?? 1),
            value:        String(opt.value ?? ''),
            displayColor: String(opt.displayColor ?? '#000000'),
          });
        }
      }
      if (item.uncertaintyKey) { items.push(item); }
    }
  } else {
    // CSV パース
    const lines = parseCsvLines(options.fileContent);
    if (lines.length < 2) {
      throw new Error('CSVファイルにデータが含まれていません');
    }
    const headers = lines[0];
    const hasRequired = CSV_REQUIRED_HEADERS.every((h) => headers.includes(h));
    if (!hasRequired) {
      throw new Error(`CSVのヘッダーが正しくありません。必須カラム: ${CSV_REQUIRED_HEADERS.join(', ')}`);
    }
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i];
      if (cells.length === 0 || cells.every((c) => c === '')) continue;
      const item = csvRowToInsertItem(headers, cells, options.createUserId);
      if (item.uncertaintyKey) { items.push(item); }
    }
  }

  if (items.length === 0) { return { insertedCount: 0, skippedCount: 0 }; }

  const result = await uncertaintyCriteriaRepository.bulkInsertCriteria(organizationId, items);
  return { insertedCount: result.insertedCount, skippedCount: result.skippedCount };
}
