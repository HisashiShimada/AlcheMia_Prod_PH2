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
import { extractErrorCode } from '@/utils/errorUtils';
import type { CreateFormatFileData } from '@/types/format';

const { Text } = Typography;

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
  currentPath?: string[]; // 現在のフォルダパス
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
  currentPath = [],
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
      
      // テンプレートタイプを自動判定（XMLファイルの場合のみ）
      let templateType: 'material' | 'condition' | 'result' | undefined;
      if (fileType === 'xml') {
        const folderName = (formatId || formatName || '').toLowerCase();
        if (folderName === 'material') {
          templateType = 'material';
        } else if (folderName === 'condition') {
          templateType = 'condition';
        } else if (folderName === 'result') {
          templateType = 'result';
        }
        
        // テンプレートタイプが判定できない場合はエラー
        if (!templateType) {
          throw new Error('XMLファイルはmaterial、condition、resultフォルダでのみ作成できます');
        }
      }
      
      // ファイルデータの作成
      const fileData: CreateFormatFileData = {
        fileName: values.fileName,
        fileNameWithExtension: fileNameWithExtension,
        formatId: formatId || '',
        formatName: formatName || '',
        fileType: fileType || 'xml',
        templateType: templateType,
        createdBy: createdBy,
        createdByName: createdByName,
        currentPath: currentPath.length > 0 ? currentPath.join('/') : undefined,
      };
      
      console.log('🔍 [CreateFormatFileModal] Submitting file data:', {
        fileNameWithExtension: fileData.fileNameWithExtension,
        formatId: fileData.formatId,
        currentPath: fileData.currentPath,
        currentPathArray: currentPath,
      });
      
      // 親コンポーネントの送信ハンドラを呼び出し
      await onSubmit(fileData);
      
      // 成功時はフォームをリセット
      form.resetFields();
    } catch (err) {
      // バリデーションエラーまたは送信エラー
      if (err instanceof Error) {
        const errorMessage = err.message;
        // E6005（ファイル重複）の場合、ファイル名フィールドにエラーを設定
        const errorCode = extractErrorCode(err);
        if (errorCode === 'E6005') {
          form.setFields([
            {
              name: 'fileName',
              errors: [errorMessage],
            },
          ]);
        } else {
          // その他のエラーは上部のAlertに表示
          setError(errorMessage);
        }
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
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText={t('common.create')}
      cancelText={t('common.cancel')}
      width={600}
      destroyOnHidden
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* エラーメッセージ表示 */}
        {error && (
          <Alert
            title={t('formatManagement.create.error') || '作成エラー'}
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
            title={t('formatManagement.create.formatInfo') || 'フォーマット情報'}
            description={
              <Space orientation="vertical" size="small">
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
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder={t('formatManagement.create.fileNamePlaceholder') || 'ファイル名を入力'}
                maxLength={100}
                showCount
                autoFocus
                style={{ flex: 1 }}
              />
              <Input
                value={extension}
                disabled
                style={{ width: 80, textAlign: 'center' }}
              />
            </Space.Compact>
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
