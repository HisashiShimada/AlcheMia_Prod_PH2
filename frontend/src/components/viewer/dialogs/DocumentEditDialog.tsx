// frontend/src/components/viewer/dialogs/DocumentEditDialog.tsx
// Document編集ダイアログ（Ant Design v6版）

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Collapse,
  Alert,
  Row,
  Col,
  message,
  Typography,
} from 'antd';
import {
  UserOutlined,
  ShopOutlined,
  TeamOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { DocumentInfo } from '../utils/maimlGenerator';

const { TextArea } = Input;
const { Text } = Typography;

interface DocumentEditDialogProps {
  open: boolean;
  documentData: DocumentInfo | null;
  onClose: () => void;
  onSave: (data: DocumentInfo) => void;
}

/**
 * UUID v4生成
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Document編集ダイアログ
 */
const DocumentEditDialog: React.FC<DocumentEditDialogProps> = ({
  open,
  documentData,
  onClose,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open && documentData) {
      form.setFieldsValue({
        id: documentData.id || `doc_${Date.now()}`,
        name: documentData.name || 'Untitled',
        description: documentData.description || '',
        date: documentData.date || new Date().toISOString(),
        creatorId: documentData.creator?.id || 'Creator',
        creatorName: documentData.creator?.name || '',
        vendorId: documentData.vendor?.id || 'Vendor',
        vendorName: documentData.vendor?.name || '',
      });
      
      // 次のレンダリングサイクルで実行
      setTimeout(() => {
        setHasChanges(false);
      }, 0);
    }
  }, [open, documentData, form]);

  // UUID生成
  const handleGenerateUUID = useCallback(() => {
    const uuid = generateUUID();
    message.success(`UUID生成: ${uuid}`);
  }, []);

  // 現在時刻設定
  const handleSetCurrentTime = useCallback(() => {
    const currentTime = new Date().toISOString();
    form.setFieldValue('date', currentTime);
    setHasChanges(true);
    message.success('現在時刻を設定しました');
  }, [form]);

  // フォーム値変更
  const handleValuesChange = useCallback(() => {
    setHasChanges(true);
  }, []);

  // 保存
  const handleOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      const updatedDocument: DocumentInfo = {
        id: values.id,
        name: values.name,
        description: values.description,
        date: values.date,
        creator: {
          id: values.creatorId,
          name: values.creatorName,
        },
        vendor: {
          id: values.vendorId,
          name: values.vendorName,
        },
      };
      
      onSave(updatedDocument);
      message.success('Documentを保存しました');
      setHasChanges(false);
    } catch (err) {
      console.error('❌ [DocumentEditDialog] バリデーションエラー:', err);
    }
  }, [form, onSave]);

  // キャンセル
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      Modal.confirm({
        title: '未保存の変更',
        content: '変更が保存されていません。破棄しますか？',
        okText: '破棄',
        cancelText: 'キャンセル',
        onOk: () => {
          form.resetFields();
          setHasChanges(false);
          onClose();
        },
      });
    } else {
      form.resetFields();
      onClose();
    }
  }, [hasChanges, form, onClose]);

  const items = [
    {
      key: 'basic',
      label: '📄 基本情報',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="id"
                label="Document ID"
                rules={[{ required: true, message: 'IDは必須です' }]}
              >
                <Input placeholder="document_001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="名前"
                rules={[{ required: true, message: '名前は必須です' }]}
              >
                <Input placeholder="実験名" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="説明">
            <TextArea rows={3} placeholder="Documentの説明を入力" />
          </Form.Item>

          <Form.Item name="date" label="日付">
            <Space.Compact style={{ width: '100%' }}>
              <Input readOnly />
              <Button
                icon={<ClockCircleOutlined />}
                onClick={handleSetCurrentTime}
              >
                現在時刻
              </Button>
            </Space.Compact>
          </Form.Item>
        </Space>
      ),
    },
    {
      key: 'creator',
      label: (
        <Space>
          <UserOutlined />
          <span>Creator（作成者）</span>
        </Space>
      ),
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="creatorId"
              label="Creator ID"
              rules={[{ required: true, message: 'Creator IDは必須です' }]}
            >
              <Input placeholder="Creator" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="creatorName" label="Creator Name">
              <Input placeholder="作成者名" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'vendor',
      label: (
        <Space>
          <ShopOutlined />
          <span>Vendor（ベンダー）</span>
        </Space>
      ),
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="vendorId"
              label="Vendor ID"
              rules={[{ required: true, message: 'Vendor IDは必須です' }]}
            >
              <Input placeholder="Vendor" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="vendorName" label="Vendor Name">
              <Input placeholder="ベンダー名" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <Modal
      title="📄 Document編集"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      width={800}
      okText="保存"
      cancelText="キャンセル"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {hasChanges && (
          <Alert
            message="未保存の変更があります"
            type="warning"
            showIcon
            closable
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
        >
          <Collapse
            items={items}
            defaultActiveKey={['basic']}
            style={{ marginBottom: 16 }}
          />
        </Form>

        <Alert
          message={
            <Space direction="vertical" size="small">
              <Text strong>💡 ヒント:</Text>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Document IDは一意である必要があります</li>
                <li>Creator と Vendor は必須項目です</li>
                <li>日付は ISO 8601 形式で保存されます</li>
              </ul>
            </Space>
          }
          type="info"
        />
      </Space>
    </Modal>
  );
};

export default DocumentEditDialog;
