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
import { FileAddOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

/**
 * フォーマットファイル作成データの型定義
 */
export interface CreateFormatFileData {
  fileName: string;
  fileNameWithExtension: string;
  formatId: string;
  formatName: string;
  fileType: 'xml' | 'maiml';
  description: string;
  createdBy: string;
  createdByName: string;
}

/**
 * CreateFormatFileModalのProps型定義
 */
interface CreateFormatFileModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (data: CreateFormatFileData) => Promise<void>;
  formatId: string | null;
  formatName: string | null;
  fileType: 'xml' | 'maiml' | null;
  createdBy: string;
  createdByName: string;
}

/**
 * 新規フォーマットファイル作成モーダルコンポーネント
 * UIポリシーに従い、Ant Designコンポーネントとデザイントークンを使用
 */
export default function CreateFormatFileModal({
  open,
  onCancel,
  onSubmit,
  formatId,
  formatName,
  fileType,
  createdBy,
  createdByName,
}: CreateFormatFileModalProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 拡張子を取得
  const extension = fileType ? `.${fileType}` : '';

  // フォーム送信ハンドラ
  const handleSubmit = async () => {
    try {
      setError(null);
      setSubmitting(true);
      
      // バリデーション
      const values = await form.validateFields();
      
      // ファイル名から拡張子付きファイル名を生成
      // スペースなどファイル名に使用できない文字を_に変換
      const sanitizedFileName = values.fileName
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      
      const fileNameWithExtension = `${sanitizedFileName}${extension}`;
      
      // ファイルデータの作成
      const fileData: CreateFormatFileData = {
        fileName: values.fileName,
        fileNameWithExtension: fileNameWithExtension,
        formatId: formatId || '',
        formatName: formatName || '',
        fileType: fileType || 'xml',
        description: values.description || '',
        createdBy: createdBy,
        createdByName: createdByName,
      };
      
      // 親コンポーネントの送信ハンドラを呼び出し
      await onSubmit(fileData);
      
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

  // モーダルタイトル
  const modalTitle = fileType === 'xml' 
    ? t('formatManagement.create.titleXml') || '新規XMLファイル作成'
    : t('formatManagement.create.titleMaiml') || '新規MaiMLファイル作成';

  return (
    <Modal
      title={
        <Space>
          <FileAddOutlined style={{ color: token.colorPrimary }} />
          <Text strong>{modalTitle}</Text>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      okText={t('formatManagement.create.submit') || '作成'}
      cancelText={t('common.cancel') || 'キャンセル'}
      confirmLoading={submitting}
      width={500}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* エラーメッセージ表示 */}
        {error && (
          <Alert
            message={t('formatManagement.create.error') || '作成エラー'}
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* フォーマット情報表示 */}
        {formatName && (
          <Alert
            message={t('formatManagement.create.formatInfo') || 'フォーマット情報'}
            description={
              <Space direction="vertical" size="small">
                <Text>
                  <Text type="secondary">{t('formatManagement.create.formatName') || 'フォーマット'}: </Text>
                  <Text strong>{formatName}</Text>
                </Text>
                <Text>
                  <Text type="secondary">{t('formatManagement.create.fileType') || 'ファイルタイプ'}: </Text>
                  <Text strong>{fileType?.toUpperCase()}</Text>
                </Text>
                <Text>
                  <Text type="secondary">{t('formatManagement.create.extension') || '拡張子'}: </Text>
                  <Text strong>{extension}</Text>
                </Text>
              </Space>
            }
            type="info"
            showIcon
          />
        )}

        {/* 入力フォーム */}
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
        >
          {/* ファイル名 */}
          <Form.Item
            name="fileName"
            label={t('formatManagement.create.fileName') || 'ファイル名'}
            extra={t('formatManagement.create.fileNameExtra') || `拡張子 ${extension} は自動で付加されます`}
            rules={[
              {
                required: true,
                message: t('formatManagement.create.fileNameRequired') || 'ファイル名を入力してください',
              },
              {
                min: 1,
                message: t('formatManagement.create.fileNameMinLength') || 'ファイル名は1文字以上で入力してください',
              },
              {
                max: 100,
                message: t('formatManagement.create.fileNameMaxLength') || 'ファイル名は100文字以内で入力してください',
              },
            ]}
          >
            <Input
              placeholder={t('formatManagement.create.fileNamePlaceholder') || 'ファイル名を入力'}
              maxLength={100}
              showCount
              autoFocus
              addonAfter={extension}
            />
          </Form.Item>

          {/* 概要 */}
          <Form.Item
            name="description"
            label={t('formatManagement.create.description') || '概要'}
            extra={t('formatManagement.create.descriptionExtra') || 'ファイルの目的や内容を記述してください'}
            rules={[
              {
                max: 500,
                message: t('formatManagement.create.descriptionMaxLength') || '概要は500文字以内で入力してください',
              },
            ]}
          >
            <Input.TextArea
              placeholder={t('formatManagement.create.descriptionPlaceholder') || 'ファイルの概要を入力（オプション）'}
              maxLength={500}
              showCount
              rows={4}
            />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
