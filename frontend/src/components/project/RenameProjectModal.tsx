'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { renameProject } from '@/services/projectApiService';

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
      message.success(`プロジェクト名を「${result.newProjectName}」に変更しました`);
      onSuccess(result.newProjectName);
    } catch (error: unknown) {
      // バリデーションエラーは Form が処理するので無視
      if (error && typeof error === 'object' && 'errorFields' in error) return;

      const axiosError = error as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const code = axiosError?.response?.data?.error?.code;
      const msg = axiosError?.response?.data?.error?.message;

      if (code === 'E7001') {
        message.error('同名のプロジェクトが既に存在します');
      } else if (msg) {
        message.error(msg);
      } else {
        message.error('プロジェクト名の変更に失敗しました');
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
      title="プロジェクト名を変更"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="変更"
      cancelText="キャンセル"
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="新しいプロジェクト名"
          name="newProjectName"
          rules={[
            { required: true, message: 'プロジェクト名を入力してください' },
            {
              pattern: /^[a-zA-Z0-9_-]+$/,
              message: 'プロジェクト名は英数字・アンダースコア・ハイフンのみ使用できます',
            },
            { max: 255, message: 'プロジェクト名は255文字以内で入力してください' },
          ]}
        >
          <Input autoFocus placeholder={currentProjectName} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RenameProjectModal;
