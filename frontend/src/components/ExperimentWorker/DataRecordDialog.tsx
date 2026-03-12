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
  Collapse,
  theme,
  Select,
  Card,
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
  ExperimentDataValue,
  Transition,
  Template,
  TemplateCategory,
  TransitionStatus,
  ProjectStatus,
  isEditableStatus,
} from '@/types/experimentWorker';

/**
 * ステータス遷移ルール（progressService.ts の ALLOWED_TRANSITIONS と同一）
 * キー: 現在のステータス値（数値）
 * 値: 遷移可能なステータス値の配列（数値）
 */
const ALLOWED_TRANSITIONS: Record<number, number[]> = {
  0: [1, 5, 6],       // 初期状態 → 準備状態、終状態、異常終了
  1: [2, 5, 6],       // 準備状態 → 準備完了、終状態、異常終了
  2: [2, 3, 5, 6],    // 準備完了 → 準備完了（自己遷移）、動作状態、終状態、異常終了
  3: [4, 5, 6],       // 動作状態 → 休止状態、終状態、異常終了
  4: [3, 5, 6],       // 休止状態 → 動作状態、終状態、異常終了
  5: [],              // 終状態 → 変更不可
  6: [],              // 異常終了 → 変更不可
};

/**
 * 全ステータスの定義
 */
const ALL_STATUS_OPTIONS: { value: TransitionStatus; label: string }[] = [
  { value: 0 as TransitionStatus, label: '初期状態' },
  { value: 1 as TransitionStatus, label: '準備状態' },
  { value: 2 as TransitionStatus, label: '準備完了状態' },
  { value: 3 as TransitionStatus, label: '動作状態' },
  { value: 4 as TransitionStatus, label: '休止状態' },
  { value: 5 as TransitionStatus, label: '終状態' },
  { value: 6 as TransitionStatus, label: '異常終了状態' },
];
import { saveBatchExperimentData, getTemplateData } from '@/services/experimentDataApiService';
import { updateTransitionStatus } from '@/services/projectApiService';
import { ExperimentDataRecord, TemplateDataItem } from '@/types/api';
import InstructionConfirmationModal from './InstructionConfirmationModal';

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

/**
 * API の xsiType 文字列をフロントの PropertyType にマッピングする
 */
function mapXsiTypeToPropertyType(xsiType: string): import('@/types/experimentWorker').PropertyType {
  const known = [
    'stringType', 'intType', 'floatType', 'booleanType',
    'dateType', 'dateTimeType', 'contentDoubleListType', 'propertyListType', 'insertion',
  ] as const;
  if ((known as readonly string[]).includes(xsiType)) {
    return xsiType as import('@/types/experimentWorker').PropertyType;
  }
  return 'stringType'; // 未知の xsiType は stringType にフォールバック
}

/**
 * templateType からデフォルトのテンプレート名を生成する
 */
function buildTemplateName(templateType: string, templateId: string): string {
  switch (templateType) {
    case 'material':  return `材料テンプレート`;
    case 'condition': return `条件テンプレート`;
    case 'result':    return `結果テンプレート`;
    default:          return templateId;
  }
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

    const properties: Property[] = (rawProperties ?? []).map((p) => ({
      key: p.key,
      label: p.key,                          // ラベルはキーをそのまま使用
      type: mapXsiTypeToPropertyType(p.xsiType),
      units: p.units ?? undefined,
      required: false,
    }));

    const name = buildTemplateName(item.templateType, item.templateId);

    return {
      templateId: item.templateId,
      category,
      name,
      properties,
    } satisfies Template;
  });
}

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Sider, Content } = Layout;

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
}: DataRecordDialogProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [formData, setFormData] = useState<Record<string, ExperimentDataValue>>({});
  const [dataGrids, setDataGrids] = useState<Record<string, number[][]>>({});
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  // テンプレート実績データのローディング状態
  const [templateDataLoading, setTemplateDataLoading] = useState(false);
  
  // 作業指示モーダルの状態
  const [instructionModalOpen, setInstructionModalOpen] = useState(false);

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
  
  // プロジェクトの状態が編集可能かどうか
  const isProjectEditable = projectStatus ? isEditableStatus(projectStatus) : true;

  /**
   * 現在のトランジションステータス（数値）
   * transition.status は型上 ProgressStatus（文字列型）だが、
   * APIレスポンスでは実際に数値（0-6）が入っているため Number() で変換する
   */
  const currentStatus = useMemo((): number => {
    if (!transition || transition.status === undefined || transition.status === null) {
      return 0;
    }
    const num = Number(transition.status);
    return isNaN(num) ? 0 : num;
  }, [transition]);

  /**
   * 終端ステータス（完了・エラー）かどうか
   * 終端ステータスの場合はステータス変更不可
   */
  const isTerminalStatus = currentStatus === 5 || currentStatus === 6;

  // ステータスとコメント用の状態
  // 0: 初期状態, 1: 準備中, 2: 準備完了, 3: 実行中, 4: 一時停止, 5: 完了, 6: エラー
  const [selectedStatus, setSelectedStatus] = useState<TransitionStatus>(0);
  const [comment, setComment] = useState('');
  const [progress, setProgress] = useState<number>(0);
  
  // みなし進捗更新用の状態
  // useDeemedProgressProp が false の場合は初期値を false にして常にステータス更新を表示
  const [useDeemedProgress, setUseDeemedProgress] = useState(useDeemedProgressProp);

  /**
   * 現在のステータスから遷移可能なステータスの選択肢（useMemo でメモ化）
   * ALLOWED_TRANSITIONS に基づいて選択肢をフィルタリングする
   * 終端ステータス（5: 終状態、6: 異常終了）の場合は空配列
   */
  const statusOptions = useMemo(() => {
    const allowedValues = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    return ALL_STATUS_OPTIONS.filter(opt => allowedValues.includes(opt.value as number));
  }, [currentStatus]);

  // クライアント判定
  useEffect(() => {
    setIsClient(true);
  }, []);

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
        return '材料';
      case 'Conditions':
        return '条件';
      case 'Results':
        return '結果';
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
      form.resetFields();
      setFormData({});
      setDataGrids({});
      // 初期値は現在のトランジションステータスから遷移可能な最初の選択肢を設定
      // 終端ステータスの場合は選択肢がないため 0 のまま
      const allowedValues = ALLOWED_TRANSITIONS[currentStatus] ?? [];
      setSelectedStatus((allowedValues[0] ?? 0) as TransitionStatus);
      setComment('');
      setProgress(0);
      setSelectedTemplateId(null);
      // prop の最新値を state に同期（useState の初期値はマウント時のみ評価されるため毎回同期が必要）
      setUseDeemedProgress(useDeemedProgressProp);
      setFetchedTemplates([]);     // ダイアログオープン時に前回取得分をリセット
      setFetchedTemplateItems([]); // GETレスポンス生データもリセット

      // プロジェクトの状態が編集可能でない場合は「ステータス更新」を折りたたむ
      setStatusUpdateExpanded(isProjectEditable);

      // 各テンプレートのDataGridを初期化
      transition.templates?.forEach((template) => {
        template.properties.forEach((prop) => {
          if (prop.type === 'contentDoubleListType') {
            setDataGrids((prev) => ({
              ...prev,
              [`${template.templateId}_${prop.key}`]: [[0, 0, 0]],
            }));
          }
        });
      });

      // テンプレート実績データをAPIから取得してフォームの初期値を復元
      // 必須パスパラメータが揃っている場合のみ実行
      if (projectName && methodId && taskNo !== undefined && transition.transitionId) {
        (async () => {
          try {
            setTemplateDataLoading(true);
            const response = await getTemplateData(
              projectName,
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
                        if (p.value !== null && p.value !== undefined) {
                          const formKey = `${item.templateId}_${p.key}`;
                          // dateType / dateTimeType は dayjs に変換（DatePicker が dayjs オブジェクトを期待するため）
                          if (p.xsiType === 'dateType' || p.xsiType === 'dateTimeType') {
                            initialValues[formKey] = dayjs(String(p.value));
                          } else {
                            initialValues[formKey] = p.value;
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
                form.setFieldsValue(initialValues);
              }

              // ③ 最初のテンプレートをサイドバーで選択状態にする
              const firstItem = response.data.templates[0];
              if (firstItem) {
                setSelectedTemplateId(firstItem.templateId);
              }
            }
          } catch (error) {
            // 実績データ取得失敗は非致命的（初回記録時は404になる）
            // エラーメッセージは表示しない（フォームは空の状態で開く）
            console.warn('テンプレート実績データの取得に失敗しました（初回記録の場合は正常）:', error);
          } finally {
            setTemplateDataLoading(false);
          }
        })();
      }
    }
  }, [open, transition, form, isProjectEditable, projectName, methodId, taskNo, useDeemedProgressProp]);

  // テンプレート保存ハンドラ
  const handleSaveTemplate = async () => {
    if (!selectedTemplate) {
      message.error('テンプレートが選択されていません');
      return;
    }

    // APIに必要なパスパラメータのガードチェック
    if (!projectName || !methodId || taskNo === undefined) {
      message.error('保存に必要なプロジェクト情報が不足しています');
      console.error('handleSaveTemplate: projectName / methodId / taskNo が未設定', {
        projectName,
        methodId,
        taskNo,
      });
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
          baseData.properties as Array<{
            key: string;
            xsiType: string;
            value: unknown;
            units: string | null;
          }>
        ).forEach((p) => {
          const formKey = `${template.templateId}_${p.key}`;
          if (p.xsiType === 'dateType') {
            const v = values[formKey];
            p.value = v ? dayjs(v).format('YYYY-MM-DD') : null;
          } else if (p.xsiType === 'dateTimeType') {
            const v = values[formKey];
            p.value = v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : null;
          } else if (p.xsiType === 'contentDoubleListType') {
            p.value = dataGrids[formKey] ?? null;
          } else {
            p.value = values[formKey] ?? null;
          }
        });
      } else {
        // DB実績形式: フラットなkey-value
        // baseData[prop.key] をフォーム値で上書きする
        template.properties.forEach((prop) => {
          const formKey = `${template.templateId}_${prop.key}`;
          if (prop.type === 'contentDoubleListType') {
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
      await saveBatchExperimentData(projectName, methodId, taskNo, { records: [record] });

      // onSave には保存した data を ExperimentDataValue 形式で渡す
      onSave([baseData as ExperimentDataValue]);
      message.success(
        `「${template.name}」を保存しました（ステータス: ${statusOptions.find((opt) => opt.value === selectedStatus)?.label}）`
      );
    } catch (error: unknown) {
      console.error('handleSaveTemplate error:', error);
      // axios エラーの場合はサーバーメッセージを優先表示
      const axiosError = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const serverMessage = axiosError?.response?.data?.error?.message;
      if (serverMessage) {
        message.error(`保存に失敗しました: ${serverMessage}`);
      } else if (axiosError?.message) {
        message.error(`保存に失敗しました: ${axiosError.message}`);
      } else {
        message.error('入力内容を確認してください');
      }
    } finally {
      setLoading(false);
    }
  };

  // フォーム送信ハンドラ
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // テンプレートごとにデータをまとめる
      const recordsData: ExperimentDataValue[] = [];
      
      transition?.templates?.forEach((template) => {
        const templateData: ExperimentDataValue = {
          templateId: template.templateId,
          category: template.category,
        };
        
        template.properties.forEach((prop) => {
          const key = `${template.templateId}_${prop.key}`;
          if (prop.type === 'contentDoubleListType') {
            templateData[prop.key] = dataGrids[key] || [[0, 0, 0]];
          } else if (prop.type === 'dateType' || prop.type === 'dateTimeType') {
            const dateValue = values[key];
            templateData[prop.key] = dateValue ? dayjs(dateValue).format(
              prop.type === 'dateType' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss'
            ) : null;
          } else {
            templateData[prop.key] = values[key] ?? null;
          }
        });
        
        recordsData.push(templateData);
      });
      
      // ステータスとコメントをログ出力（バックエンド実装時に使用）
      console.log('保存データ:', {
        transitionId: transition?.transitionId,
        status: selectedStatus,
        comment: comment,
        experimentData: recordsData,
      });
      
      onSave(recordsData);
      message.success(`実験データを保存しました（ステータス: ${statusOptions.find(opt => opt.value === selectedStatus)?.label}）`);
      onClose();
    } catch (error) {
      console.error('Validation failed:', error);
      message.error('入力内容を確認してください');
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
      </>
    );

    const rules = [
      {
        required: property.required,
        message: `${property.label}は必須項目です`,
      },
    ];

    switch (property.type) {
      case 'stringType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
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
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
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
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            rules={rules}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder={`${property.label}を入力`}
              min={property.min}
              max={property.max}
              step={0.01}
              precision={2}
              disabled={!isProjectEditable}
            />
          </Form.Item>
        );

      case 'booleanType':
        return (
          <Form.Item
            key={key}
            name={key}
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

      case 'contentDoubleListType':
        return renderDataGrid(property, key);

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
        <Space direction="vertical" style={{ width: '100%' }} size="small">
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

  // ネストされたプロパティ
  const renderNestedProperties = (property: Property, templateId: string) => {
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
        </Title>
        {property.nestedProperties?.map((nestedProp) =>
          renderPropertyInput(nestedProp, templateId)
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
          beforeUpload={(file) => {
            // TODO: S3アップロード処理を実装
            message.info(`${file.name}をアップロードします（未実装）`);
            return false;
          }}
          disabled={!isProjectEditable}
        >
          <Button icon={<UploadOutlined />} disabled={!isProjectEditable}>ファイルを選択</Button>
        </Upload>
      </Form.Item>
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
          保存
        </Button>,
      ]}
    >
      <div>
      {/* みなし進捗更新チェックボックスと作業指示ボタン */}
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
                e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
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
                        message={`現在のステータスは「${ALL_STATUS_OPTIONS.find(o => o.value === currentStatus)?.label}」です。これ以上変更できません。`}
                        type="warning"
                        showIcon
                        style={{ marginBottom: 0 }}
                      />
                    ) : statusOptions.length === 0 ? (
                      <Alert
                        message="遷移可能なステータスがありません"
                        type="info"
                        showIcon
                        style={{ marginBottom: 0 }}
                      />
                    ) : (
                      <>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                          現在: {ALL_STATUS_OPTIONS.find(o => o.value === currentStatus)?.label ?? '不明'}
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
                      onClick={async () => {
                        // パスパラメータのガードチェック
                        if (!projectName || !methodId || !transition?.transitionId || taskNo === undefined) {
                          message.error('更新に必要なプロジェクト情報が不足しています');
                          console.error('ステータス更新: projectName / methodId / transitionId / taskNo が未設定', {
                            projectName,
                            methodId,
                            transitionId: transition?.transitionId,
                            taskNo,
                          });
                          return;
                        }
                        try {
                          setLoading(true);
                          await updateTransitionStatus(projectName, methodId, transition.transitionId, {
                            taskNo,
                            status: selectedStatus,
                            progressRate: progress,
                            comment: comment || undefined,
                          });
                          message.success(
                            `ステータスを更新しました（${statusOptions.find(opt => opt.value === selectedStatus)?.label}、進捗: ${progress}%）`
                          );
                        } catch (error: unknown) {
                          console.error('ステータス更新エラー:', error);
                          const axiosError = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
                          const serverMessage = axiosError?.response?.data?.error?.message;
                          if (serverMessage) {
                            message.error(`更新に失敗しました: ${serverMessage}`);
                          } else if (axiosError?.message) {
                            message.error(`更新に失敗しました: ${axiosError.message}`);
                          } else {
                            message.error('ステータスの更新に失敗しました');
                          }
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      保存
                    </Button>
                  </Col>
                </Row>
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
              <Space direction="vertical" style={{ width: '100%', marginBottom: token.marginMD }} size="small">
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
                    { label: '材料', value: 'Materials' },
                    { label: '条件', value: 'Conditions' },
                    { label: '結果', value: 'Results' },
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
                      title: 'テンプレート',
                      dataIndex: 'name',
                      key: 'name',
                      render: (name: string, record: Template) => {
                        // カテゴリーからI/Oを判定
                        const isOutput = record.category === 'Results';
                        const ioLabel = isOutput ? 'OUT' : 'IN';
                        const ioColor = isOutput ? 'green' : 'blue';
                        const propertyCount = record.properties?.length || 0;
                        
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
              overflow: 'auto',
            }}
          >
            <div style={{ height: '100%' }}>
              {/* タイトル */}
              <div style={{ marginBottom: token.marginMD }}>
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

              {/* フォームまたは選択促進メッセージ */}
              {selectedTemplate ? (
                <Form
                  form={form}
                  layout="vertical"
                  autoComplete="off"
                >
                  <Row gutter={16}>
                    {selectedTemplate.properties.map((prop) => (
                      <Col
                        key={prop.key}
                        span={
                          prop.type === 'contentDoubleListType' ||
                          prop.type === 'propertyListType'
                            ? 24
                            : 12
                        }
                      >
                        {renderPropertyInput(prop, selectedTemplate.templateId)}
                      </Col>
                    ))}
                  </Row>
                </Form>
              ) : (
                <Alert
                  message="テンプレートを選択してください"
                  description="左側のテンプレート一覧から記録したいテンプレートを選択してください。"
                  type="info"
                  showIcon
                />
              )}
            </div>
          </Content>
        </Layout>

      </div>

      {/* 作業指示モーダル */}
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
