'use client';

import React, { useState } from 'react';
import { Modal, Alert, Button, Space, Typography } from 'antd';
import { publishProject } from '@/services/projectApiService';

const { Text } = Typography;

/** エラーコードに対応する日本語メッセージ */
const ERROR_MESSAGES: Record<string, string> = {
  PROJECT_NOT_FOUND:       'プロジェクトが見つかりません',
  PROJECT_NOT_CHECKED_OUT: 'プロジェクトがチェックアウトされていません',
  PROJECT_STATUS_INVALID:  'プロジェクトステータスがタスク結果レビュー待ちではありません',
  TASKS_NOT_COMPLETED:     '完了・異常終了以外のタスクが残っています',
  MAIML_NOT_FOUND:         'MAIMLファイルが存在しません',
  ALREADY_IN_PROGRESS:     '公開処理がすでに進行中です',
  SYSTEM_ERROR:            'システムエラーが発生しました',
};

export interface MaimlPublishDialogProps {
  /** ダイアログの表示状態 */
  open: boolean;
  /** 公開対象のプロジェクト名 */
  projectName: string;
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

  /** 公開ボタン押下 */
  const handlePublish = async () => {
    setLoading(true);
    setErrorCode(null);

    try {
      const response = await publishProject(projectName);
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
      title="MaiML 公開確認"
      open={open}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            type="primary"
            onClick={handlePublish}
            loading={loading}
          >
            公開する
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Text>
          プロジェクト <Text strong>{projectName}</Text> を公開します。よろしいですか？
        </Text>

        {errorMessage && (
          <Alert
            type="error"
            showIcon
            message="公開できません"
            description={errorMessage}
          />
        )}
      </Space>
    </Modal>
  );
};

export default MaimlPublishDialog;
