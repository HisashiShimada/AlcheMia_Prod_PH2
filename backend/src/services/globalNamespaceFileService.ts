/**
 * Global Namespace File Service
 *
 * グローバル名前空間宣言（prefix + URI）をファイルサーバで管理するサービス。
 *
 * @remarks
 * - 保存先: system/namespaces/global-declarations.csv（バケットルート直下・システム共通1ファイル）
 * - organization_id プレフィックスなし（テナント横断）
 * - storageService の uploadSystemFile / downloadSystemFile を使用
 *
 * CSV フォーマット:
 * ```
 * prefix,uri
 * maiml,http://www.maiml.org/schemas
 * xsi,http://www.w3.org/2001/XMLSchema-instance
 * ```
 *
 * @module globalNamespaceFileService
 */

import { getStorageService } from './storageService';
import type { GlobalDeclarationEntry } from '../types/service';

// re-export for convenience（他モジュールが同じ型を使う場合の利便性のため）
export type { GlobalDeclarationEntry } from '../types/service';

// ─── 定数 ─────────────────────────────────────────────────────────────────────

/** グローバル名前空間宣言ファイルのパス（system/ 配下） */
export const GLOBAL_DECLARATIONS_PATH = 'system/namespaces/global-declarations.csv';

/** CSV のヘッダー行 */
const CSV_HEADER = 'prefix,uri';

// ─── CSV パース / シリアライズ ────────────────────────────────────────────────

/**
 * CSV テキストをパースして宣言エントリ配列に変換する
 *
 * @param csvText CSV 文字列（ヘッダー行 "prefix,uri" 付き）
 * @returns パース結果（prefix / uri が空の行はスキップ）
 */
export function parseGlobalDeclarationsCsv(csvText: string): GlobalDeclarationEntry[] {
  const lines = csvText.split(/\r?\n/);
  const result: GlobalDeclarationEntry[] = [];

  // ヘッダー行を検証（最初の非空行が 'prefix,uri' と一致しなければエラー）
  const firstNonEmpty = lines.find((l) => l.trim());
  if (!firstNonEmpty || firstNonEmpty.trim() !== CSV_HEADER) {
    throw new Error(`CSVのヘッダー行が不正です。期待する形式: ${CSV_HEADER}`);
  }

  for (const line of lines) {
    const trimmed = line.trim();
    // ヘッダー行・空行をスキップ
    if (!trimmed || trimmed === CSV_HEADER) continue;

    const commaIdx = trimmed.indexOf(',');
    if (commaIdx === -1) continue;

    const prefix = trimmed.substring(0, commaIdx).trim();
    const uri = trimmed.substring(commaIdx + 1).trim();

    if (prefix && uri) {
      result.push({ prefix, uri });
    }
  }

  return result;
}

/**
 * 宣言エントリ配列を CSV テキストにシリアライズする
 *
 * @param declarations 宣言エントリ配列
 * @returns CSV 文字列（ヘッダー行付き）
 */
export function serializeGlobalDeclarationsCsv(declarations: GlobalDeclarationEntry[]): string {
  const lines = [CSV_HEADER];
  for (const { prefix, uri } of declarations) {
    lines.push(`${prefix},${uri}`);
  }
  return lines.join('\n');
}

// ─── ファイルサーバ読み書き ────────────────────────────────────────────────────

/**
 * ファイルサーバからグローバル名前空間宣言一覧を読み込む
 *
 * @remarks
 * ファイルが存在しない場合（初回・削除後）は空配列を返す。
 *
 * @returns グローバル名前空間宣言エントリ配列
 */
export async function readGlobalDeclarations(): Promise<GlobalDeclarationEntry[]> {
  const storageService = getStorageService();

  try {
    const buffer = await storageService.downloadSystemFile(GLOBAL_DECLARATIONS_PATH);
    const csvText = buffer.toString('utf-8');
    const declarations = parseGlobalDeclarationsCsv(csvText);
    console.log(`[globalNamespaceFileService] グローバル宣言読み込み完了: ${declarations.length} 件`);
    return declarations;
  } catch (error: any) {
    // ファイル不在（NoSuchKey / NotFound）は空配列を返す安全設計
    if (
      error.name === 'NoSuchKey' ||
      error.name === 'NotFound' ||
      error.$metadata?.httpStatusCode === 404
    ) {
      console.log(`[globalNamespaceFileService] グローバル宣言ファイル不在（空配列を返す）: ${GLOBAL_DECLARATIONS_PATH}`);
      return [];
    }
    console.error('[globalNamespaceFileService] グローバル宣言の読み込みに失敗しました:', error);
    throw error;
  }
}

/**
 * グローバル名前空間宣言一覧をファイルサーバへ書き込む
 *
 * @remarks
 * 既存ファイルは上書きされる。
 *
 * @param declarations 書き込む宣言エントリ配列
 */
export async function writeGlobalDeclarations(
  declarations: GlobalDeclarationEntry[]
): Promise<void> {
  const storageService = getStorageService();
  const csvText = serializeGlobalDeclarationsCsv(declarations);

  await storageService.uploadSystemFile(GLOBAL_DECLARATIONS_PATH, csvText, {
    contentType: 'text/csv',
  });

  console.log(`[globalNamespaceFileService] グローバル宣言書き込み完了: ${declarations.length} 件`);
}
