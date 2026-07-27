import React, { useRef } from 'react';
import { Form, Input, Button, Space, Tooltip } from 'antd';
import { UploadOutlined, LoadingOutlined, ClearOutlined } from '@ant-design/icons';
import { useInsertionEditor } from '@/hooks/useInsertionEditor';
import type { Insertion } from '@/types/maiml-unified';

/**
 * InsertionEditorForm - TemplateEditorDialog 用 Insertion 入力コンポーネント
 *
 * Form.Item レイアウト（ラベル付き・標準フォントサイズ）で4フィールドを表示する。
 * ロジック（ハッシュ計算・アップロード確認・S3アップロード）は useInsertionEditor フックに委譲。
 * Phase 2: DnD・クリアボタン・ファイルサイズ制限・acceptedFormats・画像プレビュー を追加。
 *
 * @example
 * <InsertionEditorForm
 *   value={insertion}
 *   onChange={(v) => { setInsertion(v); setHasChanges(true); }}
 *   uploadTargetPath={`projects/${projectName}/attachments`}
 *   maxFileSize={100 * 1024 * 1024}
 * />
 */

export interface InsertionEditorFormProps {
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

const InsertionEditorForm: React.FC<InsertionEditorFormProps> = ({
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

  /** 画像プレビュー用: URI が data: または http で始まる or format が image/* */
  const isImageUri =
    (insertion.format?.startsWith('image/') ?? false) &&
    (insertion.uri.startsWith('data:') || insertion.uri.startsWith('http') || insertion.uri.startsWith('/'));

  return (
    <div
      onDragOver={readOnly ? undefined : handleDragOver}
      onDragLeave={readOnly ? undefined : handleDragLeave}
      onDrop={readOnly ? undefined : handleDrop}
      style={{
        padding: 8,
        border: isDragOver ? '2px dashed #1677ff' : '2px dashed transparent',
        borderRadius: 6,
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
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          ここにドロップしてファイルを選択
        </div>
      )}

      <Form.Item label="URI">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={insertion.uri}
            onChange={(e) => handleUriChange(e.target.value)}
            placeholder="例: s3://bucket/path/to/file"
            disabled={readOnly || isUploading}
          />
          <Tooltip title={uploadTargetPath ? 'ファイルを選択してS3にアップロード' : 'ファイルを選択して自動入力（アップロードなし）'}>
            <Button
              icon={isUploading ? <LoadingOutlined /> : <UploadOutlined />}
              onClick={handleSelectButtonClick}
              disabled={readOnly || isUploading}
            >
              ファイルを選択
            </Button>
          </Tooltip>
          {/* クリアボタン: URI または hash.value がある場合のみ表示 */}
          {(insertion.uri || insertion.hash?.value) && !readOnly && (
            <Tooltip title="URI・ハッシュ・フォーマットをクリア">
              <Button
                icon={<ClearOutlined />}
                onClick={handleClear}
                disabled={isUploading}
                danger
              />
            </Tooltip>
          )}
        </Space.Compact>
      </Form.Item>

      <Form.Item label="Hash Method">
        <Input
          value={insertion.hash?.method || ''}
          onChange={(e) => handleHashMethodChange(e.target.value)}
          placeholder="例: SHA-256"
          disabled={readOnly || isUploading}
        />
      </Form.Item>

      <Form.Item label="Hash Value">
        <Input
          value={insertion.hash?.value || ''}
          onChange={(e) => handleHashValueChange(e.target.value)}
          placeholder="例: abc123..."
          disabled={readOnly || isUploading}
        />
      </Form.Item>

      <Form.Item label="Format">
        <Input
          value={insertion.format || ''}
          onChange={(e) => handleFormatChange(e.target.value)}
          placeholder="例: application/xml"
          disabled={readOnly || isUploading}
        />
      </Form.Item>

      {/* 画像プレビュー（image/* の場合のみ） */}
      {isImageUri && (
        <Form.Item label="プレビュー">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={insertion.uri}
            alt="プレビュー"
            style={{
              maxWidth: '100%',
              maxHeight: 200,
              objectFit: 'contain',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
            }}
          />
        </Form.Item>
      )}
    </div>
  );
};

export default InsertionEditorForm;
