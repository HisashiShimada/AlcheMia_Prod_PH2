'use client';

import React, { useState, useEffect } from 'react';
import {
  Select,
  Input,
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
import { CUSTOM_PROP_TYPE_OPTIONS } from '@/constants/experimentPlanConstants';
import type { TemplateInputPanelProps, CustomPropValue, CustomPropType } from '@/types/experimentPlanDialog';
import type { TemplateDef } from '@/types/experimentPlan';
import FieldValueInput from './FieldValueInput';
import UncertaintyCriteriaSelectorModal from '@/components/uncertainty/UncertaintyCriteriaSelectorModal';
import type { TargetProperty, AssignPayload } from '@/components/uncertainty/UncertaintyCriteriaSelectorModal';

const { Text } = Typography;
const { useToken } = theme;

const TemplateInputPanel: React.FC<TemplateInputPanelProps> = ({
  methodTemplates,
  templateValues,
  onValueChange,
  customProps,
  onCustomPropsChange,
  disabled = false,
}) => {
  const { token } = useToken();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState('');
  const [pendingType, setPendingType] = useState<CustomPropType>('stringType');
  const [pendingUnits, setPendingUnits] = useState('');

  // 不確かさ基準選択モーダル用 state
  const [criteriaSelectorOpen, setCriteriaSelectorOpen] = useState(false);
  const [criteriaSelectorTarget, setCriteriaSelectorTarget] = useState<TargetProperty | null>(null);

  // methodTemplates が変わった（メソッド切り替え等）場合は選択リセット
  useEffect(() => {
    setSelectedTemplateId(null);
  }, [methodTemplates]);

  const selectedTemplate = methodTemplates.find((t) => t.id === selectedTemplateId) ?? null;

  /** 選択中テンプレートのカスタムプロパティを追加 */
  const handleAddCustomProp = () => {
    if (!selectedTemplate || !pendingKey.trim()) return;
    const existing = customProps[selectedTemplate.id] ?? [];
    const newProp: CustomPropValue = {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      key: pendingKey.trim(),
      type: pendingType,
      value: '',
      units: pendingUnits,
    };
    onCustomPropsChange(selectedTemplate.id, [...existing, newProp]);
    setPendingKey('');
    setPendingUnits('');
  };

  /** カスタムプロパティを削除 */
  const handleRemoveCustomProp = (templateId: string, propId: string) => {
    const existing = customProps[templateId] ?? [];
    onCustomPropsChange(templateId, existing.filter((p) => p.id !== propId));
  };

  /** カスタムプロパティの値を更新 */
  const handleCustomPropValueChange = (templateId: string, propId: string, value: string) => {
    const existing = customProps[templateId] ?? [];
    onCustomPropsChange(
      templateId,
      existing.map((p) => (p.id === propId ? { ...p, value } : p))
    );
  };

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

  const currentCustomProps = selectedTemplate ? (customProps[selectedTemplate.id] ?? []) : [];

  return (
    <div>
      <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
        テンプレート入力
      </Text>

      <Row gutter={12}>
        {/* 左側: テンプレート一覧 */}
        <Col span={10}>
          <Card
            size="small"
            title={<Text style={{ fontSize: 12 }}>テンプレート一覧</Text>}
            styles={{ body: { padding: 0 } }}
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
                          <Button
                            type="primary"
                            size="small"
                            disabled={disabled}
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
                          disabled={disabled}
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
                <Space wrap style={{ marginBottom: 6 }}>
                  <Input
                    placeholder="Key（プロパティ名）"
                    value={pendingKey}
                    onChange={(e) => setPendingKey(e.target.value)}
                    style={{ width: 160 }}
                    size="small"
                    disabled={disabled}
                  />
                  <Select
                    value={pendingType}
                    onChange={setPendingType}
                    options={CUSTOM_PROP_TYPE_OPTIONS}
                    style={{ width: 160 }}
                    size="small"
                    disabled={disabled}
                  />
                  <Input
                    placeholder="単位（任意）"
                    value={pendingUnits}
                    onChange={(e) => setPendingUnits(e.target.value)}
                    style={{ width: 100 }}
                    size="small"
                    disabled={disabled}
                  />
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleAddCustomProp}
                    disabled={disabled || !pendingKey.trim()}
                  >
                    追加
                  </Button>
                </Space>

                {/* 追加済みカスタムプロパティ一覧 */}
                {currentCustomProps.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {currentCustomProps.map((cp) => (
                      <div
                        key={cp.id}
                        style={{
                          display: 'flex',
                          gap: 6,
                          alignItems: 'center',
                          marginBottom: 6,
                          padding: '4px 8px',
                          border: `1px solid ${token.colorBorder}`,
                          borderRadius: token.borderRadius,
                          backgroundColor: token.colorFillAlter,
                        }}
                      >
                        <Text style={{ fontSize: 11, minWidth: 90, flexShrink: 0 }}>
                          {cp.key}
                          {cp.units && (
                            <Tag color="blue" style={{ fontSize: 9, margin: '0 0 0 4px' }}>
                              {cp.units}
                            </Tag>
                          )}
                        </Text>
                        <Tag style={{ fontSize: 10, flexShrink: 0 }}>{cp.type}</Tag>
                        <Input
                          value={cp.value}
                          onChange={(e) =>
                            handleCustomPropValueChange(selectedTemplate.id, cp.id, e.target.value)
                          }
                          placeholder="値を入力"
                          size="small"
                          style={{ flex: 1, minWidth: 80 }}
                          disabled={disabled}
                        />
                        <Button
                          type="primary"
                          size="small"
                          disabled={disabled}
                          onClick={() => {
                            setCriteriaSelectorTarget({
                              name: cp.key,
                              xpath: cp.key,
                              tag: 'property',
                              type: cp.type,
                              value: cp.value,
                              unit: cp.units,
                              section: selectedTemplate.category as 'material' | 'condition' | 'result',
                            });
                            setCriteriaSelectorOpen(true);
                          }}
                        >
                          不確かさ選択
                        </Button>
                        <Tooltip title="削除">
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveCustomProp(selectedTemplate.id, cp.id)}
                            disabled={disabled}
                          />
                        </Tooltip>
                      </div>
                    ))}
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
