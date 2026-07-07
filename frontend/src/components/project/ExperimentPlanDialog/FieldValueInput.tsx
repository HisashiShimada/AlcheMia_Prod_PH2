'use client';

import React from 'react';
import { Select, Input, InputNumber, Switch, Button, Tag, Space } from 'antd';
import { DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  isIntegerXsiType,
  isUnsignedIntXsiType,
  isListXsiType,
} from '@/utils/xsiTypeValidator';
import type { FieldValueInputProps } from '@/types/experimentPlanDialog';

// ============================================================
// FieldValueInput — xsi:type に応じた入力コンポーネント
// TemplateEditorDialog の ElementValueInput に相当
// ============================================================

/**
 * xsi:type に応じて適切な入力コンポーネントを返す。
 *
 * 優先順位:
 *   1. select 型 → Select（xsiType に関わらず）
 *   2. booleanType → Switch
 *   3. dateTimeType → DatePicker（showTime=true）
 *   4. dateType → DatePicker
 *   5. 整数型（intType, longType, ...） → InputNumber（precision=0）
 *   6. 実数型（floatType, doubleType, decimalType） → InputNumber
 *   7. リスト型 → TextArea
 *   8. それ以外 → Input
 */
const FieldValueInput: React.FC<FieldValueInputProps> = ({
  xsiType,
  fieldType,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  testId,
}) => {
  const xsi = xsiType ?? '';

  // ── select 型（xsiType に関わらず field.type='select' を優先） ──
  if (fieldType === 'select') {
    return (
      <Select
        value={value as string | undefined}
        onChange={(v) => onChange(v)}
        options={(options ?? []).map((o) => ({ label: o, value: o }))}
        style={{ width: '100%' }}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={testId}
      />
    );
  }

  // ── booleanType ──
  if (xsi === 'booleanType') {
    const checked = value === true || value === 'true' || value === '1';
    return (
      <Switch
        checked={checked}
        onChange={(v) => onChange(v)}
        disabled={disabled}
        checkedChildren="true"
        unCheckedChildren="false"
        data-testid={testId}
      />
    );
  }

  // ── dateTimeType ──
  if (xsi === 'dateTimeType') {
    return (
      <DatePicker
        showTime
        value={value ? dayjs(value as string) : null}
        onChange={(_date, dateStr) => {
          const str = Array.isArray(dateStr) ? dateStr[0] : dateStr;
          onChange(str ?? '');
        }}
        format="YYYY-MM-DD HH:mm:ss"
        style={{ width: '100%' }}
        disabled={disabled}
        data-testid={testId}
      />
    );
  }

  // ── dateType ──
  if (xsi === 'dateType') {
    return (
      <DatePicker
        value={value ? dayjs(value as string) : null}
        onChange={(_date, dateStr) => {
          const str = Array.isArray(dateStr) ? dateStr[0] : dateStr;
          onChange(str ?? '');
        }}
        format="YYYY-MM-DD"
        style={{ width: '100%' }}
        disabled={disabled}
        data-testid={testId}
      />
    );
  }

  // ── 整数型 ──
  if (isIntegerXsiType(xsi)) {
    const min = isUnsignedIntXsiType(xsi) ? 0 : undefined;
    return (
      <InputNumber
        value={value as number | undefined}
        onChange={(v) => {
          if (v !== null) onChange(v);
        }}
        precision={0}
        min={min}
        style={{ width: '100%' }}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={testId}
      />
    );
  }

  // ── 実数型 ──
  if (['floatType', 'doubleType', 'decimalType'].includes(xsi)) {
    return (
      <InputNumber
        value={value as number | undefined}
        onChange={(v) => {
          if (v !== null) onChange(v);
        }}
        style={{ width: '100%' }}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={testId}
      />
    );
  }

  // ── insertion（表示のみ：ファイル挿入が必要なことを示す情報表示） ──
  if (xsi === 'insertion') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
        <Tag color="purple" icon={<FileTextOutlined />} style={{ flexShrink: 0, margin: 0 }}>
          Insertion
        </Tag>
        <span style={{ fontStyle: 'italic', color: '#888', fontSize: 12, flex: 1 }}>
          ※ファイル挿入が必要です（実験実施時に対応）
        </span>
      </div>
    );
  }

  // ── contentXxxListType（複数行入力・行追加機能付き） ──
  if (xsi.startsWith('content') && xsi.endsWith('ListType')) {
    const strVal = typeof value === 'string' ? value : '';
    const rows: string[] = strVal !== '' ? strVal.split('\n') : [''];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((row, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 4 }}>
            <Input.TextArea
              value={row}
              onChange={(e) => {
                const newRows = [...rows];
                newRows[idx] = e.target.value;
                onChange(newRows.join('\n'));
              }}
              placeholder={`行 ${idx + 1}: 値をスペース区切りで入力（例: 1.0 2.5 3.0）`}
              autoSize={{ minRows: 1, maxRows: 3 }}
              disabled={disabled}
              style={{ flex: 1 }}
              data-testid={testId ? `${testId}-row-${idx}` : undefined}
            />
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              disabled={disabled || rows.length <= 1}
              onClick={() => {
                const newRows = rows.filter((_, i) => i !== idx);
                onChange(newRows.join('\n'));
              }}
            />
          </div>
        ))}
        <Button
          size="small"
          icon={<PlusOutlined />}
          disabled={disabled}
          onClick={() => {
            onChange([...rows, ''].join('\n'));
          }}
        >
          行を追加
        </Button>
      </div>
    );
  }

  // ── リスト型（TextArea でスペース区切り入力） ──
  if (isListXsiType(xsi)) {
    return (
      <Input.TextArea
        value={value as string | undefined}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder ?? 'スペース区切りで複数値を入力'}
        disabled={disabled}
        data-testid={testId}
      />
    );
  }

  // ── number（xsiType 未設定だが field.type='number'） ──
  if (fieldType === 'number') {
    return (
      <InputNumber
        value={value as number | undefined}
        onChange={(v) => {
          if (v !== null) onChange(v);
        }}
        style={{ width: '100%' }}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={testId}
      />
    );
  }

  // ── デフォルト: テキスト入力 ──
  return (
    <Input
      value={value as string | undefined}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      data-testid={testId}
    />
  );
};

export default FieldValueInput;
