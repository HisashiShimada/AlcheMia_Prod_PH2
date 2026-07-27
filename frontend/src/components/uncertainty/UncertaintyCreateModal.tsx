'use client';

import React, { useState } from 'react';
import {
  Modal,
  Button,
  Form,
  Input,
  Select,
  Segmented,
  Space,
  message,
} from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';
import QualitativeOptionEditor, { type QualitativeOption } from './QualitativeOptionEditor';
import type { UncertaintyTemplate } from './UncertaintyListTable';
import {
  fetchUncertaintyCriteriaDetail,
  saveUncertaintyCriteriaNewVersion,
} from '@/services/uncertaintyCriteriaApiService';

const { TextArea } = Input;

/** xsi:type の選択肢 */
const XSI_TYPE_OPTIONS = [
  { value: 'doubleType', label: 'doubleType' },
  { value: 'decimalType', label: 'decimalType' },
  { value: 'intType', label: 'intType' },
  { value: 'stringType', label: 'stringType' },
];

const DEFAULT_OPTIONS: QualitativeOption[] = [
  { id: 1, value: '', color: '#FFFFFF', isDefault: true },
];

/** Props型定義 */
interface UncertaintyCreateModalProps {
  open: boolean;
  /** 一覧データ（継承元不確かさ基準の選択肢生成に使用） */
  allCriteria: UncertaintyTemplate[];
  onClose: () => void;
  /** 保存成功時コールバック（一覧再取得などに使用） */
  onSaved?: () => void;
}

/**
 * 不確かさ基準作成モーダルコンポーネント
 * 基本情報・評価方式設定（定量/定性切替）・適用範囲を含むフォーム
 */
export default function UncertaintyCreateModal({
  open,
  allCriteria,
  onClose,
  onSaved,
}: UncertaintyCreateModalProps) {
  const { t } = useLanguage();
  const [evalMode, setEvalMode] = useState<'quantitative' | 'qualitative'>('quantitative');
  const [qualitativeOptions, setQualitativeOptions] = useState<QualitativeOption[]>(DEFAULT_OPTIONS);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // ─── 継承元不確かさ基準の選択肢（一覧から uncertainty_key を収集） ───
  const parentOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of allCriteria) {
      if (c.key && !map.has(c.key)) {
        map.set(c.key, c.name ?? c.key);
      }
    }
    return Array.from(map.entries()).map(([key, name]) => ({
      value: key,
      label: name,   // filterOption 用（検索対象）
      name,          // optionRender 用
    }));
  }, [allCriteria]);

  // ─── Key属性設定の選択肢（一覧から uncertainty_key のみ収集） ───
  const keyOptions = React.useMemo(() => {
    const keys = Array.from(new Set(allCriteria.map((c) => c.key).filter(Boolean)));
    return keys.map((k) => ({ value: k, label: k }));
  }, [allCriteria]);

  /**
   * 継承元不確かさ基準が選択されたとき、その最新バージョンの詳細を取得してフォームに反映する
   */
  const handleParentChange = async (selectedKey: string | undefined) => {
    if (!selectedKey) return;

    // 選択されたキーの最新バージョンを allCriteria から取得
    const matched = allCriteria
      .filter((c) => c.key === selectedKey)
      .sort((a, b) => {
        const vA = parseInt(a.version.replace(/^V/i, ''), 10);
        const vB = parseInt(b.version.replace(/^V/i, ''), 10);
        return vB - vA; // 降順（最新が先頭）
      });

    if (matched.length === 0) return;

    const latestVersion = parseInt(matched[0].version.replace(/^V/i, ''), 10);

    try {
      const detail = await fetchUncertaintyCriteriaDetail(selectedKey, latestVersion);

      // フォームに反映
      const newEvalMode = detail.evaluationMethod === 1 ? 'quantitative' : 'qualitative';
      setEvalMode(newEvalMode);

      form.setFieldsValue({
        uncertaintyName: detail.uncertaintyName ?? '',
        description:     detail.description ?? '',
        xsiType:         detail.xsiType ?? undefined,
        units:           detail.units ?? '',
        formatString:    detail.formatString ?? '',
      });

      // 定性評価の選択肢を反映
      if (newEvalMode === 'qualitative' && detail.qualitativeOptions.length > 0) {
        setQualitativeOptions(
          detail.qualitativeOptions.map((opt, idx) => ({
            id:        opt.displayOrder ?? idx + 1,
            value:     opt.selectorValue,
            color:     opt.displayColor,
            isDefault: opt.isDefault,
          }))
        );
      } else {
        setQualitativeOptions(DEFAULT_OPTIONS);
      }
    } catch {
      message.error(t('uncertaintyCreate.inheritanceFetchFailed'));
    }
  };

  /** リセット & 閉じる */
  const handleClose = () => {
    form.resetFields();
    setEvalMode('quantitative');
    setQualitativeOptions(DEFAULT_OPTIONS);
    onClose();
  };

  /** 保存（新バージョンとしてDBにINSERT） */
  const handleSave = async () => {
    try {
      await form.validateFields();
    } catch {
      return; // バリデーションエラーは Form が表示するため何もしない
    }

    const values = form.getFieldsValue([
      'inheritanceUncertaintyKey',
      'uncertaintyName',
      'uncertaintyKey',
      'description',
      'xsiType',
      'units',
      'formatString',
    ]);

    // uncertaintyKey に紐づく nameSpaceId を allCriteria から取得
    const matched = allCriteria.find((c) => c.key === values.uncertaintyKey);
    // nameSpaceId が取れない場合は空文字（バックエンド側で組織ID等から補完可能）
    const nameSpaceId = (matched as any)?.nameSpaceId ?? '';

    setSaving(true);
    try {
      const result = await saveUncertaintyCriteriaNewVersion({
        nameSpaceId,
        uncertaintyKey:            values.uncertaintyKey,
        uncertaintyName:           values.uncertaintyName ?? '',
        evaluationMethod:          evalMode === 'quantitative' ? 1 : 2,
        isInvalid:                 false, // 新規作成は常に有効
        inheritanceUncertaintyKey: values.inheritanceUncertaintyKey ?? null,
        xsiType:      evalMode === 'quantitative' ? (values.xsiType ?? null) : null,
        units:        evalMode === 'quantitative' ? (values.units || null) : null,
        formatString: evalMode === 'quantitative' ? (values.formatString || null) : null,
        description:  values.description || null,
        qualitativeOptions: evalMode === 'qualitative'
          ? qualitativeOptions.map((opt, idx) => ({
              displayOrder: idx + 1,
              value:        opt.value,
              displayColor: opt.color,
              isDefault:    opt.isDefault,
            }))
          : [],
      });

      message.success(t('uncertaintyCreate.savedAs', { version: String(result.version) }));
      onSaved?.();
      handleClose();
    } catch {
      message.error(t('uncertaintyCreate.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={900}
      title={<span style={{ fontSize: 16, fontWeight: 700 }}>{t('uncertaintyCreate.title')}</span>}
      footer={
        <Space>
          <Button onClick={handleClose} disabled={saving}>{t('uncertaintyCreate.cancel')}</Button>
          <Button type="primary" onClick={handleSave} loading={saving}>{t('uncertaintyCreate.save')}</Button>
        </Space>
      }
      styles={{ body: { padding: '16px 24px', maxHeight: '75vh', overflowY: 'auto' } }}
    >
      <Form form={form} layout="vertical" size="middle">

        {/* ===== 1. 基本情報 ===== */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>{t('uncertaintyCreate.section1Title')}</div>

          {/* 継承元不確かさ基準 → uncertainty_criteria.inheritance_uncertainty_key */}
          <Form.Item
            name="inheritanceUncertaintyKey"
            label={t('uncertaintyCreate.inheritanceLabel')}
            style={{ marginBottom: 14 }}
          >
            <Select
              placeholder={t('uncertaintyCreate.inheritancePlaceholder')}
              allowClear
              options={parentOptions}
              showSearch
              filterOption={(input, option) =>
                [option?.label ?? '', option?.value ?? '']
                  .some((s) => String(s).toLowerCase().includes(input.toLowerCase()))
              }
              onChange={handleParentChange}
              optionRender={(option) => (
                <div>
                  <div style={{ fontWeight: 500, lineHeight: '20px' }}>
                    {(option.data as { name: string }).name}
                  </div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', lineHeight: '16px' }}>
                    {String(option.value)}
                  </div>
                </div>
              )}
              labelRender={(props) => {
                const matched = parentOptions.find((o) => o.value === props.value);
                const name = matched?.name ?? String(props.value ?? '');
                return (
                  <span>
                    {name}
                    <span style={{ fontSize: 11, color: '#8c8c8c', marginLeft: 4 }}>
                      ({String(props.value)})
                    </span>
                  </span>
                );
              }}
            />
          </Form.Item>

          {/* 不確かさ基準名 → uncertainty_criteria.uncertainty_name */}
          <Form.Item
            name="uncertaintyName"
            label={t('uncertaintyCreate.nameLabel')}
            style={{ marginBottom: 14 }}
          >
            <Input placeholder={t('uncertaintyCreate.namePlaceholder')} />
          </Form.Item>

          {/* Key属性設定 → uncertainty_criteria.uncertainty_key（プルダウン選択） */}
          <Form.Item
            name="uncertaintyKey"
            label={<span>{t('uncertaintyCreate.keyLabel')}<span style={{ color: '#ff4d4f' }}> *</span></span>}
            rules={[{ required: true, message: t('uncertaintyCreate.keyRequired') }]}
            style={{ marginBottom: 14 }}
          >
            <Select
              placeholder={t('uncertaintyCreate.keyPlaceholder')}
              allowClear
              options={keyOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          {/* 説明文 → uncertainty_criteria.description */}
          <Form.Item
            name="description"
            label={t('uncertaintyCreate.descLabel')}
            style={{ marginBottom: 14 }}
          >
            <TextArea rows={3} placeholder={t('uncertaintyCreate.descPlaceholder')} />
          </Form.Item>
        </div>

        {/* ===== 2. 評価方式設定 ===== */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>{t('uncertaintyCreate.section2Title')}</div>

          {/* 評価方式 → uncertainty_criteria.evaluation_method */}
          <Form.Item label={t('uncertaintyCreate.evalMethodLabel')} style={{ marginBottom: 16 }}>
            <Segmented
              value={evalMode}
              onChange={(v) => setEvalMode(v as 'quantitative' | 'qualitative')}
              options={[
                { value: 'quantitative', label: t('uncertaintyCreate.evalQuantitative') },
                { value: 'qualitative', label: t('uncertaintyCreate.evalQualitative') },
              ]}
            />
          </Form.Item>

          {/* 定量モード */}
          {evalMode === 'quantitative' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {/* xsi:type → uncertainty_criteria.xsi_type */}
              <Form.Item
                name="xsiType"
                label={<span>xsi:type <span style={{ color: '#ff4d4f' }}>*</span></span>}
                initialValue="doubleType"
                style={{ marginBottom: 0 }}
              >
                <Select options={XSI_TYPE_OPTIONS} />
              </Form.Item>
              {/* units → uncertainty_criteria.units */}
              <Form.Item
                name="units"
                label={<span>units <span style={{ color: '#ff4d4f' }}>*</span></span>}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="GPa" />
              </Form.Item>
              {/* format_string → uncertainty_criteria.format_string */}
              <Form.Item
                name="formatString"
                label="formatString"
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="#,###E0" />
              </Form.Item>
            </div>
          )}

          {/* 定性モード → intuition_selector */}
          {evalMode === 'qualitative' && (
            <QualitativeOptionEditor
              options={qualitativeOptions}
              radioName="defaultOptionCreate"
              onChange={setQualitativeOptions}
            />
          )}
        </div>

      </Form>
    </Modal>
  );
}

/* ========== スタイル定数 ========== */
const sectionStyle: React.CSSProperties = {
  border: '1px solid #e8e8e8',
  borderRadius: 6,
  padding: '14px 16px',
  marginBottom: 16,
  background: '#fff',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#1677ff',
  marginBottom: 14,
  paddingBottom: 6,
  borderBottom: '1px solid #f0f5ff',
};
