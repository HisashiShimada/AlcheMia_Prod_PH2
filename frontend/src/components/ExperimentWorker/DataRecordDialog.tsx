'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Checkbox,
  DatePicker,
  Button,
  Table,
  Alert,
  Space,
  Typography,
  Upload,
  Tag,
  Row,
  Col,
  message,
  theme,
  Select,
  Layout,
  Slider,
  Spin,
  Card,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  SaveOutlined,
  CloseOutlined,
  FileTextOutlined,
  DownOutlined,
  RightOutlined,
  SearchOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
  EditOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FastForwardOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Property,
  ContentField,
  ContentType,
  PropertyType,
  ExperimentDataValue,
  Transition,
  Template,
  TemplateCategory,
  TransitionStatus,
  ProjectStatus,
  isEditableStatus,
  CustomPropertyValue,
  ContainerType,
  CustomPropertyType,
  InsertionField,
} from '@/types/experimentWorker';
import { TransitionStatusCode } from '@/constants/codeMaster';

/**
 * ステータス遷移ルール（progressService.ts の ALLOWED_TRANSITIONS と同一）
 * キー: 現在のステータス値（数値）
 * 値: 遷移可能なステータス値の配列（数値）
 */
const ALLOWED_TRANSITIONS: Record<number, number[]> = {
  [TransitionStatusCode.INITIAL]:   [TransitionStatusCode.PREPARING, TransitionStatusCode.COMPLETED, TransitionStatusCode.ERROR],
  [TransitionStatusCode.PREPARING]: [TransitionStatusCode.READY, TransitionStatusCode.COMPLETED, TransitionStatusCode.ERROR],
  [TransitionStatusCode.READY]:     [TransitionStatusCode.READY, TransitionStatusCode.IN_PROGRESS, TransitionStatusCode.COMPLETED, TransitionStatusCode.ERROR],
  [TransitionStatusCode.IN_PROGRESS]: [TransitionStatusCode.PAUSED, TransitionStatusCode.COMPLETED, TransitionStatusCode.ERROR],
  [TransitionStatusCode.PAUSED]:    [TransitionStatusCode.IN_PROGRESS, TransitionStatusCode.COMPLETED, TransitionStatusCode.ERROR],
  [TransitionStatusCode.COMPLETED]: [],  // 終状態 → 変更不可
  [TransitionStatusCode.ERROR]:     [],  // 異常終了 → 変更不可
};

import { saveBatchExperimentData, getTemplateData } from '@/services/experimentDataApiService';
import { fetchUncertaintyCriteriaForSelector, type QualitativeOptionApiRow } from '@/services/uncertaintyCriteriaApiService';
import { uploadFiles } from '@/services/fileAccessService';
import { extractErrorMessage } from '@/utils/errorUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateByXsiType } from '@/utils/xsiTypeValidator';
import { updateTransitionStatus, getWorkerInstructions, confirmInstruction } from '@/services/projectApiService';
import { ExperimentDataRecord, TemplateDataItem } from '@/types/api';
import type { WorkerInstruction } from '@/types/project';
import InstructionConfirmationModal from './InstructionConfirmationModal';
import ExperimentCommentDialog from './ExperimentCommentDialog';

// ===== TemplateDataItem → Template 変換ヘルパー =====

/**
 * API の templateType 文字列をフロントの TemplateCategory にマッピングする
 */
function mapTemplateTypeToCategory(templateType: string): TemplateCategory {
  switch (templateType) {
    case 'material':   return 'Materials';
    case 'condition':  return 'Conditions';
    case 'result':     return 'Results';
    default:           return 'Materials'; // 未知の値は Materials にフォールバック
  }
}

/** PropertyType の全候補（xsiType をそのまま使用）*/
const KNOWN_PROPERTY_TYPES: readonly PropertyType[] = [
  'stringType', 'tokenType', 'stringEnumType',
  'intType', 'longType', 'shortType', 'byteType',
  'unsignedIntType', 'unsignedLongType', 'unsignedShortType', 'unsignedByteType',
  'floatType', 'doubleType', 'decimalType',
  'booleanType',
  'dateType', 'dateTimeType',
  'stringListType', 'intListType', 'longListType', 'shortListType', 'byteListType',
  'unsignedIntListType', 'floatListType', 'doubleListType', 'decimalListType',
  'booleanListType', 'dateTimeListType',
  'propertyListType', 'insertion',
] as const;

/**
 * API の xsiType 文字列をフロントの PropertyType にマッピングする
 * xsiType をそのまま PropertyType として返す（変換不要）
 */
function mapXsiTypeToPropertyType(xsiType: string): PropertyType {
  if ((KNOWN_PROPERTY_TYPES as readonly string[]).includes(xsiType)) {
    return xsiType as PropertyType;
  }
  return 'stringType'; // 未知の xsiType は stringType にフォールバック
}

/** ContentType の全候補 */
const KNOWN_CONTENT_TYPES: readonly ContentType[] = [
  'contentStringListType',
  'contentIntListType',
  'contentLongListType',
  'contentShortListType',
  'contentByteListType',
  'contentUnsignedIntListType',
  'contentFloatListType',
  'contentDoubleListType',
  'contentDecimalListType',
  'contentBooleanListType',
  'contentDateTimeListType',
] as const;

/**
 * API の xsiType 文字列をフロントの ContentType にマッピングする
 * xsiType をそのまま ContentType として返す（変換不要）
 */
function mapXsiTypeToContentType(xsiType: string): ContentType {
  if ((KNOWN_CONTENT_TYPES as readonly string[]).includes(xsiType)) {
    return xsiType as ContentType;
  }
  return 'contentStringListType'; // 未知の xsiType は contentStringListType にフォールバック
}

/**
 * rawProperty オブジェクトを再帰的に Property 型に変換する
 * propertyListType の子 Property・子 Content を nestedProperties / contents にマッピングする
 */
function convertRawPropertyToProperty(
  p: Record<string, unknown>,
  depth: number = 0
): Property {
  const MAX_DEPTH = 5;
  const xsiType = String(p.xsiType ?? 'stringType');

  const base: Property = {
    key: String(p.key ?? ''),
    label: String(p.key ?? ''),
    type: mapXsiTypeToPropertyType(xsiType),
    units: (p.units as string | undefined) ?? undefined,
    required: false,
    description: (p.description as string | undefined) ?? undefined,
    formatString: (p.formatString as string | undefined) ?? undefined,
    scaleFactor: (p.scaleFactor as string | undefined) ?? undefined,
    // 不確かさ関連フィールドをマッピング
    plannedValue: (p.plannedValue as string | number | null | undefined) != null
      ? String(p.plannedValue)
      : undefined,
    toleranceValue: (p.toleranceValue as string | null | undefined) ?? undefined,
    uncertaintyNote: (p.uncertaintyNote as string | null | undefined) ?? undefined,
    uncertaintyKey: (p.uncertaintyKey as string | null | undefined) ?? undefined,
    uncertaintyName: (p.uncertaintyName as string | null | undefined) ?? undefined,
  };

  if (xsiType === 'propertyListType' && depth < MAX_DEPTH) {
    const childProps = p.properties as Array<Record<string, unknown>> | undefined;
    const childContents = p.contents as Array<Record<string, unknown>> | undefined;

    const nestedProps = Array.isArray(childProps)
      ? childProps
          .filter((child) => !child.isCustomProperty)
          .map((child) => convertRawPropertyToProperty(child, depth + 1))
      : [];
    if (nestedProps.length > 0) {
      base.nestedProperties = nestedProps;
    }

    const nestedContents: ContentField[] = Array.isArray(childContents)
      ? childContents.map((c) => ({
          key: String(c.key ?? ''),
          label: String(c.key ?? ''),
          type: mapXsiTypeToContentType(String(c.xsiType ?? 'contentStringListType')),
          units: (c.units as string | undefined) ?? undefined,
          description: (c.description as string | undefined) ?? undefined,
          axis: (c.axis as string | undefined) ?? undefined,
          size: (c.size as number | undefined) ?? undefined,
        }))
      : [];
    if (nestedContents.length > 0) {
      base.contents = nestedContents;
    }
  }

  return base;
}

/**
 * テンプレート名を解決する
 * 優先順位: MAIMLファイル内のテンプレート名 > テンプレートID
 */
function resolveTemplateName(
  templateName: string | null | undefined,
  templateId: string
): string {
  if (templateName && templateName.trim().length > 0) {
    return templateName.trim();
  }
  return templateId;
}

/**
 * API レスポンスの TemplateDataItem[] をサイドバー表示用の Template[] に変換する
 *
 * フォールバック時の data 形式:
 *   { templateId, templateType, properties: [{ key, xsiType, value, units }] }
 *
 * DB 実績あり時の data 形式:
 *   フラットな key-value（プロパティ定義が含まれないため、フォールバックの構造を優先する）
 */
function convertTemplateDataItemsToTemplates(items: TemplateDataItem[]): Template[] {
  return items.map((item) => {
    const category = mapTemplateTypeToCategory(item.templateType);

    // data.properties が存在する場合（フォールバック形式）はそこから Property[] を構築
    const rawData = item.data as Record<string, unknown>;
    const rawProperties = rawData.properties as Array<{
      key: string;
      xsiType: string;
      value: unknown;
      units: string | null;
    }> | undefined;

    const properties: Property[] = (rawProperties ?? [])
      // isCustomProperty: true なプロパティはテンプレート定義欄に表示しない
      .filter((p) => !(p as Record<string, unknown>).isCustomProperty)
      .map((p) => convertRawPropertyToProperty(p as Record<string, unknown>));

    // テンプレートトップレベルの Content を ContentField[] に変換
    const rawContentsTop = rawData.contents as Array<Record<string, unknown>> | undefined;
    const contents: ContentField[] = Array.isArray(rawContentsTop)
      ? rawContentsTop.map((c) => ({
          key: String(c.key ?? ''),
          label: String(c.key ?? ''),
          type: mapXsiTypeToContentType(String(c.xsiType ?? 'contentStringListType')),
          units: (c.units as string | undefined) ?? undefined,
          description: (c.description as string | undefined) ?? undefined,
          axis: (c.axis as string | undefined) ?? undefined,
          size: (c.size as number | undefined) ?? undefined,
        }))
      : [];

    // テンプレートトップレベルの Insertion を InsertionField[] に変換（非カスタム）
    const rawInsertionsTop = rawData.insertions as Array<Record<string, unknown>> | undefined;
    const insertions: InsertionField[] = Array.isArray(rawInsertionsTop)
      ? rawInsertionsTop
          .filter((ins) => !ins.isCustomProperty)
          .map((ins) => ({
            uri: String(ins.uri ?? ''),
            hash: ins.hash
              ? typeof ins.hash === 'object'
                ? String((ins.hash as Record<string, unknown>).value ?? '')
                : String(ins.hash)
              : undefined,
            format: ins.format ? String(ins.format) : undefined,
            description: ins.description ? String(ins.description) : undefined,
          }))
      : [];

    const name = resolveTemplateName(item.templateName, item.templateId);

    return {
      templateId: item.templateId,
      category,
      name,
      properties,
      ...(contents.length > 0 ? { contents } : {}),
      ...(insertions.length > 0 ? { insertions } : {}),
    } satisfies Template;
  });
}

/**
 * MIMEタイプ文字列を accept 属性文字列に変換するヘルパー
 * 例: "image/tiff" → ".tif,.tiff"
 *     "txt/ascii"  → ".txt"
 */
function getAcceptString(format: string | undefined): string | undefined {
  if (!format) return undefined;
  const formatMap: Record<string, string> = {
    'txt/ascii':           '.txt',
    'text/plain':          '.txt',
    'image/tiff':          '.tif,.tiff',
    'image/bmp':           '.bmp',
    'image/jpeg':          '.jpg,.jpeg',
    'image/png':           '.png',
    'application/pdf':     '.pdf',
    'application/xml':     '.xml',
    'application/json':    '.json',
    'text/csv':            '.csv',
    'application/zip':     '.zip',
    'application/octet-stream': '',
  };
  return formatMap[format] ?? undefined;
}

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Sider, Content } = Layout;

/**
 * ContentField（テンプレート定義・非カスタム）用の行追加可能な入力コンポーネント
 * Form.Item の children として使用する。
 * フォーム値は string[]（各行がスペース区切りの列値）で管理する。
 */
function ContentRowListInput({
  value,
  onChange,
  disabled,
}: {
  value?: string[];
  onChange?: (v: string[]) => void;
  disabled?: boolean;
}) {
  const rows: string[] = Array.isArray(value) && value.length > 0 ? value : [''];
  return (
    <div>
      {rows.map((rowVal, rowIdx) => (
        <div key={rowIdx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <TextArea
            placeholder={`行 ${rowIdx + 1}: 値をスペース区切りで入力（例: 1.0 2.5 3.0）`}
            value={rowVal}
            onChange={(e) => {
              const newRows = [...rows];
              newRows[rowIdx] = e.target.value;
              onChange?.(newRows);
            }}
            autoSize={{ minRows: 1, maxRows: 3 }}
            style={{ flex: 1 }}
            disabled={disabled}
          />
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            disabled={disabled || rows.length <= 1}
            onClick={() => {
              const newRows = rows.filter((_, i) => i !== rowIdx);
              onChange?.(newRows);
            }}
            style={{ flexShrink: 0 }}
          />
        </div>
      ))}
      <Button
        size="small"
        icon={<PlusOutlined />}
        disabled={disabled}
        onClick={() => {
          onChange?.([...rows, '']);
        }}
      >
        行を追加
      </Button>
    </div>
  );
}

interface DataRecordDialogProps {
  open: boolean;
  transition: Transition | null;
  projectStatus: ProjectStatus | null;
  onClose: () => void;
  onSave: (data: ExperimentDataValue[]) => void;
  projectId?: string;
  projectName?: string;
  methodId?: string;
  taskNo?: number;
  /** みなし進捗使用フラグ（organization.use_deemed_progress）: false の場合はチェックボックスを非表示にしてステータス更新を常時表示 */
  useDeemedProgress?: boolean;
  /** インライン表示モード: true の場合 Modal ではなく div でレンダリング（実験記録タブ等のページ内表示用） */
  inlineMode?: boolean;
}

/**
 * データ記録ダイアログコンポーネント
 * トランジションの実験結果を記録する
 */
export default function DataRecordDialog({
  open,
  transition,
  projectStatus,
  onClose,
  onSave,
  projectId,
  projectName,
  methodId,
  taskNo,
  useDeemedProgress: useDeemedProgressProp = true,
  inlineMode = false,
}: DataRecordDialogProps) {
  const { token } = theme.useToken();
  const { t } = useLanguage();
  const [form] = Form.useForm();
  const [formData, setFormData] = useState<Record<string, ExperimentDataValue>>({});
  const [dataGrids, setDataGrids] = useState<Record<string, number[][]>>({});
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  // テンプレート実績データのローディング状態
  const [templateDataLoading, setTemplateDataLoading] = useState(false);
  
  // 作業指示モーダルの状態
  const [instructionModalOpen, setInstructionModalOpen] = useState(false);

  // 実験コメントダイアログの状態
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);

  // 状態時刻修正モーダルの状態
  const [stateTimeEditModalOpen, setStateTimeEditModalOpen] = useState(false);

  /**
   * 状態記録モーダル内の「休止状態 + 動作状態」動的ペア
   * ボタン押下ごとに追加される
   */
  const [pauseEntries, setPauseEntries] = useState<
    Array<{ id: string; pauseTime: import('dayjs').Dayjs | null; resumeTime: import('dayjs').Dayjs | null }>
  >([]);

  /**
   * 状態時刻修正モーダル用の時刻データ
   * キー: TransitionStatusCode 値（0〜6）
   * 値: { startTime: dayjs.Dayjs | null; endTime: dayjs.Dayjs | null }
   */
  const [stateTimesData, setStateTimesData] = useState<
    Record<number, { startTime: import('dayjs').Dayjs | null; endTime: import('dayjs').Dayjs | null }>
  >({
    0: { startTime: null, endTime: null },
    1: { startTime: null, endTime: null },
    2: { startTime: null, endTime: null },
    3: { startTime: null, endTime: null },
    4: { startTime: null, endTime: null },
    5: { startTime: null, endTime: null },
    6: { startTime: null, endTime: null },
  });

  // APIから取得したテンプレート一覧（TemplateDataItem → Template に変換済み）
  const [fetchedTemplates, setFetchedTemplates] = useState<Template[]>([]);

  // APIから取得したテンプレート実績の生データ（placeId・data構造の保持に使用）
  const [fetchedTemplateItems, setFetchedTemplateItems] = useState<TemplateDataItem[]>([]);

  // テンプレート一覧用の状態
  const [templateSearchText, setTemplateSearchText] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<TemplateCategory | undefined>(undefined);
  const [templatesExpanded, setTemplatesExpanded] = useState(true);
  
  // テンプレート選択状態（単一選択）
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // プロパティ入力フォームの折りたたみ状態
  const [propertyFormExpanded, setPropertyFormExpanded] = useState(true);

  // ステータス更新セクションの折りたたみ状態
  // プロジェクトの状態が編集可能でない場合は折りたたむ
  const [statusUpdateExpanded, setStatusUpdateExpanded] = useState(true);
  // ステータス更新確認モーダルの開閉状態
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  
  // プロジェクトの状態が編集可能かどうか
  const isProjectEditable = projectStatus ? isEditableStatus(projectStatus) : true;

  /**
   * 現在のトランジションステータス（数値）
   * transition.status は型上 ProgressStatus（文字列型）だが、
   * APIレスポンスでは実際に数値（0-6）が入っているため Number() で変換する。
   * ExperimentRecordTab 等で数値→文字列変換（例: 5→'completed'）が行われる場合も
   * 文字列ステータスマップで数値に逆変換して正しい終端ステータス判定を行う。
   */
  const currentStatus = useMemo((): number => {
    if (!transition || transition.status === undefined || transition.status === null) {
      return 0;
    }
    const num = Number(transition.status);
    if (!isNaN(num)) return num;

    // 文字列ステータス → 数値マッピング
    // ExperimentRecordTab.tsx の変換ルールに対応:
    //   0: INITIAL      → 'not_started'
    //   1: PREPARING    → 'in_progress'
    //   2: READY        → 'in_progress'
    //   3: IN_PROGRESS  → 'in_progress'
    //   4: PAUSED       → 'on_hold'
    //   5: COMPLETED    → 'completed'
    //   6: ERROR        → 'issue'
    const statusStringMap: Record<string, number> = {
      'not_started': 0,
      'in_progress': 3,
      'on_hold':     4,
      'completed':   5,
      'issue':       6,
    };
    return statusStringMap[transition.status as string] ?? 0;
  }, [transition]);

  /**
   * 終端ステータス（完了・エラー）かどうか
   * 終端ステータスの場合はステータス変更不可
   */
  const isTerminalStatus = currentStatus === TransitionStatusCode.COMPLETED || currentStatus === TransitionStatusCode.ERROR;

  // 作業中バーのステータス選択状態（デフォルト: 0 = 初期状態）
  const [selectedWorkStatus, setSelectedWorkStatus] = useState<number>(0);

  // ステータスとコメント用の状態
  // 0: 初期状態, 1: 準備中, 2: 準備完了, 3: 実行中, 4: 一時停止, 5: 完了, 6: エラー
  const [selectedStatus, setSelectedStatus] = useState<TransitionStatus>(0);
  const [comment, setComment] = useState('');
  const [progress, setProgress] = useState<number>(0);
  
  // みなし進捗更新用の状態
  // useDeemedProgressProp が false の場合は初期値を false にして常にステータス更新を表示
  const [useDeemedProgress, setUseDeemedProgress] = useState(useDeemedProgressProp);

  // ===== カスタムプロパティ用 state =====
  /** ユーザーが任意追加したカスタムプロパティ一覧（templateId → CustomPropertyValue[]） */
  /** 非カスタム insertion のファイル管理（templateId → (insertionIndex → File|null)） */
  const [insertionFiles, setInsertionFiles] = useState<Record<string, Record<number, File | null>>>({});
  /** 非カスタム insertion の既存URI（templateId → (insertionIndex → uri)）- 復元時にセット */
  const [insertionUris, setInsertionUris] = useState<Record<string, Record<number, string>>>({});

  const [customProperties, setCustomProperties] = useState<Record<string, CustomPropertyValue[]>>({});

  // ===== 不確かさ基準リスト（定性評価選択肢取得用） =====
  const [criteriaList, setCriteriaList] = useState<import('@/services/uncertaintyCriteriaApiService').UncertaintyCriteriaForSelector[]>([]);

  // ===== DB取得した初期ロード値（想定値欄に表示用） =====
  /** フォームに初期セットした値のスナップショット（templateId_propertyKey → 値） */
  const [loadedValues, setLoadedValues] = useState<Record<string, unknown>>({});

  // ===== 定性評価・定量評価 State =====
  /**
   * 定性評価の選択値（templateId → propertyKey → 選択値文字列）
   * 例: { "template_123": { "temperature": "certain" } }
   */
  const [propertyQualitativeEvals, setPropertyQualitativeEvals] =
    useState<Record<string, Record<string, string>>>({});
  /**
   * 定量評価の行リスト（templateId → propertyKey → QuantitativeEval[]）
   * 例: { "template_123": { "temperature": [{ id: "uuid", method: "誤差値", threshold: "5" }] } }
   */
  const [propertyQuantitativeEvals, setPropertyQuantitativeEvals] =
    useState<Record<string, Record<string, import('@/types/experimentWorker').QuantitativeEval[]>>>({});

  /**
   * 全ステータス選択肢（t() を使って多言語化）
   * コンポーネント内で定義することで useLanguage の t() を利用できる
   */
  const allStatusOptions = useMemo((): { value: TransitionStatus; label: string }[] => [
    { value: TransitionStatusCode.INITIAL     as TransitionStatus, label: t('progressStatus.notStarted') },
    { value: TransitionStatusCode.PREPARING   as TransitionStatus, label: t('progressStatus.preparing') },
    { value: TransitionStatusCode.READY       as TransitionStatus, label: t('progressStatus.ready') },
    { value: TransitionStatusCode.IN_PROGRESS as TransitionStatus, label: t('progressStatus.running') },
    { value: TransitionStatusCode.PAUSED      as TransitionStatus, label: t('progressStatus.paused') },
    { value: TransitionStatusCode.COMPLETED   as TransitionStatus, label: t('progressStatus.completed') },
    { value: TransitionStatusCode.ERROR       as TransitionStatus, label: t('progressStatus.error') },
  ], [t]);

  /**
   * 現在のステータスから遷移可能なステータスの選択肢（useMemo でメモ化）
   * ALLOWED_TRANSITIONS に基づいて選択肢をフィルタリングする
   * 終端ステータス（5: 終状態、6: 異常終了）の場合は空配列
   */
  const statusOptions = useMemo(() => {
    const allowedValues = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    return allStatusOptions.filter((opt: { value: TransitionStatus; label: string }) => allowedValues.includes(opt.value as number));
  }, [currentStatus, allStatusOptions]);

  // クライアント判定
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 不確かさ基準リストを取得（ダイアログが開いたときに一度だけ取得）
  useEffect(() => {
    if (!open) return;
    fetchUncertaintyCriteriaForSelector()
      .then((list) => setCriteriaList(list))
      .catch((err) => {
        console.warn('[DataRecordDialog] 不確かさ基準リスト取得失敗（無視します）:', err);
      });
  }, [open]);

  /**
   * プロパティに対応する定性評価の選択肢を取得するヘルパー
   * - prop.uncertaintyKey がある場合: criteriaList から一致する基準の qualitativeOptions を使用
   * - ない場合または見つからない場合:
   *   1. evalType === 'qualitative' かつ isDefault: true の選択肢を持つ基準を優先
   *   2. それも見つからない場合は evalType === 'qualitative' の最初の基準を使用
   * - いずれも見つからない場合: 空配列（ボタン表示なし）
   */
  const getQualOptions = (
    prop: Property
  ): QualitativeOptionApiRow[] => {
    if (prop.uncertaintyKey) {
      // key が一致すればその基準の定性評価選択肢を使用する
      const matched = criteriaList.find((c) => c.key === prop.uncertaintyKey);
      if (matched && matched.qualitativeOptions.length > 0) {
        return matched.qualitativeOptions;
      }
    }
    // 定性評価基準の中からデフォルト選択肢（isDefault: true）を持つものを優先して使用
    const qualitativeCriteriaList = criteriaList.filter(
      (c) => c.evalType === 'qualitative' && c.qualitativeOptions.length > 0
    );
    const defaultCriteria =
      qualitativeCriteriaList.find((c) => c.qualitativeOptions.some((o) => o.isDefault))
      ?? qualitativeCriteriaList[0];
    return defaultCriteria?.qualitativeOptions ?? [];
  };

  // テンプレート一覧のフィルタリング
  // fetchedTemplates（APIから取得・変換済み）を優先し、なければ transition.templates を使用する
  const filteredTemplates = useMemo(() => {
    const source: Template[] =
      fetchedTemplates.length > 0
        ? fetchedTemplates
        : (transition?.templates ?? []);

    let filtered = source;

    // テンプレート名でのあいまい検索
    if (templateSearchText) {
      filtered = filtered.filter((template) =>
        template.name.toLowerCase().includes(templateSearchText.toLowerCase())
      );
    }

    // テンプレート種別での絞り込み
    if (selectedTemplateCategory) {
      filtered = filtered.filter((template) => template.category === selectedTemplateCategory);
    }

    return filtered;
  }, [fetchedTemplates, transition?.templates, templateSearchText, selectedTemplateCategory]);

  // 選択されたテンプレートのみを取得
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return filteredTemplates.find(template => 
      template.templateId === selectedTemplateId
    );
  }, [filteredTemplates, selectedTemplateId]);

  // テンプレート種別のラベル変換
  const getTemplateCategoryLabel = (category: TemplateCategory): string => {
    switch (category) {
      case 'Materials':
        return 'Materials';
      case 'Conditions':
        return 'Conditions';
      case 'Results':
        return 'Results';
      default:
        return category;
    }
  };

  /**
   * TemplateCategory（フロント）→ templateType（API）へのマッピング
   * Materials → material, Conditions → condition, Results → result
   */
  const mapTemplateCategoryToApiType = (
    category: TemplateCategory
  ): 'material' | 'condition' | 'result' => {
    switch (category) {
      case 'Materials':  return 'material';
      case 'Conditions': return 'condition';
      case 'Results':    return 'result';
    }
  };

  // テンプレート種別のタグ色
  const getTemplateCategoryColor = (category: TemplateCategory): string => {
    switch (category) {
      case 'Materials':
        return 'blue';
      case 'Conditions':
        return 'green';
      case 'Results':
        return 'orange';
      default:
        return 'default';
    }
  };

  // ダイアログを開いたときにフォームをリセット＆テンプレート実績データを取得
  useEffect(() => {
    if (open && transition) {
      // Form が DOM に接続される前に resetFields が呼ばれると警告が出るため try/catch で保護
      try { form.resetFields(); } catch { /* form 未接続時は無視 */ }
      setFormData({});
      setDataGrids({});
      // 初期値は現在のトランジションステータスから遷移可能な最初の選択肢を設定
      // 終端ステータスの場合は選択肢がないため 0 のまま
      const allowedValues = ALLOWED_TRANSITIONS[currentStatus] ?? [];
      setSelectedStatus((allowedValues[0] ?? currentStatus) as TransitionStatus);
      setComment('');
      setProgress(0);
      setSelectedTemplateId(null);
      // prop の最新値を state に同期（useState の初期値はマウント時のみ評価されるため毎回同期が必要）
      setUseDeemedProgress(useDeemedProgressProp);
      setFetchedTemplates([]);     // ダイアログオープン時に前回取得分をリセット
      setFetchedTemplateItems([]); // GETレスポンス生データもリセット
      setCustomProperties({});     // カスタムプロパティをリセット
      setInsertionFiles({});       // 非カスタム insertion ファイルをリセット
      setInsertionUris({});        // 非カスタム insertion URI をリセット
      setLoadedValues({});         // DB取得値スナップショットをリセット

      // プロジェクトの状態が編集可能でない場合は「ステータス更新」を折りたたむ
      setStatusUpdateExpanded(isProjectEditable);

      // 各テンプレートのDataGridを初期化（templateのcontentsを参照）
      transition.templates?.forEach((template) => {
        template.contents?.forEach((content) => {
          if (content.type === 'contentDoubleListType') {
            setDataGrids((prev) => ({
              ...prev,
              [`${template.templateId}_${content.key}`]: [[0, 0, 0]],
            }));
          }
        });
      });

      // テンプレート実績データをAPIから取得してフォームの初期値を復元
      // 必須パスパラメータが揃っている場合のみ実行
      if (projectId && methodId && taskNo !== undefined && transition.transitionId) {
        (async () => {
          try {
            setTemplateDataLoading(true);
            const response = await getTemplateData(
              projectId,
              methodId,
              taskNo,
              transition.transitionId
            );

            if (response.success && response.data.templates.length > 0) {
              // ① GETレスポンスの生データをそのまま保持（保存時にdata構造・placeIdを参照するため）
              setFetchedTemplateItems(response.data.templates);

              // ② TemplateDataItem[] → Template[] に変換してサイドバーに表示
              const converted = convertTemplateDataItemsToTemplates(response.data.templates);
              setFetchedTemplates(converted);

              // ② 取得した実績データをフォームフィールドに反映（既存値の復元）
                  const initialValues: Record<string, unknown> = {};
                  for (const item of response.data.templates) {
                    const rawData = item.data as Record<string, unknown>;
                    const rawProperties = rawData.properties as Array<{
                      key: string;
                      xsiType: string;
                      value: unknown;
                      units: string | null;
                    }> | undefined;

                    if (Array.isArray(rawProperties)) {
                      // properties配列形式:
                      // フォールバック形式・保存済み形式（DB保存時に properties 構造のまま保存された場合）
                      // どちらでも統一処理する。value が non-null の場合にフォームへ反映する。
                      for (const p of rawProperties) {
                        const pKey = String(p.key ?? '');
                        const pXsiType = String((p as Record<string, unknown>).xsiType ?? '');

                        if (pXsiType === 'propertyListType') {
                          // ── ネスト子プロパティの value を復元 ──
                          const childProps = (p as Record<string, unknown>).properties as Array<Record<string, unknown>> | undefined;
                          if (Array.isArray(childProps)) {
                            for (const nestedP of childProps) {
                              if ((nestedP as Record<string, unknown>).isCustomProperty === true) continue;
                              const nestedKey = String(nestedP.key ?? '');
                              const nestedVal = nestedP.value;
                              if (nestedVal !== null && nestedVal !== undefined) {
                                const nestedFormKey = `${item.templateId}_${nestedKey}`;
                                const nestedXsiType = String(nestedP.xsiType ?? '');
                                if (nestedXsiType === 'dateType' || nestedXsiType === 'dateTimeType') {
                                  initialValues[nestedFormKey] = dayjs(String(nestedVal));
                                } else {
                                  initialValues[nestedFormKey] = nestedVal;
                                }
                              }
                            }
                          }
                          // ── ネスト子 Content の value を復元 ──
                          const childContents = (p as Record<string, unknown>).contents as Array<Record<string, unknown>> | undefined;
                          if (Array.isArray(childContents)) {
                            for (const nestedC of childContents) {
                              if ((nestedC as Record<string, unknown>).isCustomProperty === true) continue;
                              const nestedCKey = String(nestedC.key ?? '');
                              const nestedCVal = nestedC.value;
                              if (nestedCVal !== null && nestedCVal !== undefined) {
                                const nestedCFormKey = `${item.templateId}_${nestedCKey}`;
                                // ContentRowListInput は string[] を期待する
                                if (Array.isArray(nestedCVal)) {
                                  initialValues[nestedCFormKey] = (nestedCVal as unknown[]).map(String);
                                } else {
                                  initialValues[nestedCFormKey] = [String(nestedCVal)];
                                }
                              }
                            }
                          }
                        } else if (p.value !== null && p.value !== undefined) {
                          const formKey = `${item.templateId}_${pKey}`;
                          // dateType / dateTimeType は dayjs に変換（DatePicker が dayjs オブジェクトを期待するため）
                          if (pXsiType === 'dateType' || pXsiType === 'dateTimeType') {
                            initialValues[formKey] = dayjs(String(p.value));
                          } else {
                            initialValues[formKey] = p.value;
                          }
                        }
                      }

                      // ── トップレベル非カスタム Content の value を復元 ──
                      const rawContentsTop = rawData.contents as Array<Record<string, unknown>> | undefined;
                      if (Array.isArray(rawContentsTop)) {
                        for (const c of rawContentsTop) {
                          if (c.isCustomProperty === true) continue;
                          const cKey = String(c.key ?? '');
                          const cVal = c.value;
                          if (cVal !== null && cVal !== undefined) {
                            const cFormKey = `${item.templateId}_${cKey}`;
                            // ContentRowListInput は string[] を期待する
                            if (Array.isArray(cVal)) {
                              initialValues[cFormKey] = (cVal as unknown[]).map(String);
                            } else {
                              initialValues[cFormKey] = [String(cVal)];
                            }
                          }
                        }
                      }
                    } else if (item.recordedBy !== null) {
                      // 純粋なフラットkey-value形式（将来的な保存形式変更に備えて残す）:
                      // data が { key: value, ... } のフラット形式の場合にフォームへ反映する。
                      for (const [fieldKey, fieldValue] of Object.entries(rawData)) {
                        const formKey = `${item.templateId}_${fieldKey}`;
                        initialValues[formKey] = fieldValue;
                      }
                    }
                  }
              if (Object.keys(initialValues).length > 0) {
                // DB取得値はスナップショットとして保存し想定値欄に表示する。
                // 実績値フォームには初期値をセットしない（作業者が新たに入力するため）。
                setLoadedValues(initialValues);
              }

              // ③ 最初のテンプレートをサイドバーで選択状態にする
              const firstItem = response.data.templates[0];
              if (firstItem) {
                setSelectedTemplateId(firstItem.templateId);
              }

              // ④ カスタムプロパティの復元（templateId ごとに分類）
              // - rawData.properties の isCustomProperty: true なエントリ（property / insertion コンテナ）
              // - rawData.contents の isCustomProperty: true なエントリ（content コンテナ）
              const restoredCustomPropsMap: Record<string, CustomPropertyValue[]> = {};
              for (const item of response.data.templates) {
                const rawData = item.data as Record<string, unknown>;

                // ── properties 配列から property コンテナを復元 ──
                const rawProperties = rawData.properties as Array<Record<string, unknown>> | undefined;
                if (Array.isArray(rawProperties)) {
                  for (const p of rawProperties) {
                    if (p.isCustomProperty !== true) continue;

                    const cpKey = String(p.key ?? '');
                    const xsiType = String(p.xsiType ?? 'stringType');
                    const validTypes: CustomPropertyType[] = [
                      'stringType', 'tokenType', 'stringEnumType',
                      'intType', 'longType', 'shortType', 'byteType',
                      'unsignedIntType', 'unsignedLongType', 'unsignedShortType', 'unsignedByteType',
                      'floatType', 'doubleType', 'decimalType',
                      'booleanType',
                      'dateType', 'dateTimeType',
                      // 文字列型
                      'stringType', 'tokenType', 'stringEnumType',
                      // 整数型
                      'intType', 'longType', 'shortType', 'byteType',
                      'unsignedIntType', 'unsignedLongType', 'unsignedShortType', 'unsignedByteType',
                      // 浮動小数点型
                      'floatType', 'doubleType', 'decimalType',
                      // 真偽値型
                      'booleanType',
                      // 日時型
                      'dateType', 'dateTimeType',
                      // リスト型
                      'stringListType', 'intListType', 'longListType', 'shortListType', 'byteListType',
                      'unsignedIntListType', 'floatListType', 'doubleListType', 'decimalListType',
                      'booleanListType', 'dateTimeListType',
                    ];
                    const customType: CustomPropertyType = validTypes.includes(xsiType as CustomPropertyType)
                      ? (xsiType as CustomPropertyType)
                      : 'stringType';

                    let valueStr: string | null = null;
                    if (p.value !== null && p.value !== undefined) {
                      valueStr = String(p.value);
                    }

                    if (!restoredCustomPropsMap[item.templateId]) {
                      restoredCustomPropsMap[item.templateId] = [];
                    }
                    restoredCustomPropsMap[item.templateId].push({
                      id: `restored_prop_${cpKey}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      key: cpKey,
                      containerType: 'property',
                      customType,
                      value: valueStr,
                      units: String(p.units ?? ''),
                      isCustomProperty: true,
                    });
                  }
                }

                // ── insertions 配列から insertion コンテナを復元 ──
                // MAIML Insertion 型: { uri, hash?: { value? }, format? } ※ key 属性なし
                const rawInsertions = rawData.insertions as Array<Record<string, unknown>> | undefined;
                if (Array.isArray(rawInsertions)) {
                  for (const ins of rawInsertions) {
                    if (ins.isCustomProperty !== true) continue;

                    const uri = String(ins.uri ?? '');
                    // hash は { value? } オブジェクトまたは文字列（後方互換）
                    const hashRaw = ins.hash;
                    const hashStr = hashRaw
                      ? typeof hashRaw === 'object'
                        ? String((hashRaw as Record<string, unknown>).value ?? '')
                        : String(hashRaw)
                      : '';

                    if (!restoredCustomPropsMap[item.templateId]) {
                      restoredCustomPropsMap[item.templateId] = [];
                    }
                    // URI からファイル名部分のみ抽出して value に表示用として格納
                    const displayName = uri.split('/').pop() || uri;
                    restoredCustomPropsMap[item.templateId].push({
                      id: `restored_ins_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      key: '', // insertion に key 属性はない
                      containerType: 'insertion',
                      customType: 'insertion',
                      value: displayName, // ファイル名のみ表示
                      uri,               // 保存時に参照する URI フィールドも設定する
                      hash: hashStr,
                      format: String(ins.format ?? 'application/octet-stream'),
                      units: '',
                      isCustomProperty: true,
                    });
                  }
                }

                // ── contents 配列から content コンテナを復元 ──
                const rawContents = rawData.contents as Array<Record<string, unknown>> | undefined;
                if (Array.isArray(rawContents)) {
                  for (const c of rawContents) {
                    if (c.isCustomProperty !== true) continue;

                    const cpKey = String(c.key ?? '');
                    const xsiType = String(c.xsiType ?? 'contentStringListType');
                    // ContentType の全種別（CustomPropertyType の content 系として扱う）
                    const contentTypeValues: string[] = [
                      'contentStringListType',
                      'contentIntListType',
                      'contentLongListType',
                      'contentShortListType',
                      'contentByteListType',
                      'contentUnsignedIntListType',
                      'contentFloatListType',
                      'contentDoubleListType',
                      'contentDecimalListType',
                      'contentBooleanListType',
                      'contentDateTimeListType',
                    ];
                    const customType: CustomPropertyType = contentTypeValues.includes(xsiType)
                      ? (xsiType as CustomPropertyType)
                      : 'contentStringListType';

                    // value を string[] に変換（各行が1行のスペース区切り値）
                    // DB保存形式: 行区切りは \n、列区切りはスペース
                    let valueArr: string[] | null = null;
                    if (Array.isArray(c.value)) {
                      // 配列形式の場合はそのまま文字列化（各要素1行）
                      valueArr = (c.value as unknown[]).map(String);
                    } else if (typeof c.value === 'string' && c.value !== '') {
                      // 改行区切り文字列 → 行配列
                      valueArr = c.value.split('\n');
                    } else if (c.value !== null && c.value !== undefined) {
                      valueArr = [String(c.value)];
                    }

                    if (!restoredCustomPropsMap[item.templateId]) {
                      restoredCustomPropsMap[item.templateId] = [];
                    }
                    restoredCustomPropsMap[item.templateId].push({
                      id: `restored_content_${cpKey}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      key: cpKey,
                      containerType: 'content',
                      customType,
                      value: valueArr,
                      units: String(c.units ?? ''),
                      isCustomProperty: true,
                    });
                  }
                }
              }
              if (Object.keys(restoredCustomPropsMap).length > 0) {
                setCustomProperties(restoredCustomPropsMap);
              }

              // ⑤ 非カスタム insertion の既存URI を insertionUris ステートに復元
              // convertTemplateDataItemsToTemplates で InsertionField[] を構築済みだが、
              // ファイル選択ボタン表示・クリアボタン表示のために uri を ステートに持つ必要がある
              const restoredInsertionUrisMap: Record<string, Record<number, string>> = {};
              for (const tpl of converted) {
                if (!tpl.insertions || tpl.insertions.length === 0) continue;
                restoredInsertionUrisMap[tpl.templateId] = {};
                tpl.insertions.forEach((ins, insIdx) => {
                  if (ins.uri) {
                    restoredInsertionUrisMap[tpl.templateId][insIdx] = ins.uri;
                  }
                });
              }
              if (Object.keys(restoredInsertionUrisMap).length > 0) {
                setInsertionUris(restoredInsertionUrisMap);
              }
            }
          } catch (error) {
            // 実績データ取得失敗は非致命的（初回記録時は404になる）
            // エラーメッセージは表示しない（フォームは空の状態で開く）
            console.warn('Failed to fetch template data (expected on first record):', error);
          } finally {
            setTemplateDataLoading(false);
          }
        })();
      }
    }
  }, [open, transition, form, isProjectEditable, projectId, methodId, taskNo, useDeemedProgressProp]);

  // テンプレート保存ハンドラ
  const handleSaveTemplate = async () => {
    if (!selectedTemplate) {
      message.error(t('format.dataRecordDialog.noTemplateSelected'));
      return;
    }

    // APIに必要なパスパラメータのガードチェック
    if (!projectId || !methodId || taskNo === undefined) {
      message.error(t('format.dataRecordDialog.missingProjectInfoForSave'));
      console.error('handleSaveTemplate: projectId / methodId / taskNo not set', {
        projectId,
        methodId,
        taskNo,
      });
      return;
    }

    // ── Key重複チェック ───────────────────────────────────────────────────
    // 選択中テンプレートのカスタムプロパティに重複Keyがある場合は保存を中断する
    if (duplicateCustomKeys.size > 0) {
      const duplicatedList = Array.from(duplicateCustomKeys).join(', ');
      message.error(t('format.dataRecordDialog.duplicateCustomPropertyKeys', { keys: duplicatedList }));
      return;
    }

    try {
      setLoading(true);
      const values = await form.validateFields();

      const template = selectedTemplate;

      // ── GETで取得した生データを参照 ──────────────────────────────────────
      // fetchedTemplateItems から templateId に一致するオリジナルアイテムを検索する。
      // これにより placeId の正確な値と、バックエンドが期待する data 構造を取得する。
      const originalItem = fetchedTemplateItems.find(
        (item) => item.templateId === template.templateId
      );

      // ── data 組み立て ────────────────────────────────────────────────────
      // オリジナルの data をディープコピーしてベースとし、
      // フォームで変更された値のみ上書きする（構造を破壊しない）。
      const baseData: Record<string, unknown> = originalItem
        ? JSON.parse(JSON.stringify(originalItem.data))
        : {};

      if (
        baseData.properties &&
        Array.isArray(baseData.properties)
      ) {
        // フォールバック形式: { templateId, templateType, properties: [{ key, xsiType, value, units }] }
        // properties[i].value をフォーム値で上書きする
        (
          baseData.properties as Array<Record<string, unknown>>
        ).forEach((p) => {
          if (p.isCustomProperty === true) return; // カスタムプロパティはスキップ（削除済みのエントリに value: null を書かないため）
          const formKey = `${template.templateId}_${String(p.key ?? '')}`;
          const xsiType = String(p.xsiType ?? '');
          if (xsiType === 'dateType') {
            const v = values[formKey];
            p.value = v ? dayjs(v).format('YYYY-MM-DD') : null;
          } else if (xsiType === 'dateTimeType') {
            const v = values[formKey];
            p.value = v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : null;
          } else if (xsiType === 'contentDoubleListType') {
            p.value = dataGrids[formKey] ?? null;
          } else if (xsiType === 'propertyListType') {
            // ── ネスト子プロパティ（properties 配列）の value を更新 ──
            if (Array.isArray(p.properties)) {
              (p.properties as Array<Record<string, unknown>>).forEach((nestedP) => {
                const nestedFormKey = `${template.templateId}_${String(nestedP.key ?? '')}`;
                const nestedXsiType = String(nestedP.xsiType ?? '');
                if (nestedXsiType === 'dateType') {
                  const v = values[nestedFormKey];
                  nestedP.value = v ? dayjs(v).format('YYYY-MM-DD') : null;
                } else if (nestedXsiType === 'dateTimeType') {
                  const v = values[nestedFormKey];
                  nestedP.value = v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : null;
                } else {
                  nestedP.value = values[nestedFormKey] ?? null;
                }
              });
            }
            // ── ネスト子 Content（contents 配列）の value を更新 ──
            if (Array.isArray(p.contents)) {
              (p.contents as Array<Record<string, unknown>>).forEach((nestedC) => {
                const nestedFormKey = `${template.templateId}_${String(nestedC.key ?? '')}`;
                nestedC.value = values[nestedFormKey] ?? null;
              });
            }
          } else {
            p.value = values[formKey] ?? null;
          }
        });
      } else {
        // DB実績形式: フラットなkey-value
        // baseData[prop.key] をフォーム値で上書きする
        template.properties.forEach((prop) => {
          const formKey = `${template.templateId}_${prop.key}`;
          if (prop.type === 'propertyListType') {
            baseData[prop.key] = dataGrids[formKey] ?? [[0, 0, 0]];
          } else if (prop.type === 'dateType' || prop.type === 'dateTimeType') {
            const v = values[formKey];
            baseData[prop.key] = v
              ? dayjs(v).format(
                  prop.type === 'dateType' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss'
                )
              : null;
          } else {
            baseData[prop.key] = values[formKey] ?? null;
          }
        });
      }

      // ── トップレベル Contents（baseData.contents 配列）の value を更新 ──
      if (Array.isArray(baseData.contents)) {
        (baseData.contents as Array<Record<string, unknown>>).forEach((c) => {
          if (c.isCustomProperty === true) return;
          const contentKey = String(c.key ?? '');
          if (!contentKey) return;
          const formKey = `${template.templateId}_${contentKey}`;
          const rawVal = values[formKey];
          // ContentRowListInput は string[] を返す
          if (Array.isArray(rawVal)) {
            c.value = rawVal as string[];
          }
        });
      }

      // ── 非カスタム insertion（テンプレート定義）のファイルをS3にアップロード ──
      // insertionFiles[template.templateId][insIdx] に File が存在する場合のみアップロードする
      const tplInsertionFiles = insertionFiles[template.templateId] ?? {};
      const nonCustomInsertionUriMap: Record<number, string> = {}; // insIdx → s3Key
      for (const [insIdxStr, file] of Object.entries(tplInsertionFiles)) {
        const insIdx = Number(insIdxStr);
        if (!file) continue;
        try {
          const result = await uploadFiles({
            uploadMode: 'single',
            targetPath: `projects/${projectName}/attachments`,
            files: [file],
          });
          const uploadedFile = result.files[0];
          if (uploadedFile?.s3Key) {
            nonCustomInsertionUriMap[insIdx] = uploadedFile.s3Key;
          }
        } catch (uploadErr) {
          console.error(`非カスタム insertion ファイルアップロード失敗 (insIdx=${insIdx}):`, uploadErr);
          message.error(t('dataRecordDialog.attachmentUploadError', { number: String(insIdx + 1) }));
          return;
        }
      }

      // ── 非カスタム insertion の URI を baseData.insertions に反映 ──
      // baseData.insertions が配列として存在する場合（フォールバック形式）のみ処理する
      if (Array.isArray(baseData.insertions)) {
        const nonCustomInsertions = (baseData.insertions as Array<Record<string, unknown>>).filter(
          (ins) => !ins.isCustomProperty
        );
        nonCustomInsertions.forEach((ins, insIdx) => {
          // 新規アップロード済みの s3Key があれば上書き
          if (nonCustomInsertionUriMap[insIdx]) {
            ins.uri = nonCustomInsertionUriMap[insIdx];
          } else {
            // クリア操作 (insertionUris[tplId][insIdx] === '') の場合は uri を空文字に
            const currentUri = insertionUris[template.templateId]?.[insIdx];
            if (currentUri !== undefined) {
              ins.uri = currentUri;
            }
          }
        });
      }

      // ── insertion カスタムプロパティのファイルをS3にアップロード ────────
      // cp.file が存在する行（新規選択ファイル）のみアップロードを実行し、
      // 返却された s3Key を uri として CustomPropertyValue に反映する。
      const templateCustomProps = customProperties[template.templateId] ?? [];
      const uploadedUriMap: Record<string, string> = {}; // id → s3Key
      for (const cp of templateCustomProps) {
        if (cp.containerType === 'insertion' && cp.file) {
            try {
              const result = await uploadFiles({
                uploadMode: 'single',
                targetPath: `projects/${projectName}/attachments`,
                files: [cp.file],
              });
              const uploadedFile = result.files[0];
              if (uploadedFile?.s3Key) {
                uploadedUriMap[cp.id] = uploadedFile.s3Key;
                // アップロード後、customProperties の uri を s3Key で更新する
                handleUpdateCustomProperty(template.templateId, cp.id, { uri: uploadedFile.s3Key, file: undefined });
              }
            } catch (uploadErr) {
            console.error(`insertion ファイルアップロード失敗 (key=${cp.key}):`, uploadErr);
            message.error(t('dataRecordDialog.fileUploadError', { key: String(cp.key || cp.value) }));
            return; // アップロード失敗時は保存中断
          }
        }
      }

      // ── カスタムプロパティを baseData に追記 ────────────────────────────
      // 選択中テンプレートに紐づくカスタムプロパティのみ対象とする
      // ※ baseData.properties の有無に関わらず（Property なしテンプレートも含む）処理を実行する
      if (templateCustomProps.length > 0) {
        // カスタムプロパティあり: クリーンアップ＋再追記
        if (Array.isArray(baseData.properties)) {
          baseData.properties = (baseData.properties as Array<Record<string, unknown>>).filter(
            (p) => !p.isCustomProperty
          );
        } else {
          baseData.properties = [];
        }
        if (Array.isArray(baseData.contents)) {
          baseData.contents = (baseData.contents as Array<Record<string, unknown>>).filter(
            (c) => !c.isCustomProperty
          );
        } else {
          baseData.contents = [];
        }
        if (Array.isArray(baseData.insertions)) {
          baseData.insertions = (baseData.insertions as Array<Record<string, unknown>>).filter(
            (ins) => !ins.isCustomProperty
          );
        } else {
          baseData.insertions = [];
        }

        const existingProps = baseData.properties as Array<Record<string, unknown>>;
        const existingContents = baseData.contents as Array<Record<string, unknown>>;
        const existingInsertions = baseData.insertions as Array<Record<string, unknown>>;
        for (const cp of templateCustomProps) {
          // insertion は key 属性を持たないため、key チェックは property/content のみに適用する
          if (!cp.key && cp.containerType !== 'insertion') continue;
          if (cp.containerType === 'content') {
              // content コンテナは baseData.contents に追記（リセット済みなので push のみ）
              // value は string[]（各行がスペース区切り値）をそのまま渡す
              const rowsValue: string[] = Array.isArray(cp.value)
                ? (cp.value as string[])
                : cp.value ? [cp.value as string] : [];
              const contentEntry: Record<string, unknown> = {
                key: cp.key,
                xsiType: cp.customType,
                value: rowsValue,
                units: cp.units || null,
                isCustomProperty: true,
              };
              existingContents.push(contentEntry);
            } else if (cp.containerType === 'insertion') {
              // insertion コンテナは baseData.insertions に追記
              // MAIML Insertion 型: { uri, hash?: { value? }, format?, isCustomProperty }
              // ※ insertion タグに key 属性はないため key は保持しない
              // 優先順位: 今回アップロード済み s3Key → cp.uri（既存URI） → cp.value（フォールバック）
              const uri = uploadedUriMap[cp.id] ?? cp.uri ?? cp.value ?? '';
              if (!uri) continue; // uri が空の場合はスキップ
              const insertionEntry: Record<string, unknown> = {
                uri,
                hash: cp.hash ? { value: cp.hash } : undefined,
                format: cp.format ?? 'application/octet-stream',
                isCustomProperty: true,
              };
              existingInsertions.push(insertionEntry);
            } else {
              // property コンテナは baseData.properties に追記（リセット済みなので push のみ）
              const cpEntry: Record<string, unknown> = {
                key: cp.key,
                xsiType: cp.customType,
                units: cp.units || null,
                isCustomProperty: true,
              };
              const strVal = typeof cp.value === 'string' ? cp.value : null;
              if (cp.customType === 'intType') {
                cpEntry.value = strVal !== null ? parseInt(strVal, 10) : null;
              } else if (cp.customType === 'floatType') {
                cpEntry.value = strVal !== null ? parseFloat(strVal) : null;
              } else if (cp.customType === 'booleanType') {
                cpEntry.value = strVal === 'true';
              } else {
                cpEntry.value = strVal;
              }
              existingProps.push(cpEntry);
            }
          }
      } else {
        // カスタムプロパティなし: クリーンアップのみ（削除を確定させる）
        if (Array.isArray(baseData.properties)) {
          baseData.properties = (baseData.properties as Array<Record<string, unknown>>).filter(
            (p) => !p.isCustomProperty
          );
        }
        if (Array.isArray(baseData.contents)) {
          baseData.contents = (baseData.contents as Array<Record<string, unknown>>).filter(
            (c) => !c.isCustomProperty
          );
        }
        if (Array.isArray(baseData.insertions)) {
          baseData.insertions = (baseData.insertions as Array<Record<string, unknown>>).filter(
            (ins) => !ins.isCustomProperty
          );
        }
      }

      // ── APIリクエスト用レコードを構築 ─────────────────────────────────────
      // placeId は GETレスポンスの TemplateDataItem.placeId を使用する。
      // （DB一意キー: organization_id + project_id + method_id + task_no + place_id）
      const record: ExperimentDataRecord = {
        placeId: originalItem?.placeId ?? template.templateId,
        templateType: mapTemplateCategoryToApiType(template.category),
        templateId: template.templateId,
        data: baseData,
        status: selectedStatus,
        comment: comment || undefined,
      };

      // バックエンドAPIへ保存
      await saveBatchExperimentData(projectId!, methodId, taskNo, { records: [record] });

      // onSave には保存した data を ExperimentDataValue 形式で渡す
      onSave([baseData as ExperimentDataValue]);
      message.success(
        t('format.dataRecordDialog.saveSuccess', { name: template.name, status: statusOptions.find((opt) => opt.value === selectedStatus)?.label ?? '' })
      );
    } catch (error: unknown) {
      console.error('handleSaveTemplate error:', error);
      // axios エラーの場合はサーバーメッセージを優先表示
      const axiosError = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const serverMessage = axiosError?.response?.data?.error?.message;
      if (serverMessage) {
        message.error(t('format.dataRecordDialog.saveFailed', { message: serverMessage }));
      } else if (axiosError?.message) {
        message.error(t('format.dataRecordDialog.saveFailed', { message: axiosError.message }));
      } else {
        message.error(t('format.dataRecordDialog.saveFailedUnknown'));
      }
    } finally {
      setLoading(false);
    }
  };

  // DataGrid更新ハンドラ
  const handleDataGridChange = (
    key: string,
    rowIndex: number,
    colIndex: number,
    value: number | null
  ) => {
    setDataGrids((prev) => {
      const currentGrid = prev[key] || [[0, 0, 0]];
      const newGrid = [...currentGrid];
      if (!newGrid[rowIndex]) {
        newGrid[rowIndex] = [];
      }
      newGrid[rowIndex][colIndex] = value ?? 0;
      return { ...prev, [key]: newGrid };
    });
  };

  // DataGrid行追加
  const handleAddRow = (key: string) => {
    setDataGrids((prev) => {
      const currentGrid = prev[key] || [[0, 0, 0]];
      const colCount = currentGrid[0]?.length || 3;
      const newRow = Array(colCount).fill(0);
      return { ...prev, [key]: [...currentGrid, newRow] };
    });
  };

  // DataGrid列追加
  const handleAddColumn = (key: string) => {
    setDataGrids((prev) => {
      const currentGrid = prev[key] || [[0, 0, 0]];
      const newGrid = currentGrid.map((row) => [...row, 0]);
      return { ...prev, [key]: newGrid };
    });
  };

  // DataGrid行削除
  const handleDeleteRow = (key: string, rowIndex: number) => {
    setDataGrids((prev) => {
      const currentGrid = prev[key] || [[0, 0, 0]];
      if (currentGrid.length <= 1) return prev;
      const newGrid = currentGrid.filter((_, idx) => idx !== rowIndex);
      return { ...prev, [key]: newGrid };
    });
  };

  // DataGrid列削除
  const handleDeleteColumn = (key: string, colIndex: number) => {
    setDataGrids((prev) => {
      const currentGrid = prev[key] || [[0, 0, 0]];
      if (currentGrid[0]?.length <= 1) return prev;
      const newGrid = currentGrid.map((row) => row.filter((_, idx) => idx !== colIndex));
      return { ...prev, [key]: newGrid };
    });
  };

  // プロパティタイプ別の入力コンポーネント生成
  const renderPropertyInput = (property: Property, templateId: string) => {
    const key = `${templateId}_${property.key}`;
    const label = (
      <>
        {property.label}
        {property.units && (
          <Tag color="blue" style={{ marginLeft: 8 }}>
            {property.units}
          </Tag>
        )}
        {property.scaleFactor && (
          <Tag color="purple" style={{ marginLeft: 4, fontSize: 11 }}>
            ×{property.scaleFactor}
          </Tag>
        )}
      </>
    );

    // description があれば extra として表示するヘルパー
    const descriptionExtra = property.description ? (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {property.description}
      </Text>
    ) : undefined;

    // formatString から InputNumber の precision を算出（例: "%.3f" → 3）
    const precisionFromFormat = (() => {
      if (!property.formatString) return undefined;
      const match = property.formatString.match(/\.(\d+)f/);
      return match ? parseInt(match[1], 10) : undefined;
    })();


    // ✅ Phase 3: xsi:type ベースのバリデーションルール
    // InputNumber / DatePicker 等の UI 制約と併用することで二重チェックとなる
    const buildTypeRule = (xsiType: string) => ({
      validator: (_: unknown, value: unknown) => {
        if (value === undefined || value === null || value === '') return Promise.resolve();
        const strValue = String(value);
        const result = validateByXsiType(xsiType, strValue);
        return result.isValid
          ? Promise.resolve()
          : Promise.reject(new Error(result.errorMessage));
      },
    });

    const rules: import('antd').FormRule[] = [
      {
        required: property.required,
        message: `${property.label}は必須項目です`,
      },
    ];

    // 整数型・浮動小数点型は UI 制約（InputNumber）と併せてバリデーションルールも追加
    const INT_TYPES: PropertyType[] = [
      'intType', 'longType', 'shortType', 'byteType',
      'unsignedIntType', 'unsignedLongType', 'unsignedShortType', 'unsignedByteType',
    ];
    const FLOAT_TYPES: PropertyType[] = ['floatType', 'doubleType', 'decimalType'];
    const LIST_TYPES: PropertyType[] = [
      'stringListType', 'intListType', 'longListType', 'shortListType', 'byteListType',
      'unsignedIntListType', 'floatListType', 'doubleListType', 'decimalListType',
      'booleanListType', 'dateTimeListType',
    ];

    if (INT_TYPES.includes(property.type) || FLOAT_TYPES.includes(property.type)) {
      rules.push(buildTypeRule(property.type));
    }

    switch (property.type) {
      case 'stringType':
      case 'tokenType':
      case 'stringEnumType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            extra={descriptionExtra}
            rules={rules}
          >
            <TextArea
              rows={3}
              placeholder={`${property.label}を入力`}
              disabled={!isProjectEditable}
            />
          </Form.Item>
        );

      case 'intType':
      case 'longType':
      case 'shortType':
      case 'byteType':
      case 'unsignedIntType':
      case 'unsignedLongType':
      case 'unsignedShortType':
      case 'unsignedByteType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            extra={descriptionExtra}
            rules={rules}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder={`${property.label}を入力`}
              min={property.min}
              max={property.max}
              step={1}
              precision={0}
              disabled={!isProjectEditable}
            />
          </Form.Item>
        );

      case 'floatType':
      case 'doubleType':
      case 'decimalType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            extra={descriptionExtra}
            rules={rules}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder={`${property.label}を入力`}
              min={property.min}
              max={property.max}
              step={precisionFromFormat !== undefined ? Math.pow(10, -precisionFromFormat) : 0.0001}
              precision={precisionFromFormat ?? 4}
              disabled={!isProjectEditable}
            />
          </Form.Item>
        );

      case 'stringListType':
      case 'intListType':
      case 'longListType':
      case 'shortListType':
      case 'byteListType':
      case 'unsignedIntListType':
      case 'floatListType':
      case 'doubleListType':
      case 'decimalListType':
      case 'booleanListType':
      case 'dateTimeListType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            extra={descriptionExtra}
            rules={rules}
          >
            <TextArea
              rows={3}
              placeholder={`値をスペース区切りで入力（例: 1.0 2.5 3.0）`}
              disabled={!isProjectEditable}
            />
          </Form.Item>
        );

      case 'booleanType':
        return (
          <Form.Item
            key={key}
            name={key}
            extra={descriptionExtra}
            valuePropName="checked"
          >
            <Checkbox disabled={!isProjectEditable}>{property.label}</Checkbox>
          </Form.Item>
        );

      case 'dateType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            extra={descriptionExtra}
            rules={rules}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder={`${property.label}を選択`}
              disabled={!isProjectEditable}
            />
          </Form.Item>
        );

      case 'dateTimeType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            extra={descriptionExtra}
            rules={rules}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              format="YYYY-MM-DD HH:mm:ss"
              placeholder={`${property.label}を選択`}
              disabled={!isProjectEditable}
            />
          </Form.Item>
        );

      case 'propertyListType':
        return renderNestedProperties(property, templateId);

      case 'insertion':
        return renderFileUpload(property, key);

      default:
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            extra={descriptionExtra}
            rules={rules}
          >
            <Input placeholder={`${property.label}を入力`} disabled={!isProjectEditable} />
          </Form.Item>
        );
    }

  };

  // DataGrid表示
  const renderDataGrid = (property: Property, key: string) => {
    const grid = dataGrids[key] || [[0, 0, 0]];

    const columns = grid[0]?.map((_, colIndex) => ({
      title: (
        <Space>
          列 {colIndex + 1}
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteColumn(key, colIndex)}
            disabled={!isProjectEditable || grid[0].length <= 1}
          />
        </Space>
      ),
      dataIndex: `col_${colIndex}`,
      key: `col_${colIndex}`,
      width: 120,
      render: (_: unknown, record: unknown, rowIndex: number) => (
        <InputNumber
          value={grid[rowIndex][colIndex]}
          onChange={(value) => handleDataGridChange(key, rowIndex, colIndex, value)}
          step={0.01}
          style={{ width: '100%' }}
          disabled={!isProjectEditable}
        />
      ),
    })) || [];

    const dataSource = grid.map((row, rowIndex) => ({
      key: rowIndex,
      rowIndex: rowIndex + 1,
      ...Object.fromEntries(
        row.map((_, colIndex) => [`col_${colIndex}`, row[colIndex]])
      ),
    }));

    return (
      <div key={key} style={{ marginBottom: 24 }}>
        <Space orientation="vertical" style={{ width: '100%' }} size="small">
          <Space>
            <Text strong>
              {property.label}
              {property.required && <span style={{ color: 'red' }}> *</span>}
            </Text>
            {property.units && <Tag color="blue">{property.units}</Tag>}
          </Space>

          <Table
            size="small"
            columns={[
              {
                title: '#',
                dataIndex: 'rowIndex',
                key: 'rowIndex',
                width: 80,
                render: (text: number, _: unknown, index: number) => (
                  <Space>
                    {text}
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteRow(key, index)}
                      disabled={!isProjectEditable || grid.length <= 1}
                    />
                  </Space>
                ),
              },
              ...columns,
            ]}
            dataSource={dataSource}
            pagination={false}
            bordered
          />

          <Space>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAddRow(key)}
              disabled={!isProjectEditable}
            >
              行を追加
            </Button>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAddColumn(key)}
              disabled={!isProjectEditable}
            >
              列を追加
            </Button>
          </Space>
        </Space>
      </div>
    );
  };

  /**
   * Content フィールド（ContentField）を 1 件描画する
   * - contentDoubleListType: DataGrid 表示
   * - それ以外: スペース区切りテキストエリア
   */
  const renderContentField = (content: ContentField, templateId: string) => {
    const key = `${templateId}_${content.key}`;
    const label = (
      <>
        {content.label}
        {content.units && (
          <Tag color="cyan" style={{ marginLeft: 8 }}>
            {content.units}
          </Tag>
        )}
        {content.axis && (
          <Tag color="geekblue" style={{ marginLeft: 4, fontSize: 11 }}>
            axis: {content.axis}
          </Tag>
        )}
      </>
    );
    const descriptionExtra = content.description ? (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {content.description}
      </Text>
    ) : undefined;

    // 全 Content 型共通: 行追加可能なリスト（各行がスペース区切りの列値）
    return (
      <Form.Item
        key={key}
        name={key}
        label={label}
        extra={descriptionExtra}
      >
        <ContentRowListInput disabled={!isProjectEditable} />
      </Form.Item>
    );
  };

  // ネストされたプロパティ（propertyListType）を描画する
  // 子 Property（nestedProperties）と子 Content（contents）の両方を表示する
  const renderNestedProperties = (property: Property, templateId: string) => {
    const hasChildren =
      (property.nestedProperties?.length ?? 0) > 0 ||
      (property.contents?.length ?? 0) > 0;

    return (
      <div
        key={`${templateId}_${property.key}`}
        style={{
          marginBottom: 24,
          paddingLeft: 16,
          borderLeft: '3px solid #e0e0e0',
        }}
      >
        <Title level={5} style={{ marginBottom: 16 }}>
          {property.label}
          {property.units && (
            <Tag color="blue" style={{ marginLeft: 8, fontWeight: 'normal', fontSize: 12 }}>
              {property.units}
            </Tag>
          )}
        </Title>

        {!hasChildren && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            子要素がありません
          </Text>
        )}

        {/* 子 Property */}
        {property.nestedProperties?.map((nestedProp) => (
          <Row key={nestedProp.key} gutter={16}>
            <Col span={nestedProp.type === 'propertyListType' ? 24 : 12}>
              {renderPropertyInput(nestedProp, templateId)}
            </Col>
          </Row>
        ))}

        {/* 子 Content */}
        {(property.contents?.length ?? 0) > 0 && (
          <div style={{ marginTop: property.nestedProperties?.length ? 8 : 0 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              Content フィールド
            </Text>
            <Row gutter={16}>
              {property.contents!.map((content) => (
                <Col key={content.key} span={24}>
                  {renderContentField(content, templateId)}
                </Col>
              ))}
            </Row>
          </div>
        )}
      </div>
    );
  };

  // ファイルアップロード
  const renderFileUpload = (property: Property, key: string) => {
    return (
      <Form.Item
        key={key}
        name={key}
        label={property.label}
        rules={[
          {
            required: property.required,
            message: `${property.label}は必須項目です`,
          },
        ]}
      >
        <Upload
          maxCount={1}
          beforeUpload={() => {
            // TODO: S3アップロード処理を実装
            return false;
          }}
          disabled={!isProjectEditable}
        >
          <Button icon={<UploadOutlined />} disabled={!isProjectEditable}>ファイルを選択</Button>
        </Upload>
      </Form.Item>
    );
  };

  // ===== カスタムプロパティ操作ハンドラー =====

  /** 新しいカスタムプロパティ行を追加する（選択中テンプレートに紐づける） */
  const handleAddCustomProperty = (containerType: ContainerType) => {
    if (!selectedTemplateId) return;
    const defaultType: CustomPropertyType =
      containerType === 'insertion'
        ? 'insertion'
        : containerType === 'content'
        ? 'stringListType'
        : 'stringType';
    const newItem: CustomPropertyValue = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      key: '',
      containerType,
      customType: defaultType,
      value: null,
      units: '',
      isCustomProperty: true,
    };
    setCustomProperties((prev) => ({
      ...prev,
      [selectedTemplateId]: [...(prev[selectedTemplateId] ?? []), newItem],
    }));
  };

  /** カスタムプロパティの特定フィールドを更新する */
  const handleUpdateCustomProperty = (
    templateId: string,
    id: string,
    patch: Partial<Omit<CustomPropertyValue, 'id' | 'isCustomProperty'>>
  ) => {
    setCustomProperties((prev) => ({
      ...prev,
      [templateId]: (prev[templateId] ?? []).map((p: CustomPropertyValue) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    }));
  };

  /** カスタムプロパティを削除する */
  const handleRemoveCustomProperty = (templateId: string, id: string) => {
    setCustomProperties((prev) => ({
      ...prev,
      [templateId]: (prev[templateId] ?? []).filter((p: CustomPropertyValue) => p.id !== id),
    }));
  };

  /** insertion 行: ファイル選択時の処理（SHA256ハッシュ生成・MIMEタイプ検出） */
  const handleInsertionFileSelect = async (templateId: string, id: string, file: File) => {
    try {
      const format = file.type || 'application/octet-stream';
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      handleUpdateCustomProperty(templateId, id, { file, hash, format, value: file.name });
    } catch (err) {
      message.error(t('format.dataRecordDialog.fileProcessingFailed'));
      console.error('handleInsertionFileSelect error:', err);
    }
  };

  /**
   * 選択中テンプレートにおけるカスタムプロパティのKey重複セットを計算する
   * - テンプレート固定プロパティのKeyとの重複も検出する
   * - insertion コンテナ（key なし）はチェック対象外
   */
  const duplicateCustomKeys = useMemo((): Set<string> => {
    if (!selectedTemplateId) return new Set();
    const list = customProperties[selectedTemplateId] ?? [];

    // 固定プロパティのKey一覧
    const fixedKeys = new Set(
      (selectedTemplate?.properties ?? []).map((p) => p.key)
    );

    // カスタムプロパティのKey一覧（insertion 除外・空文字除外）
    const customKeys = list
      .filter((cp) => cp.containerType !== 'insertion' && cp.key.trim() !== '')
      .map((cp) => cp.key.trim());

    // 全Keyをまとめてカウント
    const countMap = new Map<string, number>();
    for (const k of customKeys) {
      countMap.set(k, (countMap.get(k) ?? 0) + 1);
    }

    const duplicates = new Set<string>();

    // カスタム同士で2回以上現れるKey
    for (const [k, count] of countMap.entries()) {
      if (count > 1) duplicates.add(k);
    }

    // 固定プロパティのKeyと被っているカスタムKey
    for (const k of customKeys) {
      if (fixedKeys.has(k)) duplicates.add(k);
    }

    return duplicates;
  }, [selectedTemplateId, customProperties, selectedTemplate]);

  /** カスタムプロパティ一覧をレンダリングする（選択中テンプレートのものだけ表示） */
  const renderCustomPropertyRows = () => {
    if (!selectedTemplateId) return null;
    const list = customProperties[selectedTemplateId] ?? [];
    if (list.length === 0) return null;

    return list.map((cp) => {
      const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 8,
        padding: '8px',
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusSM,
        border: `1px solid ${token.colorBorder}`,
      };

      // このカスタムプロパティのKeyが重複しているかどうか
      const isKeyDuplicate =
        cp.containerType !== 'insertion' &&
        cp.key.trim() !== '' &&
        duplicateCustomKeys.has(cp.key.trim());

      // キー名入力（共通）
      const keyInput = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Input
            placeholder="キー名"
            value={cp.key}
            onChange={(e) => handleUpdateCustomProperty(selectedTemplateId, cp.id, { key: e.target.value })}
            style={{
              width: 130,
              borderColor: isKeyDuplicate ? '#ff4d4f' : undefined,
              boxShadow: isKeyDuplicate ? '0 0 0 2px rgba(255,77,79,0.2)' : undefined,
            }}
            size="small"
            status={isKeyDuplicate ? 'error' : undefined}
          />
          {isKeyDuplicate && (
            <Text type="danger" style={{ fontSize: 10, lineHeight: 1.2 }}>
              Keyが重複しています
            </Text>
          )}
        </div>
      );

      // 削除ボタン（共通）
      const deleteBtn = (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveCustomProperty(selectedTemplateId, cp.id)}
          style={{ flexShrink: 0 }}
        />
      );

      if (cp.containerType === 'insertion') {
        return (
          <div key={cp.id} style={rowStyle}>
            <Tag color="purple" style={{ flexShrink: 0, alignSelf: 'center' }}>insertion</Tag>
            <Upload
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => {
                handleInsertionFileSelect(selectedTemplateId, cp.id, file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} size="small">
                {cp.value ? cp.value : 'Select File'}
              </Button>
            </Upload>
            {cp.value && (
              <Text type="secondary" style={{ fontSize: 11, alignSelf: 'center' }} ellipsis>
                {cp.value}
              </Text>
            )}
            {deleteBtn}
          </div>
        );
      }

      // property / content 共通の型セレクト
      const isContentType = cp.containerType === 'content';
      const typeOptions: { label: string; value: CustomPropertyType }[] =
        cp.containerType === 'property'
          ? [
              { label: 'stringType',         value: 'stringType' },
              { label: 'tokenType',           value: 'tokenType' as CustomPropertyType },
              { label: 'stringEnumType',      value: 'stringEnumType' as CustomPropertyType },
              { label: 'intType',             value: 'intType' },
              { label: 'longType',            value: 'longType' as CustomPropertyType },
              { label: 'shortType',           value: 'shortType' as CustomPropertyType },
              { label: 'byteType',            value: 'byteType' as CustomPropertyType },
              { label: 'unsignedIntType',     value: 'unsignedIntType' as CustomPropertyType },
              { label: 'unsignedLongType',    value: 'unsignedLongType' as CustomPropertyType },
              { label: 'unsignedShortType',   value: 'unsignedShortType' as CustomPropertyType },
              { label: 'unsignedByteType',    value: 'unsignedByteType' as CustomPropertyType },
              { label: 'floatType',           value: 'floatType' },
              { label: 'doubleType',          value: 'doubleType' as CustomPropertyType },
              { label: 'decimalType',         value: 'decimalType' as CustomPropertyType },
              { label: 'booleanType',         value: 'booleanType' },
              { label: 'dateType',            value: 'dateType' },
              { label: 'dateTimeType',        value: 'dateTimeType' },
              { label: 'stringListType',      value: 'stringListType' },
              { label: 'intListType',         value: 'intListType' },
              { label: 'longListType',        value: 'longListType' as CustomPropertyType },
              { label: 'shortListType',       value: 'shortListType' as CustomPropertyType },
              { label: 'byteListType',        value: 'byteListType' as CustomPropertyType },
              { label: 'unsignedIntListType', value: 'unsignedIntListType' as CustomPropertyType },
              { label: 'floatListType',       value: 'floatListType' as CustomPropertyType },
              { label: 'doubleListType',      value: 'doubleListType' },
              { label: 'decimalListType',     value: 'decimalListType' as CustomPropertyType },
              { label: 'booleanListType',     value: 'booleanListType' as CustomPropertyType },
              { label: 'dateTimeListType',    value: 'dateTimeListType' as CustomPropertyType },
            ]
          : [
              { label: 'contentStringListType',      value: 'contentStringListType' as CustomPropertyType },
              { label: 'contentIntListType',          value: 'contentIntListType' as CustomPropertyType },
              { label: 'contentLongListType',         value: 'contentLongListType' as CustomPropertyType },
              { label: 'contentShortListType',        value: 'contentShortListType' as CustomPropertyType },
              { label: 'contentByteListType',         value: 'contentByteListType' as CustomPropertyType },
              { label: 'contentUnsignedIntListType',  value: 'contentUnsignedIntListType' as CustomPropertyType },
              { label: 'contentFloatListType',        value: 'contentFloatListType' as CustomPropertyType },
              { label: 'contentDoubleListType',       value: 'contentDoubleListType' as CustomPropertyType },
              { label: 'contentDecimalListType',      value: 'contentDecimalListType' as CustomPropertyType },
              { label: 'contentBooleanListType',      value: 'contentBooleanListType' as CustomPropertyType },
              { label: 'contentDateTimeListType',     value: 'contentDateTimeListType' as CustomPropertyType },
            ];

      const typeSelect = (
        <Select
          value={cp.customType}
          onChange={(v) =>
            handleUpdateCustomProperty(selectedTemplateId, cp.id, {
              customType: v as CustomPropertyType,
              value: null,
            })
          }
          options={typeOptions}
          style={{ width: isContentType ? 200 : 130 }}
          popupMatchSelectWidth={false}
          size="small"
        />
      );

      const unitsInput = (
        <Input
          placeholder="単位"
          value={cp.units}
          onChange={(e) => handleUpdateCustomProperty(selectedTemplateId, cp.id, { units: e.target.value })}
          style={{ width: 70 }}
          size="small"
        />
      );

      if (cp.containerType === 'content') {
        // value は string[]（各要素が1行のスペース区切りリスト）
        // 既存値が string の場合は単一行配列に変換
        const rows: string[] = Array.isArray(cp.value)
          ? (cp.value as string[])
          : cp.value
          ? [cp.value as string]
          : [''];

        return (
          <div key={cp.id} style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Tag color="cyan" style={{ flexShrink: 0 }}>content</Tag>
              {keyInput}
              {typeSelect}
              {unitsInput}
              {deleteBtn}
            </div>
            {/* 行ごとの入力エリア（列はスペース区切り） */}
            <div style={{ marginTop: 6 }}>
              {rows.map((rowVal, rowIdx) => (
                <div key={rowIdx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <TextArea
                    placeholder={`行 ${rowIdx + 1}: 値をスペース区切りで入力（例: 1.0 2.5 3.0）`}
                    value={rowVal}
                    onChange={(e) => {
                      const newRows = [...rows];
                      newRows[rowIdx] = e.target.value;
                      handleUpdateCustomProperty(selectedTemplateId, cp.id, { value: newRows });
                    }}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    style={{ flex: 1 }}
                    size="small"
                  />
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    disabled={rows.length <= 1}
                    onClick={() => {
                      const newRows = rows.filter((_, i) => i !== rowIdx);
                      handleUpdateCustomProperty(selectedTemplateId, cp.id, { value: newRows });
                    }}
                    style={{ flexShrink: 0 }}
                  />
                </div>
              ))}
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  const newRows = [...rows, ''];
                  handleUpdateCustomProperty(selectedTemplateId, cp.id, { value: newRows });
                }}
              >
                行を追加
              </Button>
            </div>
          </div>
        );
      }

      // property の値入力（型に応じて切替）
      let valueInput: React.ReactNode;
      switch (cp.customType) {
        // property の value は常に string | null（string[][] にはならない）
        case 'intType':
          valueInput = (
            <InputNumber
              placeholder="値"
              value={typeof cp.value === 'string' ? Number(cp.value) : undefined}
              onChange={(v) => handleUpdateCustomProperty(selectedTemplateId, cp.id, { value: v !== null ? String(v) : null })}
              precision={0}
              style={{ width: 120 }}
              size="small"
            />
          );
          break;
        case 'floatType':
          valueInput = (
            <InputNumber
              placeholder="値"
              value={typeof cp.value === 'string' ? Number(cp.value) : undefined}
              onChange={(v) => handleUpdateCustomProperty(selectedTemplateId, cp.id, { value: v !== null ? String(v) : null })}
              precision={3}
              step={0.001}
              style={{ width: 120 }}
              size="small"
            />
          );
          break;
        case 'booleanType':
          valueInput = (
            <Select
              placeholder="値"
              value={typeof cp.value === 'string' ? cp.value : undefined}
              onChange={(v) => handleUpdateCustomProperty(selectedTemplateId, cp.id, { value: v })}
              options={[{ label: 'true', value: 'true' }, { label: 'false', value: 'false' }]}
              style={{ width: 100 }}
              size="small"
            />
          );
          break;
        case 'dateType':
          valueInput = (
            <DatePicker
              placeholder="日付"
              value={typeof cp.value === 'string' && cp.value ? dayjs(cp.value) : null}
              onChange={(d) => handleUpdateCustomProperty(selectedTemplateId, cp.id, { value: d ? d.format('YYYY-MM-DD') : null })}
              format="YYYY-MM-DD"
              size="small"
              style={{ width: 140 }}
            />
          );
          break;
        case 'dateTimeType':
          valueInput = (
            <DatePicker
              showTime
              placeholder="日時"
              value={typeof cp.value === 'string' && cp.value ? dayjs(cp.value) : null}
              onChange={(d) => handleUpdateCustomProperty(selectedTemplateId, cp.id, { value: d ? d.format('YYYY-MM-DD HH:mm:ss') : null })}
              format="YYYY-MM-DD HH:mm:ss"
              size="small"
              style={{ width: 190 }}
            />
          );
          break;
        default:
          valueInput = (
            <TextArea
              placeholder="値"
              value={typeof cp.value === 'string' ? cp.value : ''}
              onChange={(e) => handleUpdateCustomProperty(selectedTemplateId, cp.id, { value: e.target.value })}
              autoSize={{ minRows: 1, maxRows: 3 }}
              style={{ flex: 1, minWidth: 120 }}
              size="small"
            />
          );
      }

      return (
        <div key={cp.id} style={rowStyle}>
          <Tag color="geekblue" style={{ flexShrink: 0, alignSelf: 'center' }}>property</Tag>
          {keyInput}
          {typeSelect}
          {valueInput}
          {unitsInput}
          {deleteBtn}
        </div>
      );
    });
  };

  /** インラインモード時のフッター（コメント・保存・スキップ・次のテンプレートへ）*/
  const currentTemplateIndex = filteredTemplates.findIndex((t) => t.templateId === selectedTemplateId);
  const totalTemplates = filteredTemplates.length;

  const handleSkipTemplate = () => {
    const nextIndex = currentTemplateIndex + 1;
    if (nextIndex < filteredTemplates.length) {
      setSelectedTemplateId(filteredTemplates[nextIndex].templateId);
    }
  };

  const handleNextTemplate = async () => {
    await handleSaveTemplate();
    const nextIndex = currentTemplateIndex + 1;
    if (nextIndex < filteredTemplates.length) {
      setSelectedTemplateId(filteredTemplates[nextIndex].templateId);
    }
  };

  const inlineFooter = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <Button
        data-testid="data-record-state-time-edit-button"
        icon={<EditOutlined />}
        style={{ borderColor: '#434343', color: '#434343', background: '#fff' }}
        onClick={() => setStateTimeEditModalOpen(true)}
      >
        状態記録
      </Button>
      <Button
        data-testid="data-record-start-button"
        icon={<PlayCircleOutlined />}
        style={{ borderColor: '#1677ff', color: '#1677ff', background: '#fff' }}
        onClick={() => {
          // TODO: 開始処理を実装予定
        }}
      >
        開始
      </Button>
      <Button
        data-testid="data-record-end-button"
        icon={<CheckCircleOutlined />}
        style={{ borderColor: '#52c41a', color: '#52c41a', background: '#fff' }}
        onClick={() => {
          // TODO: 終了処理を実装予定
        }}
      >
        終了
      </Button>
      <Button
        data-testid="data-record-error-end-button"
        danger
        icon={<CloseCircleOutlined />}
        onClick={() => {
          // TODO: 異常終了処理を実装予定
        }}
      >
        異常終了
      </Button>
      <Button
        data-testid="data-record-comment-button"
        icon={<InfoCircleOutlined />}
        style={{ borderColor: '#434343', color: '#434343', background: '#fff' }}
        onClick={() => setCommentDialogOpen(true)}
      >
        コメント
      </Button>
      <Button
        data-testid="data-record-save-button"
        icon={<SaveOutlined />}
        style={{ borderColor: '#52c41a', color: '#52c41a', background: '#fff' }}
        onClick={handleSaveTemplate}
        loading={loading}
        disabled={!isProjectEditable}
      >
        保存
      </Button>
      <Button
        data-testid="data-record-skip-button"
        icon={<FastForwardOutlined />}
        style={{ borderColor: '#434343', color: '#434343', background: '#fff' }}
        onClick={handleSkipTemplate}
        disabled={currentTemplateIndex < 0 || currentTemplateIndex >= filteredTemplates.length - 1}
      >
        スキップ
      </Button>
      <Button
        data-testid="data-record-next-template-button"
        type="primary"
        onClick={handleNextTemplate}
        loading={loading}
        disabled={!isProjectEditable || currentTemplateIndex < 0}
      >
        次へ
      </Button>
    </div>
  );

  /** 共通コンテンツ（Modal / インライン共通） */
  const dialogContent = (
    <div>
      {/* みなし進捗更新チェックボックスと作業指示ボタン（inlineMode では非表示） */}
      {!inlineMode && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* useDeemedProgressProp が false の場合はチェックボックスを非表示（組織設定で無効化） */}
          {useDeemedProgressProp ? (
            <Checkbox
              data-testid="deemed-progress-checkbox"
              checked={useDeemedProgress}
              onChange={(e) => setUseDeemedProgress(e.target.checked)}
            >
              みなし進捗更新
            </Checkbox>
          ) : (
            <span /> /* チェックボックス非表示時のスペーサー */
          )}
          <Button
            data-testid="instruction-button"
            icon={<InfoCircleOutlined />}
            onClick={() => setInstructionModalOpen(true)}
          >
            作業指示
          </Button>
        </div>
      )}

        {/* ステータス更新セクション
            - useDeemedProgressProp が false の場合: 常時表示（組織設定でみなし進捗無効）
            - useDeemedProgressProp が true の場合: チェックボックスOFF時のみ表示 */}
        {(!useDeemedProgressProp || !useDeemedProgress) && (
          <div data-testid="status-update-section" style={{ marginBottom: 24 }}>
            {/* タイトルセクション */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: token.marginXS,
                borderRadius: token.borderRadiusSM,
                marginBottom: token.marginSM,
              }}
              onClick={() => setStatusUpdateExpanded(!statusUpdateExpanded)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = token.colorFillSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {statusUpdateExpanded ? (
                <DownOutlined style={{ marginRight: 8, fontSize: 12 }} />
              ) : (
                <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />
              )}
              <SaveOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
              <Text strong style={{ fontSize: 16 }}>
                ステータス更新
              </Text>
            </div>

            {/* 折りたたみ可能なコンテンツ */}
            {statusUpdateExpanded && (
              <>
                {/* 上段：ステータス + 進捗 */}
                <Row gutter={16}>
                  {/* ステータス */}
                  <Col span={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      ステータス
                    </Text>
                    {isTerminalStatus ? (
                      <Alert
                        message={t('format.dataRecordDialog.terminalStatusMessage', { label: allStatusOptions.find((o: { value: TransitionStatus; label: string }) => o.value === currentStatus)?.label ?? '' })}
                        type="warning"
                        showIcon
                        style={{ marginBottom: 0 }}
                      />
                    ) : statusOptions.length === 0 ? (
                      <Alert
                        message={t('format.dataRecordDialog.noTransitionAvailable')}
                        type="info"
                        showIcon
                        style={{ marginBottom: 0 }}
                      />
                    ) : (
                      <>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                          {t('format.dataRecordDialog.currentStatus', { label: allStatusOptions.find((o: { value: TransitionStatus; label: string }) => o.value === currentStatus)?.label ?? '' })}
                        </Text>
                        <Select
                          style={{ width: '100%' }}
                          placeholder="ステータスを選択"
                          value={selectedStatus}
                          onChange={setSelectedStatus}
                          options={statusOptions}
                          disabled={!isProjectEditable || isTerminalStatus}
                        />
                      </>
                    )}
                  </Col>

                  {/* 進捗 */}
                  <Col span={16}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      進捗
                    </Text>
                    <Slider
                      value={progress}
                      onChange={setProgress}
                      min={0}
                      max={100}
                      step={1}
                      marks={{
                        0: '0%',
                        25: '25%',
                        50: '50%',
                        75: '75%',
                        100: '100%',
                      }}
                      tooltip={{
                        formatter: (value) => `${value}%`,
                      }}
                      disabled={!isProjectEditable}
                    />
                  </Col>
                </Row>

                {/* 中段：コメント */}
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={24}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      コメント
                    </Text>
                    <TextArea
                      rows={3}
                      placeholder="コメントを入力"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      disabled={!isProjectEditable}
                    />
                  </Col>
                </Row>

                {/* 下段：保存ボタン */}
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={24} style={{ textAlign: 'right' }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={loading}
                      disabled={!isProjectEditable}
                      onClick={() => {
                        // パスパラメータのガードチェック
                        if (!projectId || !methodId || !transition?.transitionId || taskNo === undefined) {
                          message.error(t('format.dataRecordDialog.missingProjectInfoForUpdate'));
                          console.error('Status update: projectId / methodId / transitionId / taskNo not set', {
                            projectId,
                            methodId,
                            transitionId: transition?.transitionId,
                            taskNo,
                          });
                          return;
                        }
                        setConfirmModalOpen(true);
                      }}
                    >
                      保存
                    </Button>
                  </Col>
                </Row>

                {/* ステータス更新確認モーダル */}
                <Modal
                  title="ステータスを変更しますか？"
                  open={confirmModalOpen}
                  width={380}
                  onCancel={() => setConfirmModalOpen(false)}
                  footer={[
                    <Button key="cancel" onClick={() => setConfirmModalOpen(false)}>
                      キャンセル
                    </Button>,
                    <Button
                      key="save"
                      type="primary"
                      loading={loading}
                      onClick={async () => {
                        try {
                          setLoading(true);
                          await updateTransitionStatus(projectId!, methodId!, transition!.transitionId, {
                            taskNo: taskNo!,
                            status: selectedStatus,
                            progressRate: progress,
                            comment: comment || undefined,
                          });
                          message.success(
                            t('format.dataRecordDialog.statusUpdated', { status: statusOptions.find(opt => opt.value === selectedStatus)?.label ?? '', progress: String(progress) })
                          );
                          setConfirmModalOpen(false);
                          // onSave を呼び出してダイアログを閉じ、親のトランジション一覧を最新状態に更新する
                          onSave([]);
                        } catch (error: unknown) {
                          console.error('Status update error:', error);
                          const axiosError = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
                          const serverMessage = axiosError?.response?.data?.error?.message;
                          if (serverMessage) {
                            message.error(t('dataRecordDialog.updateError', { message: serverMessage }));
                          } else if (axiosError?.message) {
                            message.error(t('dataRecordDialog.updateError', { message: axiosError.message }));
                          } else {
                            message.error(extractErrorMessage(error));
                          }
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      保存
                    </Button>,
                  ]}
                >
                  <p>
                    ステータスを「{statusOptions.find(opt => opt.value === selectedStatus)?.label ?? ''}」に変更します。
                    よろしいですか？
                  </p>
                </Modal>
              </>
            )}
          </div>
        )}

        {/* 2カラムレイアウト: サイドバー（テンプレート一覧） + コンテンツ（データ記録） */}
        <Layout style={{ height: 600, background: 'transparent' }}>
          {/* 左サイドバー: テンプレート一覧 */}
          <Sider
            width={300}
            style={{
              background: token.colorBgContainer,
              borderRight: `1px solid ${token.colorBorder}`,
              borderRadius: token.borderRadiusSM,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: token.paddingMD,
              }}
            >
              {/* タイトル */}
              <div style={{ marginBottom: token.marginMD }}>
                <Space>
                  <AppstoreOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
                  <Text strong style={{ fontSize: 16 }}>
                    テンプレート一覧
                  </Text>
                  <Tag color="blue">{filteredTemplates.length}件</Tag>
                </Space>
              </div>

              {/* フィルタリングエリア */}
              <Space orientation="vertical" style={{ width: '100%', marginBottom: token.marginMD }} size="small">
                <Input
                  data-testid="template-search-input"
                  placeholder="テンプレート名で検索"
                  prefix={<SearchOutlined />}
                  value={templateSearchText}
                  onChange={(e) => setTemplateSearchText(e.target.value)}
                  allowClear
                />
                <Select
                  data-testid="template-category-select"
                  placeholder="テンプレート種別"
                  value={selectedTemplateCategory}
                  onChange={setSelectedTemplateCategory}
                  allowClear
                  style={{ width: '100%' }}
                  options={[
                    { label: 'Materials', value: 'Materials' },
                    { label: 'Conditions', value: 'Conditions' },
                    { label: 'Results', value: 'Results' },
                  ]}
                />
              </Space>

              {/* テーブル（実績データ読み込み中はSpinを表示） */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Spin spinning={templateDataLoading} tip="実績データ読み込み中...">
                <Table
                  size="small"
                  dataSource={filteredTemplates}
                  rowKey="templateId"
                  onRow={(record) => ({
                    onClick: () => {
                      setSelectedTemplateId(record.templateId);
                    },
                    style: { cursor: 'pointer' },
                  })}
                  rowClassName={(record) =>
                    selectedTemplateId === record.templateId
                      ? 'ant-table-row-selected'
                      : ''
                  }
                  scroll={{ y: 400 }}
                  pagination={false}
                  showHeader={false}
                  columns={[
                    {
                      title: 'Template',
                      dataIndex: 'name',
                      key: 'name',
                      render: (name: string, record: Template) => {
                        // カテゴリーからI/Oを判定
                        const isOutput = record.category === 'Results';
                        const ioLabel = isOutput ? 'OUT' : 'IN';
                        const ioColor = isOutput ? 'green' : 'blue';
                        const propertyCount =
                          (record.properties?.length ?? 0) +
                          (record.insertions?.length ?? 0) +
                          (record.contents?.length ?? 0);
                        
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Text strong style={{ fontSize: 13 }}>{name}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                ({propertyCount}項目)
                              </Text>
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <Space size="small">
                                <Tag color={getTemplateCategoryColor(record.category)} style={{ fontSize: 11, margin: 0 }}>
                                  {getTemplateCategoryLabel(record.category)}
                                </Tag>
                                <Tag color={ioColor} style={{ fontSize: 11, margin: 0 }}>
                                  {ioLabel}
                                </Tag>
                              </Space>
                            </div>
                          </div>
                        );
                      },
                    },
                  ]}
                />
                </Spin>
              </div>
            </div>
          </Sider>

          {/* 右コンテンツ: データ記録 */}
          <Content
            style={{
              background: token.colorBgLayout,
              padding: token.paddingMD,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ボタン群（固定） */}
            {inlineMode && (
              <div style={{ marginBottom: token.marginSM, flexShrink: 0 }}>
                {inlineFooter}
              </div>
            )}
            {/* タイトル（固定） */}
            <div style={{ marginBottom: token.marginMD, flexShrink: 0 }}>
                <Space>
                  <FileTextOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
                  <Text strong style={{ fontSize: 16 }}>
                    データ記録
                  </Text>
                  {selectedTemplate && (
                    <>
                      <Tag color={getTemplateCategoryColor(selectedTemplate.category)}>
                        {getTemplateCategoryLabel(selectedTemplate.category)}
                      </Tag>
                      <Text strong>{selectedTemplate.name}</Text>
                    </>
                  )}
                </Space>
              </div>

              {/* フォームまたは選択促進メッセージ（スクロール可能エリア） */}
              <div style={{ flex: 1, overflow: 'auto' }}>
              <Form
                form={form}
                layout="vertical"
                autoComplete="off"
              >
              {selectedTemplate ? (
                <>
                  <div>
                    <Row gutter={[16, 16]}>
                      {selectedTemplate.properties.map((prop) => {
                        const tplId = selectedTemplate.templateId;
                        const propKey = prop.key;
                        // ── 定性評価 ──
                        // DB から取得した不確かさ基準の定性評価選択肢を使用する
                        // prop.uncertaintyKey が指定されていればその基準を使用、なければ「デフォルト値」基準を使用
                        const qualOptions = getQualOptions(prop);
                        const currentQual = propertyQualitativeEvals[tplId]?.[propKey] ?? null;
                        // 現在選択中の選択肢の displayColor を取得（バッジ色に使用）
                        const currentQualOption = qualOptions.find((o) => o.selectorValue === currentQual);
                        const qualBadgeColor = currentQual
                          ? (currentQualOption?.displayColor ?? '#1677ff')
                          : undefined;
                        // DB から取得した選択肢ラベルマップ（selectorValue をそのままラベルとして使用）
                        const qualLabelMap: Record<string, string> = {};
                        // ── 定量評価 ──
                        const quantEvals = propertyQuantitativeEvals[tplId]?.[propKey] ?? [];
                        // モック評価方法選択肢
                        const EVAL_METHOD_OPTIONS = [
                          { label: '誤差値', value: '誤差値' },
                          { label: '標準偏差', value: '標準偏差' },
                          { label: '相対誤差', value: '相対誤差' },
                          { label: '測定不確かさ', value: '測定不確かさ' },
                        ];

                        if (prop.type === 'propertyListType') {
                          return (
                            <Col key={propKey} span={24}>
                              {renderPropertyInput(prop, tplId)}
                            </Col>
                          );
                        }

                        return (
                          <Col key={propKey} span={8}>
                            <Card
                              size="small"
                              style={{ height: '100%' }}
                              title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <Text strong style={{ fontSize: 13 }}>{prop.label}</Text>
                                  {prop.units && <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{prop.units}</Tag>}
                                  {currentQual && qualBadgeColor && (
                                    <Tag color={qualBadgeColor} style={{ fontSize: 11, margin: 0 }}>
                                      {qualLabelMap[currentQual] ?? currentQual}
                                    </Tag>
                                  )}
                                </div>
                              }
                            >
                              {/* 指定値・許容誤差値 */}
                              <Row gutter={8} style={{ marginBottom: 8 }}>
                                <Col span={12}>
                                  <Text type="secondary" style={{ fontSize: 11 }}>{t('dataRecordDialog.plannedValue')}</Text>
                                  <div style={{
                                    border: '1px solid #d9d9d9',
                                    borderRadius: 4,
                                    padding: '4px 11px',
                                    background: '#fff',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    minHeight: 32,
                                    lineHeight: '22px',
                                  }}>
                                    {(() => {
                                      // DB取得値（loadedValues）を優先表示し、なければ plannedValue を使用
                                      const formKey = `${tplId}_${propKey}`;
                                      const dbVal = loadedValues[formKey];
                                      if (dbVal != null && dbVal !== '') {
                                        return `${dbVal}${prop.units ? ' ' + prop.units : ''}`;
                                      }
                                      return prop.plannedValue != null
                                        ? `${prop.plannedValue}${prop.units ? ' ' + prop.units : ''}`
                                        : '—';
                                    })()}
                                  </div>
                                </Col>
                                <Col span={12}>
                                  {/* ② ヘッダ名: uncertaintyName があればその値、なければ「不確かさ名」 */}
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    {prop.uncertaintyName ?? t('dataRecordDialog.uncertaintyName')}
                                  </Text>
                                  <div style={{
                                    border: '1px solid #d9d9d9',
                                    borderRadius: 4,
                                    padding: '4px 11px',
                                    background: '#fff',
                                    fontSize: 13,
                                    minHeight: 32,
                                    lineHeight: '22px',
                                  }}>
                                    {prop.toleranceValue
                                      ? `${prop.toleranceValue}${prop.units ? ' ' + prop.units : ''}`
                                      : '—'}
                                  </div>
                                </Col>
                              </Row>
                              {/* ① 不確かさ説明: 常時表示（説明なしの場合は「—」） */}
                              <div style={{ marginBottom: 8 }}>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{t('dataRecordDialog.uncertaintyNote')}</Text>
                                <div style={{
                                  border: '1px solid #d9d9d9',
                                  borderRadius: 4,
                                  padding: '4px 11px',
                                  background: '#fff',
                                  fontSize: 12,
                                  color: '#595959',
                                  minHeight: 32,
                                  lineHeight: '22px',
                                }}>
                                  {prop.uncertaintyNote ?? '—'}
                                </div>
                              </div>
                              <Divider style={{ margin: '8px 0' }} />
                              {/* 実績値 */}
                              <div style={{ marginBottom: 8 }}>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{t('dataRecordDialog.measuredValue')}</Text>
                                {/*
                                  label='' を渡しても Ant Design の vertical レイアウトでは
                                  ラベル領域（約22px）が確保されるため、負のマージンで相殺する。
                                  marginTop: -26  … ラベルエリア分を詰める
                                  marginBottom: -16 … Form.Item デフォルト marginBottom(24px) - 8px
                                */}
                                <div style={{ marginTop: -26, marginBottom: -16 }}>
                                  {renderPropertyInput({ ...prop, label: '' }, tplId)}
                                </div>
                              </div>
                              <Divider style={{ margin: '8px 0' }} />
                              {/* 定性評価 */}
                              <div style={{ marginBottom: 8 }}>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{t('dataRecordDialog.qualitativeEval')}</Text>
                                <Space size={4} wrap>
                                  {qualOptions.map((opt) => {
                                    const isSelected = currentQual === opt.selectorValue;
                                    const optColor = opt.displayColor || '#1677ff';
                                    const buttonStyle: React.CSSProperties = isSelected
                                      ? { backgroundColor: optColor, borderColor: optColor, color: '#fff' }
                                      : { borderColor: optColor, color: optColor };
                                    return (
                                      <Button
                                        key={opt.selectorValue}
                                        size="small"
                                        type={isSelected ? 'primary' : 'default'}
                                        style={buttonStyle}
                                        onClick={() => {
                                          setPropertyQualitativeEvals((prev) => ({
                                            ...prev,
                                            [tplId]: {
                                              ...(prev[tplId] ?? {}),
                                              [propKey]: currentQual === opt.selectorValue ? '' : opt.selectorValue,
                                            },
                                          }));
                                        }}
                                        disabled={!isProjectEditable}
                                      >
                                        {opt.selectorValue}
                                      </Button>
                                    );
                                  })}
                                </Space>
                              </div>
                              {/* 定量評価 */}
                              <div>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{t('dataRecordDialog.quantitativeEval')}</Text>
                                {quantEvals.map((qe) => (
                                  <div key={qe.id} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
                                    <Select
                                      size="small"
                                      value={qe.method || undefined}
                                      placeholder={t('dataRecordDialog.evalMethod')}
                                      options={EVAL_METHOD_OPTIONS}
                                      style={{ flex: 1 }}
                                      onChange={(v) => {
                                        setPropertyQuantitativeEvals((prev) => ({
                                          ...prev,
                                          [tplId]: {
                                            ...(prev[tplId] ?? {}),
                                            [propKey]: (prev[tplId]?.[propKey] ?? []).map((e) =>
                                              e.id === qe.id ? { ...e, method: v } : e
                                            ),
                                          },
                                        }));
                                      }}
                                      disabled={!isProjectEditable}
                                    />
                                    <Input
                                      size="small"
                                      value={qe.threshold}
                                      placeholder={t('dataRecordDialog.threshold')}
                                      style={{ width: 70 }}
                                      onChange={(e) => {
                                        setPropertyQuantitativeEvals((prev) => ({
                                          ...prev,
                                          [tplId]: {
                                            ...(prev[tplId] ?? {}),
                                            [propKey]: (prev[tplId]?.[propKey] ?? []).map((ev) =>
                                              ev.id === qe.id ? { ...ev, threshold: e.target.value } : ev
                                            ),
                                          },
                                        }));
                                      }}
                                      disabled={!isProjectEditable}
                                    />
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      onClick={() => {
                                        setPropertyQuantitativeEvals((prev) => ({
                                          ...prev,
                                          [tplId]: {
                                            ...(prev[tplId] ?? {}),
                                            [propKey]: (prev[tplId]?.[propKey] ?? []).filter((ev) => ev.id !== qe.id),
                                          },
                                        }));
                                      }}
                                      disabled={!isProjectEditable}
                                    />
                                  </div>
                                ))}
                                <Button
                                  size="small"
                                  icon={<PlusOutlined />}
                                  onClick={() => {
                                    const newEval = { id: `qe_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, method: '', threshold: '' };
                                    setPropertyQuantitativeEvals((prev) => ({
                                      ...prev,
                                      [tplId]: {
                                        ...(prev[tplId] ?? {}),
                                        [propKey]: [...(prev[tplId]?.[propKey] ?? []), newEval],
                                      },
                                    }));
                                  }}
                                  disabled={!isProjectEditable}
                                >
                                  {t('dataRecordDialog.addEval')}
                                </Button>
                              </div>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>

                    {/* トップレベル Contents セクション（Property と別枠で表示） */}
                    {selectedTemplate.contents && selectedTemplate.contents.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ borderTop: `1px solid #e0e0e0`, paddingTop: 12, marginBottom: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>データ</Text>
                        </div>
                        <Row gutter={16}>
                          {selectedTemplate.contents.map((content) => (
                            <Col key={content.key} span={24}>
                              {renderContentField(content, selectedTemplate.templateId)}
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}

                    {/* トップレベル非カスタム Insertions セクション */}
                    {selectedTemplate.insertions && selectedTemplate.insertions.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ borderTop: `1px solid #e0e0e0`, paddingTop: 12, marginBottom: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>添付ファイル（insertion）</Text>
                        </div>
                        {selectedTemplate.insertions.map((ins, insIdx) => {
                          const tplId = selectedTemplate.templateId;
                          const fileForIns = insertionFiles[tplId]?.[insIdx] ?? null;
                          const uriForIns = insertionUris[tplId]?.[insIdx] ?? ins.uri ?? '';
                          const acceptStr = getAcceptString(ins.format);
                          return (
                            <div
                              key={insIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 8,
                                padding: '8px',
                                background: token.colorBgContainer,
                                borderRadius: token.borderRadiusSM,
                                border: `1px solid ${token.colorBorder}`,
                              }}
                            >
                              <Tag color="purple" style={{ flexShrink: 0 }}>insertion</Tag>
                              {ins.description && (
                                <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                                  {ins.description}
                                </Text>
                              )}
                              {ins.format && (
                                <Tag color="geekblue" style={{ fontSize: 11, flexShrink: 0 }}>
                                  {ins.format}
                                </Tag>
                              )}
                              <Upload
                                maxCount={1}
                                showUploadList={false}
                                accept={acceptStr}
                                beforeUpload={(file) => {
                                  setInsertionFiles((prev) => ({
                                    ...prev,
                                    [tplId]: { ...(prev[tplId] ?? {}), [insIdx]: file },
                                  }));
                                  return false;
                                }}
                                disabled={!isProjectEditable}
                              >
                                <Button icon={<UploadOutlined />} size="small" disabled={!isProjectEditable}>
                                  {fileForIns ? fileForIns.name : 'Select File'}
                                </Button>
                              </Upload>
                              {/* 既存URIまたは新規選択ファイル名の表示 */}
                              {(fileForIns || uriForIns) && (
                                <Text
                                  type="secondary"
                                  style={{ fontSize: 11, flex: 1 }}
                                  ellipsis={{ tooltip: fileForIns?.name ?? uriForIns }}
                                >
                                  {fileForIns ? fileForIns.name : uriForIns.split('/').pop() ?? uriForIns}
                                </Text>
                              )}
                              {/* 既存ファイルのクリアボタン */}
                              {(fileForIns || uriForIns) && isProjectEditable && (
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<CloseOutlined />}
                                  onClick={() => {
                                    setInsertionFiles((prev) => ({
                                      ...prev,
                                      [tplId]: { ...(prev[tplId] ?? {}), [insIdx]: null },
                                    }));
                                    setInsertionUris((prev) => ({
                                      ...prev,
                                      [tplId]: { ...(prev[tplId] ?? {}), [insIdx]: '' },
                                    }));
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ===== カスタムプロパティセクション ===== */}
                  {isProjectEditable && (
                    <div style={{ marginTop: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                        <Text strong>カスタムプロパティ</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          （テンプレート定義外の任意データを追加できます）
                        </Text>
                      </div>
                      {/* 既存カスタムプロパティ行の表示 */}
                      {renderCustomPropertyRows()}
                      {/* 追加ボタン群 */}
                      <Space style={{ marginTop: 8 }}>
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => handleAddCustomProperty('property')}
                        >
                          property 追加
                        </Button>
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => handleAddCustomProperty('content')}
                        >
                          content 追加
                        </Button>
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => handleAddCustomProperty('insertion')}
                        >
                          insertion 追加
                        </Button>
                      </Space>
                    </div>
                  )}
                </>
              ) : (
                <Alert
                  title="テンプレートを選択してください"
                  description="左側のテンプレート一覧から記録したいテンプレートを選択してください。"
                  type="info"
                  showIcon
                />
              )}
              </Form>
              </div>
          </Content>
        </Layout>

      {/* 作業指示モーダル */}
      <InstructionConfirmationModal
        open={instructionModalOpen}
        transition={transition}
        projectId={projectId}
        methodId={methodId}
        projectStatus={projectStatus}
        onCancel={() => setInstructionModalOpen(false)}
      />
    </div>
  );

  // ===== inlineMode 用: プロジェクト指示取得 =====
  /** プロジェクト指示（inlineMode 時のみ取得） */
  const [workerInstructions, setWorkerInstructions] = useState<WorkerInstruction[]>([]);
  /** プロジェクト指示セクションの折りたたみ状態 */
  const [instructionPanelExpanded, setInstructionPanelExpanded] = useState(false);
  /** 確認済みにした指示IDのセット */
  const [confirmedInstructionIds, setConfirmedInstructionIds] = useState<Set<string>>(new Set());
  /** 確認処理中の指示IDセット（ローディング制御用） */
  const [confirmingInstructionIds, setConfirmingInstructionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!inlineMode || !projectId || !open) return;
    (async () => {
      try {
        const result = await getWorkerInstructions(projectId);
        setWorkerInstructions(result.data ?? []);
      } catch (e) {
        console.warn('[DataRecordDialog] プロジェクト指示の取得に失敗しました:', e);
        setWorkerInstructions([]);
      }
    })();
  }, [inlineMode, projectId, open]);

  // inlineMode: div ラッパー、Modal なし
  if (inlineMode) {
    // ── プロジェクト指示セクション（折りたたみ可能・黄背景） ──
    const instructionSection = (
      <div
        style={{
          marginBottom: 8,
          border: `1px solid #facc4a`,
          borderRadius: token.borderRadiusSM,
          background: '#fffbe6',
          overflow: 'hidden',
        }}
      >
        {/* ヘッダー（クリックで折りたたみ） */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setInstructionPanelExpanded((v) => !v)}
        >
          {instructionPanelExpanded ? (
            <DownOutlined style={{ fontSize: 11, color: '#d48806' }} />
          ) : (
            <RightOutlined style={{ fontSize: 11, color: '#d48806' }} />
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#d48806' }}>
            ⚠️ プロジェクト指示
          </span>
          <Tag color="warning" style={{ fontSize: 11, marginLeft: 4 }}>
            {workerInstructions.length}件
          </Tag>
        </div>
        {/* 本文（展開時のみ表示） */}
        {instructionPanelExpanded && (
          <div
            style={{
              padding: '8px 16px 12px',
              borderTop: '1px solid #facc4a',
            }}
          >
                {workerInstructions.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>指示はありません</Text>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {workerInstructions.map((ins) => {
                  const isConfirmed = confirmedInstructionIds.has(ins.id);
                  const isConfirming = confirmingInstructionIds.has(ins.id);
                  return (
                    <li key={ins.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13 }}>{ins.instruction_content}</Text>
                        {ins.created_by_name && (
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                            （{ins.created_by_name}）
                          </Text>
                        )}
                      </div>
                      {isConfirmed ? (
                        <Tag color="success" icon={<CheckCircleOutlined />} style={{ flexShrink: 0 }}>
                          確認済み
                        </Tag>
                      ) : (
                        <Button
                          size="small"
                          type="primary"
                          loading={isConfirming}
                          onClick={async () => {
                            if (!projectId) return;
                            setConfirmingInstructionIds((prev) => new Set(prev).add(ins.id));
                            try {
                              await confirmInstruction(projectId, ins.id);
                              setConfirmedInstructionIds((prev) => new Set(prev).add(ins.id));
                            } catch (e) {
                              message.error('指示確認の送信に失敗しました');
                              console.error('[DataRecordDialog] confirmInstruction error:', e);
                            } finally {
                              setConfirmingInstructionIds((prev) => {
                                const next = new Set(prev);
                                next.delete(ins.id);
                                return next;
                              });
                            }
                          }}
                          style={{ flexShrink: 0 }}
                        >
                          指示確認済み
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    );

    // ── 作業ステータス選択肢 ──
    const WORK_STATUS_OPTIONS = [
      { code: 0, label: '初期状態' },
      { code: 1, label: '準備状態' },
      { code: 2, label: '準備完了状態' },
      { code: 3, label: '動作状態' },
      { code: 5, label: '終状態' },
      { code: 6, label: '異常終了状態' },
    ] as const;

    /** 選択ステータスに応じた背景・ボーダー色を返す */
    const getWorkStatusBarStyle = (code: number): React.CSSProperties => {
      if (code === 5) {
        // 終状態 → グレーアウト
        return {
          background: '#f5f5f5',
          border: `1px solid #d9d9d9`,
        };
      }
      if (code === 6) {
        // 異常終了状態 → 赤
        return {
          background: '#fff1f0',
          border: `1px solid #ffa39e`,
        };
      }
      // その他 → 緑（デフォルト）
      return {
        background: '#f6ffed',
        border: `1px solid #b7eb8f`,
      };
    };

    // ── 作業中情報バー（ステータス選択プルダウン付き） ──
    const workStatusBar = (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 12px',
          borderRadius: token.borderRadiusSM,
          flexWrap: 'wrap',
          flex: 1,
          ...getWorkStatusBarStyle(selectedWorkStatus),
        }}
      >
        <Text strong style={{ fontSize: 12, flexShrink: 0 }}>状態</Text>
        <Select
          value={selectedWorkStatus}
          onChange={(val: number) => setSelectedWorkStatus(val)}
          style={{ width: 140, fontWeight: 600, fontSize: 12 }}
          size="small"
          options={WORK_STATUS_OPTIONS.map((s) => ({ value: s.code, label: s.label }))}
        />
        {taskNo !== undefined && (
          <>
            <Text style={{ fontSize: 12 }}>タスクNo</Text>
            <Tag color="blue" style={{ fontSize: 12 }}>#{taskNo}</Tag>
          </>
        )}
        {methodId && (
          <>
            <Text style={{ fontSize: 12 }}>メソッド</Text>
            <Tag
              color="geekblue"
              style={{ fontSize: 12, maxWidth: 220 }}
              title={methodId}
            >
              {methodId.length > 30 ? `${methodId.slice(0, 30)}…` : methodId}
            </Tag>
          </>
        )}
        {transition?.transitionName && (
          <>
            <Text style={{ fontSize: 12 }}>トランジション</Text>
            <Tag
              color="purple"
              style={{ fontSize: 12, maxWidth: 240 }}
              title={transition.transitionName}
            >
              {transition.transitionName.length > 36
                ? `${transition.transitionName.slice(0, 36)}…`
                : transition.transitionName}
            </Tag>
          </>
        )}
      </div>
    );

    return (
      <div data-testid="data-record-inline">
        {instructionSection}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {workStatusBar}
        </div>
        {dialogContent}
        <ExperimentCommentDialog
          open={commentDialogOpen}
          taskNo={taskNo ?? 0}
          transitionId={transition?.transitionId ?? ''}
          onClose={() => setCommentDialogOpen(false)}
          onSave={(_comment) => {
            console.info('[DataRecordDialog] experiment comment saved:', _comment);
            setCommentDialogOpen(false);
          }}
        />

        {/* 状態記録モーダル */}
        <Modal
          title={
            <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600 }}>
              状態記録
            </div>
          }
          open={stateTimeEditModalOpen}
          onCancel={() => setStateTimeEditModalOpen(false)}
          width={620}
          footer={[
            <Button
              key="cancel"
              onClick={() => setStateTimeEditModalOpen(false)}
            >
              キャンセル
            </Button>,
            <Button
              key="save"
              type="primary"
              onClick={() => {
                console.info('[DataRecordDialog] stateTimesData saved:', stateTimesData);
                setStateTimeEditModalOpen(false);
              }}
            >
              保存
            </Button>,
          ]}
        >
          {/* 固定エントリ: 準備状態・準備完了状態 */}
          {(
            [
              { code: 1, label: '準備状態',     color: 'processing' },
              { code: 2, label: '準備完了状態', color: 'cyan'       },
            ] as { code: number; label: string; color: string }[]
          ).map(({ code, label, color }) => (
            <Row
              key={code}
              gutter={12}
              style={{
                marginBottom: 8,
                alignItems: 'flex-start',
                border: '1px solid #e8e8e8',
                borderRadius: 8,
                padding: '8px 4px',
                background: '#fafafa',
              }}
            >
              <Col span={6}>
                <div style={{ paddingTop: 20 }}>
                  <Tag color={color} style={{ fontSize: 13, padding: '3px 10px', borderRadius: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {label}
                  </Tag>
                </div>
              </Col>
              <Col span={18}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  状態遷移時刻
                </Text>
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  value={stateTimesData[code]?.startTime ?? null}
                  onChange={(val) =>
                    setStateTimesData((prev) => ({ ...prev, [code]: { ...prev[code], startTime: val } }))
                  }
                  style={{ width: '100%' }}
                  placeholder="状態遷移時刻"
                />
              </Col>
            </Row>
          ))}

          {/* 固定エントリ: 動作状態（+ 休止状態記録追加ボタン付き） */}
          <Row
            gutter={12}
            style={{
              marginBottom: 8,
              alignItems: 'flex-start',
              border: '1px solid #e8e8e8',
              borderRadius: 8,
              padding: '8px 4px',
              background: '#fafafa',
            }}
          >
            <Col span={6}>
              <div style={{ paddingTop: 20 }}>
                <Tag color="blue" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  動作状態
                </Tag>
              </div>
            </Col>
            <Col span={18}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                状態遷移時刻
              </Text>
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                value={stateTimesData[3]?.startTime ?? null}
                onChange={(val) =>
                  setStateTimesData((prev) => ({ ...prev, 3: { ...prev[3], startTime: val } }))
                }
                style={{ width: '100%' }}
                placeholder="状態遷移時刻"
              />
              {/* + 休止状態記録追加ボタン */}
              <Button
                size="small"
                style={{ marginTop: 8 }}
                onClick={() => {
                  setPauseEntries((prev) => [
                    ...prev,
                    { id: `pause_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, pauseTime: null, resumeTime: null },
                  ]);
                }}
              >
                + 休止状態記録追加
              </Button>
            </Col>
          </Row>

          {/* 動的エントリ: 休止状態 + 動作状態のペア */}
          {pauseEntries.map((entry, entryIdx) => (
            <div
              key={entry.id}
              style={{
                margin: '0 -14px 8px',
                border: '2px solid rgb(145, 202, 255)',
                borderRadius: 10,
                padding: '6px 14px',
              }}
            >
              {/* 休止状態 */}
              <Row
                gutter={12}
                style={{
                  marginBottom: 4,
                  alignItems: 'flex-start',
                  border: '1px solid #e8e8e8',
                  borderRadius: 8,
                  padding: '8px 4px',
                  background: '#fafafa',
                }}
              >
                <Col span={6}>
                  <div style={{ paddingTop: 20 }}>
                    <Tag color="warning" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      休止状態
                    </Tag>
                  </div>
                </Col>
                <Col span={18}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    状態遷移時刻
                  </Text>
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm:ss"
                    value={entry.pauseTime}
                    onChange={(val) =>
                      setPauseEntries((prev) =>
                        prev.map((e, i) => i === entryIdx ? { ...e, pauseTime: val } : e)
                      )
                    }
                    style={{ width: '100%' }}
                    placeholder="状態遷移時刻"
                  />
                </Col>
              </Row>
              {/* 動作状態（再開） */}
              <Row
                gutter={12}
                style={{
                  alignItems: 'flex-start',
                  border: '1px solid #e8e8e8',
                  borderRadius: 8,
                  padding: '8px 4px',
                  background: '#fafafa',
                }}
              >
                <Col span={6}>
                  <div style={{ paddingTop: 20 }}>
                    <Tag color="blue" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      動作状態
                    </Tag>
                  </div>
                </Col>
                <Col span={18}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    状態遷移時刻
                  </Text>
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm:ss"
                    value={entry.resumeTime}
                    onChange={(val) =>
                      setPauseEntries((prev) =>
                        prev.map((e, i) => i === entryIdx ? { ...e, resumeTime: val } : e)
                      )
                    }
                    style={{ width: '100%' }}
                    placeholder="状態遷移時刻"
                  />
                  {/* 最後のペアにのみ「+ 休止状態記録追加」ボタンを表示、全ペアに「- 休止状態記録削除」ボタンを表示 */}
                  <Space style={{ marginTop: 8 }}>
                    {entryIdx === pauseEntries.length - 1 && (
                      <Button
                        size="small"
                        onClick={() => {
                          setPauseEntries((prev) => [
                            ...prev,
                            { id: `pause_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, pauseTime: null, resumeTime: null },
                          ]);
                        }}
                      >
                        + 休止状態記録追加
                      </Button>
                    )}
                    <Button
                      size="small"
                      danger
                      onClick={() => setPauseEntries((prev) => prev.filter((_, i) => i !== entryIdx))}
                    >
                      - 休止状態記録削除
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>
          ))}

          {/* 固定エントリ: 終状態・異常終了状態 */}
          {(
            [
              { code: 5, label: '終状態',       color: 'success' },
              { code: 6, label: '異常終了状態', color: 'error'   },
            ] as { code: number; label: string; color: string }[]
          ).map(({ code, label, color }) => (
            <Row
              key={code}
              gutter={12}
              style={{
                marginBottom: 8,
                alignItems: 'flex-start',
                border: '1px solid #e8e8e8',
                borderRadius: 8,
                padding: '8px 4px',
                background: '#fafafa',
              }}
            >
              <Col span={6}>
                <div style={{ paddingTop: 20 }}>
                  <Tag color={color} style={{ fontSize: 13, padding: '3px 10px', borderRadius: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {label}
                  </Tag>
                </div>
              </Col>
              <Col span={18}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  状態遷移時刻
                </Text>
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  value={stateTimesData[code]?.startTime ?? null}
                  onChange={(val) =>
                    setStateTimesData((prev) => ({ ...prev, [code]: { ...prev[code], startTime: val } }))
                  }
                  style={{ width: '100%' }}
                  placeholder="状態遷移時刻"
                />
              </Col>
            </Row>
          ))}
        </Modal>
      </div>
    );
  }

  // 通常モード: Modal ラッパー
  return (
    <Modal
      data-testid="data-record-dialog"
      title={
        <Space>
          <Text strong style={{ fontSize: 18 }}>
            実験データ記録
          </Text>
          {transition && (
            <Text type="secondary" style={{ fontSize: 14 }}>
              - {transition.transitionName}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={1400}
      style={{ top: 20 }}
      footer={[
        <Button
          key="cancel"
          data-testid="data-record-cancel-button"
          onClick={onClose}
        >
          キャンセル
        </Button>,
        <Button
          key="save"
          data-testid="data-record-save-button"
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSaveTemplate}
          loading={loading}
          disabled={!isProjectEditable}
        >
          保存
        </Button>,
      ]}
    >
      {dialogContent}
    </Modal>
  );
}
