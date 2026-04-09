/**
 * NestedPropertyEditor - ネスト構造プロパティ編集（独立版）
 * 
 * TemplateEditorDialog.tsxから分離
 * 
 * @version 2.0.0
 * @date 2026-02-13
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  AutoComplete,
  Button,
  Input,
  InputNumber,
  Alert,
  Space,
  Typography,
  Select,
  Tag,
  message,
  Modal,
  App,
  DatePicker,
  Tooltip,
} from 'antd';
import {
  CloseOutlined,
  DownOutlined,
  RightOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  validateByXsiType,
  isIntegerXsiType,
  isUnsignedIntXsiType,
  isListXsiType,
} from '@/utils/xsiTypeValidator';
import { getAllowedAttributeNames } from '@/utils/xsiTypeAttributes';
import type { AttributeRecord } from '@/services/masterApiService';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ===== 要素名の選択肢定数 =====

/**
 * Property / parameter 用の標準要素名選択肢
 *
 * ※ units / formatString / scaleFactor は XML 属性のため、ここには含めない
 *   （属性追加モーダルのプルダウンで対応）
 */
const PROPERTY_ELEMENT_OPTIONS = [
  { value: 'value', label: 'value（プロパティ値）⚡ 型に応じた入力欄' },
  { value: 'description', label: 'description（説明）' },
  { value: '__custom__', label: '🔧 その他（カスタム要素名を入力...）' },
] as const;

/** content 用の標準要素名選択肢（unit / formatString / scaleFactor は属性のため除外） */
const CONTENT_ELEMENT_OPTIONS = [
  { value: 'value', label: 'value（コンテンツ値）⚡ 型に応じた入力欄' },
  { value: 'description', label: 'description（説明）' },
  { value: '__custom__', label: '🔧 その他（カスタム要素名を入力...）' },
] as const;

/**
 * NamespaceSource型定義（名前空間取り込み元情報）
 */
export interface NamespaceSource {
  fileName?: string;
  uri?: string;
  hierarchyPath?: string;
  importedAt?: string;
}

/**
 * PropertyData型定義（NestedPropertyEditor用）
 */
export interface PropertyData {
  key: string;
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, string>;
  children: PropertyData[];
  // ✅ Reference版から統合: 名前空間取り込みメタデータ
  namespaceOrigin?: boolean;
  namespaceSource?: NamespaceSource;
}

/**
 * NestedPropertyEditor Props
 */
export interface NestedPropertyEditorProps {
  propertyData: PropertyData;
  propertyKey: string;
  level?: number;
  expandedNodes: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  onAddNestedChild: (parentKey: string, childTagName: string, specifiedKey?: string) => void;
  onAddSameLevelCopy: (sourceData: PropertyData, newKey: string) => void;
  onUpdateNestedAttribute: (propertyKey: string, attrName: string, attrValue: string) => void;
  onUpdateNestedElement: (propertyKey: string, elemName: string, elemValue: string) => void;
  onDeleteNestedAttribute: (propertyKey: string, attrName: string) => void;
  onDeleteNestedElement: (propertyKey: string, elemName: string) => void;
  onDeleteProperty: (propertyKey: string) => void;
  forceRenderKey: number;
  /** Attributeマスタデータ（親コンポーネントで取得してPropsとして渡す） */
  attributeRecords?: AttributeRecord[];
}

// ===== 固定属性名（Attributeマスタ選択肢から除外） =====
// units / formatString / scaleFactor は固定属性グループで表示するためマスタ属性から除外
const FIXED_ATTRIBUTE_NAMES = new Set([
  'key', 'xsi:type', 'id', 'ref', 'axis', 'size',
  'units', 'formatString', 'scaleFactor',
]);

/**
 * マスタ登録が必須の既知固定属性
 * - 属性名は xsi:type に応じて選択肢に常に表示する（DB登録有無に関わらず）
 * - 属性値は DB（Attributeマスタ）に登録されている値のみ選択可能
 * - DB に値が登録されていない場合は保存不可（エラー表示）
 */
const REQUIRED_MASTER_ATTRIBUTES = new Set(['units', 'formatString', 'scaleFactor']);

/**
 * マスタ提案あり・手入力許可の属性（content 専用）
 * - attribute_master に値が登録されていれば候補としてドロップダウン表示
 * - 登録がない場合でも自由テキスト入力が可能（エラーにしない）
 * - units/formatString/scaleFactor とは異なりマスタ必須ではない
 */
const OPTIONAL_MASTER_ATTRIBUTES = new Set(['axis', 'size']);

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
  forceRenderKey,
  attributeRecords = [],
}) => {
  const { modal } = App.useApp();
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

  // Phase 2-A-1: カスタム要素名用State（要素追加モーダル用・維持）
  const [customElementName, setCustomElementName] = useState('');

  // ===== Attributeマスタ由来の選択肢を計算 =====

  /** マスタ由来の属性名一覧（固定属性名を除く・重複除去済み） */
  const masterAttributeNames = useMemo<string[]>(() => {
    const names = new Set<string>();
    for (const record of attributeRecords) {
      if (record.attributeName && !FIXED_ATTRIBUTE_NAMES.has(record.attributeName)) {
        names.add(record.attributeName);
      }
    }
    return Array.from(names).sort();
  }, [attributeRecords]);

  /**
   * 選択中の属性名に対応する属性値の選択肢一覧
   * - xsi:type は専用Selectがあるため除外
   * - units / formatString / scaleFactor（REQUIRED_MASTER_ATTRIBUTES）はDBなしの場合でも
   *   属性名選択肢に表示するため、ここでは除外せず空配列を返す（エラー表示はUIで対応）
   * - マスタ属性グループはDBに登録されている属性名のみ表示
   */
  const masterAttributeValues = useMemo<Array<{ value: string; label: string }>>(() => {
    // xsi:type のみ除外（専用Selectがあるため）
    if (!newAttributeName || newAttributeName === 'xsi:type') return [];
    return attributeRecords
      .filter((r) => r.attributeName === newAttributeName)
      .map((r) => ({
        value: r.attributeValue,
        label: r.attributeRemark
          ? `${r.attributeValue}（${r.attributeRemark}）`
          : r.attributeValue,
      }));
  }, [attributeRecords, newAttributeName]);

  /** 現在選択中の属性名がマスタ由来かどうか */
  const isMasterAttribute = useMemo(
    () => !!newAttributeName && masterAttributeNames.includes(newAttributeName),
    [newAttributeName, masterAttributeNames]
  );

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
                modal.confirm({
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
        }}
        okButtonProps={{
          // REQUIRED_MASTER_ATTRIBUTES かつ DB に値がない場合はOKボタンを無効化
          disabled:
            !!newAttributeName &&
            REQUIRED_MASTER_ATTRIBUTES.has(newAttributeName) &&
            masterAttributeValues.length === 0,
        }}
        onOk={() => {
          const finalAttributeName = newAttributeName.trim();

          if (!finalAttributeName) {
            message.error('属性名を選択してください');
            return;
          }

          if (!newAttributeValue.trim()) {
            message.error('属性値を入力または選択してください');
            return;
          }

          onUpdateNestedAttribute(propertyKey, finalAttributeName, newAttributeValue.trim());
          setNewAttributeName('');
          setNewAttributeValue('');
          setShowAttributeAddModal(false);
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 属性名セレクト */}
          {(() => {
            const isContent = propertyData.tagName === 'content';
            const defaultXsiType = isContent ? 'contentDoubleListType' : 'stringType';
            // 現在の xsi:type に応じた許可属性一覧を取得
            const currentXsiType = propertyData.attributes?.['xsi:type'];
            const allowedAttrs = getAllowedAttributeNames(currentXsiType);
            // allowedAttrs === null → xsi:type 未設定（制限なし）
            // allowedAttrs === []   → units/formatString/scaleFactor を非表示
            // allowedAttrs = ['formatString'] → formatString のみ表示
            const showUnits       = allowedAttrs === null || allowedAttrs.includes('units');
            const showFormatString = allowedAttrs === null || allowedAttrs.includes('formatString');
            const showScaleFactor  = allowedAttrs === null || allowedAttrs.includes('scaleFactor');
            // 既に追加済みの属性は選択肢から除外
            const existingAttrNames = new Set(Object.keys(propertyData.attributes ?? {}));
            return (
              <Select
                style={{ width: '100%' }}
                placeholder="属性名を選択"
                value={newAttributeName || undefined}
                onChange={(value) => {
                  setNewAttributeName(value);
                  setNewAttributeValue('');
                  // xsi:type 選択時はデフォルト型を設定
                  if (value === 'xsi:type') {
                    setNewAttributeValue(defaultXsiType);
                  }
                }}
              >
                {/* 固定属性グループ */}
                <Select.OptGroup label="固定属性">
                  <Option value="xsi:type" disabled={existingAttrNames.has('xsi:type')}>
                    xsi:type（MaiML型定義）{existingAttrNames.has('xsi:type') ? '（設定済み）' : ''}
                  </Option>
                  <Option value="key" disabled={existingAttrNames.has('key')}>
                    key（キー・必須）{existingAttrNames.has('key') ? '（設定済み）' : ''}
                  </Option>
                  {isContent && <Option value="axis" disabled={existingAttrNames.has('axis')}>axis（軸名: x / y / z / time）{existingAttrNames.has('axis') ? '（設定済み）' : ''}</Option>}
                  {isContent && <Option value="size" disabled={existingAttrNames.has('size')}>size（データサイズ・整数）{existingAttrNames.has('size') ? '（設定済み）' : ''}</Option>}
                  {isContent && <Option value="id" disabled={existingAttrNames.has('id')}>id（XML ID）{existingAttrNames.has('id') ? '（設定済み）' : ''}</Option>}
                  {isContent && <Option value="ref" disabled={existingAttrNames.has('ref')}>ref（XML IDREF）{existingAttrNames.has('ref') ? '（設定済み）' : ''}</Option>}
                  {/* xsi:type に応じた追加属性（units / formatString / scaleFactor） */}
                  {showUnits && (
                    <Option value="units" disabled={existingAttrNames.has('units')}>
                      units（単位）{existingAttrNames.has('units') ? '（設定済み）' : ''}
                    </Option>
                  )}
                  {showFormatString && (
                    <Option value="formatString" disabled={existingAttrNames.has('formatString')}>
                      formatString（フォーマット文字列）{existingAttrNames.has('formatString') ? '（設定済み）' : ''}
                    </Option>
                  )}
                  {showScaleFactor && (
                    <Option value="scaleFactor" disabled={existingAttrNames.has('scaleFactor')}>
                      scaleFactor（スケールファクター）{existingAttrNames.has('scaleFactor') ? '（設定済み）' : ''}
                    </Option>
                  )}
                </Select.OptGroup>
                {/* マスタ属性グループ（Attributeマスタから動的生成・制限なし） */}
                {masterAttributeNames.length > 0 && (
                  <Select.OptGroup label="マスタ属性">
                    {masterAttributeNames.map((name) => (
                      <Option key={name} value={name} disabled={existingAttrNames.has(name)}>
                        {name}{existingAttrNames.has(name) ? '（設定済み）' : ''}
                      </Option>
                    ))}
                  </Select.OptGroup>
                )}
              </Select>
            );
          })()}

          {/* 属性値入力欄（属性名選択後に表示） */}
          {newAttributeName && (
            newAttributeName === 'xsi:type' ? (
              /* xsi:type → MaiML型Selectプルダウン */
              <Select
                style={{ width: '100%' }}
                placeholder="MaiML Property Type"
                value={newAttributeValue || undefined}
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
            ) : OPTIONAL_MASTER_ATTRIBUTES.has(newAttributeName) ? (
              /* axis / size → AutoComplete（マスタ候補提示 + 手入力許可） */
              <Space direction="vertical" style={{ width: '100%' }}>
                <AutoComplete
                  style={{ width: '100%' }}
                  placeholder={
                    newAttributeName === 'axis'
                      ? '軸名を入力（例: x / y / z / time）'
                      : 'データサイズを入力（例: 1024）'
                  }
                  value={newAttributeValue}
                  onChange={setNewAttributeValue}
                  options={masterAttributeValues.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  filterOption={(inputValue, option) =>
                    !inputValue ||
                    String(option?.value ?? '')
                      .toLowerCase()
                      .includes(inputValue.toLowerCase())
                  }
                />
                {masterAttributeValues.length > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    マスタに登録された候補を表示しています（手入力も可能です）
                  </Text>
                )}
              </Space>
            ) : masterAttributeValues.length > 0 ? (
              /* マスタ由来の属性値が存在する → 属性値Selectプルダウン（備考付き: "value（remark）"） */
              <Select
                style={{ width: '100%' }}
                placeholder="属性値を選択"
                value={newAttributeValue || undefined}
                onChange={setNewAttributeValue}
              >
                {masterAttributeValues.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            ) : REQUIRED_MASTER_ATTRIBUTES.has(newAttributeName) ? (
              /* units / formatString / scaleFactor でマスタ値が未登録 → 保存不可・エラー表示 */
              <Space direction="vertical" style={{ width: '100%' }}>
                <Select
                  style={{ width: '100%' }}
                  disabled
                  placeholder="マスタに値が登録されていません"
                />
                <Alert
                  type="error"
                  showIcon
                  message={`「${newAttributeName}」はマスタ登録が必要です`}
                  description="属性値がマスタに登録されていないため保存できません。システム管理者にお問い合わせください。"
                />
              </Space>
            ) : (
              /* その他の固定属性（key / id / ref）→ テキスト入力 */
              <Input
                placeholder="属性値を入力"
                value={newAttributeValue}
                onChange={(e) => setNewAttributeValue(e.target.value)}
              />
            )
          )}
        </Space>
      </Modal>

      {/* 要素追加モーダル */}
      <Modal
        title="➕ 要素追加"
        open={showElementAddModal}
        onCancel={() => {
          setShowElementAddModal(false);
          setNewElementName('');
          setNewElementValue('');
          setCustomElementName('');
        }}
        onOk={() => {
          // ✅ Phase 2-A-1: 最終要素名の決定
          const finalElementName =
            newElementName === '__custom__'
              ? customElementName.trim()
              : newElementName.trim();

          if (!finalElementName) {
            message.error('要素名を入力してください');
            return;
          }

          // ✅ Phase 2-A-2: value 要素かつ xsi:type が設定されている場合のみ型バリデーション
          const xsiType = propertyData.attributes?.['xsi:type'] ?? '';
          if (finalElementName === 'value' && xsiType) {
            const result = validateByXsiType(xsiType, newElementValue);
            if (!result.isValid) {
              message.error(result.errorMessage ?? '入力値が不正です');
              return;
            }
          }

          // propertyListType のとき value 要素は追加不可
          if (xsiType === 'propertyListType' && finalElementName === 'value') {
            message.error(
              'propertyListType には value 要素を追加できません。子要素（property）を追加してください。'
            );
            return;
          }

          if (!newElementValue.trim() && finalElementName !== 'value') {
            message.error('要素値を入力してください');
            return;
          }

          onUpdateNestedElement(propertyKey, finalElementName, newElementValue.trim());
          setNewElementName('');
          setNewElementValue('');
          setCustomElementName('');
          setShowElementAddModal(false);
        }}
      >
        {(() => {
          const xsiType = propertyData.attributes?.['xsi:type'] ?? '';
          const isContent = propertyData.tagName === 'content';
          const isPropertyListType = xsiType === 'propertyListType';
          const elementOptions = isContent ? CONTENT_ELEMENT_OPTIONS : PROPERTY_ELEMENT_OPTIONS;

          return (
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 要素名セレクト */}
              <Select
                placeholder="要素名を選択"
                value={newElementName || undefined}
                onChange={(val: string) => {
                  setNewElementName(val);
                  setNewElementValue('');
                  if (val === '__custom__') setCustomElementName('');
                }}
                style={{ width: '100%' }}
              >
                {elementOptions.map((opt) => (
                  <Option
                    key={opt.value}
                    value={opt.value}
                    disabled={isPropertyListType && opt.value === 'value'}
                  >
                    {opt.label}
                    {isPropertyListType && opt.value === 'value'
                      ? '（propertyListType には使用不可）'
                      : ''}
                  </Option>
                ))}
              </Select>

              {/* カスタム要素名入力欄 */}
              {newElementName === '__custom__' && (
                <Input
                  placeholder="カスタム要素名を入力（例: customField）"
                  value={customElementName}
                  onChange={(e) => setCustomElementName(e.target.value)}
                />
              )}

              {/* 要素値入力欄（要素名が確定した場合に表示） */}
              {newElementName && newElementName !== '__custom__' && (
                <>
                  {/* propertyListType の value 選択時は注意書きのみ */}
                  {isPropertyListType && newElementName === 'value' ? (
                    <Alert
                      type="warning"
                      message="propertyListType には value 要素は追加できません"
                      description="子要素（property）ボタンから子プロパティを追加してください。"
                      showIcon
                    />
                  ) : newElementName === 'value' && xsiType ? (
                    /* value 要素かつ xsi:type 設定あり → 型対応入力コンポーネント */
                    <ElementValueInput
                      xsiType={xsiType}
                      value={newElementValue}
                      onChange={setNewElementValue}
                    />
                  ) : (
                    /* value 以外の標準要素、または xsi:type 未設定の value → TextArea */
                    <TextArea
                      rows={3}
                      placeholder="要素値を入力"
                      value={newElementValue}
                      onChange={(e) => setNewElementValue(e.target.value)}
                    />
                  )}
                  {/* xsi:type のヘルプテキスト */}
                  {newElementName === 'value' && xsiType && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      xsi:type: <Tag>{xsiType}</Tag> に応じた入力欄が表示されています
                    </Text>
                  )}
                </>
              )}

              {/* カスタム要素名の場合は常に TextArea */}
              {newElementName === '__custom__' && customElementName.trim() && (
                <TextArea
                  rows={3}
                  placeholder="要素値を入力"
                  value={newElementValue}
                  onChange={(e) => setNewElementValue(e.target.value)}
                />
              )}
            </Space>
          );
        })()}
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
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Alert
            title={`親要素: ${propertyKey} | 現在の子要素数: ${propertyData.children?.length || 0}件`}
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
            onAddSameLevelCopy(propertyData, copyKey.trim());
            setCopyKey('');
            setShowCopyModal(false);
          }
        }}
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Alert title={`コピー元: ${propertyKey}`} type="info" />
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

// ===== ElementValueInput: xsi:type に応じた入力コンポーネント =====

interface ElementValueInputProps {
  xsiType: string;
  value: string;
  onChange: (v: string) => void;
}

/**
 * xsi:type に応じた要素値入力コンポーネント
 *
 * - 整数型 → InputNumber (precision=0)
 * - 符号なし整数型 → InputNumber (min=0, precision=0)
 * - 実数型 → InputNumber
 * - booleanType → Select (true/false)
 * - dateTimeType → DatePicker (showTime)
 * - dateType → DatePicker
 * - リスト型 → TextArea + ヘルプテキスト
 * - その他 → TextArea
 */
const ElementValueInput: React.FC<ElementValueInputProps> = ({ xsiType, value, onChange }) => {
  // ----- 整数型 -----
  if (isIntegerXsiType(xsiType)) {
    const min = isUnsignedIntXsiType(xsiType) ? 0 : undefined;
    return (
      <InputNumber
        style={{ width: '100%' }}
        placeholder="整数値を入力"
        precision={0}
        min={min}
        value={value !== '' ? Number(value) : undefined}
        onChange={(v) => onChange(v !== null && v !== undefined ? String(v) : '')}
      />
    );
  }

  // ----- 実数型 -----
  if (['floatType', 'doubleType', 'decimalType'].includes(xsiType)) {
    return (
      <InputNumber
        style={{ width: '100%' }}
        placeholder="数値を入力（例: 3.14）"
        value={value !== '' ? Number(value) : undefined}
        onChange={(v) => onChange(v !== null && v !== undefined ? String(v) : '')}
      />
    );
  }

  // ----- 真偽値型 -----
  if (xsiType === 'booleanType') {
    return (
      <Select
        style={{ width: '100%' }}
        placeholder="値を選択"
        value={value || undefined}
        onChange={(v) => onChange(v)}
      >
        <Option value="true">true</Option>
        <Option value="false">false</Option>
      </Select>
    );
  }

  // ----- 日時型 -----
  if (xsiType === 'dateTimeType') {
    return (
      <DatePicker
        showTime
        style={{ width: '100%' }}
        format="YYYY-MM-DD HH:mm:ss"
        placeholder="日時を選択"
        value={value ? dayjs(value) : undefined}
        onChange={(_, dateStr) =>
          onChange(typeof dateStr === 'string' ? dateStr : '')
        }
      />
    );
  }

  // ----- 日付型 -----
  if (xsiType === 'dateType') {
    return (
      <DatePicker
        style={{ width: '100%' }}
        format="YYYY-MM-DD"
        placeholder="日付を選択"
        value={value ? dayjs(value, 'YYYY-MM-DD') : undefined}
        onChange={(_, dateStr) =>
          onChange(typeof dateStr === 'string' ? dateStr : '')
        }
      />
    );
  }

  // ----- リスト型 -----
  if (isListXsiType(xsiType)) {
    return (
      <>
        <TextArea
          rows={3}
          placeholder="スペース区切りで値を入力（例: 1.0 2.5 3.7）"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          <InfoCircleOutlined style={{ marginRight: 4 }} />
          リスト型: 値をスペース区切りで入力してください
        </Text>
      </>
    );
  }

  // ----- デフォルト: TextArea -----
  return (
    <TextArea
      rows={3}
      placeholder="値を入力"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default NestedPropertyEditor;
