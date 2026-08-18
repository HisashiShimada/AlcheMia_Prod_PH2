/**
 * NestedPropertyEditor - ネスト構造プロパティ編集（独立版）
 * 
 * TemplateEditorDialog.tsxから分離
 * 
 * @version 2.0.0
 * @date 2026-02-13
 */

import React, { useState, useMemo } from 'react';
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
} from 'antd';
import {
  CloseOutlined,
  DownOutlined,
  RightOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  InfoCircleOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  validateByXsiType,
  isIntegerXsiType,
  isUnsignedIntXsiType,
  isListXsiType,
} from '@/utils/xsiTypeValidator';
import { getAllowedAttributeNames } from '@/utils/xsiTypeAttributes';
import type { AttributeRecord } from '@/types/masterDataTypes';
import { useLanguage } from '@/contexts/LanguageContext';

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
import type { NamespaceSource, PropertyData } from '@/types/editor';

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
  /** 不確かさ基準ボタン押下時のコールバック（省略時はボタン非表示） */
  onOpenCriteriaSelector?: (propertyKey: string, propertyData: PropertyData) => void;
  /** 不確かさ「編集」ボタン押下時のコールバック（省略時はボタン非表示） */
  onEditUncertainty?: (propertyKey: string, uncertaintyNode: PropertyData, index: number) => void;
  /** 不確かさ1件削除コールバック（インデックス指定） */
  onDeleteUncertainty?: (propertyKey: string, uncertaintyIndex: number) => void;
  /**
   * 用語表示名マップ（qname → displayName）
   * 省略時はヘッダーにキー名のみ表示
   */
  termDisplayMap?: Map<string, string>;
  /**
   * 用語の型・単位マップ（qname → { type?, unitHint? }）
   * xsi:type・units 選択時のデフォルト値表示に使用
   */
  termTypeUnitMap?: Map<string, { type?: string; unitHint?: string }>;
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

/** content タグ向け xsi:type 選択肢（DataRecordDialog の KNOWN_CONTENT_TYPES と一致させる） */
const MAIML_CONTENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'contentStringListType',      label: 'contentStringListType - 文字列リスト' },
  { value: 'contentIntListType',         label: 'contentIntListType - 整数リスト' },
  { value: 'contentLongListType',        label: 'contentLongListType - 長整数リスト' },
  { value: 'contentShortListType',       label: 'contentShortListType - 短整数リスト' },
  { value: 'contentByteListType',        label: 'contentByteListType - バイトリスト' },
  { value: 'contentUnsignedIntListType', label: 'contentUnsignedIntListType - 符号なし整数リスト' },
  { value: 'contentFloatListType',       label: 'contentFloatListType - 単精度実数リスト' },
  { value: 'contentDoubleListType',      label: 'contentDoubleListType - 倍精度実数リスト' },
  { value: 'contentDecimalListType',     label: 'contentDecimalListType - 10進数リスト' },
  { value: 'contentBooleanListType',     label: 'contentBooleanListType - 真偽値リスト' },
  { value: 'contentDateTimeListType',    label: 'contentDateTimeListType - 日時リスト' },
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
  onOpenCriteriaSelector,
  onEditUncertainty,
  onDeleteUncertainty,
  termDisplayMap,
  termTypeUnitMap,
}) => {
  const { modal } = App.useApp();
  const { t } = useLanguage();
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
            {termDisplayMap?.get(propertyKey) && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({termDisplayMap.get(propertyKey)})
              </Text>
            )}
            <Tag>Level {level}</Tag>
            {propertyData.attributes?.['xsi:type'] && (
              <Tag color={propertyData.attributes['xsi:type'] === 'propertyListType' ? 'blue' : 'default'}>
                {propertyData.attributes['xsi:type']}
              </Tag>
            )}
          </Space>

          {/* 操作ボタン */}
          <Space size="small">
            {onOpenCriteriaSelector && (
              <Button
                size="small"
                type="primary"
                style={{ backgroundColor: '#1677ff' }}
                onClick={() => onOpenCriteriaSelector(propertyKey, propertyData)}
              >
                {t('nestedPropertyEditor.openCriteriaSelector')}
              </Button>
            )}
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setShowAttributeAddModal(true)}>
              {t('nestedPropertyEditor.addAttribute')}
            </Button>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setShowElementAddModal(true)}>
              {t('nestedPropertyEditor.addElement')}
            </Button>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setShowChildAddModal(true)}>
              {t('nestedPropertyEditor.addChild')}
            </Button>
            <Button size="small" icon={<CopyOutlined />} onClick={() => setShowCopyModal(true)}>
              {t('nestedPropertyEditor.copy')}
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                modal.confirm({
                  title: t('nestedPropertyEditor.deletePropertyConfirm', { key: propertyKey }),
                  onOk: () => onDeleteProperty(propertyKey),
                });
              }}
            />
          </Space>
        </div>

        {/* 属性セクション */}
        {hasAttributes && (
          <div style={{ marginBottom: 8 }}>
            <Text type="success" strong style={{ fontSize: 12 }}>{t('nestedPropertyEditor.attributesSection')}</Text>
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
            <Text type="secondary" strong style={{ fontSize: 12 }}>{t('nestedPropertyEditor.elementsSection')}</Text>
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

        {/* 不確かさセクション（uncertainty 子ノードを複数表示） */}
        {(() => {
          const uncertaintyChildren = propertyData.children?.filter(
            (c) => c.tagName === 'uncertainty'
          ) ?? [];
          if (uncertaintyChildren.length === 0) return null;
          return (
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 12, color: '#722ed1', display: 'block', marginBottom: 4 }}>
                <ExperimentOutlined style={{ marginRight: 4 }} />
                {t('nestedPropertyEditor.uncertaintySection')}
              </Text>
              {uncertaintyChildren.map((uncertaintyChild, ucIdx) => {
                const ucValue = uncertaintyChild.elements?.['value'] ?? '';
                const ucDesc = uncertaintyChild.elements?.['description'] ?? '';
                return (
                  <div
                    key={`uc_${ucIdx}`}
                    style={{
                      border: '1px solid #d3adf7',
                      borderRadius: 6,
                      padding: '6px 8px',
                      marginBottom: 6,
                      backgroundColor: '#f9f0ff',
                    }}
                  >
                    {/* 各不確かさ行ヘッダー：編集・×ボタン */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, flex: 1, color: '#722ed1' }}>
                        {t('nestedPropertyEditor.uncertaintyItem', { index: String(ucIdx + 1) })}
                      </Text>
                      {onEditUncertainty && (
                        <Button
                          size="small"
                          type="default"
                          style={{ color: '#722ed1', borderColor: '#722ed1' }}
                          onClick={() => onEditUncertainty(propertyKey, uncertaintyChild, ucIdx)}
                        >
                          {t('nestedPropertyEditor.editUncertainty')}
                        </Button>
                      )}
                      {onDeleteUncertainty && (
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => onDeleteUncertainty(propertyKey, ucIdx)}
                        />
                      )}
                    </div>
                    {/* key 行 */}
                    {uncertaintyChild.key && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ minWidth: 100, fontSize: 12 }}>key:</Text>
                        <Input size="small" value={uncertaintyChild.key} readOnly style={{ flex: 1 }} />
                        <span style={{ width: 24 }} />
                      </div>
                    )}
                    {/* xsi:type 行 */}
                    {uncertaintyChild.attributes?.['xsi:type'] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ minWidth: 100, fontSize: 12 }}>xsi:type:</Text>
                        <Input size="small" value={uncertaintyChild.attributes['xsi:type']} readOnly style={{ flex: 1 }} />
                        <span style={{ width: 24 }} />
                      </div>
                    )}
                    {/* units 行 */}
                    {uncertaintyChild.attributes?.['units'] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ minWidth: 100, fontSize: 12 }}>units:</Text>
                        <Input size="small" value={uncertaintyChild.attributes['units']} readOnly style={{ flex: 1 }} />
                        <span style={{ width: 24 }} />
                      </div>
                    )}
                    {/* value 行 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={{ minWidth: 100, fontSize: 12 }}>value:</Text>
                      <Input
                        size="small"
                        value={ucValue}
                        onChange={(e) => onUpdateNestedElement(uncertaintyChild.key, 'value', e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 24 }} />
                    </div>
                    {/* description 行（値がある場合のみ） */}
                    {ucDesc !== '' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ minWidth: 100, fontSize: 12 }}>description:</Text>
                        <Input
                          size="small"
                          value={ucDesc}
                          onChange={(e) => onUpdateNestedElement(uncertaintyChild.key, 'description', e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <span style={{ width: 24 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* 子要素セクション（uncertainty 以外） */}
        {hasChildren && isExpanded && (
          <div style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: '#722ed1', fontWeight: 'bold' }}>
              {t('nestedPropertyEditor.childrenSection', { count: String(propertyData.children?.length || 0) })}
            </Text>
            {propertyData.children
              .filter((c) => c.tagName !== 'uncertainty' && c.key !== 'uncertainty')
              .map((child, index) => {
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
                    onOpenCriteriaSelector={onOpenCriteriaSelector}
                    onEditUncertainty={onEditUncertainty}
                  />
                );
              })}
          </div>
        )}
      </div>

      {/* モーダル群 */}
      {/* 属性追加モーダル */}
      <Modal
        title={t('nestedPropertyEditor.modalAddAttribute')}
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
            message.error(t('nestedPropertyEditor.selectAttributeName'));
            return;
          }

          if (!newAttributeValue.trim()) {
            message.error(t('nestedPropertyEditor.enterAttributeValue'));
            return;
          }

          onUpdateNestedAttribute(propertyKey, finalAttributeName, newAttributeValue.trim());
          setNewAttributeName('');
          setNewAttributeValue('');
          setShowAttributeAddModal(false);
        }}
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
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
                placeholder={t('nestedPropertyEditor.placeholderAttributeName')}
                value={newAttributeName || undefined}
                onChange={(value) => {
                  setNewAttributeName(value);
                  setNewAttributeValue('');
                  if (value === 'xsi:type') {
                    // DBに型が登録されていればそれをデフォルト、なければハードコード値
                    const dbType = termTypeUnitMap?.get(propertyKey)?.type;
                    setNewAttributeValue(dbType ?? defaultXsiType);
                  } else if (value === 'units') {
                    // DBに単位が登録されていればそれをデフォルト、なければ空
                    const dbUnit = termTypeUnitMap?.get(propertyKey)?.unitHint;
                    setNewAttributeValue(dbUnit ?? '');
                  }
                }}
              >
                {/* 固定属性グループ */}
                <Select.OptGroup label={t('nestedPropertyEditor.fixedAttributes')}>
                  <Option value="xsi:type" disabled={existingAttrNames.has('xsi:type')}>
                    {`xsi:type${t('nestedPropertyEditor.maimlTypeDef')}${existingAttrNames.has('xsi:type') ? t('nestedPropertyEditor.alreadySet') : ''}`}
                  </Option>
                  <Option value="key" disabled={existingAttrNames.has('key')}>
                    {`key${t('nestedPropertyEditor.keyRequired')}${existingAttrNames.has('key') ? t('nestedPropertyEditor.alreadySet') : ''}`}
                  </Option>
                  {isContent && <Option value="axis" disabled={existingAttrNames.has('axis')}>{`axis${t('nestedPropertyEditor.axisName')}${existingAttrNames.has('axis') ? t('nestedPropertyEditor.alreadySet') : ''}`}</Option>}
                  {isContent && <Option value="size" disabled={existingAttrNames.has('size')}>{`size${t('nestedPropertyEditor.dataSize')}${existingAttrNames.has('size') ? t('nestedPropertyEditor.alreadySet') : ''}`}</Option>}
                  {isContent && <Option value="id" disabled={existingAttrNames.has('id')}>{`id${t('nestedPropertyEditor.xmlId')}${existingAttrNames.has('id') ? t('nestedPropertyEditor.alreadySet') : ''}`}</Option>}
                  {isContent && <Option value="ref" disabled={existingAttrNames.has('ref')}>{`ref${t('nestedPropertyEditor.xmlIdref')}${existingAttrNames.has('ref') ? t('nestedPropertyEditor.alreadySet') : ''}`}</Option>}
                  {/* xsi:type に応じた追加属性（units / formatString / scaleFactor） */}
                  {showUnits && (
                    <Option value="units" disabled={existingAttrNames.has('units')}>
                      {`units${t('nestedPropertyEditor.units')}${existingAttrNames.has('units') ? t('nestedPropertyEditor.alreadySet') : ''}`}
                    </Option>
                  )}
                  {showFormatString && (
                    <Option value="formatString" disabled={existingAttrNames.has('formatString')}>
                      {`formatString${t('nestedPropertyEditor.formatString')}${existingAttrNames.has('formatString') ? t('nestedPropertyEditor.alreadySet') : ''}`}
                    </Option>
                  )}
                  {showScaleFactor && (
                    <Option value="scaleFactor" disabled={existingAttrNames.has('scaleFactor')}>
                      {`scaleFactor${t('nestedPropertyEditor.scaleFactor')}${existingAttrNames.has('scaleFactor') ? t('nestedPropertyEditor.alreadySet') : ''}`}
                    </Option>
                  )}
                </Select.OptGroup>
                {/* マスタ属性グループ（Attributeマスタから動的生成・制限なし） */}
                {masterAttributeNames.length > 0 && (
                  <Select.OptGroup label={t('nestedPropertyEditor.masterAttributes')}>
                    {masterAttributeNames.map((name) => (
                      <Option key={name} value={name} disabled={existingAttrNames.has(name)}>
                        {name}{existingAttrNames.has(name) ? t('nestedPropertyEditor.alreadySet') : ''}
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
              /* xsi:type → content タグは contentXxxListType 系、property タグは MAIML_PROPERTY_TYPES */
              propertyData.tagName === 'content' ? (
                <Select
                  style={{ width: '100%' }}
                  placeholder={t('nestedPropertyEditor.contentTypePlaceholder')}
                  value={newAttributeValue || undefined}
                  onChange={setNewAttributeValue}
                >
                  {MAIML_CONTENT_TYPES.map(type => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              ) : (
                <Select
                  style={{ width: '100%' }}
                  placeholder={t('nestedPropertyEditor.maimlPropertyTypePlaceholder')}
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
              )
            ) : OPTIONAL_MASTER_ATTRIBUTES.has(newAttributeName) ? (
              /* axis / size → AutoComplete（マスタ候補提示 + 手入力許可） */
              <Space orientation="vertical" style={{ width: '100%' }}>
                <AutoComplete
                  style={{ width: '100%' }}
                  placeholder={
                    newAttributeName === 'axis'
                      ? t('nestedPropertyEditor.placeholderAxis')
                      : t('nestedPropertyEditor.placeholderSize')
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
                    {t('nestedPropertyEditor.masterCandidateHint')}
                  </Text>
                )}
              </Space>
            ) : masterAttributeValues.length > 0 ? (
              /* マスタ由来の属性値が存在する → 属性値Selectプルダウン（備考付き: "value（remark）"） */
              <Select
                style={{ width: '100%' }}
                placeholder={t('nestedPropertyEditor.placeholderAttributeValue')}
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
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Select
                  style={{ width: '100%' }}
                  disabled
                  placeholder={t('nestedPropertyEditor.noMasterValues')}
                />
                <Alert
                  type="error"
                  showIcon
                  message={t('nestedPropertyEditor.masterRequired', { name: newAttributeName })}
                  description={t('nestedPropertyEditor.masterRequiredDesc')}
                />
              </Space>
            ) : newAttributeName === 'key' ? (
              /* key 属性 → テキスト入力（デフォルト値: termDisplayMapの表示名、なければ空欄） */
              <Input
                placeholder={t('nestedPropertyEditor.placeholderAttrValueInput')}
                value={newAttributeValue !== '' ? newAttributeValue : (termDisplayMap?.get(propertyKey) ?? '')}
                onChange={(e) => setNewAttributeValue(e.target.value)}
              />
            ) : (
              /* その他の固定属性（id / ref）または termDisplayMap が空 → テキスト入力 */
              <Input
                placeholder={t('nestedPropertyEditor.placeholderAttrValueInput')}
                value={newAttributeValue}
                onChange={(e) => setNewAttributeValue(e.target.value)}
              />
            )
          )}
        </Space>
      </Modal>

      {/* 要素追加モーダル */}
      <Modal
        title={t('nestedPropertyEditor.modalAddElement')}
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
            message.error(t('nestedPropertyEditor.enterElementName'));
            return;
          }

          // ✅ Phase 2-A-2: value 要素かつ xsi:type が設定されている場合のみ型バリデーション
          const xsiType = propertyData.attributes?.['xsi:type'] ?? '';
          if (finalElementName === 'value' && xsiType) {
            const result = validateByXsiType(xsiType, newElementValue);
            if (!result.isValid) {
              message.error(result.errorMessage ?? t('nestedPropertyEditor.invalidValue'));
              return;
            }
          }

          // propertyListType のとき value 要素は追加不可
          if (xsiType === 'propertyListType' && finalElementName === 'value') {
            message.error(t('nestedPropertyEditor.cannotAddValueToPropertyList'));
            return;
          }

          if (!newElementValue.trim() && finalElementName !== 'value') {
            message.error(t('nestedPropertyEditor.enterElementValue'));
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
            <Space orientation="vertical" style={{ width: '100%' }}>
              {/* 要素名セレクト */}
              <Select
                placeholder={t('nestedPropertyEditor.placeholderElementName')}
                value={newElementName || undefined}
                onChange={(val: string) => {
                  setNewElementName(val);
                  // description を選択した場合は登録済みの値をデフォルト表示
                  if (val === 'description') {
                    setNewElementValue(propertyData.elements?.['description'] ?? '');
                  } else {
                    setNewElementValue('');
                  }
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
                      ? t('nestedPropertyEditor.notForPropertyList')
                      : ''}
                  </Option>
                ))}
              </Select>

              {/* カスタム要素名入力欄 */}
              {newElementName === '__custom__' && (
                <Input
                  placeholder={t('nestedPropertyEditor.placeholderCustomElement')}
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
                      message={t('nestedPropertyEditor.cannotAddValueTitle')}
                      description={t('nestedPropertyEditor.cannotAddValueDesc')}
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
                      placeholder={t('nestedPropertyEditor.placeholderElementValue')}
                      value={newElementValue}
                      onChange={(e) => setNewElementValue(e.target.value)}
                    />
                  )}
                  {/* xsi:type のヘルプテキスト */}
                  {newElementName === 'value' && xsiType && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      xsi:type: <Tag>{xsiType}</Tag> {t('nestedPropertyEditor.xsiTypeInputHint')}
                    </Text>
                  )}
                </>
              )}

              {/* カスタム要素名の場合は常に TextArea */}
              {newElementName === '__custom__' && customElementName.trim() && (
                <TextArea
                  rows={3}
                  placeholder={t('nestedPropertyEditor.placeholderElementValue')}
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
        title={t('nestedPropertyEditor.modalAddChild')}
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
            title={t('nestedPropertyEditor.childModalInfo', { key: propertyKey, count: String(propertyData.children?.length || 0) })}
            type="info"
          />
          <Input
            placeholder={t('nestedPropertyEditor.placeholderChildKey')}
            value={copyKey}
            onChange={(e) => setCopyKey(e.target.value)}
          />
          <Select
            style={{ width: '100%' }}
            placeholder={t('nestedPropertyEditor.placeholderTagName')}
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
        title={t('nestedPropertyEditor.modalCopy')}
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
          <Alert title={t('nestedPropertyEditor.copySource', { key: propertyKey })} type="info" />
          <Input
            placeholder={t('nestedPropertyEditor.placeholderCopyKey', { key: propertyKey })}
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
  const { t } = useLanguage();

  // ----- 整数型 -----
  if (isIntegerXsiType(xsiType)) {
    const min = isUnsignedIntXsiType(xsiType) ? 0 : undefined;
    return (
      <InputNumber
        style={{ width: '100%' }}
        placeholder={t('nestedPropertyEditor.elementValue.integerPlaceholder')}
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
        placeholder={t('nestedPropertyEditor.elementValue.floatPlaceholder')}
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
        placeholder={t('nestedPropertyEditor.elementValue.boolPlaceholder')}
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
        placeholder={t('nestedPropertyEditor.elementValue.dateTimePlaceholder')}
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
        placeholder={t('nestedPropertyEditor.elementValue.datePlaceholder')}
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
          placeholder={t('nestedPropertyEditor.elementValue.listPlaceholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          <InfoCircleOutlined style={{ marginRight: 4 }} />
          {t('nestedPropertyEditor.elementValue.listHint')}
        </Text>
      </>
    );
  }

  // ----- デフォルト: TextArea -----
  return (
    <TextArea
      rows={3}
      placeholder={t('nestedPropertyEditor.elementValue.defaultPlaceholder')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default NestedPropertyEditor;
