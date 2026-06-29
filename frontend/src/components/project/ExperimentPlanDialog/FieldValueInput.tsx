'use client';

import React from 'react';
import { Select, Input, InputNumber, Switch } from 'antd';
import { DatePicker } from 'antd';
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
