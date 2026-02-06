/**
 * DocumentEditDialog - Document編集ダイアログ（EditorV2用）
 * 
 * Document（Creator、Vendor、Owner、Instrument）の編集機能を提供
 * Material-UI → Ant Design変換版
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Button,
  Input,
  Form,
  Collapse,
  Alert,
  Space,
  Typography,
  Checkbox,
  DatePicker,
  Tag,
  message,
} from 'antd';
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import MultiObjectEditor, { type ComplexObject } from './MultiObjectEditor';
import type { 
  DocumentData,
  DocumentEditDialogProps
} from '../types';
import {
  Creator,
  Vendor,
  Owner,
  Instrument,
} from '../../../types/maiml-unified'

const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * DocumentEditDialog - Document編集ダイアログ
 * 
 * 注意: MultiObjectEditor依存部分は次Phaseで実装
 * 現在は基本プロパティ編集のみサポート
 */
const DocumentEditDialog: React.FC<DocumentEditDialogProps> = ({
  open,
  documentData,
  onClose,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    maimlIds: false,
    signature: false,
    creators: false,
    vendors: false,
    owners: false,
    instruments: false,
  });
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 新規ドキュメント判定（計算プロパティ）
   */
  const isNewDocument = useMemo(() => {
    return !documentData || Object.keys(documentData).length <= 4;
  }, [documentData]);

  /**
   * 初期データ生成
   */
  const getInitialDocumentData = useCallback((): DocumentData => ({
    id: 'documentID',
    uuid: '',
    name: 'document',
    description: '',
    date: new Date().toISOString(),
    creators: [{
      id: 'Creator1',
      uuid: '',
      name: '',
      description: '',
      annotation: ''
    }],
    vendors: [{
      id: 'Vendor1',
      uuid: '',
      name: '',
      description: '',
      annotation: ''
    }],
    owners: [{
      id: 'Owner1',
      uuid: '',
      name: '',
      description: '',
      annotation: ''
    }],
    instruments: [],
    signature: {
      enabled: false
    },
    protocolId: 'protocolID',
    methodId: 'methodID',
    pnmlId: 'pnmlID',
    programId: 'programID',
    chains: [],
    parents: []
  }), []);

  /**
   * UUID v4生成
   */
  const generateUUID = useCallback(() => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }, []);

  /**
   * バリデーション（強化版）
   */
  const validateDocumentData = useMemo(() => (data: DocumentData): string[] => {
    const errors: string[] = [];
    
    // 基本プロパティチェック
    if (!data.name?.trim()) {
      errors.push('❌ Document name is required');
    }
    
    if (!data.id?.trim()) {
      errors.push('❌ Document ID is required');
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (data.uuid && !uuidRegex.test(data.uuid)) {
      errors.push('❌ Invalid UUID format');
    }
    
    if (data.date && isNaN(Date.parse(data.date))) {
      errors.push('❌ Invalid date format');
    }
    
    // 必須要素チェック（配列対応）
    if (!data.creators || data.creators.length === 0) {
      errors.push('❌ At least one Creator is required');
    }
    if (!data.vendors || data.vendors.length === 0) {
      errors.push('❌ At least one Vendor is required');
    }
    if (!data.owners || data.owners.length === 0) {
      errors.push('❌ At least one Owner is required');
    }
    
    // ID重複チェック（配列対応）
    const ids: string[] = [data.id];
    if (data.creators) data.creators.forEach((c: Creator) => c.id && ids.push(c.id));
    if (data.vendors) data.vendors.forEach((v: Vendor) => v.id && ids.push(v.id));
    if (data.owners) data.owners.forEach((o: Owner) => o.id && ids.push(o.id));
    if (data.instruments) data.instruments.forEach((i: Instrument) => i.id && ids.push(i.id));
    
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`❌ Duplicate IDs found: ${duplicateIds.join(', ')}`);
    }
    
    return errors;
  }, []);

  /**
   * ダイアログ開閉時のフォーム初期化
   */
  useEffect(() => {
    if (open) {
      // stateリセット（ダイアログオープン時の初期化は妥当なパターン）
      /* eslint-disable-next-line */
      setHasChanges(false);
       
      setValidationErrors([]);
      
      // フォーム初期化
      if (!isNewDocument && documentData) {
        form.setFieldsValue({
          ...documentData,
          date: documentData.date ? dayjs(documentData.date) : dayjs(),
          signatureEnabled: documentData.signature?.enabled || false,
        });
      } else {
        const initial = getInitialDocumentData();
        form.setFieldsValue({
          ...initial,
          date: dayjs(initial.date),
          signatureEnabled: false,
        });
      }
    }
  }, [open, documentData, form, getInitialDocumentData, isNewDocument]);

  /**
   * UUID一括生成
   */
  const handleAutoGenerateUUIDs = useCallback(() => {
    const values = form.getFieldsValue();
    form.setFieldsValue({
      ...values,
      uuid: generateUUID(),
    });
    setHasChanges(true);
    message.success('UUID を生成しました');
  }, [form, generateUUID]);

  /**
   * 現在時刻設定
   */
  const handleSetCurrentDateTime = useCallback(() => {
    form.setFieldValue('date', dayjs());
    setHasChanges(true);
    message.success('現在時刻を設定しました');
  }, [form]);

  /**
   * セクション展開切り替え
   */
  const handleToggleSection = useCallback((sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  }, []);

  /**
   * MultiObjectEditor用データ変更ハンドラー
   */
  const handleMultiObjectDataChange = useCallback((objectKey: string, objectsArray: ComplexObject[]) => {
    form.setFieldValue(objectKey, objectsArray);
    setHasChanges(true);
    
    // バリデーション
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    validationTimeoutRef.current = setTimeout(() => {
      const values = form.getFieldsValue();
      const errors = validateDocumentData(values as DocumentData);
      setValidationErrors(errors);
    }, 500);
  }, [form, validateDocumentData]);

  /**
   * VendorとInstrumentのIDリスト算出
   */
  const vendorIds = useMemo(() => {
    const vendors = form.getFieldValue('vendors') || [];
    return vendors.map((v: Vendor) => v.id).filter(Boolean);
  }, [form]);

  const instrumentIds = useMemo(() => {
    const instruments = form.getFieldValue('instruments') || [];
    return instruments.map((i: Instrument) => i.id).filter(Boolean);
  }, [form]);

  /**
   * フォーム変更ハンドラー
   */
  const handleFormChange = useCallback(() => {
    setHasChanges(true);

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      const values = form.getFieldsValue();
      const errors = validateDocumentData(values as DocumentData);
      setValidationErrors(errors);
    }, 500);
  }, [form, validateDocumentData]);

  /**
   * 保存処理
   */
  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      const documentToSave: DocumentData = {
        ...values,
        date: values.date ? (values.date as Dayjs).toISOString() : new Date().toISOString(),
        signature: {
          enabled: values.signatureEnabled || false,
        },
      };

      const errors = validateDocumentData(documentToSave);
      setValidationErrors(errors);
      
      if (errors.length > 0) {
        message.error('バリデーションエラーがあります');
        return;
      }
      
      onSave(documentToSave);
      onClose();
      message.success('Document を保存しました');
    } catch (error) {
      console.error('Validation failed:', error);
      message.error('入力内容を確認してください');
    }
  }, [form, validateDocumentData, onSave, onClose]);

  /**
   * キャンセル処理
   */
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      Modal.confirm({
        title: '未保存の変更があります',
        content: '変更を破棄しますか？',
        okText: '破棄',
        cancelText: 'キャンセル',
        onOk: onClose,
      });
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Modal
      title={
        <Space>
          <span>📄 Document編集</span>
          {isNewDocument && <Tag color="success">新規作成</Tag>}
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      width={900}
      style={{ top: 20 }}
      footer={[
        <Space key="status" style={{ marginRight: 'auto' }}>
          {hasChanges && <Tag color="warning">⚠️ 未保存の変更があります</Tag>}
          {isNewDocument && !hasChanges && <Tag color="success">🆕 新規Document作成モード</Tag>}
        </Space>,
        <Button key="cancel" onClick={handleCancel}>
          キャンセル
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          disabled={validationErrors.length > 0}
          icon={<SaveOutlined />}
          danger={!isNewDocument}
          style={isNewDocument ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : undefined}
        >
          💾 Document保存
        </Button>,
      ]}
    >
      <div style={{ maxHeight: 'calc(90vh - 200px)', overflow: 'auto' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* バリデーションエラー */}
          {validationErrors.length > 0 && (
            <Alert
              message="バリデーションエラー"
              description={
                <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              }
              type="error"
              showIcon
            />
          )}

          {/* 新規作成モード通知 */}
          {isNewDocument && (
            <Alert
              message="🆕 新規Document作成モード"
              description="必要最小限の情報から開始します。参照プロパティは必要に応じて追加できます。"
              type="success"
              showIcon
            />
          )}

          {/* UUID一括生成ボタン */}
          <Button
            icon={<ThunderboltOutlined />}
            onClick={handleAutoGenerateUUIDs}
            block
          >
            UUID一括生成
          </Button>

          {/* フォーム */}
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleFormChange}
          >
            <Collapse
              activeKey={Object.entries(expandedSections)
                .filter(([_, isExpanded]) => isExpanded)
                .map(([key, _]) => key)}
              onChange={(keys) => {
                const newExpanded: Record<string, boolean> = {};
                (keys as string[]).forEach(key => {
                  newExpanded[key] = true;
                });
                setExpandedSections(prev => ({
                  ...prev,
                  ...Object.keys(prev).reduce((acc, key) => {
                    acc[key] = newExpanded[key] || false;
                    return acc;
                  }, {} as Record<string, boolean>)
                }));
              }}
            >
              {/* 基本プロパティ */}
              <Panel header={<Text strong>📄 基本プロパティ</Text>} key="basic">
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Form.Item
                    label="Document ID"
                    name="id"
                    rules={[{ required: true, message: 'Document ID は必須です' }]}
                  >
                    <Input />
                  </Form.Item>

                  <Form.Item label="UUID" name="uuid">
                    <Space.Compact style={{ width: '100%' }}>
                      <Input />
                      <Button
                        icon={<ThunderboltOutlined />}
                        onClick={() => {
                          form.setFieldValue('uuid', generateUUID());
                          setHasChanges(true);
                        }}
                      >
                        生成
                      </Button>
                    </Space.Compact>
                  </Form.Item>

                  <Form.Item
                    label="Name"
                    name="name"
                    rules={[{ required: true, message: 'Name は必須です' }]}
                  >
                    <Input />
                  </Form.Item>

                  <Form.Item label="Description" name="description">
                    <TextArea rows={2} />
                  </Form.Item>

                  <Form.Item label="Date" name="date">
                    <Space.Compact style={{ width: '100%' }}>
                      <DatePicker
                        showTime
                        style={{ width: '100%' }}
                        format="YYYY-MM-DD HH:mm:ss"
                      />
                      <Button
                        icon={<ClockCircleOutlined />}
                        onClick={handleSetCurrentDateTime}
                        title="現在時刻を設定"
                      >
                        現在
                      </Button>
                    </Space.Compact>
                  </Form.Item>
                </Space>
              </Panel>

              {/* MaiML ID属性 */}
              <Panel header={<Text strong>🔑 MaiML ID属性（詳細設定）</Text>} key="maimlIds">
                <Alert
                  message="💡 MaiMLファイル内の各要素に設定されるID属性値を編集できます。"
                  type="info"
                  style={{ marginBottom: 16 }}
                />
                
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Form.Item label="Protocol ID" name="protocolId">
                    <Input placeholder="protocolID" />
                  </Form.Item>

                  <Form.Item label="Method ID" name="methodId">
                    <Input placeholder="methodID" />
                  </Form.Item>

                  <Form.Item label="PNML ID" name="pnmlId">
                    <Input placeholder="pnmlID" />
                  </Form.Item>

                  <Form.Item label="Program ID" name="programId">
                    <Input placeholder="programID" />
                  </Form.Item>

                  <Alert
                    message="⚠️ ID値は英数字、アンダースコア(_)、ハイフン(-)のみ使用可能です。最大64文字まで設定できます。"
                    type="warning"
                  />
                </Space>
              </Panel>

              {/* XML署名 */}
              <Panel
                header={
                  <Space>
                    <SecurityScanOutlined />
                    <Text strong>🔒 XML署名（改ざん防止）</Text>
                  </Space>
                }
                key="signature"
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Alert
                    message="📋 XML署名機能について"
                    description="W3C XMLDSig仕様に基づくXML署名を追加します。MaiML保存時にSHA-256ハッシュを計算し、document要素内にSignature要素を挿入します。"
                    type="info"
                  />

                  <Form.Item name="signatureEnabled" valuePropName="checked">
                    <Checkbox>改ざん防止のためのXML署名を行う</Checkbox>
                  </Form.Item>
                </Space>
              </Panel>
            </Collapse>
          </Form>

          {/* Creator編集 */}
          <MultiObjectEditor
            objectKey="creators"
            title="Creator"
            icon="👤"
            includeReferences={true}
            initialData={form.getFieldValue('creators') || []}
            onDataChange={handleMultiObjectDataChange}
            minItems={1}
            isExpanded={expandedSections.creators}
            onToggleExpanded={handleToggleSection}
            vendorIds={vendorIds}
            instrumentIds={instrumentIds}
          />

          {/* Vendor編集 */}
          <MultiObjectEditor
            objectKey="vendors"
            title="Vendor"
            icon="🏢"
            includeReferences={false}
            initialData={form.getFieldValue('vendors') || []}
            onDataChange={handleMultiObjectDataChange}
            minItems={1}
            isExpanded={expandedSections.vendors}
            onToggleExpanded={handleToggleSection}
          />

          {/* Owner編集 */}
          <MultiObjectEditor
            objectKey="owners"
            title="Owner"
            icon="👥"
            includeReferences={false}
            initialData={form.getFieldValue('owners') || []}
            onDataChange={handleMultiObjectDataChange}
            minItems={1}
            isExpanded={expandedSections.owners}
            onToggleExpanded={handleToggleSection}
          />

          {/* Instrument編集 */}
          <MultiObjectEditor
            objectKey="instruments"
            title="Instrument"
            icon="🔬"
            includeReferences={false}
            initialData={form.getFieldValue('instruments') || []}
            onDataChange={handleMultiObjectDataChange}
            minItems={0}
            isExpanded={expandedSections.instruments}
            onToggleExpanded={handleToggleSection}
          />

          {/* ヒント */}
          <Alert
            message="💡 ヒント"
            description={
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                <li>UUIDジェネレーターボタンで一意の識別子を一括生成できます</li>
                <li>Creator、Vendor、Ownerは最低1件必要です</li>
                <li>Instrumentは任意（0件可）です</li>
                <li>各要素は追加/削除/並び替えが可能です</li>
                <li>XML署名を有効にすると、MaiML保存時に自動的に署名が追加されます</li>
              </ul>
            }
            type="info"
          />
        </Space>
      </div>
    </Modal>
  );
};

export default DocumentEditDialog;