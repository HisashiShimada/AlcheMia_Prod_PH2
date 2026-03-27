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
import MultiObjectEditor from './MultiObjectEditor';
import type { 
  DocumentData,
} from '../../../types/editor';
import {
  DocumentTagData,
} from '../../../types/maiml-unified'
import { fetchMasters, type CreatorRecord, type VendorRecord, type InstrumentRecord } from '@/services/masterApiService';

const { Panel } = Collapse;

/**
 * DocumentEditDialogProps - DocumentEditDialogコンポーネントのProps型定義
 */
export interface DocumentEditDialogProps {
  open: boolean;
  documentData?: DocumentData | null;
  onClose: () => void;
  onSave: (document: DocumentData) => void;
  readOnly?: boolean;
}
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
  const [hasChanges, setHasChanges] = useState<boolean>(false);
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
   * マスタデータ変換関数
   */
  const convertCreatorToDocumentTag = useCallback((creator: CreatorRecord): DocumentTagData => ({
    tagName: 'Creator',
    id: creator.creatorId,
    uuid: creator.creatorUuid,
    name: creator.creatorName,
    description: creator.creatorDescription,
    annotation: creator.creatorAnnotation,
  }), []);

  const convertVendorToDocumentTag = useCallback((vendor: VendorRecord): DocumentTagData => ({
    tagName: 'Vendor',
    id: vendor.vendorId,
    uuid: vendor.vendorUuid,
    name: vendor.vendorName,
    description: vendor.vendorDescription,
    annotation: vendor.vendorAnnotation,
  }), []);

  const convertInstrumentToDocumentTag = useCallback((instrument: InstrumentRecord): DocumentTagData => ({
    tagName: 'Instrument',
    id: instrument.instrumentId,
    uuid: instrument.instrumentUuid,
    name: instrument.instrumentName,
    description: instrument.instrumentDescription,
    annotation: instrument.instrumentAnnotation,
  }), []);

  // マスタデータの状態管理
  const [creators, setCreators] = useState<DocumentTagData[]>([]);
  const [vendors, setVendors] = useState<DocumentTagData[]>([]);
  const [owners, setOwners] = useState<DocumentTagData[]>([]);
  const [instruments, setInstruments] = useState<DocumentTagData[]>([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);

  // 画面上で現在設定されているVendor/Instrumentのstate（vendorIds/instrumentIds算出に使用）
  const [currentVendors, setCurrentVendors] = useState<DocumentTagData[]>([]);
  const [currentInstruments, setCurrentInstruments] = useState<DocumentTagData[]>([]);

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
    if (data.creators) data.creators.forEach((c: DocumentTagData) => c.id && ids.push(c.id));
    if (data.vendors) data.vendors.forEach((v: DocumentTagData) => v.id && ids.push(v.id));
    if (data.owners) data.owners.forEach((o: DocumentTagData) => o.id && ids.push(o.id));
    if (data.instruments) data.instruments.forEach((i: DocumentTagData) => i.id && ids.push(i.id));
    
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`❌ Duplicate IDs found: ${duplicateIds.join(', ')}`);
    }
    
    return errors;
  }, []);


  // マスタデータの取得
  useEffect(() => {
    const loadMasterData = async () => {
      if (!open) return;
      
      setIsLoadingMasters(true);
      try {
        const [creatorsData, vendorsData, instrumentsData] = await Promise.all([
          fetchMasters('creator') as Promise<CreatorRecord[]>,
          fetchMasters('vendor') as Promise<VendorRecord[]>,
          fetchMasters('instrument') as Promise<InstrumentRecord[]>,
        ]);
        
        setCreators(creatorsData.map(convertCreatorToDocumentTag));
        setVendors(vendorsData.map(convertVendorToDocumentTag));
        setOwners([]); // ownerマスタは保留
        setInstruments(instrumentsData.map(convertInstrumentToDocumentTag));
        
        console.log('✅ [DocumentEditDialog] マスタデータ取得完了', {
          creators: creatorsData.length,
          vendors: vendorsData.length,
          instruments: instrumentsData.length,
        });
      } catch (error) {
        console.error('❌ [DocumentEditDialog] マスタデータ取得エラー:', error);
        message.error('マスタデータの取得に失敗しました');
      } finally {
        setIsLoadingMasters(false);
      }
    };
    
    loadMasterData();
  }, [open, convertCreatorToDocumentTag, convertVendorToDocumentTag, convertInstrumentToDocumentTag]);
  /**
   * ダイアログ開閉時のフォーム初期化
   * 注: PetriNetEditorInnerから初期化済みのdocumentDataが渡されるため、
   * DocumentEditDialog側での初期化は不要
   */
  useEffect(() => {
    if (open && documentData) {
      // stateリセット
      setHasChanges(false);
      setValidationErrors([]);
      
      // フォーム初期化（PetriNetEditorInnerから渡されたデータを使用）
      form.setFieldsValue({
        ...documentData,
        date: documentData.date ? dayjs(documentData.date) : dayjs(),
        signatureEnabled: documentData.signatureEnabled || false,
      });

      // 現在のVendor/Instrumentをstateに初期化（vendorIds/instrumentIds算出用）
      setCurrentVendors(documentData.vendors || []);
      setCurrentInstruments(documentData.instruments || []);
    }
  }, [open, documentData, form]);

  /**
   * UUID一括生成
   */
  const handleAutoGenerateUUIDs = useCallback(() => {
    const values = form.getFieldsValue(true);
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
  const handleMultiObjectDataChange = useCallback((objectKey: 'creators' | 'vendors' | 'owners' | 'instruments', objectsArray: DocumentTagData[]) => {
    form.setFieldsValue({ [objectKey]: objectsArray });

    // Vendor/Instrumentが変更された場合はstateも更新（vendorIds/instrumentIds算出用）
    if (objectKey === 'vendors') {
      setCurrentVendors(objectsArray);
    }
    if (objectKey === 'instruments') {
      setCurrentInstruments(objectsArray);
    }

    setHasChanges(true);
    
    // バリデーション
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    validationTimeoutRef.current = setTimeout(() => {
      const values = form.getFieldsValue(true);
      const errors = validateDocumentData(values);
      setValidationErrors(errors);
    }, 500);
  }, [form, validateDocumentData]);

  /**
   * VendorとInstrumentのIDリスト算出
   * currentVendors/currentInstruments stateに依存することで、
   * 画面上での追加・削除時に正しく再計算される
   */
  const vendorIds = useMemo(() => {
    return currentVendors.map((v) => v.id).filter(Boolean) as string[];
  }, [currentVendors]);

  const instrumentIds = useMemo(() => {
    return currentInstruments.map((i) => i.id).filter(Boolean) as string[];
  }, [currentInstruments]);

  /**
   * フォーム変更ハンドラー
   */
  const handleFormChange = useCallback(() => {
    setHasChanges(true);

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      const values = form.getFieldsValue(true);
      const errors = validateDocumentData(values);
      setValidationErrors(errors);
    }, 500);
  }, [form, validateDocumentData]);

  /**
   * 保存処理
   */
  const handleSave = useCallback(async () => {
    try {
      await form.validateFields();
      
      const values = form.getFieldsValue(true);

      const documentToSave: DocumentData = {
        ...values,
        date: values.date ? values.date : new Date(),
        signatureEnabled: values.signatureEnabled,
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
      title="📄 Document編集"
      open={open}
      onCancel={handleCancel}
      width={900}
      style={{ top: 20 }}
      footer={[
        <Space key="status" style={{ marginRight: 'auto' }}>
          {hasChanges && <Tag color="warning">⚠️ 未保存の変更があります</Tag>}
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
        >
          💾 Document保存
        </Button>,
      ]}
    >
      <div style={{ maxHeight: 'calc(90vh - 200px)', overflow: 'auto' }}>
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
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
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                  <Form.Item
                    label="Document ID"
                    name="id"
                    rules={[{ required: true, message: 'Document ID は必須です' }]}
                  >
                    <Input />
                  </Form.Item>

                  <Form.Item label="UUID">
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="uuid" noStyle>
                        <Input />
                      </Form.Item>
                      <Button
                        icon={<ThunderboltOutlined />}
                        onClick={() => {
                          const uuid = generateUUID();
                          form.setFieldValue('uuid', uuid);
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

                  <Space.Compact style={{ width: '100%' }}>
                    <Form.Item label="Date" name="date" noStyle>
                        <DatePicker
                          showTime
                          style={{ width: '100%' }}
                          format="YYYY-MM-DD HH:mm:ss"
                        />
                    </Form.Item>
                    <Button
                      icon={<ClockCircleOutlined />}
                      onClick={handleSetCurrentDateTime}
                      title="現在時刻を設定"
                    >
                      現在
                    </Button>
                    </Space.Compact>
                </Space>
              </Panel>

              {/* MaiML ID属性 */}
              <Panel header={<Text strong>🔑 MaiML ID属性（詳細設定）</Text>} key="maimlIds">
                <Alert
                  message="💡 MaiMLファイル内の各要素に設定されるID属性値を編集できます。"
                  type="info"
                  style={{ marginBottom: 16 }}
                />
                
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
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
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
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
            icon="⚙️"
            includeReferences={true}
            initialData={form.getFieldValue('creators') || []}
            onDataChange={handleMultiObjectDataChange}
            minItems={1}
            isExpanded={expandedSections.creators}
            onToggleExpanded={handleToggleSection}
            vendorIds={vendorIds}
            instrumentIds={instrumentIds}
            masterData={creators}
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
            masterData={vendors}
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
            masterData={owners}
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
            masterData={instruments}
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
