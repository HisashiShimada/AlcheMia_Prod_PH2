/**
 * TemplateEditorDialog - Template編集ダイアログ（EditorV2用）
 * 
 * Material-UI → Ant Design変換版
 * Phase 2-1: NestedPropertyEditor実装完了
 * 
 * @version 2.1.0
 * @date 2026-01-30
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Input,
  Form,
  Alert,
  Space,
  Typography,
  Select,
  TreeSelect,
  Divider,
  Tag,
  message,
  Collapse,
} from 'antd';
import {
  SaveOutlined,
  ThunderboltOutlined,
  CloseOutlined,
  ExperimentOutlined,
  SettingOutlined,
  BarChartOutlined,
  PlusOutlined,
  DeleteOutlined,
  DownOutlined,
  RightOutlined,
  CopyOutlined,
  DownloadOutlined,
  FileSearchOutlined,
  FolderOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { xml2js, ElementCompact } from 'xml-js';
import { fetchTemplateFiles, fetchTemplateContent, type TemplateFile } from '@/api/templateApi';
import type { 
  NodeData, 
  ValidationError,
} from '../../../types/editor';
import { TemplateError } from './TemplateViewer/TemplateItem';
import { Template, Insertion, Property, PropertyCustomElement, PlaceRef, Content } from '@/types/maiml-unified';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/**
 * MaiMLスキーマで定義されているpropertyタイプ一覧
 * @see specification/MaiML-Schema-1_0/maiml-property.xsd
 */
const MAIML_PROPERTY_TYPES = [
  // Simple Types
  { value: 'stringType', label: 'stringType - 文字列', category: 'Simple' },
  { value: 'tokenType', label: 'tokenType - トークン', category: 'Simple' },
  { value: 'idType', label: 'idType - ID', category: 'Simple' },
  { value: 'idRefType', label: 'idRefType - ID参照', category: 'Simple' },
  { value: 'qualifiedNameType', label: 'qualifiedNameType - 修飾名', category: 'Simple' },
  { value: 'dateTimeType', label: 'dateTimeType - 日時', category: 'Simple' },
  { value: 'decimalType', label: 'decimalType - 10進数', category: 'Simple' },
  { value: 'doubleType', label: 'doubleType - 倍精度実数', category: 'Simple' },
  { value: 'floatType', label: 'floatType - 単精度実数', category: 'Simple' },
  { value: 'intType', label: 'intType - 整数', category: 'Simple' },
  { value: 'longType', label: 'longType - 長整数', category: 'Simple' },
  { value: 'shortType', label: 'shortType - 短整数', category: 'Simple' },
  { value: 'byteType', label: 'byteType - バイト', category: 'Simple' },
  { value: 'unsignedIntType', label: 'unsignedIntType - 符号なし整数', category: 'Simple' },
  { value: 'unsignedLongType', label: 'unsignedLongType - 符号なし長整数', category: 'Simple' },
  { value: 'unsignedShortType', label: 'unsignedShortType - 符号なし短整数', category: 'Simple' },
  { value: 'unsignedByteType', label: 'unsignedByteType - 符号なしバイト', category: 'Simple' },
  { value: 'booleanType', label: 'booleanType - 真偽値', category: 'Simple' },
  { value: 'base64BinaryType', label: 'base64BinaryType - Base64バイナリ', category: 'Simple' },
  { value: 'hexBinaryType', label: 'hexBinaryType - 16進バイナリ', category: 'Simple' },
  { value: 'uriType', label: 'uriType - URI', category: 'Simple' },
  { value: 'uuidType', label: 'uuidType - UUID', category: 'Simple' },
  { value: 'languageType', label: 'languageType - 言語', category: 'Simple' },
  
  // List Types
  { value: 'propertyListType', label: 'propertyListType - プロパティリスト（子要素を持つ）', category: 'List' },
  { value: 'stringListType', label: 'stringListType - 文字列リスト', category: 'List' },
  { value: 'idRefListType', label: 'idRefListType - ID参照リスト', category: 'List' },
  { value: 'qualifiedNameListType', label: 'qualifiedNameListType - 修飾名リスト', category: 'List' },
  { value: 'dateTimeListType', label: 'dateTimeListType - 日時リスト', category: 'List' },
  { value: 'decimalListType', label: 'decimalListType - 10進数リスト', category: 'List' },
  { value: 'doubleListType', label: 'doubleListType - 倍精度実数リスト', category: 'List' },
  { value: 'floatListType', label: 'floatListType - 単精度実数リスト', category: 'List' },
  { value: 'intListType', label: 'intListType - 整数リスト', category: 'List' },
  { value: 'longListType', label: 'longListType - 長整数リスト', category: 'List' },
  { value: 'shortListType', label: 'shortListType - 短整数リスト', category: 'List' },
  { value: 'byteListType', label: 'byteListType - バイトリスト', category: 'List' },
  { value: 'unsignedIntListType', label: 'unsignedIntListType - 符号なし整数リスト', category: 'List' },
  { value: 'unsignedLongListType', label: 'unsignedLongListType - 符号なし長整数リスト', category: 'List' },
  { value: 'unsignedShortListType', label: 'unsignedShortListType - 符号なし短整数リスト', category: 'List' },
  { value: 'unsignedByteListType', label: 'unsignedByteListType - 符号なしバイトリスト', category: 'List' },
  { value: 'booleanListType', label: 'booleanListType - 真偽値リスト', category: 'List' },
  { value: 'base64BinaryListType', label: 'base64BinaryListType - Base64バイナリリスト', category: 'List' },
  { value: 'hexBinaryListType', label: 'hexBinaryListType - 16進バイナリリスト', category: 'List' },
  { value: 'uriListType', label: 'uriListType - URIリスト', category: 'List' },
  { value: 'uuidListType', label: 'uuidListType - UUIDリスト', category: 'List' },
  { value: 'languageListType', label: 'languageListType - 言語リスト', category: 'List' },
  { value: 'stringEnumType', label: 'stringEnumType - 文字列列挙', category: 'List' },
];

interface TemplateEditorDialogProps {
  open: boolean;
  node: {
    id: string;
    data: NodeData;
  };
  onClose: () => void;
  onSave: (
    nodeId: string,
    templateRef: Template,
    isNewTemplate: boolean,
    templateCategory: string,
    isCommonTemplate: boolean,
    methodId: string | null
  ) => void;
  allNodes?: Array<{ id: string; data: NodeData }>;
  templateErrors?: Record<string, TemplateError[]>;
}

/**
 * PropertyData型定義（NestedPropertyEditor用）
 */
interface PropertyData {
  key: string;
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, string>;
  children: PropertyData[];
}

/**
 * NestedPropertyEditor Props
 */
interface NestedPropertyEditorProps {
  propertyData: PropertyData;
  propertyKey: string;
  level?: number;
  expandedNodes: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  onAddNestedChild: (parentKey: string, childTagName: string, specifiedKey?: string) => void;
  onAddSameLevelCopy: (sourceKey: string, sourceData: PropertyData, newKey: string, level: number) => void;
  onUpdateNestedAttribute: (propertyKey: string, attrName: string, attrValue: string) => void;
  onUpdateNestedElement: (propertyKey: string, elemName: string, elemValue: string) => void;
  onDeleteNestedAttribute: (propertyKey: string, attrName: string) => void;
  onDeleteNestedElement: (propertyKey: string, elemName: string) => void;
  onDeleteProperty: (propertyKey: string) => void;
  forceRenderKey: number;
}

/**
 * NestedPropertyEditor - ネスト構造プロパティ編集（Ant Design版）
 */
const NestedPropertyEditor: React.FC<NestedPropertyEditorProps> = ({
  propertyData,
  propertyKey,
  level = 0,
  expandedNodes,
  onToggleExpanded,
  onAddNestedChild,
  onAddSameLevelCopy,
  onUpdateNestedAttribute,
  onUpdateNestedElement,
  onDeleteNestedAttribute,
  onDeleteNestedElement,
  onDeleteProperty,
  forceRenderKey
}) => {
  const [showAttributeAddModal, setShowAttributeAddModal] = useState(false);
  const [showElementAddModal, setShowElementAddModal] = useState(false);
  const [showChildAddModal, setShowChildAddModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [newElementName, setNewElementName] = useState('');
  const [newElementValue, setNewElementValue] = useState('');
  const [newChildTagName, setNewChildTagName] = useState('property');
  const [copyKey, setCopyKey] = useState('');
  
  // ✅ Phase 2-2: カスタム属性名用State
  const [customAttributeName, setCustomAttributeName] = useState('');

  const nodeId = useMemo(() => propertyKey, [propertyKey]);
  const isExpanded = useMemo(() => expandedNodes.has(nodeId), [expandedNodes, nodeId]);

  const hasChildren = useMemo(() => {
    const children = propertyData.children;
    const parentXsiType = propertyData.attributes?.['xsi:type'] || '';
    const isParentPropertyListType = parentXsiType === 'propertyListType';
    const isValidArray = children && Array.isArray(children);
    const hasLength = isValidArray && children.length > 0;
    const hasValidChildren = hasLength && children.some(child => 
      child && typeof child === 'object' && (child.key || child.tagName)
    );
    
    return isParentPropertyListType && hasValidChildren;
  }, [propertyData.children, propertyData.attributes]);

  const hasAttributes = useMemo(() => 
    propertyData.attributes && Object.keys(propertyData.attributes).length > 0, 
    [propertyData.attributes]
  );
  
  const hasElements = useMemo(() => 
    propertyData.elements && Object.keys(propertyData.elements).length > 0, 
    [propertyData.elements]
  );

  const indentLevel = level * 12;

  return (
    <div style={{ marginLeft: `${indentLevel}px`, marginBottom: 4 }}>
      <div
        style={{
          border: `2px solid ${level === 0 ? '#1890ff' : '#d9d9d9'}`,
          borderRadius: 8,
          padding: 12,
          backgroundColor: level % 2 === 0 ? '#fafafa' : '#ffffff'
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Space>
            {hasChildren && (
              <Button
                type="text"
                size="small"
                icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                onClick={() => onToggleExpanded(nodeId)}
              />
            )}
            <Text strong>
              {propertyData.tagName || 'property'}: {propertyKey}
            </Text>
            <Tag>Level {level}</Tag>
            {propertyData.attributes?.['xsi:type'] && (
              <Tag color={propertyData.attributes['xsi:type'] === 'propertyListType' ? 'blue' : 'default'}>
                {propertyData.attributes['xsi:type']}
              </Tag>
            )}
          </Space>

          {/* 操作ボタン */}
          <Space size="small">
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setShowAttributeAddModal(true)}>
              属性
            </Button>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setShowElementAddModal(true)}>
              要素
            </Button>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setShowChildAddModal(true)}>
              子要素
            </Button>
            <Button size="small" icon={<CopyOutlined />} onClick={() => setShowCopyModal(true)}>
              コピー
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: `プロパティ「${propertyKey}」を削除しますか？`,
                  onOk: () => onDeleteProperty(propertyKey),
                });
              }}
            />
          </Space>
        </div>

        {/* 属性セクション */}
        {hasAttributes && (
          <div style={{ marginBottom: 8 }}>
            <Text type="success" strong style={{ fontSize: 12 }}>📋 属性</Text>
            {Object.entries(propertyData.attributes).map(([attrName, attrValue]) => (
              <div key={attrName} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ minWidth: 100, fontSize: 12 }}>{attrName}:</Text>
                <Input
                  size="small"
                  value={attrValue || ''}
                  onChange={(e) => onUpdateNestedAttribute(propertyKey, attrName, e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => onDeleteNestedAttribute(propertyKey, attrName)}
                />
              </div>
            ))}
          </div>
        )}

        {/* 要素セクション */}
        {hasElements && (
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" strong style={{ fontSize: 12 }}>📄 要素</Text>
            {Object.entries(propertyData.elements).map(([elemName, elemValue]) => (
              <div key={elemName} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ minWidth: 100, fontSize: 12 }}>{elemName}:</Text>
                <Input
                  size="small"
                  value={elemValue || ''}
                  onChange={(e) => onUpdateNestedElement(propertyKey, elemName, e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => onDeleteNestedElement(propertyKey, elemName)}
                />
              </div>
            ))}
          </div>
        )}

        {/* 子要素セクション */}
        {hasChildren && isExpanded && (
          <div style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: '#722ed1', fontWeight: 'bold' }}>
              🌿 子要素 ({propertyData.children?.length || 0}件)
            </Text>
            {propertyData.children.map((child, index) => {
              const childKey = child.key || `${child.tagName || 'child'}_${index}`;
              return (
                <NestedPropertyEditor
                  key={`${childKey}_${index}_${forceRenderKey}`}
                  propertyData={child}
                  propertyKey={childKey}
                  level={level + 1}
                  expandedNodes={expandedNodes}
                  onToggleExpanded={onToggleExpanded}
                  onAddNestedChild={onAddNestedChild}
                  onAddSameLevelCopy={onAddSameLevelCopy}
                  onUpdateNestedAttribute={onUpdateNestedAttribute}
                  onUpdateNestedElement={onUpdateNestedElement}
                  onDeleteNestedAttribute={onDeleteNestedAttribute}
                  onDeleteNestedElement={onDeleteNestedElement}
                  onDeleteProperty={onDeleteProperty}
                  forceRenderKey={forceRenderKey}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* モーダル群 */}
      {/* 属性追加モーダル */}
      <Modal
        title="➕ 属性追加"
        open={showAttributeAddModal}
        onCancel={() => {
          setShowAttributeAddModal(false);
          setNewAttributeName('');
          setNewAttributeValue('');
          setCustomAttributeName('');
        }}
        onOk={() => {
          // ✅ Phase 2-2: カスタム属性名対応
          const finalAttributeName = newAttributeName === '__custom__'
            ? customAttributeName.trim()
            : newAttributeName.trim();
            
          if (!finalAttributeName) {
            message.error('属性名を入力してください');
            return;
          }
          
          if (!newAttributeValue.trim()) {
            message.error('属性値を入力してください');
            return;
          }
          
          onUpdateNestedAttribute(propertyKey, finalAttributeName, newAttributeValue.trim());
          setNewAttributeName('');
          setNewAttributeValue('');
          setCustomAttributeName('');
          setShowAttributeAddModal(false);
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="属性名を選択"
            value={newAttributeName}
            onChange={(value) => {
              setNewAttributeName(value);
              if (value === 'xsi:type' && !newAttributeValue) {
                setNewAttributeValue('stringType');
              }
              if (value === '__custom__') {
                setCustomAttributeName('');
              }
            }}
          >
            <Option value="xsi:type">xsi:type (MaiML型定義)</Option>
            <Option value="units">units (単位)</Option>
            <Option value="formatString">formatString (書式文字列)</Option>
            <Option value="scaleFactor">scaleFactor (スケール係数)</Option>
            <Option value="key">key (キー)</Option>
            <Option value="id">id (ID)</Option>
            <Option value="ref">ref (参照)</Option>
            <Option value="__custom__">🔧 カスタム属性名を入力...</Option>
          </Select>

          {/* ✅ Phase 2-2: カスタム属性名入力フィールド */}
          {newAttributeName === '__custom__' && (
            <Input
              placeholder="カスタム属性名を入力（例: customField, myAttribute）"
              value={customAttributeName}
              onChange={(e) => setCustomAttributeName(e.target.value)}
            />
          )}

          {newAttributeName === 'xsi:type' ? (
            <Select
              style={{ width: '100%' }}
              placeholder="MaiML Property Type"
              value={newAttributeValue}
              onChange={setNewAttributeValue}
            >
              <Option disabled>--- Simple Types ---</Option>
              {MAIML_PROPERTY_TYPES.filter(t => t.category === 'Simple').map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
              <Option disabled>--- List Types ---</Option>
              {MAIML_PROPERTY_TYPES.filter(t => t.category === 'List').map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          ) : (
            <Input
              placeholder="属性値を入力"
              value={newAttributeValue}
              onChange={(e) => setNewAttributeValue(e.target.value)}
            />
          )}
        </Space>
      </Modal>

      {/* 要素追加モーダル */}
      <Modal
        title="➕ 要素追加"
        open={showElementAddModal}
        onCancel={() => setShowElementAddModal(false)}
        onOk={() => {
          if (newElementName.trim() && newElementValue.trim()) {
            onUpdateNestedElement(propertyKey, newElementName.trim(), newElementValue.trim());
            setNewElementName('');
            setNewElementValue('');
            setShowElementAddModal(false);
          }
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="要素名（例: value, description）"
            value={newElementName}
            onChange={(e) => setNewElementName(e.target.value)}
          />
          <TextArea
            rows={3}
            placeholder="要素値を入力"
            value={newElementValue}
            onChange={(e) => setNewElementValue(e.target.value)}
          />
        </Space>
      </Modal>

      {/* 子要素追加モーダル */}
      <Modal
        title="➕ 子要素追加"
        open={showChildAddModal}
        onCancel={() => {
          setShowChildAddModal(false);
          setCopyKey('');
          setNewChildTagName('property');
        }}
        onOk={() => {
          if (copyKey.trim() && newChildTagName.trim()) {
            onAddNestedChild(propertyKey, newChildTagName.trim(), copyKey.trim());
            setCopyKey('');
            setNewChildTagName('property');
            setShowChildAddModal(false);
          }
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message={`親要素: ${propertyKey} | 現在の子要素数: ${propertyData.children?.length || 0}件`}
            type="info"
          />
          <Input
            placeholder="要素キー（必須）"
            value={copyKey}
            onChange={(e) => setCopyKey(e.target.value)}
          />
          <Select
            style={{ width: '100%' }}
            placeholder="タグ名を選択"
            value={newChildTagName}
            onChange={setNewChildTagName}
          >
            <Option value="property">property</Option>
            <Option value="content">content</Option>
            <Option value="parameter">parameter</Option>
          </Select>
        </Space>
      </Modal>

      {/* 同階層コピーモーダル */}
      <Modal
        title="📋 同階層コピー"
        open={showCopyModal}
        onCancel={() => setShowCopyModal(false)}
        onOk={() => {
          if (copyKey.trim()) {
            onAddSameLevelCopy(propertyKey, propertyData, copyKey.trim(), level);
            setCopyKey('');
            setShowCopyModal(false);
          }
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert message={`コピー元: ${propertyKey}`} type="info" />
          <Input
            placeholder={`新しいキー名（例: ${propertyKey}_copy）`}
            value={copyKey}
            onChange={(e) => setCopyKey(e.target.value)}
          />
        </Space>
      </Modal>
    </div>
  );
};

/**
 * TemplateEditorDialog - メインコンポーネント
 */
const TemplateEditorDialog: React.FC<TemplateEditorDialogProps> = ({
  open,
  node,
  onClose,
  onSave,
  allNodes = [],
  templateErrors = {},
}) => {
  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);

  // 基本情報State
  const [templateId, setTemplateId] = useState('');
  const [uuid, setUuid] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [placeRefs, setPlaceRefs] = useState<PlaceRef[]>([]);
  
  // Insertion State (MaterialTemplate・ResultTemplateのみ)
  const [insertion, setInsertion] = useState<Insertion>({ uri: '', hash: { method: '', value: ''}, format: '' });

  // ✅ Phase 2-1: NestedPropertyEditor用State
  const [properties, setProperties] = useState<Record<string, PropertyData>>({});
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPropertyKey, setNewPropertyKey] = useState('');
  const [newPropertyTagName, setNewPropertyTagName] = useState('property');
  const [forceRenderKey, setForceRenderKey] = useState(0);

  // ✅ Phase 1-1: Place References編集用State
  const [showPlaceRefAddDialog, setShowPlaceRefAddDialog] = useState(false);

  // ✅ Phase 2-2: 名前空間取り込み用State
  const [showNamespaceImportModal, setShowNamespaceImportModal] = useState(false);
  const [templateFiles, setTemplateFiles] = useState<TemplateFile[]>([]);
  const [selectedTemplateFile, setSelectedTemplateFile] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [importedNamespaces, setImportedNamespaces] = useState<string[]>([]);

  // ✅ Phase 3: 高度な名前空間取り込みUI用State
  const [previewContent, setPreviewContent] = useState<{
    xml?: string;
    properties?: Record<string, PropertyData>;
    error?: string;
  }>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [duplicateKeys, setDuplicateKeys] = useState<string[]>([]);

  // ✅ Phase 4: バリデーション用State
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  /**
   * テンプレートタイプ判定
   */
  const nodeCategory = useMemo(() => {
    if (!node) return '';
    return node.data.placeType;
  }, [node]);

  /**
   * テンプレートアイコン
   */
  const templateIcon = useMemo(() => {
    if (!node) return <ExperimentOutlined />;
    return node.data.placeType === 'material' ? <ExperimentOutlined /> :
           node.data.placeType === 'condition' ? <SettingOutlined /> :
           <BarChartOutlined />;
  }, [node]);

  /**
   * マージされたテンプレートデータ
   */
  const mergedTemplate: Template | null = useMemo((): Template | null => {
    if (!node) return null;
    
    const template = (node.data.template || {}) as Partial<Template>;
    const templateRef = (node.data.templateRef || {}) as Partial<Template>;
    
    return {
      id: template.id || templateRef.id || '',
      uuid: template.uuid || templateRef.uuid || '',
      name: template.name || templateRef.name || '',
      description: template.description || templateRef.description,
      category: template.category || templateRef.category || '',
      properties: template.properties || templateRef.properties || [],
      contents: template.contents || templateRef.contents || [],
      insertion: template.insertion || templateRef.insertion,
      placeRefs: template.placeRefs || templateRef.placeRefs || [],
      templateRef: template.templateRef,
    };
  }, [node]);

  /**
   * ✅ Phase 2-1: 継承元テンプレートの計算
   */
  const inheritedTemplate = useMemo((): Template | null => {
    if (!mergedTemplate?.templateRef) {
      return null;
    }
    
    // templateRefsから親テンプレートIDを取得（配列または文字列に対応）
    const parentTemplateId = mergedTemplate.templateRef.ref;
    
    if (!parentTemplateId || typeof parentTemplateId !== 'string') {
      return null;
    }
    
    // window.clineAllTemplatesから検索
    if (window.clineAllTemplates) {
      const category = node.data.placeType === 'material' ? 'material' :
                       node.data.placeType === 'condition' ? 'condition' : 'result';
      const templates = window.clineAllTemplates[category];
      
      if (templates.length > 0) {
        const found = templates.find((t: Template) => 
          t.id === parentTemplateId
        );
        if (found) return found as Template;
      }
    }
    
    // allNodesから検索（フォールバック）
    const parentNode = allNodes.find(n => 
      n.id === parentTemplateId || 
      n.data?.template?.id === parentTemplateId ||
      n.data?.templateRef?.id === parentTemplateId
    );
    
    if (parentNode) {
      return (parentNode.data.template || parentNode.data.templateRef) as Template;
    }
    
    return null;
  }, [mergedTemplate, allNodes, node]);

  /**
   * MaiMLParser形式からNestedPropertyEditor形式への変換（配列版）
   */
  const convertPropertiesArrayToNestedFormat = (propertiesArray: Property[]): Record<string, PropertyData> => {
    const result: Record<string, PropertyData> = {};
    
    propertiesArray.forEach((item) => {
      const prop = item;
      const key = (prop.key as string) ||`prop_${Date.now()}`;
      
      const attributes: Record<string, string> = {
        'xsi:type': (prop.xsiType as string) || 'stringType'
      };
      
      if (prop.units !== undefined && prop.units !== '') {
        attributes.units = prop.units as string;
      }
      if (prop.formatString !== undefined && prop.formatString !== '') {
        attributes.formatString = prop.formatString as string;
      }
      if (prop.scaleFactor !== undefined) {
        attributes.scaleFactor = String(prop.scaleFactor);
      }
      
      result[key] = {
        key: key,
        tagName: 'property',
        attributes: attributes,
        elements: {},
        children: []
      };
      
      if (prop.value !== undefined && prop.value !== null && prop.value !== '') {
        result[key].elements.value = String(prop.value);
      }
      
      if (prop.description !== undefined && prop.description !== null && prop.description !== '') {
        result[key].elements.description = String(prop.description);
      }
      
      // customElementsの変換（PropertyCustomElement → elements）
      if (prop.customElements && typeof prop.customElements === 'object') {
        Object.entries(prop.customElements).forEach(([elemName, elemValue]) => {
          // PropertyCustomElementは複雑な構造を持つ可能性があるため、
          // valueプロパティがあればそれを使用、なければ全体をJSON文字列化
          if (elemValue && typeof elemValue === 'object' && 'value' in elemValue) {
            result[key].elements[elemName] = String(elemValue.value);
          } else if (elemValue !== undefined && elemValue !== null) {
            result[key].elements[elemName] = String(elemValue);
          }
        });
      }
      
      // 子要素の変換（properties, contentsの順）
      const childrenData: PropertyData[] = [];
      
      // 子プロパティの変換
      if (prop.properties && Array.isArray(prop.properties) && prop.properties.length > 0) {
        childrenData.push(...convertPropertiesArrayToNestedFormatRecursive(prop.properties));
      }
      
      // 子コンテンツの変換
      if (prop.contents && Array.isArray(prop.contents) && prop.contents.length > 0) {
        childrenData.push(...convertContentsArrayToNestedFormatRecursive(prop.contents));
      }
      
      // 子要素がある場合は設定
      if (childrenData.length > 0) {
        result[key].children = childrenData;
        // 子要素がある場合、xsi:typeが未設定ならpropertyListTypeに設定
        if (!result[key].attributes['xsi:type']) {
          result[key].attributes['xsi:type'] = 'propertyListType';
        }
      }
    });
    
    return result;
  };

  /**
   * 再帰的な子プロパティ変換
   */
  const convertPropertiesArrayToNestedFormatRecursive = (propertiesArray: Property[]): PropertyData[] => {
    if (!Array.isArray(propertiesArray)) return [];
    
    return propertiesArray.map((item) => {
      const prop = item;
      const converted: PropertyData = {
        key: (prop.key as string)|| `child_${Date.now()}`,
        tagName: 'property',
        attributes: {
          'xsi:type': (prop.xsiType as string) || 'stringType'
        },
        elements: {},
        children: []
      };
      
      if (prop.units) converted.attributes.units = prop.units as string;
      if (prop.formatString) converted.attributes.formatString = prop.formatString as string;
      if (prop.scaleFactor) converted.attributes.scaleFactor = String(prop.scaleFactor);
      
      if (prop.value !== undefined && prop.value !== '') {
        converted.elements.value = String(prop.value);
      }
      
      if (prop.description !== undefined && prop.description !== '') {
        converted.elements.description = String(prop.description);
      }
      
      // customElementsの変換（PropertyCustomElement → elements）
      if (prop.customElements && typeof prop.customElements === 'object') {
        Object.entries(prop.customElements).forEach(([elemName, elemValue]) => {
          // PropertyCustomElementは複雑な構造を持つ可能性があるため、
          // valueプロパティがあればそれを使用、なければ全体をJSON文字列化
          if (elemValue && typeof elemValue === 'object' && 'value' in elemValue) {
            converted.elements[elemName] = String(elemValue.value);
          } else if (elemValue !== undefined && elemValue !== null) {
            converted.elements[elemName] = String(elemValue);
          }
        });
      }
      
      // 子要素の変換（properties, contentsの順）
      const childrenData: PropertyData[] = [];
      
      // 子プロパティの再帰的変換
      if (prop.properties && Array.isArray(prop.properties) && prop.properties.length > 0) {
        childrenData.push(...convertPropertiesArrayToNestedFormatRecursive(prop.properties));
      }
      
      // 子コンテンツの再帰的変換
      if (prop.contents && Array.isArray(prop.contents) && prop.contents.length > 0) {
        childrenData.push(...convertContentsArrayToNestedFormatRecursive(prop.contents));
      }
      
      // 子要素がある場合は設定
      if (childrenData.length > 0) {
        converted.children = childrenData;
        if (!converted.attributes['xsi:type']) {
          converted.attributes['xsi:type'] = 'propertyListType';
        }
      }
      
      return converted;
    });
  };

  /**
   * Content配列からNestedPropertyEditor形式への変換
   * Content型（maiml-unified.ts）を使用してRecord<string, PropertyData>に変換
   * 
   * @param contentsArray - Content配列（maiml-unified.tsのContent型）
   * @returns Record<string, PropertyData> - NestedPropertyEditor用の形式
   */
  const convertContentsArrayToNestedFormat = (contentsArray: Content[]): Record<string, PropertyData> => {
    const result: Record<string, PropertyData> = {};
    
    if (!Array.isArray(contentsArray)) return result;
    
    contentsArray.forEach((content) => {
      // keyがない場合はユニークなキーを生成
      const key = content.key || `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 属性の構築
      const attributes: Record<string, string> = {};
      
      // xsi:type（必須）
      if (content.xsiType) {
        attributes['xsi:type'] = content.xsiType;
      }
      
      // Content固有の属性
      if (content.axis !== undefined && content.axis !== '') {
        attributes.axis = content.axis;
      }
      if (content.size !== undefined) {
        attributes.size = String(content.size);
      }
      if (content.id !== undefined && content.id !== '') {
        attributes.id = content.id;
      }
      if (content.ref !== undefined && content.ref !== '') {
        attributes.ref = content.ref;
      }
      
      // 数値型オプション
      if (content.units !== undefined && content.units !== '') {
        attributes.units = content.units;
      }
      if (content.formatString !== undefined && content.formatString !== '') {
        attributes.formatString = content.formatString;
      }
      if (content.scaleFactor !== undefined) {
        attributes.scaleFactor = String(content.scaleFactor);
      }
      
      // PropertyDataオブジェクトの構築
      result[key] = {
        key: key,
        tagName: 'content',
        attributes: attributes,
        elements: {},
        children: []
      };
      
      // value要素の追加
      if (content.value !== undefined && content.value !== null && content.value !== '') {
        result[key].elements.value = String(content.value);
      }
      
      // description要素の追加
      if (content.description !== undefined && content.description !== null && content.description !== '') {
        result[key].elements.description = String(content.description);
      }
      
      // 子要素の変換（properties, contents, uncertaintyの順）
      const childrenData: PropertyData[] = [];
      
      // 子プロパティの変換
      if (content.properties && Array.isArray(content.properties) && content.properties.length > 0) {
        childrenData.push(...convertPropertiesArrayToNestedFormatRecursive(content.properties));
      }
      
      // 子コンテンツの再帰的変換
      if (content.contents && Array.isArray(content.contents) && content.contents.length > 0) {
        childrenData.push(...convertContentsArrayToNestedFormatRecursive(content.contents));
      }
      
      // uncertainty（不確実性情報）の変換
      if (content.uncertainty && Array.isArray(content.uncertainty) && content.uncertainty.length > 0) {
        childrenData.push(...convertContentsArrayToNestedFormatRecursive(content.uncertainty));
      }
      
      // 子要素がある場合は設定
      if (childrenData.length > 0) {
        result[key].children = childrenData;
        // 子要素がある場合、xsi:typeが未設定ならpropertyListTypeに設定
        if (!result[key].attributes['xsi:type']) {
          result[key].attributes['xsi:type'] = 'propertyListType';
        }
      }
    });
    
    return result;
  };

  /**
   * 再帰的な子Content変換
   * Content配列をPropertyData配列に変換（ネスト構造対応）
   * 
   * @param contentsArray - Content配列
   * @returns PropertyData[] - 変換されたPropertyData配列
   */
  const convertContentsArrayToNestedFormatRecursive = (contentsArray: Content[]): PropertyData[] => {
    if (!Array.isArray(contentsArray)) return [];
    
    return contentsArray.map((content) => {
      const key = content.key || `content_child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 属性の構築
      const attributes: Record<string, string> = {};
      
      if (content.xsiType) {
        attributes['xsi:type'] = content.xsiType;
      }
      if (content.axis) attributes.axis = content.axis;
      if (content.size !== undefined) attributes.size = String(content.size);
      if (content.id) attributes.id = content.id;
      if (content.ref) attributes.ref = content.ref;
      if (content.units) attributes.units = content.units;
      if (content.formatString) attributes.formatString = content.formatString;
      if (content.scaleFactor !== undefined) attributes.scaleFactor = String(content.scaleFactor);
      
      const converted: PropertyData = {
        key: key,
        tagName: 'content',
        attributes: attributes,
        elements: {},
        children: []
      };
      
      // value要素
      if (content.value !== undefined && content.value !== '') {
        converted.elements.value = String(content.value);
      }
      
      // description要素
      if (content.description !== undefined && content.description !== '') {
        converted.elements.description = String(content.description);
      }
      
      // 子要素の変換
      const childrenData: PropertyData[] = [];
      
      if (content.properties && Array.isArray(content.properties) && content.properties.length > 0) {
        childrenData.push(...convertPropertiesArrayToNestedFormatRecursive(content.properties));
      }
      
      if (content.contents && Array.isArray(content.contents) && content.contents.length > 0) {
        childrenData.push(...convertContentsArrayToNestedFormatRecursive(content.contents));
      }
      
      if (content.uncertainty && Array.isArray(content.uncertainty) && content.uncertainty.length > 0) {
        childrenData.push(...convertContentsArrayToNestedFormatRecursive(content.uncertainty));
      }
      
      if (childrenData.length > 0) {
        converted.children = childrenData;
        if (!converted.attributes['xsi:type']) {
          converted.attributes['xsi:type'] = 'propertyListType';
        }
      }
      
      return converted;
    });
  };

  /**
   * PropertyData形式からProperty配列への逆変換
   * NestedPropertyEditor形式 → maiml-unified.ts Property型配列
   */
  const convertPropertyDataToPropertiesArray = (propertyDataRecord: Record<string, PropertyData>): Property[] => {
    const result: Property[] = [];
    
    Object.values(propertyDataRecord).forEach((propData) => {
      // tagNameがpropertyのもののみを変換
      if (propData.tagName !== 'property') {
        return;
      }
      
      const property: Property = {
        key: propData.key,
        xsiType: propData.attributes?.['xsi:type'] || 'stringType',
        properties: [],
        contents: [],
      };
      
      // 属性の変換
      if (propData.attributes?.units) {
        property.units = propData.attributes.units;
      }
      if (propData.attributes?.formatString) {
        property.formatString = propData.attributes.formatString;
      }
      if (propData.attributes?.scaleFactor) {
        property.scaleFactor = parseFloat(propData.attributes.scaleFactor);
      }
      
      // 要素の変換
      if (propData.elements?.value) {
        property.value = propData.elements.value;
      }
      if (propData.elements?.description) {
        property.description = propData.elements.description;
      }
      
      // customElementsの変換（elements内の他の要素）
      if (propData.elements) {
        const customElements: Record<string, PropertyCustomElement> = {};
        Object.entries(propData.elements).forEach(([key, value]) => {
          // value, description以外をcustomElementsに格納
          if (key !== 'value' && key !== 'description') {
            customElements[key] = { value };
          }
        });
        
        if (Object.keys(customElements).length > 0) {
          property.customElements = customElements;
        }
      }
      
      // 子要素の再帰的変換
      if (propData.children && Array.isArray(propData.children) && propData.children.length > 0) {
        const { properties, contents } = convertPropertyDataChildrenToArrays(propData.children);
        property.properties = properties;
        property.contents = contents;
      }
      
      result.push(property);
    });
    
    return result;
  };

  /**
   * PropertyData形式からContent配列への逆変換
   * NestedPropertyEditor形式 → maiml-unified.ts Content型配列
   */
  const convertPropertyDataToContentsArray = (propertyDataRecord: Record<string, PropertyData>): Content[] => {
    const result: Content[] = [];
    
    Object.values(propertyDataRecord).forEach((propData) => {
      // tagNameがcontentのもののみを変換
      if (propData.tagName !== 'content') {
        return;
      }
      
      const content: Content = {
        key: propData.key,
        xsiType: propData.attributes?.['xsi:type'] || 'stringType',
        properties: [],
        contents: [],
        uncertainty: [],
      };
      
      // Content固有の属性
      if (propData.attributes?.axis) {
        content.axis = propData.attributes.axis;
      }
      if (propData.attributes?.size) {
        content.size = parseInt(propData.attributes.size);
      }
      if (propData.attributes?.id) {
        content.id = propData.attributes.id;
      }
      if (propData.attributes?.ref) {
        content.ref = propData.attributes.ref;
      }
      
      // 数値型オプション
      if (propData.attributes?.units) {
        content.units = propData.attributes.units;
      }
      if (propData.attributes?.formatString) {
        content.formatString = propData.attributes.formatString;
      }
      if (propData.attributes?.scaleFactor) {
        content.scaleFactor = parseFloat(propData.attributes.scaleFactor);
      }
      
      // 要素の変換
      if (propData.elements?.value) {
        content.value = propData.elements.value;
      }
      if (propData.elements?.description) {
        content.description = propData.elements.description;
      }
      
      // 子要素の再帰的変換
      if (propData.children && Array.isArray(propData.children) && propData.children.length > 0) {
        const { properties, contents } = convertPropertyDataChildrenToArrays(propData.children);
        content.properties = properties;
        content.contents = contents;
        // uncertainty は contents と同じ型なので、同様に処理可能
      }
      
      result.push(content);
    });
    
    return result;
  };

  /**
   * PropertyDataの子要素配列をProperty配列とContent配列に分離
   * 
   * @param children - PropertyData配列
   * @returns { properties: Property[], contents: Content[] }
   */
  const convertPropertyDataChildrenToArrays = (
    children: PropertyData[]
  ): { properties: Property[]; contents: Content[] } => {
    const properties: Property[] = [];
    const contents: Content[] = [];
    
    children.forEach((child) => {
      if (child.tagName === 'property') {
        const property: Property = {
          key: child.key,
          xsiType: child.attributes?.['xsi:type'] || 'stringType',
          properties: [],
          contents: [],
        };
        
        // 属性の変換
        if (child.attributes?.units) property.units = child.attributes.units;
        if (child.attributes?.formatString) property.formatString = child.attributes.formatString;
        if (child.attributes?.scaleFactor) property.scaleFactor = parseFloat(child.attributes.scaleFactor);
        
        // 要素の変換
        if (child.elements?.value) property.value = child.elements.value;
        if (child.elements?.description) property.description = child.elements.description;
        
        // customElements
        if (child.elements) {
          const customElements: Record<string, PropertyCustomElement> = {};
          Object.entries(child.elements).forEach(([key, value]) => {
            if (key !== 'value' && key !== 'description') {
              customElements[key] = { value };
            }
          });
          if (Object.keys(customElements).length > 0) {
            property.customElements = customElements;
          }
        }
        
        // 子要素の再帰的変換
        if (child.children && child.children.length > 0) {
          const childArrays = convertPropertyDataChildrenToArrays(child.children);
          property.properties = childArrays.properties;
          property.contents = childArrays.contents;
        }
        
        properties.push(property);
        
      } else if (child.tagName === 'content') {
        const content: Content = {
          key: child.key,
          xsiType: child.attributes?.['xsi:type'] || 'stringType',
          properties: [],
          contents: [],
          uncertainty: [],
        };
        
        // Content固有の属性
        if (child.attributes?.axis) content.axis = child.attributes.axis;
        if (child.attributes?.size) content.size = parseInt(child.attributes.size);
        if (child.attributes?.id) content.id = child.attributes.id;
        if (child.attributes?.ref) content.ref = child.attributes.ref;
        
        // 数値型オプション
        if (child.attributes?.units) content.units = child.attributes.units;
        if (child.attributes?.formatString) content.formatString = child.attributes.formatString;
        if (child.attributes?.scaleFactor) content.scaleFactor = parseFloat(child.attributes.scaleFactor);
        
        // 要素の変換
        if (child.elements?.value) content.value = child.elements.value;
        if (child.elements?.description) content.description = child.elements.description;
        
        // 子要素の再帰的変換
        if (child.children && child.children.length > 0) {
          const childArrays = convertPropertyDataChildrenToArrays(child.children);
          content.properties = childArrays.properties;
          content.contents = childArrays.contents;
        }
        
        contents.push(content);
      }
    });
    
    return { properties, contents };
  };

  /**
   * 初期化: ノードデータからStateを設定
   */
  useEffect(() => {
    if (open && node && mergedTemplate) {
      setTemplateId(mergedTemplate.id || '');
      setUuid(mergedTemplate.uuid || '');
      setName(mergedTemplate.name || '');
      setDescription(mergedTemplate.description || '');
      setInsertion(mergedTemplate.insertion || { uri: '', hash: {method : '', value: ''}, format: '' });
      
      // placeRefsの読み込み（文字列配列に正規化）
      const loadedPlaceRefs = mergedTemplate.placeRefs || [];
      setPlaceRefs(loadedPlaceRefs);
      
      // Properties変換
      let convertedProperties: Record<string, PropertyData> = {};
      if (mergedTemplate.properties) {
        if (Array.isArray(mergedTemplate.properties)) {
          convertedProperties = convertPropertiesArrayToNestedFormat(mergedTemplate.properties);
        } else if (typeof mergedTemplate.properties === 'object') {
          // 既にNestedPropertyEditor形式かチェック
          const firstKey = Object.keys(mergedTemplate.properties)[0];
          const firstProp = mergedTemplate.properties[firstKey] as Record<string, unknown>;
          const isAlreadyNestedFormat = firstProp && 
            typeof firstProp === 'object' &&
            ('attributes' in firstProp || 'elements' in firstProp || 'children' in firstProp);
          
          if (isAlreadyNestedFormat) {
            convertedProperties = mergedTemplate.properties as Record<string, PropertyData>;
          }
        }
      }
      
      setProperties(convertedProperties);
      setExpandedNodes(new Set());
      setForceRenderKey(Date.now());
    }
  }, [open, node, mergedTemplate]);

  /**
   * NestedPropertyEditor用ハンドラー
   */
  const handleToggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleAddProperty = () => {
    if (!newPropertyKey.trim()) {
      message.error('プロパティキーを入力してください');
      return;
    }

    if (properties[newPropertyKey.trim()]) {
      message.error('同じキーのプロパティが既に存在します');
      return;
    }

    setProperties({
      ...properties,
      [newPropertyKey.trim()]: {
        key: newPropertyKey.trim(),
        tagName: newPropertyTagName,
        attributes: {},
        elements: {},
        children: []
      }
    });

    setNewPropertyKey('');
    setNewPropertyTagName('property');
    setShowAddModal(false);
    setHasChanges(true);
  };

  const handleAddNestedChild = (parentKey: string, childTagName: string, specifiedKey?: string) => {
    const childKey = specifiedKey && specifiedKey.trim() 
      ? specifiedKey.trim() 
      : `${childTagName}_${Date.now()}`;
    
    const findAndUpdateParent = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
      if (obj[targetKey]) {
        if (!obj[targetKey].children) {
          obj[targetKey].children = [];
        }
        obj[targetKey].children.push({
          key: childKey,
          tagName: childTagName,
          attributes: {},
          elements: {},
          children: []
        });
        if (!obj[targetKey].attributes) {
          obj[targetKey].attributes = {};
        }
        obj[targetKey].attributes['xsi:type'] = 'propertyListType';
        return true;
      }
      
      for (const key in obj) {
        if (obj[key] && obj[key].children && Array.isArray(obj[key].children)) {
          for (let i = 0; i < obj[key].children.length; i++) {
            const child = obj[key].children[i];
            if (child.key === targetKey) {
              if (!child.children) {
                child.children = [];
              }
              child.children.push({
                key: childKey,
                tagName: childTagName,
                attributes: {},
                elements: {},
                children: []
              });
              if (!child.attributes) {
                child.attributes = {};
              }
              child.attributes['xsi:type'] = 'propertyListType';
              return true;
            }
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
              const tempObj = { [child.key]: child };
              if (findAndUpdateParent(tempObj, targetKey)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    setProperties(prevProperties => {
      const updated = JSON.parse(JSON.stringify(prevProperties));
      findAndUpdateParent(updated, parentKey);
      return updated;
    });
    
    setForceRenderKey(Date.now());
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.add(parentKey);
      return next;
    });
    setHasChanges(true);
  };

  const handleAddSameLevelCopy = (sourceKey: string, sourceData: PropertyData, newKey: string) => {
    if (properties[newKey]) {
      message.error('同じキーのプロパティが既に存在します');
      return;
    }

    const deepCopy = JSON.parse(JSON.stringify(sourceData));
    deepCopy.key = newKey;
    
    setProperties({
      ...properties,
      [newKey]: deepCopy
    });
    setHasChanges(true);
  };

  const handleUpdateNestedAttribute = (propertyKey: string, attrName: string, attrValue: string) => {
    const findAndUpdate = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
      if (obj[targetKey]) {
        if (!obj[targetKey].attributes) {
          obj[targetKey].attributes = {};
        }
        obj[targetKey].attributes[attrName] = attrValue;
        return true;
      }
      
      for (const key in obj) {
        if (obj[key] && obj[key].children && Array.isArray(obj[key].children)) {
          for (let i = 0; i < obj[key].children.length; i++) {
            const child = obj[key].children[i];
            if (child.key === targetKey) {
              if (!child.attributes) {
                child.attributes = {};
              }
              child.attributes[attrName] = attrValue;
              return true;
            }
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
              const tempObj = { [child.key]: child };
              if (findAndUpdate(tempObj, targetKey)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    setProperties(prevProperties => {
      const updated = JSON.parse(JSON.stringify(prevProperties));
      findAndUpdate(updated, propertyKey);
      return updated;
    });
    
    setForceRenderKey(Date.now());
    setHasChanges(true);
  };

  const handleUpdateNestedElement = (propertyKey: string, elemName: string, elemValue: string) => {
    const findAndUpdate = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
      if (obj[targetKey]) {
        if (!obj[targetKey].elements) {
          obj[targetKey].elements = {};
        }
        obj[targetKey].elements[elemName] = elemValue;
        return true;
      }
      
      for (const key in obj) {
        if (obj[key] && obj[key].children && Array.isArray(obj[key].children)) {
          for (let i = 0; i < obj[key].children.length; i++) {
            const child = obj[key].children[i];
            if (child.key === targetKey) {
              if (!child.elements) {
                child.elements = {};
              }
              child.elements[elemName] = elemValue;
              return true;
            }
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
              const tempObj = { [child.key]: child };
              if (findAndUpdate(tempObj, targetKey)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    setProperties(prevProperties => {
      const updated = JSON.parse(JSON.stringify(prevProperties));
      findAndUpdate(updated, propertyKey);
      return updated;
    });
    
    setForceRenderKey(Date.now());
    setHasChanges(true);
  };

  const handleDeleteNestedAttribute = (propertyKey: string, attrName: string) => {
    const findAndDelete = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
      if (obj[targetKey]?.attributes?.[attrName]) {
        delete obj[targetKey].attributes[attrName];
        return true;
      }
      
      for (const key in obj) {
        if (obj[key] && obj[key].children && Array.isArray(obj[key].children)) {
          for (let i = 0; i < obj[key].children.length; i++) {
            const child = obj[key].children[i];
            if (child.key === targetKey && child.attributes?.[attrName]) {
              delete child.attributes[attrName];
              return true;
            }
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
              const tempObj = { [child.key]: child };
              if (findAndDelete(tempObj, targetKey)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    setProperties(prevProperties => {
      const updated = JSON.parse(JSON.stringify(prevProperties));
      findAndDelete(updated, propertyKey);
      return updated;
    });
    
    setForceRenderKey(Date.now());
    setHasChanges(true);
  };

  const handleDeleteNestedElement = (propertyKey: string, elemName: string) => {
    const findAndDelete = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
      if (obj[targetKey]?.elements?.[elemName]) {
        delete obj[targetKey].elements[elemName];
        return true;
      }
      
      for (const key in obj) {
        if (obj[key] && obj[key].children && Array.isArray(obj[key].children)) {
          for (let i = 0; i < obj[key].children.length; i++) {
            const child = obj[key].children[i];
            if (child.key === targetKey && child.elements?.[elemName]) {
              delete child.elements[elemName];
              return true;
            }
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
              const tempObj = { [child.key]: child };
              if (findAndDelete(tempObj, targetKey)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    setProperties(prevProperties => {
      const updated = JSON.parse(JSON.stringify(prevProperties));
      findAndDelete(updated, propertyKey);
      return updated;
    });
    
    setForceRenderKey(Date.now());
    setHasChanges(true);
  };

  const handleDeleteProperty = (propertyKey: string) => {
    const updated = { ...properties };
    delete updated[propertyKey];
    setProperties(updated);
    setHasChanges(true);
  };

  /**
   * UUID生成
   */
  const handleGenerateUuid = () => {
    const newUuid = crypto.randomUUID();
    setUuid(newUuid);
    setHasChanges(true);
  };

  /**
   * ✅ Phase 3-1: フォルダツリー構築関数
   */
  interface TreeNode {
    title: string;
    value: string;
    key: string;
    isLeaf?: boolean;
    children?: TreeNode[];
    icon?: React.ReactNode;
  }

  const buildTreeData = (files: TemplateFile[]): TreeNode[] => {
    const tree: Record<string, TreeNode> = {};
    
    files.forEach(file => {
      const parts = file.filePath.split('/');
      let currentPath = '';
      
      parts.forEach((part, index) => {
        const previousPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!tree[currentPath]) {
          const isFile = index === parts.length - 1;
          tree[currentPath] = {
            title: isFile ? `${part} (${(file.size / 1024).toFixed(1)}KB)` : part,
            value: currentPath,
            key: currentPath,
            isLeaf: isFile,
            children: [],
            icon: isFile ? <FileOutlined /> : <FolderOutlined />
          };
        }
        
        // 親ノードに子を追加
        if (previousPath && tree[previousPath]) {
          const existingChild = tree[previousPath].children?.find(c => c.key === currentPath);
          if (!existingChild && tree[previousPath].children) {
            tree[previousPath].children.push(tree[currentPath]);
          }
        }
      });
    });
    
    // ルートレベルのノードのみを返す
    const rootNodes = Object.values(tree).filter(node => !node.value.includes('/'));
    return rootNodes;
  };

  /**
   * ✅ Phase 2-2: テンプレートファイル一覧を取得
   */
  const handleOpenNamespaceImport = async () => {
    const organizationId = localStorage.getItem('organizationPrefix') || '';
    if (!organizationId) {
      message.error('組織IDが取得できません');
      return;
    }

    // カテゴリを判定
    const category = node.data.placeType === 'material' ? 'material' :
                     node.data.placeType === 'condition' ? 'condition' : 'result';

    setIsLoadingTemplates(true);
    setShowNamespaceImportModal(true);

    try {
      const files = await fetchTemplateFiles(organizationId, category);
      setTemplateFiles(files);
    } catch (error) {
      console.error('テンプレートファイル一覧取得エラー:', error);
      message.error('テンプレートファイル一覧の取得に失敗しました');
      setTemplateFiles([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  /**
   * ✅ Phase 2-2: XMLファイルから名前空間定義を解析
   */
  const parseNamespacesFromXml = (xmlContent: string): Record<string, PropertyData> => {
    try {
      const result = xml2js(xmlContent, { compact: true }) as ElementCompact;
      
      // ルート要素を特定（MaterialTemplate, ConditionTemplate, ResultTemplate）
      const rootKey = Object.keys(result).find(key => 
        key.includes('Template') || key === 'maiml:MaterialTemplate' || 
        key === 'maiml:ConditionTemplate' || key === 'maiml:ResultTemplate'
      );

      if (!rootKey || !result[rootKey]) {
        throw new Error('テンプレートルート要素が見つかりません');
      }

      const templateRoot = result[rootKey] as ElementCompact;
      const propertiesElement = templateRoot['properties'];

      if (!propertiesElement) {
        return {};
      }

      // property要素を抽出
      const propertyElements = propertiesElement['property'];
      if (!propertyElements) {
        return {};
      }

      // 配列化
      const propertyArray = Array.isArray(propertyElements) ? propertyElements : [propertyElements];

      // PropertyData形式に変換
      const parsedProperties: Record<string, PropertyData> = {};

      propertyArray.forEach((prop: ElementCompact) => {
        const attributes = (prop['_attributes'] || {}) as Record<string, string>;
        const key = attributes['key'] || `property_${Date.now()}`;

        const propertyData: PropertyData = {
          key,
          tagName: 'property',
          attributes: { ...attributes },
          elements: {},
          children: []
        };

        // value要素を抽出
        if (prop['value'] && prop['value']['_text']) {
          propertyData.elements.value = String(prop['value']['_text']);
        }

        // description要素を抽出
        if (prop['description'] && prop['description']['_text']) {
          propertyData.elements.description = String(prop['description']['_text']);
        }

        // 子property要素を再帰的に解析
        if (prop['property']) {
          propertyData.children = parseChildPropertiesFromXml(prop['property']);
        }

        parsedProperties[key] = propertyData;
      });

      return parsedProperties;
    } catch (error) {
      console.error('XML解析エラー:', error);
      throw error;
    }
  };

  /**
   * ✅ Phase 2-2: 子property要素を再帰的に解析（旧実装 - 削除予定）
   */
  const parseChildPropertiesFromXml = (propertyElements: ElementCompact | ElementCompact[]): PropertyData[] => {
    const propertyArray = Array.isArray(propertyElements) ? propertyElements : [propertyElements];

    return propertyArray.map((prop: ElementCompact) => {
      const attributes = (prop['_attributes'] || {}) as Record<string, string>;
      const key = attributes['key'] || `child_${Date.now()}`;

      const propertyData: PropertyData = {
        key,
        tagName: 'property',
        attributes: { ...attributes },
        elements: {},
        children: []
      };

      // value要素を抽出
      if (prop['value'] && prop['value']['_text']) {
        propertyData.elements.value = String(prop['value']['_text']);
      }

      // description要素を抽出
      if (prop['description'] && prop['description']['_text']) {
        propertyData.elements.description = String(prop['description']['_text']);
      }

      // 子property要素を再帰的に解析
      if (prop['property']) {
        propertyData.children = parseChildPropertiesFromXml(prop['property']);
      }

      return propertyData;
    });
  };

  /**
   * ✅ Phase 3-2: ファイル選択時のプレビュー取得
   */
  const handleFileSelect = async (filePath: string) => {
    setSelectedTemplateFile(filePath);
    
    if (!filePath) {
      setPreviewContent({});
      return;
    }
    
    const organizationId = localStorage.getItem('organizationPrefix') || '';
    if (!organizationId) {
      setPreviewContent({ error: '組織IDが取得できません' });
      return;
    }
    
    try {
      // XMLコンテンツを取得
      const xmlContent = await fetchTemplateContent(organizationId, filePath);
      
      // プロパティを解析
      const parsedProperties = parseNamespacesFromXml(xmlContent);
      
      // 大きなXMLは最初の500行に制限
      const xmlLines = xmlContent.split('\n');
      const limitedXml = xmlLines.length > 500 
        ? xmlLines.slice(0, 500).join('\n') + '\n\n... (残り省略)'
        : xmlContent;
      
      setPreviewContent({
        xml: limitedXml,
        properties: parsedProperties
      });
    } catch (error) {
      console.error('プレビュー読み込みエラー:', error);
      setPreviewContent({
        error: 'プレビューの読み込みに失敗しました'
      });
    }
  };

  /**
   * ✅ Phase 3-3: テンプレートファイルから名前空間を取り込み（重複チェック付き）
   */
  const handleImportNamespace = async () => {
    if (!selectedTemplateFile) {
      message.error('テンプレートファイルを選択してください');
      return;
    }

    // プレビュー内容がある場合はそれを使用、なければ再取得
    let parsedNamespaces = previewContent.properties;
    
    if (!parsedNamespaces) {
      const organizationId = localStorage.getItem('organizationPrefix') || '';
      if (!organizationId) {
        message.error('組織IDが取得できません');
        return;
      }

      try {
        const xmlContent = await fetchTemplateContent(organizationId, selectedTemplateFile);
        parsedNamespaces = parseNamespacesFromXml(xmlContent);
      } catch (error) {
        console.error('名前空間取り込みエラー:', error);
        message.error('名前空間の取り込みに失敗しました');
        return;
      }
    }

    // 重複チェック
    const duplicates = Object.keys(parsedNamespaces).filter(key => properties[key]);
    setDuplicateKeys(duplicates);

    // 確認ダイアログを表示
    setShowConfirmDialog(true);
  };

  /**
   * ✅ Phase 3-3: 取り込み確認後の実行
   */
  const handleConfirmImport = () => {
    if (!previewContent.properties) {
      message.error('取り込むプロパティがありません');
      return;
    }

    // 既存のプロパティにマージ（重複キーは上書き）
    setProperties(prev => ({
      ...prev,
      ...previewContent.properties
    }));

    // 取り込み済みリストに追加
    const fileName = selectedTemplateFile.split('/').pop() || selectedTemplateFile;
    setImportedNamespaces(prev => [...prev, fileName]);

    message.success(
      `${fileName} から ${Object.keys(previewContent.properties).length} 個のプロパティを取り込みました`
    );
    
    // 状態をクリア
    setShowConfirmDialog(false);
    setShowNamespaceImportModal(false);
    setSelectedTemplateFile('');
    setPreviewContent({});
    setDuplicateKeys([]);
    setHasChanges(true);
    setForceRenderKey(Date.now());
  };

  /**
   * 保存処理
   */
  const handleSave = () => {
    // ✅ Phase 1-2: 基本チェック
    if (!templateId.trim()) {
      message.error('テンプレートIDを入力してください');
      return;
    }
    
    // ✅ Phase 1-2: ノードIDとの重複チェック
    const nodeIds = allNodes.map(n => n.id);
    if (nodeIds.includes(templateId) && templateId !== node.id) {
      message.error(
        `テンプレートID "${templateId}" は既にノードIDとして使用されています。別のIDを指定してください。`
      );
      return;
    }
    
    // ✅ Phase 1-2: 他のテンプレートIDとの重複チェック
    // window.clineAllTemplatesがグローバルに存在する場合のみチェック
    if (window.clineAllTemplates) {
      const allTemplateIds: string[] = [];
      (['material', 'condition', 'result'] as const).forEach(category => {
        const templates = window.clineAllTemplates[category];
        if (templates && Array.isArray(templates)) {
          templates.forEach((t: Template) => {
            // 自分自身のテンプレートは除外
            const currentTemplateId = node.data.template?.id || node.data.templateRef?.id;
            const templateId = t.id;
            if (templateId && templateId !== currentTemplateId) {
              allTemplateIds.push(templateId);
            }
          });
        }
      });
      
      if (allTemplateIds.includes(templateId)) {
        message.error(
          `テンプレートID "${templateId}" は既に他のテンプレートで使用されています。別のIDを指定してください。`
        );
        return;
      }
    }
    
    // PropertyData形式からProperty[]とContent[]に変換
    const convertedProperties = convertPropertyDataToPropertiesArray(properties);
    const convertedContents = convertPropertyDataToContentsArray(properties);
    
    const templateRef: Template = {
      ...(node.data.templateRef || {}),
      id: templateId,
      uuid: uuid,
      name: name,
      category : nodeCategory,
      description: description,
      properties: convertedProperties,
      contents: convertedContents,
      placeRefs: placeRefs,
    };
    
    if (node.data.templateRef?.templateRef) {
      templateRef.templateRef = node.data.templateRef?.templateRef;
    }
    
    if ((node.data.placeType === 'material' || node.data.placeType === 'result') && 
        (insertion.uri || insertion.hash || insertion.format)) {
      templateRef.insertion = insertion;
    }
    
    const isNewTemplate = node.data.isNewTemplate || false;
    const templateCategory = node.data.templateCategory || node.data.placeType || 'material';
    const isCommonTemplate = node.data.isCommonTemplate || false;
    const methodId = node.data.methodId || null;
    
    onSave(node.id, templateRef, isNewTemplate, templateCategory, isCommonTemplate, methodId);
    onClose();
    setHasChanges(false);
  };

  if (!node) return null;

  return (
    <Modal
      title={
        <Space>
          {templateIcon}
          <span>{nodeCategory}を編集</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width="90%"
      style={{ top: 20 }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          キャンセル
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          保存
        </Button>
      ]}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* エラー表示 */}
        {mergedTemplate && templateErrors[mergedTemplate.id] && templateErrors[mergedTemplate.id].length > 0 && (
          <Alert
            message={`⚠️ バリデーション警告（${templateErrors[mergedTemplate.id].length}件）`}
            description={
              <div>
                {templateErrors[mergedTemplate.id].map((error, index) => (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <Text strong>{error.type || 'validation_error'}</Text>: {error.message}
                  </div>
                ))}
              </div>
            }
            type="warning"
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 基本情報 */}
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f0f5ff', borderRadius: 8 }}>
          <Title level={5}>📋 基本情報</Title>
          
          <Form.Item label="テンプレートID">
            <Input
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                setHasChanges(true);
              }}
              placeholder="例: materialTemplate_12345"
            />
          </Form.Item>

          <Form.Item label="UUID">
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={uuid}
                onChange={(e) => {
                  setUuid(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="例: urn:uuid:12345678-1234-1234-1234-123456789abc"
              />
              <Button icon={<ThunderboltOutlined />} onClick={handleGenerateUuid}>
                生成
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="Name">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setHasChanges(true);
              }}
              placeholder="例: Sample Name"
            />
          </Form.Item>

          <Form.Item label="Description">
            <TextArea
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setHasChanges(true);
              }}
              placeholder="例: Sample description"
            />
          </Form.Item>
        </div>

        {/* ✅ Phase 2-1: 継承元プロパティ表示セクション */}
        {inheritedTemplate && (
          <>
            <Divider />
            <Collapse
              items={[
                {
                  key: 'inherited',
                  label: (
                    <Space>
                      <FileSearchOutlined />
                      <Text strong>
                        🔗 継承元プロパティ（親テンプレート: {inheritedTemplate.id}）
                      </Text>
                      <Tag color="blue">読み取り専用</Tag>
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: 16, backgroundColor: '#f0f5ff' }}>
                      <Alert
                        message="このプロパティは親テンプレートから継承されています"
                        description="編集する場合は、親テンプレート側で変更してください"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                      
                      {inheritedTemplate.properties && typeof inheritedTemplate.properties === 'object' && 
                       Object.keys(inheritedTemplate.properties).length > 0 ? (
                        Object.entries(convertPropertiesArrayToNestedFormatRecursive(inheritedTemplate.properties)).map(([key, data]) => (
                          <div
                            key={key}
                            style={{
                              marginBottom: 16,
                              padding: 12,
                              border: '1px solid #91d5ff',
                              borderRadius: 8,
                              backgroundColor: '#e6f7ff'
                            }}
                          >
                            <Text strong style={{ color: '#0958d9' }}>
                              {data.tagName || 'property'}: {key}
                            </Text>
                            
                            {/* 属性表示 */}
                            {data.attributes && Object.keys(data.attributes).length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary" strong style={{ fontSize: 12 }}>
                                  📋 属性
                                </Text>
                                {Object.entries(data.attributes).map(([attrName, attrValue]) => (
                                  <div key={attrName} style={{ marginLeft: 16 }}>
                                    <Text style={{ fontSize: 12 }}>
                                      {attrName}: <Tag>{attrValue}</Tag>
                                    </Text>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* 要素表示 */}
                            {data.elements && Object.keys(data.elements).length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary" strong style={{ fontSize: 12 }}>
                                  📄 要素
                                </Text>
                                {Object.entries(data.elements).map(([elemName, elemValue]) => (
                                  <div key={elemName} style={{ marginLeft: 16 }}>
                                    <Text style={{ fontSize: 12 }}>
                                      {elemName}: {elemValue}
                                    </Text>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <Alert
                          message="親テンプレートにプロパティがありません"
                          type="warning"
                          showIcon
                        />
                      )}
                    </div>
                  )
                }
              ]}
            />
          </>
        )}

        {/* Properties編集セクション */}
        <Divider />
        <div style={{ marginBottom: 16 }}>
          <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <Title level={5}>🏷️ Properties</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
              新規プロパティ追加
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleOpenNamespaceImport}>
              テンプレートから取り込み
            </Button>
          </Space>

          {/* 取り込み済みファイル表示 */}
          {importedNamespaces.length > 0 && (
            <Alert
              message={
                <Space direction="vertical" size="small">
                  <Text strong>📥 取り込み済みテンプレート ({importedNamespaces.length}件)</Text>
                  <div>
                    {importedNamespaces.map((fileName, index) => (
                      <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                        {fileName}
                      </Tag>
                    ))}
                  </div>
                </Space>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />
          )}

          {Object.keys(properties).length === 0 ? (
            <Alert message="プロパティがありません。「新規プロパティ追加」ボタンから追加してください。" type="info" />
          ) : (
            Object.entries(properties).map(([key, data]) => (
              <NestedPropertyEditor
                key={`${key}_${forceRenderKey}`}
                propertyData={data}
                propertyKey={key}
                level={0}
                expandedNodes={expandedNodes}
                onToggleExpanded={handleToggleExpanded}
                onAddNestedChild={handleAddNestedChild}
                onAddSameLevelCopy={handleAddSameLevelCopy}
                onUpdateNestedAttribute={handleUpdateNestedAttribute}
                onUpdateNestedElement={handleUpdateNestedElement}
                onDeleteNestedAttribute={handleDeleteNestedAttribute}
                onDeleteNestedElement={handleDeleteNestedElement}
                onDeleteProperty={handleDeleteProperty}
                forceRenderKey={forceRenderKey}
              />
            ))
          )}
        </div>
      </div>

      {/* ✅ Phase 2-2: 名前空間取り込みモーダル */}
      <Modal
        title={
          <Space>
            <DownloadOutlined />
            <span>テンプレートから名前空間を取り込み</span>
          </Space>
        }
        open={showNamespaceImportModal}
        onCancel={() => {
          setShowNamespaceImportModal(false);
          setSelectedTemplateFile('');
        }}
        onOk={handleImportNamespace}
        width={800}
        okText="取り込み"
        cancelText="キャンセル"
        okButtonProps={{ disabled: !selectedTemplateFile }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="テンプレートファイルから名前空間（properties定義）を取り込みます"
            description={
              <div>
                <p>・選択したテンプレートファイルのproperties定義を現在のテンプレートに追加します</p>
                <p>・同じキーのプロパティは上書きされます</p>
                <p>・複数のテンプレートから取り込むことができます</p>
              </div>
            }
            type="info"
          />

          {/* ✅ Phase 3-1 & 3-2: テンプレートファイル選択（TreeSelect版 + プレビュー連動） */}
          <Form.Item label="テンプレートファイル">
            <TreeSelect
              placeholder="テンプレートファイルを選択してください"
              value={selectedTemplateFile}
              onChange={handleFileSelect}
              loading={isLoadingTemplates}
              style={{ width: '100%' }}
              showSearch
              treeDefaultExpandAll={false}
              treeData={buildTreeData(templateFiles)}
              filterTreeNode={(input, node) =>
                (node?.title?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          {/* ✅ Phase 3-2: プレビュー表示 */}
          {selectedTemplateFile && (
            <>
              {previewContent.error && (
                <Alert
                  message="プレビューエラー"
                  description={previewContent.error}
                  type="error"
                  style={{ marginBottom: 16 }}
                />
              )}
              
              {previewContent.properties && (
                <Alert
                  message={
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Text strong>📊 プロパティプレビュー ({Object.keys(previewContent.properties).length}件)</Text>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {Object.entries(previewContent.properties).map(([key, data]) => (
                          <div key={key} style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f5ff', borderRadius: 4 }}>
                            <Text strong>{key}</Text>
                            {data.attributes?.['xsi:type'] && (
                              <Tag color="blue" style={{ marginLeft: 8 }}>
                                {data.attributes['xsi:type']}
                              </Tag>
                            )}
                            {data.elements?.value && (
                              <div style={{ marginLeft: 16, fontSize: 12 }}>
                                値: {data.elements.value}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Space>
                  }
                  type="info"
                  style={{ marginBottom: 16 }}
                />
              )}
              
              {previewContent.xml && (
                <Collapse
                  items={[
                    {
                      key: 'xml',
                      label: '📄 XMLプレビュー（最初の500行）',
                      children: (
                        <pre style={{
                          maxHeight: 300,
                          overflowY: 'auto',
                          backgroundColor: '#f5f5f5',
                          padding: 12,
                          borderRadius: 4,
                          fontSize: 12
                        }}>
                          {previewContent.xml}
                        </pre>
                      )
                    }
                  ]}
                />
              )}
            </>
          )}

          {/* テンプレートファイル一覧 */}
          {!isLoadingTemplates && templateFiles.length === 0 && (
            <Alert
              message="テンプレートファイルが見つかりませんでした"
              description="対象カテゴリのテンプレートファイルが存在しません"
              type="warning"
            />
          )}
        </Space>
      </Modal>

      {/* プロパティ追加モーダル */}
      <Modal
        title="新規プロパティ追加"
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onOk={handleAddProperty}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="プロパティキー（例: compound, concentration）"
            value={newPropertyKey}
            onChange={(e) => setNewPropertyKey(e.target.value)}
          />
          <Select
            style={{ width: '100%' }}
            placeholder="タグ名を選択"
            value={newPropertyTagName}
            onChange={setNewPropertyTagName}
          >
            <Option value="property">property</Option>
            <Option value="content">content</Option>
            <Option value="parameter">parameter</Option>
          </Select>
        </Space>
      </Modal>

      {/* ✅ Phase 3-3: 取り込み確認ダイアログ */}
      <Modal
        title="⚠️ プロパティ取り込み確認"
        open={showConfirmDialog}
        onCancel={() => {
          setShowConfirmDialog(false);
          setDuplicateKeys([]);
        }}
        onOk={handleConfirmImport}
        okText="取り込む"
        cancelText="キャンセル"
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {duplicateKeys.length > 0 ? (
            <Alert
              message={`⚠️ 重複するプロパティキーが ${duplicateKeys.length} 件あります`}
              description={
                <div>
                  <p>以下のプロパティは既に存在します。取り込むと上書きされます：</p>
                  <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
                    {duplicateKeys.map(key => (
                      <Tag key={key} color="warning" style={{ marginBottom: 4 }}>
                        {key}
                      </Tag>
                    ))}
                  </div>
                </div>
              }
              type="warning"
              showIcon
            />
          ) : (
            <Alert
              message="✅ 重複なし"
              description="すべてのプロパティは新規追加されます"
              type="success"
              showIcon
            />
          )}
          
          {previewContent.properties && (
            <div>
              <Text strong>取り込むプロパティ: {Object.keys(previewContent.properties).length}件</Text>
              <div style={{ 
                maxHeight: 300, 
                overflowY: 'auto', 
                marginTop: 8,
                padding: 12,
                backgroundColor: '#f5f5f5',
                borderRadius: 4
              }}>
                {Object.keys(previewContent.properties).map(key => (
                  <div key={key} style={{ marginBottom: 4 }}>
                    <Tag color={duplicateKeys.includes(key) ? 'orange' : 'blue'}>
                      {key}
                    </Tag>
                    {duplicateKeys.includes(key) && (
                      <Text type="warning" style={{ marginLeft: 8, fontSize: 12 }}>
                        (上書き)
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Space>
      </Modal>

      {/* ✅ Phase 1-1: Place Reference追加ダイアログ */}
      <Modal
        title="🔗 Place Reference追加"
        open={showPlaceRefAddDialog}
        onCancel={() => setShowPlaceRefAddDialog(false)}
        footer={[
          <Button key="close" onClick={() => setShowPlaceRefAddDialog(false)}>
            閉じる
          </Button>
        ]}
        width={600}
      >
        <Alert
          message="既存のPlace（現在未登録）から選択してください"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {allNodes
              .filter(n => n.data?.nodeType === 'place')
              .filter(n => !placeRefs.some((pr) => pr.ref === n.id))
              .map(place => (
                <Button
                  key={place.id}
                  block
                  style={{ 
                    textAlign: 'left',
                    height: 'auto',
                    padding: '12px'
                  }}
                  onClick={() => {
                    setPlaceRefs([...placeRefs, {id: '', ref :place.id}]);
                    setShowPlaceRefAddDialog(false);
                    setHasChanges(true);
                    message.success('Place Referenceを追加しました');
                  }}
                >
                  <div>
                    <Text strong>{place.id}</Text>
                    <br />
                    <Text type="secondary">
                      {place.data?.name || '(名前なし)'} | {place.data?.placeType}
                    </Text>
                  </div>
                </Button>
              ))}
            
            {allNodes
              .filter(n => n.data?.nodeType === 'place')
              .filter(n => !placeRefs.some((pr) => pr.ref === n.id))
              .length === 0 && (
              <Alert
                message="追加可能なPlaceがありません"
                description="すべてのPlaceが既に登録されているか、Placeが存在しません"
                type="warning"
                showIcon
              />
            )}
          </Space>
        </div>
      </Modal>
    </Modal>
  );
};

export default TemplateEditorDialog;
