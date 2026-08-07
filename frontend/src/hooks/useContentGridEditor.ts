import { useCallback, useState } from 'react';
import { message } from 'antd';
import { parseCsvFileToGrid, parseXmlFileToGrid } from '@/utils/dataGridImporter';
import type { ImportMessages, ImportOptions } from '@/utils/dataGridImporter';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * useContentGridEditor - 2次元数値DataGrid編集の共通ロジックフック
 *
 * 行/列の追加・削除・セル値編集と CSV/XML インポートを担う。
 * useInsertionEditor と同様の設計方針（ロジック分離・UIはコンポーネントに委譲）。
 */

export interface UseContentGridEditorOptions {
  value: number[][];
  onChange: (v: number[][]) => void;
  /** ファイルサイズ上限（バイト）。未指定時は dataGridImporter のデフォルト（50MB）を使用 */
  maxFileSize?: number;
}

export interface UseContentGridEditorReturn {
  /** 現在のグリッド値（readonlyで参照用） */
  grid: number[][];
  /** 行数 */
  rowCount: number;
  /** 列数 */
  colCount: number;
  /** セル値変更 */
  handleCellChange: (row: number, col: number, value: number) => void;
  /** 行を末尾に追加 */
  handleAddRow: () => void;
  /** 指定行を削除 */
  handleRemoveRow: (row: number) => void;
  /** 列を末尾に追加 */
  handleAddCol: () => void;
  /** 指定列を削除 */
  handleRemoveCol: (col: number) => void;
  /** グリッド全体をクリア（1行1列の初期状態に戻す） */
  handleClear: () => void;
  /** CSV/XML ファイルをインポートしてグリッドに反映する */
  handleFileImport: (file: File) => Promise<void>;
  /** インポート中フラグ */
  isImporting: boolean;
  /** ドラッグ中フラグ（DnD視覚フィードバック用） */
  isDragOver: boolean;
  /** onDragOver ハンドラ（コンポーネントに渡す） */
  handleDragOver: (e: React.DragEvent) => void;
  /** onDragLeave ハンドラ（コンポーネントに渡す） */
  handleDragLeave: (e: React.DragEvent) => void;
  /** onDrop ハンドラ（コンポーネントに渡す） */
  handleDrop: (e: React.DragEvent) => void;
}

/** 初期グリッド（1行1列・0埋め） */
export const EMPTY_GRID: number[][] = [[0]];

export function useContentGridEditor({
  value,
  onChange,
  maxFileSize,
}: UseContentGridEditorOptions): UseContentGridEditorReturn {
  const { t } = useLanguage();
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  /** t() を使って ImportMessages を組み立てる（言語切り替え時に再生成される） */
  const importMessages: ImportMessages = {
    cellNotNumber: (row, col, value) =>
      t('contentGridEditor.cellNotNumber', {
        row: String(row),
        col: String(col),
        value: String(value),
      }),
    fileSizeExceeded: (maxMb, fileMb) =>
      t('contentGridEditor.fileSizeExceeded', { maxMb, fileMb }),
    xmlParseFailed: (message) =>
      t('contentGridEditor.xmlParseFailed', { message }),
    xmlNoData: t('contentGridEditor.xmlNoData'),
    csvParseError: (row, message) =>
      t('contentGridEditor.csvParseError', { row, message }),
  };

  const grid = value.length > 0 ? value : EMPTY_GRID;
  const rowCount = grid.length;
  const colCount = Math.max(...grid.map((r) => r.length), 1);

  /** セル値を変更する */
  const handleCellChange = useCallback(
    (row: number, col: number, val: number) => {
      const next = grid.map((r, ri) =>
        ri === row ? r.map((c, ci) => (ci === col ? val : c)) : r
      );
      onChange(next);
    },
    [grid, onChange]
  );

  /** 末尾に行を追加する（現在の列数に合わせて 0 埋め） */
  const handleAddRow = useCallback(() => {
    onChange([...grid, new Array(colCount).fill(0)]);
  }, [grid, colCount, onChange]);

  /** 指定行を削除する（最低1行は残す） */
  const handleRemoveRow = useCallback(
    (row: number) => {
      if (rowCount <= 1) return;
      onChange(grid.filter((_, ri) => ri !== row));
    },
    [grid, rowCount, onChange]
  );

  /** 末尾に列を追加する */
  const handleAddCol = useCallback(() => {
    onChange(grid.map((r) => [...r, 0]));
  }, [grid, onChange]);

  /** 指定列を削除する（最低1列は残す） */
  const handleRemoveCol = useCallback(
    (col: number) => {
      if (colCount <= 1) return;
      onChange(grid.map((r) => r.filter((_, ci) => ci !== col)));
    },
    [grid, colCount, onChange]
  );

  /** グリッドを 1行1列の初期状態にリセットする */
  const handleClear = useCallback(() => {
    onChange([[0]]);
  }, [onChange]);

  /** CSV/XML ファイルをインポートしてグリッドに反映する */
  const handleFileImport = useCallback(
    async (file: File) => {
      setIsImporting(true);
      try {
        const opts: ImportOptions = { maxFileSize, messages: importMessages };
        const ext = file.name.toLowerCase();
        let result;
        if (ext.endsWith('.csv')) {
          result = await parseCsvFileToGrid(file, opts);
        } else if (ext.endsWith('.xml')) {
          result = await parseXmlFileToGrid(file, opts);
        } else {
          message.error(t('contentGridEditor.importInvalidType'));
          return;
        }

        if (result.data.length === 0) {
          message.warning(t('contentGridEditor.importNoData'));
          return;
        }

        onChange(result.data);
        message.success(
          t('contentGridEditor.importSuccess', {
            rows: String(result.data.length),
            cols: String(Math.max(...result.data.map((r) => r.length))),
          })
        );

        // 警告がある場合は表示
        if (result.warnings.length > 0) {
          // 先頭3件のみ表示（多すぎる場合は省略）
          const shown = result.warnings.slice(0, 3);
          shown.forEach((w) => message.warning(w, 5));
          if (result.warnings.length > 3) {
            message.warning(t('contentGridEditor.importMoreWarnings', { n: String(result.warnings.length - 3) }));
          }
        }
      } catch (err) {
        message.error(err instanceof Error ? err.message : t('contentGridEditor.importFailed'));
      } finally {
        setIsImporting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, maxFileSize, importMessages.xmlNoData]
  );

  // ── DnD ハンドラ ──────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileImport(file);
      }
    },
    [handleFileImport]
  );

  return {
    grid,
    rowCount,
    colCount,
    handleCellChange,
    handleAddRow,
    handleRemoveRow,
    handleAddCol,
    handleRemoveCol,
    handleClear,
    handleFileImport,
    isImporting,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
