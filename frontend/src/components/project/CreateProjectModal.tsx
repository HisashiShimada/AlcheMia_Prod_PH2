'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Alert,
  theme,
} from 'antd';
import { FolderAddOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CreateProjectData } from '@/types/project';

const { Text } = Typography;

/**
 * チーム情報の型定義（/api/v1/organization-group-units/my-teams レスポンス）
 */
interface TeamOption {
  departmentUnitId: string;
  unitName: string;
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
    organizationGroup: string;
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
    organizationGroup: '材料開発部',
    organizationId: 'org_maiml_lab_001',
  },
}: CreateProjectModalProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // モーダルが開いた際にチーム一覧を取得
  useEffect(() => {
    if (!open) return;
    setTeamsLoading(true);
    fetch('/api/v1/department-units/my-teams', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<TeamOption[]>;
      })
      .then((data) => setTeams(data))
      .catch(() => {
        // TODO:[MOCK] バックエンド実装時に削除 — APIが実装されたらダミーデータを削除する
        setTeams([
          { departmentUnitId: 'rd-materials', unitName: '材料解析チーム' },
          { departmentUnitId: 'data-proc',    unitName: 'データ処理班' },
        ]);
      })
      .finally(() => setTeamsLoading(false));
  }, [open]);

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
        organizationGroup: currentUser.organizationGroup,
        organizationId: currentUser.organizationId,
        teamId: values.teamId || undefined,
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

          {/* チーム選択 */}
          <Form.Item
            name="teamId"
            label="チーム"
          >
            <Select
              placeholder="選択なし（制限なし）"
              allowClear
              loading={teamsLoading}
              data-testid="create-project-team-select"
              options={teams.map((team) => ({
                value: team.departmentUnitId,
                label: team.unitName,
              }))}
            />
          </Form.Item>
          <Text
            type="secondary"
            style={{ fontSize: 12, display: 'block', marginTop: -16, marginBottom: 8 }}
          >
            チームを選択するとそのメンバーのみ閲覧できます。未選択の場合は組織グループ全員が閲覧できます。
          </Text>
        </Form>
      </Space>
    </Modal>
  );
}
