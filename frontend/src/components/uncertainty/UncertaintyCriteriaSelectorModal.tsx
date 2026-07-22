'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  Button,
  Table,
  Select,
  Input,
  Tag,
  Form,
  Space,
  Tooltip,
  Typography,
  Popconfirm,
  Spin,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { fetchUncertaintyCriteriaForSelector } from '@/services/uncertaintyCriteriaApiService';
import UncertaintyCreateModal from './UncertaintyCreateModal';

const { Text } = Typography;
const { TextArea } = Input;

// ============================================================================
// 型定義
// ============================================================================

/** 定性評価の選択肢 */
export interface QualitativeOption {
  displayOrder: number;
  selectorValue: string;
  displayColor: string;
  isDefault: boolean;
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
  format: string;
  targetSections: Array<'material' | 'condition' | 'result'>;
  targetTag: 'property' | 'content';
  typeMatches: string[];
  unitMatches: string[];
  /** 定性評価の選択肢（DBから取得） */
  qualitativeOptions: QualitativeOption[];
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
  /** 定量評価の場合: 不確かさ値 */
  ucValue?: number;
  /** 定量評価の場合: 包含係数 */
  kFactor?: number;
  /** 定性評価の場合: 選択した信頼レベル（DBの selector_value） */
  qualitativeValue?: string;
  comment: string;
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
}: UncertaintyCriteriaSelectorModalProps) {
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

  // ----- 値入力状態 -----
  const [ucValue, setUcValue] = useState<string>('');
  const [kFactor, setKFactor] = useState<string>('2');
  const [qualValue, setQualValue] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');
  const [ucValueError, setUcValueError] = useState<string>('');

  // ----- モーダルが開くたびに初期化 & APIからデータ取得 -----
  useEffect(() => {
    if (!open) return;
    setFilter(INITIAL_FILTER);
    setSelectedCriteria(null);
    setUcValue('');
    setKFactor('2');
    setQualValue(null);
    setComment('');
    setUcValueError('');

    // DBから不確かさ基準一覧を取得
    setCriteriaLoading(true);
    fetchUncertaintyCriteriaForSelector()
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
        message.error('不確かさ基準の取得に失敗しました');
        setCriteriaList([]);
      })
      .finally(() => setCriteriaLoading(false));

    // 対象プロパティに合わせてフィルタを自動プリセット
    if (targetProperty) {
      if (initialPayload) {
        // 編集モード → initialPayload の evalType を優先（上書きしない）
        setFilter((prev) => ({
          ...prev,
          evalType: initialPayload.criteria.evalType,
          section: targetProperty.section,
        }));
      } else if (targetProperty.tag === 'property' && targetProperty.type !== 'Binary') {
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
          tag: 'all',
          section: targetProperty.section,
        }));
      }
    }
  }, [open, targetProperty]);

  // ----- initialPayload が渡された場合、criteriaList ロード後に初期値をセット -----
  useEffect(() => {
    if (!open || !initialPayload || criteriaList.length === 0) return;

    // criteriaList から同じ ID の基準を探して選択状態にする
    // id が 0（ペトリネット編集画面からの編集時）の場合は key でフォールバック検索
    const matched =
      initialPayload.criteria.id !== 0
        ? criteriaList.find((c) => c.id === initialPayload.criteria.id)
        : criteriaList.find((c) => c.key === initialPayload.criteria.key);
    const targetCriteria = matched ?? initialPayload.criteria;

    // フラグを立てて selectedCriteria 変更によるリセット useEffect を抑制
    isRestoringRef.current = true;
    setSelectedCriteria(targetCriteria);

    // フィルタを編集対象の評価方式に合わせる
    setFilter((prev) => ({
      ...prev,
      evalType: targetCriteria.evalType,
    }));

    // 値を既存のペイロードから復元
    if (targetCriteria.evalType === 'quantitative') {
      setUcValue(initialPayload.ucValue !== undefined ? String(initialPayload.ucValue) : '');
      setKFactor(initialPayload.kFactor !== undefined ? String(initialPayload.kFactor) : '2');
      setQualValue(null);
    } else {
      setUcValue('');
      setKFactor('2');
      setQualValue(initialPayload.qualitativeValue ?? null);
    }
    setComment(initialPayload.comment ?? '');

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
        // 名前空間フィルタ（keyの部分一致）
        if (ns && !c.key.toLowerCase().includes(ns)) return false;
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

  // ----- 選択中の基準が切り替わったら値入力をリセット＋定性評価のデフォルト設定 -----
  useEffect(() => {
    // 復元中はリセットをスキップ（initialPayload の値を保護）
    if (isRestoringRef.current) return;
    setUcValue('');
    setKFactor('2');
    setUcValueError('');
    if (selectedCriteria?.evalType === 'qualitative') {
      // DBの is_default=true の選択肢をデフォルト値に設定
      const defaultOpt = selectedCriteria.qualitativeOptions.find((o) => o.isDefault);
      setQualValue(defaultOpt?.selectorValue ?? selectedCriteria.qualitativeOptions[0]?.selectorValue ?? null);
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
      setUcValueError('正の数値を入力してください');
      return false;
    }
    setUcValueError('');
    return true;
  };

  // ----- 付与実行 -----
  const handleAssign = () => {
    if (!selectedCriteria) {
      message.warning('不確かさ基準を選択してください');
      return;
    }
    if (selectedCriteria.evalType === 'quantitative') {
      if (!validateUcValue(ucValue)) return;
    } else {
      if (!qualValue) {
        message.warning('信頼レベルを選択してください');
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
    message.success(`「${selectedCriteria.name}」で不確かさを付与しました`);
    onClose();
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
      title: '不確かさ基準名',
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
      title: '評価方式',
      key: 'evalType',
      width: 100,
      render: (_, record) => (
        <Tag
          color={record.evalType === 'quantitative' ? 'blue' : 'purple'}
          style={{ fontWeight: 600, fontSize: 11 }}
        >
        {record.evalType === 'quantitative' ? '定量' : '定性'}
        </Tag>
      ),
    },
    {
      title: 'スコープ',
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
      title: '説明',
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
        <span style={confirmLabelStyle}>対象要素</span>
        <span>{targetProperty?.name ?? '—'}</span>
      </div>
      <div style={confirmRowStyle}>
        <span style={confirmLabelStyle}>評価基準</span>
        <span>{selectedCriteria ? `${selectedCriteria.name}（${selectedCriteria.key}）` : '—'}</span>
      </div>
      <div style={confirmRowStyle}>
        <span style={confirmLabelStyle}>評価方式</span>
        <span>{isQuantitative ? '定量評価' : '定性評価'}</span>
      </div>
      <div style={confirmRowStyle}>
        <span style={confirmLabelStyle}>付与値</span>
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
          <span style={confirmLabelStyle}>コメント</span>
          <span style={{ color: '#666' }}>{comment}</span>
        </div>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={860}
      title={
        <span style={{ fontSize: 15, fontWeight: 700 }}>
          📐 不確かさ基準選択
          <span style={{ fontSize: 11, fontWeight: 400, color: '#888', marginLeft: 8 }}>
            スコープ優先順：Personal → Group → Organization → Global
          </span>
        </span>
      }
      footer={
        <Space>
          <Button onClick={onClose}>キャンセル</Button>
          <Button onClick={handleReset}>リセット</Button>
          <Popconfirm
            title="付与内容を確認してください"
            description={confirmContent}
            onConfirm={handleAssign}
            okText="付与を確定する"
            cancelText="キャンセル"
            okButtonProps={{ type: 'primary' }}
            placement="topRight"
            overlayStyle={{ maxWidth: 420 }}
          >
            <Button
              type="primary"
              size="large"
              disabled={!selectedCriteria}
            >
              付与する
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
            <div style={sectionTitleStyle}>選択要素の情報</div>
            <div style={detailGridStyle}>
              <DetailItem label="要素名 (key)" value={targetProperty.name} />
              <DetailItem label="xsi:type" value={targetProperty.type} mono />
              <DetailItem label="実績値 (value)" value={targetProperty.value} mono />
              <DetailItem label="単位 (units)" value={targetProperty.unit} mono />
              {targetProperty.desc && (
                <DetailItem label="説明" value={targetProperty.desc} fullWidth />
              )}
            </div>
          </div>
        )}

        {/* ===== ② フィルタ + 不確かさ基準候補リスト ===== */}
        <div style={sectionBoxStyle}>
          <div style={sectionTitleStyle}>不確かさ基準候補</div>

          {/* フィルタエリア */}
          <div style={filterAreaStyle}>
            {/* 行1: 評価方式 / 不確かさ基準名(Key属性) */}
            <div style={filterRowStyle}>
              <FilterLabel>評価方式</FilterLabel>
              <Select
                size="small"
                style={{ minWidth: 130 }}
                value={filter.evalType}
                onChange={(v) => setFilter((prev) => ({ ...prev, evalType: v, typeMatch: 'all', unitMatch: 'all', ...(v === 'qualitative' ? { tag: 'all' } : {}) }))}
                options={[
                  { value: 'all', label: 'すべて' },
                  { value: 'quantitative', label: '定量' },
                  { value: 'qualitative', label: '定性' },
                ]}
              />

              <FilterLabel style={{ marginLeft: 12 }}>不確かさ基準名(Key属性)</FilterLabel>
              <Input
                size="small"
                style={{ width: 160 }}
                placeholder="例: MASS（曖昧検索）"
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
                  <FilterLabel>型(type)マッチ</FilterLabel>
                  <Select
                    size="small"
                    style={{ minWidth: 130 }}
                    value={filter.typeMatch}
                    onChange={(v) => setFilter((prev) => ({ ...prev, typeMatch: v }))}
                    options={[
                      { value: 'all', label: 'すべて' },
                      { value: 'match', label: '✦ 一致のみ' },
                    ]}
                  />
                  {targetProperty?.type && targetProperty.type !== 'Binary' && (
                    <span style={matchHintStyle}>対象の型: {targetProperty.type}</span>
                  )}

                  <FilterLabel style={{ marginLeft: 16 }}>単位(units)マッチ</FilterLabel>
                  <Select
                    size="small"
                    style={{ minWidth: 130 }}
                    value={filter.unitMatch}
                    onChange={(v) => setFilter((prev) => ({ ...prev, unitMatch: v }))}
                    options={[
                      { value: 'all', label: 'すべて' },
                      { value: 'match', label: '✦ 一致のみ' },
                    ]}
                  />
                  {targetProperty?.unit && targetProperty.unit !== '—' && (
                    <span style={matchHintStyle}>対象の単位: {targetProperty.unit}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 件数表示 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#444', borderLeft: '3px solid #1677ff', paddingLeft: 8 }}>
              適用可能な不確かさ基準候補
            </span>
            {filteredCriteria.length < criteriaList.length && (
              <span style={{ fontSize: 11, color: '#aaa' }}>
                （{filteredCriteria.length} / {criteriaList.length} 件表示中）
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
                  <div style={{ fontSize: 13 }}>該当する不確かさ基準が見つかりません</div>
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
            新規評価基準を作成
          </Button>
        </div>

        {/* ===== ③ 値入力エリア ===== */}
        <div style={sectionBoxStyle}>
          <div style={sectionTitleStyle}>
            不確かさの値を入力
            {selectedCriteria && (
              <span style={{ fontSize: 11, fontWeight: 400, color: '#888', marginLeft: 6 }}>
                評価基準：{selectedCriteria.name}（{selectedCriteria.key}）
              </span>
            )}
          </div>

          {!selectedCriteria ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#bbb', fontSize: 13 }}>
              上のリストから評価基準を選択してください
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
                    定量評価
                  </div>
                <Form.Item
                      label={<span>不確かさ値 <span style={{ color: '#ff4d4f' }}>*</span></span>}
                      style={{ marginBottom: 0 }}
                      validateStatus={ucValueError ? 'error' : ''}
                      help={ucValueError || (
                        <span style={{ fontSize: 11, color: '#aaa' }}>
                          フォーマット:&nbsp;
                          <code style={codeStyle}>{selectedCriteria.format}</code>
                          &nbsp;範囲: <code style={codeStyle}>0 以上</code>
                        </span>
                      )}
                    >
                      <Input
                        type="number"
                        value={ucValue}
                        min={0}
                        step="0.0001"
                        placeholder="例: 0.002"
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
                    定性評価
                  </div>
                  <Form.Item
                    label={<span>信頼レベルを選択 <span style={{ color: '#ff4d4f' }}>*</span></span>}
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
                        選択中：
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
                    コメント（任意）
                    <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400, marginLeft: 4 }}>
                      ※ &lt;description&gt; に記録されます
                    </span>
                  </span>
                }
                style={{ marginBottom: 0 }}
              >
                <TextArea
                  rows={3}
                  placeholder="測定根拠・コメントを入力…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </Form.Item>
            </Form>
          )}
        </div>

      </div>

      {/* 評価基準作成モーダル */}
      <UncertaintyCreateModal
        open={createModalOpen}
        allCriteria={[]}
        onClose={() => setCreateModalOpen(false)}
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
