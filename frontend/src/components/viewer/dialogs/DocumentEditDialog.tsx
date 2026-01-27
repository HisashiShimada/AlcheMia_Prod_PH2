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
  Select,
  Spin,
} from 'antd';
import {
  UserOutlined,
  ShopOutlined,
  TeamOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { DocumentInfo } from '../../../utils/maimlGenerator';
import { fetchCreators, fetchVendors, type MasterDataItem } from '@/utils/apiClient';

const { TextArea } = Input;
const { Text } = Typography;

interface DocumentEditDialogProps {
  open: boolean;
  documentData: DocumentInfo | null;
  onClose: () => void;
  onSave: (data: DocumentInfo) => void;
  projectName?: string;        // 新規作成時のデフォルト値
  isNewDocument?: boolean;     // 新規/既存の判定
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
  projectName,
  isNewDocument = false,
}) => {
  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);
  const [creators, setCreators] = useState<MasterDataItem[]>([]);
  const [vendors, setVendors] = useState<MasterDataItem[]>([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);

  // マスタデータの取得
  useEffect(() => {
    const loadMasterData = async () => {
      if (!open) return;
      
      setIsLoadingMasters(true);
      try {
        const [creatorsResponse, vendorsResponse] = await Promise.all([
          fetchCreators(),
          fetchVendors(),
        ]);
        
        if (creatorsResponse.success) {
          setCreators(creatorsResponse.data.items);
        }
        
        if (vendorsResponse.success) {
          setVendors(vendorsResponse.data.items);
        }
        
        console.log('✅ [DocumentEditDialog] マスタデータ取得完了');
      } catch (error) {
        console.error('❌ [DocumentEditDialog] マスタデータ取得エラー:', error);
        message.error('マスタデータの取得に失敗しました');
      } finally {
        setIsLoadingMasters(false);
      }
    };
    
    loadMasterData();
  }, [open]);

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open) {
      if (documentData) {
        // 既存Document編集
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
      } else {
        // 新規Document作成
        const defaultName = projectName || 'Untitled';
        form.setFieldsValue({
          id: `doc_${Date.now()}`,
          name: defaultName,
          description: '',
          date: new Date().toISOString(),
          creatorId: 'Creator',
          creatorName: '',
          vendorId: 'Vendor',
          vendorName: '',
        });
      }
      
      // 次のレンダリングサイクルで実行
      setTimeout(() => {
        setHasChanges(false);
      }, 0);
    }
  }, [open, documentData, form, projectName]);

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
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
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
                <Input 
                  placeholder="実験名" 
                  disabled={!isNewDocument && !!documentData}
                />
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
          <Col span={24}>
            <Form.Item
              name="creatorId"
              label="Creator"
              rules={[{ required: true, message: 'Creatorは必須です' }]}
            >
              <Select
                placeholder="Creatorを選択してください"
                loading={isLoadingMasters}
                onChange={(value) => {
                  const selected = creators.find(c => c.id === value);
                  if (selected) {
                    form.setFieldValue('creatorName', selected.name);
                    setHasChanges(true);
                  }
                }}
                options={creators.map(creator => ({
                  label: `${creator.name}${creator.description ? ` (${creator.description})` : ''}`,
                  value: creator.id,
                }))}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="creatorName" label="Creator Name">
              <Input placeholder="自動入力されます" readOnly />
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
          <Col span={24}>
            <Form.Item
              name="vendorId"
              label="Vendor"
              rules={[{ required: true, message: 'Vendorは必須です' }]}
            >
              <Select
                placeholder="Vendorを選択してください"
                loading={isLoadingMasters}
                onChange={(value) => {
                  const selected = vendors.find(v => v.id === value);
                  if (selected) {
                    form.setFieldValue('vendorName', selected.name);
                    setHasChanges(true);
                  }
                }}
                options={vendors.map(vendor => ({
                  label: `${vendor.name}${vendor.description ? ` (${vendor.description})` : ''}`,
                  value: vendor.id,
                }))}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="vendorName" label="Vendor Name">
              <Input placeholder="自動入力されます" readOnly />
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
      <Space orientation="vertical" style={{ width: '100%' }} size="large">
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
            <Space orientation="vertical" size="small">
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
