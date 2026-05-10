'use client';

import React, { useState } from 'react';
import { Modal, Alert, Button, Space, Typography } from 'antd';
import { unpublishProject } from '@/services/projectApiService';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

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
  const { t } = useLanguage();
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

  const getErrorMessage = (code: string): string => {
    const key = `maimlUnpublish.errors.${code}`;
    const msg = t(key);
    return msg === key ? t('maimlUnpublish.errors.SYSTEM_ERROR') : msg;
  };

  const errorMessage = errorCode ? getErrorMessage(errorCode) : null;

  return (
    <Modal
      title={t('maimlUnpublish.title')}
      open={open}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose} disabled={loading}>
            {t('maimlUnpublish.cancel')}
          </Button>
          <Button
            danger
            type="primary"
            onClick={handleUnpublish}
            loading={loading}
          >
            {t('maimlUnpublish.unpublish')}
          </Button>
        </Space>
      }
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <Text>
          {t('maimlUnpublish.confirmText').replace('{{projectName}}', projectName)}
        </Text>

        {errorMessage && (
          <Alert
            type="error"
            showIcon
            message={t('maimlUnpublish.errorTitle')}
            description={errorMessage}
          />
        )}
      </Space>
    </Modal>
  );
};

export default MaimlUnpublishDialog;
