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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Modal,
  Tabs,
  Select,
  Input,
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
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  CloseOutlined,
  FileTextOutlined,
  ImportOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  NoteType,
  NOTE_TYPE_LABELS,
} from '@/types/experimentPlan';
import type {
  NoteItem,
  NoteTypeValue,
  ExperimentPlanTabData,
  ExperimentPlanDialogProps,
} from '@/types/experimentPlan';
import type {
  TransitionRow,
  TransitionOrderItem,
  InheritableField,
  CustomPropValue,
} from '@/types/experimentPlanDialog';
import {
  TAB_KEY_ALL,
} from '@/constants/experimentPlanConstants';
import {
  createInitialTabData,
  buildDefaultTemplateValues,
  calculateSteps,
  canMoveToOrder,
  moveTransitionWithSubtree,
} from '@/utils/experimentPlanHelpers';
import {
  getExperimentPlans,
  experimentPlansToTabDataMap,
  upsertExperimentPlanToApi,
  getPlanDialogData,
} from '@/services/experimentPlanApiService';
import type { PlanDialogData } from '@/services/experimentPlanApiService';
import RefSection from './ExperimentPlanDialog/RefSection';
import SortableTransitionRow from './ExperimentPlanDialog/SortableTransitionRow';
import TemplateInputPanel from './ExperimentPlanDialog/TemplateInputPanel';

const { Text } = Typography;
const { TextArea } = Input;
const { useToken } = theme;

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

  // --- インポート用隠しinput ref ---
  const importInputRef = useRef<HTMLInputElement>(null);

  // --- APIデータ State ---
  const [dialogData, setDialogData] = useState<PlanDialogData | null>(null);
  const [dialogDataLoading, setDialogDataLoading] = useState(false);

  // --- State ---

  /** アクティブなタブキー（'all' | 'task-N'） */
  const [activeTab, setActiveTab] = useState<string>(TAB_KEY_ALL);

  /** 選択中のトランジションID（単体選択・ラジオボタン相当） */
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);

  /**
   * 実行順序リスト（全トランジションを表示し順序を設定する）
   * prerequisiteTransitionIds による依存関係制約を使用する
   */
  const [transitionOrder, setTransitionOrder] = useState<TransitionOrderItem[]>([]);

  /**
   * タブキー → トランジションID → ExperimentPlanTabData のマップ（二次元）
   * 全体タブ（'all'）の特定トランジションが変更されると、
   * 各タスクタブの同じトランジションIDへ自動伝播する
   */
  const [tabDataMap, setTabDataMap] = useState<Record<string, Record<string, ExperimentPlanTabData>>>({});

  const [isSaving, setIsSaving] = useState(false);

  // Ref選択肢はAPIデータ優先、なければpropsから取得
  const creatorRefOptions = dialogData?.creatorRefs ?? creatorRefOptionsProp;
  const instrumentRefOptions = dialogData?.instrumentRefs ?? instrumentRefOptionsProp;
  const ownerRefOptions = dialogData?.ownerRefs ?? ownerRefOptionsProp;

  /** 注意事項追加用の選択中タイプ */
  const [pendingNoteType, setPendingNoteType] = useState<NoteTypeValue | undefined>(undefined);

  /** 案3用: 基本情報 / テンプレート入力の内部タブ */
  const [innerTab, setInnerTab] = useState<'basic' | 'template'>('basic');

  /** 右側パネルが活性化しているか（トランジション選択済み）*/
  const isRightPanelActive = selectedTransitionId !== null;

  /**
   * 現在のタブ × 選択トランジションのデータを取得（なければ初期値を返す）
   */
  const currentTabData = useMemo((): ExperimentPlanTabData => {
    if (!selectedTransitionId) return createInitialTabData();
    return tabDataMap[activeTab]?.[selectedTransitionId] ?? createInitialTabData();
  }, [tabDataMap, activeTab, selectedTransitionId]);

  /**
   * 現在のタブ × 選択トランジションのデータを更新するヘルパー
   * activeTab が 'all'（一括）の場合、同じトランジションIDの各タスクNタブに伝播する
   */
  const updateCurrentTabData = useCallback(
    (
      field: InheritableField,
      updater: (prev: ExperimentPlanTabData) => ExperimentPlanTabData,
    ) => {
      if (!selectedTransitionId) return;

      setTabDataMap((prev) => {
        const currentData = prev[activeTab]?.[selectedTransitionId] ?? createInitialTabData();
        const updated = updater(currentData);

        const next: Record<string, Record<string, ExperimentPlanTabData>> = {
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            [selectedTransitionId]: updated,
          },
        };

        // 一括タブの変更を、同じトランジションIDの各タスクNタブに伝播
        if (activeTab === TAB_KEY_ALL) {
          taskNumbers.forEach((n) => {
            const key = `task-${n}`;
            const taskTransData = next[key]?.[selectedTransitionId] ?? createInitialTabData();
            next[key] = {
              ...next[key],
              [selectedTransitionId]: { ...taskTransData, [field]: updated[field] },
            };
          });
        }

        return next;
      });
    },
    [activeTab, selectedTransitionId, taskNumbers]
  );

  /** APIから取得したトランジション一覧 */
  const transitions = useMemo((): TransitionRow[] => {
    return dialogData?.transitions ?? [];
  }, [dialogData]);

  /** APIから取得したテンプレート一覧（トランジション選択時にPlaceで絞り込み） */
  const filteredTemplates = useMemo(() => {
    if (!selectedTransitionId) return [];

    const allTemplates = dialogData?.templates ?? methodTemplatesProp ?? [];

    // 選択トランジションの inputPlaceIds + outputPlaceIds を取得
    const selectedTransition = dialogData?.transitions.find(
      (t) => t.id === selectedTransitionId
    );
    const inputPlaceIds = selectedTransition?.inputPlaceIds ?? [];
    const outputPlaceIds = selectedTransition?.outputPlaceIds ?? [];
    const allPlaceIds = [...inputPlaceIds, ...outputPlaceIds];

    // placeIds が空の場合は全テンプレートを表示（フォールバック）
    if (allPlaceIds.length === 0) return allTemplates;

    // 選択トランジションの placeIds（入力+出力）に紐づくテンプレートのみ抽出
    const placeIdSet = new Set(allPlaceIds);
    const matched = allTemplates.filter((tmpl) =>
      tmpl.placeIds?.some((pid) => placeIdSet.has(pid))
    );

    // 一致するテンプレートがない場合も全件表示（フォールバック）
    return matched.length > 0 ? matched : allTemplates;
  }, [selectedTransitionId, dialogData, methodTemplatesProp]);

  /**
   * 参照専用（disabled）テンプレートID Set
   *
   * @remarks
   * Petri Net の inputPlaceIds（Place → Transition）は
   * 前工程の出力結果として渡されるPlaceを意味するため、
   * 実験計画UIでは「参照専用（入力不可）」として扱う。
   * （outputPlaceIds = Transition → Place は今工程で入力する値なので入力可能）
   */
  const outputTemplateIds = useMemo((): Set<string> => {
    if (!selectedTransitionId || !dialogData) return new Set();

    const selectedTransition = dialogData.transitions.find(
      (t) => t.id === selectedTransitionId
    );
    // inputPlaceIds = 前工程からの入力Place → 参照専用（disabled）
    const precedingPlaceIds = selectedTransition?.inputPlaceIds ?? [];
    if (precedingPlaceIds.length === 0) return new Set();

    const precedingPlaceIdSet = new Set(precedingPlaceIds);
    const ids = new Set<string>();
    for (const tmpl of dialogData.templates) {
      // result カテゴリ かつ inputPlaceIds に紐づく場合のみ参照専用（disabled）にする
      // material / condition は前工程からの入力であっても入力可能
      if (
        tmpl.category === 'result' &&
        tmpl.placeIds?.some((pid) => precedingPlaceIdSet.has(pid))
      ) {
        ids.add(tmpl.id);
      }
    }
    return ids;
  }, [selectedTransitionId, dialogData]);

  /**
   * Place ID → その Place を outputPlaceIds に持つトランジションID のマッピング
   * 「どのトランジションがそのPlaceに値を出力するか」を解決するために使用する
   */
  const placeProducerMap = useMemo((): Map<string, string> => {
    if (!dialogData) return new Map();
    const map = new Map<string, string>();
    for (const trans of dialogData.transitions) {
      for (const placeId of trans.outputPlaceIds) {
        map.set(placeId, trans.id);
      }
    }
    return map;
  }, [dialogData]);

  /**
   * テンプレートID → そのテンプレートを出力したトランジションID のマッピング
   * 参照専用テンプレートの値を producer トランジションのタブデータから取得するために使用する
   */
  const templateProducerMap = useMemo((): Map<string, string> => {
    if (!dialogData) return new Map();
    const map = new Map<string, string>();
    for (const tmpl of dialogData.templates) {
      if (!tmpl.placeIds || tmpl.placeIds.length === 0) continue;
      for (const placeId of tmpl.placeIds) {
        const producerTransId = placeProducerMap.get(placeId);
        if (producerTransId) {
          map.set(tmpl.id, producerTransId);
          break;
        }
      }
    }
    return map;
  }, [dialogData, placeProducerMap]);

  /**
   * 参照専用（disabled）テンプレートの値を producer トランジションの tabData から取得して
   * 現在の templateValues に上書きマージした「表示用」テンプレート値
   *
   * - disabled でないテンプレートの値はそのまま（currentTabData.templateValues）
   * - disabled テンプレートの値は、producer トランジション × activeTab（なければ 'all' タブ）から取得
   */
  const effectiveTemplateValues = useMemo((): Record<string, string | number | boolean> => {
    if (outputTemplateIds.size === 0) return currentTabData.templateValues;

    const overrides: Record<string, string | number | boolean> = {};

    for (const tmplId of outputTemplateIds) {
      const producerTransId = templateProducerMap.get(tmplId);
      if (!producerTransId) continue;

      // activeTab → fallback to 'all' タブ の順で producer の tabData を取得
      const producerTabData =
        tabDataMap[activeTab]?.[producerTransId] ??
        tabDataMap[TAB_KEY_ALL]?.[producerTransId];

      if (!producerTabData) continue;

      // producer の templateValues から当該テンプレート（tmplId）のキーを抽出して上書き
      for (const [key, value] of Object.entries(producerTabData.templateValues)) {
        // キーが `{templateId}_{fieldKey}` 形式なので tmplId プレフィックスで一致判定
        if (key.startsWith(`${tmplId}_`)) {
          overrides[key] = value;
        }
      }
    }

    return { ...currentTabData.templateValues, ...overrides };
  }, [outputTemplateIds, templateProducerMap, tabDataMap, activeTab, currentTabData.templateValues]);

  /** タブアイテムの定義 */
  const tabItems = useMemo(() => {
    return [
      { key: TAB_KEY_ALL, label: '一括' },
      ...taskNumbers.map((n) => ({ key: `task-${n}`, label: `タスク${n}` })),
    ];
  }, [taskNumbers]);

  /** ダイアログオープン時にAPIデータ取得 & 状態初期化 */
  useEffect(() => {
    if (!open) return;

    setActiveTab(TAB_KEY_ALL);
    setSelectedTransitionId(null);
    setTransitionOrder([]);
    setTabDataMap({});
    setPendingNoteType(undefined);
    setInnerTab('basic');

    if (!projectId || !methodId) return;

    const fetchDialogData = async () => {
      setDialogDataLoading(true);
      try {
        // トランジション・テンプレート・Ref選択肢を取得
        const data = await getPlanDialogData(projectId, methodId);
        setDialogData(data);

        // 既存の実験計画データを取得して tabDataMap を復元
        const existingPlans = await getExperimentPlans(projectId, methodId);
        const restoredTabDataMap = experimentPlansToTabDataMap(existingPlans);
        if (Object.keys(restoredTabDataMap).length > 0) {
          // 保存済みデータがある場合はそちらを優先
          setTabDataMap(restoredTabDataMap);
        } else {
          // 初回入力時: 全トランジション分のデフォルト値で一括タブを初期化
          const defaultTemplateValues = buildDefaultTemplateValues(data.templates);
          const info = data.defaultBasicInfo;

          // 一括タブ: トランジションIDごとにデフォルト値を設定
          const allTabTransMap: Record<string, ExperimentPlanTabData> = {};
          for (const trans of data.transitions) {
            const defaultNotes: NoteItem[] = (info?.notes ?? []).map((n) => ({
              id: `note_default_${trans.id}_${n.type}_${Date.now()}`,
              type: n.type as NoteTypeValue,
              content: n.content,
              properties: [],
            }));
            allTabTransMap[trans.id] = {
              ...createInitialTabData(),
              creatorRefs: info?.creatorRefs ?? [],
              instrumentRefs: info?.instrumentRefs ?? [],
              ownerRefs: info?.ownerRefs ?? [],
              notes: defaultNotes,
              templateValues: defaultTemplateValues,
            };
          }
          setTabDataMap({ [TAB_KEY_ALL]: allTabTransMap });
        }
      } catch (err) {
        console.error('[ExperimentPlanDialog] getPlanDialogData error:', err);
        message.error('実験計画データの取得に失敗しました');
      } finally {
        setDialogDataLoading(false);
      }
    };

    fetchDialogData();
  }, [open, projectId, methodId, message]);

  /** メソッドID変更時にAPIデータ再取得 */
  useEffect(() => {
    if (!open || !projectId || !methodId) return;

    const fetchDialogData = async () => {
      setDialogDataLoading(true);
      setSelectedTransitionId(null);
      try {
        const data = await getPlanDialogData(projectId, methodId);
        setDialogData(data);
      } catch (err) {
        console.error('[ExperimentPlanDialog] getPlanDialogData (methodId change) error:', err);
        message.error('実験計画データの取得に失敗しました');
      } finally {
        setDialogDataLoading(false);
      }
    };

    fetchDialogData();
    // open の変化では二重実行しないため methodId のみ依存
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodId]);

  // --- トランジション一覧カラム定義 ---
  const transitionColumns: ColumnsType<TransitionRow> = [
    {
      title: 'トランジション名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text style={{ fontSize: 13 }}>{name}</Text>,
    },
  ];

  // --- カスタムプロパティ State（templateId → CustomPropValue[]） ---
  const [customProps, setCustomProps] = useState<Record<string, CustomPropValue[]>>({});

  const handleCustomPropsChange = useCallback((templateId: string, props: CustomPropValue[]) => {
    setCustomProps((prev) => ({ ...prev, [templateId]: props }));
  }, []);

  // --- インポートハンドラ ---
  const handleImport = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.tabDataMap) {
            setTabDataMap(json.tabDataMap);
          }
          message.success('インポートしました');
        } catch {
          message.error('JSONの解析に失敗しました');
        }
      };
      reader.readAsText(file);
      // 同一ファイルを再選択できるようにリセット
      e.target.value = '';
    },
    [message]
  );

  // --- エクスポートハンドラ ---
  const handleExport = useCallback(() => {
    const exportData = {
      methodId,
      projectId,
      selectedTransitionId,
      tabDataMap,
      customProps,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment-plan_${methodId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('エクスポートしました');
  }, [methodId, projectId, selectedTransitionId, tabDataMap, customProps, message]);

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

  // --- 実行順序ハンドラ ---

  /** transitions配列が変化したとき、transitionOrderを全件初期化（ステップを自動計算） */
  useEffect(() => {
    if (transitions.length === 0) {
      setTransitionOrder([]);
      return;
    }
    const initialOrder = transitions.map((trans, index) => ({
      id: trans.id,
      name: trans.name,
      order: index + 1,
      step: 1, // calculateSteps で上書きされる暫定値
      prerequisiteTransitionIds: trans.prerequisiteTransitionIds ?? [],
    }));
    setTransitionOrder(calculateSteps(initialOrder));
  }, [transitions]);

  /** ドラッグ&ドロップ用センサー */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /** ドラッグ終了ハンドラ（子孫と一緒に自動連動移動） */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setTransitionOrder((prev) => {
        const newIndex = prev.findIndex((item) => item.id === over.id);
        const targetOrder = newIndex + 1;

        const validation = canMoveToOrder(active.id as string, targetOrder, prev);
        if (!validation.canMove) {
          message.warning(validation.reason ?? '順序を変更できません');
          return prev;
        }

        return calculateSteps(moveTransitionWithSubtree(active.id as string, targetOrder, prev));
      });
    },
    [message]
  );

  /** Select手入力による順序変更ハンドラ（子孫と一緒に自動連動移動） */
  const handleOrderSelectChange = useCallback(
    (transitionId: string, newOrder: number) => {
      setTransitionOrder((prev) => {
        const validation = canMoveToOrder(transitionId, newOrder, prev);
        if (!validation.canMove) {
          message.warning(validation.reason ?? '順序を変更できません');
          return prev;
        }

        return calculateSteps(moveTransitionWithSubtree(transitionId, newOrder, prev));
      });
    },
    [message]
  );

  // --- 保存処理（全タスク一括保存: 実API接続）---

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

      const orderEntries = transitionOrder.map((item) => ({
        id: item.id,
        order: item.order,
        prerequisiteTransitionIds: item.prerequisiteTransitionIds,
      }));

      // 全タスク × 全トランジション分を保存
      const savePromises = taskNumbers.map((taskNo) => {
        const tabKey = `task-${taskNo}`;
        // tabDataMap[tabKey] は Record<string, ExperimentPlanTabData>（トランジションIDキー）
        const transitionDataMap = tabDataMap[tabKey] ?? {};
        return upsertExperimentPlanToApi(projectId, methodId, taskNo, transitionDataMap, orderEntries);
      });

      await Promise.all(savePromises);
      message.success('実験計画を保存しました');
      onSave?.();
      onClose();
    } catch (error) {
      console.error('[ExperimentPlanDialog] 保存エラー:', error);
      message.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [tabDataMap, taskNumbers, methodId, projectId, transitionOrder, onSave, onClose, message]);

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
        /* 隠しinput（インポート用） */
        <input
          key="import-input"
          ref={importInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImportFileChange}
        />,
        <Tooltip key="import-tooltip" title="JSONファイルから設定を読み込む">
          <Button
            key="import"
            icon={<ImportOutlined />}
            onClick={handleImport}
            disabled={isSaving}
          >
            インポート
          </Button>
        </Tooltip>,
        <Tooltip key="export-tooltip" title="現在の設定をJSONファイルに書き出す">
          <Button
            key="export"
            icon={<ExportOutlined />}
            onClick={handleExport}
            disabled={isSaving}
          >
            エクスポート
          </Button>
        </Tooltip>,
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
          {/* ── トランジション選択 ── */}
          <Card
            title="トランジション"
            size="small"
            styles={{ body: { padding: 0, maxHeight: 320, overflowY: 'auto' } }}
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

          {/* ── 実行順序リスト（ドラッグ&ドロップ + Select手入力）── */}
          <Card
            title={
              <Space size={4}>
                <Text style={{ fontSize: 12 }}>実行順序</Text>
                {transitionOrder.length > 0 && (
                  <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                    {transitionOrder.length}件
                  </Tag>
                )}
              </Space>
            }
            size="small"
            style={{ marginTop: 8 }}
            styles={{ body: { padding: '4px 8px', maxHeight: 360, overflowY: 'auto' } }}
          >
            {transitionOrder.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', padding: '8px 0' }}>
                トランジションがありません
              </Text>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={transitionOrder.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {transitionOrder.map((item) => {
                      const trans = transitions.find((t) => t.id === item.id);
                      const name = trans?.name ?? item.id;
                      return (
                        <SortableTransitionRow
                          key={item.id}
                          id={item.id}
                          order={item.order}
                          step={item.step}
                          name={name}
                          prerequisiteTransitionIds={item.prerequisiteTransitionIds}
                          allTransitionOrderItems={transitionOrder}
                          maxOrder={transitionOrder.length}
                          onOrderChange={handleOrderSelectChange}
                          disabled={disabled}
                          token={token}
                        />
                      );
                    })}
                  </Space>
                </SortableContext>
              </DndContext>
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
                {activeTab === TAB_KEY_ALL && (
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 12 }}>
                    ※ 一括タブで設定した内容は、他のすべてのタスクNoタブに反映されます。
                  </Text>
                )}
                {activeTab !== TAB_KEY_ALL && (
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 12 }}>
                    ※ 一括タブの設定を継承。このタブで変更すると個別上書きになります。
                  </Text>
                )}
              </div>

              {/* ===== 基本情報 / テンプレート入力 内部タブ ===== */}
              <div style={{ overflowX: 'hidden', paddingRight: 4 }}>
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
                          templateValues={effectiveTemplateValues}
                          onValueChange={handleTemplateValueChange}
                          customProps={customProps}
                          onCustomPropsChange={handleCustomPropsChange}
                          disabled={disabled}
                          outputTemplateIds={outputTemplateIds}
                          projectId={projectId}
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
