import React, { useRef } from 'react';
import { Form, Input, Button, Space } from 'antd';
import { UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import { useInsertionEditor } from '@/hooks/useInsertionEditor';
import type { Insertion } from '@/types/maiml-unified';

/**
 * InsertionEditorForm - TemplateEditorDialog 用 Insertion 入力コンポーネント
 *
 * Form.Item レイアウト（ラベル付き・標準フォントサイズ）で4フィールドを表示する。
 * ロジック（ハッシュ計算・アップロード確認・S3アップロード）は useInsertionEditor フックに委譲。
 *
 * @example
 * <InsertionEditorForm
 *   value={insertion}
 *   onChange={(v) => { setInsertion(v); setHasChanges(true); }}
 *   uploadTargetPath={`projects/${projectName}/attachments`}
 * />
 */

export interface InsertionEditorFormProps {
  value: Insertion;
  onChange: (v: Insertion) => void;
  readOnly?: boolean;
  /** S3アップロード先パス（例: 'projects/sample_project/attachments'）。未指定時はアップロードボタン非表示 */
  uploadTargetPath?: string;
}

const InsertionEditorForm: React.FC<InsertionEditorFormProps> = ({
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
    <>
      {/* 隠し file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      <Form.Item label="URI">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={insertion.uri}
            onChange={(e) => handleUriChange(e.target.value)}
            placeholder="例: s3://bucket/path/to/file"
            disabled={readOnly || isUploading}
          />
          {/* ファイル選択ボタンは常時表示。uploadTargetPath 未指定時はアップロード確認なし（ファイル名のみセット） */}
          <Button
            icon={isUploading ? <LoadingOutlined /> : <UploadOutlined />}
            onClick={handleSelectButtonClick}
            disabled={readOnly || isUploading}
            title={uploadTargetPath ? 'ファイルを選択してS3にアップロード' : 'ファイルを選択して自動入力（アップロードなし）'}
          >
            ファイルを選択
          </Button>
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
    </>
  );
};

export default InsertionEditorForm;
