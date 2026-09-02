'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Button,
  Table,
  Select,
  Input,
  Tag,
  Form,
  Space,
  Tooltip,
  Typography,
  Modal,
  Spin,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { fetchUncertaintyCriteriaForSelector } from '@/services/uncertaintyCriteriaApiService';
import UncertaintyCreateModal from './UncertaintyCreateModal';
import type { UncertaintyCriteria, TargetProperty, AssignPayload } from './UncertaintyCriteriaSelectorModal';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;
const { TextArea } = Input;

// ============================================================================
// 定数
// ============================================================================

/** 定性評価の信頼レベル定義 */
const QUALITATIVE_LEVELS = [
  {
    value: 'certain' as const,
    label: '確か',
    icon: '🟢',
    color: '#52c41a',
    borderColor: '#b7eb8f',
    bgColor: '#f6ffed',
    selectedColor: '#52c41a',
  },
  {
    value: 'ambiguous' as const,
    label: '曖昧',
    icon: '🟡',
    color: '#d46b08',
    borderColor: '#ffd591',
    bgColor: '#fff7e6',
    selectedColor: '#fa8c16',
  },
  {
    value: 'uncertain' as const,
    label: '不確か',
    icon: '🔴',
    color: '#cf1322',
    borderColor: '#ffccc7',
    bgColor: '#fff2f0',
    selectedColor: '#ff4d4f',
  },
] as const;

/** スコープ種別のスタイル定義 */
const SCOPE_STYLE: Record<
  string,
  { color: string; bg: string; border: string; icon: string }
> = {
  personal:     { color: '#2f54eb', bg: '#f0f5ff', border: '#adc6ff', icon: '👤' },
  group:        { color: '#08979c', bg: '#e6fffb', border: '#87e8de', icon: '🔬' },
  organization: { color: '#d46b08', bg: '#fff7e6', border: '#ffd591', icon: '🏢' },
  global:       { color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f', icon: '🌐' },
};

/** フィルタ初期状態 */
const INITIAL_FILTER = {
  evalType: 'all' as string,
  section: 'all' as string,
  tag: 'all' as string,
  namespace: '',
  typeMatch: 'all' as string,
  unitMatch: 'all' as string,
};

// ============================================================================
// Props型定義
// ============================================================================

interface UncertaintyCriteriaSelectorPanelProps {
  /** 不確かさを付与する対象プロパティ情報 */
  targetProperty: TargetProperty | null;
  /** 付与確定時コールバック */
  onAssign: (payload: AssignPayload) => void;
}

// ============================================================================
// コンポーネント
// ============================================================================

/**
 * 不確かさ基準選択パネル（インライン版）
 *
 * UncertaintyCriteriaSelectorModal の内容を Modal ラッパーなしで直接表示するパネル。
 * 実験作業者メニューの不確かさ記録タブ右パネルに埋め込んで使用する。
 *
 * @remarks
 * モックデータ: frontend/mock/uncertainty-criteria.json
 */
export default function UncertaintyCriteriaSelectorPanel({
  targetProperty,
  onAssign,
}: UncertaintyCriteriaSelectorPanelProps) {
  const { t } = useLanguage();

  // ----- 不確かさ基準作成モーダル -----
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // ----- 付与確認モーダル -----
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // ----- DBから取得した不確かさ基準一覧 -----
  const [criteriaList, setCriteriaList] = useState<UncertaintyCriteria[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);

  // ----- フィルタ状態 -----
  const [filter, setFilter] = useState(INITIAL_FILTER);

  // ----- 選択中の不確かさ基準 -----
  const [selectedCriteria, setSelectedCriteria] = useState<UncertaintyCriteria | null>(null);

  // ----- 値入力状態 -----
  const [ucValue, setUcValue] = useState<string>('');
  const [kFactor, setKFactor] = useState<string>('2');
  const [qualValue, setQualValue] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');
  const [ucValueError, setUcValueError] = useState<string>('');

  // ----- コンポーネントマウント時にDBから一覧取得 -----
  useEffect(() => {
    setCriteriaLoading(true);
    fetchUncertaintyCriteriaForSelector()
      .then((data) => {
        const converted: UncertaintyCriteria[] = data.map((row) => ({
          id:                 row.id,
          name:               row.name,
          key:                row.key,
          evalType:           row.evalType,
          scopeType:          row.scopeType,
          scopeLabel:         row.scopeLabel,
          scopeOrder:         row.scopeOrder,
          desc:               row.desc,
          unit:               row.unit,
          xsiType:            row.xsiType,
          scaleFactor:        row.scaleFactor,
          format:             row.format,
          targetSections:     row.targetSections,
          targetTag:          row.targetTag,
          typeMatches:        row.typeMatches,
          unitMatches:        row.unitMatches,
          qualitativeOptions: row.qualitativeOptions,
        }));
        setCriteriaList(converted);
      })
      .catch(() => {
        message.error(t('uncertaintyCriteria.fetchError'));
        setCriteriaList([]);
      })
      .finally(() => setCriteriaLoading(false));
  }, []);

  // ----- targetProperty が変わるたびに初期化 -----
  useEffect(() => {
    setFilter(INITIAL_FILTER);
    setSelectedCriteria(null);
    setUcValue('');
    setKFactor('2');
    setQualValue(null);
    setComment('');
    setUcValueError('');

    // 対象プロパティに合わせてフィルタを自動プリセット
    if (targetProperty) {
      if (targetProperty.tag === 'property' && targetProperty.type !== 'Binary') {
        setFilter((prev) => ({
          ...prev,
          evalType: 'quantitative',
          tag: 'property',
          section: targetProperty.section,
          typeMatch: 'match',
          unitMatch: 'match',
        }));
      } else if (targetProperty.tag === 'content') {
        setFilter((prev) => ({
          ...prev,
          evalType: 'qualitative',
          tag: 'content',
          section: targetProperty.section,
        }));
      }
    }
  }, [targetProperty]);

  // ----- フィルタ後の評価基準リスト -----
  const filteredCriteria = useMemo<UncertaintyCriteria[]>(() => {
    const allCriteria = criteriaList;
    const nodeType = (targetProperty?.type ?? '').toLowerCase();
    const nodeUnit = (targetProperty?.unit ?? '').toLowerCase().trim();
    const ns = filter.namespace.trim().toLowerCase();

    return allCriteria
      .filter((c) => {
        if (filter.evalType !== 'all' && c.evalType !== filter.evalType) return false;
        if (filter.section !== 'all' && !c.targetSections.includes(filter.section as never)) return false;
        if (filter.tag !== 'all' && c.targetTag !== filter.tag) return false;
        if (ns && !c.key.toLowerCase().includes(ns)) return false;
        if (filter.evalType === 'quantitative' && filter.typeMatch === 'match') {
          if (c.typeMatches.length === 0) return false;
          if (!c.typeMatches.some((t) => t.toLowerCase() === nodeType)) return false;
        }
        if (filter.evalType === 'quantitative' && filter.unitMatch === 'match') {
          if (c.unitMatches.length === 0) return false;
          if (!c.unitMatches.some((u) => u.toLowerCase() === nodeUnit)) return false;
        }
        return true;
      })
      .sort((a, b) => a.scopeOrder - b.scopeOrder || a.name.localeCompare(b.name));
  }, [filter, targetProperty]);

  // ----- フィルタ変更後に選択中が非表示になった場合は先頭を選択 -----
  useEffect(() => {
    if (filteredCriteria.length === 0) {
      setSelectedCriteria(null);
      return;
    }
    const stillVisible = selectedCriteria && filteredCriteria.some((c) => c.id === selectedCriteria.id);
    if (!stillVisible) {
      setSelectedCriteria(filteredCriteria[0]);
    }
  }, [filteredCriteria]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- 選択中の基準が切り替わったら値入力をリセット＋定性評価のデフォルト設定 -----
  useEffect(() => {
    setUcValue('');
    setKFactor('2');
    setUcValueError('');
    if (selectedCriteria?.evalType === 'qualitative') {
      setQualValue(null);
    } else {
      setQualValue(null);
    }
  }, [selectedCriteria?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- 型マッチ判定（ハイライト用） -----
  const isTypeMatch = (c: UncertaintyCriteria): boolean => {
    if (c.evalType !== 'quantitative' || !targetProperty) return false;
    const nodeType = targetProperty.type.toLowerCase();
    return c.typeMatches.some((t) => t.toLowerCase() === nodeType);
  };

  const isUnitMatch = (c: UncertaintyCriteria): boolean => {
    if (c.evalType !== 'quantitative' || !targetProperty) return false;
    const nodeUnit = (targetProperty.unit ?? '').toLowerCase().trim();
    return c.unitMatches.some((u) => u.toLowerCase() === nodeUnit);
  };

  // ----- 不確かさ値バリデーション -----
  const validateUcValue = (val: string): boolean => {
    const n = parseFloat(val);
    if (val === '' || isNaN(n) || n < 0) {
      setUcValueError(t('uncertaintyCriteria.ucValueError'));
      return false;
    }
    setUcValueError('');
    return true;
  };

  // ----- 付与実行 -----
  const handleAssign = () => {
    if (!selectedCriteria) {
      message.warning(t('uncertaintyCriteria.noCriteriaWarning'));
      return;
    }
    if (selectedCriteria.evalType === 'quantitative') {
      if (!validateUcValue(ucValue)) return;
    } else {
      if (!qualValue) {
        message.warning(t('uncertaintyCriteria.noLevelWarning'));
        return;
      }
    }
    onAssign({
      criteria: selectedCriteria,
      ucValue: selectedCriteria.evalType === 'quantitative' ? parseFloat(ucValue) : undefined,
      kFactor: selectedCriteria.evalType === 'quantitative' ? parseFloat(kFactor) : undefined,
      qualitativeValue: selectedCriteria.evalType === 'qualitative' ? qualValue ?? undefined : undefined,
      comment,
    });
    message.success(t('uncertaintyCriteria.assignSuccess', { name: selectedCriteria.name }));
  };

  // ----- リセット -----
  const handleReset = () => {
    setUcValue('');
    setKFactor('2');
    setQualValue(null);
    setComment('');
    setUcValueError('');
  };

  // ============================================================================
  // テーブル列定義
  // ============================================================================

  const columns: ColumnsType<UncertaintyCriteria> = [
    {
      title: t('uncertaintyCriteria.colCriteriaName'),
      key: 'name',
      minWidth: 180,
      render: (_, record) => {
        const highlight = record.evalType === 'quantitative' && (isTypeMatch(record) || isUnitMatch(record));
        return (
          <div>
            <div
              style={{
                fontWeight: 600,
                color: highlight ? '#d48806' : '#1a1a1a',
                fontSize: 13,
              }}
            >
              {record.name}
              {highlight && (
                <span style={{ color: '#faad14', marginLeft: 4, fontSize: 11 }}>✦</span>
              )}
            </div>
            <div
              style={{
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: 11,
                color: '#888',
                marginTop: 2,
              }}
            >
              {record.key}
            </div>
          </div>
        );
      },
    },
    {
      title: t('uncertaintyCriteria.colEvalType'),
      key: 'evalType',
      width: 100,
      render: (_, record) => (
        <Tag
          color={record.evalType === 'quantitative' ? 'blue' : 'purple'}
          style={{ fontWeight: 600, fontSize: 11 }}
        >
          {record.evalType === 'quantitative' ? t('uncertaintyCriteria.quantTag') : t('uncertaintyCriteria.qualTag')}
        </Tag>
      ),
    },
    {
      title: t('uncertaintyCriteria.colScope'),
      key: 'scope',
      width: 160,
      render: (_, record) => {
        const s = SCOPE_STYLE[record.scopeType] ?? SCOPE_STYLE.global;
        return (
          <Tooltip title={record.scopeLabel}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                border: `1px solid ${s.border}`,
                background: s.bg,
                color: s.color,
                whiteSpace: 'nowrap',
                maxWidth: 150,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {s.icon} {record.scopeLabel}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: t('uncertaintyCriteria.colDesc'),
      key: 'desc',
      render: (_, record) => (
        <Tooltip title={record.desc}>
          <Text
            style={{
              fontSize: 12,
              color: '#666',
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {record.desc}
          </Text>
        </Tooltip>
      ),
    },
  ];

  // ============================================================================
  // レンダリング
  // ============================================================================

  const showQuantFilter = filter.evalType === 'quantitative';
  const isQuantitative = selectedCriteria?.evalType === 'quantitative';

  /** 付与確認ダイアログの内容 */
  const confirmContent = (
    <div style={{ fontSize: 13, color: '#555' }}>
      <div style={confirmRowStyle}>
        <span style={confirmLabelStyle}>{t('uncertaintyCriteria.confirmTargetLabel')}</span>
        <span>{targetProperty?.name ?? '—'}</span>
      </div>
      <div style={confirmRowStyle}>
        <span style={confirmLabelStyle}>{t('uncertaintyCriteria.confirmCriteriaLabel')}</span>
        <span>{selectedCriteria ? `${selectedCriteria.name}（${selectedCriteria.key}）` : '—'}</span>
      </div>
      <div style={confirmRowStyle}>
        <span style={confirmLabelStyle}>{t('uncertaintyCriteria.confirmMethodLabel')}</span>
        <span>{isQuantitative ? t('uncertaintyCriteria.quantitativeEval') : t('uncertaintyCriteria.qualitativeEval')}</span>
      </div>
      <div style={confirmRowStyle}>
        <span style={confirmLabelStyle}>{t('uncertaintyCriteria.confirmValueLabel')}</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d4380d' }}>
          {isQuantitative
            ? `u = ${ucValue} ${targetProperty?.unit ?? ''}`
            : QUALITATIVE_LEVELS.find((l) => l.value === qualValue)
              ? `${QUALITATIVE_LEVELS.find((l) => l.value === qualValue)!.label}`
              : '—'}
        </span>
      </div>
      {comment && (
        <div style={confirmRowStyle}>
          <span style={confirmLabelStyle}>{t('uncertaintyCriteria.confirmCommentLabel')}</span>
          <span style={{ color: '#666' }}>{comment}</span>
        </div>
      )}
    </div>
  );

  // targetProperty が未選択の場合のプレースホルダー
  if (!targetProperty) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#bbb',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 36 }}>📐</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t('uncertaintyCriteria.placeholderSelectFromLeft')}</div>
        <div style={{ fontSize: 12 }}>{t('uncertaintyCriteria.placeholderSelectFromLeftSub')}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflowY: 'auto', padding: '0 4px' }}>

      {/* タイトル */}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#333', borderBottom: '2px solid #1677ff', paddingBottom: 8 }}>
        📐 {t('uncertaintyCriteria.selectorTitle')}
        <span style={{ fontSize: 11, fontWeight: 400, color: '#888', marginLeft: 8 }}>
          {t('uncertaintyCriteria.scopeHint')}
        </span>
      </div>

      {/* ===== ① 選択要素の情報 ===== */}
      <div style={sectionBoxStyle}>
        <div style={sectionTitleStyle}>{t('uncertaintyCriteria.selectedElementTitle')}</div>
        <div style={detailGridStyle}>
          <DetailItem label={t('uncertaintyCriteria.elementKeyLabel')} value={targetProperty.name} />
          <DetailItem label="xsi:type" value={targetProperty.type} mono />
              <DetailItem label={t('uncertaintyCriteria.elementValueLabel')} value={targetProperty.value} mono />
          <DetailItem label={t('uncertaintyCriteria.elementUnitLabel')} value={targetProperty.unit} mono />
          {targetProperty.desc && (
            <DetailItem label={t('uncertaintyCriteria.elementDescLabel')} value={targetProperty.desc} fullWidth />
          )}
        </div>
      </div>

      {/* ===== ② フィルタ + 不確かさ基準候補リスト ===== */}
      <div style={sectionBoxStyle}>
        <div style={sectionTitleStyle}>{t('uncertaintyCriteria.candidateTitle')}</div>

        {/* フィルタエリア */}
        <div style={filterAreaStyle}>
          {/* 行1: 評価方式 / 対象セクション / 不確かさ基準名(Key属性) */}
          <div style={filterRowStyle}>
            <FilterLabel>{t('uncertaintyCriteria.filterEvalType')}</FilterLabel>
            <Select
              size="small"
              style={{ minWidth: 130 }}
              value={filter.evalType}
              onChange={(v) => setFilter((prev) => ({ ...prev, evalType: v, typeMatch: 'all', unitMatch: 'all', ...(v === 'qualitative' ? { tag: 'all' } : {}) }))}
              options={[
                { value: 'all', label: t('uncertaintyCriteria.filterAll') },
                { value: 'quantitative', label: t('uncertaintyCriteria.filterQuantitative') },
                { value: 'qualitative', label: t('uncertaintyCriteria.filterQualitative') },
              ]}
            />

            <FilterLabel style={{ marginLeft: 12 }}>{t('uncertaintyCriteria.selectSectionFilter')}</FilterLabel>
            <Select
              size="small"
              style={{ minWidth: 130 }}
              value={filter.section}
              onChange={(v) => setFilter((prev) => ({ ...prev, section: v }))}
              options={[
                { value: 'all', label: t('uncertaintyCriteria.sectionAll') },
                { value: 'material', label: 'material' },
                { value: 'condition', label: 'condition' },
                { value: 'result', label: 'result' },
              ]}
            />

            <FilterLabel style={{ marginLeft: 12 }}>{t('uncertaintyCriteria.filterKeyLabel')}</FilterLabel>
            <Input
              size="small"
              style={{ width: 160 }}
              placeholder={t('uncertaintyCriteria.filterKeyPlaceholder')}
              value={filter.namespace}
              onChange={(e) => setFilter((prev) => ({ ...prev, namespace: e.target.value }))}
              allowClear
            />
          </div>

          {/* 行2: 定量専用フィルタ（型・単位マッチ） */}
          {showQuantFilter && (
            <>
              <div style={{ height: 1, background: '#dce8ff', margin: '4px 0' }} />
              <div style={filterRowStyle}>
                <FilterLabel>{t('uncertaintyCriteria.filterTypeMatch')}</FilterLabel>
                <Select
                  size="small"
                  style={{ minWidth: 130 }}
                  value={filter.typeMatch}
                  onChange={(v) => setFilter((prev) => ({ ...prev, typeMatch: v }))}
                  options={[
                    { value: 'all', label: t('uncertaintyCriteria.filterTypeAll') },
                    { value: 'match', label: t('uncertaintyCriteria.filterTypeMatchOnly') },
                  ]}
                />
                {targetProperty?.type && targetProperty.type !== 'Binary' && (
                  <span style={matchHintStyle}>{t('uncertaintyCriteria.targetTypeHint', { type: targetProperty.type })}</span>
                )}

                <FilterLabel style={{ marginLeft: 16 }}>{t('uncertaintyCriteria.filterUnitMatch')}</FilterLabel>
                <Select
                  size="small"
                  style={{ minWidth: 130 }}
                  value={filter.unitMatch}
                  onChange={(v) => setFilter((prev) => ({ ...prev, unitMatch: v }))}
                  options={[
                    { value: 'all', label: t('uncertaintyCriteria.filterUnitAll') },
                    { value: 'match', label: t('uncertaintyCriteria.filterUnitMatchOnly') },
                  ]}
                />
                {targetProperty?.unit && targetProperty.unit !== '—' && (
                  <span style={matchHintStyle}>{t('uncertaintyCriteria.targetUnitHint', { unit: targetProperty.unit })}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* 件数表示 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#444', borderLeft: '3px solid #1677ff', paddingLeft: 8 }}>
            {t('uncertaintyCriteria.candidateListTitle')}
          </span>
          {filteredCriteria.length < criteriaList.length && (
            <span style={{ fontSize: 11, color: '#aaa' }}>
              {t('uncertaintyCriteria.showingCount', { filtered: String(filteredCriteria.length), total: String(criteriaList.length) })}
            </span>
          )}
        </div>

        {/* 評価基準テーブル */}
        <Spin spinning={criteriaLoading}>
        <Table<UncertaintyCriteria>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filteredCriteria}
          pagination={false}
          scroll={{ y: 220 }}
          rowClassName={(record) => {
            const highlight = record.evalType === 'quantitative' && (isTypeMatch(record) || isUnitMatch(record));
            const selected = selectedCriteria?.id === record.id;
            if (selected) return 'uc-row-selected';
            if (highlight) return 'uc-row-highlight';
            return '';
          }}
          onRow={(record) => ({
            style: {
              cursor: 'pointer',
              background: selectedCriteria?.id === record.id ? '#e6f0ff' : undefined,
              borderLeft: selectedCriteria?.id === record.id ? '3px solid #1677ff' : '3px solid transparent',
            },
            onClick: () => setSelectedCriteria(record),
          })}
          locale={{
            emptyText: (
              <div style={{ padding: '28px 0', color: '#bbb', textAlign: 'center' }}>
                <div style={{ fontSize: 13 }}>{t('uncertaintyCriteria.noCandidate')}</div>
              </div>
            ),
          }}
        />
        </Spin>

        {/* 新規評価基準作成リンク */}
        <Button
          type="link"
          style={{ padding: '4px 0', marginTop: 6, fontSize: 13 }}
          onClick={() => setCreateModalOpen(true)}
        >
          {t('uncertaintyCriteria.createNewLink')}
        </Button>
      </div>

      {/* ===== ③ 値入力エリア ===== */}
      <div style={sectionBoxStyle}>
        <div style={sectionTitleStyle}>
          {t('uncertaintyCriteria.valueInputTitle')}
          {selectedCriteria && (
            <span style={{ fontSize: 11, fontWeight: 400, color: '#888', marginLeft: 6 }}>
              {t('uncertaintyCriteria.selectedCriteriaHint', { name: selectedCriteria.name, key: selectedCriteria.key })}
            </span>
          )}
        </div>

        {!selectedCriteria ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#bbb', fontSize: 13 }}>
            {t('uncertaintyCriteria.selectFromList')}
          </div>
        ) : (
          <Form layout="vertical" size="middle">

            {/* 定量評価 */}
            {isQuantitative && (
              <div
                style={{
                  background: '#f0f5ff',
                  border: '1px solid #c8daff',
                  borderRadius: 6,
                  padding: '8px 12px 4px',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0958d9', marginBottom: 10 }}>
                  {t('uncertaintyCriteria.quantitativeSectionTitle')}
                </div>
                <Form.Item
                    label={<span>{t('uncertaintyCriteria.ucValueLabel')} <span style={{ color: '#ff4d4f' }}>{t('uncertaintyCriteria.required')}</span></span>}
                    style={{ marginBottom: 0 }}
                    validateStatus={ucValueError ? 'error' : ''}
                    help={ucValueError || (
                      <span style={{ fontSize: 11, color: '#aaa' }}>
                        {t('uncertaintyCriteria.formatHint', { format: selectedCriteria.format })}
                        &nbsp;{t('uncertaintyCriteria.rangeHint')}
                      </span>
                    )}
                  >
                    <Input
                      type="number"
                      value={ucValue}
                      min={0}
                      step="0.0001"
                      placeholder={t('uncertaintyCriteria.ucValuePlaceholder')}
                      onChange={(e) => {
                        setUcValue(e.target.value);
                        if (ucValueError) validateUcValue(e.target.value);
                      }}
                      onBlur={(e) => validateUcValue(e.target.value)}
                      addonAfter={
                        <span style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: 12 }}>
                          {targetProperty?.unit ?? '—'}
                        </span>
                      }
                      status={ucValueError ? 'error' : ''}
                    />
                  </Form.Item>
              </div>
            )}

            {/* 定性評価 */}
            {!isQuantitative && (
              <div
                style={{
                  background: '#f9f0ff',
                  border: '1px solid #d3adf7',
                  borderRadius: 6,
                  padding: '8px 12px 12px',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#722ed1', marginBottom: 10 }}>
                  {t('uncertaintyCriteria.qualitativeSectionTitle')}
                </div>
                <Form.Item
                  label={<span>{t('uncertaintyCriteria.levelSelectLabel')} <span style={{ color: '#ff4d4f' }}>{t('uncertaintyCriteria.required')}</span></span>}
                  style={{ marginBottom: 4 }}
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedCriteria.qualitativeOptions
                      .slice()
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((opt) => {
                        const isSelected = qualValue === opt.selectorValue;
                        const baseColor = opt.displayColor || '#1677ff';
                        return (
                          <button
                            key={opt.selectorValue}
                            type="button"
                            onClick={() => setQualValue(opt.selectorValue)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 20px',
                              borderRadius: 20,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: `2px solid ${baseColor}`,
                              background: isSelected ? baseColor : '#fff',
                              color: isSelected ? '#fff' : baseColor,
                              boxShadow: isSelected ? `0 2px 8px ${baseColor}55` : 'none',
                              transition: 'all 0.18s',
                            }}
                          >
                            {opt.selectorValue}
                          </button>
                        );
                      })}
                  </div>
                  {qualValue && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
                      {t('uncertaintyCriteria.selectedLevel')}
                      <strong style={{ color: selectedCriteria.qualitativeOptions.find((o) => o.selectorValue === qualValue)?.displayColor ?? '#333' }}>
                        {qualValue}
                      </strong>
                    </div>
                  )}
                </Form.Item>
              </div>
            )}

            {/* コメント（共通） */}
            <Form.Item
              label={
                <span>
                  {t('uncertaintyCriteria.commentLabel')}
                  <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400, marginLeft: 4 }}>
                    {t('uncertaintyCriteria.commentNote')}
                  </span>
                </span>
              }
              style={{ marginBottom: 0 }}
            >
              <TextArea
                rows={3}
                placeholder={t('uncertaintyCriteria.commentPlaceholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </Form.Item>
          </Form>
        )}
      </div>

      {/* ===== ④ フッター：付与ボタン ===== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          paddingBottom: 16,
          paddingTop: 4,
          borderTop: '1px solid #f0f0f0',
          position: 'sticky',
          bottom: 0,
          background: '#fff',
        }}
      >
        <Button onClick={handleReset}>{t('uncertaintyCriteria.resetButton')}</Button>
        <Button
          type="primary"
          size="large"
          disabled={!selectedCriteria}
          onClick={() => setConfirmModalOpen(true)}
        >
          {t('uncertaintyCriteria.assignButton')}
        </Button>
      </div>

      {/* 付与確認モーダル */}
      <Modal
        open={confirmModalOpen}
        title={t('uncertaintyCriteria.confirmModalTitle')}
        width={380}
        onCancel={() => setConfirmModalOpen(false)}
        onOk={() => {
          handleAssign();
          setConfirmModalOpen(false);
        }}
        okText={t('uncertaintyCriteria.confirmModalOk')}
        cancelText={t('uncertaintyCriteria.confirmModalCancel')}
        okButtonProps={{ type: 'primary' }}
      >
        {confirmContent}
      </Modal>

      {/* 評価基準作成モーダル */}
      <UncertaintyCreateModal
        open={createModalOpen}
        allCriteria={[]}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// サブコンポーネント
// ============================================================================

/** 詳細情報の1項目 */
function DetailItem({
  label,
  value,
  mono = false,
  fullWidth = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: mono ? '#2c5282' : '#1a1a1a',
          fontFamily: mono ? 'Consolas, Monaco, monospace' : undefined,
          padding: '5px 10px',
          background: '#f9f9f9',
          border: '1px solid #e8e8e8',
          borderRadius: 5,
          wordBreak: 'break-all',
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

/** フィルタラベル */
function FilterLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#7a8499',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ============================================================================
// スタイル定数
// ============================================================================

const sectionBoxStyle: React.CSSProperties = {
  border: '1px solid #e8e8e8',
  borderRadius: 8,
  padding: '12px 16px',
  background: '#fff',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#333',
  marginBottom: 12,
  paddingBottom: 6,
  borderBottom: '1px solid #f0f0f0',
};

const detailGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
};

const filterAreaStyle: React.CSSProperties = {
  background: '#f8faff',
  border: '1px solid #dce8ff',
  borderRadius: 7,
  padding: '10px 12px',
  marginBottom: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const matchHintStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#1677ff',
  background: '#e6f4ff',
  border: '1px solid #91caff',
  borderRadius: 5,
  padding: '2px 8px',
  whiteSpace: 'nowrap',
};

const codeStyle: React.CSSProperties = {
  fontFamily: 'Consolas, Monaco, monospace',
  fontSize: 11,
  background: '#f0f0f0',
  padding: '1px 5px',
  borderRadius: 3,
  border: '1px solid #e0e0e0',
};

const confirmRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-start',
  marginBottom: 6,
};

const confirmLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#888',
  minWidth: 80,
  flexShrink: 0,
  paddingTop: 1,
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};
