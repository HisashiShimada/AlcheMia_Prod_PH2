'use client';

import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Space,
  Typography,
  Alert,
  theme,
} from 'antd';
import { FolderAddOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

/**
 * プロジェクト作成データの型定義
 */
export interface CreateProjectData {
  projectName: string;
  description: string;
  folderName: string;
  owner: string;
  department: string;
  organizationId: string;
}

/**
 * CreateProjectModalのProps型定義
 */
interface CreateProjectModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (data: CreateProjectData) => Promise<void>;
  currentUser?: {
    name: string;
    department: string;
    organizationId: string;
  };
}

/**
 * 新規プロジェクト作成モーダルコンポーネント
 * UIポリシーに従い、Ant Designコンポーネントとデザイントークンを使用
 */
export default function CreateProjectModal({
  open,
  onCancel,
  onSubmit,
  currentUser = {
    name: '田中 太郎',
    department: '材料開発部',
    organizationId: 'org_maiml_lab_001',
  },
}: CreateProjectModalProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム送信ハンドラ
  const handleSubmit = async () => {
    try {
      setError(null);
      setSubmitting(true);
      
      // バリデーション
      const values = await form.validateFields();
      
      // プロジェクト名からフォルダ名を自動生成
      // 入力値をそのまま使用し、スペースなどフォルダ名に使用できない文字のみ_に変換
      const folderName = values.projectName
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // プロジェクトデータの作成
      const projectData: CreateProjectData = {
        projectName: values.projectName,
        description: values.description || '',
        folderName: folderName,
        owner: currentUser.name,
        department: currentUser.department,
        organizationId: currentUser.organizationId,
      };
      
      // 親コンポーネントの送信ハンドラを呼び出し
      await onSubmit(projectData);
      
      // 成功時はフォームをリセット
      form.resetFields();
    } catch (err) {
      // バリデーションエラーまたは送信エラー
      if (err instanceof Error) {
        setError(err.message);
      } else {
        console.error('Form validation failed:', err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // モーダルキャンセル時
  const handleCancel = () => {
    form.resetFields();
    setError(null);
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <FolderAddOutlined style={{ color: token.colorPrimary }} />
          <Text strong>{t('projectManagement.create.title') || '新規プロジェクト作成'}</Text>
        </Space>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText={t('common.create')}
      cancelText={t('common.cancel')}
      okButtonProps={{ 'data-testid': 'create-project-submit-button' } as any}
      cancelButtonProps={{ 'data-testid': 'create-project-cancel-button' } as any}
      width={600}
      destroyOnHidden
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* エラーメッセージ表示 */}
        {error && (
          <Alert
            title={t('projectManagement.create.error') || '作成エラー'}
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* 入力フォーム */}
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
        >
          {/* プロジェクト名 */}
          <Form.Item
            name="projectName"
            label={t('projectManagement.create.projectName') || 'プロジェクト名'}
            rules={[
              {
                required: true,
                message: t('projectManagement.create.projectNameRequired') || 'プロジェクト名を入力してください',
              },
              {
                min: 3,
                message: t('projectManagement.create.projectNameMinLength') || 'プロジェクト名は3文字以上で入力してください',
              },
              {
                max: 100,
                message: t('projectManagement.create.projectNameMaxLength') || 'プロジェクト名は100文字以内で入力してください',
              },
            ]}
          >
            <Input
              placeholder={t('projectManagement.create.projectNamePlaceholder') || 'プロジェクト名を入力'}
              maxLength={100}
              showCount
              autoFocus
              data-testid="create-project-name-input"
            />
          </Form.Item>

          {/* 概要 */}
          <Form.Item
            name="description"
            label={t('projectManagement.create.description') || '概要'}
            rules={[
              {
                max: 500,
                message: t('projectManagement.create.descriptionMaxLength') || '概要は500文字以内で入力してください',
              },
            ]}
          >
            <Input.TextArea
              placeholder={t('projectManagement.create.descriptionPlaceholder') || 'プロジェクトの概要を入力（任意）'}
              maxLength={500}
              showCount
              rows={4}
              data-testid="create-project-description-input"
            />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
