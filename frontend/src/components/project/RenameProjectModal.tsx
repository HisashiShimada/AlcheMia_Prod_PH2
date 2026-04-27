'use client';

import React, { useState, useEffect } from 'react';
import { App, Modal, Form, Input } from 'antd';
import { renameProject } from '@/services/projectApiService';
import { useLanguage } from '@/contexts/LanguageContext';

interface RenameProjectModalProps {
  open: boolean;
  /** バックエンドAPIに渡すプロジェクトID（UUID） */
  projectId: string;
  /** 表示用（現在のプロジェクト名） */
  currentProjectName: string;
  onCancel: () => void;
  onSuccess: (newProjectName: string) => void;
}

const RenameProjectModal: React.FC<RenameProjectModalProps> = ({
  open,
  projectId,
  currentProjectName,
  onCancel,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { message } = App.useApp();
  const [form] = Form.useForm<{ newProjectName: string }>();
  const [loading, setLoading] = useState(false);

  // モーダルを開くたびにフォームをリセット
  useEffect(() => {
    if (open) {
      form.setFieldsValue({ newProjectName: currentProjectName });
    }
  }, [open, currentProjectName, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const newName = values.newProjectName.trim();

      // 変更なしの場合はそのまま閉じる
      if (newName === currentProjectName) {
        onCancel();
        return;
      }

      setLoading(true);
      const result = await renameProject(projectId, newName);
      message.success(t('projectManagement.rename.success').replace('{{name}}', result.newProjectName));
      onSuccess(result.newProjectName);
    } catch (error: unknown) {
      // バリデーションエラーは Form が処理するので無視
      if (error && typeof error === 'object' && 'errorFields' in error) return;

      const axiosError = error as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const code = axiosError?.response?.data?.error?.code;
      const msg = axiosError?.response?.data?.error?.message;

      if (code === 'E7001') {
        message.error(t('projectManagement.rename.duplicateError'));
      } else if (msg) {
        message.error(msg);
      } else {
        message.error(t('projectManagement.rename.failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={t('projectManagement.rename.title')}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={t('projectManagement.rename.okText')}
      cancelText={t('common.cancel')}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label={t('projectManagement.rename.label')}
          name="newProjectName"
          rules={[
            { required: true, message: t('projectManagement.rename.required') },
            {
              pattern: /^[a-zA-Z0-9_-]+$/,
              message: t('projectManagement.rename.patternError'),
            },
            { max: 255, message: t('projectManagement.rename.maxLengthError') },
          ]}
        >
          <Input autoFocus placeholder={currentProjectName} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RenameProjectModal;
