'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  App,
  Modal,
  Button,
  Table,
  Select,
  Input,
  Tag,
  Space,
  Tooltip,
  Typography,
  Popconfirm,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { fetchUncertaintyCriteriaForSelector } from '@/services/uncertaintyCriteriaApiService';
import UncertaintyCreateModal from './UncertaintyCreateModal';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

// ============================================================================
// 型定義
// ============================================================================

/** 定性評価の選択肢 */
export interface QualitativeOption {
  displayOrder: number;
  selectorValue: string;
  displayColor: string;
}

/** 不確かさ基準候補データの型 */
export interface UncertaintyCriteria {
  id: number;
  name: string;
  key: string;
  evalType: 'quantitative' | 'qualitative';
  scopeType: 'personal' | 'group' | 'organization' | 'global';
  scopeLabel: string;
  /** スコープ優先順: Personal=1, Group=2, Organization=3, Global=4 */
  scopeOrder: number;
  desc: string;
  unit: string;
  /** xsi:type（例: intType, doubleType） */
  xsiType: string;
  /** 倍率（scale_factor） */
  scaleFactor: string | null;
  format: string;
  targetSections: Array<'material' | 'condition' | 'result'>;
  targetTag: 'property' | 'content';
  typeMatches: string[];
  unitMatches: string[];
  /** 定性評価の選択肢（DBから取得） */
  qualitativeOptions: QualitativeOption[];
  /** 許容上限値（手入力値の良好/不良判定用。NULL=判定なし） */
  toleranceUpper: number | null;
  /** 許容下限値（手入力値の良好/不良判定用。NULL=判定なし） */
  toleranceLower: number | null;
}

/** モーダルに渡す対象プロパティ情報 */
export interface TargetProperty {
  name: string;
  xpath: string;
  tag: 'property' | 'content';
  /** xsi:type の値（例: Float, Integer, Binary） */
  type: string;
  value: string;
  unit: string;
  /** XPathから判定したセクション */
  section: 'material' | 'condition' | 'result';
  desc?: string;
}

/** 付与コールバックのペイロード */
export interface AssignPayload {
  criteria: UncertaintyCriteria;
  /** @deprecated 値入力は WorkRecordPanel で行うため未使用 */
  ucValue?: number;
  /** @deprecated 値入力は WorkRecordPanel で行うため未使用 */
  kFactor?: number;
  /** @deprecated 値入力は WorkRecordPanel で行うため未使用 */
  qualitativeValue?: string;
  /** @deprecated 値入力は WorkRecordPanel で行うため未使用 */
  comment?: string;
}

/** Props型定義 */
interface UncertaintyCriteriaSelectorModalProps {
  open: boolean;
  onClose: () => void;
  /** 不確かさを付与する対象プロパティ情報 */
  targetProperty: TargetProperty | null;
  /** 付与確定時コールバック */
  onAssign: (payload: AssignPayload) => void;
  /**
   * 「不確かさ編集」から開いた場合に渡す既存の付与内容。
   * 指定時はモーダルの初期値としてセットされる。
   */
  initialPayload?: AssignPayload;
  /**
   * プロジェクトが属する組織グループCD（任意）。
   * 新規基準作成ダイアログのKey属性設定プルダウンのスコープ絞り込みに使用する。
   * 指定時: そのグループ＋上位グループスコープ＋個人スコープの用語のみ表示
   * 未指定時: 個人スコープのみにフォールバック
   */
  organizationGroupCd?: string | null;
}

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
// コンポーネント
// ============================================================================

/**
 * 不確かさ基準選択モーダル
 *
 * 実験データビューアから呼び出され、
 * 対象プロパティに適用する不確かさ基準を選択し不確かさ値を入力して付与する。
 *
 * @remarks
 * モックデータ: frontend/mock/uncertainty-criteria.json
 */
export default function UncertaintyCriteriaSelectorModal({
  open,
  onClose,
  targetProperty,
  onAssign,
  initialPayload,
  organizationGroupCd,
}: UncertaintyCriteriaSelectorModalProps) {
  const { message } = App.useApp();
  const { t } = useLanguage();
  // ----- 不確かさ基準作成モーダル -----
  const [createModalOpen, setCreateModalOpen] = useState(false);

  /**
   * initialPayload から値を復元中かどうかを示すフラグ。
   * selectedCriteria 変更時のリセット useEffect が復元値を上書きするのを防ぐ。
   */
  const isRestoringRef = React.useRef(false);

  // ----- DBから取得した不確かさ基準一覧 -----
  const [criteriaList, setCriteriaList] = useState<UncertaintyCriteria[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);

  // ----- フィルタ状態 -----
  const [filter, setFilter] = useState(INITIAL_FILTER);

  // ----- 選択中の不確かさ基準 -----
  const [selectedCriteria, setSelectedCriteria] = useState<UncertaintyCriteria | null>(null);

  // ----- 値入力状態（削除済み：基準キーのみ記録する設計のため不要） -----

  // ----- DBから不確かさ基準一覧を再取得する関数（新規作成後のリフレッシュにも使用） -----
  const refreshCriteriaList = useCallback(() => {
    setCriteriaLoading(true);
    fetchUncertaintyCriteriaForSelector(organizationGroupCd)
      .then((data) => {
        // APIレスポンス（UncertaintyCriteriaForSelector[]）を UncertaintyCriteria[] に変換
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
          xsiType:            row.xsiType ?? '',
          scaleFactor:        row.scaleFactor ?? null,
          format:             row.format,
          targetSections:     row.targetSections,
          targetTag:          row.targetTag,
          typeMatches:        row.typeMatches,
          unitMatches:        row.unitMatches,
          qualitativeOptions: row.qualitativeOptions,
          toleranceUpper:     row.toleranceUpper,
          toleranceLower:     row.toleranceLower,
        }));
        setCriteriaList(converted);
      })
      .catch(() => {
        message.error(t('uncertaintyCriteriaSelector.fetchError'));
        setCriteriaList([]);
      })
      .finally(() => setCriteriaLoading(false));
  }, [organizationGroupCd, message, t]);

  // ----- モーダルが開くたびに初期化 & APIからデータ取得 -----
  useEffect(() => {
    if (!open) return;
    setFilter(INITIAL_FILTER);
    setSelectedCriteria(null);

    // DBから不確かさ基準一覧を取得
    refreshCriteriaList();
  }, [open, organizationGroupCd, refreshCriteriaList]);

  // ----- initialPayload が渡された場合、criteriaList ロード後に選択状態のみ復元 -----
  useEffect(() => {
    if (!open || !initialPayload || criteriaList.length === 0) return;

    // criteriaList から同じ ID の基準を探して選択状態にする
    // id が 0（ペトリネット編集画面からの編集時）の場合は key でフォールバック検索
    const matched =
      initialPayload.criteria.id !== 0
        ? criteriaList.find((c) => c.id === initialPayload.criteria.id)
        : criteriaList.find((c) => c.key === initialPayload.criteria.key);
    const targetCriteria = matched ?? initialPayload.criteria;

    // フラグを立てて selectedCriteria 変更による不要な useEffect を抑制
    isRestoringRef.current = true;
    setSelectedCriteria(targetCriteria);

    // フィルタを編集対象の評価方式に合わせる
    setFilter((prev) => ({
      ...prev,
      evalType: targetCriteria.evalType,
    }));

    // 次の tick でフラグを解除
    setTimeout(() => { isRestoringRef.current = false; }, 0);
  }, [open, criteriaList]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- フィルタ後の評価基準リスト -----
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredCriteria = useMemo<UncertaintyCriteria[]>(() => {
    const allCriteria = criteriaList;
    const nodeType = (targetProperty?.type ?? '').toLowerCase();
    const nodeUnit = (targetProperty?.unit ?? '').toLowerCase().trim();
    const ns = filter.namespace.trim().toLowerCase();

    return allCriteria
      .filter((c) => {
        // 評価方式フィルタ
        if (filter.evalType !== 'all' && c.evalType !== filter.evalType) return false;
        // 対象セクションフィルタ
        if (filter.section !== 'all' && !c.targetSections.includes(filter.section as never)) return false;
        // タグ種類フィルタ
        if (filter.tag !== 'all' && c.targetTag !== filter.tag) return false;
        // 名前空間フィルタ（keyまたはnameの部分一致）
        if (ns && !c.key.toLowerCase().includes(ns) && !c.name.toLowerCase().includes(ns)) return false;
        // 型マッチフィルタ（定量のみ）
        if (filter.evalType === 'quantitative' && filter.typeMatch === 'match') {
          if (c.typeMatches.length === 0) return false;
          if (!c.typeMatches.some((t) => t.toLowerCase() === nodeType)) return false;
        }
        // 単位マッチフィルタ（定量のみ）
        if (filter.evalType === 'quantitative' && filter.unitMatch === 'match') {
          if (c.unitMatches.length === 0) return false;
          if (!c.unitMatches.some((u) => u.toLowerCase() === nodeUnit)) return false;
        }
        return true;
      })
      // スコープ優先順ソート（Personal → Group → Organization → Global）
      .sort((a, b) => a.scopeOrder - b.scopeOrder || a.name.localeCompare(b.name));
  }, [filter, targetProperty]);

  // ----- フィルタ変更後に選択中が非表示になった場合は先頭を選択 -----
  useEffect(() => {
    if (!open) return;
    // 復元中（initialPayload から値をセット中）は selectedCriteria の上書きをスキップ
    if (isRestoringRef.current) return;
    if (filteredCriteria.length === 0) {
      setSelectedCriteria(null);
      return;
    }
    const stillVisible = selectedCriteria && filteredCriteria.some((c) => c.id === selectedCriteria.id);
    if (!stillVisible) {
      setSelectedCriteria(filteredCriteria[0]);
    }
  }, [filteredCriteria, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- 付与実行 -----
  const handleAssign = () => {
    if (!selectedCriteria) {
      message.warning(t('uncertaintyCriteriaSelector.selectCriteriaWarning'));
      return;
    }
    onAssign({
      criteria: selectedCriteria,
    });
    message.success(t('uncertaintyCriteriaSelector.assignSuccess', { name: selectedCriteria.name }));
    onClose();
  };

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

  // ============================================================================
  // テーブル列定義
  // ============================================================================

  const columns: ColumnsType<UncertaintyCriteria> = [
    {
      title: t('uncertaintyCriteriaSelector.colName'),
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
      title: t('uncertaintyCriteriaSelector.colEvalType'),
      key: 'evalType',
      width: 100,
      render: (_, record) => (
        <Tag
          color={record.evalType === 'quantitative' ? 'blue' : 'purple'}
          style={{ fontWeight: 600, fontSize: 11 }}
        >
        {record.evalType === 'quantitative' ? t('uncertaintyCriteriaSelector.quantitative') : t('uncertaintyCriteriaSelector.qualitative')}
        </Tag>
      ),
    },
    {
      title: t('uncertaintyCriteriaSelector.colScope'),
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
      title: t('uncertaintyCriteriaSelector.colDesc'),
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
        <span style={confirmLabelStyle}>{t('uncertaintyCriteriaSelector.confirmLabelTarget')}</span>
        <span>{targetProperty?.name ?? '—'}</span>
      </div>
      <div style={confirmRowStyle}>
        <span style={confirmLabelStyle}>{t('uncertaintyCriteriaSelector.confirmLabelCriteria')}</span>
        <span>{selectedCriteria ? `${selectedCriteria.name}（${selectedCriteria.key}）` : '—'}</span>
      </div>
      <div style={confirmRowStyle}>
        <span style={confirmLabelStyle}>{t('uncertaintyCriteriaSelector.confirmLabelEvalType')}</span>
        <span style={{ fontWeight: 600 }}>
          {isQuantitative
            ? t('uncertaintyCriteriaSelector.quantitativeEval')
            : t('uncertaintyCriteriaSelector.qualitativeEval')}
        </span>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={860}
      title={
        <span style={{ fontSize: 15, fontWeight: 700 }}>
          📐 {t('uncertaintyCriteriaSelector.modalTitle')}
          <span style={{ fontSize: 11, fontWeight: 400, color: '#888', marginLeft: 8 }}>
            {t('uncertaintyCriteriaSelector.scopePriorityNote')}
          </span>
        </span>
      }
      footer={
        <Space>
          <Button onClick={onClose}>{t('uncertaintyCriteriaSelector.cancelButton')}</Button>
          <Popconfirm
            title={t('uncertaintyCriteriaSelector.confirmTitle')}
            description={confirmContent}
            onConfirm={handleAssign}
            okText={t('uncertaintyCriteriaSelector.confirmOkText')}
            cancelText={t('uncertaintyCriteriaSelector.cancelButton')}
            okButtonProps={{ type: 'primary' }}
            placement="topRight"
            overlayStyle={{ maxWidth: 420 }}
          >
            <Button
              type="primary"
              size="large"
              disabled={!selectedCriteria}
            >
              {t('uncertaintyCriteriaSelector.assignButton')}
            </Button>
          </Popconfirm>
        </Space>
      }
      styles={{ body: { padding: '16px 20px', maxHeight: '90vh', overflowY: 'auto' } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ===== ① 選択要素の情報 ===== */}
        {targetProperty && (
          <div style={sectionBoxStyle}>
            <div style={sectionTitleStyle}>{t('uncertaintyCriteriaSelector.sectionTargetInfo')}</div>
            <div style={detailGridStyle}>
              <DetailItem label={t('uncertaintyCriteriaSelector.labelElementName')} value={targetProperty.name} />
              <DetailItem label="xsi:type" value={targetProperty.type} mono />
              <DetailItem label={t('uncertaintyCriteriaSelector.labelValue')} value={targetProperty.value} mono />
              <DetailItem label={t('uncertaintyCriteriaSelector.labelUnit')} value={targetProperty.unit} mono />
              {targetProperty.desc && (
                <DetailItem label={t('uncertaintyCriteriaSelector.labelDesc')} value={targetProperty.desc} fullWidth />
              )}
            </div>
          </div>
        )}

        {/* ===== ② フィルタ + 不確かさ基準候補リスト ===== */}
        <div style={sectionBoxStyle}>
          <div style={sectionTitleStyle}>{t('uncertaintyCriteriaSelector.sectionCandidates')}</div>

          {/* フィルタエリア */}
          <div style={filterAreaStyle}>
            {/* 行1: 評価方式 / 不確かさ基準名(Key属性) */}
            <div style={filterRowStyle}>
              <FilterLabel>{t('uncertaintyCriteriaSelector.filterEvalType')}</FilterLabel>
              <Select
                size="small"
                style={{ minWidth: 130 }}
                value={filter.evalType}
                onChange={(v) => setFilter((prev) => ({ ...prev, evalType: v, typeMatch: 'all', unitMatch: 'all', ...(v === 'qualitative' ? { tag: 'all' } : {}) }))}
                options={[
                  { value: 'all', label: t('uncertaintyCriteriaSelector.filterAll') },
                  { value: 'quantitative', label: t('uncertaintyCriteriaSelector.quantitative') },
                  { value: 'qualitative', label: t('uncertaintyCriteriaSelector.qualitative') },
                ]}
              />

              <FilterLabel style={{ marginLeft: 12 }}>{t('uncertaintyCriteriaSelector.filterCriteriaKey')}</FilterLabel>
              <Input
                size="small"
                style={{ width: 160 }}
                placeholder={t('uncertaintyCriteriaSelector.filterCriteriaKeyPlaceholder')}
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
                  <FilterLabel>{t('uncertaintyCriteriaSelector.filterTypeMatch')}</FilterLabel>
                  <Select
                    size="small"
                    style={{ minWidth: 130 }}
                    value={filter.typeMatch}
                    onChange={(v) => setFilter((prev) => ({ ...prev, typeMatch: v }))}
                    options={[
                      { value: 'all', label: t('uncertaintyCriteriaSelector.filterAll') },
                      { value: 'match', label: t('uncertaintyCriteriaSelector.filterMatchOnly') },
                    ]}
                  />
                  {targetProperty?.type && targetProperty.type !== 'Binary' && (
                    <span style={matchHintStyle}>{t('uncertaintyCriteriaSelector.targetType')}: {targetProperty.type}</span>
                  )}

                  <FilterLabel style={{ marginLeft: 16 }}>{t('uncertaintyCriteriaSelector.filterUnitMatch')}</FilterLabel>
                  <Select
                    size="small"
                    style={{ minWidth: 130 }}
                    value={filter.unitMatch}
                    onChange={(v) => setFilter((prev) => ({ ...prev, unitMatch: v }))}
                    options={[
                      { value: 'all', label: t('uncertaintyCriteriaSelector.filterAll') },
                      { value: 'match', label: t('uncertaintyCriteriaSelector.filterMatchOnly') },
                    ]}
                  />
                  {targetProperty?.unit && targetProperty.unit !== '—' && (
                    <span style={matchHintStyle}>{t('uncertaintyCriteriaSelector.targetUnit')}: {targetProperty.unit}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 件数表示 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#444', borderLeft: '3px solid #1677ff', paddingLeft: 8 }}>
              {t('uncertaintyCriteriaSelector.applicableCandidates')}
            </span>
            {filteredCriteria.length < criteriaList.length && (
              <span style={{ fontSize: 11, color: '#aaa' }}>
                （{filteredCriteria.length} / {criteriaList.length} {t('uncertaintyCriteriaSelector.displayCount')}）
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
                background: selectedCriteria?.id === record.id
                  ? '#e6f0ff'
                  : undefined,
                borderLeft: selectedCriteria?.id === record.id
                  ? '3px solid #1677ff'
                  : '3px solid transparent',
              },
              onClick: () => setSelectedCriteria(record),
            })}
            locale={{
              emptyText: (
                <div style={{ padding: '28px 0', color: '#bbb', textAlign: 'center' }}>
                  <div style={{ fontSize: 13 }}>{t('uncertaintyCriteriaSelector.emptyText')}</div>
                </div>
              ),
            }}
          />
          </Spin>

          {/* ③ 選択中の基準の詳細プレビュー */}
          <SelectedCriteriaPreview criteria={selectedCriteria} t={t} />

          {/* 新規評価基準作成リンク */}
          <Button
            type="link"
            style={{ padding: '4px 0', marginTop: 6, fontSize: 13 }}
            onClick={() => setCreateModalOpen(true)}
          >
            {t('uncertaintyCriteriaSelector.createNewButton')}
          </Button>
        </div>

      </div>

      {/* 評価基準作成モーダル */}
      <UncertaintyCreateModal
        open={createModalOpen}
        allCriteria={[]}
        organizationGroupCd={organizationGroupCd}
        onClose={() => setCreateModalOpen(false)}
        onSaved={refreshCriteriaList}
      />
    </Modal>
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

// ============================================================================
// プレビューパネル用スタイル定数
// ============================================================================

const previewEmptyStyle: React.CSSProperties = {
  border: '1.5px dashed #d0d7e3',
  borderRadius: 8,
  background: '#fafbfc',
  padding: '18px 16px',
  textAlign: 'center',
  color: '#aab0bc',
  fontSize: 12,
  marginTop: 8,
  marginBottom: 4,
};

const previewBoxStyle: React.CSSProperties = {
  border: '1px solid #e0e8f5',
  borderRadius: 8,
  background: '#f7f9ff',
  padding: '12px 14px',
  marginTop: 8,
  marginBottom: 4,
};

const previewHeaderRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 10,
};

const previewSectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#444',
  borderLeft: '3px solid #1677ff',
  paddingLeft: 8,
};

const previewEvalTagStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 11,
  margin: 0,
};

const previewQuantBodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const previewGrid4Style: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 8,
};

const previewGrid2Style: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};

const previewQualLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#8a94a8',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  marginBottom: 8,
};

const previewQualEmptyStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#aab0bc',
};

const previewQualListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const previewCellWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
};

const previewCellLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#8a94a8',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const previewCellValueBaseStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '4px 8px',
  background: '#fff',
  border: '1px solid #e4eaf5',
  borderRadius: 5,
  wordBreak: 'break-all',
  minHeight: 28,
};

// ============================================================================
// SelectedCriteriaPreview — 選択中の不確かさ基準の詳細プレビュー
// ============================================================================

/**
 * 選択中の不確かさ基準の詳細をテーブル下部に表示するプレビューコンポーネント。
 *
 * - 未選択時：破線ボーダー + プレースホルダーテキスト
 * - 定量評価選択時：xsi:type / 単位 / 倍率 / フォーマット / 許容値（上限・下限）をグリッド表示
 * - 定性評価選択時：選択肢（qualitativeOptions）を displayOrder 昇順でカラー付きバッジ表示
 */
function SelectedCriteriaPreview({
  criteria,
  t,
}: {
  criteria: UncertaintyCriteria | null;
  t: (key: string) => string;
}) {
  // ---- 未選択時 ----
  if (!criteria) {
    return (
      <div style={previewEmptyStyle}>
        {t('uncertaintyCriteriaSelector.previewEmpty')}
      </div>
    );
  }

  const isQuantitative = criteria.evalType === 'quantitative';

  return (
    <div style={previewBoxStyle}>
      {/* ヘッダー行：セクションタイトル + 評価方式タグ */}
      <div style={previewHeaderRowStyle}>
        <span style={previewSectionTitleStyle}>
          {t('uncertaintyCriteriaSelector.previewSectionTitle')}
        </span>
        <Tag
          color={isQuantitative ? 'blue' : 'purple'}
          style={previewEvalTagStyle}
        >
          {isQuantitative
            ? t('uncertaintyCriteriaSelector.quantitative')
            : t('uncertaintyCriteriaSelector.qualitative')}
        </Tag>
      </div>

      {/* ---- 定量評価 ---- */}
      {isQuantitative && (
        <QuantitativePreviewBody criteria={criteria} t={t} />
      )}

      {/* ---- 定性評価 ---- */}
      {!isQuantitative && (
        <QualitativePreviewBody criteria={criteria} t={t} />
      )}
    </div>
  );
}


/** 定量評価のプレビュー本体 */
function QuantitativePreviewBody({
  criteria,
  t,
}: {
  criteria: UncertaintyCriteria;
  t: (key: string) => string;
}) {
  return (
    <div style={previewQuantBodyStyle}>
      {/* 上段: xsi:type / 単位 / 倍率 / フォーマット */}
      <div style={previewGrid4Style}>
        <PreviewCell label={t('uncertaintyCriteriaSelector.previewXsiType')} value={criteria.xsiType || '—'} mono />
        <PreviewCell label={t('uncertaintyCriteriaSelector.previewUnit')} value={criteria.unit || '—'} mono />
        <PreviewCell label={t('uncertaintyCriteriaSelector.previewScaleFactor')} value={criteria.scaleFactor ?? '—'} mono />
        <PreviewCell label={t('uncertaintyCriteriaSelector.previewFormat')} value={criteria.format || '—'} mono />
      </div>
      {/* 下段: 許容値（下限 / 上限） */}
      <div style={previewGrid2Style}>
        <PreviewCell
          label={t('uncertaintyCriteriaSelector.previewToleranceLower')}
          value={criteria.toleranceLower !== null ? String(criteria.toleranceLower) : t('uncertaintyCriteriaSelector.previewNoTolerance')}
          mono={criteria.toleranceLower !== null}
        />
        <PreviewCell
          label={t('uncertaintyCriteriaSelector.previewToleranceUpper')}
          value={criteria.toleranceUpper !== null ? String(criteria.toleranceUpper) : t('uncertaintyCriteriaSelector.previewNoTolerance')}
          mono={criteria.toleranceUpper !== null}
        />
      </div>
    </div>
  );
}

/** 定性評価のプレビュー本体 */
function QualitativePreviewBody({
  criteria,
  t,
}: {
  criteria: UncertaintyCriteria;
  t: (key: string) => string;
}) {
  return (
    <div>
      <div style={previewQualLabelStyle}>
        {t('uncertaintyCriteriaSelector.previewQualitativeOptions')}
      </div>
      {criteria.qualitativeOptions.length === 0 ? (
        <span style={previewQualEmptyStyle}>
          {t('uncertaintyCriteriaSelector.previewNoOptions')}
        </span>
      ) : (
        <div style={previewQualListStyle}>
          {[...criteria.qualitativeOptions]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((opt) => {
              // displayColor が有効な CSS カラーかを簡易チェックし、無効ならフォールバック
              const color = opt.displayColor && opt.displayColor.startsWith('#') ? opt.displayColor : '#888888';
              const optStyle: React.CSSProperties = {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 20,
                border: `1.5px solid ${color}`,
                background: `${color}18`,
                color,
                whiteSpace: 'nowrap',
              };
              const dotStyle: React.CSSProperties = {
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              };
              return (
                <span key={opt.displayOrder} style={optStyle}>
                  <span style={dotStyle} />
                  {opt.selectorValue}
                </span>
              );
            })}
        </div>
      )}
    </div>
  );
}

/** プレビューセル 1項目（ラベル + 値） */
function PreviewCell({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const valueStyle: React.CSSProperties = {
    ...previewCellValueBaseStyle,
    color: mono ? '#2c5282' : '#1a1a1a',
    fontFamily: mono ? 'Consolas, Monaco, monospace' : undefined,
  };
  return (
    <div style={previewCellWrapStyle}>
      <div style={previewCellLabelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}

