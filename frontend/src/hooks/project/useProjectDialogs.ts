'use client';

import { useState } from 'react';

/**
 * プロジェクト管理画面で使用する全モーダル/ダイアログの open/close 状態を管理する hook
 */
export const useProjectDialogs = () => {
  // 一括アップロードダイアログ
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // 新規プロジェクト作成モーダル
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // 問題確認モーダル
  const [issueManagementModalOpen, setIssueManagementModalOpen] = useState(false);

  // セマンティック検索モーダル
  const [semanticSearchModalOpen, setSemanticSearchModalOpen] = useState(false);

  // 公開確認ダイアログ
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // 非公開確認ダイアログ
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);

  // プロジェクト完了処理ダイアログ
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);

  // プロジェクト名変更モーダル
  const [renameModalOpen, setRenameModalOpen] = useState(false);

  // バリデーション結果ダイアログ
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);

  // 暗号化管理モーダル
  const [encryptionModalOpen, setEncryptionModalOpen] = useState(false);

  // 電子署名管理モーダル
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);

  // Draft復元確認ダイアログ
  const [draftRestoreDialogOpen, setDraftRestoreDialogOpen] = useState(false);

  return {
    uploadDialogOpen,
    setUploadDialogOpen,
    createModalOpen,
    setCreateModalOpen,
    issueManagementModalOpen,
    setIssueManagementModalOpen,
    semanticSearchModalOpen,
    setSemanticSearchModalOpen,
    publishDialogOpen,
    setPublishDialogOpen,
    unpublishDialogOpen,
    setUnpublishDialogOpen,
    completionDialogOpen,
    setCompletionDialogOpen,
    renameModalOpen,
    setRenameModalOpen,
    validationDialogOpen,
    setValidationDialogOpen,
    encryptionModalOpen,
    setEncryptionModalOpen,
    signatureModalOpen,
    setSignatureModalOpen,
    draftRestoreDialogOpen,
    setDraftRestoreDialogOpen,
  };
};
