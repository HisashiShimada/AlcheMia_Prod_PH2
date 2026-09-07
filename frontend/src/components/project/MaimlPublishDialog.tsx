'use client';

import React, { useState } from 'react';
import { Modal, Alert, Button, Space, Typography } from 'antd';
import { publishProject } from '@/services/projectApiService';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

export interface MaimlPublishDialogProps {
  /** ダイアログの表示状態 */
  open: boolean;
  /** 公開対象のプロジェクト名（表示用） */
  projectName: string;
  /** 公開対象のプロジェクトID */
  projectId: string;
  /** ダイアログを閉じる時のコールバック */
  onClose: () => void;
  /**
   * 公開ジョブ受付成功時のコールバック
   * @param jobId 受け付けたジョブID
   */
  onSuccess: (jobId: string) => void;
}

/**
 * MaiML 公開確認ダイアログ
 *
 * @description
 *   「公開する」ボタン押下時に publishProject API を呼び出す。
 *   バックエンドでチェックがNGだった場合はダイアログ内にエラーを表示する。
 *   成功（202）の場合は onSuccess コールバックを呼び出してポーリングを開始させる。
 */
const MaimlPublishDialog: React.FC<MaimlPublishDialogProps> = ({
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

  /** 公開ボタン押下 */
  const handlePublish = async () => {
    setLoading(true);
    setErrorCode(null);

    try {
      const response = await publishProject(projectId);
      // 成功（202）
      const jobId = response.data?.job_id ?? '';
      handleClose();
      onSuccess(jobId);
    } catch (err: unknown) {
      // axios エラーからエラーコードを取り出す
      const axiosErr = err as { response?: { data?: { error?: { code?: string } } } };
      const code = axiosErr?.response?.data?.error?.code ?? 'E4001';
      setErrorCode(code);
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code: string): string => {
    const key = `maimlPublish.errors.${code}`;
    const msg = t(key);
    // キーがそのまま返ってきた場合はフォールバック
    return msg === key ? t('maimlPublish.errors.E4001') : msg;
  };

  const errorMessage = errorCode ? getErrorMessage(errorCode) : null;

  return (
    <Modal
      title={t('maimlPublish.title')}
      open={open}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose} disabled={loading}>
            {t('maimlPublish.cancel')}
          </Button>
          <Button
            type="primary"
            onClick={handlePublish}
            loading={loading}
          >
            {t('maimlPublish.publish')}
          </Button>
        </Space>
      }
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <Text>
          {t('maimlPublish.confirmText', { projectName: projectName })}
        </Text>

        {errorMessage && (
          <Alert
            type="error"
            showIcon
            message={t('maimlPublish.errorTitle')}
            description={errorMessage}
          />
        )}
      </Space>
    </Modal>
  );
};

export default MaimlPublishDialog;
