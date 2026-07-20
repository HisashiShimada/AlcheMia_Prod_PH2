'use client';

/**
 * 暗号化鍵作成モーダル
 */

import React, { useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, message } from 'antd';
import type { EncryptionKey } from '@/types/encryption';
import { EncryptionAlgorithmLabel } from '@/types/encryption';
import * as encryptionService from '@/services/encryptionService';
import dayjs from 'dayjs';

interface KeyCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (key: EncryptionKey) => void;
}

const ALGORITHM_OPTIONS = Object.entries(EncryptionAlgorithmLabel).map(([value, label]) => ({
  value,
  label,
}));

const KeyCreateModal: React.FC<KeyCreateModalProps> = ({ open, onClose, onCreated }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const newKey = await encryptionService.createKey({
        keyName: values.keyName,
        algorithm: values.algorithm,
        expiresAt: values.expiresAt ? dayjs(values.expiresAt).toISOString() : undefined,
        description: values.description,
      });
      message.success(`鍵「${newKey.keyName}」を作成しました。`);
      form.resetFields();
      onCreated(newKey);
    } catch (err: unknown) {
      // Form validation error は無視
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error('鍵の作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="暗号化鍵の新規作成"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="作成"
      cancelText="キャンセル"
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="middle">
        <Form.Item
          name="keyName"
          label="鍵名"
          rules={[
            { required: true, message: '鍵名を入力してください' },
            { pattern: /^[a-zA-Z0-9_\-]+$/, message: '英数字・ハイフン・アンダースコアのみ使用可能です' },
          ]}
        >
          <Input placeholder="例: my-experiment-key-2026" />
        </Form.Item>

        <Form.Item
          name="algorithm"
          label="暗号化アルゴリズム"
          initialValue="aes256-cbc"
          rules={[{ required: true }]}
        >
          <Select options={ALGORITHM_OPTIONS} />
        </Form.Item>

        <Form.Item name="expiresAt" label="有効期限（任意）">
          <DatePicker style={{ width: '100%' }} placeholder="有効期限を選択" />
        </Form.Item>

        <Form.Item name="description" label="説明（任意）">
          <Input.TextArea rows={3} placeholder="この鍵の用途・説明を入力" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default KeyCreateModal;
