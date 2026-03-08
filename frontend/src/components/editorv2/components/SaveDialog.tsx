/**
 * SaveDialog - ペトリネット保存ダイアログ（EditorV2用）
 * 
 * Draft名と説明を入力してペトリネットを保存するダイアログコンポーネント
 * Material-UI → Ant Design変換版
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Alert, Spin, Space, Form } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import type { SaveData } from '@/types/editor';

const { TextArea } = Input;

/**
 * SaveDialog Props
 */
export interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: SaveData) => void;
  isLoading?: boolean;
  error?: string;
  initialName?: string;
  initialDescription?: string;
}

/**
 * SaveDialog - Draft保存ダイアログ
 */
const SaveDialog: React.FC<SaveDialogProps> = ({
  open,
  onClose,
  onSave,
  isLoading = false,
  error,
  initialName = '',
  initialDescription = '',
}) => {
  const [form] = Form.useForm();

  // ダイアログが開かれたときに初期値をリセット
  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: initialName,
        description: initialDescription,
      });
    }
  }, [open, initialName, initialDescription, form]);

  /**
   * 保存ハンドラー
   */
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      onSave({
        name: values.name.trim(),
        description: (values.description || '').trim(),
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  /**
   * キャンセルハンドラー
   */
  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      title="ペトリネットを保存"
      open={open}
      onCancel={handleCancel}
      maskClosable={!isLoading}
      keyboard={!isLoading}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={isLoading}>
          キャンセル
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          disabled={isLoading}
          icon={!isLoading ? <SaveOutlined /> : undefined}
          loading={isLoading}
        >
          {isLoading ? '保存中...' : '保存'}
        </Button>,
      ]}
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* エラー表示 */}
        {error && (
          <Alert
            message="エラー"
            description={error}
            type="error"
            showIcon
            closable
          />
        )}

        {/* フォーム */}
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: initialName,
            description: initialDescription,
          }}
        >
          {/* Draft名 */}
          <Form.Item
            label="Draft名"
            name="name"
            required
            help="ペトリネットの名前を入力してください"
            rules={[
              { required: true, message: 'Draft名は必須です' },
              { max: 100, message: 'Draft名は100文字以内にしてください' },
              {
                validator: (_, value) => {
                  if (value && value.trim() === '') {
                    return Promise.reject(new Error('Draft名は必須です'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder="例: 材料合成プロセス"
              disabled={isLoading}
              onPressEnter={(e) => {
                e.preventDefault();
                if (!isLoading) {
                  handleSave();
                }
              }}
              autoFocus
            />
          </Form.Item>

          {/* 説明 */}
          <Form.Item
            label="説明"
            name="description"
            help="ペトリネットの説明（オプション）"
          >
            <TextArea
              rows={4}
              placeholder="例: このプロセスは材料A、B、Cを合成して最終製品を作成します"
              disabled={isLoading}
            />
          </Form.Item>
        </Form>

        {/* ローディング表示 */}
        {isLoading && (
          <Space>
            <Spin size="small" />
            <span style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 14 }}>
              保存中...
            </span>
          </Space>
        )}
      </Space>
    </Modal>
  );
};

export default SaveDialog;