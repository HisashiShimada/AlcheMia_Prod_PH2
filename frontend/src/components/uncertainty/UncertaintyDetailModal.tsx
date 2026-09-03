'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Form,
  Input,
  Select,
  Segmented,
  Switch,
  Tag,
  Space,
  message,
  Spin,
} from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';
import QualitativeOptionEditor, { type QualitativeOption } from './QualitativeOptionEditor';
import type { UncertaintyTemplate } from './UncertaintyListTable';
import TemplateDiffPreviewModal, { type DiffData, type DiffField } from './TemplateDiffPreviewModal';
import {
  fetchUncertaintyCriteriaDetail,
  saveUncertaintyCriteriaNewVersion,
  type UncertaintyCriteriaDetailApiRow,
} from '@/services/uncertaintyCriteriaApiService';

const { TextArea } = Input;

/** xsi:type の選択肢 */
const XSI_TYPE_OPTIONS = [
  { value: 'doubleType', label: 'doubleType' },
  { value: 'decimalType', label: 'decimalType' },
  { value: 'intType', label: 'intType' },
  { value: 'stringType', label: 'stringType' },
];

/** Props型定義 */
interface UncertaintyDetailModalProps {
  open: boolean;
  template: UncertaintyTemplate | null;
  /** 最新バージョンかどうか（trueのみ有効⇔非推奨の切替が可能） */
  isLatestVersion: boolean;
  /** 一覧データ（継承元不確かさ基準の選択肢生成に使用） */
  allCriteria: UncertaintyTemplate[];
  onClose: () => void;
  /** 保存成功時コールバック（一覧再取得などに使用） */
  onSaved?: () => void;
}

/**
 * バージョン文字列（例: "V1"）から整数を取り出す
 */
function parseVersionNumber(versionStr: string): number {
  const num = parseInt(versionStr.replace(/^V/i, ''), 10);
  return isNaN(num) ? 1 : num;
}

/**
 * 評価方式数値を文字列に変換
 */
function toEvalMode(v: number): 'quantitative' | 'qualitative' {
  return v === 1 ? 'quantitative' : 'qualitative';
}

// ─────────────────────────────────────────────────────────────
// 差分データ計算ユーティリティ
// ─────────────────────────────────────────────────────────────

/** 文字列の変更種別を判定 */
function changeType(
  oldVal: string | null | undefined,
  newVal: string | null | undefined
): 'same' | 'changed' {
  const o = oldVal ?? '';
  const n = newVal ?? '';
  return o === n ? 'same' : 'changed';
}

/** buildDiffData に渡す翻訳済みラベル群 */
interface DiffLabels {
  fieldName: string;
  fieldKey: string;
  fieldDesc: string;
  fieldStatus: string;
  statusActive: string;
  statusDeprecated: string;
  fieldEvalMethod: string;
  fieldQualOptions: string;
  defaultMark: string;
  savedAt: string;
  section1: string;
  section2: string;
  fieldToleranceUpper: string;
  fieldToleranceLower: string;
}

/**
 * DB取得値とフォーム現在値から DiffData を生成する
 */
function buildDiffData(
  detail: UncertaintyCriteriaDetailApiRow,
  formValues: {
    uncertaintyName: string;
    desc: string;
    xsiType: string | undefined;
    units: string;
    formatString: string;
    scaleFactor: string;
    toleranceUpper: string;
    toleranceLower: string;
  },
  currentEvalMode: 'quantitative' | 'qualitative',
  currentStatus: 'active' | 'deprecated',
  qualitativeOptions: QualitativeOption[],
  labels: DiffLabels
): DiffData {
  // ── 基本情報フィールド ──
  const oldStatus = detail.isInvalid ? 'deprecated' : 'active';
  const oldEvalMode = toEvalMode(detail.evaluationMethod);

  const basicFields: DiffField[] = [
    {
      fieldKey:   'uncertaintyName',
      label:      labels.fieldName,
      required:   false,
      changeType: changeType(detail.uncertaintyName, formValues.uncertaintyName),
      type:       'text',
      oldValue:   detail.uncertaintyName ?? null,
      newValue:   formValues.uncertaintyName || null,
    },
    {
      fieldKey:   'uncertaintyKey',
      label:      labels.fieldKey,
      required:   true,
      changeType: 'same',
      type:       'text',
      oldValue:   detail.uncertaintyKey,
      newValue:   detail.uncertaintyKey,
    },
    {
      fieldKey:   'desc',
      label:      labels.fieldDesc,
      required:   false,
      changeType: changeType(detail.description, formValues.desc),
      type:       'textarea',
      oldValue:   detail.description ?? null,
      newValue:   formValues.desc || null,
    },
    {
      fieldKey:   'status',
      label:      labels.fieldStatus,
      required:   false,
      changeType: oldStatus === currentStatus ? 'same' : 'changed',
      type:       'text',
      oldValue:   oldStatus === 'active' ? labels.statusActive : labels.statusDeprecated,
      newValue:   currentStatus === 'active' ? labels.statusActive : labels.statusDeprecated,
    },
  ];

  // ── 評価方式フィールド ──
  const evalFields: DiffField[] = [
    {
      fieldKey:   'evaluationMethod',
      label:      labels.fieldEvalMethod,
      required:   true,
      changeType: oldEvalMode === currentEvalMode ? 'same' : 'changed',
      type:       'evalBadge',
      oldValue:   oldEvalMode,
      newValue:   currentEvalMode,
    },
  ];

  // 定量フィールド
  if (currentEvalMode === 'quantitative' || oldEvalMode === 'quantitative') {
    evalFields.push(
      {
        fieldKey:   'xsiType',
        label:      'xsi:type',
        required:   true,
        changeType: changeType(detail.xsiType, formValues.xsiType),
        type:       'specTag',
        oldValue:   detail.xsiType ?? null,
        newValue:   formValues.xsiType ?? null,
      },
      {
        fieldKey:   'units',
        label:      'units',
        required:   true,
        changeType: changeType(detail.units, formValues.units),
        type:       'specTag',
        oldValue:   detail.units ?? null,
        newValue:   formValues.units || null,
      },
      {
        fieldKey:   'formatString',
        label:      'formatString',
        required:   false,
        changeType: changeType(detail.formatString, formValues.formatString),
        type:       'specTag',
        oldValue:   detail.formatString ?? null,
        newValue:   formValues.formatString || null,
      },
      {
        fieldKey:   'scaleFactor',
        label:      'scaleFactor',
        required:   false,
        changeType: changeType(detail.scaleFactor, formValues.scaleFactor),
        type:       'specTag',
        oldValue:   detail.scaleFactor ?? null,
        newValue:   formValues.scaleFactor || null,
      },
      {
        fieldKey:   'toleranceUpper',
        label:      labels.fieldToleranceUpper,
        required:   false,
        changeType: changeType(
          detail.toleranceUpper !== null && detail.toleranceUpper !== undefined ? String(detail.toleranceUpper) : null,
          formValues.toleranceUpper || null
        ),
        type:       'specTag',
        oldValue:   detail.toleranceUpper !== null && detail.toleranceUpper !== undefined ? String(detail.toleranceUpper) : null,
        newValue:   formValues.toleranceUpper || null,
      },
      {
        fieldKey:   'toleranceLower',
        label:      labels.fieldToleranceLower,
        required:   false,
        changeType: changeType(
          detail.toleranceLower !== null && detail.toleranceLower !== undefined ? String(detail.toleranceLower) : null,
          formValues.toleranceLower || null
        ),
        type:       'specTag',
        oldValue:   detail.toleranceLower !== null && detail.toleranceLower !== undefined ? String(detail.toleranceLower) : null,
        newValue:   formValues.toleranceLower || null,
      }
    );
  }

  // 定性フィールド（選択肢を文字列で比較：順番・デフォルト値を含む）
  if (currentEvalMode === 'qualitative' || oldEvalMode === 'qualitative') {
    const oldOptionsStr = detail.qualitativeOptions
      .map((o, i) => {
        const order = o.displayOrder ?? (i + 1);
        const def = o.isDefault ? labels.defaultMark : '';
        return `${order}:${o.selectorValue}(${o.displayColor})${def}`;
      })
      .join(', ') || null;
    const newOptionsStr = qualitativeOptions
      .map((o, i) => {
        const def = o.isDefault ? labels.defaultMark : '';
        return `${i + 1}:${o.value}(${o.color})${def}`;
      })
      .join(', ') || null;

    evalFields.push({
      fieldKey:   'qualitativeOptions',
      label:      labels.fieldQualOptions,
      required:   false,
      changeType: changeType(oldOptionsStr, newOptionsStr),
      type:       'text',
      oldValue:   oldOptionsStr,
      newValue:   newOptionsStr,
    });
  }

  // ── サマリー集計 ──
  const allFields = [...basicFields, ...evalFields];
  const changedCount = allFields.filter((f) => f.changeType === 'changed').length;
  const addedCount   = allFields.filter((f) => f.changeType === 'added').length;
  const sameCount    = allFields.filter((f) => f.changeType === 'same').length;

  return {
    templateKey:    detail.uncertaintyKey,
    templateName:   detail.uncertaintyKey,
    savedVersion:   `V${detail.version}`,
    savedAt:        labels.savedAt,
    summary: {
      changed: changedCount,
      added:   addedCount,
      same:    sameCount,
    },
    sections: [
      { num: '1', label: labels.section1, fields: basicFields },
      { num: '2', label: labels.section2, fields: evalFields  },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────────

/**
 * 不確かさ基準詳細・編集モーダルコンポーネント
 * 既存不確かさ基準データを初期値として編集可能なフォームを表示する
 */
export default function UncertaintyDetailModal({
  open,
  template,
  isLatestVersion,
  onClose,
  onSaved,
}: UncertaintyDetailModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<UncertaintyCriteriaDetailApiRow | null>(null);

  const [evalMode, setEvalMode] = useState<'quantitative' | 'qualitative'>('quantitative');
  const [qualitativeOptions, setQualitativeOptions] = useState<QualitativeOption[]>([]);
  const [diffPreviewOpen, setDiffPreviewOpen] = useState(false);
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [statusState, setStatusState] = useState<'active' | 'deprecated'>('active');
  const [form] = Form.useForm();

  /** buildDiffData に渡す翻訳ラベルを生成 */
  const buildDiffLabels = (): DiffLabels => ({
    fieldName:       t('uncertaintyDetail.diffFieldName'),
    fieldKey:        t('uncertaintyDetail.diffFieldKey'),
    fieldDesc:       t('uncertaintyDetail.diffFieldDesc'),
    fieldStatus:     t('uncertaintyDetail.diffFieldStatus'),
    statusActive:    t('uncertaintyDetail.diffStatusActive'),
    statusDeprecated: t('uncertaintyDetail.diffStatusDeprecated'),
    fieldEvalMethod: t('uncertaintyDetail.diffFieldEvalMethod'),
    fieldQualOptions: t('uncertaintyDetail.diffFieldQualOptions'),
    defaultMark:     t('uncertaintyDetail.diffDefaultMark'),
    savedAt:         t('uncertaintyDetail.diffSavedAt'),
    section1:        t('uncertaintyDetail.section1Title'),
    section2:        t('uncertaintyDetail.section2Title'),
    fieldToleranceUpper: t('uncertaintyDetail.diffFieldToleranceUpper'),
    fieldToleranceLower: t('uncertaintyDetail.diffFieldToleranceLower'),
  });

  /** モーダルが開いたら詳細データを API から取得してフォームに反映 */
  useEffect(() => {
    if (!open || !template) return;

    const versionNum = parseVersionNumber(template.version);

    setLoading(true);
    setDetail(null);
    setDiffData(null);

    fetchUncertaintyCriteriaDetail(template.key, versionNum)
      .then((data) => {
        setDetail(data);

        const evalModeValue = data.evaluationMethod === 1 ? 'quantitative' : 'qualitative';
        setEvalMode(evalModeValue);
        setStatusState(data.isInvalid ? 'deprecated' : 'active');

        setQualitativeOptions(
          data.qualitativeOptions.map((opt, idx) => ({
            id:        opt.displayOrder ?? idx + 1,
            value:     opt.selectorValue,
            color:     opt.displayColor,
            isDefault: opt.isDefault,
          }))
        );

        form.setFieldsValue({
          uncertaintyName:           data.uncertaintyName ?? '',
          uncertaintyKey:            data.uncertaintyKey,
          desc:                      data.description ?? '',
          xsiType:                   data.xsiType ?? undefined,
          units:                     data.units ?? '',
          formatString:              data.formatString ?? '',
          scaleFactor:               data.scaleFactor ?? '',
          toleranceUpper:            data.toleranceUpper !== null && data.toleranceUpper !== undefined ? String(data.toleranceUpper) : '',
          toleranceLower:            data.toleranceLower !== null && data.toleranceLower !== undefined ? String(data.toleranceLower) : '',
        });
      })
      .catch(() => {
        message.error(t('uncertaintyDetail.fetchFailed'));
      })
      .finally(() => setLoading(false));
  }, [open, template, form]);

  /** 差分プレビューを開く */
  const handleOpenDiffPreview = () => {
    if (!detail) return;

    const formValues = form.getFieldsValue([
      'uncertaintyName',
      'desc',
      'xsiType',
      'units',
      'formatString',
      'scaleFactor',
      'toleranceUpper',
      'toleranceLower',
    ]);

    const computed = buildDiffData(
      detail,
      {
        uncertaintyName: formValues.uncertaintyName ?? '',
        desc:         formValues.desc ?? '',
        xsiType:      formValues.xsiType,
        units:        formValues.units ?? '',
        formatString: formValues.formatString ?? '',
        scaleFactor:  formValues.scaleFactor ?? '',
        toleranceUpper: formValues.toleranceUpper ?? '',
        toleranceLower: formValues.toleranceLower ?? '',
      },
      evalMode,
      statusState,
      qualitativeOptions,
      buildDiffLabels()
    );

    setDiffData(computed);
    setDiffPreviewOpen(true);
  };

  /** 保存（新バージョンとしてDBにINSERT） */
  const handleSave = async () => {
    if (!detail || !template) return;

    const formValues = form.getFieldsValue([
      'uncertaintyName',
      'desc',
      'xsiType',
      'units',
      'formatString',
      'scaleFactor',
      'toleranceUpper',
      'toleranceLower',
    ]);

    // ── 差分チェック：変更がなければ保存しない ──
    const diff = buildDiffData(
      detail,
      {
        uncertaintyName: formValues.uncertaintyName ?? '',
        desc:         formValues.desc ?? '',
        xsiType:      formValues.xsiType,
        units:        formValues.units ?? '',
        formatString: formValues.formatString ?? '',
        scaleFactor:  formValues.scaleFactor ?? '',
        toleranceUpper: formValues.toleranceUpper ?? '',
        toleranceLower: formValues.toleranceLower ?? '',
      },
      evalMode,
      statusState,
      qualitativeOptions,
      buildDiffLabels()
    );
    const hasChange = diff.summary.changed > 0 || diff.summary.added > 0;
    if (!hasChange) {
      message.warning(t('uncertaintyDetail.noChanges'));
      return;
    }

    setLoading(true);
    try {
      const result = await saveUncertaintyCriteriaNewVersion({
        nameSpaceId:               detail.nameSpaceId,
        uncertaintyKey:            detail.uncertaintyKey,
        uncertaintyName:           formValues.uncertaintyName ?? '',
        evaluationMethod:          evalMode === 'quantitative' ? 1 : 2,
        isInvalid:                 statusState === 'deprecated',
        inheritanceUncertaintyKey: detail.inheritanceUncertaintyKey ?? null,
        xsiType:                   evalMode === 'quantitative' ? (formValues.xsiType ?? null) : null,
        units:                     evalMode === 'quantitative' ? (formValues.units || null) : null,
        formatString:              evalMode === 'quantitative' ? (formValues.formatString || null) : null,
        scaleFactor:               evalMode === 'quantitative' ? (formValues.scaleFactor || null) : null,
        toleranceUpper:            evalMode === 'quantitative' && formValues.toleranceUpper !== undefined && formValues.toleranceUpper !== '' ? Number(formValues.toleranceUpper) : null,
        toleranceLower:            evalMode === 'quantitative' && formValues.toleranceLower !== undefined && formValues.toleranceLower !== '' ? Number(formValues.toleranceLower) : null,
        description:               formValues.desc || null,
        qualitativeOptions:        evalMode === 'qualitative'
          ? qualitativeOptions.map((opt, idx) => ({
              displayOrder: idx + 1,
              value:        opt.value,
              displayColor: opt.color,
              isDefault:    opt.isDefault,
            }))
          : [],
      });

      message.success(t('uncertaintyDetail.savedAs', { version: String(result.version) }));
      onSaved?.();
      onClose();
    } catch {
      message.error(t('uncertaintyDetail.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!template) return null;

  const statusTag =
    statusState === 'active' ? (
      <Tag color="success" style={{ fontWeight: 600 }}>● {t('uncertaintyDetail.statusActive')}</Tag>
    ) : (
      <Tag color="default" style={{ fontWeight: 600 }}>○ {t('uncertaintyDetail.statusDeprecated')}</Tag>
    );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={900}
      title={
        <Space>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            📋 {template.key} — {t('uncertaintyDetail.titleSuffix')}
          </span>
          {statusTag}
        </Space>
      }
      footer={
        <Space>
          <Button onClick={onClose}>{t('common.close')}</Button>
          <Button
            style={{ color: '#722ed1', borderColor: '#d3adf7' }}
            onClick={handleOpenDiffPreview}
            disabled={loading || !detail}
          >
            🔍 {t('uncertaintyDetail.diffPreview')}
          </Button>
          <Button type="primary" onClick={handleSave} disabled={loading}>
            {t('common.save')}
          </Button>
        </Space>
      }
      styles={{ body: { padding: '16px 24px', maxHeight: '75vh', overflowY: 'auto' } }}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" size="middle">

          {/* ===== 1. 基本情報 ===== */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>1. {t('uncertaintyDetail.section1Title')}</div>

            {/* Key属性設定 → uncertainty_criteria.uncertainty_key（読み取り専用） */}
            <Form.Item
              name="uncertaintyKey"
              label={t('uncertaintyDetail.keyLabel')}
              style={{ marginBottom: 14 }}
            >
              <Input disabled />
            </Form.Item>

            {/* 不確かさ基準名 → namespace_term.display_name（Key属性設定に連動・表示専用） */}
            <Form.Item
              name="uncertaintyName"
              label={t('uncertaintyDetail.nameLabel')}
              style={{ marginBottom: 14 }}
            >
              <Input
                readOnly
                disabled
                style={{ background: '#f5f5f5', color: '#595959' }}
              />
            </Form.Item>

            {/* 説明文 → namespace_term.description（Key属性設定に連動・表示専用） */}
            <Form.Item name="desc" label={t('uncertaintyDetail.descLabel')} style={{ marginBottom: 14 }}>
              <TextArea
                rows={3}
                readOnly
                disabled
                style={{ background: '#f5f5f5', color: '#595959' }}
              />
            </Form.Item>

            {/* 状態 → uncertainty_criteria.is_Invalid */}
            <Form.Item label={t('uncertaintyDetail.statusLabel')} style={{ marginBottom: 0 }}>
              <Space align="center">
                {!isLatestVersion ? (
                  <>
                    <Tag color="default" style={{ fontWeight: 600, marginRight: 8 }}>○ {t('uncertaintyDetail.statusDeprecated')}</Tag>
                    <Switch
                      checked={false}
                      checkedChildren={t('uncertaintyDetail.statusActive')}
                      unCheckedChildren={t('uncertaintyDetail.statusDeprecated')}
                      disabled
                    />
                    <span style={{ fontSize: 12, color: '#aaa' }}>
                      {t('uncertaintyDetail.oldVersionNote')}
                    </span>
                  </>
                ) : statusState === 'active' ? (
                  <>
                    <Tag color="success" style={{ fontWeight: 600, marginRight: 8 }}>● {t('uncertaintyDetail.statusActive')}</Tag>
                    <Switch
                      checked={true}
                      checkedChildren={t('uncertaintyDetail.statusActive')}
                      unCheckedChildren={t('uncertaintyDetail.statusDeprecated')}
                      onChange={(checked) =>
                        setStatusState(checked ? 'active' : 'deprecated')
                      }
                    />
                    <span style={{ fontSize: 12, color: '#888' }}>
                      {t('uncertaintyDetail.turnOffNote')}
                    </span>
                  </>
                ) : (
                  <>
                    <Tag color="default" style={{ fontWeight: 600, marginRight: 8 }}>○ {t('uncertaintyDetail.statusDeprecated')}</Tag>
                    <Switch
                      checked={false}
                      checkedChildren={t('uncertaintyDetail.statusActive')}
                      unCheckedChildren={t('uncertaintyDetail.statusDeprecated')}
                      onChange={(checked) =>
                        setStatusState(checked ? 'active' : 'deprecated')
                      }
                    />
                    <span style={{ fontSize: 12, color: '#888' }}>
                      {t('uncertaintyDetail.turnOnNote')}
                    </span>
                  </>
                )}
              </Space>
            </Form.Item>
          </div>

          {/* ===== 2. 評価方式設定 ===== */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>2. {t('uncertaintyDetail.section2Title')}</div>

            {/* 評価方式 → uncertainty_criteria.evaluation_method */}
            <Form.Item label={t('uncertaintyDetail.evalMethodLabel')} style={{ marginBottom: 16 }}>
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
                <Form.Item
                  name="xsiType"
                  label={<span>xsi:type <span style={{ color: '#ff4d4f' }}>*</span></span>}
                  style={{ marginBottom: 0 }}
                >
                  <Select options={XSI_TYPE_OPTIONS} />
                </Form.Item>
                <Form.Item
                  name="units"
                  label={<span>units <span style={{ color: '#ff4d4f' }}>*</span></span>}
                  style={{ marginBottom: 0 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item name="formatString" label="formatString" style={{ marginBottom: 0 }}>
                  <Input />
                </Form.Item>
                <Form.Item name="scaleFactor" label="scaleFactor" style={{ marginBottom: 0 }}>
                  <Input placeholder="1" />
                </Form.Item>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                {/* tolerance_upper → uncertainty_criteria.tolerance_upper */}
                <Form.Item
                  name="toleranceUpper"
                  label={t('uncertaintyDetail.toleranceUpperLabel')}
                  style={{ marginBottom: 0 }}
                >
                  <Input type="number" placeholder={t('uncertaintyDetail.toleranceUpperPlaceholder')} />
                </Form.Item>
                {/* tolerance_lower → uncertainty_criteria.tolerance_lower */}
                <Form.Item
                  name="toleranceLower"
                  label={t('uncertaintyDetail.toleranceLowerLabel')}
                  style={{ marginBottom: 0 }}
                >
                  <Input type="number" placeholder={t('uncertaintyDetail.toleranceLowerPlaceholder')} />
                </Form.Item>
              </div>
              </>
            )}

            {/* 定性モード → intuition_selector */}
            {evalMode === 'qualitative' && (
              <QualitativeOptionEditor
                options={qualitativeOptions}
                radioName="defaultOptionDetail"
                onChange={setQualitativeOptions}
              />
            )}
          </div>

        </Form>
      </Spin>

      {/* ===== 差分プレビューモーダル ===== */}
      <TemplateDiffPreviewModal
        open={diffPreviewOpen}
        template={template}
        diffData={diffData}
        onClose={() => setDiffPreviewOpen(false)}
        onSave={() => {
          setDiffPreviewOpen(false);
          handleSave();
        }}
      />
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
