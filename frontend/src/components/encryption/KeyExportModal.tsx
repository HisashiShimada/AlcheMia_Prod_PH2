'use client';

/**
 * 鍵エクスポートモーダル
 *
 * @description
 * 選択した1つの鍵を .key 形式でパスワード保護してエクスポートするモーダル。
 * エクスポートは1鍵ずつ行う仕様。
 */

import React, { useState } from 'react';
import { App, Modal, Form, Input, Typography, Alert, Descriptions } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { EncryptionKey } from '@/types/encryption';
import * as encryptionService from '@/services/encryptionService';
import dayjs from 'dayjs';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

interface KeyExportModalProps {
  open: boolean;
  /** エクスポート対象の鍵（単一） */
  targetKey: EncryptionKey | null;
  onClose: () => void;
}

const KeyExportModal: React.FC<KeyExportModalProps> = ({ open, targetKey, onClose }) => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // エクスポート処理
  // ---------------------------------------------------------------------------

  const handleOk = async () => {
    if (!targetKey) return;
    try {
      const values = await form.validateFields();
      setLoading(true);

      const { fileContent, fileName } = await encryptionService.exportKey(
        targetKey.keyId,
        values.password,
      );

      // Base64デコードしてブラウザダウンロード
      const binaryStr = atob(fileContent);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      message.success(t('encryption.keyExport.success', { fileName }));
      form.resetFields();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(t('encryption.keyExport.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  if (!targetKey) return null;

  return (
    <Modal
      title={
        <span>
          <DownloadOutlined style={{ marginRight: 8 }} />
          鍵のエクスポート
        </span>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="エクスポート"
      cancelText="キャンセル"
      confirmLoading={loading}
      destroyOnHidden
    >
      {/* エクスポート対象の鍵情報 */}
      <Descriptions
        size="small"
        column={1}
        bordered
        style={{ marginBottom: 16 }}
      >
        <Descriptions.Item label="鍵名">
          <Text strong>{targetKey.keyName}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="識別子">
          <Text code style={{ fontSize: 12 }}>
            {targetKey.keyIdentifier ?? targetKey.keyId.substring(0, 16)}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="アルゴリズム">
          <Text type="secondary">{targetKey.algorithm}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="作成日時">
          <Text type="secondary">
            {dayjs(targetKey.createdAt).format('YYYY/MM/DD HH:mm')}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <Alert
        type="info"
        showIcon
        message="エクスポートされた .key ファイルはパスワードで保護されます。パスワードは安全な場所に保管してください。"
        style={{ marginBottom: 16, fontSize: 12 }}
      />

      <Form form={form} layout="vertical" size="middle">
        <Form.Item
          name="password"
          label="パスワード"
          rules={[
            { required: true, message: 'パスワードを入力してください' },
            { min: 8, message: 'パスワードは8文字以上で入力してください' },
          ]}
        >
          <Input.Password placeholder="8文字以上のパスワード" />
        </Form.Item>

        <Form.Item
          name="passwordConfirm"
          label="パスワード（確認）"
          dependencies={['password']}
          rules={[
            { required: true, message: '確認用パスワードを入力してください' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('パスワードが一致しません'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="同じパスワードを再入力" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default KeyExportModal;
