'use client';

import React, { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { Card, Button, Typography, Alert, Space, Spin, theme } from 'antd';
import { LoginOutlined, MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * PINコード入力画面のProps
 */
interface PinCodeInputPageProps {
  /** 仮セッショントークン */
  sessionToken: string;
  /** 組織ID */
  organizationId: string;
  /** マスキングされたメールアドレス */
  maskedEmail?: string;
  /** PINコード検証成功時のコールバック */
  onVerify: (pinCode: string) => Promise<void>;
  /** 戻るボタン押下時のコールバック */
  onBack: () => void;
  /** PINコード再送信のコールバック */
  onResend: () => Promise<void>;
  /** エラーメッセージ */
  error?: string | null;
  /** ローディング状態 */
  loading?: boolean;
}

/**
 * PINコード入力画面コンポーネント
 * 6桁のPINコードを入力し、2段階認証を完了する
 */
export default function PinCodeInputPage({
  sessionToken,
  organizationId,
  maskedEmail,
  onVerify,
  onBack,
  onResend,
  error,
  loading = false,
}: PinCodeInputPageProps) {
  const { token } = theme.useToken();
  const [pinValues, setPinValues] = useState<string[]>(['', '', '', '', '', '']);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  
  // 各入力欄へのref
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 初期表示時に最初の入力欄にフォーカス
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // エラーが変更されたらバリデーションエラーをクリア
  useEffect(() => {
    setValidationError(null);
  }, [error]);

  /**
   * 入力値の変更ハンドラ
   */
  const handleChange = (index: number, value: string) => {
    // 数字以外を除去
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // 最初の1文字のみを取得
    const newValue = numericValue.slice(0, 1);
    
    // 値を更新
    const newPinValues = [...pinValues];
    newPinValues[index] = newValue;
    setPinValues(newPinValues);
    setValidationError(null);
    setResendSuccess(false);

    // 値が入力されたら次の入力欄にフォーカス
    if (newValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * キーダウンイベントハンドラ
   */
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspaceで前の入力欄に戻る
    if (e.key === 'Backspace' && !pinValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Enterキーで送信
    if (e.key === 'Enter') {
      e.preventDefault();
      const fullPin = pinValues.join('');
      if (fullPin.length === 6) {
        handleSubmit(fullPin);
      }
    }
  };

  /**
   * ペーストイベントハンドラ
   */
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    // クリップボードから数字のみを抽出
    const pastedData = e.clipboardData.getData('text');
    const numericData = pastedData.replace(/[^0-9]/g, '').slice(0, 6);
    
    if (numericData.length > 0) {
      // 各桁に分割して設定
      const newPinValues = [...pinValues];
      for (let i = 0; i < numericData.length && i < 6; i++) {
        newPinValues[i] = numericData[i];
      }
      setPinValues(newPinValues);
      setValidationError(null);
      setResendSuccess(false);
      
      // 最後に入力された欄の次にフォーカス
      const nextIndex = Math.min(numericData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  /**
   * PINコード送信ハンドラ
   */
  const handleSubmit = async (pinCode?: string) => {
    const fullPin = pinCode || pinValues.join('');
    
    setValidationError(null);

    // バリデーション
    if (fullPin.length !== 6) {
      setValidationError('6桁のPINコードを入力してください');
      return;
    }

    if (!/^\d{6}$/.test(fullPin)) {
      setValidationError('PINコードは数字のみで入力してください');
      return;
    }

    // PINコード検証
    try {
      await onVerify(fullPin);
    } catch (err) {
      // エラーは親コンポーネントで処理
      console.error('PIN verification failed:', err);
      // エラー時は入力欄をクリア
      setPinValues(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  /**
   * PINコード再送信ハンドラ
   */
  const handleResend = async () => {
    setResendLoading(true);
    setValidationError(null);
    setResendSuccess(false);
    
    try {
      await onResend();
      setResendSuccess(true);
      // 入力欄をクリアして最初にフォーカス
      setPinValues(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error('PIN resend failed:', err);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: token.colorBgLayout,
      }}
    >
      <div style={{ width: '100%', maxWidth: 672, padding: `0 ${token.paddingLG * 1.5}px` }}>
        <Card
          style={{
            borderRadius: token.borderRadiusLG * 1.5,
            boxShadow: token.boxShadowSecondary,
          }}
          styles={{
            body: {
              padding: token.paddingXL * 1.5,
            },
          }}
        >
          {/* ヘッダー */}
          <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center', marginBottom: token.marginXXL }}>
            <Title
              level={2}
              style={{
                margin: 0,
                color: token.colorPrimary,
                fontWeight: token.fontWeightStrong,
              }}
            >
              <MailOutlined style={{ marginRight: token.marginSM }} />
              PINコード認証
            </Title>
            <Paragraph
              type="secondary"
              style={{
                fontSize: token.fontSize,
                margin: 0,
              }}
            >
              {maskedEmail ? (
                <>
                  <strong>{maskedEmail}</strong> 宛にPINコードを送信しました。
                  <br />
                  メールに記載されている6桁の数字を入力してください。
                </>
              ) : (
                <>
                  メールに記載されている6桁のPINコードを入力してください。
                </>
              )}
            </Paragraph>
          </Space>

          {/* エラーメッセージ */}
          {(error || validationError) && (
            <Alert
              message={validationError || error}
              type="error"
              showIcon
              style={{
                marginBottom: token.marginXL * 1.5,
                borderRadius: token.borderRadiusLG,
                fontSize: token.fontSize,
              }}
            />
          )}

          {/* 成功メッセージ */}
          {resendSuccess && !error && !validationError && (
            <Alert
              message="PINコードを再送信しました"
              type="success"
              showIcon
              style={{
                marginBottom: token.marginXL * 1.5,
                borderRadius: token.borderRadiusLG,
                fontSize: token.fontSize,
              }}
            />
          )}

          {/* PINコード入力欄 */}
          <div style={{ marginBottom: token.marginXXL }}>
            <div
              style={{
                display: 'flex',
                gap: token.marginMD,
                justifyContent: 'center',
                marginBottom: token.marginLG,
              }}
            >
              {pinValues.map((value, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={loading || resendLoading}
                  style={{
                    width: 56,
                    height: 64,
                    fontSize: token.fontSizeHeading2,
                    fontWeight: token.fontWeightStrong,
                    textAlign: 'center',
                    border: `2px solid ${
                      validationError || error
                        ? token.colorError
                        : value
                        ? token.colorPrimary
                        : token.colorBorder
                    }`,
                    borderRadius: token.borderRadiusLG,
                    outline: 'none',
                    transition: 'all 0.3s',
                    backgroundColor: loading || resendLoading ? token.colorBgContainerDisabled : token.colorBgContainer,
                    color: token.colorText,
                    cursor: loading || resendLoading ? 'not-allowed' : 'text',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = token.colorPrimary;
                    e.target.style.boxShadow = `0 0 0 2px ${token.colorPrimaryBg}`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = value ? token.colorPrimary : token.colorBorder;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                有効期限: 5分間
              </Text>
            </div>
          </div>

          {/* アクションボタン */}
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Button
              type="primary"
              size="large"
              block
              icon={loading ? <Spin /> : <LoginOutlined />}
              disabled={loading || resendLoading || pinValues.join('').length !== 6}
              onClick={() => handleSubmit()}
              style={{
                height: token.controlHeightLG * 1.55,
              }}
            >
              {loading ? '認証中...' : '認証する'}
            </Button>

            {/* 再送信・戻るボタン */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: token.margin }}>
              <Button
                type="default"
                size="large"
                icon={<ArrowLeftOutlined />}
                onClick={onBack}
                disabled={loading || resendLoading}
                style={{ flex: 1 }}
              >
                戻る
              </Button>
              <Button
                type="default"
                size="large"
                icon={<MailOutlined />}
                onClick={handleResend}
                disabled={loading || resendLoading}
                loading={resendLoading}
                style={{ flex: 1 }}
              >
                {resendLoading ? '送信中...' : '再送信'}
              </Button>
            </div>
          </Space>

          {/* フッター */}
          <div style={{ marginTop: token.marginXXL, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              PINコードが届かない場合は、迷惑メールフォルダをご確認ください
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
