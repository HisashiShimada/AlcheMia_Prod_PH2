'use client';

import React, { useRef } from 'react';
import { Button, InputNumber, Space, Tooltip, Typography, Spin } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ClearOutlined,
  ImportOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useContentGridEditor } from '@/hooks/useContentGridEditor';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

/**
 * ContentGridEditor - 2次元数値DataGridエディタコンポーネント
 *
 * WorkRecordPanel の「Content 追加」スロットに配置する小型グリッドエディタ。
 * - 行/列の追加・削除
 * - セル値の直接編集（InputNumber）
 * - CSV / XML ファイルインポート（ドラッグ&ドロップ対応）
 * - グリッドクリア
 * ロジックは useContentGridEditor フックに委譲。
 *
 * @example
 * <ContentGridEditor
 *   value={actuals['content_slot1'] as number[][] ?? [[0]]}
 *   onChange={(v) => onActualChange(taskNo, transId, 'content_slot1', v)}
 *   readOnly={isReadOnly}
 * />
 */

export interface ContentGridEditorProps {
  value: number[][];
  onChange: (v: number[][]) => void;
  readOnly?: boolean;
  /** ファイルサイズ上限（バイト）。未指定時は 50MB */
  maxFileSize?: number;
}

/** ラベルスタイル（InsertionEditorCompact と統一） */
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(0,0,0,0.45)',
};

const ContentGridEditor: React.FC<ContentGridEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  maxFileSize,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = useContentGridEditor({ value, onChange, maxFileSize });

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileImport(file);
    e.target.value = '';
  };

  return (
    <div
      onDragOver={readOnly ? undefined : handleDragOver}
      onDragLeave={readOnly ? undefined : handleDragLeave}
      onDrop={readOnly ? undefined : handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 6,
        border: isDragOver ? '1px dashed #1677ff' : '1px solid #d9d9d9',
        borderRadius: 4,
        backgroundColor: isDragOver ? 'rgba(22,119,255,0.06)' : '#fff',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      {/* 隠し file input（CSV / XML） */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xml"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* ヘッダー行: ラベル + ツールバー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <Text style={labelStyle}>
          {t('contentGridEditor.label', { rows: String(rowCount), cols: String(colCount) })}
        </Text>
        {!readOnly && (
          <Space size={2}>
            {/* CSV/XML インポートボタン */}
            <Tooltip title={t('contentGridEditor.importTooltip')}>
              <Button
                type="text"
                size="small"
                icon={isImporting ? <LoadingOutlined style={{ fontSize: 11 }} /> : <ImportOutlined style={{ fontSize: 11 }} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                style={{ padding: '0 4px', height: 20, fontSize: 11, color: 'rgba(0,0,0,0.45)' }}
              />
            </Tooltip>
            {/* クリアボタン */}
            <Tooltip title={t('contentGridEditor.clearTooltip')}>
              <Button
                type="text"
                size="small"
                danger
                icon={<ClearOutlined style={{ fontSize: 11 }} />}
                onClick={handleClear}
                disabled={isImporting}
                style={{ padding: '0 4px', height: 20, fontSize: 11 }}
              />
            </Tooltip>
          </Space>
        )}
      </div>

      {/* DnD ヒント（ドラッグ中のみ） */}
      {isDragOver && (
        <div style={{ textAlign: 'center', color: '#1677ff', fontSize: 11, fontWeight: 500 }}>
          {t('contentGridEditor.dropHint')}
        </div>
      )}

      {/* グリッド本体 */}
      <Spin spinning={isImporting} size="small">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
            {/* 列ヘッダー */}
            <thead>
              <tr>
                {/* 行番号ヘッダー用の空セル */}
                <th style={{ width: 24, padding: 2 }} />
                {Array.from({ length: colCount }, (_, ci) => (
                  <th key={ci} style={{ padding: 2, minWidth: 60, textAlign: 'center' }}>
                    <Space size={1} direction="vertical">
                      <Text style={{ ...labelStyle, display: 'block' }}>{t('contentGridEditor.colHeader', { n: String(ci + 1) })}</Text>
                      {!readOnly && (
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined style={{ fontSize: 10 }} />}
                          disabled={colCount <= 1 || isImporting}
                          onClick={() => handleRemoveCol(ci)}
                          style={{ padding: '0 2px', height: 16, fontSize: 10 }}
                        />
                      )}
                    </Space>
                  </th>
                ))}
                {/* 列追加ボタン用ヘッダー */}
                {!readOnly && (
                  <th style={{ padding: 2, width: 28 }}>
                    <Tooltip title={t('contentGridEditor.addColTooltip')}>
                      <Button
                        type="text"
                        size="small"
                        icon={<PlusOutlined style={{ fontSize: 10 }} />}
                        onClick={handleAddCol}
                        disabled={isImporting}
                        style={{ padding: '0 2px', height: 20, fontSize: 10, color: '#1677ff' }}
                      />
                    </Tooltip>
                  </th>
                )}
              </tr>
            </thead>

            {/* データ行 */}
            <tbody>
              {grid.map((row, ri) => (
                <tr key={ri}>
                  {/* 行番号 + 行削除ボタン */}
                  <td style={{ padding: 2, textAlign: 'center', verticalAlign: 'middle' }}>
                    <Space size={1} direction="vertical">
                      <Text style={{ ...labelStyle, display: 'block', textAlign: 'center' }}>{ri + 1}</Text>
                      {!readOnly && (
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined style={{ fontSize: 10 }} />}
                          disabled={rowCount <= 1 || isImporting}
                          onClick={() => handleRemoveRow(ri)}
                          style={{ padding: '0 2px', height: 16, fontSize: 10 }}
                        />
                      )}
                    </Space>
                  </td>
                  {Array.from({ length: colCount }, (_, ci) => (
                    <td key={ci} style={{ padding: 2 }}>
                      <InputNumber
                        size="small"
                        value={row[ci] ?? 0}
                        onChange={(v) => handleCellChange(ri, ci, v ?? 0)}
                        disabled={readOnly || isImporting}
                        style={{ width: 72, fontSize: 12 }}
                        controls={false}
                      />
                    </td>
                  ))}
                  {/* 列追加列の空セル（レイアウト統一用） */}
                  {!readOnly && <td />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Spin>

      {/* 行追加ボタン */}
      {!readOnly && (
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={handleAddRow}
          disabled={isImporting}
          style={{ alignSelf: 'flex-start', fontSize: 11 }}
        >
          {t('contentGridEditor.addRowButton')}
        </Button>
      )}
    </div>
  );
};

export default ContentGridEditor;
