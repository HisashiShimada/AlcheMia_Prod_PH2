'use client';

import React, { useState, useEffect } from 'react';
import { Button, Form, Input, Modal, Select, Space, Typography } from 'antd';
import { generateNamespaceUri } from '../../utils/namespaceUriGenerator';
import type { DeptTreeNode, DepartmentNodeAddDialogProps } from '@/types/namespace';

// re-export（既存の import 側を壊さないため）
export type { DeptTreeNode } from '@/types/namespace';

const { Text } = Typography;

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const DepartmentNodeAddDialog: React.FC<DepartmentNodeAddDialogProps> = ({
  open,
  parentOptions,
  organizationCd = 'ORG',
  onClose,
  onCreated,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string>('');

  // フォーム値の変化を監視してURIプレビューを更新
  const handleValuesChange = () => {
    const values = form.getFieldsValue();
    const parentKey: string | undefined = values.parentKey;
    const label: string = values.label ?? '';

    // 親ノードの departmentCd を取得
    const parentOption = parentOptions.find((o) => o.value === parentKey);
    const deptCd = parentOption?.departmentCd ?? parentKey ?? undefined;

    const uri = generateNamespaceUri(organizationCd, deptCd, label ? [label] : undefined);
    setPreviewUri(uri);
  };

  // ダイアログが開くたびにプレビューをリセット
  useEffect(() => {
    if (!open) return;
    setPreviewUri(generateNamespaceUri(organizationCd));
  }, [open, organizationCd]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 親ノードの departmentCd を取得してURIを確定生成
      const parentOption = parentOptions.find((o) => o.value === values.parentKey);
      const deptCd = parentOption?.departmentCd ?? values.parentKey ?? undefined;
      const autoUri = generateNamespaceUri(organizationCd, deptCd, values.label ? [values.label] : undefined);

      // API呼び出し（未実装時はモックで追加）
      try {
        const res = await fetch('/api/v1/department-nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            label:       values.label,
            prefix:      values.prefix,
            uri:         autoUri,
            description: values.description ?? '',
            parentKey:   values.parentKey,
          }),
        });
        if (res.ok) {
          const created: DeptTreeNode = await res.json();
          onCreated({ ...created, uri: autoUri });
          form.resetFields();
          onClose();
          return;
        }
      } catch {
        // APIが未実装の場合はモックで追加
      }

      // モックフォールバック
      const mockNode: DeptTreeNode = {
        key:         `dept-${Date.now()}`,
        label:       values.label,
        prefix:      values.prefix,
        uri:         autoUri,
        description: values.description ?? '',
        parentKey:   values.parentKey,
      };
      onCreated(mockNode);
      form.resetFields();
      onClose();
    } catch {
      // バリデーションエラーはフォームに表示済み
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
      open={open}
      title="部署ノードを追加"
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          キャンセル
        </Button>,
        <Button key="ok" type="primary" loading={loading} onClick={handleOk}>
          追加
        </Button>,
      ]}
      width={480}
      maskClosable={false}
    >
      <Space orientation="vertical" style={{ width: '100%', marginTop: 8 }} size={4}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          追加した部署ノードは名前空間ツリーに表示されます。
        </Text>
      </Space>

      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        onValuesChange={handleValuesChange}
      >
        {/* 親ノード */}
        <Form.Item
          name="parentKey"
          label={<><Text strong>親ノード</Text> <Text type="danger">*</Text></>}
          rules={[{ required: true, message: '親ノードを選択してください' }]}
        >
          <Select
            placeholder="追加先のノードを選択..."
            options={parentOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        {/* 表示名 */}
        <Form.Item
          name="label"
          label={<><Text strong>表示名</Text> <Text type="danger">*</Text></>}
          rules={[{ required: true, message: '表示名を入力してください' }]}
        >
          <Input placeholder="例: 分析技術部" />
        </Form.Item>

        {/* Prefix */}
        <Form.Item
          name="prefix"
          label={<><Text strong>名前空間Prefix</Text> <Text type="danger">*</Text></>}
          rules={[
            { required: true, message: 'Prefixを入力してください' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: 'Prefixは英数字・アンダースコアのみ使用可能です' },
          ]}
        >
          <Input placeholder="例: analysis" />
        </Form.Item>

        {/* 名前空間URI（自動生成・読み取り専用） */}
        <Form.Item
          label={
            <span>
              <Text strong>名前空間URI</Text>
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                （自動生成）
              </Text>
            </span>
          }
        >
          <div
            style={{
              padding: '6px 11px',
              background: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 12,
              color: previewUri ? '#333' : '#bbb',
              wordBreak: 'break-all',
            }}
          >
            {previewUri || '（親ノードと表示名を入力すると自動生成されます）'}
          </div>
        </Form.Item>

        {/* 説明 */}
        <Form.Item
          name="description"
          label="説明"
        >
          <Input.TextArea
            placeholder="この部署ノードの説明（任意）"
            rows={2}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DepartmentNodeAddDialog;
