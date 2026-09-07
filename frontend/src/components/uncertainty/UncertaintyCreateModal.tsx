'use client';

import React, { useState, useEffect } from 'react';
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
import { getTerms, type NamespaceTermRow } from '@/services/namespaceApiService';
import {
  NUMERIC_PROPERTY_TYPES,
  isUnitAllowed,
} from '@/utils/xsiTypeAttributes';

const { TextArea } = Input;

const DEFAULT_OPTIONS: QualitativeOption[] = [];

/**
 * xsi:type セレクト選択肢（グループ表示対応）
 * 数値型のみ（units が使用できる型）に限定する
 */
const XSI_TYPE_SELECT_OPTIONS = [
  {
    label: 'Simple Types',
    options: NUMERIC_PROPERTY_TYPES.filter((t) => t.category === 'Simple').map((t) => ({
      value: t.value,
      label: t.label,
    })),
  },
  {
    label: 'List Types',
    options: NUMERIC_PROPERTY_TYPES.filter((t) => t.category === 'List').map((t) => ({
      value: t.value,
      label: t.label,
    })),
  },
];

/** Props型定義 */
interface UncertaintyCreateModalProps {
  open: boolean;
  /** 一覧データ（継承元不確かさ基準の選択肢生成に使用） */
  allCriteria: UncertaintyTemplate[];
  /** 左ペインで選択中のスコープキー（Key属性設定プルダウンの用語絞り込みに使用） */
  selectedNsKey?: string | null;
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
  selectedNsKey,
  onClose,
  onSaved,
}: UncertaintyCreateModalProps) {
  const { t } = useLanguage();
  const [evalMode, setEvalMode] = useState<'quantitative' | 'qualitative'>('quantitative');
  const [qualitativeOptions, setQualitativeOptions] = useState<QualitativeOption[]>(DEFAULT_OPTIONS);
  const [termDisplayName, setTermDisplayName] = useState('');
  const [termDescription, setTermDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // ─── namespace_term から取得した用語一覧（Key属性設定プルダウンに使用） ───
  const [termRows, setTermRows] = useState<NamespaceTermRow[]>([]);

  // ─── モーダルが開いたとき、selectedNsKey に対応する namespace_term を取得 ───
  // 'company' / 'global' / 'ns-maiml' / 'ns-xsi' / null → scopeKey 未指定（全件取得）
  // 'personal-{userId}' → userId を scopeKey として渡す
  // organization_group_cd → そのまま scopeKey として渡す
  const FULL_SCOPE_KEYS_CREATE = new Set(['global', 'ns-maiml', 'ns-xsi', 'company', 'personal']);

  useEffect(() => {
    if (!open) return;

    let scopeKey: string | undefined;
    if (selectedNsKey && !FULL_SCOPE_KEYS_CREATE.has(selectedNsKey)) {
      if (selectedNsKey.startsWith('personal-')) {
        const userId = selectedNsKey.replace(/^personal-/, '');
        scopeKey = userId || undefined;
      } else {
        scopeKey = selectedNsKey;
      }
    }

    getTerms(scopeKey ? { scopeKey } : undefined)
      .then((rows) => setTermRows(rows))
      .catch((err) => {
        console.error('[UncertaintyCreateModal] 用語一覧取得エラー:', err);
        setTermRows([]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedNsKey]);

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

  // ─── Key属性設定の選択肢（namespace_term から取得した用語一覧を使用） ───
  const keyOptions = React.useMemo(() => {
    return termRows
      .filter((t) => t.isActive !== false)
      .map((t) => ({
        value: t.qname,
        label: t.displayName ? `${t.displayName}（${t.qname}）` : t.qname,
        displayName: t.displayName,
      }));
  }, [termRows]);

  /**
   * Key属性設定が選択されたとき、termRows から displayName / description を自動填入する
   */
  const handleKeyChange = (selectedKey: string | undefined) => {
    if (!selectedKey) {
      setTermDisplayName('');
      setTermDescription('');
      return;
    }
    const matched = termRows.find((t) => t.qname === selectedKey);
    setTermDisplayName(matched?.displayName ?? '');
    setTermDescription(matched?.description ?? '');
  };

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
        xsiType:         detail.xsiType ?? undefined,
        units:           detail.units ?? '',
        scaleFactor:     detail.scaleFactor ?? '',
        formatString:    detail.formatString ?? '',
        toleranceUpper:  detail.toleranceUpper !== null && detail.toleranceUpper !== undefined ? String(detail.toleranceUpper) : '',
        toleranceLower:  detail.toleranceLower !== null && detail.toleranceLower !== undefined ? String(detail.toleranceLower) : '',
      });

      // 定性評価の選択肢を反映
      if (newEvalMode === 'qualitative' && detail.qualitativeOptions.length > 0) {
        setQualitativeOptions(
          detail.qualitativeOptions.map((opt, idx) => ({
            id:        opt.displayOrder ?? idx + 1,
            value:     opt.selectorValue,
            color:     opt.displayColor,
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
    setTermDisplayName('');
    setTermDescription('');
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
      'uncertaintyKey',
      'xsiType',
      'units',
      'scaleFactor',
      'formatString',
      'toleranceUpper',
      'toleranceLower',
    ]);

    // uncertaintyKey に紐づく nameSpaceId を termRows から取得
    const matchedTerm = termRows.find((t) => t.qname === values.uncertaintyKey);
    // nameSpaceId が取れない場合は空文字（バックエンド側で組織ID等から補完可能）
    const nameSpaceId = matchedTerm?.namespaceId ?? '';

    setSaving(true);
    try {
      const result = await saveUncertaintyCriteriaNewVersion({
        nameSpaceId,
        uncertaintyKey:            values.uncertaintyKey,
        uncertaintyName:           termDisplayName,
        evaluationMethod:          evalMode === 'quantitative' ? 1 : 2,
        isInvalid:                 false, // 新規作成は常に有効
        inheritanceUncertaintyKey: values.inheritanceUncertaintyKey ?? null,
        xsiType:      evalMode === 'quantitative' ? (values.xsiType ?? null) : null,
        units:        evalMode === 'quantitative' ? (values.units || null) : null,
        formatString: evalMode === 'quantitative' ? (values.formatString || null) : null,
        scaleFactor:  evalMode === 'quantitative' ? (values.scaleFactor || null) : null,
        toleranceUpper: evalMode === 'quantitative' && values.toleranceUpper !== undefined && values.toleranceUpper !== '' ? Number(values.toleranceUpper) : null,
        toleranceLower: evalMode === 'quantitative' && values.toleranceLower !== undefined && values.toleranceLower !== '' ? Number(values.toleranceLower) : null,
        description:  termDescription || null,
        qualitativeOptions: evalMode === 'qualitative'
          ? qualitativeOptions.map((opt, idx) => ({
              displayOrder: idx + 1,
              value:        opt.value,
              displayColor: opt.color,
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

          {/* 参照元不確かさ基準 → uncertainty_criteria.inheritance_uncertainty_key */}
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
              onChange={handleKeyChange}
            />
          </Form.Item>

          {/* 不確かさ基準名 → namespace_term.display_name（Key属性設定に連動・表示専用） */}
          <Form.Item
            label={t('uncertaintyCreate.nameLabel')}
            style={{ marginBottom: 14 }}
          >
            <Input
              value={termDisplayName}
              readOnly
              disabled
              placeholder={t('uncertaintyCreate.nameReadOnlyPlaceholder')}
              style={{ background: '#f5f5f5', color: '#595959' }}
            />
          </Form.Item>

          {/* 説明文 → namespace_term.description（Key属性設定に連動・表示専用） */}
          <Form.Item
            label={t('uncertaintyCreate.descLabel')}
            style={{ marginBottom: 14 }}
          >
            <TextArea
              value={termDescription}
              readOnly
              disabled
              rows={3}
              placeholder={t('uncertaintyCreate.descReadOnlyPlaceholder')}
              style={{ background: '#f5f5f5', color: '#595959' }}
            />
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
            <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              {/* xsi:type → uncertainty_criteria.xsi_type */}
              <Form.Item
                name="xsiType"
                label={<span>xsi:type <span style={{ color: '#ff4d4f' }}>*</span></span>}
                initialValue="doubleType"
                style={{ marginBottom: 0 }}
              >
                <Select
                  options={XSI_TYPE_SELECT_OPTIONS}
                  onChange={(v) => {
                    // 単位不可の型に切り替えた場合は units をクリア
                    if (!isUnitAllowed(v)) {
                      form.setFieldValue('units', '');
                    }
                  }}
                />
              </Form.Item>
              {/* units → uncertainty_criteria.units */}
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.xsiType !== cur.xsiType}>
                {({ getFieldValue }) => {
                  const unitEnabled = isUnitAllowed(getFieldValue('xsiType') as string | undefined);
                  return (
                    <Form.Item
                      name="units"
                      label="units"
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        placeholder={unitEnabled ? 'GPa' : '—'}
                        disabled={!unitEnabled}
                      />
                    </Form.Item>
                  );
                }}
              </Form.Item>
              {/* format_string → uncertainty_criteria.format_string */}
              <Form.Item
                name="formatString"
                label="formatString"
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="#,###E0" />
              </Form.Item>
              {/* scale_factor → uncertainty_criteria.scale_factor */}
              <Form.Item
                name="scaleFactor"
                label="scaleFactor"
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="1" />
              </Form.Item>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              {/* tolerance_upper → uncertainty_criteria.tolerance_upper */}
              <Form.Item
                name="toleranceUpper"
                label={t('uncertaintyCreate.toleranceUpperLabel')}
                style={{ marginBottom: 0 }}
              >
                <Input type="number" placeholder={t('uncertaintyCreate.toleranceUpperPlaceholder')} />
              </Form.Item>
              {/* tolerance_lower → uncertainty_criteria.tolerance_lower */}
              <Form.Item
                name="toleranceLower"
                label={t('uncertaintyCreate.toleranceLowerLabel')}
                style={{ marginBottom: 0 }}
              >
                <Input type="number" placeholder={t('uncertaintyCreate.toleranceLowerPlaceholder')} />
              </Form.Item>
            </div>
            </>
          )}

          {/* 定性モード → intuition_selector */}
          {evalMode === 'qualitative' && (
            <QualitativeOptionEditor
              options={qualitativeOptions}
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
