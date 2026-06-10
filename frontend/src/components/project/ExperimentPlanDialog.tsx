/**
 * ExperimentPlanDialog.tsx
 * 実験計画詳細指示ダイアログ
 *
 * レイアウト（案3: タブ切替固定）:
 * ┌───────────────────────────────────────────────────────────┐
 * │  実験計画詳細指示 — {methodId}                       [✕] │
 * ├───────────────────────┬───────────────────────────────────┤
 * │ トランジション一覧    │ [全体][タスク1][タスク2]...       │
 * │ ┌──────────────────┐  │ [基本情報][テンプレート入力]      │
 * │ │ Transition1      │  │ ─────────────────────────────     │
 * │ │ Transition2   ◉  │  │ 【CreatorRef】                    │
 * │ │ Transition3      │  │ [プルダウン ▼] [追加]            │
 * │ └──────────────────┘  │ ・creator_001  [×]               │
 * │ （単体行選択）         │                                   │
 * │                       │ 【InstrumentRef】                 │
 * │                       │ [プルダウン ▼] [追加]            │
 * │                       │                                   │
 * │                       │ 【注意事項】                      │
 * │                       │ [タイプ選択 ▼] [追加]            │
 * └───────────────────────┴───────────────────────────────────┤
 * │                               [キャンセル] [保存]          │
 * └───────────────────────────────────────────────────────────┘
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  Tabs,
  Select,
  Input,
  InputNumber,
  Button,
  Card,
  Space,
  Typography,
  Row,
  Col,
  App,
  theme,
  Divider,
  Empty,
  Spin,
  Table,
  Tag,
  Form,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  CloseOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import {
  NoteType,
  NOTE_TYPE_LABELS,
} from '@/types/experimentPlan';
import type {
  NoteItem,
  NoteTypeValue,
  ExperimentPlanTabData,
  ExperimentPlanDialogProps,
  SaveExperimentPlanRequest,
  TemplateDef,
} from '@/types/experimentPlan';
import {
  saveExperimentPlan,
} from '@/services/experimentPlanApiService';

const { Text } = Typography;
const { TextArea } = Input;
const { useToken } = theme;

/** 全体タブのキー定数 */
const TAB_KEY_ALL = 'all';

/**
 * 継承の上書きフラグが追跡するフィールド名
 * 全体タブ変更時に、このフィールド単位でタスクNへ伝播するかどうかを判断する
 */
type InheritableField = 'creatorRefs' | 'instrumentRefs' | 'ownerRefs' | 'notes' | 'templateValues';

/**
 * タブデータの初期値を生成する
 */
function createInitialTabData(): ExperimentPlanTabData {
  return {
    selectedTransitions: [],
    creatorRefs: [],
    instrumentRefs: [],
    ownerRefs: [],
    notes: [],
    templateValues: {},
  };
}

/** トランジション行の型 */
interface TransitionRow {
  id: string;
  name: string;
}

/**
 * Ref追加エリアコンポーネント（Creator / Instrument / Owner 共通）
 */
interface RefSectionProps {
  title: string;
  options: string[];
  selectedValues: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  disabled?: boolean;
  testIdPrefix: string;
}

const RefSection: React.FC<RefSectionProps> = ({
  title,
  options,
  selectedValues,
  onAdd,
  onRemove,
  disabled = false,
  testIdPrefix,
}) => {
  const { token } = useToken();
  const [selectValue, setSelectValue] = useState<string | undefined>(undefined);

  // 未選択のオプションのみ表示（既に追加済みのものは除く）
  const availableOptions = useMemo(
    () => options.filter((o) => !selectedValues.includes(o)),
    [options, selectedValues]
  );

  const handleAdd = () => {
    if (!selectValue) return;
    onAdd(selectValue);
    setSelectValue(undefined);
  };

  return (
    <div>
      <Text strong style={{ fontSize: 13 }}>
        {title}
      </Text>
      <Space style={{ marginTop: 6, width: '100%' }} direction="vertical" size={6}>
        {/* 追加行 */}
        <Space>
          <Select
            value={selectValue}
            onChange={setSelectValue}
            options={availableOptions.map((o) => ({ label: o, value: o }))}
            style={{ minWidth: 220 }}
            placeholder={`${title}を選択`}
            disabled={disabled}
            data-testid={`${testIdPrefix}-select`}
          />
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={disabled || !selectValue}
            data-testid={`${testIdPrefix}-add-button`}
          >
            追加
          </Button>
        </Space>
        {/* 追加済みリスト */}
        {selectedValues.length > 0 && (
          <div
            style={{
              padding: '8px 12px',
              border: `1px solid ${token.colorBorder}`,
              borderRadius: token.borderRadius,
              backgroundColor: token.colorFillAlter,
              minHeight: 36,
            }}
          >
            <Space size={4} wrap>
              {selectedValues.map((v) => (
                <Tag
                  key={v}
                  closable={!disabled}
                  onClose={() => onRemove(v)}
                  color="blue"
                  style={{ margin: 2 }}
                >
                  {v}
                </Tag>
              ))}
            </Space>
          </div>
        )}
      </Space>
    </div>
  );
};

// ============================================================
// テンプレート入力コンポーネント（MAIMLテンプレートデータベース）
// ============================================================

/**
 * テンプレート入力コンポーネント
 *
 * DataRecordDialog のレイアウトに準拠：
 * - 左側: メソッドに紐づくテンプレート一覧（行選択）
 * - 右側: 選択したテンプレートの入力フィールド一覧
 *
 * methodTemplates が空の場合は「テンプレートが未定義」メッセージを表示する
 */
interface TemplateInputPanelProps {
  /** MAIMLから生成したテンプレート定義一覧 */
  methodTemplates: TemplateDef[];
  /** テンプレートの入力値 `{templateId_fieldKey: value}` 形式 */
  templateValues: Record<string, string | number | boolean>;
  onValueChange: (key: string, value: string | number | boolean) => void;
  disabled?: boolean;
}

const TemplateInputPanel: React.FC<TemplateInputPanelProps> = ({
  methodTemplates,
  templateValues,
  onValueChange,
  disabled = false,
}) => {
  const { token } = useToken();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // methodTemplates が変わった（メソッド切り替え等）場合は選択リセット
  useEffect(() => {
    setSelectedTemplateId(null);
  }, [methodTemplates]);

  const selectedTemplate = methodTemplates.find((t) => t.id === selectedTemplateId) ?? null;

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
              styles={{ body: { maxHeight: 360, overflowY: 'auto' } }}
            >
              {selectedTemplate.fields.length === 0 ? (
                <Empty
                  description="フィールドが定義されていません"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <Form layout="vertical" size="small">
                  {selectedTemplate.fields.map((field) => {
                    const valueKey = `${selectedTemplate.id}_${field.key}`;
                    return (
                      <Form.Item
                        key={valueKey}
                        label={
                          <Space size={4}>
                            <Text style={{ fontSize: 12 }}>
                              {field.label || field.key}
                              {field.required && (
                                <span style={{ color: token.colorError, marginLeft: 2 }}>*</span>
                              )}
                            </Text>
                            {field.units && (
                              <Tag color="blue" style={{ fontSize: 10 }}>
                                {field.units}
                              </Tag>
                            )}
                          </Space>
                        }
                        extra={
                          field.description ? (
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              {field.description}
                            </Text>
                          ) : undefined
                        }
                        style={{ marginBottom: 10 }}
                      >
                        {field.type === 'number' ? (
                          <InputNumber
                            value={templateValues[valueKey] as number | undefined}
                            onChange={(value) => {
                              if (value !== null) onValueChange(valueKey, value);
                            }}
                            style={{ width: '100%' }}
                            placeholder={`${field.label || field.key}を入力`}
                            disabled={disabled}
                            data-testid={`template-input-${field.key}`}
                          />
                        ) : field.type === 'select' ? (
                          <Select
                            value={templateValues[valueKey] as string | undefined}
                            onChange={(value) => onValueChange(valueKey, value)}
                            options={(field.options ?? []).map((o) => ({ label: o, value: o }))}
                            style={{ width: '100%' }}
                            placeholder={`${field.label || field.key}を選択`}
                            disabled={disabled}
                            data-testid={`template-input-${field.key}`}
                          />
                        ) : (
                          <Input
                            value={templateValues[valueKey] as string | undefined}
                            onChange={(e) => onValueChange(valueKey, e.target.value)}
                            placeholder={`${field.label || field.key}を入力`}
                            disabled={disabled}
                            data-testid={`template-input-${field.key}`}
                          />
                        )}
                      </Form.Item>
                    );
                  })}
                </Form>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

/**
 * 実験計画詳細指示ダイアログ
 */
const ExperimentPlanDialog: React.FC<ExperimentPlanDialogProps> = ({
  open,
  projectId,
  methodId,
  taskNumbers,
  creatorRefOptions: creatorRefOptionsProp = [],
  instrumentRefOptions: instrumentRefOptionsProp = [],
  ownerRefOptions: ownerRefOptionsProp = [],
  methodTemplates: methodTemplatesProp = [],
  onClose,
  onSave,
  disabled = false,
  allowMethodSelection = false,
  methodOptions = [],
  onMethodChange,
}) => {
  const { token } = useToken();
  const { message } = App.useApp();
  const { maimlRoot } = useProjectMaiml();

  // --- State ---

  /** アクティブなタブキー（'all' | 'task-N'） */
  const [activeTab, setActiveTab] = useState<string>(TAB_KEY_ALL);

  /** 選択中のトランジションID（単体選択） */
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);

  /**
   * タブキー → ExperimentPlanTabData のマップ
   * 全体タブ（'all'）が変更されると、上書きされていない各タスクタブへ自動伝播する
   */
  const [tabDataMap, setTabDataMap] = useState<Record<string, ExperimentPlanTabData>>({});

  /**
   * タブキー → 上書き済みフィールドセットのマップ
   * タスクNタブで直接編集されたフィールドは overrideMap['task-N'] に登録され、
   * 全体タブからの継承対象から除外される
   */
  const [overrideMap, setOverrideMap] = useState<Record<string, Set<InheritableField>>>({});

  const [isSaving, setIsSaving] = useState(false);

  // Ref選択肢はpropsから取得
  const creatorRefOptions = creatorRefOptionsProp;
  const instrumentRefOptions = instrumentRefOptionsProp;
  const ownerRefOptions = ownerRefOptionsProp;

  /** 注意事項追加用の選択中タイプ */
  const [pendingNoteType, setPendingNoteType] = useState<NoteTypeValue | undefined>(undefined);

  /** 案3用: 基本情報 / テンプレート入力の内部タブ */
  const [innerTab, setInnerTab] = useState<'basic' | 'template'>('basic');

  /** 右側パネルが活性化しているか（トランジション選択済み）*/
  const isRightPanelActive = selectedTransitionId !== null;

  /** 現在のタブのデータを取得（なければ初期値を返す）*/
  const currentTabData = useMemo((): ExperimentPlanTabData => {
    return tabDataMap[activeTab] ?? createInitialTabData();
  }, [tabDataMap, activeTab]);

  /**
   * 現在のタブのデータを更新するヘルパー
   * activeTab が 'all'（全体）の場合、変更を各タスクNタブに継承する（上書き済み除く）
   */
  const updateCurrentTabData = useCallback(
    (
      field: InheritableField,
      updater: (prev: ExperimentPlanTabData) => ExperimentPlanTabData,
      isUserEdit: boolean = true
    ) => {
      setTabDataMap((prev) => {
        const updated = updater(prev[activeTab] ?? createInitialTabData());
        const next: Record<string, ExperimentPlanTabData> = { ...prev, [activeTab]: updated };

        // 全体タブの変更を各タスクNタブに伝播
        if (activeTab === TAB_KEY_ALL) {
          taskNumbers.forEach((n) => {
            const key = `task-${n}`;
            const isOverridden = overrideMap[key]?.has(field) ?? false;
            if (!isOverridden) {
              const taskData = next[key] ?? createInitialTabData();
              next[key] = { ...taskData, [field]: (updated as ExperimentPlanTabData)[field] };
            }
          });
        }

        return next;
      });

      // タスクNタブで直接編集された場合は overrideMap に登録
      if (isUserEdit && activeTab !== TAB_KEY_ALL) {
        setOverrideMap((prev) => {
          const prevSet = prev[activeTab] ? new Set(prev[activeTab]) : new Set<InheritableField>();
          prevSet.add(field);
          return { ...prev, [activeTab]: prevSet };
        });
      }
    },
    [activeTab, taskNumbers, overrideMap]
  );

  /** MAIMLからメソッドに対応するトランジション一覧を取得 */
  const transitions = useMemo((): TransitionRow[] => {
    if (!maimlRoot?.protocol?.methods) return [];
    const method = maimlRoot.protocol.methods.find((m) => m.id === methodId);
    const raw = method?.pnml?.transitions ?? [];
    return raw.map((t) => ({ id: t.id, name: t.name || t.id }));
  }, [maimlRoot, methodId]);

  /**
   * 選択中トランジションに紐づくテンプレートのみ抽出する
   *
   * 紐づき解決の手順:
   * 1. PNML の Arc から selectedTransitionId に source or target で繋がる Place ID を収集
   * 2. methodTemplates の placeRefs[].ref がその Place ID に含まれるものを返す
   * 3. selectedTransitionId が null の場合は空配列を返す
   */
  const filteredTemplates = useMemo((): TemplateDef[] => {
    if (!selectedTransitionId) return [];
    if (methodTemplatesProp.length === 0) return [];

    // PNML の Arc 一覧を取得
    const method = maimlRoot?.protocol?.methods?.find((m) => m.id === methodId);
    const arcs = method?.pnml?.arcs ?? [];

    // 選択中トランジションに繋がる Place ID セットを構築
    const connectedPlaceIds = new Set<string>();
    arcs.forEach((arc) => {
      if (arc.source === selectedTransitionId) {
        connectedPlaceIds.add(arc.target);
      } else if (arc.target === selectedTransitionId) {
        connectedPlaceIds.add(arc.source);
      }
    });

    // placeRefs に connectedPlaceId を含むテンプレートのみ返す
    // placeRef.ref が Place の id に対応する
    return methodTemplatesProp.filter((tmpl) => {
      // TemplateDef には placeRefs がないため、maimlRoot の Template から照合する
      // maimlRoot 側の Template.placeRefs[].ref と connectedPlaceIds で照合
      const allTemplates = [
        ...(method?.materialTemplates ?? []),
        ...(method?.conditionTemplates ?? []),
        ...(method?.resultTemplates ?? []),
      ];
      const rawTmpl = allTemplates.find((t) => t.id === tmpl.id);
      if (!rawTmpl) return false;
      if (rawTmpl.placeRefs.length === 0) {
        // placeRefs が空のテンプレートは常に表示（紐づきなし = 全トランジション共通）
        return true;
      }
      return rawTmpl.placeRefs.some((pr) => connectedPlaceIds.has(pr.ref));
    });
  }, [selectedTransitionId, methodTemplatesProp, maimlRoot, methodId]);

  /** タブアイテムの定義 */
  const tabItems = useMemo(() => {
    return [
      { key: TAB_KEY_ALL, label: '全体' },
      ...taskNumbers.map((n) => ({ key: `task-${n}`, label: `タスク${n}` })),
    ];
  }, [taskNumbers]);

  /** ダイアログオープン時に初期化 */
  useEffect(() => {
    if (!open) return;
    setActiveTab(TAB_KEY_ALL);
    setSelectedTransitionId(null);
    setTabDataMap({});
    setOverrideMap({});
    setPendingNoteType(undefined);
    setInnerTab('basic');
  }, [open]);

  // --- トランジション一覧カラム定義 ---
  const transitionColumns: ColumnsType<TransitionRow> = [
    {
      title: 'トランジション名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text style={{ fontSize: 13 }}>{name}</Text>,
    },
  ];

  // --- Ref操作ハンドラ ---

  const handleAddRef = useCallback(
    (field: 'creatorRefs' | 'instrumentRefs' | 'ownerRefs', value: string) => {
      updateCurrentTabData(field, (prev) => ({
        ...prev,
        [field]: [...prev[field], value],
      }));
    },
    [updateCurrentTabData]
  );

  const handleRemoveRef = useCallback(
    (field: 'creatorRefs' | 'instrumentRefs' | 'ownerRefs', value: string) => {
      updateCurrentTabData(field, (prev) => ({
        ...prev,
        [field]: prev[field].filter((v) => v !== value),
      }));
    },
    [updateCurrentTabData]
  );

  // --- 注意事項ハンドラ ---

  const handleAddNote = useCallback(() => {
    if (!pendingNoteType) return;
    const newNote: NoteItem = {
      id: `note_${Date.now()}`,
      type: pendingNoteType,
      content: '',
      properties: [],
    };
    updateCurrentTabData('notes', (prev) => ({
      ...prev,
      notes: [...prev.notes, newNote],
    }));
    setPendingNoteType(undefined);
  }, [pendingNoteType, updateCurrentTabData]);

  const handleRemoveNote = useCallback(
    (noteId: string) => {
      updateCurrentTabData('notes', (prev) => ({
        ...prev,
        notes: prev.notes.filter((n) => n.id !== noteId),
      }));
    },
    [updateCurrentTabData]
  );

  const handleNoteContentChange = useCallback(
    (noteId: string, content: string) => {
      updateCurrentTabData('notes', (prev) => ({
        ...prev,
        notes: prev.notes.map((n) => (n.id === noteId ? { ...n, content } : n)),
      }));
    },
    [updateCurrentTabData]
  );

  // --- テンプレート値変更ハンドラ ---

  const handleTemplateValueChange = useCallback(
    (key: string, value: string | number | boolean) => {
      updateCurrentTabData('templateValues', (prev) => ({
        ...prev,
        templateValues: { ...prev.templateValues, [key]: value },
      }));
    },
    [updateCurrentTabData]
  );

  // --- 保存処理（全タブ一括保存）---

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

      // 全タブ（全体 + 各タスクN）を一括保存
      const allTabKeys = [TAB_KEY_ALL, ...taskNumbers.map((n) => `task-${n}`)];
      const savePromises = allTabKeys.map((tabKey) => {
        const data = tabDataMap[tabKey] ?? createInitialTabData();
        const tabNum =
          tabKey === TAB_KEY_ALL
            ? undefined
            : parseInt(tabKey.replace('task-', ''), 10);

        const request: SaveExperimentPlanRequest = {
          methodId,
          taskNumber: tabNum,
          selectedTransitions: selectedTransitionId ? [selectedTransitionId] : [],
          creatorRefs: data.creatorRefs,
          instrumentRefs: data.instrumentRefs,
          ownerRefs: data.ownerRefs,
          notes: data.notes,
          templateValues: data.templateValues,
        };

        return saveExperimentPlan(projectId, request);
      });

      await Promise.all(savePromises);
      message.success('実験計画を保存しました（モック）');
      onSave?.();
      onClose();
    } catch (error) {
      console.error('[ExperimentPlanDialog] 保存エラー:', error);
      message.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [tabDataMap, taskNumbers, methodId, projectId, selectedTransitionId, onSave, onClose]);

  // --- 基本情報パネル（共通化） ---

  const renderBasicInfoPanel = () => (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      <RefSection
        title="CreatorRef"
        options={creatorRefOptions}
        selectedValues={currentTabData.creatorRefs}
        onAdd={(v) => handleAddRef('creatorRefs', v)}
        onRemove={(v) => handleRemoveRef('creatorRefs', v)}
        disabled={disabled}
        testIdPrefix="experiment-plan-creator-ref"
      />
      <Divider style={{ margin: '4px 0' }} />
      <RefSection
        title="InstrumentRef"
        options={instrumentRefOptions}
        selectedValues={currentTabData.instrumentRefs}
        onAdd={(v) => handleAddRef('instrumentRefs', v)}
        onRemove={(v) => handleRemoveRef('instrumentRefs', v)}
        disabled={disabled}
        testIdPrefix="experiment-plan-instrument-ref"
      />
      <Divider style={{ margin: '4px 0' }} />
      <RefSection
        title="OwnerRef"
        options={ownerRefOptions}
        selectedValues={currentTabData.ownerRefs}
        onAdd={(v) => handleAddRef('ownerRefs', v)}
        onRemove={(v) => handleRemoveRef('ownerRefs', v)}
        disabled={disabled}
        testIdPrefix="experiment-plan-owner-ref"
      />
      <Divider style={{ margin: '4px 0' }} />
      {/* 注意事項 */}
      <div>
        <Text strong style={{ fontSize: 13 }}>注意事項</Text>
        <div style={{ marginTop: 6 }}>
          <Space>
            <Select
              value={pendingNoteType}
              onChange={setPendingNoteType}
              options={Object.entries(NOTE_TYPE_LABELS).map(([key, label]) => ({ value: key, label }))}
              style={{ minWidth: 220 }}
              placeholder="注意事項のタイプを選択"
              disabled={disabled}
            />
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddNote}
              disabled={disabled || !pendingNoteType}
            >
              追加
            </Button>
          </Space>
        </div>
        {currentTabData.notes.length > 0 && (
          <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} size={6}>
            {currentTabData.notes.map((note) => (
              <Card
                key={note.id}
                size="small"
                style={{ backgroundColor: token.colorFillAlter }}
                title={<Text style={{ fontSize: 12 }}>{NOTE_TYPE_LABELS[note.type]}</Text>}
                extra={
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => handleRemoveNote(note.id)}
                    disabled={disabled}
                  />
                }
              >
                <TextArea
                  value={note.content}
                  onChange={(e) => handleNoteContentChange(note.id, e.target.value)}
                  rows={2}
                  showCount
                  maxLength={500}
                  disabled={disabled}
                />
              </Card>
            ))}
          </Space>
        )}
      </div>
    </Space>
  );

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>実験計画詳細指示</span>
          {methodId && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              — {methodId}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width="90vw"
      style={{ maxWidth: 1600, top: 24 }}
      styles={{ body: { padding: `${token.paddingSM}px ${token.paddingMD}px`, overflowX: 'hidden' } }}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isSaving}>
          キャンセル
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={isSaving}
          disabled={disabled || !isRightPanelActive}
          onClick={handleSave}
          data-testid="experiment-plan-dialog-save-button"
        >
          保存
        </Button>,
      ]}
    >
      {/* ====== メソッドID選択UI（allowMethodSelection=true 時のみ表示）====== */}
      {allowMethodSelection && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            backgroundColor: token.colorFillAlter,
            borderRadius: token.borderRadius,
            border: `1px solid ${token.colorBorder}`,
          }}
        >
          <Space align="center">
            <Text strong style={{ fontSize: 13 }}>メソッドID：</Text>
            <Select
              value={methodId}
              options={(methodOptions ?? []).map((m) => ({ label: `${m.name}（${m.id}）`, value: m.id }))}
              onChange={(v) => onMethodChange?.(v)}
              style={{ minWidth: 320 }}
              placeholder="メソッドIDを選択"
              popupMatchSelectWidth={false}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              ※メソッドIDを変更すると内容がリセットされます
            </Text>
          </Space>
        </div>
      )}

      <Row gutter={16} style={{ minHeight: 680, overflowX: 'hidden' }}>
        {/* ====== 左側: トランジション一覧（テーブル、単体行選択）====== */}
        <Col span={5}>
          <Card
            title="トランジション"
            size="small"
            styles={{ body: { padding: 0, maxHeight: 640, overflowY: 'auto' } }}
          >
            {transitions.length === 0 ? (
              <div style={{ padding: 16 }}>
                <Empty
                  description="トランジションがありません"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (
              <Table<TransitionRow>
                dataSource={transitions}
                columns={transitionColumns}
                rowKey="id"
                size="small"
                pagination={false}
                showHeader={false}
                onRow={(record) => ({
                  onClick: () => {
                    if (disabled) return;
                    const newId = selectedTransitionId === record.id ? null : record.id;
                    setSelectedTransitionId(newId);
                    if (newId !== null) setActiveTab(TAB_KEY_ALL);
                  },
                  style: {
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    backgroundColor:
                      selectedTransitionId === record.id
                        ? token.colorPrimaryBg
                        : undefined,
                    transition: 'background-color 0.15s',
                  },
                })}
              />
            )}
          </Card>
        </Col>

        {/* ====== 右側: タブ ＋ 入力フォーム（案3: タブ切替固定）====== */}
        <Col span={19}>
          {!isRightPanelActive ? (
            /* トランジション未選択ガイド */
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 540,
                border: `1px dashed ${token.colorBorder}`,
                borderRadius: token.borderRadius,
                backgroundColor: token.colorFillAlter,
              }}
            >
              <Empty
                description="左のトランジション一覧からトランジションを選択してください"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <Spin spinning={isSaving}>
              {/* ===== 全体/タスクNタブ ===== */}
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="small"
                style={{ marginBottom: token.marginXS }}
              />

              {/* 選択中トランジション表示 */}
              <div
                style={{
                  padding: '4px 12px',
                  marginBottom: 8,
                  backgroundColor: token.colorInfoBg,
                  borderRadius: token.borderRadius,
                  border: `1px solid ${token.colorInfoBorder}`,
                }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>選択中のトランジション: </Text>
                <Text style={{ fontSize: 12, fontWeight: 600 }}>
                  {transitions.find((t) => t.id === selectedTransitionId)?.name ?? selectedTransitionId}
                </Text>
                {activeTab !== TAB_KEY_ALL && (
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 12 }}>
                    ※ 全体タブの設定を継承。このタブで変更すると個別上書きになります。
                  </Text>
                )}
              </div>

              {/* ===== 基本情報 / テンプレート入力 内部タブ ===== */}
              <div style={{ maxHeight: 540, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4 }}>
                <Tabs
                  activeKey={innerTab}
                  onChange={(k) => setInnerTab(k as 'basic' | 'template')}
                  size="small"
                  type="card"
                  style={{ marginBottom: 8 }}
                  items={[
                    {
                      key: 'basic',
                      label: '基本情報',
                      children: renderBasicInfoPanel(),
                    },
                    {
                      key: 'template',
                      label: 'テンプレート入力',
                      children: (
                        <TemplateInputPanel
                          methodTemplates={filteredTemplates}
                          templateValues={currentTabData.templateValues}
                          onValueChange={handleTemplateValueChange}
                          disabled={disabled}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            </Spin>
          )}
        </Col>
      </Row>
    </Modal>
  );
};

export default ExperimentPlanDialog;
