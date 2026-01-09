'use client';

/**
 * PasswordResetExecute - パスワード変更実行フォームコンポーネント
 * 
 * リセットトークンを使用して新しいパスワードを設定します。
 */

import React, { useState } from 'react';
import { Form, Input, Button, Alert, Typography, Space, theme } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { resetPassword } from '../../utils/authApi';

const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

interface PasswordResetExecuteProps {
  /**
   * リセットトークン
   */
  resetToken: string;
  
  /**
   * パスワード変更成功時のコールバック
   */
  onSuccess: () => void;
  
  /**
   * エラー発生時のコールバック
   */
  onError: (error: string) => void;
}

interface ResetFormValues {
  newPassword: string;
  confirmPassword: string;
}

/**
 * PasswordResetExecute コンポーネント
 */
export default function PasswordResetExecute({
  resetToken,
  onSuccess,
  onError,
}: PasswordResetExecuteProps) {
  const { token } = useToken();
  const [form] = Form.useForm<ResetFormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * フォーム送信ハンドラ
   */
  const handleSubmit = async (values: ResetFormValues) => {
    setLoading(true);
    setError(null);

    try {
      await resetPassword(resetToken, values.newPassword);
      
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予期しないエラーが発生しました';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '0 auto',
        padding: token.paddingLG,
      }}
    >
      {/* タイトルと説明 */}
      <div style={{ marginBottom: token.marginLG }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: token.marginMD }}>
          新しいパスワードを設定
        </Title>
        <Paragraph style={{ textAlign: 'center', color: token.colorTextSecondary }}>
          新しいパスワードを入力してください。
        </Paragraph>
      </div>

      {/* パスワード要件の表示 */}
      <Alert
        message="パスワード要件"
        description={
          <Space direction="vertical" size="small">
            <Text>
              <CheckCircleOutlined style={{ color: token.colorSuccess, marginRight: 8 }} />
              8文字以上
            </Text>
            <Text>
              <CheckCircleOutlined style={{ color: token.colorSuccess, marginRight: 8 }} />
              大文字・小文字・数字・記号を含めることを推奨
            </Text>
          </Space>
        }
        type="info"
        showIcon={false}
        style={{ marginBottom: token.marginMD }}
      />

      {/* エラーメッセージ表示 */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: token.marginMD }}
        />
      )}

      <Form
        form={form}
        name="password-reset-execute"
        onFinish={handleSubmit}
        size="large"
        layout="vertical"
      >
        {/* 新しいパスワード入力 */}
        <Form.Item
          name="newPassword"
          label="新しいパスワード"
          rules={[
            { required: true, message: '新しいパスワードを入力してください' },
            { min: 8, message: 'パスワードは8文字以上で入力してください' },
            { max: 255, message: 'パスワードは255文字以内で入力してください' },
          ]}
          hasFeedback
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
            placeholder="新しいパスワード"
            autoComplete="new-password"
            disabled={loading}
          />
        </Form.Item>

        {/* パスワード確認入力 */}
        <Form.Item
          name="confirmPassword"
          label="パスワード確認"
          dependencies={['newPassword']}
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
          hasFeedback
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
            placeholder="パスワードを再入力"
            autoComplete="new-password"
            disabled={loading}
          />
        </Form.Item>

        {/* 変更ボタン */}
        <Form.Item style={{ marginBottom: 0 }}>
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
    </div>
  );
}
