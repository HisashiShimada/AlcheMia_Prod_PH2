'use client';

import React from 'react';
import { Modal, Button, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

/**
 * Draft復元確認ダイアログ
 *
 * サーバーに保存されたDraftデータを復元するかどうかをユーザーに確認する。
 * ボタンは「新規作成」と「復元する」（バックエンドDraftがある場合）の2択のみ表示する。
 */

interface DraftRestoreDialogProps {
  /** ダイアログの表示状態 */
  open: boolean;
  /** ダイアログを閉じるコールバック */
  onClose: () => void;
  /** LocalStorage Draft復元を選択したときのコールバック（現在未使用・後方互換のために残す） */
  onRestoreDraft: () => void;
  /** 新規作成を選択したときのコールバック */
  onCreateNew: () => void;
  /** LocalStorage Draft情報（後方互換のために残す。表示には使用しない） */
  draftInfo?: {
    savedAt: string;
    methodCount: number;
    nodeCount: number;
  } | null;
  /** バックエンドDraftが存在するかどうか */
  hasBackendDraft?: boolean;
  /** バックエンドDraftから復元を選択したときのコールバック */
  onRestoreBackendDraft?: () => void;
}

export default function DraftRestoreDialog({
  open,
  onClose,
  onCreateNew,
  hasBackendDraft = false,
  onRestoreBackendDraft,
}: DraftRestoreDialogProps) {
  const footer: React.ReactNode[] = [
    <Button key="new" onClick={onCreateNew}>
      新規作成
    </Button>,
  ];

  if (hasBackendDraft && onRestoreBackendDraft) {
    footer.push(
      <Button key="restore-backend" type="primary" onClick={onRestoreBackendDraft}>
        復元する
      </Button>
    );
  }

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <span>編集中のデータが見つかりました</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={footer}
      width={420}
    >
      <p style={{ margin: '16px 0' }}>
        前回の編集データが保存されています。復元しますか？
      </p>
    </Modal>
  );
}
