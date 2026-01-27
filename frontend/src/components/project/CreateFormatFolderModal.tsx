'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Space, Typography, theme, message } from 'antd';
import { FolderAddOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

/**
 * 新規フォルダ作成データ型
 */
export interface CreateFormatFolderData {
  formatId: string;
  folderName: string;
}

/**
 * 新規フォルダ作成モーダルのProps
 */
interface CreateFormatFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (data: CreateFormatFolderData) => Promise<void>;
  formatId: string | null;
  formatName: string | null;
}

/**
 * 新規フォーマットフォルダ作成モーダル
 */
const CreateFormatFolderModal: React.FC<CreateFormatFolderModalProps> = ({
  open,
  onCancel,
  onSubmit,
  formatId,
  formatName,
}) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // モーダルが開いたときにフォームをリセット
  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  // 送信ハンドラ
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!formatId) {
        message.error('フォーマットが選択されていません');
        return;
      }

      setSubmitting(true);

      const data: CreateFormatFolderData = {
        formatId,
        folderName: values.folderName,
      };

      await onSubmit(data);
      form.resetFields();
    } catch (error) {
      console.error('フォームバリデーションエラー:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // キャンセルハンドラ
  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <FolderAddOutlined style={{ color: token.colorPrimary }} />
          <span>{t('formatManagement.new_folder')}</span>
        </Space>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText={t('common.create')}
      cancelText={t('common.cancel')}
      width={600}
      destroyOnHidden
    >
      <div style={{ marginTop: token.margin }}>
        {/* 選択中のフォーマット情報 */}
        {formatName && (
          <div
            style={{
              padding: token.paddingSM,
              backgroundColor: token.colorBgContainer,
              borderRadius: token.borderRadius,
              marginBottom: token.margin,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              {t('formatManagement.selected_format')}:
            </Text>
            <Text strong style={{ marginLeft: token.marginXS }}>
              {formatName}
            </Text>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
        >
          {/* フォルダ名 */}
          <Form.Item
            label={t('formatManagement.folder_name')}
            name="folderName"
            rules={[
              { required: true, message: t('formatManagement.folder_name_required') },
              { 
                pattern: /^[a-zA-Z0-9_-]+$/, 
                message: t('formatManagement.folder_name_format')
              },
            ]}
            tooltip={t('formatManagement.folder_name_tooltip')}
          >
            <Input
              placeholder="company_f"
              maxLength={100}
            />
          </Form.Item>
        </Form>

        {/* 注意事項 */}
        <div
          style={{
            marginTop: token.margin,
            padding: token.paddingSM,
            backgroundColor: token.colorInfoBg,
            borderRadius: token.borderRadius,
            border: `1px solid ${token.colorInfoBorder}`,
          }}
        >
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            <strong>{t('common.note')}:</strong> {t('formatManagement.folder_create_note')}
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default CreateFormatFolderModal;
