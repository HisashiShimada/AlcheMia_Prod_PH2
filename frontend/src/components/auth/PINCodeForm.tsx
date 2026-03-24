'use client';

/**
 * PINCodeForm - PINコード入力フォームコンポーネント
 * 
 * メールで送信された6桁のPINコードを入力し、二段階認証を完了するフォーム。
 * PINコード再送信機能とカウントダウンタイマーを含みます。
 */

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Alert, Typography, Space, theme } from 'antd';
import { MailOutlined, ReloadOutlined } from '@ant-design/icons';
import { verifyPin, resendPin } from '../../utils/authApi';
import type { VerifyPINResponse } from '../../types/auth';
import { extractErrorMessage } from '@/utils/errorUtils';

const { Text, Paragraph } = Typography;
const { useToken } = theme;

interface PINCodeFormProps {
  /**
   * 仮セッショントークン
   */
  sessionToken: string;
  
  /**
   * マスキングされたメールアドレス
   */
  maskedEmail: string;
  
  /**
   * PINコードの初期有効期限（秒）
   */
  initialExpiresIn: number;
  
  /**
   * PINコード検証成功時のコールバック
   */
  onSuccess: (response: VerifyPINResponse) => void;
  
  /**
   * エラー発生時のコールバック
   */
  onError: (error: string) => void;
  
  /**
   * 試行回数超過時のコールバック
   */
  onMaxAttemptsExceeded: () => void;
  
  /**
   * 組織ID
   */
  organizationId: string;
}

/**
 * PINCodeForm コンポーネント
 */
export default function PINCodeForm({
  sessionToken,
  maskedEmail,
  initialExpiresIn,
  onSuccess,
  onError,
  onMaxAttemptsExceeded,
  organizationId,
}: PINCodeFormProps) {
  const { token } = useToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(initialExpiresIn);
  const [canResend, setCanResend] = useState(false);

  /**
   * カウントダウンタイマー
   */
  useEffect(() => {
    if (remainingTime <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingTime]);

  /**
   * PINコード検証ハンドラ
   */
  const handleSubmit = async (values: { pinCode: string }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await verifyPin(
        values.pinCode.trim(),
        sessionToken,
        organizationId
      );
      
      onSuccess(response);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      onError(errorMessage);
      
      // 試行回数超過エラーの場合（より厳密なチェック）
      if (
        errorMessage.includes('試行回数の上限') ||
        errorMessage.includes('PINコード入力試行回数の上限に達しました')
      ) {
        onMaxAttemptsExceeded();
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * PINコード再送信ハンドラ
   */
  const handleResend = async () => {
    setResending(true);
    setError(null);

    try {
      const response = await resendPin(sessionToken, organizationId);
      
      // カウントダウンタイマーをリセット
      setRemainingTime(response.expiresIn);
      setCanResend(false);
      
      // 成功メッセージ
      setError(null);
      form.resetFields();
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setResending(false);
    }
  };

  /**
   * 残り時間を分:秒形式でフォーマット
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '0 auto',
        padding: token.paddingLG,
      }}
    >
      {/* 説明文 */}
      <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: token.marginLG }}>
        <div style={{ textAlign: 'center' }}>
          <MailOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
        </div>
        
        <Paragraph style={{ textAlign: 'center', marginBottom: 0 }}>
          <Text strong>{maskedEmail}</Text> にPINコードを送信しました。
          <br />
          メールに記載された6桁のコードを入力してください。
        </Paragraph>

        {/* 有効期限表示 */}
        {remainingTime > 0 && (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
            有効期限: {formatTime(remainingTime)}
          </Text>
        )}
      </Space>

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
        name="pin-code"
        onFinish={handleSubmit}
        size="large"
        layout="vertical"
      >
        {/* PINコード入力 */}
        <Form.Item
          name="pinCode"
          label="PINコード"
          rules={[
            { required: true, message: 'PINコードを入力してください' },
            { pattern: /^\d{6}$/, message: 'PINコードは6桁の数字で入力してください' },
          ]}
        >
          <Input
            placeholder="000000"
            maxLength={6}
            autoComplete="one-time-code"
            disabled={loading || resending}
            style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }}
          />
        </Form.Item>

        {/* 検証ボタン */}
        <Form.Item style={{ marginBottom: token.marginSM }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={resending}
            block
            size="large"
          >
            確認
          </Button>
        </Form.Item>

        {/* 再送信ボタン */}
        <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
          <Button
            type="link"
            icon={<ReloadOutlined />}
            onClick={handleResend}
            disabled={!canResend || loading}
            loading={resending}
            style={{ padding: 0 }}
          >
            {canResend ? 'PINコードを再送信' : `再送信可能まで ${formatTime(remainingTime)}`}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
