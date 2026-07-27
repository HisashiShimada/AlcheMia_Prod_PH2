import { useCallback, useState } from 'react';
import { Modal, message } from 'antd';
import { uploadFiles } from '@/services/fileAccessService';
import type { Insertion } from '@/types/maiml-unified';

/**
 * useInsertionEditor - Insertion編集の共通ロジックフック
 *
 * ファイル選択 → ハッシュ計算 → 入力値セット → アップロード確認 → S3アップロード → URI更新
 * の一連のロジックを担う。UIは InsertionEditorForm / InsertionEditorCompact に委譲する。
 */

export interface UseInsertionEditorOptions {
  value: Insertion;
  onChange: (v: Insertion) => void;
  /** S3アップロード先パス（例: 'projects/sample_project/attachments'）。未指定時はアップロード確認ダイアログを出さない */
  uploadTargetPath?: string;
}

export interface UseInsertionEditorReturn {
  /** 現在のInsertion値（readonlyで参照用） */
  insertion: Insertion;
  /** ファイル選択時の処理（ハッシュ計算 → 値セット → アップロード確認） */
  handleFileSelect: (file: File) => Promise<void>;
  /** テキスト手動編集: uri フィールド */
  handleUriChange: (uri: string) => void;
  /** テキスト手動編集: hash.method フィールド */
  handleHashMethodChange: (method: string) => void;
  /** テキスト手動編集: hash.value フィールド */
  handleHashValueChange: (value: string) => void;
  /** テキスト手動編集: format フィールド */
  handleFormatChange: (format: string) => void;
  /** アップロード中フラグ */
  isUploading: boolean;
}

/** デフォルトのハッシュメソッド（環境変数 or SHA-256） */
const DEFAULT_HASH_METHOD =
  process.env.NEXT_PUBLIC_INSERTION_DEFAULT_HASH_METHOD ?? 'SHA-256';

/**
 * File から SHA-256（または指定したアルゴリズム）のハッシュ値を計算して16進数文字列で返す
 */
async function calcFileHash(file: File, algorithm: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function useInsertionEditor({
  value,
  onChange,
  uploadTargetPath,
}: UseInsertionEditorOptions): UseInsertionEditorReturn {
  const [isUploading, setIsUploading] = useState(false);

  /** ファイル選択時の処理 */
  const handleFileSelect = useCallback(
    async (file: File) => {
      // ハッシュ計算
      const hashMethod = DEFAULT_HASH_METHOD;
      let hashValue = '';
      try {
        hashValue = await calcFileHash(file, hashMethod);
      } catch (err) {
        console.error('[useInsertionEditor] ハッシュ計算失敗:', err);
        message.error('ハッシュ値の計算に失敗しました');
        return;
      }

      // ファイル選択時点で4項目を即座にセット
      const nextInsertion: Insertion = {
        uri: file.name,
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
        title: 'ファイルをサーバーにアップロードしますか？',
        content: file.name,
        okText: 'アップロード',
        cancelText: 'キャンセル',
        onOk: async () => {
          setIsUploading(true);
          try {
            const result = await uploadFiles({
              uploadMode: 'single',
              targetPath: uploadTargetPath,
              files: [file],
            });

            // アップロード成功時: URIをs3Keyで上書き
            const uploaded = result.files?.[0];
            if (uploaded?.s3Key) {
              onChange({ ...nextInsertion, uri: uploaded.s3Key });
            } else {
              message.warning('アップロードは成功しましたが、S3キーを取得できませんでした');
            }
          } catch (err) {
            console.error('[useInsertionEditor] アップロード失敗:', err);
            message.error('ファイルのアップロードに失敗しました');
          } finally {
            setIsUploading(false);
          }
        },
        // キャンセル時: 何もしない（URIはfile.nameのまま確定）
      });
    },
    [onChange, uploadTargetPath]
  );

  /** URI 手動編集 */
  const handleUriChange = useCallback(
    (uri: string) => {
      onChange({ ...value, uri });
    },
    [onChange, value]
  );

  /** Hash Method 手動編集 */
  const handleHashMethodChange = useCallback(
    (method: string) => {
      onChange({ ...value, hash: { ...value.hash, method } });
    },
    [onChange, value]
  );

  /** Hash Value 手動編集 */
  const handleHashValueChange = useCallback(
    (hashValue: string) => {
      onChange({ ...value, hash: { ...value.hash, value: hashValue } });
    },
    [onChange, value]
  );

  /** Format 手動編集 */
  const handleFormatChange = useCallback(
    (format: string) => {
      onChange({ ...value, format });
    },
    [onChange, value]
  );

  return {
    insertion: value,
    handleFileSelect,
    handleUriChange,
    handleHashMethodChange,
    handleHashValueChange,
    handleFormatChange,
    isUploading,
  };
}
