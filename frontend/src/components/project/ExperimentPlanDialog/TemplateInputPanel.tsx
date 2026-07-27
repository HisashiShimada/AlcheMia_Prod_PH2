'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Select,
  Input,
  InputNumber,
  Button,
  Card,
  Space,
  Typography,
  Row,
  Col,
  theme,
  Divider,
  Empty,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type {
  TemplateInputPanelProps,
  CustomPropValue,
  CustomPropType,
  CustomPropContainerType,
} from '@/types/experimentPlanDialog';
import type { TemplateDef } from '@/types/experimentPlan';
import FieldValueInput from './FieldValueInput';
import UncertaintyCriteriaSelectorModal from '@/components/uncertainty/UncertaintyCriteriaSelectorModal';
import type { TargetProperty, AssignPayload } from '@/components/uncertainty/UncertaintyCriteriaSelectorModal';
import InsertionEditorCompact from '@/components/common/InsertionEditorCompact';
import { toInsertion, fromInsertion } from '@/utils/insertionAdapter';

const { Text } = Typography;
const { TextArea } = Input;
const { useToken } = theme;

/** property コンテナ用の型選択肢 */
const PROPERTY_TYPE_OPTIONS: { label: string; value: CustomPropType }[] = [
  { label: 'stringType',            value: 'stringType' },
  { label: 'tokenType',             value: 'tokenType' },
  { label: 'stringEnumType',        value: 'stringEnumType' },
  { label: 'intType',               value: 'intType' },
  { label: 'longType',              value: 'longType' },
  { label: 'shortType',             value: 'shortType' },
  { label: 'byteType',              value: 'byteType' },
  { label: 'unsignedIntType',       value: 'unsignedIntType' },
  { label: 'unsignedLongType',      value: 'unsignedLongType' },
  { label: 'unsignedShortType',     value: 'unsignedShortType' },
  { label: 'unsignedByteType',      value: 'unsignedByteType' },
  { label: 'floatType',             value: 'floatType' },
  { label: 'doubleType',            value: 'doubleType' },
  { label: 'decimalType',           value: 'decimalType' },
  { label: 'booleanType',           value: 'booleanType' },
  { label: 'dateType',              value: 'dateType' },
  { label: 'dateTimeType',          value: 'dateTimeType' },
  { label: 'stringListType',        value: 'stringListType' },
  { label: 'intListType',           value: 'intListType' },
  { label: 'longListType',          value: 'longListType' },
  { label: 'shortListType',         value: 'shortListType' },
  { label: 'byteListType',          value: 'byteListType' },
  { label: 'unsignedIntListType',   value: 'unsignedIntListType' },
  { label: 'floatListType',         value: 'floatListType' },
  { label: 'doubleListType',        value: 'doubleListType' },
  { label: 'decimalListType',       value: 'decimalListType' },
  { label: 'booleanListType',       value: 'booleanListType' },
  { label: 'dateTimeListType',      value: 'dateTimeListType' },
];

/** content コンテナ用の型選択肢 */
const CONTENT_TYPE_OPTIONS: { label: string; value: CustomPropType }[] = [
  { label: 'contentStringListType',     value: 'contentStringListType' },
  { label: 'contentIntListType',        value: 'contentIntListType' },
  { label: 'contentLongListType',       value: 'contentLongListType' },
  { label: 'contentShortListType',      value: 'contentShortListType' },
  { label: 'contentByteListType',       value: 'contentByteListType' },
  { label: 'contentUnsignedIntListType', value: 'contentUnsignedIntListType' },
  { label: 'contentFloatListType',      value: 'contentFloatListType' },
  { label: 'contentDoubleListType',     value: 'contentDoubleListType' },
  { label: 'contentDecimalListType',    value: 'contentDecimalListType' },
  { label: 'contentBooleanListType',    value: 'contentBooleanListType' },
  { label: 'contentDateTimeListType',   value: 'contentDateTimeListType' },
];

const TemplateInputPanel: React.FC<TemplateInputPanelProps> = ({
  methodTemplates,
  templateValues,
  onValueChange,
  customProps,
  onCustomPropsChange,
  disabled = false,
  outputTemplateIds,
  projectId,
}) => {
  const { token } = useToken();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // 不確かさ基準選択モーダル用 state
  const [criteriaSelectorOpen, setCriteriaSelectorOpen] = useState(false);
  const [criteriaSelectorTarget, setCriteriaSelectorTarget] = useState<TargetProperty | null>(null);

  // methodTemplates が変わった（メソッド切り替え等）場合は選択リセット
  useEffect(() => {
    setSelectedTemplateId(null);
  }, [methodTemplates]);

  const selectedTemplate = methodTemplates.find((t) => t.id === selectedTemplateId) ?? null;
  const currentCustomProps = selectedTemplate ? (customProps[selectedTemplate.id] ?? []) : [];

  /**
   * 選択中テンプレートが出力Place（前トランジションの出力結果）に紐づく場合は
   * すべてのフィールドを disabled にする（参照表示のみ）
   */
  const isOutputTemplate = selectedTemplate !== null && (outputTemplateIds?.has(selectedTemplate.id) ?? false);
  const effectiveDisabled = disabled || isOutputTemplate;

  // ── カスタムプロパティ Key 重複チェック ──────────────────────────────────
  const duplicateCustomKeys = useMemo((): Set<string> => {
    if (!selectedTemplateId || !selectedTemplate) return new Set();
    const list = customProps[selectedTemplateId] ?? [];

    // 固定プロパティのKey一覧
    const fixedKeys = new Set(
      (selectedTemplate.fields ?? []).map((f) => f.key)
    );

    // カスタムプロパティのKey一覧（insertion 除外・空文字除外）
    const customKeys = list
      .filter((cp) => cp.containerType !== 'insertion' && cp.key.trim() !== '')
      .map((cp) => cp.key.trim());

    // 全Keyをまとめてカウント
    const countMap = new Map<string, number>();
    for (const k of customKeys) {
      countMap.set(k, (countMap.get(k) ?? 0) + 1);
    }

    const duplicates = new Set<string>();

    // カスタム同士で2回以上現れるKey
    for (const [k, count] of countMap.entries()) {
      if (count > 1) duplicates.add(k);
    }

    // 固定プロパティのKeyと被っているカスタムKey
    for (const k of customKeys) {
      if (fixedKeys.has(k)) duplicates.add(k);
    }

    return duplicates;
  }, [selectedTemplateId, selectedTemplate, customProps]);

  // ── ハンドラ ──────────────────────────────────────────────────────────────

  /** コンテナタイプごとにカスタムプロパティを追加 */
  const handleAddCustomProp = useCallback(
    (containerType: CustomPropContainerType) => {
      if (!selectedTemplate) return;
      const defaultType: CustomPropType =
        containerType === 'insertion'
          ? 'insertion'
          : containerType === 'content'
          ? 'contentStringListType'
          : 'stringType';
      const newProp: CustomPropValue = {
        id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        key: '',
        containerType,
        type: defaultType,
        value: containerType === 'content' ? [''] : null,
        units: '',
      };
      const existing = customProps[selectedTemplate.id] ?? [];
      onCustomPropsChange(selectedTemplate.id, [...existing, newProp]);
    },
    [selectedTemplate, customProps, onCustomPropsChange]
  );

  /** カスタムプロパティを削除 */
  const handleRemoveCustomProp = useCallback(
    (templateId: string, propId: string) => {
      const existing = customProps[templateId] ?? [];
      onCustomPropsChange(templateId, existing.filter((p) => p.id !== propId));
    },
    [customProps, onCustomPropsChange]
  );

  /** カスタムプロパティのフィールドを更新 */
  const handleUpdateCustomProp = useCallback(
    (
      templateId: string,
      id: string,
      patch: Partial<Omit<CustomPropValue, 'id'>>
    ) => {
      const existing = customProps[templateId] ?? [];
      onCustomPropsChange(
        templateId,
        existing.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );
    },
    [customProps, onCustomPropsChange]
  );

  // ── カスタムプロパティ行レンダリング ────────────────────────────────────

  const renderCustomPropertyRows = () => {
    if (!selectedTemplate || currentCustomProps.length === 0) return null;

    return currentCustomProps.map((cp) => {
      const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 8,
        padding: '8px',
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusSM,
        border: `1px solid ${token.colorBorder}`,
      };

      // Key 重複判定（insertion 除外）
      const isKeyDuplicate =
        cp.containerType !== 'insertion' &&
        cp.key.trim() !== '' &&
        duplicateCustomKeys.has(cp.key.trim());

      // 削除ボタン（共通）
      const deleteBtn = (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveCustomProp(selectedTemplate.id, cp.id)}
          disabled={disabled}
          style={{ flexShrink: 0 }}
        />
      );

      // Key 入力欄（insertion 以外）
      const keyInput = cp.containerType !== 'insertion' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Input
            placeholder="キー名"
            value={cp.key}
            onChange={(e) =>
              handleUpdateCustomProp(selectedTemplate.id, cp.id, { key: e.target.value })
            }
            style={{
              width: 130,
              borderColor: isKeyDuplicate ? '#ff4d4f' : undefined,
              boxShadow: isKeyDuplicate ? '0 0 0 2px rgba(255,77,79,0.2)' : undefined,
            }}
            size="small"
            status={isKeyDuplicate ? 'error' : undefined}
            disabled={disabled}
          />
          {isKeyDuplicate && (
            <Text type="danger" style={{ fontSize: 10, lineHeight: 1.2 }}>
              Keyが重複しています
            </Text>
          )}
        </div>
      ) : null;

      // Units 入力欄（insertion 以外）
      const unitsInput = cp.containerType !== 'insertion' ? (
        <Input
          placeholder="単位"
          value={cp.units}
          onChange={(e) =>
            handleUpdateCustomProp(selectedTemplate.id, cp.id, { units: e.target.value })
          }
          style={{ width: 70 }}
          size="small"
          disabled={disabled}
        />
      ) : null;

      // ── insertion コンテナ ──
      // InsertionEditorCompact（useInsertionEditor フックベース）に統一
      if (cp.containerType === 'insertion') {
        // uploadTargetPath: projectId が渡されている場合のみアップロード先を設定
        const uploadTargetPath = projectId
          ? `projects/${projectId}/attachments`
          : undefined;
        return (
          <div key={cp.id} style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Tag color="purple" style={{ flexShrink: 0 }}>insertion</Tag>
              {deleteBtn}
            </div>
            <InsertionEditorCompact
              value={toInsertion(cp)}
              onChange={(v) =>
                handleUpdateCustomProp(selectedTemplate.id, cp.id, fromInsertion(v))
              }
              readOnly={effectiveDisabled}
              uploadTargetPath={uploadTargetPath}
            />
          </div>
        );
      }

      // ── content コンテナ ──
      if (cp.containerType === 'content') {
        const rows: string[] = Array.isArray(cp.value)
          ? (cp.value as string[])
          : cp.value
          ? [cp.value as string]
          : [''];

        return (
          <div
            key={cp.id}
            style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Tag color="cyan" style={{ flexShrink: 0 }}>content</Tag>
              {keyInput}
              <Select
                value={cp.type}
                onChange={(v) =>
                  handleUpdateCustomProp(selectedTemplate.id, cp.id, {
                    type: v as CustomPropType,
                    value: [''],
                  })
                }
                options={CONTENT_TYPE_OPTIONS}
                style={{ width: 210 }}
                popupMatchSelectWidth={false}
                size="small"
                disabled={disabled}
              />
              {unitsInput}
              {deleteBtn}
            </div>
            {/* 行ごとの入力エリア（列はスペース区切り） */}
            <div style={{ marginTop: 6 }}>
              {rows.map((rowVal, rowIdx) => (
                <div key={rowIdx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <TextArea
                    placeholder={`行 ${rowIdx + 1}: 値をスペース区切りで入力（例: 1.0 2.5 3.0）`}
                    value={rowVal}
                    onChange={(e) => {
                      const newRows = [...rows];
                      newRows[rowIdx] = e.target.value;
                      handleUpdateCustomProp(selectedTemplate.id, cp.id, { value: newRows });
                    }}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    style={{ flex: 1 }}
                    size="small"
                    disabled={disabled}
                  />
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    disabled={disabled || rows.length <= 1}
                    onClick={() => {
                      const newRows = rows.filter((_, i) => i !== rowIdx);
                      handleUpdateCustomProp(selectedTemplate.id, cp.id, { value: newRows });
                    }}
                    style={{ flexShrink: 0 }}
                  />
                </div>
              ))}
              <Button
                size="small"
                icon={<PlusOutlined />}
                disabled={disabled}
                onClick={() => {
                  handleUpdateCustomProp(selectedTemplate.id, cp.id, {
                    value: [...rows, ''],
                  });
                }}
              >
                行を追加
              </Button>
            </div>
          </div>
        );
      }

      // ── property コンテナ ──
      // 型に応じた値入力欄
      let valueInput: React.ReactNode;
      const strVal = typeof cp.value === 'string' ? cp.value : '';
      switch (cp.type) {
        case 'intType':
        case 'longType':
        case 'shortType':
        case 'byteType':
        case 'unsignedIntType':
        case 'unsignedLongType':
        case 'unsignedShortType':
        case 'unsignedByteType':
          valueInput = (
            <InputNumber
              placeholder="値"
              value={strVal !== '' ? Number(strVal) : undefined}
              onChange={(v) =>
                handleUpdateCustomProp(selectedTemplate.id, cp.id, {
                  value: v !== null ? String(v) : null,
                })
              }
              precision={0}
              style={{ width: 120 }}
              size="small"
              disabled={disabled}
            />
          );
          break;
        case 'floatType':
        case 'doubleType':
        case 'decimalType':
          valueInput = (
            <InputNumber
              placeholder="値"
              value={strVal !== '' ? Number(strVal) : undefined}
              onChange={(v) =>
                handleUpdateCustomProp(selectedTemplate.id, cp.id, {
                  value: v !== null ? String(v) : null,
                })
              }
              precision={4}
              step={0.0001}
              style={{ width: 120 }}
              size="small"
              disabled={disabled}
            />
          );
          break;
        case 'booleanType':
          valueInput = (
            <Select
              placeholder="値"
              value={strVal || undefined}
              onChange={(v) =>
                handleUpdateCustomProp(selectedTemplate.id, cp.id, { value: v })
              }
              options={[
                { label: 'true', value: 'true' },
                { label: 'false', value: 'false' },
              ]}
              style={{ width: 100 }}
              size="small"
              disabled={disabled}
            />
          );
          break;
        default:
          valueInput = (
            <TextArea
              placeholder="値"
              value={strVal}
              onChange={(e) =>
                handleUpdateCustomProp(selectedTemplate.id, cp.id, { value: e.target.value })
              }
              autoSize={{ minRows: 1, maxRows: 3 }}
              style={{ flex: 1, minWidth: 120 }}
              size="small"
              disabled={disabled}
            />
          );
      }

      return (
        <div key={cp.id} style={rowStyle}>
          <Tag color="geekblue" style={{ flexShrink: 0, alignSelf: 'center' }}>property</Tag>
          {keyInput}
          <Select
            value={cp.type}
            onChange={(v) =>
              handleUpdateCustomProp(selectedTemplate.id, cp.id, {
                type: v as CustomPropType,
                value: null,
              })
            }
            options={PROPERTY_TYPE_OPTIONS}
            style={{ width: 140 }}
            popupMatchSelectWidth={false}
            size="small"
            disabled={disabled}
          />
          {valueInput}
          {unitsInput}
          {deleteBtn}
        </div>
      );
    });
  };

  // ── テンプレートが空の場合 ─────────────────────────────────────────────
  if (methodTemplates.length === 0) {
    return (
      <div
        style={{
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px dashed ${token.colorBorder}`,
          borderRadius: token.borderRadius,
          backgroundColor: token.colorFillAlter,
        }}
      >
        <Empty
          description="このメソッドにはテンプレートが定義されていません"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div>
      <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
        テンプレート入力
      </Text>

      <Row gutter={12}>
        {/* 左側: テンプレート一覧（スクロール付き） */}
        <Col span={10}>
          <Card
            size="small"
            title={<Text style={{ fontSize: 12 }}>テンプレート一覧</Text>}
            styles={{ body: { padding: 0, maxHeight: 420, overflowY: 'auto' } }}
          >
            <Table<TemplateDef>
              dataSource={methodTemplates}
              rowKey="id"
              size="small"
              pagination={false}
              showHeader={false}
              columns={[
                {
                  dataIndex: 'label',
                  key: 'label',
                  render: (label: string, record: TemplateDef) => (
                    <Space direction="vertical" size={0}>
                      <Text style={{ fontSize: 12 }}>{label}</Text>
                      <Tag
                        color={
                          record.category === 'material'
                            ? 'green'
                            : record.category === 'condition'
                            ? 'blue'
                            : 'orange'
                        }
                        style={{ fontSize: 10, margin: 0 }}
                      >
                        {record.category}
                      </Tag>
                    </Space>
                  ),
                },
              ]}
              onRow={(record) => ({
                onClick: () => {
                  if (disabled) return;
                  setSelectedTemplateId(
                    selectedTemplateId === record.id ? null : record.id
                  );
                },
                style: {
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    selectedTemplateId === record.id
                      ? token.colorPrimaryBg
                      : undefined,
                  transition: 'background-color 0.15s',
                },
              })}
            />
          </Card>
        </Col>

        {/* 右側: 選択テンプレートの入力フィールド */}
        <Col span={14}>
          {selectedTemplate === null ? (
            <div
              style={{
                height: '100%',
                minHeight: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px dashed ${token.colorBorder}`,
                borderRadius: token.borderRadius,
                backgroundColor: token.colorFillAlter,
              }}
            >
              <Empty
                description="テンプレートを選択してください"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <Card
              size="small"
              title={<Text style={{ fontSize: 12 }}>{selectedTemplate.label}</Text>}
              styles={{ body: { maxHeight: 420, overflowY: 'auto' } }}
            >
              {/* ── 定義済みフィールド ── */}
              {selectedTemplate.fields.length === 0 ? (
                <Empty
                  description="フィールドが定義されていません"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ marginBottom: 8 }}
                />
              ) : (
                <div>
                  {/* 出力テンプレートの場合は参照専用バッジを表示 */}
                  {isOutputTemplate && (
                    <div style={{ marginBottom: 8 }}>
                      <Tag color="warning">参照専用（前工程の出力）</Tag>
                    </div>
                  )}
                  {selectedTemplate.fields.map((field) => {
                    const valueKey = `${selectedTemplate.id}_${field.key}`;
                    return (
                      <div key={valueKey} style={{ marginBottom: 10 }}>
                        {/* ラベル行: フィールド名・単位を左、不確かさ選択ボタンを右端 */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Space size={4}>
                            <Text style={{ fontSize: 12 }}>
                              {field.label || field.key}
                              {field.required && (
                                <span style={{ color: token.colorError, marginLeft: 2 }}>*</span>
                              )}
                            </Text>
                            <Tag
                              color={
                                field.type === 'number'
                                  ? 'green'
                                  : field.type === 'select'
                                  ? 'orange'
                                  : 'default'
                              }
                              style={{ fontSize: 10 }}
                            >
                              {field.xsiType ?? field.type}
                            </Tag>
                            {field.units && (
                              <Tag color="blue" style={{ fontSize: 10 }}>
                                {field.units}
                              </Tag>
                            )}
                          </Space>
                          {/* insertion フィールドには不確かさ選択不要、出力テンプレートは操作不可 */}
                          {field.xsiType !== 'insertion' && !isOutputTemplate && (
                            <Button
                              type="primary"
                              size="small"
                              disabled={effectiveDisabled}
                              onClick={() => {
                                setCriteriaSelectorTarget({
                                  name: field.label || field.key,
                                  xpath: field.key,
                                  tag: 'property',
                                  type: field.type,
                                  value: String(templateValues[valueKey] ?? ''),
                                  unit: field.units ?? '',
                                  section: selectedTemplate.category as 'material' | 'condition' | 'result',
                                });
                                setCriteriaSelectorOpen(true);
                              }}
                            >
                              不確かさ選択
                            </Button>
                          )}
                        </div>
                        {/* 入力欄 — xsi:type に応じた入力コンポーネント */}
                        <FieldValueInput
                          xsiType={field.xsiType}
                          fieldType={field.type}
                          options={field.options}
                          value={templateValues[valueKey]}
                          onChange={(v) => onValueChange(valueKey, v)}
                          placeholder={
                            field.type === 'select'
                              ? `${field.label || field.key}を選択`
                              : `${field.label || field.key}を入力`
                          }
                          disabled={effectiveDisabled}
                          testId={`template-input-${field.key}`}
                        />
                        {field.description && (
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            {field.description}
                          </Text>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <Divider style={{ margin: '8px 0' }} />

              {/* ── カスタムプロパティ追加エリア ── */}
              <div>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  プロパティを追加
                </Text>

                {/* コンテナタイプごとの追加ボタン（insertionは一時非表示） */}
                <Space wrap style={{ marginBottom: 8 }}>
                  <Tooltip title="property タグとして追加（key・type・value・units）">
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddCustomProp('property')}
                      disabled={effectiveDisabled}
                    >
                      <Tag color="geekblue" style={{ margin: 0 }}>property</Tag>
                    </Button>
                  </Tooltip>
                  <Tooltip title="content タグとして追加（key・type・複数行値）">
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddCustomProp('content')}
                      disabled={effectiveDisabled}
                    >
                      <Tag color="cyan" style={{ margin: 0 }}>content</Tag>
                    </Button>
                  </Tooltip>
                  {/* insertion ボタンは一時非表示（将来対応予定）
                  <Tooltip title="insertion タグとして追加（ファイルアップロード）">
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddCustomProp('insertion')}
                      disabled={disabled}
                    >
                      <Tag color="purple" style={{ margin: 0 }}>insertion</Tag>
                    </Button>
                  </Tooltip>
                  */}
                </Space>

                {/* 追加済みカスタムプロパティ一覧 */}
                {currentCustomProps.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {renderCustomPropertyRows()}
                  </div>
                )}
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* 不確かさ基準選択モーダル */}
      <UncertaintyCriteriaSelectorModal
        open={criteriaSelectorOpen}
        onClose={() => {
          setCriteriaSelectorOpen(false);
          setCriteriaSelectorTarget(null);
        }}
        targetProperty={criteriaSelectorTarget}
        onAssign={(_payload: AssignPayload) => {
          // 付与結果の処理（必要に応じて拡張）
          setCriteriaSelectorOpen(false);
          setCriteriaSelectorTarget(null);
        }}
      />
    </div>
  );
};

export default TemplateInputPanel;
