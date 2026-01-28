/**
 * TemplateEditorDialog - Template情報編集ダイアログ
 * 
 * NestedPropertyEditorの全機能を網羅的に実装：
 * - attributes（XML属性）管理
 * - elements（XML要素）管理
 * - children（子要素）管理
 * - propertyListType対応
 * - 展開/縮小
 * - 同階層コピー
 * 
 * @version 3.0.0 - Next.js + TypeScript + Ant Design v6版
 * @date 2025-12-23
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Node } from 'reactflow';
import {
  Modal,
  Button,
  Input,
  Typography,
  Space,
  Alert,
  Select,
  Form,
  Divider,
  Collapse,
  Tag,
  Flex,
  Spin
} from 'antd';
import {
  CloseOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ExperimentOutlined,
  SettingOutlined,
  BarChartOutlined,
  DownOutlined,
  RightOutlined,
  CloudDownloadOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  MinusOutlined,
  FileOutlined
} from '@ant-design/icons';
import useNamespaceOperations from '@/hooks/useNamespaceOperations';
import type { Folder, NamespaceData } from '@/types/format';

const { TextArea } = Input;
const { Title, Text } = Typography;

/**
 * NestedPropertyEditorのProps型定義
 */
interface NestedPropertyEditorProps {
  propertyData: PropertyData;
  propertyKey: string;
  level?: number;
  expandedNodes: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  onAddNestedChild: (parentKey: string, childTagName: string, specifiedKey: string) => void;
  onAddSameLevelCopy: (sourceKey: string, sourceData: PropertyData, newKey: string, level: number) => void;
  onUpdateNestedAttribute: (propertyKey: string, attrName: string, attrValue: string) => void;
  onUpdateNestedElement: (propertyKey: string, elemName: string, elemValue: string) => void;
  onDeleteNestedAttribute: (propertyKey: string, attrName: string) => void;
  onDeleteNestedElement: (propertyKey: string, elemName: string) => void;
  onDeleteProperty: (propertyKey: string) => void;
  forceRenderKey: number;
}

/**
 * NestedPropertyEditor - ネスト構造プロパティ編集
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
  const [childKey, setChildKey] = useState('');
  const [copyKey, setCopyKey] = useState('');

  const nodeId = useMemo(() => propertyKey, [propertyKey]);
  const isExpanded = useMemo(() => expandedNodes.has(nodeId), [expandedNodes, nodeId]);

  const hasChildren = useMemo(() => {
    const children = propertyData.children;
    const parentXsiType = propertyData.attributes?.['xsi:type'] || '';
    const isParentPropertyListType = parentXsiType === 'propertyListType';
    const hasValidChildren = children && Array.isArray(children) && children.length > 0;
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
    <div style={{ marginLeft: `${indentLevel}px`, marginBottom: 8 }}>
      <div style={{
        border: `2px solid ${level === 0 ? '#007bff' : '#6c757d'}`,
        borderRadius: 8,
        padding: 8,
        background: level % 2 === 0 ? '#f8f9fa' : '#ffffff'
      }}>
        {/* ヘッダー */}
        <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
          <Flex align="center" gap="small">
            {hasChildren && (
              <Button
                type="text"
                size="small"
                icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                onClick={() => onToggleExpanded(nodeId)}
              />
            )}
            <Text strong>{propertyData.tagName || 'property'}: {propertyKey}</Text>
            <Tag>{`Level ${level}`}</Tag>
            {propertyData.attributes?.['xsi:type'] && (
              <Tag color={propertyData.attributes['xsi:type'] === 'propertyListType' ? 'blue' : 'default'}>
                {propertyData.attributes['xsi:type']}
              </Tag>
            )}
          </Flex>

          {/* 操作ボタン */}
          <Space size="small">
            <Button size="small" type="primary" onClick={() => setShowAttributeAddModal(true)}>
              ➕ 属性
            </Button>
            <Button size="small" type="primary" onClick={() => setShowElementAddModal(true)}>
              ➕ 要素
            </Button>
            <Button size="small" onClick={() => setShowChildAddModal(true)}>
              ➕ 子要素
            </Button>
            <Button size="small" onClick={() => setShowCopyModal(true)}>
              📋 コピー
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                if (window.confirm(`プロパティ「${propertyKey}」を削除しますか？`)) {
                  onDeleteProperty(propertyKey);
                }
              }}
            />
          </Space>
        </Flex>

        {/* 属性セクション */}
        {hasAttributes && (
          <div style={{ marginBottom: 8 }}>
            <Text type="success" strong style={{ display: 'block', marginBottom: 4 }}>
              📋 属性
            </Text>
            {Object.entries(propertyData.attributes).map(([attrName, attrValue]) => (
              <Flex key={attrName} align="center" gap="small" style={{ marginBottom: 4 }}>
                <Text style={{ minWidth: 100 }}>{attrName}:</Text>
                <Input
                  size="small"
                  value={attrValue || ''}
                  onChange={(e) => onUpdateNestedAttribute(propertyKey, attrName, e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => onDeleteNestedAttribute(propertyKey, attrName)}
                />
              </Flex>
            ))}
          </div>
        )}

        {/* 要素セクション */}
        {hasElements && (
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" strong style={{ display: 'block', marginBottom: 4 }}>
              📄 要素
            </Text>
            {Object.entries(propertyData.elements).map(([elemName, elemValue]) => (
              <Flex key={elemName} align="center" gap="small" style={{ marginBottom: 4 }}>
                <Text style={{ minWidth: 100 }}>{elemName}:</Text>
                <Input
                  size="small"
                  value={elemValue || ''}
                  onChange={(e) => onUpdateNestedElement(propertyKey, elemName, e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => onDeleteNestedElement(propertyKey, elemName)}
                />
              </Flex>
            ))}
          </div>
        )}

        {/* 子要素セクション */}
        {hasChildren && isExpanded && (
          <div style={{ marginTop: 8 }}>
            <Text strong style={{ display: 'block', marginBottom: 4, color: '#6f42c1' }}>
              🌿 子要素 ({propertyData.children?.length || 0}件)
            </Text>
            {propertyData.children.map((child, index) => {
              const childKeyValue = child.key || `${child.tagName || 'child'}_${index}`;
              return (
                <NestedPropertyEditor
                  key={`${childKeyValue}_${index}_${forceRenderKey}`}
                  propertyData={child}
                  propertyKey={childKeyValue}
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

      {/* 属性追加モーダル */}
      <Modal
        open={showAttributeAddModal}
        onCancel={() => setShowAttributeAddModal(false)}
        title="➕ 属性追加"
        onOk={() => {
          if (newAttributeName.trim() && newAttributeValue.trim()) {
            onUpdateNestedAttribute(propertyKey, newAttributeName.trim(), newAttributeValue.trim());
            setNewAttributeName('');
            setNewAttributeValue('');
            setShowAttributeAddModal(false);
          }
        }}
      >
        <Form layout="vertical">
          <Form.Item label="属性名">
            <Select
              value={newAttributeName}
              onChange={(value) => {
                setNewAttributeName(value);
                if (value === 'xsi:type' && !newAttributeValue) {
                  setNewAttributeValue('stringType');
                }
              }}
              options={[
                { label: 'xsi:type (MaiML型定義)', value: 'xsi:type' },
                { label: 'units (単位)', value: 'units' },
                { label: 'formatString (書式文字列)', value: 'formatString' },
                { label: 'scaleFactor (スケール係数)', value: 'scaleFactor' },
                { label: 'key (キー)', value: 'key' },
                { label: 'id (ID)', value: 'id' },
                { label: 'ref (参照)', value: 'ref' },
              ]}
            />
          </Form.Item>
          
          {newAttributeName === 'xsi:type' ? (
            <Form.Item label="MaiML Property Type">
              <Select
                value={newAttributeValue}
                onChange={setNewAttributeValue}
                showSearch
                optionFilterProp="label"
              >
                <Select.OptGroup label="Simple Types">
                  {MAIML_PROPERTY_TYPES.filter(t => t.category === 'Simple').map(type => (
                    <Select.Option key={type.value} value={type.value} label={type.label}>
                      {type.label}
                    </Select.Option>
                  ))}
                </Select.OptGroup>
                <Select.OptGroup label="List Types">
                  {MAIML_PROPERTY_TYPES.filter(t => t.category === 'List').map(type => (
                    <Select.Option key={type.value} value={type.value} label={type.label}>
                      {type.label}
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              </Select>
            </Form.Item>
          ) : (
            <Form.Item label="属性値">
              <Input
                value={newAttributeValue}
                onChange={(e) => setNewAttributeValue(e.target.value)}
                placeholder="例: mol/L, 1.0, true"
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 要素追加モーダル */}
      <Modal
        open={showElementAddModal}
        onCancel={() => setShowElementAddModal(false)}
        title="➕ 要素追加"
        onOk={() => {
          if (newElementName.trim() && newElementValue.trim()) {
            onUpdateNestedElement(propertyKey, newElementName.trim(), newElementValue.trim());
            setNewElementName('');
            setNewElementValue('');
            setShowElementAddModal(false);
          }
        }}
      >
        <Form layout="vertical">
          <Form.Item label="要素名">
            <Input
              value={newElementName}
              onChange={(e) => setNewElementName(e.target.value)}
              placeholder="例: value, description"
            />
          </Form.Item>
          <Form.Item label="要素値">
            <TextArea
              value={newElementValue}
              onChange={(e) => setNewElementValue(e.target.value)}
              placeholder="例: 3.5, Sample description"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 子要素追加モーダル */}
      <Modal
        open={showChildAddModal}
        onCancel={() => setShowChildAddModal(false)}
        title="➕ 子要素追加"
        onOk={() => {
          if (childKey.trim() && newChildTagName.trim()) {
            onAddNestedChild(propertyKey, newChildTagName.trim(), childKey.trim());
            setChildKey('');
            setNewChildTagName('property');
            setShowChildAddModal(false);
          }
        }}
      >
        <Alert
          title={`親要素: ${propertyKey} | 現在の子要素数: ${propertyData.children?.length || 0}件`}
          type="info"
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical">
          <Form.Item label="要素キー（必須）">
            <Input
              value={childKey}
              onChange={(e) => setChildKey(e.target.value)}
              placeholder="例: wavelength, concentration, temperature"
            />
          </Form.Item>
          <Form.Item label="タグ名">
            <Select
              value={newChildTagName}
              onChange={setNewChildTagName}
              options={[
                { label: 'property', value: 'property' },
                { label: 'content', value: 'content' },
                { label: 'parameter', value: 'parameter' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 同階層コピーモーダル */}
      <Modal
        open={showCopyModal}
        onCancel={() => {
          setShowCopyModal(false);
          setCopyKey('');
        }}
        title="📋 同階層コピー"
        onOk={() => {
          if (copyKey.trim()) {
            onAddSameLevelCopy(propertyKey, propertyData, copyKey.trim(), level);
            setCopyKey('');
            setShowCopyModal(false);
          }
        }}
      >
        <Alert
          title={`コピー元: ${propertyKey}`}
          type="info"
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical">
          <Form.Item label="新しいキー名">
            <Input
              value={copyKey}
              onChange={(e) => setCopyKey(e.target.value)}
              placeholder={`例: ${propertyKey}_copy`}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

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

/**
 * プロパティデータの型定義
 */
interface PropertyData {
  key: string;
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, string>;
  children: PropertyData[];
}

/**
 * TemplateEditorDialogのProps型定義
 */
export interface TemplateEditorDialogProps {
  open: boolean;
  onClose: () => void;
  node: Node | null;
  onSave: (updatedNode: Node) => void;
  allNodes?: Node[];
  // フォーマット管理統合用
  sourceContext?: 'project' | 'format';  // デフォルト: 'project'
  editingFileName?: string;              // フォーマット管理から編集時のファイル名
}

/**
 * TemplateEditorDialog - メインコンポーネント
 */
const TemplateEditorDialog: React.FC<TemplateEditorDialogProps> = ({
  open,
  onClose,
  node,
  onSave,
  allNodes = [],
  // フォーマット管理統合用
  sourceContext = 'project',
  editingFileName
}) => {
  // Phase 3.1: 基本情報管理
  const [uuid, setUuid] = useState('');
  const [templateId, setTemplateId] = useState(''); // 🆕 Phase 5-3: Template ID管理
  const [maimlId, setMaimlId] = useState(''); // 🆕 Phase 5-4: MaiML ID属性管理
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [insertion, setInsertion] = useState({ uri: '', hash: '', format: '' });
  
  // Properties管理
  const [properties, setProperties] = useState<Record<string, PropertyData>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPropertyKey, setNewPropertyKey] = useState('');
  const [newPropertyTagName, setNewPropertyTagName] = useState('property');
  
  // Bug Fix: V1のforceRenderKeyパターンを適用
  const [forceRenderKey, setForceRenderKey] = useState(0);

  // Contents管理（ResultTemplateのみ）
  const [contents, setContents] = useState<Record<string, PropertyData>>({});
  const [expandedContentNodes, setExpandedContentNodes] = useState<Set<string>>(new Set());
  const [showContentAddModal, setShowContentAddModal] = useState(false);
  const [newContentKey, setNewContentKey] = useState('');
  const [newContentTagName, setNewContentTagName] = useState('content');
  
  // Bug Fix: V1のforceRenderKeyパターンを適用（Contents用）
  const [forceContentRenderKey, setForceContentRenderKey] = useState(0);

  // 🆕 Phase 5-1: PlaceReferences管理用のState
  const [placeRefs, setPlaceRefs] = useState<string[]>([]);
  const [showPlaceRefAddModal, setShowPlaceRefAddModal] = useState(false);
  const [selectedPlaceToAdd, setSelectedPlaceToAdd] = useState<string | null>(null);

  // 🆕 名前空間機能用のState
  const [showNamespaceDialog, setShowNamespaceDialog] = useState(false);
  const [selectedNamespaceFolder, setSelectedNamespaceFolder] = useState('');
  const [selectedNamespaceFile, setSelectedNamespaceFile] = useState<string | null>(null);
  const [namespaceData, setNamespaceData] = useState<NamespaceData | null>(null);
  const [namespaceImportMode, setNamespaceImportMode] = useState<'replace_all_properties' | 'replace_all_contents'>('replace_all_properties');
  const [expandedNamespaceFolders, setExpandedNamespaceFolders] = useState<Set<string>>(new Set());

  // 🆕 名前空間機能用のフック
  const {
    namespaceFiles,
    s3FolderStructure,
    isLoadingFolderStructure,
    loadS3FolderStructure,
    loadNamespaceFilesFromS3Folder,
    analyzeNamespaceFile
  } = useNamespaceOperations();

  // ダイアログタイトルと表示制御をuseEffectより前に計算
  const templateType = useMemo(() => {
    if (!node) return 'Template';
    return node.data.placeType === 'material' ? 'MaterialTemplate' :
           node.data.placeType === 'condition' ? 'ConditionTemplate' :
           'ResultTemplate';
  }, [node]);

  const templateIcon = useMemo(() => {
    if (!node) return <ExperimentOutlined />;
    return node.data.placeType === 'material' ? <ExperimentOutlined /> :
           node.data.placeType === 'condition' ? <SettingOutlined /> :
           <BarChartOutlined />;
  }, [node]);

  const dialogTitle = useMemo(() => {
    return `${templateType}を編集`;
  }, [templateType]);

  const showBasicInfo = useMemo(() => sourceContext !== 'format', [sourceContext]);
  const showInsertionInfo = useMemo(() => sourceContext !== 'format', [sourceContext]);

  // 🆕 Phase 5-1: 利用可能なPlace一覧を計算
  const availablePlaces = useMemo(() => {
    return allNodes
      .filter(n => n.data.nodeType === 'place')
      .filter(n => !placeRefs.includes(n.id))
      .map(n => ({
        id: n.id,
        name: n.data.name || n.data.label || n.id
      }));
  }, [allNodes, placeRefs]);

  // 🆕 Phase 5-1: 参照中のPlace情報を取得
  const referencedPlaces = useMemo(() => {
    return placeRefs
      .map(placeId => {
        const placeNode = allNodes.find(n => n.id === placeId);
        return {
          id: placeId,
          name: placeNode?.data.name || placeNode?.data.label || placeId,
          exists: !!placeNode
        };
      });
  }, [allNodes, placeRefs]);

  // 🆕 Phase 5-2: 継承元テンプレートを取得
  const inheritedTemplate = useMemo(() => {
    const templateRefId = node?.data?.templateRefId;
    if (!templateRefId) return null;
    
    return allNodes.find(n => {
      const template = n.data?.templateRef || n.data?.template;
      return template?.id === templateRefId || template?.uuid === templateRefId;
    });
  }, [node, allNodes]);

  // 🆕 Phase 5-2: 継承元情報を抽出
  const inheritedInfo = useMemo(() => {
    if (!inheritedTemplate) return null;
    
    const template = inheritedTemplate.data?.templateRef || inheritedTemplate.data?.template;
    
    return {
      name: template?.name || inheritedTemplate.data?.name || '名称未設定',
      description: template?.description || inheritedTemplate.data?.description || '',
      uuid: template?.uuid || '',
      properties: template?.properties || {},
      contents: template?.contents || {},
      nodeId: inheritedTemplate.id,
      nodeType: inheritedTemplate.data?.nodeType,
      placeType: inheritedTemplate.data?.placeType
    };
  }, [inheritedTemplate]);

  // 🆕 Phase 5-2: 継承元情報表示制御
  const showInheritedInfo = useMemo(() => {
    // フォーマット管理から遷移した場合は非表示
    if (sourceContext === 'format') return false;
    
    // 継承元が存在する場合のみ表示
    return !!inheritedTemplate && !!inheritedInfo;
  }, [sourceContext, inheritedTemplate, inheritedInfo]);

  // 🆕 Phase 5-2: 継承元プロパティ表示用のState
  const [showInheritedProperties, setShowInheritedProperties] = useState(false);

  // 🆕 Phase 5-3: Template ID重複チェック
  const isTemplateIdDuplicate = useCallback((id: string): boolean => {
    if (!id || id === node?.id) return false;
    
    return allNodes.some(n => {
      // 自分自身は除外
      if (n.id === node?.id) return false;
      
      const template = n.data?.templateRef || n.data?.template;
      return template?.id === id;
    });
  }, [allNodes, node]);

  // 🆕 Template ID自動生成ハンドラー
  const handleGenerateTemplateId = useCallback(() => {
    if (!node) return;
    
    // テンプレートタイプから接頭辞を決定
    const prefix = node.data.placeType === 'material' ? 'material_template' :
                   node.data.placeType === 'condition' ? 'condition_template' :
                   'result_template';
    
    // 既存のTemplate IDから最大連番を取得
    const existingIds = allNodes
      .map(n => {
        const template = n.data?.templateRef || n.data?.template;
        return template?.id || '';
      })
      .filter(id => id.startsWith(prefix + '_'))
      .map(id => {
        const match = id.match(new RegExp(`${prefix}_(\\d+)$`));
        return match ? parseInt(match[1]) : 0;
      });
    
    const maxNumber = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nextNumber = maxNumber + 1;
    const newTemplateId = `${prefix}_${String(nextNumber).padStart(3, '0')}`;
    
    setTemplateId(newTemplateId);
    console.log('🆔 [TemplateEditor] Template ID自動生成:', newTemplateId);
  }, [node, allNodes]);

  // 🆕 MaiML ID自動生成ハンドラー
  const handleGenerateMaimlId = useCallback(() => {
    if (!node) return;
    
    // テンプレートタイプから接頭辞を決定
    const prefix = node.data.placeType === 'material' ? 'mat' :
                   node.data.placeType === 'condition' ? 'cond' :
                   'res';
    
    // 既存のMaiML IDから最大連番を取得
    const existingIds = allNodes
      .map(n => {
        const template = n.data?.templateRef || n.data?.template;
        return template?.maimlId || '';
      })
      .filter(id => id.startsWith(prefix + '_'))
      .map(id => {
        const match = id.match(new RegExp(`${prefix}_(\\d+)$`));
        return match ? parseInt(match[1]) : 0;
      });
    
    const maxNumber = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nextNumber = maxNumber + 1;
    const newMaimlId = `${prefix}_${String(nextNumber).padStart(3, '0')}`;
    
    setMaimlId(newMaimlId);
    console.log('🆔 [TemplateEditor] MaiML ID自動生成:', newMaimlId);
  }, [node, allNodes]);

  useEffect(() => {
    if (open && node) {
      console.log('🔍 [TemplateEditorDialog] ノードデータ読み込み:', node);
      
      // 基本情報の読み込み
      const templateRef = node.data.templateRef || node.data.template || {};
      setUuid(templateRef.uuid || '');
      setTemplateId(templateRef.id || ''); // 🆕 Phase 5-3: Template ID読み込み
      setMaimlId(templateRef.maimlId || ''); // 🆕 Phase 5-4: MaiML ID読み込み
      setName(templateRef.name || node.data.name || '');
      setDescription(templateRef.description || node.data.description || '');
      setInsertion(templateRef.insertion || { uri: '', hash: '', format: '' });
      
      // Propertiesの読み込み
      setProperties(templateRef.properties || {});
      setExpandedNodes(new Set());
      
      // Contentsの読み込み（ResultTemplateのみ）
      setContents(templateRef.contents || {});
      setExpandedContentNodes(new Set());
      
      // 🆕 Phase 5-1: PlaceReferencesの読み込み
      setPlaceRefs(templateRef.placeRefs || []);
    }
  }, [open, node]);

  if (!node) return null;

  // UUID生成ハンドラー
  const handleGenerateUuid = () => {
    const newUuid = `urn:uuid:${crypto.randomUUID()}`;
    setUuid(newUuid);
    console.log('🆔 [TemplateEditor] UUID生成:', newUuid);
  };

  // プロパティ追加ハンドラー
  const handleAddProperty = () => {
    if (!newPropertyKey.trim()) {
      alert('プロパティキーを入力してください');
      return;
    }

    if (properties[newPropertyKey.trim()]) {
      alert('同じキーのプロパティが既に存在します');
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
  };

  // Content追加ハンドラー
  const handleAddContent = () => {
    if (!newContentKey.trim()) {
      alert('Contentキーを入力してください');
      return;
    }

    if (contents[newContentKey.trim()]) {
      alert('同じキーのContentが既に存在します');
      return;
    }

    setContents({
      ...contents,
      [newContentKey.trim()]: {
        key: newContentKey.trim(),
        tagName: newContentTagName,
        attributes: {},
        elements: {},
        children: []
      }
    });

    setNewContentKey('');
    setNewContentTagName('content');
    setShowContentAddModal(false);
  };

  // NestedPropertyEditorハンドラー群
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

  const handleAddNestedChild = (parentKey: string, childTagName: string, specifiedKey: string) => {
    const childKey = specifiedKey.trim();
    
    // 再帰的検索で深いネストに対応
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
  };

  const handleDeleteProperty = (propertyKey: string) => {
    const updated = { ...properties };
    delete updated[propertyKey];
    setProperties(updated);
  };

  /**
   * 名前空間ダイアログを開く
   */
  const handleOpenNamespaceDialog = async () => {
    try {
      console.log('[名前空間] ダイアログオープン - S3フォルダ構造読み込み開始');
      await loadS3FolderStructure();
      setShowNamespaceDialog(true);
    } catch (error) {
      console.error('[名前空間] S3フォルダ構造読み込みエラー:', error);
      alert(`S3フォルダ構造の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  /**
   * 名前空間フォルダを選択
   */
  const handleSelectNamespaceFolder = async (folderPath: string) => {
    try {
      console.log('[名前空間] フォルダ選択:', folderPath);
      setSelectedNamespaceFolder(folderPath);
      await loadNamespaceFilesFromS3Folder(folderPath);
    } catch (error) {
      console.error('[名前空間] ファイル一覧取得エラー:', error);
      alert(`ファイル一覧の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  /**
   * 名前空間ファイルを選択
   */
  const handleSelectNamespaceFile = async (fileKey: string) => {
    try {
      console.log('[名前空間] ファイル選択:', fileKey);
      setSelectedNamespaceFile(fileKey);
      const parsedData = await analyzeNamespaceFile(fileKey);
      setNamespaceData(parsedData);
      console.log('[名前空間] ファイル解析完了:', parsedData);
    } catch (error) {
      console.error('[名前空間] ファイル解析エラー:', error);
      alert(`ファイルの解析に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  /**
   * 名前空間フォルダの展開/縮小を切り替え
   */
  const toggleNamespaceFolderExpansion = (folderPath: string) => {
    setExpandedNamespaceFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  /**
   * 名前空間テンプレートを取り込み
   */
  const handleImportNamespace = () => {
    if (!namespaceData) {
      alert('名前空間データが選択されていません');
      return;
    }

    try {
      console.log('[名前空間] インポート開始:', {
        mode: namespaceImportMode,
        hasProperties: !!namespaceData.properties,
        propertiesCount: Object.keys(namespaceData.properties || {}).length,
        hasContents: !!namespaceData.contents,
        contentsCount: Object.keys(namespaceData.contents || {}).length
      });

      // Propertiesセクションから呼ばれた場合
      if (namespaceImportMode === 'replace_all_properties') {
        const processedProperties: Record<string, PropertyData> = {};
        
        Object.entries(namespaceData.properties || {}).forEach(([key, propData]) => {
          processedProperties[key] = {
            ...propData,
            namespaceOrigin: true,
            namespaceSource: {
              uri: namespaceData.namespaceURI,
              hierarchyPath: namespaceData.hierarchyPath,
              importedAt: new Date().toISOString()
            }
          } as PropertyData;
        });
        
        setProperties(processedProperties);
        setForceRenderKey(Date.now());
        alert(`名前空間テンプレートをPropertiesに取り込みました（${Object.keys(processedProperties).length}件）`);
      }
      // Contentsセクションから呼ばれた場合
      else if (namespaceImportMode === 'replace_all_contents') {
        const processedContents: Record<string, PropertyData> = {};
        
        Object.entries(namespaceData.contents || {}).forEach(([key, contentData]) => {
          processedContents[key] = {
            ...contentData,
            namespaceOrigin: true,
            namespaceSource: {
              uri: namespaceData.namespaceURI,
              hierarchyPath: namespaceData.hierarchyPath,
              importedAt: new Date().toISOString()
            }
          } as PropertyData;
        });
        
        setContents(processedContents);
        setForceContentRenderKey(Date.now());
        alert(`名前空間テンプレートをContentsに取り込みました（${Object.keys(processedContents).length}件）`);
      }

      // 成功したらダイアログを閉じる
      setShowNamespaceDialog(false);
      setSelectedNamespaceFolder('');
      setSelectedNamespaceFile(null);
      setNamespaceData(null);
    } catch (error) {
      console.error('[名前空間] インポートエラー:', error);
      alert(`インポートに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 🆕 Phase 5-1: PlaceReference追加ハンドラー
  const handleAddPlaceRef = () => {
    if (!selectedPlaceToAdd) {
      alert('Placeを選択してください');
      return;
    }

    if (placeRefs.includes(selectedPlaceToAdd)) {
      alert('このPlaceは既に参照されています');
      return;
    }

    setPlaceRefs([...placeRefs, selectedPlaceToAdd]);
    setSelectedPlaceToAdd(null);
    setShowPlaceRefAddModal(false);
    console.log('📍 [TemplateEditor] PlaceRef追加:', selectedPlaceToAdd);
  };

  // 🆕 Phase 5-1: PlaceReference削除ハンドラー
  const handleRemovePlaceRef = (placeId: string) => {
    if (window.confirm(`Place参照「${placeId}」を削除しますか？`)) {
      setPlaceRefs(placeRefs.filter(id => id !== placeId));
      console.log('📍 [TemplateEditor] PlaceRef削除:', placeId);
    }
  };

  // 保存ハンドラー
  const handleSaveClick = () => {
    // 🆕 Phase 5-3: Template ID重複チェック
    if (templateId && isTemplateIdDuplicate(templateId)) {
      alert('このテンプレートIDは既に使用されています。別のIDを指定してください。');
      return;
    }

    const templateRef: Record<string, unknown> = {
      type: templateType,
      uuid: uuid,
      name: name,
      description: description,
      properties: properties
    };
    
    // 🆕 Phase 5-3: Template IDを追加
    if (templateId) {
      templateRef.id = templateId;
    }
    
    // 🆕 Phase 5-4: MaiML IDを追加
    if (maimlId) {
      templateRef.maimlId = maimlId;
    }
    
    // 継承元情報（href）を保持
    if (node.data.templateRef?.href) {
      templateRef.href = node.data.templateRef.href;
    }
    
    // MaterialTemplate・ResultTemplateの場合Insertionを追加
    if ((node.data.placeType === 'material' || node.data.placeType === 'result') && 
        (insertion.uri || insertion.hash || insertion.format)) {
      templateRef.insertion = insertion;
    }
    
    // ResultTemplateの場合のみContentsを追加
    if (node.data.placeType === 'result' && Object.keys(contents).length > 0) {
      templateRef.contents = contents;
    }
    
    // 🆕 Phase 5-1: PlaceReferencesを追加
    if (placeRefs.length > 0) {
      templateRef.placeRefs = placeRefs;
    }
    
    // 更新されたNodeオブジェクトを作成
    const updatedNode: Node = {
      ...node,
      data: {
        ...node.data,
        templateRef: templateRef,
        name: name,
        description: description
      }
    };
    
    console.log('💾 [TemplateEditor] 保存:', updatedNode);
    onSave(updatedNode);
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        title={
          <Flex align="center" gap="small">
            {templateIcon}
            <span>{dialogTitle}</span>
          </Flex>
        }
        width={1200}
        footer={[
          <Button key="cancel" onClick={onClose}>
            キャンセル
          </Button>,
          <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSaveClick}>
            保存
          </Button>,
        ]}
        styles={{
          body: { maxHeight: '70vh', overflowY: 'auto' }
        }}
      >
        <Text type="secondary">{node.data.name} | NestedPropertyEditor完全準拠版</Text>

        {/* Phase 3.1: 基本情報編集セクション - フォーマット管理から遷移時は非表示 */}
        {showBasicInfo && (
          <>
            <Divider />
          <div style={{ 
            marginBottom: 24, 
            padding: 16, 
            background: '#f8f9fa', 
            borderRadius: 8, 
            border: '2px solid #007bff' 
          }}>
            <Title level={5}>📋 基本情報</Title>
          
          {/* UUID */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>UUID</Text>
            <Flex gap="small">
              <Input
                value={uuid}
                onChange={(e) => setUuid(e.target.value)}
                placeholder="例: urn:uuid:12345678-1234-1234-1234-123456789abc"
                style={{ flex: 1 }}
              />
              <Button onClick={handleGenerateUuid}>🔄 生成</Button>
            </Flex>
          </div>

          {/* 🆕 Phase 5-3: Template ID */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Template ID</Text>
            <Flex gap="small">
              <Input
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                placeholder="例: material_template_base"
                style={{ flex: 1 }}
              />
              <Button onClick={handleGenerateTemplateId}>🔄 自動生成</Button>
            </Flex>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              ℹ️ テンプレート固有のIDです。ノードID（{node.id}）とは異なります。
            </Text>
            {templateId && isTemplateIdDuplicate(templateId) && (
              <Alert
                type="warning"
                message="このテンプレートIDは既に使用されています"
                description="別のIDを指定してください"
                style={{ marginTop: 8 }}
                showIcon
              />
            )}
          </div>

          {/* 🆕 Phase 5-4: MaiML ID (XML ID属性) */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>MaiML ID (XML ID属性)</Text>
            <Flex gap="small">
              <Input
                value={maimlId}
                onChange={(e) => setMaimlId(e.target.value)}
                placeholder="例: compound_base_001"
                style={{ flex: 1 }}
              />
              <Button onClick={handleGenerateMaimlId}>🔄 自動生成</Button>
            </Flex>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              ℹ️ XML内での要素参照に使用されるID属性です。ref属性で参照できます。
            </Text>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Name</Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: Sample Name"
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Description</Text>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: Sample description"
              rows={2}
            />
          </div>

          {/* Insertion（MaterialTemplate・ResultTemplateの場合表示） */}
          {(node.data.placeType === 'material' || node.data.placeType === 'result') && (
            <>
              <Divider />
              <Title level={5}>📎 Insertion情報</Title>
              
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>URI</Text>
                <Input
                  value={insertion.uri}
                  onChange={(e) => setInsertion({ ...insertion, uri: e.target.value })}
                  placeholder="例: s3://bucket/path/to/file"
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Hash</Text>
                <Input
                  value={insertion.hash}
                  onChange={(e) => setInsertion({ ...insertion, hash: e.target.value })}
                  placeholder="例: sha256:abc123..."
                />
              </div>

              <div>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Format</Text>
                <Input
                  value={insertion.format}
                  onChange={(e) => setInsertion({ ...insertion, format: e.target.value })}
                  placeholder="例: application/xml"
                />
              </div>
            </>
          )}
          </div>
          </>
        )}

        {/* 🆕 Phase 5-1: PlaceReferencesセクション */}
        {showBasicInfo && (
          <>
            <Divider />
            <div style={{ 
              marginBottom: 24, 
              padding: 16, 
              background: '#f0f5ff', 
              borderRadius: 8, 
              border: '2px solid #1890ff' 
            }}>
              <Title level={5}>📍 PlaceReferences (参照するPlace)</Title>
              
              <Button
                icon={<PlusOutlined />}
                onClick={() => setShowPlaceRefAddModal(true)}
                disabled={availablePlaces.length === 0}
                style={{ marginBottom: 16 }}
              >
                Place参照を追加
              </Button>

              {placeRefs.length === 0 ? (
                <Alert
                  title="参照しているPlaceがありません"
                  type="info"
                />
              ) : (
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    参照中のPlace一覧 ({placeRefs.length}件):
                  </Text>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {referencedPlaces.map((place) => (
                      <div
                        key={place.id}
                        style={{
                          padding: '8px 12px',
                          background: place.exists ? '#ffffff' : '#fff2e8',
                          border: place.exists ? '1px solid #d9d9d9' : '1px solid #faad14',
                          borderRadius: 4
                        }}
                      >
                        <Flex justify="space-between" align="center">
                          <div>
                            <Text strong>{place.id}</Text>
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              {place.name}
                            </Text>
                            {!place.exists && (
                              <Tag color="warning" style={{ marginLeft: 8 }}>
                                Place未存在
                              </Tag>
                            )}
                          </div>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemovePlaceRef(place.id)}
                          />
                        </Flex>
                      </div>
                    ))}
                  </Space>
                </div>
              )}
            </div>
          </>
        )}

        {/* 🆕 Phase 5-2: 継承元テンプレート情報セクション */}
        {showInheritedInfo && (
          <>
            <Divider />
            <div style={{ 
              marginBottom: 24, 
              padding: 16, 
              background: '#fff7e6', 
              borderRadius: 8, 
              border: '2px solid #faad14' 
            }}>
              <Title level={5}>📖 継承元テンプレート情報</Title>
              
              <div style={{ marginBottom: 12 }}>
                <Text strong>継承元: </Text>
                <Text>{inheritedInfo?.name}</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({inheritedInfo?.nodeId})
                </Text>
              </div>

              {inheritedInfo?.uuid && (
                <div style={{ marginBottom: 8 }}>
                  <Text strong>UUID: </Text>
                  <Text code style={{ fontSize: 12 }}>{inheritedInfo.uuid}</Text>
                </div>
              )}

              {inheritedInfo?.description && (
                <div style={{ marginBottom: 12 }}>
                  <Text strong>説明: </Text>
                  <Text type="secondary">{inheritedInfo.description}</Text>
                </div>
              )}

              <Divider style={{ margin: '12px 0' }} />

              <Button
                icon={showInheritedProperties ? <DownOutlined /> : <RightOutlined />}
                onClick={() => setShowInheritedProperties(!showInheritedProperties)}
                style={{ marginBottom: 12 }}
              >
                継承元プロパティを{showInheritedProperties ? '非表示' : '表示'}
                （{Object.keys(inheritedInfo?.properties || {}).length}件）
              </Button>

              {showInheritedProperties && inheritedInfo && (
                <div style={{
                  padding: 12,
                  background: '#ffffff',
                  borderRadius: 4,
                  border: '1px solid #d9d9d9',
                  maxHeight: 400,
                  overflowY: 'auto'
                }}>
                  <Text strong style={{ display: 'block', marginBottom: 8, color: '#8c8c8c' }}>
                    継承元プロパティ（参照専用）
                  </Text>

                  {Object.keys(inheritedInfo.properties || {}).length === 0 ? (
                    <Alert
                      title="継承元プロパティがありません"
                      type="info"
                    />
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      {Object.entries(inheritedInfo.properties || {}).map(([key, propData]) => {
                        const typedPropData = propData as PropertyData;
                        return (
                        <div
                          key={key}
                          style={{
                            padding: '8px 12px',
                            background: '#fafafa',
                            border: '1px solid #e8e8e8',
                            borderRadius: 4
                          }}
                        >
                          <Text strong>{key}</Text>
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            ({typedPropData.tagName || 'property'})
                          </Text>

                          {typedPropData.attributes && Object.keys(typedPropData.attributes).length > 0 && (
                            <div style={{ marginTop: 4, paddingLeft: 12 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                📋 {Object.entries(typedPropData.attributes)
                                  .map(([k, v]) => `${k}="${v}"`)
                                  .join(', ')}
                              </Text>
                            </div>
                          )}

                          {typedPropData.elements && Object.keys(typedPropData.elements).length > 0 && (
                            <div style={{ marginTop: 4, paddingLeft: 12 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                📄 {Object.entries(typedPropData.elements)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(', ')}
                              </Text>
                            </div>
                          )}

                          {typedPropData.children && typedPropData.children.length > 0 && (
                            <div style={{ marginTop: 4, paddingLeft: 12 }}>
                              <Tag color="blue" style={{ fontSize: 11 }}>
                                🌿 子要素 {typedPropData.children.length}件
                              </Tag>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </Space>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Properties編集セクション */}
        {showBasicInfo && <Divider />}
        <Title level={5}>🏷️ Properties</Title>
        
        <Flex gap="small" style={{ marginBottom: 16 }}>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setShowAddModal(true)}
            style={{ flex: 1 }}
          >
            新規プロパティを追加
          </Button>
          <Button
            icon={<CloudDownloadOutlined />}
            onClick={() => {
              setNamespaceImportMode('replace_all_properties');
              handleOpenNamespaceDialog();
            }}
            style={{ flex: 1 }}
          >
            📥 名前空間テンプレート取り込み
          </Button>
        </Flex>

        {Object.keys(properties).length === 0 ? (
          <Alert
            title="プロパティがありません。「新規プロパティを追加」ボタンから追加してください。"
            type="info"
          />
        ) : (
          <div>
            {Object.entries(properties).map(([key, data]) => (
                <NestedPropertyEditor
                  key={`${key}_${forceRenderKey}`}
                  propertyData={data}
                  propertyKey={key}
                  level={0}
                  expandedNodes={expandedNodes}
                  onToggleExpanded={handleToggleExpanded}
                  onAddNestedChild={handleAddNestedChild}
                  onAddSameLevelCopy={(sourceKey, sourceData, newKey, level) => {
                    if (properties[newKey]) {
                      alert('同じキーのプロパティが既に存在します');
                      return;
                    }
                    const deepCopy = JSON.parse(JSON.stringify(sourceData));
                    deepCopy.key = newKey;
                    setProperties({ ...properties, [newKey]: deepCopy });
                  }}
                  onUpdateNestedAttribute={handleUpdateNestedAttribute}
                  onUpdateNestedElement={handleUpdateNestedElement}
                  onDeleteNestedAttribute={handleDeleteNestedAttribute}
                  onDeleteNestedElement={handleDeleteNestedElement}
                  onDeleteProperty={handleDeleteProperty}
                  forceRenderKey={forceRenderKey}
                />
            ))}
          </div>
        )}

        {/* Contents編集セクション（ResultTemplateのみ） */}
        {node.data.placeType === 'result' && (
          <>
            <Divider />
            <Title level={5}>📊 Contents</Title>
            
            <Flex gap="small" style={{ marginBottom: 16 }}>
              <Button
                icon={<PlusOutlined />}
                onClick={() => setShowContentAddModal(true)}
                style={{ flex: 1 }}
              >
                新規Contentを追加
              </Button>
              <Button
                icon={<CloudDownloadOutlined />}
                onClick={() => {
                  setNamespaceImportMode('replace_all_contents');
                  handleOpenNamespaceDialog();
                }}
                style={{ flex: 1 }}
              >
                📥 名前空間テンプレート取り込み
              </Button>
            </Flex>

            {Object.keys(contents).length === 0 ? (
              <Alert
                title="Contentがありません。「新規Contentを追加」ボタンから追加してください。"
                type="info"
              />
            ) : (
              <div>
                {Object.entries(contents).map(([key, data]) => (
                <NestedPropertyEditor
                  key={`${key}_${forceContentRenderKey}`}
                  propertyData={data}
                  propertyKey={key}
                  level={0}
                  expandedNodes={expandedContentNodes}
                  onToggleExpanded={(nodeId) => {
                      setExpandedContentNodes(prev => {
                        const next = new Set(prev);
                        if (next.has(nodeId)) {
                          next.delete(nodeId);
                        } else {
                          next.add(nodeId);
                        }
                        return next;
                      });
                    }}
                    onAddNestedChild={(parentKey, childTagName, specifiedKey) => {
                      // Contentsハンドラー（Propertiesと同じロジック）
                      const childKey = specifiedKey.trim();
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
                      setContents(prevContents => {
                        const updated = JSON.parse(JSON.stringify(prevContents));
                        findAndUpdateParent(updated, parentKey);
                        return updated;
                      });
                      setForceContentRenderKey(Date.now());
                      setExpandedContentNodes(prev => {
                        const next = new Set(prev);
                        next.add(parentKey);
                        return next;
                      });
                    }}
                    onUpdateNestedAttribute={(contentKey, attrName, attrValue) => {
                      setContents(prevContents => {
                        const updated = JSON.parse(JSON.stringify(prevContents));
                        const findAndUpdate = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
                          if (obj[targetKey]) {
                            if (!obj[targetKey].attributes) {
                              obj[targetKey].attributes = {};
                            }
                            obj[targetKey].attributes[attrName] = attrValue;
                            return true;
                          }
                          for (const key in obj) {
                            if (obj[key] && obj[key].children) {
                              for (const child of obj[key].children) {
                                if (child.key === targetKey) {
                                  if (!child.attributes) {
                                    child.attributes = {};
                                  }
                                  child.attributes[attrName] = attrValue;
                                  return true;
                                }
                              }
                            }
                          }
                          return false;
                        };
                        findAndUpdate(updated, contentKey);
                        return updated;
                      });
                      setForceContentRenderKey(Date.now());
                    }}
                    onUpdateNestedElement={(contentKey, elemName, elemValue) => {
                      setContents(prevContents => {
                        const updated = JSON.parse(JSON.stringify(prevContents));
                        const findAndUpdate = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
                          if (obj[targetKey]) {
                            if (!obj[targetKey].elements) {
                              obj[targetKey].elements = {};
                            }
                            obj[targetKey].elements[elemName] = elemValue;
                            return true;
                          }
                          for (const key in obj) {
                            if (obj[key] && obj[key].children) {
                              for (const child of obj[key].children) {
                                if (child.key === targetKey) {
                                  if (!child.elements) {
                                    child.elements = {};
                                  }
                                  child.elements[elemName] = elemValue;
                                  return true;
                                }
                              }
                            }
                          }
                          return false;
                        };
                        findAndUpdate(updated, contentKey);
                        return updated;
                      });
                      setForceContentRenderKey(Date.now());
                    }}
                    onDeleteNestedAttribute={(contentKey, attrName) => {
                      setContents(prevContents => {
                        const updated = JSON.parse(JSON.stringify(prevContents));
                        if (updated[contentKey]?.attributes?.[attrName]) {
                          delete updated[contentKey].attributes[attrName];
                        }
                        return updated;
                      });
                      setForceContentRenderKey(Date.now());
                    }}
                    onDeleteNestedElement={(contentKey, elemName) => {
                      setContents(prevContents => {
                        const updated = JSON.parse(JSON.stringify(prevContents));
                        if (updated[contentKey]?.elements?.[elemName]) {
                          delete updated[contentKey].elements[elemName];
                        }
                        return updated;
                      });
                      setForceContentRenderKey(Date.now());
                    }}
                    onAddSameLevelCopy={(sourceKey, sourceData, newKey, level) => {
                      if (contents[newKey]) {
                        alert('同じキーのContentが既に存在します');
                        return;
                      }
                      const deepCopy = JSON.parse(JSON.stringify(sourceData));
                      deepCopy.key = newKey;
                      setContents({ ...contents, [newKey]: deepCopy });
                    }}
                    onDeleteProperty={(contentKey) => {
                      const updated = { ...contents };
                      delete updated[contentKey];
                      setContents(updated);
                    }}
                    forceRenderKey={forceContentRenderKey}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* プロパティ追加モーダル */}
      <Modal
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        title="新規プロパティ追加"
        onOk={handleAddProperty}
      >
        <Form layout="vertical">
          <Form.Item label="プロパティキー">
            <Input
              value={newPropertyKey}
              onChange={(e) => setNewPropertyKey(e.target.value)}
              placeholder="例: compound, concentration"
            />
          </Form.Item>
          <Form.Item label="タグ名">
            <Select
              value={newPropertyTagName}
              onChange={(value) => setNewPropertyTagName(value)}
              options={[
                { label: 'property', value: 'property' },
                { label: 'content', value: 'content' },
                { label: 'parameter', value: 'parameter' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 🆕 Phase 5-1: Place参照追加モーダル */}
      <Modal
        open={showPlaceRefAddModal}
        onCancel={() => {
          setShowPlaceRefAddModal(false);
          setSelectedPlaceToAdd(null);
        }}
        title="📍 Place参照を追加"
        onOk={handleAddPlaceRef}
      >
        <Form layout="vertical">
          <Form.Item label="参照するPlace">
            <Select
              value={selectedPlaceToAdd}
              onChange={(value) => setSelectedPlaceToAdd(value)}
              placeholder="Placeを選択してください"
              showSearch
              optionFilterProp="label"
            >
              {availablePlaces.map((place) => (
                <Select.Option key={place.id} value={place.id} label={place.name}>
                  <Flex justify="space-between" align="center">
                    <span>{place.id}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {place.name}
                    </Text>
                  </Flex>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          {availablePlaces.length === 0 && (
            <Alert
              title="利用可能なPlaceがありません"
              description="全てのPlaceが既に参照されているか、Placeが存在しません"
              type="info"
            />
          )}
        </Form>
      </Modal>

      {/* Content追加モーダル */}
      <Modal
        open={showContentAddModal}
        onCancel={() => setShowContentAddModal(false)}
        title="新規Content追加"
        onOk={handleAddContent}
      >
        <Form layout="vertical">
          <Form.Item label="Contentキー">
            <Input
              value={newContentKey}
              onChange={(e) => setNewContentKey(e.target.value)}
              placeholder="例: analysis_result, measurement_data"
            />
          </Form.Item>
          <Form.Item label="タグ名">
            <Select
              value={newContentTagName}
              onChange={(value) => setNewContentTagName(value)}
              options={[
                { label: 'content', value: 'content' },
                { label: 'property', value: 'property' },
                { label: 'parameter', value: 'parameter' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 名前空間テンプレート取り込みダイアログ */}
      <Modal
        open={showNamespaceDialog}
        onCancel={() => {
          setShowNamespaceDialog(false);
          setSelectedNamespaceFolder('');
          setSelectedNamespaceFile(null);
          setNamespaceData(null);
        }}
        title="📥 名前空間テンプレート取り込み"
        width={1000}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowNamespaceDialog(false);
              setSelectedNamespaceFolder('');
              setSelectedNamespaceFile(null);
              setNamespaceData(null);
            }}
          >
            キャンセル
          </Button>,
          <Button
            key="import"
            type="primary"
            disabled={!selectedNamespaceFile || !namespaceData}
            onClick={handleImportNamespace}
          >
            取り込み
          </Button>
        ]}
      >
        <div style={{ display: 'flex', gap: 16, height: 600 }}>
          {/* 左パネル: S3フォルダツリー */}
          <div style={{ 
            width: '40%', 
            borderRight: '1px solid #d9d9d9', 
            paddingRight: 16,
            overflowY: 'auto'
          }}>
            <Title level={5}>📁 S3フォルダ構造</Title>
            
            {isLoadingFolderStructure ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin tip="フォルダ構造を読み込み中...">
              <div style={{ minHeight: 100 }} />
                  <div style={{ minHeight: 100 }} />
                </Spin>
              </div>
            ) : s3FolderStructure.length === 0 ? (
              <Alert
                title="フォルダが見つかりません"
                description="S3に名前空間フォルダがありません"
                type="info"
              />
            ) : (
              <div>
                {renderFolderTree(s3FolderStructure, 0)}
              </div>
            )}
          </div>

          {/* 右パネル: ファイル一覧とプレビュー */}
          <div style={{ width: '60%', overflowY: 'auto' }}>
            {!selectedNamespaceFolder ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
                <FolderOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>左のフォルダツリーからフォルダを選択してください</div>
              </div>
            ) : (
              <>
                <Title level={5}>📄 XMLファイル一覧</Title>
                
                {namespaceFiles.length === 0 ? (
                  <Alert
                    title="ファイルが見つかりません"
                    description="このフォルダにXMLファイルがありません"
                    type="info"
                  />
                ) : (
                  <div style={{ marginBottom: 24 }}>
                    {namespaceFiles.map((file) => (
                      <div
                        key={file.key}
                        onClick={() => handleSelectNamespaceFile(file.key)}
                        style={{
                          padding: 12,
                          marginBottom: 8,
                          border: selectedNamespaceFile === file.key ? '2px solid #1890ff' : '1px solid #d9d9d9',
                          borderRadius: 4,
                          cursor: 'pointer',
                          backgroundColor: selectedNamespaceFile === file.key ? '#e6f7ff' : '#fff',
                          transition: 'all 0.3s'
                        }}
                      >
                        <Flex align="center" gap="small">
                          <FileOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                          <div style={{ flex: 1 }}>
                            <Text strong>{file.name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''} | {file.lastModified || ''}
                            </Text>
                          </div>
                        </Flex>
                      </div>
                    ))}
                  </div>
                )}

                {/* プレビュー表示 */}
                {selectedNamespaceFile && namespaceData && (
                  <div style={{
                    marginTop: 24,
                    padding: 16,
                    background: '#f0f2f5',
                    borderRadius: 8
                  }}>
                    <Title level={5}>🔍 プレビュー</Title>
                    
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>名前空間URI:</Text>
                      <br />
                      <Text code style={{ fontSize: 12 }}>{namespaceData.namespaceURI || 'なし'}</Text>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <Text strong>階層パス:</Text>
                      <br />
                      <Text code style={{ fontSize: 12 }}>{namespaceData.hierarchyPath || 'なし'}</Text>
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    <Flex gap="large">
                      <div>
                        <Text type="success" strong>Properties:</Text>
                        <br />
                        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
                          {Object.keys(namespaceData.properties || {}).length}
                        </Text>
                        <Text type="secondary"> 件</Text>
                      </div>
                      <div>
                        <Text type="warning" strong>Contents:</Text>
                        <br />
                        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
                          {Object.keys(namespaceData.contents || {}).length}
                        </Text>
                        <Text type="secondary"> 件</Text>
                      </div>
                    </Flex>

                    {namespaceImportMode === 'replace_all_properties' && (
                      <Alert
                        title="Propertiesセクションに取り込まれます"
                        type="info"
                        style={{ marginTop: 12 }}
                      />
                    )}
                    {namespaceImportMode === 'replace_all_contents' && (
                      <Alert
                        title="Contentsセクションに取り込まれます"
                        type="info"
                        style={{ marginTop: 12 }}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );

  /**
   * フォルダツリーを再帰的にレンダリング
   */
  function renderFolderTree(folders: Folder[], level: number): React.ReactNode {
    return folders.map((folder) => {
      const isExpanded = expandedNamespaceFolders.has(folder.path);
      const isSelected = selectedNamespaceFolder === folder.path;
      const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;

      return (
        <div key={folder.path} style={{ marginLeft: level * 16 }}>
          <div
            onClick={() => handleSelectNamespaceFolder(folder.path)}
            style={{
              padding: '8px 12px',
              marginBottom: 4,
              border: isSelected ? '2px solid #1890ff' : '1px solid transparent',
              borderRadius: 4,
              cursor: 'pointer',
              backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
              transition: 'all 0.3s'
            }}
          >
            <Flex align="center" gap="small">
              {hasSubfolders && (
                <Button
                  type="text"
                  size="small"
                  icon={isExpanded ? <MinusOutlined /> : <PlusOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNamespaceFolderExpansion(folder.path);
                  }}
                  style={{ padding: 0, minWidth: 24 }}
                />
              )}
              {isExpanded ? (
                <FolderOpenOutlined style={{ fontSize: 16, color: '#faad14' }} />
              ) : (
                <FolderOutlined style={{ fontSize: 16, color: '#faad14' }} />
              )}
              <Text strong={isSelected}>{folder.name}</Text>
              {folder.xmlFileCount > 0 && (
                <Tag color="blue" style={{ marginLeft: 'auto' }}>
                  {folder.xmlFileCount}
                </Tag>
              )}
            </Flex>
          </div>

          {isExpanded && hasSubfolders && renderFolderTree(folder.subfolders, level + 1)}
        </div>
      );
    });
  }
};

export default TemplateEditorDialog;
