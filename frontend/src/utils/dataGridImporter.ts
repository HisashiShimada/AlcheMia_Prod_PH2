/**
 * dataGridImporter.ts
 *
 * CSV / XML ファイルから 2次元数値配列（number[][]）を生成するユーティリティ。
 * UIに依存しない純粋な変換関数として設計し、任意のコンポーネントから再利用できる。
 *
 * 使用ライブラリ:
 *   - papaparse  ^5.5.3  — CSV パース
 *   - xml-js     ^1.6.11 — XML パース
 */

import Papa from 'papaparse';
import { xml2js } from 'xml-js';

// ── 定数 ────────────────────────────────────────────────────────────────────

/** デフォルトのファイルサイズ上限（50 MB）。旧実装の InsertionFileUpload.js に合わせた値。 */
export const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

// ── 型定義 ──────────────────────────────────────────────────────────────────

/**
 * インポート処理で使用するメッセージテンプレート。
 * UI非依存のユーティリティに多言語メッセージを注入するためのインターフェース。
 * 呼び出し元（useContentGridEditor 等）が t() で生成した文字列を渡す。
 */
export interface ImportMessages {
  /**
   * セルが数値に変換できない場合の警告メッセージ生成関数。
   * @param row 1始まりの行番号
   * @param col 1始まりの列番号
   * @param value 変換できなかった値（文字列）
   */
  cellNotNumber: (row: number, col: number, value: unknown) => string;
  /**
   * ファイルサイズ超過時のエラーメッセージ生成関数。
   * @param maxMb 上限（MB）
   * @param fileMb 実際のファイルサイズ（MB）
   */
  fileSizeExceeded: (maxMb: string, fileMb: string) => string;
  /**
   * XML パース失敗時のエラーメッセージ生成関数。
   * @param message エラーの詳細
   */
  xmlParseFailed: (message: string) => string;
  /**
   * XML から数値データが見つからない場合の警告メッセージ。
   */
  xmlNoData: string;
  /**
   * CSV パースエラー時の警告メッセージ生成関数。
   * @param row エラーが発生した行（不明な場合は '?'）
   * @param message エラーの詳細
   */
  csvParseError: (row: string, message: string) => string;
}

/**
 * デフォルトの ImportMessages（日本語）。
 * 呼び出し元が messages を省略した場合のフォールバック。
 */
export const DEFAULT_IMPORT_MESSAGES: ImportMessages = {
  cellNotNumber: (row, col, value) =>
    `行 ${row} 列 ${col}: "${value}" は数値に変換できません。0 として扱います。`,
  fileSizeExceeded: (maxMb, fileMb) =>
    `ファイルサイズが上限（${maxMb} MB）を超えています（${fileMb} MB）`,
  xmlParseFailed: (message) => `XMLのパースに失敗しました: ${message}`,
  xmlNoData: '数値データが見つかりませんでした。XMLの構造を確認してください。',
  csvParseError: (row, message) => `CSV パースエラー（行 ${row}）: ${message}`,
};

export interface ImportOptions {
  /** ファイルサイズ上限（バイト）。未指定時は DEFAULT_MAX_FILE_SIZE を使用 */
  maxFileSize?: number;
  /**
   * インポート処理で使用するメッセージ群。
   * 多言語対応が必要な場合は呼び出し元から t() を使って生成した関数を渡す。
   * 未指定時は DEFAULT_IMPORT_MESSAGES（日本語）を使用。
   */
  messages?: ImportMessages;
}

export interface ImportResult {
  /** パース結果の 2次元数値配列 */
  data: number[][];
  /** 警告メッセージ（空行スキップ・非数値セル変換等）。問題がない場合は空配列 */
  warnings: string[];
}

// ── ヘルパー ─────────────────────────────────────────────────────────────────

/**
 * セル値を数値に変換する。変換できない場合は 0 を返し、warningに記録する。
 */
function cellToNumber(
  cell: unknown,
  row: number,
  col: number,
  warnings: string[],
  messages: ImportMessages
): number {
  const n = Number(cell);
  if (isNaN(n)) {
    warnings.push(messages.cellNotNumber(row + 1, col + 1, cell));
    return 0;
  }
  return n;
}

/**
 * ファイルサイズのバリデーション。上限超過時は Error を throw する。
 */
function validateFileSize(file: File, maxFileSize: number, messages: ImportMessages): void {
  if (file.size > maxFileSize) {
    const maxMb = (maxFileSize / (1024 * 1024)).toFixed(0);
    const fileMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(messages.fileSizeExceeded(maxMb, fileMb));
  }
}

// ── CSV パーサー ─────────────────────────────────────────────────────────────

/**
 * CSV テキストを 2次元数値配列に変換する。
 *
 * - ヘッダー行の自動検出は行わず、全行を数値データとして処理する
 * - 空行・空列はスキップする
 * - 非数値セルは 0 に変換し、警告を記録する
 */
export function parseCsvToGrid(
  text: string,
  messages: ImportMessages = DEFAULT_IMPORT_MESSAGES
): ImportResult {
  const warnings: string[] = [];

  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
    // プロトタイプ汚染対策（papaparse 安全モード）
    worker: false,
    header: false,
    dynamicTyping: false,
  });

  if (result.errors && result.errors.length > 0) {
    result.errors.forEach((e) => {
      warnings.push(messages.csvParseError(e.row != null ? String(e.row) : '?', e.message));
    });
  }

  const data: number[][] = [];
  result.data.forEach((rowArr: string[], rowIdx: number) => {
    const numRow: number[] = rowArr.map((cell, colIdx) =>
      cellToNumber(cell.trim(), rowIdx, colIdx, warnings, messages)
    );
    if (numRow.length > 0) {
      data.push(numRow);
    }
  });

  return { data, warnings };
}

/**
 * CSV ファイルを読み込み、2次元数値配列に変換する。
 */
export async function parseCsvFileToGrid(
  file: File,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const messages = options.messages ?? DEFAULT_IMPORT_MESSAGES;
  validateFileSize(file, maxFileSize, messages);

  const text = await file.text();
  return parseCsvToGrid(text, messages);
}

// ── XML パーサー ─────────────────────────────────────────────────────────────

/**
 * xml-js が返すノード型の最低限の型定義
 */
interface XmlElement {
  type?: string;
  name?: string;
  text?: string;
  elements?: XmlElement[];
}

/**
 * XML ノードのテキスト内容（`_text` または children テキスト）を再帰的に取得する
 */
function getTextContent(node: XmlElement): string {
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text.trim();
  }
  if (node.elements) {
    return node.elements.map(getTextContent).join(' ');
  }
  return '';
}

/**
 * XML ツリーから `<content>` または `<value>` タグを再帰的に探して
 * スペース区切りの数値テキストを行として収集する。
 *
 * 旧実装（InsertionFileUpload.js）の XMLパースロジックを参考に実装。
 * 対応パターン:
 *   1. <content>1.0 2.5 3.0</content>  — 直接テキスト
 *   2. <content><value>1.0</value><value>2.5</value></content>  — 子 value タグ
 *   3. <data><row>1.0 2.5 3.0</row></data>  — row タグ
 *   4. <matrix><r>1 2 3</r><r>4 5 6</r></matrix>  — r タグ
 *   5. <values>1.0 2.5 3.0 4.0 5.5 6.0</values> — 全体テキスト（列数不明時は1列）
 */
export function parseXmlToGrid(
  xmlText: string,
  messages: ImportMessages = DEFAULT_IMPORT_MESSAGES
): ImportResult {
  const warnings: string[] = [];
  const data: number[][] = [];

  let root: XmlElement;
  try {
    root = xml2js(xmlText, { compact: false }) as XmlElement;
  } catch (e) {
    throw new Error(messages.xmlParseFailed(e instanceof Error ? e.message : String(e)));
  }

  /**
   * ノードを再帰探索してデータ行を収集する
   */
  function collectRows(node: XmlElement): void {
    if (!node.name && !node.elements) return;

    const tagName = node.name?.toLowerCase() ?? '';

    // content / value / row / r / data / values タグから数値データを取得
    const DATA_TAGS = new Set(['content', 'value', 'row', 'r', 'data', 'values']);

    if (DATA_TAGS.has(tagName)) {
      // 子が value タグの配列の場合: 各 value を1つの列として1行にまとめる
      const valueChildren = node.elements?.filter(
        (e) => e.name?.toLowerCase() === 'value'
      );
      if (valueChildren && valueChildren.length > 0) {
        const row: number[] = [];
        valueChildren.forEach((vc, colIdx) => {
          const text = getTextContent(vc).trim();
          if (text) {
            row.push(cellToNumber(text, data.length, colIdx, warnings, messages));
          }
        });
        if (row.length > 0) data.push(row);
        return; // 子要素は再帰不要
      }

      // テキストノードを持つ場合: スペース区切りで1行として処理
      const text = getTextContent(node).trim();
      if (text) {
        const tokens = text.split(/\s+/).filter((t) => t !== '');
        const row: number[] = tokens.map((token, colIdx) =>
          cellToNumber(token, data.length, colIdx, warnings, messages)
        );
        if (row.length > 0) data.push(row);
        return;
      }
    }

    // 再帰的に子ノードを探索
    if (node.elements) {
      node.elements.forEach(collectRows);
    }
  }

  collectRows(root);

  if (data.length === 0) {
    warnings.push(messages.xmlNoData);
  }

  return { data, warnings };
}

/**
 * XML ファイルを読み込み、2次元数値配列に変換する。
 */
export async function parseXmlFileToGrid(
  file: File,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const messages = options.messages ?? DEFAULT_IMPORT_MESSAGES;
  validateFileSize(file, maxFileSize, messages);

  const text = await file.text();
  return parseXmlToGrid(text, messages);
}
