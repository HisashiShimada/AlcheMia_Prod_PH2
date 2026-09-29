'use client';

/**
 * ProjectCompletionDialog.tsx
 * プロジェクト完了処理ダイアログ
 *
 * 構成:
 *   - 完了操作の最終確認（取り消し不可の注意文）
 *   - 「プロジェクトを完了する」ボタン
 *
 * 処理内容:
 *   1. プロジェクトステータスを COMPLETED(4) に更新
 *   2. 記録済み評価 eventLog を MAiML ファイルへ書き込み
 *   3. onComplete コールバックを呼び出し（親側でリロード等を実行）
 */

import React, { useState } from 'react';
import {
  Modal,
  Space,
  Typography,
  Flex,
  Button,
  App,
} from 'antd';
import { completeProject } from '@/services/projectApiService';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────

export interface ProjectCompletionDialogProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  onCancel: () => void;
  /** 完了ボタン押下時のコールバック（ステータス更新・MaiML書き込み成功後に呼ばれる） */
  onComplete: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────────────────────

const ProjectCompletionDialog: React.FC<ProjectCompletionDialogProps> = ({
  open,
  projectId,
  projectName,
  onCancel,
  onComplete,
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();

  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      // ① プロジェクトステータスを COMPLETED(4) に更新（品質評価 eventLog の MAiML 書き出しも含む）
      await completeProject(projectId);

      // ② 親コンポーネントへ完了通知
      await onComplete();
    } catch (err) {
      console.error('[ProjectCompletionDialog] error:', err);
      message.error(t('projectCompletion.completeFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={t('projectCompletion.title')}
      open={open}
      onCancel={onCancel}
      width={480}
      destroyOnClose
      footer={
        <Flex justify="flex-end">
          <Space>
            <Button onClick={onCancel}>{t('common.cancel')}</Button>
            <Button
              type="primary"
              loading={submitting}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={handleComplete}
            >
              {t('projectCompletion.completeButton')}
            </Button>
          </Space>
        </Flex>
      }
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Text>
          {projectName
            ? t('projectCompletion.confirmDescription', { projectName })
            : t('projectCompletion.confirmDescriptionNoName')}
        </Text>
        <Text type="danger" style={{ fontSize: 12 }}>
          {t('projectCompletion.irreversibleNote')}
        </Text>
      </Space>
    </Modal>
  );
};

export default ProjectCompletionDialog;
