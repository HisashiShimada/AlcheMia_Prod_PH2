import React, { useRef } from 'react';
import { Input, Button, Typography, Space } from 'antd';
import { UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import { useInsertionEditor } from '@/hooks/useInsertionEditor';
import type { Insertion } from '@/types/maiml-unified';

const { Text } = Typography;

/**
 * InsertionEditorCompact - WorkRecordPanel 用 Insertion 入力コンポーネント
 *
 * PropertyCard と同じ小型・グリッド馴染みの見た目（フォント11〜13px）で4フィールドを表示する。
 * ロジック（ハッシュ計算・アップロード確認・S3アップロード）は useInsertionEditor フックに委譲。
 *
 * @example
 * <InsertionEditorCompact
 *   value={insertion}
 *   onChange={(v) => handleInsertionChange(id, v)}
 * />
 */

export interface InsertionEditorCompactProps {
  value: Insertion;
  onChange: (v: Insertion) => void;
  readOnly?: boolean;
  /** S3アップロード先パス（例: 'projects/sample_project/attachments'）。未指定時はアップロードボタン非表示 */
  uploadTargetPath?: string;
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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    insertion,
    handleFileSelect,
    handleUriChange,
    handleHashMethodChange,
    handleHashValueChange,
    handleFormatChange,
    isUploading,
  } = useInsertionEditor({ value, onChange, uploadTargetPath });

  /** 隠し input[type=file] をクリックして OS のファイル選択ダイアログを開く */
  const handleSelectButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // 同じファイルを再選択できるようリセット
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* 隠し file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* URI + ファイル選択ボタン */}
      <div>
        <Space style={{ marginBottom: 2 }}>
          <Text style={labelStyle}>URI</Text>
          {/* ファイル選択ボタンは常時表示。uploadTargetPath 未指定時はアップロード確認なし（ファイル名のみセット） */}
          <Button
            type="text"
            size="small"
            icon={isUploading ? <LoadingOutlined style={{ fontSize: 11 }} /> : <UploadOutlined style={{ fontSize: 11 }} />}
            onClick={handleSelectButtonClick}
            disabled={readOnly || isUploading}
            title={uploadTargetPath ? 'ファイルを選択してS3にアップロード' : 'ファイルを選択して自動入力（アップロードなし）'}
            style={{ padding: '0 4px', height: 18, fontSize: 11, color: 'rgba(0,0,0,0.45)' }}
          />
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
