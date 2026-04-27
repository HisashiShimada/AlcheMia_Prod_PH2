/**
 * パスワード変更モーダル
 * 一時パスワードでログインした後、パスワード変更を促すモーダル
 */

import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Space } from 'antd';
import { LockOutlined, EyeTwoTone, EyeInvisibleOutlined } from '@ant-design/icons';
import { authService, AuthServiceError } from '@/services/authService';

interface ChangePasswordModalProps {
  open: boolean;
  onSuccess: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * パスワード変更処理
   */
  const handleSubmit = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      // パスワード変更API呼び出し
      await authService.changePassword(values.currentPassword, values.newPassword);

      // フォームをリセットして成功コールバックを呼び出す
      form.resetFields();
      onSuccess();
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setError(err.message);
      } else {
        setError('パスワード変更中にエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="パスワード変更（必須）"
      open={open}
      footer={null}
      maskClosable={false}
      closable={false}
      width={500}
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          title="一時パスワードでログインしています"
          description="セキュリティのため、パスワードを変更してください。一時パスワードの有効期限は24時間です。"
          type="warning"
          showIcon
        />

        {error && (
          <Alert
            title="エラー"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          {/* 現在のパスワード */}
          <Form.Item
            name="currentPassword"
            label="現在のパスワード（一時パスワード）"
            rules={[
              { required: true, message: '現在のパスワードを入力してください' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="メールで送信された一時パスワード"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          {/* 新しいパスワード */}
          <Form.Item
            name="newPassword"
            label="新しいパスワード"
            rules={[
              { required: true, message: '新しいパスワードを入力してください' },
              { min: 8, message: 'パスワードは8文字以上である必要があります' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: '大文字、小文字、数字を含める必要があります',
              },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="8文字以上（大文字、小文字、数字を含む）"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          {/* 新しいパスワード（確認） */}
          <Form.Item
            name="confirmPassword"
            label="新しいパスワード（確認）"
            dependencies={['newPassword']}
            hasFeedback
            rules={[
              { required: true, message: 'パスワードを再入力してください' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('パスワードが一致しません'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="新しいパスワードを再入力"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          {/* ボタン */}
          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              パスワードを変更
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
};

export default ChangePasswordModal;
