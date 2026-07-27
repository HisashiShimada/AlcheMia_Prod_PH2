import React, { useRef } from 'react';
import { Input, Button, Typography, Space, Tooltip } from 'antd';
import { UploadOutlined, LoadingOutlined, ClearOutlined } from '@ant-design/icons';
import { useInsertionEditor } from '@/hooks/useInsertionEditor';
import type { Insertion } from '@/types/maiml-unified';

const { Text } = Typography;

/**
 * InsertionEditorCompact - WorkRecordPanel / TemplateInputPanel 用 Insertion 入力コンポーネント
 *
 * PropertyCard と同じ小型・グリッド馴染みの見た目（フォント11〜13px）で4フィールドを表示する。
 * ロジック（ハッシュ計算・アップロード確認・S3アップロード）は useInsertionEditor フックに委譲。
 * Phase 2: DnD・クリアボタン・ファイルサイズ制限・acceptedFormats を追加。
 *
 * @example
 * <InsertionEditorCompact
 *   value={insertion}
 *   onChange={(v) => handleInsertionChange(id, v)}
 *   maxFileSize={100 * 1024 * 1024}
 * />
 */

export interface InsertionEditorCompactProps {
  value: Insertion;
  onChange: (v: Insertion) => void;
  readOnly?: boolean;
  /** S3アップロード先パス（例: 'projects/sample_project/attachments'）。未指定時はアップロード確認なし */
  uploadTargetPath?: string;
  /** ファイルサイズ上限（バイト）。未指定時は制限なし */
  maxFileSize?: number;
  /** 許可するファイル形式（MIME or 拡張子）。未指定時は制限なし */
  acceptedFormats?: string[];
}

/** ラベルスタイル（PropertyCardの「想定値」ラベルと同等） */
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  display: 'block',
  marginBottom: 2,
  color: 'rgba(0,0,0,0.45)',
};

/** Input サイズ（小型 = 高さ24px相当） */
const inputSize = 'small' as const;

const InsertionEditorCompact: React.FC<InsertionEditorCompactProps> = ({
  value,
  onChange,
  readOnly = false,
  uploadTargetPath,
  maxFileSize,
  acceptedFormats,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    insertion,
    handleFileSelect,
    handleUriChange,
    handleHashMethodChange,
    handleHashValueChange,
    handleFormatChange,
    handleClear,
    isUploading,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    acceptAttr,
  } = useInsertionEditor({ value, onChange, uploadTargetPath, maxFileSize, acceptedFormats });

  const handleSelectButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  };

  const hasClearable = !!(insertion.uri || insertion.hash?.value);

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
        border: isDragOver ? '1px dashed #1677ff' : '1px dashed transparent',
        borderRadius: 4,
        backgroundColor: isDragOver ? 'rgba(22,119,255,0.06)' : undefined,
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      {/* 隠し file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept={acceptAttr}
        onChange={handleFileInputChange}
      />

      {/* DnD ヒント（ドラッグ中のみ表示） */}
      {isDragOver && (
        <div
          style={{
            textAlign: 'center',
            color: '#1677ff',
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          ここにドロップ
        </div>
      )}

      {/* URI + ファイル選択ボタン + クリアボタン */}
      <div>
        <Space style={{ marginBottom: 2 }}>
          <Text style={labelStyle}>URI</Text>
          {/* ファイル選択ボタン */}
          <Tooltip title={uploadTargetPath ? 'ファイルを選択してS3にアップロード' : 'ファイルを選択して自動入力（アップロードなし）'}>
            <Button
              type="text"
              size="small"
              icon={
                isUploading
                  ? <LoadingOutlined style={{ fontSize: 11 }} />
                  : <UploadOutlined style={{ fontSize: 11 }} />
              }
              onClick={handleSelectButtonClick}
              disabled={readOnly || isUploading}
              style={{ padding: '0 4px', height: 18, fontSize: 11, color: 'rgba(0,0,0,0.45)' }}
            />
          </Tooltip>
          {/* クリアボタン */}
          {hasClearable && !readOnly && (
            <Tooltip title="URI・ハッシュ・フォーマットをクリア">
              <Button
                type="text"
                size="small"
                icon={<ClearOutlined style={{ fontSize: 11 }} />}
                onClick={handleClear}
                disabled={isUploading}
                danger
                style={{ padding: '0 4px', height: 18, fontSize: 11 }}
              />
            </Tooltip>
          )}
        </Space>
        <Input
          size={inputSize}
          value={insertion.uri}
          onChange={(e) => handleUriChange(e.target.value)}
          placeholder="URI"
          disabled={readOnly || isUploading}
          style={{ fontSize: 12 }}
        />
      </div>

      {/* Hash Method */}
      <div>
        <Text style={labelStyle}>Hash Method</Text>
        <Input
          size={inputSize}
          value={insertion.hash?.method || ''}
          onChange={(e) => handleHashMethodChange(e.target.value)}
          placeholder="SHA-256"
          disabled={readOnly || isUploading}
          style={{ fontSize: 12 }}
        />
      </div>

      {/* Hash Value */}
      <div>
        <Text style={labelStyle}>Hash Value</Text>
        <Input
          size={inputSize}
          value={insertion.hash?.value || ''}
          onChange={(e) => handleHashValueChange(e.target.value)}
          placeholder="ハッシュ値"
          disabled={readOnly || isUploading}
          style={{ fontSize: 12 }}
        />
      </div>

      {/* Format */}
      <div>
        <Text style={labelStyle}>Format</Text>
        <Input
          size={inputSize}
          value={insertion.format || ''}
          onChange={(e) => handleFormatChange(e.target.value)}
          placeholder="例: application/xml"
          disabled={readOnly || isUploading}
          style={{ fontSize: 12 }}
        />
      </div>
    </div>
  );
};

export default InsertionEditorCompact;
