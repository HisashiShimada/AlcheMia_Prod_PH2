/**
 * DocumentEditDialog - PetriNet Editor用Document編集ダイアログ
 * 
 * Document（Creator、Vendor、Owner、Instrument）の編集機能を提供
 * - 複数要素登録対応（Creator、Vendor、Owner、Instrument）
 * - UUID自動生成
 * - 参照プロパティ（vendorRef、instrumentRef）対応
 * - XML署名機能（W3C XMLDSig）
 * - バリデーション機能
 * 
 * @version 4.0.0
 * @date 2025-12-23
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Button,
  Input,
  Space,
  Collapse,
  Typography,
  Alert,
  Tag,
  Checkbox,
  Row,
  Col,
  Select,
  theme
} from 'antd';
import {
  FileTextOutlined,
  ExperimentOutlined,
  ClockCircleOutlined,
  LockOutlined
} from '@ant-design/icons';
import MultiObjectEditor, { ObjectData } from './MultiObjectEditor';
import { fetchCreators, fetchVendors, fetchOwners, fetchInstruments, type MasterDataItem } from '@/utils/apiClient';

const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

/**
 * Document データの型定義
 */
export interface DocumentData {
  id: string;
  uuid?: string;
  name: string;
  description?: string;
  date: string;
  creators: ObjectData[];
  vendors: ObjectData[];
  owners: ObjectData[];
  instruments: ObjectData[];
  signature?: {
    enabled: boolean;
  };
  protocolId?: string;
  methodId?: string;
  pnmlId?: string;
  programId?: string;
  creator?: ObjectData;
  vendor?: ObjectData;
  owner?: ObjectData;
  instrument?: ObjectData;
}

/**
 * Document編集ダイアログのProps
 */
export interface DocumentEditDialogProps {
  open: boolean;
  documentData?: DocumentData;
  onClose: () => void;
  onSave: (data: DocumentData) => void;
}

/**
 * Document編集ダイアログコンポーネント
 */
const DocumentEditDialog: React.FC<DocumentEditDialogProps> = ({
  open,
  documentData,
  onClose,
  onSave,
}) => {
  const { token } = theme.useToken();
  
  // 新規作成判定: documentDataのnameがdocument.nameと一致するか、IDがdocumentIDの場合
  const isNewDocument = !documentData || 
                        documentData.name === 'document' || 
                        documentData.id === 'documentID';
  
  // マスタデータの状態管理
  const [creators, setCreators] = useState<MasterDataItem[]>([]);
  const [vendors, setVendors] = useState<MasterDataItem[]>([]);
  const [owners, setOwners] = useState<MasterDataItem[]>([]);
  const [instruments, setInstruments] = useState<MasterDataItem[]>([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);

  /**
   * 単一オブジェクトを配列に正規化（後方互換性）
   */
  const normalizeDocumentData = useCallback((data?: DocumentData): DocumentData => {
    if (!data) return getInitialDocumentData();
    
    return {
      ...data,
      // MaiML ID属性を保持（undefinedの場合はデフォルト値を使用）
      protocolId: data.protocolId || 'protocolID',
      methodId: data.methodId || 'methodID',
      pnmlId: data.pnmlId || 'pnmlID',
      programId: data.programId || 'programID',
      // 空配列をデフォルトに変更（マスタから追加する前提）
      creators: Array.isArray(data.creators) ? data.creators : 
                data.creator ? [data.creator] : [],
      vendors: Array.isArray(data.vendors) ? data.vendors :
               data.vendor ? [data.vendor] : [],
      owners: Array.isArray(data.owners) ? data.owners :
              data.owner ? [data.owner] : [],
      instruments: Array.isArray(data.instruments) ? data.instruments :
                   data.instrument ? [data.instrument] : [],
      signature: data.signature || { enabled: false }
    };
  }, []);

  // Document初期データ構造（配列対応版）
  const getInitialDocumentData = (): DocumentData => ({
    id: 'documentID',
    uuid: '',
    name: 'document',
    description: '',
    date: new Date().toISOString(),
    protocolId: 'protocolID',
    methodId: 'methodID',
    pnmlId: 'pnmlID',
    programId: 'programID',
    creators: [],  // 空配列（マスタから追加）
    vendors: [],   // 空配列（マスタから追加）
    owners: [],    // 空配列（マスタから追加）
    instruments: [],
    signature: {
      enabled: false
    }
  });

  const [editingDocument, setEditingDocument] = useState<DocumentData>(getInitialDocumentData());
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic']);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // マスタデータの取得
  useEffect(() => {
    const loadMasterData = async () => {
      if (!open) return;
      
      setIsLoadingMasters(true);
      try {
        const [creatorsResponse, vendorsResponse, ownersResponse, instrumentsResponse] = await Promise.all([
          fetchCreators(),
          fetchVendors(),
          fetchOwners(),
          fetchInstruments(),
        ]);
        
        if (creatorsResponse.success) {
          setCreators(creatorsResponse.data.items);
        }
        
        if (vendorsResponse.success) {
          setVendors(vendorsResponse.data.items);
        }
        
        if (ownersResponse.success) {
          setOwners(ownersResponse.data.items);
        }
        
        if (instrumentsResponse.success) {
          setInstruments(instrumentsResponse.data.items);
        }
        
        console.log('✅ [DocumentEditDialog] マスタデータ取得完了');
      } catch (error) {
        console.error('❌ [DocumentEditDialog] マスタデータ取得エラー:', error);
      } finally {
        setIsLoadingMasters(false);
      }
    };
    
    loadMasterData();
  }, [open]);

  // documentDataが変更された時の初期化
  useEffect(() => {
    if (open) {
      if (documentData) {
        // documentDataが渡されている場合は、それを使用
        const normalizedData = normalizeDocumentData(documentData);
        
        console.log('📄 [DocumentEditDialog] documentData受領:', {
          id: normalizedData.id,
          name: normalizedData.name,
          protocolId: normalizedData.protocolId,
          methodId: normalizedData.methodId,
          pnmlId: normalizedData.pnmlId,
          programId: normalizedData.programId,
        });
        
        setEditingDocument(normalizedData);
      } else {
        // documentDataがない場合はデフォルト値を使用
        const newData = getInitialDocumentData();
        console.log('📄 [DocumentEditDialog] デフォルトdocumentData使用');
        setEditingDocument(newData);
      }
      setHasChanges(false);
      setValidationErrors([]);
      setExpandedSections(['basic']);
    }
  }, [documentData, open, normalizeDocumentData, isNewDocument]);

  // UUID v4生成関数
  const generateUUID = useCallback((): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }, []);

  // Document データバリデーション（配列対応版）
  const validateDocumentData = useMemo(() => (data: DocumentData): string[] => {
    const errors: string[] = [];
    
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
    if (data.creators) data.creators.forEach(c => c.id && ids.push(c.id));
    if (data.vendors) data.vendors.forEach(v => v.id && ids.push(v.id));
    if (data.owners) data.owners.forEach(o => o.id && ids.push(o.id));
    if (data.instruments) data.instruments.forEach(i => i.id && ids.push(i.id));
    
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`❌ Duplicate IDs found: ${duplicateIds.join(', ')}`);
    }
    
    return errors;
  }, []);

  // セクション展開切り替え
  const handleToggleSection = useCallback((sectionKeys: string | string[]) => {
    setExpandedSections(Array.isArray(sectionKeys) ? sectionKeys : [sectionKeys]);
  }, []);

  // 基本プロパティ更新
  const handleBasicPropertyUpdate = useCallback((property: string, value: string) => {
    setEditingDocument(prev => ({
      ...prev,
      [property]: value
    }));
    setHasChanges(true);

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    validationTimeoutRef.current = setTimeout(() => {
      const updatedDocument = { ...editingDocument, [property]: value };
      setValidationErrors(validateDocumentData(updatedDocument));
    }, 500);
  }, [editingDocument, validateDocumentData]);

  // 複数オブジェクト用データ変更ハンドラー
  const handleMultiObjectDataChange = useCallback((objectKey: string, objectsArray: ObjectData[]) => {
    setEditingDocument(prev => ({
      ...prev,
      [objectKey]: objectsArray
    }));
    setHasChanges(true);
  }, []);

  // XML署名有効化トグル
  const handleSignatureToggle = useCallback((checked: boolean) => {
    setEditingDocument(prev => ({
      ...prev,
      signature: {
        ...prev.signature,
        enabled: checked
      }
    }));
    setHasChanges(true);
  }, []);

  // UUIDを各要素に自動設定（配列対応版）
  const autoGenerateUUIDs = useCallback(() => {
    setEditingDocument(prev => {
      const newData = { ...prev };
      
      if (!newData.uuid) {
        newData.uuid = generateUUID();
      }
      
      // 配列内の各要素にUUID設定
      ['creators', 'vendors', 'owners', 'instruments'].forEach(key => {
        const arrayKey = key as keyof DocumentData;
        if (newData[arrayKey] && Array.isArray(newData[arrayKey])) {
          (newData[arrayKey] as ObjectData[]) = (newData[arrayKey] as ObjectData[]).map(item => ({
            ...item,
            uuid: item.uuid || generateUUID()
          }));
        }
      });
      
      setHasChanges(true);
      return newData;
    });
  }, [generateUUID]);

  // 現在時刻設定
  const setCurrentDateTime = useCallback(() => {
    const currentTime = new Date().toISOString();
    handleBasicPropertyUpdate('date', currentTime);
  }, [handleBasicPropertyUpdate]);

  // 保存処理
  const handleSave = useCallback(() => {
    const errors = validateDocumentData(editingDocument);
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      return;
    }
    
    console.log('💾 [DocumentEditDialog] 保存するdocumentData:', {
      vendors: editingDocument.vendors,
      instruments: editingDocument.instruments,
      creators: editingDocument.creators
    });
    
    onSave(editingDocument);
    onClose();
  }, [editingDocument, validateDocumentData, onSave, onClose]);

  // キャンセル処理
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      Modal.confirm({
        title: '未保存の変更',
        content: '❌ 未保存の変更があります。破棄しますか？',
        okText: '破棄',
        okType: 'danger',
        cancelText: 'キャンセル',
        onOk: onClose
      });
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // クリーンアップ
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
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <FileTextOutlined style={{ color: isNewDocument ? token.colorSuccess : token.colorError }} />
            <Text strong style={{ color: isNewDocument ? token.colorSuccess : token.colorError }}>
              📄 Document編集 {isNewDocument && '（新規作成）'}
            </Text>
          </Space>
          <Button
            icon={<ExperimentOutlined />}
            onClick={autoGenerateUUIDs}
            size="small"
          >
            UUID一括生成
          </Button>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      closable={false}
      width={900}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(90vh - 140px)',
          overflowY: 'auto'
        }
      }}
      footer={[
        <Space key="footer-info" style={{ flex: 1 }}>
          {hasChanges && (
            <Tag color="warning">⚠️ 未保存の変更があります</Tag>
          )}
          {isNewDocument && !hasChanges && (
            <Tag color="success">🆕 新規Document作成モード</Tag>
          )}
        </Space>,
        <Button key="cancel" onClick={handleCancel}>
          キャンセル
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          disabled={validationErrors.length > 0}
          danger={!isNewDocument}
        >
          💾 Document保存
        </Button>
      ]}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* バリデーションエラー表示 */}
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

        {/* 新規作成モード表示 */}
        {isNewDocument && (
          <Alert
            message="🆕 新規Document作成モード"
            description="必要最小限の情報から開始します。参照プロパティは必要に応じて追加できます。"
            type="success"
            showIcon
          />
        )}

        {/* アコーディオンセクション */}
        <Collapse
          activeKey={expandedSections}
          onChange={handleToggleSection}
        >
          {/* 基本プロパティセクション */}
          <Panel header={<Text strong>📄 基本プロパティ</Text>} key="basic">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">Document ID *</Text>
                  <Input
                    value={editingDocument.id || ''}
                    onChange={(e) => handleBasicPropertyUpdate('id', e.target.value)}
                    size="small"
                  />
                </Col>
                <Col span={12}>
                  <Text type="secondary">UUID</Text>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={editingDocument.uuid || ''}
                      onChange={(e) => handleBasicPropertyUpdate('uuid', e.target.value)}
                      size="small"
                    />
                    <Button
                      icon={<ExperimentOutlined />}
                      onClick={() => handleBasicPropertyUpdate('uuid', generateUUID())}
                      size="small"
                      title="UUID生成"
                    />
                  </Space.Compact>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">Name *</Text>
                  <Input
                    value={editingDocument.name || ''}
                    onChange={(e) => handleBasicPropertyUpdate('name', e.target.value)}
                    size="small"
                    disabled={!isNewDocument && !!documentData}
                  />
                </Col>
                <Col span={12}>
                  <Text type="secondary">Description</Text>
                  <Input
                    value={editingDocument.description || ''}
                    onChange={(e) => handleBasicPropertyUpdate('description', e.target.value)}
                    size="small"
                  />
                </Col>
              </Row>

              <div>
                <Text type="secondary">Date</Text>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    type="datetime-local"
                    value={editingDocument.date ? editingDocument.date.slice(0, 16) : ''}
                    onChange={(e) => handleBasicPropertyUpdate('date', e.target.value + ':00.000Z')}
                    size="small"
                  />
                  <Button
                    icon={<ClockCircleOutlined />}
                    onClick={setCurrentDateTime}
                    size="small"
                    title="現在日時を設定"
                  />
                </Space.Compact>
              </div>
            </Space>
          </Panel>

          {/* MaiML ID属性セクション */}
          <Panel header={<Text strong>🔑 MaiML ID属性（詳細設定）</Text>} key="maimlIds">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Alert
                message="💡 MaiMLファイル内の各要素に設定されるID属性値を編集できます。新規作成時は自動生成された値が設定されています。"
                type="info"
              />

              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">Protocol ID</Text>
                  <Input
                    value={String(editingDocument.protocolId || 'protocolID')}
                    onChange={(e) => handleBasicPropertyUpdate('protocolId', e.target.value)}
                    size="small"
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    &lt;protocol id='...'&gt; 要素のID属性
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Method ID</Text>
                  <Input
                    value={String(editingDocument.methodId || 'methodID')}
                    onChange={(e) => handleBasicPropertyUpdate('methodId', e.target.value)}
                    size="small"
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    &lt;method id='...'&gt; 要素のID属性
                  </Text>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">PNML ID</Text>
                  <Input
                    value={String(editingDocument.pnmlId || 'pnmlID')}
                    onChange={(e) => handleBasicPropertyUpdate('pnmlId', e.target.value)}
                    size="small"
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    &lt;pnml id='...'&gt; 要素のID属性
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Program ID</Text>
                  <Input
                    value={String(editingDocument.programId || 'programID')}
                    onChange={(e) => handleBasicPropertyUpdate('programId', e.target.value)}
                    size="small"
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    &lt;program id='...'&gt; 要素のID属性
                  </Text>
                </Col>
              </Row>

              <Alert
                message="⚠️ ID値は英数字、アンダースコア(_)、ハイフン(-)のみ使用可能です。最大64文字まで設定できます。"
                type="warning"
              />
            </Space>
          </Panel>

          {/* XML署名セクション */}
          <Panel
            header={
              <Space>
                <LockOutlined />
                <Text strong>🔒 XML署名（改ざん防止）</Text>
                {editingDocument.signature?.enabled && (
                  <Tag color="success">有効</Tag>
                )}
              </Space>
            }
            key="signature"
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Alert
                message="📋 XML署名機能について"
                description="W3C XMLDSig仕様に基づくXML署名を追加します。MaiML保存時にSHA-256ハッシュを計算し、document要素内にSignature要素を挿入します。これにより、ファイルの改ざんを検出できます。"
                type="info"
              />

              <Checkbox
                checked={editingDocument.signature?.enabled || false}
                onChange={(e) => handleSignatureToggle(e.target.checked)}
              >
                改ざん防止のためのXML署名を行う
              </Checkbox>

              {editingDocument.signature?.enabled && (
                <div
                  style={{
                    padding: token.padding,
                    backgroundColor: token.colorBgContainer,
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorBorder}`
                  }}
                >
                  <Text strong>📝 署名情報プレビュー</Text>
                  <pre style={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', marginTop: 8 }}>
{`<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  <SignedInfo>
    <CanonicalizationMethod Algorithm="..."/>
    <SignatureMethod Algorithm="...#dsa-sha256"/>
    <Reference URI="">
      <Transforms>
        <Transform Algorithm=".../enveloped-signature"/>
      </Transforms>
      <DigestMethod Algorithm=".../sha256"/>
      <DigestValue>[SHA-256ハッシュ値]</DigestValue>
    </Reference>
  </SignedInfo>
</Signature>`}
                  </pre>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                    💡 実際のハッシュ値はMaiML保存時に自動計算されます
                  </Text>
                </div>
              )}
            </Space>
          </Panel>
        </Collapse>

        {/* MultiObjectEditorセクション */}
        <MultiObjectEditor
          objectKey="creators"
          title="Creator"
          icon="👤"
          includeReferences={true}
          initialData={editingDocument.creators || []}
          onDataChange={handleMultiObjectDataChange}
          minItems={1}
          isExpanded={expandedSections.includes('creators')}
          onToggleExpanded={(key) => {
            setExpandedSections(prev => 
              prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
            );
          }}
          vendorIds={editingDocument.vendors?.map(v => v.id) || []}
          instrumentIds={editingDocument.instruments?.map(i => i.id) || []}
          masterData={creators}
          isLoadingMasterData={isLoadingMasters}
        />

        <MultiObjectEditor
          objectKey="vendors"
          title="Vendor"
          icon="🏢"
          includeReferences={false}
          initialData={editingDocument.vendors || []}
          onDataChange={handleMultiObjectDataChange}
          minItems={1}
          isExpanded={expandedSections.includes('vendors')}
          onToggleExpanded={(key) => {
            setExpandedSections(prev => 
              prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
            );
          }}
          masterData={vendors}
          isLoadingMasterData={isLoadingMasters}
        />

        <MultiObjectEditor
          objectKey="owners"
          title="Owner"
          icon="👥"
          includeReferences={false}
          initialData={editingDocument.owners || []}
          onDataChange={handleMultiObjectDataChange}
          minItems={1}
          isExpanded={expandedSections.includes('owners')}
          onToggleExpanded={(key) => {
            setExpandedSections(prev => 
              prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
            );
          }}
          masterData={owners}
          isLoadingMasterData={isLoadingMasters}
        />

        <MultiObjectEditor
          objectKey="instruments"
          title="Instrument"
          icon="🔬"
          includeReferences={false}
          initialData={editingDocument.instruments || []}
          onDataChange={handleMultiObjectDataChange}
          minItems={0}
          isExpanded={expandedSections.includes('instruments')}
          onToggleExpanded={(key) => {
            setExpandedSections(prev => 
              prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
            );
          }}
          masterData={instruments}
          isLoadingMasterData={isLoadingMasters}
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
    </Modal>
  );
};

export default DocumentEditDialog;
