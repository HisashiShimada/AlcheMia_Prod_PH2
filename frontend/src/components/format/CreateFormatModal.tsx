'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Typography, Space, theme } from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';
import { extractErrorMessage } from '@/utils/errorUtils';

const { Text } = Typography;

/**
 * CreateFormatModalのProps型定義
 */
export interface CreateFormatModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (folderName: string) => Promise<void>;
  /** 選択中の組織グループ名または組織グループCD（モーダル内の補足説明として表示） */
  organizationGroupName?: string;
}

/**
 * 新規フォーマットフォルダ作成モーダル
 *
 * 選択中の組織グループ直下に新規フォーマットフォルダを作成する
 */
const CreateFormatModal: React.FC<CreateFormatModalProps> = ({
  open,
  onCancel,
  onSubmit,
  organizationGroupName,
}) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // モーダルが開いたときにフォームとエラーをリセット
  useEffect(() => {
    if (open) {
      form.resetFields();
      setErrorMessage(null);
    }
  }, [open, form]);

  // 送信ハンドラ
  const handleSubmit = async () => {
    try {
      // バリデーション
      const values = await form.validateFields();
      const { folderName } = values;

      setLoading(true);
      setErrorMessage(null);

      // 親コンポーネントのonSubmitを呼び出し
      await onSubmit(folderName);

      // 成功したらモーダルを閉じる
      form.resetFields();
      setErrorMessage(null);
      onCancel();
    } catch (error) {
      console.error('❌ [CreateFormatModal] エラー:', error);

      // APIエラーの場合、エラーコードから翻訳済みメッセージを取得して表示
      const apiError = error as { response?: { data?: { error?: { code?: string; message?: string } } }; message?: string };
      if (apiError?.response?.data?.error?.code) {
        setErrorMessage(extractErrorMessage(error));
      } else if (apiError?.message && apiError.message !== 'Validation failed') {
        setErrorMessage(extractErrorMessage(error));
      }
      // フォームバリデーションエラーの場合は何もしない（Form内で表示される）
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={t('createFormatModal.title')}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText={t('createFormatModal.create')}
      cancelText={t('createFormatModal.cancel')}
      confirmLoading={loading}
      width={500}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
      >
        {/* フォルダ名入力 */}
        <Form.Item
          name="folderName"
          label={t('createFormatModal.folderName')}
          validateStatus={errorMessage ? 'error' : undefined}
          help={errorMessage || undefined}
          rules={[
            { required: true, message: t('createFormatModal.rules.required') },
            {
              pattern: /^[a-zA-Z0-9_]+$/,
              message: t('createFormatModal.rules.pattern'),
            },
            {
              min: 1,
              max: 255,
              message: t('createFormatModal.rules.length'),
            },
          ]}
        >
          <Input
            placeholder={t('createFormatModal.placeholder')}
            maxLength={255}
          />
        </Form.Item>

        {/* 補足説明 */}
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            {t('createFormatModal.allowedChars')}
          </Text>
          {organizationGroupName && (
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              {t('createFormatModal.organizationGroupNote').replace(
                '{{organizationGroupName}}',
                organizationGroupName
              )}
            </Text>
          )}
        </Space>
      </Form>
    </Modal>
  );
};

export default CreateFormatModal;
