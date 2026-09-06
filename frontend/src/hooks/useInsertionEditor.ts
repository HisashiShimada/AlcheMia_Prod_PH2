import { useCallback, useState } from 'react';
import { App, Modal } from 'antd';
import { uploadFiles } from '@/services/fileAccessService';
import type { Insertion } from '@/types/maiml-unified';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildStorageUri } from '@/utils/storageUriUtils';

/**
 * useInsertionEditor - Insertion編集の共通ロジックフック
 *
 * 【アップロードタイミングの変更点】
 * 旧: 確認ダイアログで「アップロード」を選んだ時点で即座にS3アップロードを実行
 * 新: 確認ダイアログで「保存時にアップロードする」を選んだ時点でS3キーを事前計算し
 *     URI を s3:// 形式で更新。実際のアップロードは保存時に uploadPendingFile() で行う。
 *     これによりキャンセル時に孤立ファイルが発生しない。
 */

export interface UseInsertionEditorOptions {
  value: Insertion;
  onChange: (v: Insertion) => void;
  /** S3アップロード先パス（例: 'projects/sample_project/attachments'）。未指定時はアップロード確認ダイアログを出さない */
  uploadTargetPath?: string;
  /** ファイルサイズ上限（バイト単位）。超過時はエラーメッセージを表示してキャンセル。未指定時は制限なし。 */
  maxFileSize?: number;
  /** 許可するファイル形式（MIME タイプまたは拡張子）。未指定時は制限なし。 */
  acceptedFormats?: string[];
}

export interface UseInsertionEditorReturn {
  insertion: Insertion;
  handleFileSelect: (file: File) => Promise<void>;
  handleUriChange: (uri: string) => void;
  handleHashMethodChange: (method: string) => void;
  handleHashValueChange: (value: string) => void;
  handleFormatChange: (format: string) => void;
  handleClear: () => void;
  isUploading: boolean;
  isDragOver: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  acceptAttr: string | undefined;
  /**
   * アップロード予約済みファイル（確認ダイアログで「保存時にアップロードする」選択後に保持）。
   * null の場合はアップロード予約なし。
   */
  pendingFile: File | null;
  /**
   * 保存時に呼び出すアップロード実行関数。
   * pendingFile がある場合のみS3アップロードを実行する。
   * 失敗時は throw するため、呼び出し側で catch して保存を中断すること。
   */
  uploadPendingFile: () => Promise<void>;
}

/** デフォルトのハッシュメソッド（環境変数 or SHA-256） */
const DEFAULT_HASH_METHOD =
  process.env.NEXT_PUBLIC_INSERTION_DEFAULT_HASH_METHOD ?? 'SHA-256';

/** File から SHA-256 ハッシュ値を計算して16進数文字列で返す */
async function calcFileHash(file: File, algorithm: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** ファイルサイズをヒューマンリーダブルな文字列に変換 */
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function useInsertionEditor({
  value,
  onChange,
  uploadTargetPath,
  maxFileSize,
  acceptedFormats,
}: UseInsertionEditorOptions): UseInsertionEditorReturn {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  /** アップロード予約済みファイル（確認ダイアログで「保存時にアップロードする」選択後に保持） */
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  /** accept 属性文字列を生成 */
  const acceptAttr =
    acceptedFormats && acceptedFormats.length > 0
      ? acceptedFormats.join(',')
      : undefined;

  /** ファイルのバリデーション（サイズチェック） */
  const validateFile = useCallback(
    (file: File): boolean => {
      if (maxFileSize !== undefined && file.size > maxFileSize) {
        message.error(
          t('insertionEditor.fileSizeExceeded', {
            maxSize: formatFileSize(maxFileSize),
            fileSize: formatFileSize(file.size),
          })
        );
        return false;
      }
      return true;
    },
    [maxFileSize, t]
  );

  /** ファイル選択時の処理 */
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!validateFile(file)) return;

      // ハッシュ計算
      const hashMethod = DEFAULT_HASH_METHOD;
      let hashValue = '';
      try {
        hashValue = await calcFileHash(file, hashMethod);
      } catch (err) {
        console.error('[useInsertionEditor] ハッシュ計算失敗:', err);
        message.error(t('insertionEditor.hashCalcFailed'));
        return;
      }

      // ファイル選択時点で URI = file:/// 形式でセット
      const nextInsertion: Insertion = {
        uri: 'file:///' + encodeURIComponent(file.name),
        hash: { method: hashMethod, value: hashValue },
        format: file.type || '',
      };
      onChange(nextInsertion);

      // アップロード先が指定されていない場合はアップロード確認を出さない
      if (!uploadTargetPath) {
        return;
      }

      // アップロード確認ダイアログ
      Modal.confirm({
        title: t('insertionEditor.uploadConfirmTitle'),
        content: file.name,
        okText: t('insertionEditor.uploadConfirmOk'),
        cancelText: t('insertionEditor.uploadConfirmCancel'),
        onOk: () => {
          // S3 キーを事前計算して URI を確定（アップロードは保存時に行う）
          const s3Key = `${uploadTargetPath.replace(/\/+$/, '')}/${file.name}`;
          onChange({ ...nextInsertion, uri: buildStorageUri(s3Key) });
          // File オブジェクトを保持（保存時の uploadPendingFile で使用）
          setPendingFile(file);
        },
        // キャンセル: file:///ファイル名 のまま確定（pendingFile なし）
      });
    },
    [onChange, uploadTargetPath, validateFile, t]
  );

  /**
   * 保存時に呼び出すアップロード実行関数。
   * pendingFile がある場合のみ S3 アップロードを実行する。
   * 失敗時は throw するため、呼び出し側で catch して保存を中断すること。
   */
  const uploadPendingFile = useCallback(async () => {
    if (!pendingFile || !uploadTargetPath) return;
    setIsUploading(true);
    try {
      await uploadFiles({
        uploadMode: 'single',
        targetPath: uploadTargetPath,
        files: [pendingFile],
      });
      // アップロード成功: pendingFile をクリア（URI は確認ダイアログ時点で確定済み）
      setPendingFile(null);
    } catch (err) {
      console.error('[useInsertionEditor] アップロード失敗:', err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [pendingFile, uploadTargetPath]);

  /** URI・hash・format をすべてクリアする（pendingFile もクリア） */
  const handleClear = useCallback(() => {
    setPendingFile(null);
    onChange({ uri: '', hash: { method: DEFAULT_HASH_METHOD, value: '' }, format: '' });
  }, [onChange]);

  /** URI 手動編集 */
  const handleUriChange = useCallback(
    (uri: string) => { onChange({ ...value, uri }); },
    [onChange, value]
  );

  /** Hash Method 手動編集 */
  const handleHashMethodChange = useCallback(
    (method: string) => { onChange({ ...value, hash: { ...value.hash, method } }); },
    [onChange, value]
  );

  /** Hash Value 手動編集 */
  const handleHashValueChange = useCallback(
    (hashValue: string) => { onChange({ ...value, hash: { ...value.hash, value: hashValue } }); },
    [onChange, value]
  );

  /** Format 手動編集 */
  const handleFormatChange = useCallback(
    (format: string) => { onChange({ ...value, format }); },
    [onChange, value]
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
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  return {
    insertion: value,
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
  };
}
