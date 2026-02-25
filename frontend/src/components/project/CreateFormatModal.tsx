'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Typography, Space, theme } from 'antd';

const { Text } = Typography;

/**
 * CreateFormatModalのProps型定義
 */
export interface CreateFormatModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (folderName: string) => Promise<void>;
  departmentName?: string;
}

/**
 * 新規フォーマットフォルダ作成モーダル
 * 
 * 部門直下に新規フォーマットフォルダを作成する
 */
const CreateFormatModal: React.FC<CreateFormatModalProps> = ({
  open,
  onCancel,
  onSubmit,
  departmentName,
}) => {
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
      
      // APIエラーの場合、エラーメッセージを表示
      const apiError = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      if (apiError?.response?.data?.error?.message) {
        setErrorMessage(apiError.response.data.error.message);
      } else if (apiError?.message && apiError.message !== 'Validation failed') {
        setErrorMessage(apiError.message);
      }
      // フォームバリデーションエラーの場合は何もしない（Form内で表示される）
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="新規フォーマットフォルダ作成"
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText="作成"
      cancelText="キャンセル"
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
          label="フォルダ名"
          validateStatus={errorMessage ? 'error' : undefined}
          help={errorMessage || undefined}
          rules={[
            { required: true, message: 'フォルダ名を入力してください' },
            {
              pattern: /^[a-zA-Z0-9_]+$/,
              message: '英数字とアンダースコアのみ使用できます',
            },
            {
              min: 1,
              max: 255,
              message: 'フォルダ名は1〜255文字で指定してください',
            },
          ]}
        >
          <Input
            placeholder="フォルダ名を入力"
            maxLength={255}
          />
        </Form.Item>

        {/* 補足説明 */}
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            使用可能な文字: 英数字 (a-z, A-Z, 0-9) とアンダースコア (_)
          </Text>
          {departmentName && (
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              ※ あなたの所属部門（{departmentName}）配下にフォルダが作成されます
            </Text>
          )}
        </Space>
      </Form>
    </Modal>
  );
};

export default CreateFormatModal;
