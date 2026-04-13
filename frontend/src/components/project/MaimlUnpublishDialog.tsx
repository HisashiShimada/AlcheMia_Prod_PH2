'use client';

import React, { useState } from 'react';
import { Modal, Alert, Button, Space, Typography } from 'antd';
import { unpublishProject } from '@/services/projectApiService';

const { Text } = Typography;

/** エラーコードに対応する日本語メッセージ */
const ERROR_MESSAGES: Record<string, string> = {
  NOT_PUBLISHED:       '公開済みアセットが存在しません',
  ALREADY_IN_PROGRESS: '非公開処理がすでに進行中です',
  SYSTEM_ERROR:        'システムエラーが発生しました',
};

export interface MaimlUnpublishDialogProps {
  /** ダイアログの表示状態 */
  open: boolean;
  /** 非公開対象のプロジェクト名（表示用） */
  projectName: string;
  /** 非公開対象のプロジェクトID */
  projectId: string;
  /** ダイアログを閉じる時のコールバック */
  onClose: () => void;
  /**
   * 非公開ジョブ受付成功時のコールバック
   * @param jobId 受け付けたジョブID
   */
  onSuccess: (jobId: string) => void;
}

/**
 * MaiML 非公開確認ダイアログ
 *
 * @description
 *   「非公開にする」ボタン押下時に unpublishProject API を呼び出す。
 *   エラーが返ってきた場合はダイアログ内にエラーを表示する。
 *   成功（202）の場合は onSuccess コールバックを呼び出してポーリングを開始させる。
 */
const MaimlUnpublishDialog: React.FC<MaimlUnpublishDialogProps> = ({
  open,
  projectName,
  projectId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  /** ダイアログを閉じてエラー状態をリセット */
  const handleClose = () => {
    setErrorCode(null);
    onClose();
  };

  /** 非公開ボタン押下 */
  const handleUnpublish = async () => {
    setLoading(true);
    setErrorCode(null);

    try {
      const response = await unpublishProject(projectId);
      // 成功（202）
      const jobId = response.data?.job_id ?? '';
      handleClose();
      onSuccess(jobId);
    } catch (err: unknown) {
      // axios エラーからエラーコードを取り出す
      const axiosErr = err as { response?: { data?: { error?: { code?: string } } } };
      const code = axiosErr?.response?.data?.error?.code ?? 'SYSTEM_ERROR';
      setErrorCode(code);
    } finally {
      setLoading(false);
    }
  };

  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES['SYSTEM_ERROR']) : null;

  return (
    <Modal
      title="MaiML 非公開確認"
      open={open}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            danger
            type="primary"
            onClick={handleUnpublish}
            loading={loading}
          >
            非公開にする
          </Button>
        </Space>
      }
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <Text>
          プロジェクト <Text strong>{projectName}</Text> の公開を取り消します。よろしいですか？
        </Text>

        {errorMessage && (
          <Alert
            type="error"
            showIcon
            message="非公開処理に失敗しました"
            description={errorMessage}
          />
        )}
      </Space>
    </Modal>
  );
};

export default MaimlUnpublishDialog;
