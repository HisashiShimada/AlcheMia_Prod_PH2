import React, { useRef, useEffect } from 'react';
import { Form, Input, Button, Space, Tooltip } from 'antd';
import { UploadOutlined, LoadingOutlined, ClearOutlined } from '@ant-design/icons';
import { useInsertionEditor } from '@/hooks/useInsertionEditor';
import type { Insertion } from '@/types/maiml-unified';
import { useLanguage } from '@/contexts/LanguageContext';
import { isLocalFileUri } from '@/utils/storageUriUtils';

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
  /**
   * uploadPendingFile 関数が準備できたときに呼び出されるコールバック。
   * 親（TemplateEditorDialog 等）はこの関数を保存処理の中で呼び出してアップロードを実行する。
   */
  onUploadPendingFileReady?: (fn: () => Promise<void>) => void;
}

const InsertionEditorForm: React.FC<InsertionEditorFormProps> = ({
  value,
  onChange,
  readOnly = false,
  uploadTargetPath,
  maxFileSize,
  acceptedFormats,
  onUploadPendingFileReady,
}) => {
  const { t } = useLanguage();
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
    pendingFile,
    uploadPendingFile,
  } = useInsertionEditor({ value, onChange, uploadTargetPath, maxFileSize, acceptedFormats });

  // uploadPendingFile が変わるたびに親へ通知する
  useEffect(() => {
    onUploadPendingFileReady?.(uploadPendingFile);
  }, [uploadPendingFile, onUploadPendingFileReady]);

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
          {t('insertionEditor.dropHintForm')}
        </div>
      )}

      <Form.Item label={t('insertionEditor.labelUri')}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={insertion.uri}
            onChange={(e) => handleUriChange(e.target.value)}
            placeholder={t('insertionEditor.placeholderUri')}
            disabled={readOnly || isUploading}
          />
          <Tooltip title={uploadTargetPath ? t('insertionEditor.tooltipUploadWithS3') : t('insertionEditor.tooltipSelectOnly')}>
            <Button
              icon={isUploading ? <LoadingOutlined /> : <UploadOutlined />}
              onClick={handleSelectButtonClick}
              disabled={readOnly || isUploading}
            >
              {t('insertionEditor.selectFileButton')}
            </Button>
          </Tooltip>
          {/* クリアボタン: URI または hash.value がある場合のみ表示 */}
          {(insertion.uri || insertion.hash?.value) && !readOnly && (
            <Tooltip title={t('insertionEditor.tooltipClear')}>
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

      {/* アップロード予約中バッジ（保存時にアップロード予定のファイルがある場合） */}
      {pendingFile && (
        <Form.Item style={{ marginTop: -16, marginBottom: 8 }}>
          <div style={{ color: '#1677ff', fontSize: 12 }}>
            📎 {pendingFile.name}（{t('insertionEditor.pendingUploadBadge')}）
          </div>
        </Form.Item>
      )}

      {/* ローカルファイル URI ガイダンス（file:/// 始まりの場合は常時表示） */}
      {isLocalFileUri(insertion.uri) && (
        <Form.Item style={{ marginTop: -16, marginBottom: 8 }}>
          <div style={{ color: '#ff4d4f', fontSize: 12, lineHeight: 1.6 }}>
            <div>⚠️ {t('insertionEditor.localFileWarning')}</div>
            <div style={{ marginTop: 4 }}>{t('insertionEditor.localFileUriExampleTitle')}</div>
            <div style={{ fontFamily: 'monospace', paddingLeft: 8 }}>
              {t('insertionEditor.localFileUriExampleLocal')}
            </div>
            <div style={{ fontFamily: 'monospace', paddingLeft: 8 }}>
              {t('insertionEditor.localFileUriExampleNetwork')}
            </div>
          </div>
        </Form.Item>
      )}

      <Form.Item label={t('insertionEditor.labelHashMethod')}>
        <Input
          value={insertion.hash?.method || ''}
          onChange={(e) => handleHashMethodChange(e.target.value)}
          placeholder={t('insertionEditor.placeholderHashMethod')}
          disabled={readOnly || isUploading}
        />
      </Form.Item>

      <Form.Item label={t('insertionEditor.labelHashValue')}>
        <Input
          value={insertion.hash?.value || ''}
          onChange={(e) => handleHashValueChange(e.target.value)}
          placeholder={t('insertionEditor.placeholderHashValue')}
          disabled={readOnly || isUploading}
        />
      </Form.Item>

      <Form.Item label={t('insertionEditor.labelFormat')}>
        <Input
          value={insertion.format || ''}
          onChange={(e) => handleFormatChange(e.target.value)}
          placeholder={t('insertionEditor.placeholderFormat')}
          disabled={readOnly || isUploading}
        />
      </Form.Item>

      {/* 画像プレビュー（image/* の場合のみ） */}
      {isImageUri && (
        <Form.Item label={t('insertionEditor.labelPreview')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={insertion.uri}
            alt={t('insertionEditor.labelPreview')}
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
