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
  QuantitativeEval,
} from '@/types/experimentWorker';
import { TransitionStatusCode } from '@/constants/codeMaster';

/**
 * スチE�Eタス遷移ルール�E�ErogressService.ts の ALLOWED_TRANSITIONS と同一�E�E
 * キー: 現在のスチE�Eタス値�E�数値�E�E
 * 値: 遷移可能なスチE�Eタス値の配�E�E�数値�E�E
 */
const ALLOWED_TRANSITIONS: Record<number, number[]> = {
  [TransitionStatusCode.INITIAL]:   [TransitionStatusCode.PREPARING, TransitionStatusCode.COMPLETED, TransitionStatusCode.ERROR],
  [TransitionStatusCode.PREPARING]: [TransitionStatusCode.READY, TransitionStatusCode.COMPLETED, TransitionStatusCode.ERROR],
  [TransitionStatusCode.READY]:     [TransitionStatusCode.READY, TransitionStatusCode.IN_PROGRESS, TransitionStatusCode.COMPLETED, TransitionStatusCode.ERROR],
  [TransitionStatusCode.IN_PROGRESS]: [TransitionStatusCode.PAUSED, TransitionStatusCode.COMPLETED, TransitionStatusCode.ERROR],
  [TransitionStatusCode.PAUSED]:    [TransitionStatusCode.IN_PROGRESS, TransitionStatusCode.COMPLETED, TransitionStatusCode.ERROR],
  [TransitionStatusCode.COMPLETED]: [],  // 終状慁EↁE変更不可
  [TransitionStatusCode.ERROR]:     [],  // 異常終亁EↁE変更不可
};

import { saveBatchExperimentData, getTemplateData } from '@/services/experimentDataApiService';
import { uploadFiles } from '@/services/fileAccessService';
import { extractErrorMessage } from '@/utils/errorUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateByXsiType } from '@/utils/xsiTypeValidator';
import { updateTransitionStatus } from '@/services/projectApiService';
import { ExperimentDataRecord, TemplateDataItem } from '@/types/api';
import InstructionConfirmationModal from './InstructionConfirmationModal';

// ===== TemplateDataItem ↁETemplate 変換ヘルパ�E =====

/**
 * API の templateType 斁E���Eをフロント�E TemplateCategory にマッピングする
 */
function mapTemplateTypeToCategory(templateType: string): TemplateCategory {
  switch (templateType) {
    case 'material':   return 'Materials';
    case 'condition':  return 'Conditions';
    case 'result':     return 'Results';
    default:           return 'Materials'; // 未知の値は Materials にフォールバック
  }
}

/** PropertyType の全候補！EsiType をそのまま使用�E�E/
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
 * API の xsiType 斁E���Eをフロント�E PropertyType にマッピングする
 * xsiType をそのまま PropertyType として返す�E�変換不要E��E
 */
function mapXsiTypeToPropertyType(xsiType: string): PropertyType {
  if ((KNOWN_PROPERTY_TYPES as readonly string[]).includes(xsiType)) {
    return xsiType as PropertyType;
  }
  return 'stringType'; // 未知の xsiType は stringType にフォールバック
}

/** ContentType の全候裁E*/
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
 * API の xsiType 斁E���Eをフロント�E ContentType にマッピングする
 * xsiType をそのまま ContentType として返す�E�変換不要E��E
 */
function mapXsiTypeToContentType(xsiType: string): ContentType {
  if ((KNOWN_CONTENT_TYPES as readonly string[]).includes(xsiType)) {
    return xsiType as ContentType;
  }
  return 'contentStringListType'; // 未知の xsiType は contentStringListType にフォールバック
}

/**
 * rawProperty オブジェクトを再帰皁E�� Property 型に変換する
 * propertyListType の孁EProperty・孁EContent めEnestedProperties / contents にマッピングする
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
    // ── カード表示用フィールド（バチE��エンドから受け取るフィールドをマッピング�E�──
    plannedValue: (p.plannedValue as string | number | null | undefined) ?? undefined,
    toleranceValue: (p.toleranceValue as string | null | undefined) ?? undefined,
    uncertaintyNote: (p.uncertaintyNote as string | null | undefined) ?? undefined,
    uncertaintyKey: (p.uncertaintyKey as string | null | undefined) ?? undefined,
    uncertaintyName: (p.uncertaintyName as string | null | undefined) ?? undefined,
    qualitativeOptions: Array.isArray(p.qualitativeOptions)
      ? (p.qualitativeOptions as string[])
      : [],
    qualitativeEval: (p.qualitativeEval as string | null | undefined) ?? undefined,
    qualitativeNote: (p.qualitativeNote as string | null | undefined) ?? undefined,
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
 * チE��プレート名を解決する
 * 優先頁E��E MAIMLファイル冁E�EチE��プレート名 > チE��プレーチED
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
 * フォールバック時�E data 形弁E
 *   { templateId, templateType, properties: [{ key, xsiType, value, units }] }
 *
 * DB 実績あり時�E data 形弁E
 *   フラチE��な key-value�E��Eロパティ定義が含まれなぁE��め、フォールバックの構造を優先する！E
 */
function convertTemplateDataItemsToTemplates(items: TemplateDataItem[]): Template[] {
  return items.map((item) => {
    const category = mapTemplateTypeToCategory(item.templateType);

    // data.properties が存在する場合（フォールバック形式）�Eそこから Property[] を構篁E
    const rawData = item.data as Record<string, unknown>;
    const rawProperties = rawData.properties as Array<{
      key: string;
      xsiType: string;
      value: unknown;
      units: string | null;
    }> | undefined;

    const properties: Property[] = (rawProperties ?? [])
      // isCustomProperty: true なプロパティはチE��プレート定義欁E��表示しなぁE
      .filter((p) => !(p as Record<string, unknown>).isCustomProperty)
      .map((p) => convertRawPropertyToProperty(p as Record<string, unknown>));

    // チE��プレートトチE�Eレベルの Content めEContentField[] に変換
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

    // チE��プレートトチE�Eレベルの Insertion めEInsertionField[] に変換�E�非カスタム�E�E
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
 * MIMEタイプ文字�EめEaccept 属性斁E���Eに変換するヘルパ�E
 * 侁E "image/tiff" ↁE".tif,.tiff"
 *     "txt/ascii"  ↁE".txt"
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
 * ContentField�E�テンプレート定義・非カスタム�E�用の行追加可能な入力コンポ�EネンチE
 * Form.Item の children として使用する、E
 * フォーム値は string[]�E�各行がスペ�Eス区刁E��の列値�E�で管琁E��る、E
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
            placeholder={`衁E${rowIdx + 1}: 値をスペ�Eス区刁E��で入力（侁E 1.0 2.5 3.0�E�`}
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

interface ExperimentRecordDialogProps {
  open: boolean;
  transition: Transition | null;
  projectStatus: ProjectStatus | null;
  onClose: () => void;
  onSave: (data: ExperimentDataValue[]) => void;
  projectId?: string;
  projectName?: string;
  methodId?: string;
  taskNo?: number;
  /** みなし進捗使用フラグ�E�Erganization.use_deemed_progress�E�E false の場合�EチェチE��ボックスを非表示にしてスチE�Eタス更新を常時表示 */
  useDeemedProgress?: boolean;
}

/**
 * チE�Eタ記録ダイアログコンポ�EネンチE
 * トランジションの実験結果を記録する
 */
export default function ExperimentRecordDialog({
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
}: ExperimentRecordDialogProps) {
  const { token } = theme.useToken();
  const { t } = useLanguage();
  const [form] = Form.useForm();
  const [formData, setFormData] = useState<Record<string, ExperimentDataValue>>({});
  const [dataGrids, setDataGrids] = useState<Record<string, number[][]>>({});
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  // チE��プレート実績チE�EタのローチE��ング状慁E
  const [templateDataLoading, setTemplateDataLoading] = useState(false);
  
  // 作業持E��モーダルの状慁E
  const [instructionModalOpen, setInstructionModalOpen] = useState(false);

  // APIから取得したテンプレート一覧�E�EemplateDataItem ↁETemplate に変換済み�E�E
  const [fetchedTemplates, setFetchedTemplates] = useState<Template[]>([]);

  // APIから取得したテンプレート実績の生データ�E�ElaceId・data構造の保持に使用�E�E
  const [fetchedTemplateItems, setFetchedTemplateItems] = useState<TemplateDataItem[]>([]);

  // チE��プレート一覧用の状慁E
  const [templateSearchText, setTemplateSearchText] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<TemplateCategory | undefined>(undefined);
  const [templatesExpanded, setTemplatesExpanded] = useState(true);
  
  // チE��プレート選択状態（単一選択！E
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // プロパティ入力フォームの折りたたみ状慁E
  const [propertyFormExpanded, setPropertyFormExpanded] = useState(true);

  // スチE�Eタス更新セクションの折りたたみ状慁E
  // プロジェクト�E状態が編雁E��能でなぁE��合�E折りたたむ
  const [statusUpdateExpanded, setStatusUpdateExpanded] = useState(true);
  
  // プロジェクト�E状態が編雁E��能かどぁE��
  const isProjectEditable = projectStatus ? isEditableStatus(projectStatus) : true;

  /**
   * 現在のトランジションスチE�Eタス�E�数値�E�E
   * transition.status は型丁EProgressStatus�E�文字�E型）だが、E
   * APIレスポンスでは実際に数値�E�E-6�E�が入ってぁE��ため Number() で変換する、E
   * ExperimentRecordTab 等で数値→文字�E変換�E�侁E 5ↁEcompleted'�E�が行われる場合も
   * 斁E���EスチE�Eタスマップで数値に送E��換して正しい終端スチE�Eタス判定を行う、E
   */
  const currentStatus = useMemo((): number => {
    if (!transition || transition.status === undefined || transition.status === null) {
      return 0;
    }
    const num = Number(transition.status);
    if (!isNaN(num)) return num;

    // 斁E���EスチE�Eタス ↁE数値マッピング
    // ExperimentRecordTab.tsx の変換ルールに対忁E
    //   0: INITIAL      ↁE'not_started'
    //   1: PREPARING    ↁE'in_progress'
    //   2: READY        ↁE'in_progress'
    //   3: IN_PROGRESS  ↁE'in_progress'
    //   4: PAUSED       ↁE'on_hold'
    //   5: COMPLETED    ↁE'completed'
    //   6: ERROR        ↁE'issue'
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
   * 終端スチE�Eタス�E�完亁E�Eエラー�E�かどぁE��
   * 終端スチE�Eタスの場合�EスチE�Eタス変更不可
   */
  const isTerminalStatus = currentStatus === TransitionStatusCode.COMPLETED || currentStatus === TransitionStatusCode.ERROR;

  // スチE�Eタスとコメント用の状慁E
  // 0: 初期状慁E 1: 準備中, 2: 準備完亁E 3: 実行中, 4: 一時停止, 5: 完亁E 6: エラー
  const [selectedStatus, setSelectedStatus] = useState<TransitionStatus>(0);
  const [comment, setComment] = useState('');
  const [progress, setProgress] = useState<number>(0);
  
  // みなし進捗更新用の状慁E
  // useDeemedProgressProp ぁEfalse の場合�E初期値めEfalse にして常にスチE�Eタス更新を表示
  const [useDeemedProgress, setUseDeemedProgress] = useState(useDeemedProgressProp);

  // ===== カスタムプロパティ用 state =====
  /** ユーザーが任意追加したカスタムプロパティ一覧�E�EemplateId ↁECustomPropertyValue[]�E�E*/
  /** 非カスタム insertion のファイル管琁E��EemplateId ↁE(insertionIndex ↁEFile|null)�E�E*/
  const [insertionFiles, setInsertionFiles] = useState<Record<string, Record<number, File | null>>>({});
  /** 非カスタム insertion の既存URI�E�EemplateId ↁE(insertionIndex ↁEuri)�E�E 復允E��にセチE�� */
  const [insertionUris, setInsertionUris] = useState<Record<string, Record<number, string>>>({});

  const [customProperties, setCustomProperties] = useState<Record<string, CustomPropertyValue[]>>({});

  /**
   * 定性評価 State: templateId ↁEpropertyKey ↁE選択値
   * DataRecordDialog のカード形弁EUI で管琁E��めE
   */
  const [propertyQualitativeEvals, setPropertyQualitativeEvals] = useState<Record<string, Record<string, string>>>({});

  /**
   * 定量評価 State: templateId ↁEpropertyKey ↁEQuantitativeEval[]
   * DataRecordDialog のカード形弁EUI で管琁E��めE
   */
  const [propertyQuantitativeEvals, setPropertyQuantitativeEvals] = useState<Record<string, Record<string, QuantitativeEval[]>>>({});

  /**
   * 全スチE�Eタス選択肢�E�E() を使って多言語化�E�E
   * コンポ�Eネント�Eで定義することで useLanguage の t() を利用できる
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
   * 現在のスチE�Eタスから遷移可能なスチE�Eタスの選択肢�E�EseMemo でメモ化！E
   * ALLOWED_TRANSITIONS に基づぁE��選択肢をフィルタリングする
   * 終端スチE�Eタス�E�E: 終状態、E: 異常終亁E���E場合�E空配�E
   */
  const statusOptions = useMemo(() => {
    const allowedValues = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    return allStatusOptions.filter((opt: { value: TransitionStatus; label: string }) => allowedValues.includes(opt.value as number));
  }, [currentStatus, allStatusOptions]);

  // クライアント判宁E
  useEffect(() => {
    setIsClient(true);
  }, []);

  // チE��プレート一覧のフィルタリング
  // fetchedTemplates�E�EPIから取得�E変換済み�E�を優先し、なければ transition.templates を使用する
  const filteredTemplates = useMemo(() => {
    const source: Template[] =
      fetchedTemplates.length > 0
        ? fetchedTemplates
        : (transition?.templates ?? []);

    let filtered = source;

    // チE��プレート名でのあいまぁE��索
    if (templateSearchText) {
      filtered = filtered.filter((template) =>
        template.name.toLowerCase().includes(templateSearchText.toLowerCase())
      );
    }

    // チE��プレート種別での絞り込み
    if (selectedTemplateCategory) {
      filtered = filtered.filter((template) => template.category === selectedTemplateCategory);
    }

    return filtered;
  }, [fetchedTemplates, transition?.templates, templateSearchText, selectedTemplateCategory]);

  // 選択されたチE��プレート�Eみを取征E
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return filteredTemplates.find(template => 
      template.templateId === selectedTemplateId
    );
  }, [filteredTemplates, selectedTemplateId]);

  // チE��プレート種別のラベル変換
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
   * TemplateCategory�E�フロント）�E templateType�E�EPI�E�へのマッピング
   * Materials ↁEmaterial, Conditions ↁEcondition, Results ↁEresult
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

  // チE��プレート種別のタグ色
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

  // ダイアログを開ぁE��ときにフォームをリセチE���E�E��ンプレート実績チE�Eタを取征E
  useEffect(() => {
    if (open && transition) {
      // Form ぁEDOM に接続される前に resetFields が呼ばれると警告が出るためEtry/catch で保護
      try { form.resetFields(); } catch { /* form 未接続時は無要E*/ }
      setFormData({});
      setDataGrids({});
      // 初期値は現在のトランジションスチE�Eタスから遷移可能な最初�E選択肢を設宁E
      // 終端スチE�Eタスの場合�E選択肢がなぁE��めE0 のまま
      const allowedValues = ALLOWED_TRANSITIONS[currentStatus] ?? [];
      setSelectedStatus((allowedValues[0] ?? currentStatus) as TransitionStatus);
      setComment('');
      setProgress(0);
      setSelectedTemplateId(null);
      // prop の最新値めEstate に同期�E�EseState の初期値はマウント時のみ評価されるため毎回同期が忁E��E��E
      setUseDeemedProgress(useDeemedProgressProp);
      setFetchedTemplates([]);     // ダイアログオープン時に前回取得�EをリセチE��
      setFetchedTemplateItems([]); // GETレスポンス生データもリセチE��
      setCustomProperties({});          // カスタムプロパティをリセチE��
      setInsertionFiles({});            // 非カスタム insertion ファイルをリセチE��
      setInsertionUris({});             // 非カスタム insertion URI をリセチE��
      setPropertyQualitativeEvals({});  // 定性評価をリセチE��
      setPropertyQuantitativeEvals({}); // 定量評価をリセチE��

      // プロジェクト�E状態が編雁E��能でなぁE��合�E「スチE�Eタス更新」を折りたたむ
      setStatusUpdateExpanded(isProjectEditable);

      // 吁E��ンプレート�EDataGridを�E期化�E�Eemplateのcontentsを参照�E�E
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

      // チE��プレート実績チE�EタをAPIから取得してフォームの初期値を復允E
      // 忁E��パスパラメータが揃ってぁE��場合�Eみ実衁E
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
              // ① GETレスポンスの生データをそのまま保持�E�保存時にdata構造・placeIdを参照するため�E�E
              setFetchedTemplateItems(response.data.templates);

              // ② TemplateDataItem[] ↁETemplate[] に変換してサイドバーに表示
              const converted = convertTemplateDataItemsToTemplates(response.data.templates);
              setFetchedTemplates(converted);

              // ② 取得した実績チE�Eタをフォームフィールドに反映�E�既存値の復允E��E
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
                      // properties配�E形弁E
                      // フォールバック形式�E保存済み形式！EB保存時に properties 構造のまま保存された場合！E
                      // どちらでも統一処琁E��る。value ぁEnon-null の場合にフォームへ反映する、E
                      for (const p of rawProperties) {
                        const pKey = String(p.key ?? '');
                        const pXsiType = String((p as Record<string, unknown>).xsiType ?? '');

                        if (pXsiType === 'propertyListType') {
                          // ── ネスト子�Eロパティの value を復允E──
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
                          // ── ネスト孁EContent の value を復允E──
                          const childContents = (p as Record<string, unknown>).contents as Array<Record<string, unknown>> | undefined;
                          if (Array.isArray(childContents)) {
                            for (const nestedC of childContents) {
                              if ((nestedC as Record<string, unknown>).isCustomProperty === true) continue;
                              const nestedCKey = String(nestedC.key ?? '');
                              const nestedCVal = nestedC.value;
                              if (nestedCVal !== null && nestedCVal !== undefined) {
                                const nestedCFormKey = `${item.templateId}_${nestedCKey}`;
                                // ContentRowListInput は string[] を期征E��めE
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
                          // dateType / dateTimeType は dayjs に変換�E�EatePicker ぁEdayjs オブジェクトを期征E��るためE��E
                          if (pXsiType === 'dateType' || pXsiType === 'dateTimeType') {
                            initialValues[formKey] = dayjs(String(p.value));
                          } else {
                            initialValues[formKey] = p.value;
                          }
                        }
                      }

                      // ── トップレベル非カスタム Content の value を復允E──
                      const rawContentsTop = rawData.contents as Array<Record<string, unknown>> | undefined;
                      if (Array.isArray(rawContentsTop)) {
                        for (const c of rawContentsTop) {
                          if (c.isCustomProperty === true) continue;
                          const cKey = String(c.key ?? '');
                          const cVal = c.value;
                          if (cVal !== null && cVal !== undefined) {
                            const cFormKey = `${item.templateId}_${cKey}`;
                            // ContentRowListInput は string[] を期征E��めE
                            if (Array.isArray(cVal)) {
                              initialValues[cFormKey] = (cVal as unknown[]).map(String);
                            } else {
                              initialValues[cFormKey] = [String(cVal)];
                            }
                          }
                        }
                      }
                    } else if (item.recordedBy !== null) {
                      // 純粋なフラチE��key-value形式（封E��皁E��保存形式変更に備えて残す�E�E
                      // data ぁE{ key: value, ... } のフラチE��形式�E場合にフォームへ反映する、E
                      for (const [fieldKey, fieldValue] of Object.entries(rawData)) {
                        const formKey = `${item.templateId}_${fieldKey}`;
                        initialValues[formKey] = fieldValue;
                      }
                    }
                  }
              if (Object.keys(initialValues).length > 0) {
                form.setFieldsValue(initialValues);
              }

              // ③ 最初�EチE��プレートをサイドバーで選択状態にする
              const firstItem = response.data.templates[0];
              if (firstItem) {
                setSelectedTemplateId(firstItem.templateId);
              }

              // ④ カスタムプロパティの復允E��EemplateId ごとに刁E��！E
              // - rawData.properties の isCustomProperty: true なエントリ�E�Eroperty / insertion コンチE���E�E
              // - rawData.contents の isCustomProperty: true なエントリ�E�Eontent コンチE���E�E
              const restoredCustomPropsMap: Record<string, CustomPropertyValue[]> = {};
              for (const item of response.data.templates) {
                const rawData = item.data as Record<string, unknown>;

                // ── properties 配�Eから property コンチE��を復允E──
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
                      // 斁E���E垁E
                      'stringType', 'tokenType', 'stringEnumType',
                      // 整数垁E
                      'intType', 'longType', 'shortType', 'byteType',
                      'unsignedIntType', 'unsignedLongType', 'unsignedShortType', 'unsignedByteType',
                      // 浮動小数点垁E
                      'floatType', 'doubleType', 'decimalType',
                      // 真偽値垁E
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

                // ── insertions 配�Eから insertion コンチE��を復允E──
                // MAIML Insertion 垁E { uri, hash?: { value? }, format? } ※ key 属性なぁE
                const rawInsertions = rawData.insertions as Array<Record<string, unknown>> | undefined;
                if (Array.isArray(rawInsertions)) {
                  for (const ins of rawInsertions) {
                    if (ins.isCustomProperty !== true) continue;

                    const uri = String(ins.uri ?? '');
                    // hash は { value? } オブジェクトまた�E斁E���E�E�後方互換�E�E
                    const hashRaw = ins.hash;
                    const hashStr = hashRaw
                      ? typeof hashRaw === 'object'
                        ? String((hashRaw as Record<string, unknown>).value ?? '')
                        : String(hashRaw)
                      : '';

                    if (!restoredCustomPropsMap[item.templateId]) {
                      restoredCustomPropsMap[item.templateId] = [];
                    }
                    // URI からファイル名部刁E�Eみ抽出して value に表示用として格紁E
                    const displayName = uri.split('/').pop() || uri;
                    restoredCustomPropsMap[item.templateId].push({
                      id: `restored_ins_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      key: '', // insertion に key 属性はなぁE
                      containerType: 'insertion',
                      customType: 'insertion',
                      value: displayName, // ファイル名�Eみ表示
                      uri,               // 保存時に参�Eする URI フィールドも設定すめE
                      hash: hashStr,
                      format: String(ins.format ?? 'application/octet-stream'),
                      units: '',
                      isCustomProperty: true,
                    });
                  }
                }

                // ── contents 配�Eから content コンチE��を復允E──
                const rawContents = rawData.contents as Array<Record<string, unknown>> | undefined;
                if (Array.isArray(rawContents)) {
                  for (const c of rawContents) {
                    if (c.isCustomProperty !== true) continue;

                    const cpKey = String(c.key ?? '');
                    const xsiType = String(c.xsiType ?? 'contentStringListType');
                    // ContentType の全種別�E�EustomPropertyType の content 系として扱ぁE��E
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

                    // value めEstring[] に変換�E�各行が1行�Eスペ�Eス区刁E��値�E�E
                    // DB保存形弁E 行区刁E��は \n、�E区刁E��はスペ�Eス
                    let valueArr: string[] | null = null;
                    if (Array.isArray(c.value)) {
                      // 配�E形式�E場合�Eそ�Eまま斁E���E化（各要素1行！E
                      valueArr = (c.value as unknown[]).map(String);
                    } else if (typeof c.value === 'string' && c.value !== '') {
                      // 改行区刁E��斁E���E ↁE行�E刁E
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

              // ⑤ 非カスタム insertion の既存URI めEinsertionUris スチE�Eトに復允E
              // convertTemplateDataItemsToTemplates で InsertionField[] を構築済みだが、E
              // ファイル選択�Eタン表示・クリアボタン表示のために uri めEスチE�Eトに持つ忁E��がある
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
            // 実績チE�Eタ取得失敗�E非�E命皁E���E回記録時�E404になる！E
            // エラーメチE��ージは表示しなぁE��フォームは空の状態で開く�E�E
            console.warn('Failed to fetch template data (expected on first record):', error);
          } finally {
            setTemplateDataLoading(false);
          }
        })();
      }
    }
  }, [open, transition, form, isProjectEditable, projectId, methodId, taskNo, useDeemedProgressProp]);

  // チE��プレート保存ハンドラ
  const handleSaveTemplate = async () => {
    if (!selectedTemplate) {
      message.error(t('format.dataRecordDialog.noTemplateSelected'));
      return;
    }

    // APIに忁E��なパスパラメータのガードチェチE��
    if (!projectId || !methodId || taskNo === undefined) {
      message.error(t('format.dataRecordDialog.missingProjectInfoForSave'));
      console.error('handleSaveTemplate: projectId / methodId / taskNo not set', {
        projectId,
        methodId,
        taskNo,
      });
      return;
    }

    // ── Key重褁E��ェチE�� ───────────────────────────────────────────────────
    // 選択中チE��プレート�Eカスタムプロパティに重複Keyがある場合�E保存を中断する
    if (duplicateCustomKeys.size > 0) {
      const duplicatedList = Array.from(duplicateCustomKeys).join(', ');
      message.error(t('format.dataRecordDialog.duplicateCustomPropertyKeys', { keys: duplicatedList }));
      return;
    }

    try {
      setLoading(true);
      const values = await form.validateFields();

      const template = selectedTemplate;

      // ── GETで取得した生チE�Eタを参照 ──────────────────────────────────────
      // fetchedTemplateItems から templateId に一致するオリジナルアイチE��を検索する、E
      // これにより placeId の正確な値と、バチE��エンドが期征E��めEdata 構造を取得する、E
      const originalItem = fetchedTemplateItems.find(
        (item) => item.templateId === template.templateId
      );

      // ── data 絁E��立て ────────────────────────────────────────────────────
      // オリジナルの data をディープコピ�Eしてベ�Eスとし、E
      // フォームで変更された値のみ上書きする（構造を破壊しなぁE��、E
      const baseData: Record<string, unknown> = originalItem
        ? JSON.parse(JSON.stringify(originalItem.data))
        : {};

      if (
        baseData.properties &&
        Array.isArray(baseData.properties)
      ) {
        // フォールバック形弁E { templateId, templateType, properties: [{ key, xsiType, value, units }] }
        // properties[i].value をフォーム値で上書きすめE
        (
          baseData.properties as Array<Record<string, unknown>>
        ).forEach((p) => {
          if (p.isCustomProperty === true) return; // カスタムプロパティはスキチE�E�E�削除済みのエントリに value: null を書かなぁE��めE��E
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
            // ── ネスト子�Eロパティ�E�Eroperties 配�E�E��E value を更新 ──
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
            // ── ネスト孁EContent�E�Eontents 配�E�E��E value を更新 ──
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
        // DB実績形弁E フラチE��なkey-value
        // baseData[prop.key] をフォーム値で上書きすめE
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

      // ── トップレベル Contents�E�EaseData.contents 配�E�E��E value を更新 ──
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

      // ── 非カスタム insertion�E�テンプレート定義�E��EファイルをS3にアチE�EローチE──
      // insertionFiles[template.templateId][insIdx] に File が存在する場合�EみアチE�EロードすめE
      const tplInsertionFiles = insertionFiles[template.templateId] ?? {};
      const nonCustomInsertionUriMap: Record<number, string> = {}; // insIdx ↁEs3Key
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
          console.error(`非カスタム insertion ファイルアチE�Eロード失敁E(insIdx=${insIdx}):`, uploadErr);
          message.error(t('dataRecordDialog.attachmentUploadError', { number: String(insIdx + 1) }));
          return;
        }
      }

      // ── 非カスタム insertion の URI めEbaseData.insertions に反映 ──
      // baseData.insertions が�E列として存在する場合（フォールバック形式）�Eみ処琁E��めE
      if (Array.isArray(baseData.insertions)) {
        const nonCustomInsertions = (baseData.insertions as Array<Record<string, unknown>>).filter(
          (ins) => !ins.isCustomProperty
        );
        nonCustomInsertions.forEach((ins, insIdx) => {
          // 新規アチE�Eロード済みの s3Key があれ�E上書ぁE
          if (nonCustomInsertionUriMap[insIdx]) {
            ins.uri = nonCustomInsertionUriMap[insIdx];
          } else {
            // クリア操佁E(insertionUris[tplId][insIdx] === '') の場合�E uri を空斁E��に
            const currentUri = insertionUris[template.templateId]?.[insIdx];
            if (currentUri !== undefined) {
              ins.uri = currentUri;
            }
          }
        });
      }

      // ── insertion カスタムプロパティのファイルをS3にアチE�EローチE────────
      // cp.file が存在する行（新規選択ファイル�E��EみアチE�Eロードを実行し、E
      // 返却されぁEs3Key めEuri として CustomPropertyValue に反映する、E
      const templateCustomProps = customProperties[template.templateId] ?? [];
      const uploadedUriMap: Record<string, string> = {}; // id ↁEs3Key
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
                // アチE�Eロード後、customProperties の uri めEs3Key で更新する
                handleUpdateCustomProperty(template.templateId, cp.id, { uri: uploadedFile.s3Key, file: undefined });
              }
            } catch (uploadErr) {
            console.error(`insertion ファイルアチE�Eロード失敁E(key=${cp.key}):`, uploadErr);
            message.error(t('dataRecordDialog.fileUploadError', { key: String(cp.key || cp.value) }));
            return; // アチE�Eロード失敗時は保存中断
          }
        }
      }

      // ── カスタムプロパティめEbaseData に追訁E────────────────────────────
      // 選択中チE��プレートに紐づくカスタムプロパティのみ対象とする
      // ※ baseData.properties の有無に関わらず！Eroperty なしテンプレートも含む�E��E琁E��実行すめE
      if (templateCustomProps.length > 0) {
        // カスタムプロパティあり: クリーンアチE�E�E��E追訁E
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
          // insertion は key 属性を持たなぁE��め、key チェチE��は property/content のみに適用する
          if (!cp.key && cp.containerType !== 'insertion') continue;
          if (cp.containerType === 'content') {
              // content コンチE��は baseData.contents に追記（リセチE��済みなので push のみ�E�E
              // value は string[]�E�各行がスペ�Eス区刁E��値�E�をそ�Eまま渡ぁE
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
              // insertion コンチE��は baseData.insertions に追訁E
              // MAIML Insertion 垁E { uri, hash?: { value? }, format?, isCustomProperty }
              // ※ insertion タグに key 属性はなぁE��めEkey は保持しなぁE
              // 優先頁E��E 今回アチE�Eロード済み s3Key ↁEcp.uri�E�既存URI�E�EↁEcp.value�E�フォールバック�E�E
              const uri = uploadedUriMap[cp.id] ?? cp.uri ?? cp.value ?? '';
              if (!uri) continue; // uri が空の場合�EスキチE�E
              const insertionEntry: Record<string, unknown> = {
                uri,
                hash: cp.hash ? { value: cp.hash } : undefined,
                format: cp.format ?? 'application/octet-stream',
                isCustomProperty: true,
              };
              existingInsertions.push(insertionEntry);
            } else {
              // property コンチE��は baseData.properties に追記（リセチE��済みなので push のみ�E�E
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
        // カスタムプロパティなぁE クリーンアチE�Eのみ�E�削除を確定させる�E�E
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

      // ── 定性評価・定量評価めEproperties[i] に追訁E─────────────────────────
      if (Array.isArray(baseData.properties)) {
        (baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
          if (p.isCustomProperty === true) return;
          const pKey = String(p.key ?? '');
          const qualVal = propertyQualitativeEvals[template.templateId]?.[pKey];
          if (qualVal !== undefined) p.qualitativeEval = qualVal || null;
          const quantVals = propertyQuantitativeEvals[template.templateId]?.[pKey];
          if (quantVals !== undefined) p.quantitativeEvals = quantVals;
        });
      }

      // ── APIリクエスト用レコードを構篁E─────────────────────────────────────
      // placeId は GETレスポンスの TemplateDataItem.placeId を使用する、E
      // �E�EB一意キー: organization_id + project_id + method_id + task_no + place_id�E�E
      const record: ExperimentDataRecord = {
        placeId: originalItem?.placeId ?? template.templateId,
        templateType: mapTemplateCategoryToApiType(template.category),
        templateId: template.templateId,
        data: baseData,
        status: selectedStatus,
        comment: comment || undefined,
      };

      // バックエンドAPIへ保孁E
      await saveBatchExperimentData(projectId!, methodId, taskNo, { records: [record] });

      // onSave には保存しぁEdata めEExperimentDataValue 形式で渡ぁE
      onSave([baseData as ExperimentDataValue]);
      message.success(
        t('format.dataRecordDialog.saveSuccess', { name: template.name, status: statusOptions.find((opt) => opt.value === selectedStatus)?.label ?? '' })
      );
    } catch (error: unknown) {
      console.error('handleSaveTemplate error:', error);
      // axios エラーの場合�Eサーバ�EメチE��ージを優先表示
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

  // プロパティタイプ別の入力コンポ�Eネント生戁E
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

    // description があれ�E extra として表示するヘルパ�E
    const descriptionExtra = property.description ? (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {property.description}
      </Text>
    ) : undefined;

    // formatString から InputNumber の precision を算�E�E�侁E "%.3f" ↁE3�E�E
    const precisionFromFormat = (() => {
      if (!property.formatString) return undefined;
      const match = property.formatString.match(/\.(\d+)f/);
      return match ? parseInt(match[1], 10) : undefined;
    })();


    // ✁EPhase 3: xsi:type ベ�EスのバリチE�Eションルール
    // InputNumber / DatePicker 等�E UI 制紁E��併用することで二重チェチE��となめE
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
        message: `${property.label}は忁E��頁E��です`,
      },
    ];

    // 整数型�E浮動小数点型�E UI 制紁E��EnputNumber�E�と併せてバリチE�Eションルールも追加
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
              placeholder={`${property.label}を�E力`}
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
              placeholder={`${property.label}を�E力`}
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
              placeholder={`${property.label}を�E力`}
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
              placeholder={`値をスペ�Eス区刁E��で入力（侁E 1.0 2.5 3.0�E�`}
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
            <Input placeholder={`${property.label}を�E力`} disabled={!isProjectEditable} />
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
          刁E{colIndex + 1}
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
   * Content フィールド！EontentField�E�を 1 件描画する
   * - contentDoubleListType: DataGrid 表示
   * - それ以夁E スペ�Eス区刁E��チE��ストエリア
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

    // 全 Content 型�E送E 行追加可能なリスト（各行がスペ�Eス区刁E��の列値�E�E
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

  // ネストされたプロパティ�E�EropertyListType�E�を描画する
  // 孁EProperty�E�EestedProperties�E�と孁EContent�E�Eontents�E��E両方を表示する
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

        {/* 孁EProperty */}
        {property.nestedProperties?.map((nestedProp) => (
          <Row key={nestedProp.key} gutter={16}>
            <Col span={nestedProp.type === 'propertyListType' ? 24 : 12}>
              {renderPropertyInput(nestedProp, templateId)}
            </Col>
          </Row>
        ))}

        {/* 孁EContent */}
        {(property.contents?.length ?? 0) > 0 && (
          <div style={{ marginTop: property.nestedProperties?.length ? 8 : 0 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              Content フィールチE
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

  // ファイルアチE�EローチE
  const renderFileUpload = (property: Property, key: string) => {
    return (
      <Form.Item
        key={key}
        name={key}
        label={property.label}
        rules={[
          {
            required: property.required,
            message: `${property.label}は忁E��頁E��です`,
          },
        ]}
      >
        <Upload
          maxCount={1}
          beforeUpload={() => {
            // TODO: S3アチE�Eロード�E琁E��実裁E
            return false;
          }}
          disabled={!isProjectEditable}
        >
          <Button icon={<UploadOutlined />} disabled={!isProjectEditable}>ファイルを選抁E/Button>
        </Upload>
      </Form.Item>
    );
  };

  // ===== カスタムプロパティ操作ハンドラー =====

  /** 新しいカスタムプロパティ行を追加する�E�選択中チE��プレートに紐づける�E�E*/
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

  /** insertion 衁E ファイル選択時の処琁E��EHA256ハッシュ生�E・MIMEタイプ検�E�E�E*/
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
   * 選択中チE��プレートにおけるカスタムプロパティのKey重褁E��チE��を計算すめE
   * - チE��プレート固定�EロパティのKeyとの重褁E��検�Eする
   * - insertion コンチE���E�Eey なし）�EチェチE��対象夁E
   */
  const duplicateCustomKeys = useMemo((): Set<string> => {
    if (!selectedTemplateId) return new Set();
    const list = customProperties[selectedTemplateId] ?? [];

    // 固定�EロパティのKey一覧
    const fixedKeys = new Set(
      (selectedTemplate?.properties ?? []).map((p) => p.key)
    );

    // カスタムプロパティのKey一覧�E�Ensertion 除外�E空斁E��除外！E
    const customKeys = list
      .filter((cp) => cp.containerType !== 'insertion' && cp.key.trim() !== '')
      .map((cp) => cp.key.trim());

    // 全KeyをまとめてカウンチE
    const countMap = new Map<string, number>();
    for (const k of customKeys) {
      countMap.set(k, (countMap.get(k) ?? 0) + 1);
    }

    const duplicates = new Set<string>();

    // カスタム同士で2回以上現れるKey
    for (const [k, count] of countMap.entries()) {
      if (count > 1) duplicates.add(k);
    }

    // 固定�EロパティのKeyと被ってぁE��カスタムKey
    for (const k of customKeys) {
      if (fixedKeys.has(k)) duplicates.add(k);
    }

    return duplicates;
  }, [selectedTemplateId, customProperties, selectedTemplate]);

  /** カスタムプロパティ一覧をレンダリングする�E�選択中チE��プレート�Eも�Eだけ表示�E�E*/
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

      // こ�EカスタムプロパティのKeyが重褁E��てぁE��かどぁE��
      const isKeyDuplicate =
        cp.containerType !== 'insertion' &&
        cp.key.trim() !== '' &&
        duplicateCustomKeys.has(cp.key.trim());

      // キー名�E力（�E通！E
      const keyInput = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Input
            placeholder="キー吁E
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
              Keyが重褁E��てぁE��ぁE
            </Text>
          )}
        </div>
      );

      // 削除ボタン�E��E通！E
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

      // property / content 共通�E型セレクチE
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
          placeholder="単佁E
          value={cp.units}
          onChange={(e) => handleUpdateCustomProperty(selectedTemplateId, cp.id, { units: e.target.value })}
          style={{ width: 70 }}
          size="small"
        />
      );

      if (cp.containerType === 'content') {
        // value は string[]�E�各要素ぁE行�Eスペ�Eス区刁E��リスト！E
        // 既存値ぁEstring の場合�E単一行�E列に変換
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
            {/* 行ごとの入力エリア�E��Eはスペ�Eス区刁E���E�E*/}
            <div style={{ marginTop: 6 }}>
              {rows.map((rowVal, rowIdx) => (
                <div key={rowIdx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <TextArea
                    placeholder={`衁E${rowIdx + 1}: 値をスペ�Eス区刁E��で入力（侁E 1.0 2.5 3.0�E�`}
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

      // property の値入力（型に応じて刁E���E�E
      let valueInput: React.ReactNode;
      switch (cp.customType) {
        // property の value は常に string | null�E�Etring[][] にはならなぁE��E
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
              placeholder="日仁E
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
              placeholder="日晁E
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

  /**
   * プロパティをカード形式で描画する�E�E列グリチE��用�E�E
   * - ヘッダー: プロパティ名�ExsiType・単佁E+ 定性評価バッジ
   * - 上段2刁E 持E��値 / 許容誤差値
   * - 中段全幁E 不確かさ説昁E
   * - 実績値入劁E renderPropertyInput の中身を流用
   * - 定性評価: Button.Group�E�不確ぁE曖昧/確か！E
   * - 定量評価: 動的行リスチE
   * propertyListType のみ全幁E��Epan=24�E�、それ以外�E span=8�E�E列！E
   */
  const renderPropertyCard = (property: Property, templateId: string) => {
    const qualEval = propertyQualitativeEvals[templateId]?.[property.key] ?? null;
    const quantEvals = propertyQuantitativeEvals[templateId]?.[property.key] ?? [];

    // 定性評価バッジ�E�選択済みの場合�Eみ表示�E�E
    const qualBadgeColor: Record<string, string> = {
      certain:   'success',
      ambiguous: 'warning',
      uncertain: 'error',
    };
    const qualBadge = qualEval ? (
      <Tag color={qualBadgeColor[qualEval] ?? 'default'} style={{ marginLeft: 'auto', flexShrink: 0 }}>
        {qualEval === 'certain'   ? t('dataRecordDialog.certain')   :
         qualEval === 'ambiguous' ? t('dataRecordDialog.ambiguous') :
         qualEval === 'uncertain' ? t('dataRecordDialog.uncertain') : qualEval}
      </Tag>
    ) : null;

    // 定性評価選択肢�E�EualitativeOptions があれ�Eそれを使用、なければチE��ォルチE択！E
    const qualOptions: string[] =
      property.qualitativeOptions && property.qualitativeOptions.length > 0
        ? property.qualitativeOptions
        : ['uncertain', 'ambiguous', 'certain'];

    // 定量評価ハンドラ
    const handleAddQuant = () => {
      const newEval: QuantitativeEval = { id: `q_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, method: '', threshold: '' };
      setPropertyQuantitativeEvals((prev) => ({
        ...prev,
        [templateId]: {
          ...(prev[templateId] ?? {}),
          [property.key]: [...(prev[templateId]?.[property.key] ?? []), newEval],
        },
      }));
    };
    const handleUpdateQuant = (id: string, patch: Partial<QuantitativeEval>) => {
      setPropertyQuantitativeEvals((prev) => ({
        ...prev,
        [templateId]: {
          ...(prev[templateId] ?? {}),
          [property.key]: (prev[templateId]?.[property.key] ?? []).map((e) => e.id === id ? { ...e, ...patch } : e),
        },
      }));
    };
    const handleRemoveQuant = (id: string) => {
      setPropertyQuantitativeEvals((prev) => ({
        ...prev,
        [templateId]: {
          ...(prev[templateId] ?? {}),
          [property.key]: (prev[templateId]?.[property.key] ?? []).filter((e) => e.id !== id),
        },
      }));
    };

    const cardStyle: React.CSSProperties = {
      marginBottom: 8,
      border: `1px solid ${token.colorBorder}`,
      borderRadius: token.borderRadiusSM,
      padding: '12px',
      background: token.colorBgContainer,
    };

    return (
      <div key={`card_${templateId}_${property.key}`} style={cardStyle}>
        {/* ── ヘッダー ── */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 6 }}>
          <Text strong style={{ fontSize: 13 }}>{property.label || property.key}</Text>
          <Tag style={{ fontSize: 11, margin: 0 }}>{property.type}</Tag>
          {property.units && <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{property.units}</Tag>}
          {qualBadge}
        </div>

        {/* ── 持E��値・許容誤差値 ── */}
        {(property.plannedValue !== undefined || property.toleranceValue !== undefined || property.uncertaintyNote !== undefined) && (
          <Row gutter={8} style={{ marginBottom: 8 }}>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('dataRecordDialog.plannedValue')}</Text>
              <Text style={{ fontSize: 12 }}>{property.plannedValue !== null && property.plannedValue !== undefined ? String(property.plannedValue) : ' E}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                {property.uncertaintyName ? `${t('dataRecordDialog.toleranceValue')} (${property.uncertaintyName})` : t('dataRecordDialog.toleranceValue')}
              </Text>
              <Text style={{ fontSize: 12 }}>{property.toleranceValue ?? ' E}</Text>
            </Col>
            {property.uncertaintyNote && (
              <Col span={24} style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('dataRecordDialog.uncertaintyNote')}</Text>
                <Text style={{ fontSize: 12 }}>{property.uncertaintyNote}</Text>
              </Col>
            )}
          </Row>
        )}

        {/* ── 実績値入力（既孁ErenderPropertyInput を流用�E�E── */}
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{t('dataRecordDialog.measuredValue')}</Text>
          {renderPropertyInput(property, templateId)}
        </div>

        {/* ── 定性評価 ── */}
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{t('dataRecordDialog.qualitativeEval')}</Text>
          <Button.Group>
            {qualOptions.map((opt) => {
              const labelMap: Record<string, string> = { certain: t('dataRecordDialog.certain'), ambiguous: t('dataRecordDialog.ambiguous'), uncertain: t('dataRecordDialog.uncertain') };
              const colorMap: Record<string, string> = { certain: '#52c41a', ambiguous: '#fa8c16', uncertain: '#ff4d4f' };
              const isSelected = qualEval === opt;
              return (
                <Button
                  key={opt}
                  size="small"
                  type={isSelected ? 'primary' : 'default'}
                  style={isSelected ? { backgroundColor: colorMap[opt] ?? undefined, borderColor: colorMap[opt] ?? undefined } : {}}
                  disabled={!isProjectEditable}
                  onClick={() => {
                    setPropertyQualitativeEvals((prev) => ({
                      ...prev,
                      [templateId]: {
                        ...(prev[templateId] ?? {}),
                        [property.key]: isSelected ? '' : opt,
                      },
                    }));
                  }}
                >
                  {labelMap[opt] ?? opt}
                </Button>
              );
            })}
          </Button.Group>
        </div>

        {/* ── 定量評価 ── */}
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{t('dataRecordDialog.quantitativeEval')}</Text>
          {quantEvals.map((ev) => (
            <div key={ev.id} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
              <Input
                size="small"
                placeholder={t('dataRecordDialog.evalMethod')}
                value={ev.method}
                onChange={(e) => handleUpdateQuant(ev.id, { method: e.target.value })}
                style={{ flex: 1 }}
                disabled={!isProjectEditable}
              />
              <InputNumber
                size="small"
                placeholder={t('dataRecordDialog.threshold')}
                value={ev.threshold !== '' ? Number(ev.threshold) : undefined}
                onChange={(v) => handleUpdateQuant(ev.id, { threshold: v !== null ? String(v) : '' })}
                style={{ width: 80 }}
                disabled={!isProjectEditable}
              />
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={!isProjectEditable}
                onClick={() => handleRemoveQuant(ev.id)}
              />
            </div>
          ))}
          {isProjectEditable && (
            <Button size="small" icon={<PlusOutlined />} onClick={handleAddQuant}>
              {t('dataRecordDialog.addEval')}
            </Button>
          )}
        </div>
      </div>
    );
  };

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
          保孁E
        </Button>,
      ]}
    >
      <div>
      {/* みなし進捗更新チェチE��ボックスと作業持E��ボタン */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* useDeemedProgressProp ぁEfalse の場合�EチェチE��ボックスを非表示�E�絁E��設定で無効化！E*/}
          {useDeemedProgressProp ? (
            <Checkbox
              data-testid="deemed-progress-checkbox"
              checked={useDeemedProgress}
              onChange={(e) => setUseDeemedProgress(e.target.checked)}
            >
              みなし進捗更新
            </Checkbox>
          ) : (
            <span /> /* チェチE��ボックス非表示時�Eスペ�Eサー */
          )}
          <Button
            data-testid="instruction-button"
            icon={<InfoCircleOutlined />}
            onClick={() => setInstructionModalOpen(true)}
          >
            作業持E��
          </Button>
        </div>

        {/* スチE�Eタス更新セクション
            - useDeemedProgressProp ぁEfalse の場吁E 常時表示�E�絁E��設定でみなし進捗無効�E�E
            - useDeemedProgressProp ぁEtrue の場吁E チェチE��ボックスOFF時�Eみ表示 */}
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
                スチE�Eタス更新
              </Text>
            </div>

            {/* 折りたたみ可能なコンチE��チE*/}
            {statusUpdateExpanded && (
              <>
                {/* 上段�E�スチE�Eタス + 進捁E*/}
                <Row gutter={16}>
                  {/* スチE�Eタス */}
                  <Col span={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      スチE�Eタス
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
                          placeholder="スチE�Eタスを選抁E
                          value={selectedStatus}
                          onChange={setSelectedStatus}
                          options={statusOptions}
                          disabled={!isProjectEditable || isTerminalStatus}
                        />
                      </>
                    )}
                  </Col>

                  {/* 進捁E*/}
                  <Col span={16}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      進捁E
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

                {/* 中段�E�コメンチE*/}
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={24}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      コメンチE
                    </Text>
                    <TextArea
                      rows={3}
                      placeholder="コメントを入劁E
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      disabled={!isProjectEditable}
                    />
                  </Col>
                </Row>

                {/* 下段�E�保存�Eタン */}
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={24} style={{ textAlign: 'right' }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={loading}
                      disabled={!isProjectEditable}
                      onClick={async () => {
                        // パスパラメータのガードチェチE��
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
                          try {
                          setLoading(true);
                          await updateTransitionStatus(projectId, methodId, transition.transitionId, {
                            taskNo,
                            status: selectedStatus,
                            progressRate: progress,
                            comment: comment || undefined,
                          });
                          message.success(
                            t('format.dataRecordDialog.statusUpdated', { status: statusOptions.find(opt => opt.value === selectedStatus)?.label ?? '', progress: String(progress) })
                          );
                          // onSave を呼び出してダイアログを閉じ、親のトランジション一覧を最新状態に更新する
                          // TransitionList の handleDataSave は _data を参照しなぁE��め空配�Eを渡して問題なぁE
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
                      保孁E
                    </Button>
                  </Col>
                </Row>
              </>
            )}
          </div>
        )}

        {/* 2カラムレイアウチE サイドバー�E�テンプレート一覧�E�E+ コンチE��チE��データ記録�E�E*/}
        <Layout style={{ height: 600, background: 'transparent' }}>
          {/* 左サイドバー: チE��プレート一覧 */}
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
                    チE��プレート一覧
                  </Text>
                  <Tag color="blue">{filteredTemplates.length}件</Tag>
                </Space>
              </div>

              {/* フィルタリングエリア */}
              <Space orientation="vertical" style={{ width: '100%', marginBottom: token.marginMD }} size="small">
                <Input
                  data-testid="template-search-input"
                  placeholder="チE��プレート名で検索"
                  prefix={<SearchOutlined />}
                  value={templateSearchText}
                  onChange={(e) => setTemplateSearchText(e.target.value)}
                  allowClear
                />
                <Select
                  data-testid="template-category-select"
                  placeholder="チE��プレート種別"
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

              {/* チE�Eブル�E�実績チE�Eタ読み込み中はSpinを表示�E�E*/}
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Spin spinning={templateDataLoading} tip="実績チE�Eタ読み込み中...">
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
                        // カチE��リーからI/Oを判宁E
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
                                ({propertyCount}頁E��)
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

          {/* 右コンチE��チE チE�Eタ記録 */}
          <Content
            style={{
              background: token.colorBgLayout,
              padding: token.paddingMD,
              overflow: 'auto',
            }}
          >
            <div style={{ height: '100%' }}>
              {/* タイトル */}
              <div style={{ marginBottom: token.marginMD }}>
                <Space>
                  <FileTextOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
                  <Text strong style={{ fontSize: 16 }}>
                    チE�Eタ記録
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

              {/* フォームまた�E選択俁E��メチE��ージ */}
              <Form
                form={form}
                layout="vertical"
                autoComplete="off"
              >
              {selectedTemplate ? (
                <>
                  <div>
                    {/* プロパティをカード形弁E列グリチE��で表示 */}
                    <Row gutter={[8, 8]}>
                      {selectedTemplate.properties.map((prop) => (
                        <Col
                          key={prop.key}
                          span={prop.type === 'propertyListType' ? 24 : 8}
                        >
                          {renderPropertyCard(prop, selectedTemplate.templateId)}
                        </Col>
                      ))}
                    </Row>

                    {/* トップレベル Contents セクション�E�Eroperty と別枠で表示�E�E*/}
                    {selectedTemplate.contents && selectedTemplate.contents.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ borderTop: `1px solid #e0e0e0`, paddingTop: 12, marginBottom: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>チE�Eタ</Text>
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
                          <Text type="secondary" style={{ fontSize: 12 }}>添付ファイル�E�Ensertion�E�E/Text>
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
                              {/* 既存URIまた�E新規選択ファイル名�E表示 */}
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
                          �E�テンプレート定義外�E任意データを追加できます！E
                        </Text>
                      </div>
                      {/* 既存カスタムプロパティ行�E表示 */}
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
                  title="チE��プレートを選択してください"
                  description="左側のチE��プレート一覧から記録したぁE��ンプレートを選択してください、E
                  type="info"
                  showIcon
                />
              )}
              </Form>
            </div>
          </Content>
        </Layout>

      </div>

      {/* 作業持E��モーダル */}
      <InstructionConfirmationModal
        open={instructionModalOpen}
        transition={transition}
        projectId={projectId}
        methodId={methodId}
        projectStatus={projectStatus}
        onCancel={() => setInstructionModalOpen(false)}
      />
    </Modal>
  );
}
