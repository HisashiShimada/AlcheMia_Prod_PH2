/**
 * InstructionEditDialog.tsx
 * 単一指示の編集/追加ダイアログコンポーネント
 * InstructionDialogの指示入力部分を独立させたコンポーネント
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  Space,
  Typography,
  Alert,
  Card,
  theme,
  Button,
} from 'antd';
import {
  FileTextOutlined,
  AimOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import type {
  InstructionData,
  TransitionInfo,
  INSTRUCTION_TYPES,
  INSTRUCTION_PRIORITIES,
  TARGET_TYPES,
} from '@/types/instructionRegistration';
import type { TaskDetail, MethodInfo } from '@/types/taskRegistration';
import { useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import { getMultipleSelectOptions } from '@/services/codeMasterApiService';
import type { SelectOption } from '@/types/common';
import {
  ExperimentCondition,
  InstructionTypeCode,
  InstructionPriority,
  InstructionTarget,
} from '@/constants/codeMaster';

const { Text } = Typography;
const { TextArea } = Input;
const { useToken } = theme;



/**
 * 指示編集ダイアログのプロパティ
 */
interface InstructionEditDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  instruction?: InstructionData;
  tasks: TaskDetail[];
  availableMethods?: MethodInfo[];
  availableTransitions: TransitionInfo[];
  onClose: () => void;
  onSave: (instruction: InstructionData, keepDialogOpen?: boolean) => void;
  /**
   * 固定するメソッドID（指定時はメソッド選択を無効化）
   * タスク登録タブから指示追加する際に使用
   */
  fixedMethodId?: string;
  /**
   * 保存モード
   * - 'immediate': 即時DB保存（指示登録タブのデフォルト動作）
   * - 'local': ローカルstateに保存（タスク登録タブで使用）
   */
  saveMode?: 'immediate' | 'local';
}

/**
 * 単一指示の編集/追加ダイアログコンポーネント
 */
const InstructionEditDialog: React.FC<InstructionEditDialogProps> = ({
  open,
  mode,
  instruction,
  tasks,
  availableMethods,
  availableTransitions,
  onClose,
  onSave,
  fixedMethodId,
  saveMode = 'immediate',
}) => {
  const { token } = useToken();
  const { t } = useLanguage();
  const [form] = Form.useForm();
  const { maimlRoot } = useProjectMaiml();

  // 状態管理
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [selectedTaskNumber, setSelectedTaskNumber] = useState<number | undefined>(undefined);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string>('');
  const [priorityOptions, setPriorityOptions] = useState<SelectOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<SelectOption[]>([]);
  const [isLoadingCodeMaster, setIsLoadingCodeMaster] = useState<boolean>(false);

  /**
   * コードマスタから優先度・タイプを取得
   */
  useEffect(() => {
    const fetchCodeMasterOptions = async () => {
      try {
        setIsLoadingCodeMaster(true);
        const options = await getMultipleSelectOptions([
          'instruction_priority',
          'instruction_type'
        ]);
        
        setPriorityOptions(options.instruction_priority || []);
        setTypeOptions(options.instruction_type || []);
      } catch (error) {
        console.error('コードマスタ取得エラー:', error);
        // フォールバック: 空配列（ハードコードされた値を使用）
        setPriorityOptions([]);
        setTypeOptions([]);
      } finally {
        setIsLoadingCodeMaster(false);
      }
    };

    fetchCodeMasterOptions();
  }, []);

  /**
   * メソッド選択時にトランジションを動的にフィルタリング
   */
  const filteredTransitions = React.useMemo((): TransitionInfo[] => {
    if (!selectedMethodId || !maimlRoot?.protocol?.methods) {
      return [];
    }
    
    const method = maimlRoot.protocol.methods.find(m => m.id === selectedMethodId);
    if (!method?.pnml?.transitions) {
      return [];
    }
    
    return method.pnml.transitions.map((transition) => ({
      id: transition.id,
      displayName: transition.name || transition.id,
      category: 'other',
      description: transition.description,
      isExperimentRelevant: true,
    }));
  }, [selectedMethodId, maimlRoot]);

  /**
   * ダイアログが開かれたときの初期化
   */
  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && instruction) {
      // 編集モード：既存データをフォームに設定
      form.setFieldsValue({
        priority: instruction.priority,
        type: instruction.type,
        methodId: instruction.methodId,
        taskNumber: instruction.taskNumber,
        transitionId: instruction.transitionId,
        content: instruction.content,
      });
      // 状態は初期化時のみ更新（cascading renderを避ける）
      setSelectedMethodId(instruction.methodId);
      setSelectedTaskNumber(instruction.taskNumber);
      setSelectedTransitionId(instruction.transitionId);
    } else {
      // 新規作成モード：初期値を設定
      const initialMethodId = fixedMethodId || '';
      form.setFieldsValue({
        priority: InstructionPriority.NORMAL,
        type: InstructionTypeCode.GENERAL,
        methodId: initialMethodId,
        taskNumber: undefined,
        transitionId: '',
        content: '',
      });
      setSelectedMethodId(initialMethodId);
      setSelectedTaskNumber(undefined);
      setSelectedTransitionId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fixedMethodId]);

  /**
   * メソッド選択時
   */
  const handleMethodChange = useCallback((value: string) => {
    setSelectedMethodId(value);
    // トランジションとタスク番号をリセット
    setSelectedTransitionId('');
    setSelectedTaskNumber(undefined);
    form.setFieldsValue({
      transitionId: '',
      taskNumber: undefined,
    });
  }, [form]);

  /**
   * 選択されたメソッドに対応するタスク一覧を取得
   */
  const methodTasks = React.useMemo(() => {
    return tasks.filter(t => t.methodId === selectedMethodId);
  }, [tasks, selectedMethodId]);

  /**
   * 選択されたタスクの情報を取得（最初のタスクを使用）
   */
  const selectedTask = methodTasks.length > 0 ? methodTasks[0] : undefined;

  /**
   * 選択されたメソッド情報を取得
   */
  const selectedMethod = availableMethods?.find(m => m.id === selectedMethodId);

  /**
   * 選択されたトランジション情報を取得
   */
  const selectedTransition = filteredTransitions.find(t => t.id === selectedTransitionId);

  /**
   * 保存ハンドラ（共通処理）
   */
  const saveInstruction = useCallback(async (keepDialogOpen: boolean) => {
    try {
      const values = await form.validateFields();

      // バリデーション
      if (!values.content || values.content.trim() === '') {
        form.setFields([
          {
            name: 'content',
            errors: [t('instruction.contentRequired')],
          },
        ]);
        return;
      }

      // 指示データを構築
      const instructionData: InstructionData = {
        id: instruction?.id || Date.now(), // 編集時は既存ID、新規時は現在時刻
        content: values.content.trim(),
        priority: values.priority,
        type: values.type,
        targetType: InstructionTarget.ENTIRE_FILE, // デフォルト
        methodId: values.methodId || selectedMethodId || '',
        transitionId: values.transitionId || '',
        taskNumber: values.taskNumber,
      };

      // 対象タイプを判定
      if (instructionData.transitionId) {
        instructionData.targetType = InstructionTarget.SPECIFIC_TRANSITION;
      } else if (instructionData.taskNumber !== undefined) {
        instructionData.targetType = InstructionTarget.SPECIFIC_TASK;
      } else if (instructionData.methodId) {
        instructionData.targetType = InstructionTarget.ENTIRE_FILE; // メソッド指示はFILE扱い（バックエンドと一致）
      } else {
        instructionData.targetType = InstructionTarget.ENTIRE_FILE;
      }

      // 保存コールバック
      onSave(instructionData, keepDialogOpen);

      // ダイアログを開いたままにする場合のみフォームをリセット
      if (keepDialogOpen) {
        // メソッドIDを保持
        const currentMethodId = values.methodId || '';
        
        form.resetFields();
        form.setFieldsValue({
          priority: InstructionPriority.NORMAL,
          type: InstructionTypeCode.GENERAL,
          methodId: currentMethodId, // メソッドIDを引き継ぐ
          taskNumber: undefined,
          transitionId: '',
          content: '',
        });
        // メソッドIDは保持、トランジションとタスク番号のみリセット
        setSelectedMethodId(currentMethodId);
        setSelectedTaskNumber(undefined);
        setSelectedTransitionId('');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [form, instruction, onSave]);

  /**
   * 保存ハンドラ
   */
  const handleSave = useCallback(async () => {
    await saveInstruction(false);
  }, [saveInstruction]);

  /**
   * 保存して連続指示ハンドラ
   */
  const handleSaveAndContinue = useCallback(async () => {
    await saveInstruction(true);
  }, [saveInstruction]);

  /**
   * キャンセルハンドラ
   */
  const handleCancel = useCallback(() => {
    form.resetFields();
    setSelectedMethodId('');
    setSelectedTaskNumber(undefined);
    setSelectedTransitionId('');
    onClose();
  }, [form, onClose]);

  // 送信済フラグの確認
  const isSentInstruction = instruction?.isSent === true;

  return (
    <Modal
      data-testid="instruction-edit-dialog"
      title={isSentInstruction ? t('instructionEditDialog.titleDetail') : mode === 'create' ? t('instructionEditDialog.titleCreate') : t('instructionEditDialog.titleEdit')}
      open={open}
      onCancel={handleCancel}
      width={700}
      footer={
        isSentInstruction ? [
          // 送信済：閉じるボタンのみ
          <Button key="close" type="default" onClick={handleCancel}>
            {t('common.close')}
          </Button>,
        ] : [
          // 未送信：通常のフッター
          <Button key="cancel" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>,
          mode === 'create' && (
            <Button
              key="saveAndContinue"
              type="default"
              icon={<PlusOutlined />}
              onClick={handleSaveAndContinue}
            >
              {t('instructionEditDialog.saveAndContinueButton')}
            </Button>
          ),
          <Button
            key="save"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleSave}
            data-testid="instruction-edit-dialog-save-button"
          >
            {t('instructionEditDialog.saveButton')}
          </Button>,
        ]
      }
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: token.marginSM }}
      >
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
          {/* methodIdをhiddenフィールドとして保持 */}
          <Form.Item name="methodId" hidden>
            <Input />
          </Form.Item>

          {/* 指示対象（表示のみ） */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
              {t('instructionEditDialog.targetLabel')}
            </Text>
            <Card size="small" style={{ backgroundColor: token.colorPrimaryBg }}>
              <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                {selectedMethodId ? (
                  <>
                    <Text strong style={{ fontSize: '16px' }}>
                      <AimOutlined /> {selectedMethod?.displayName || selectedMethodId}
                    </Text>
                    {selectedMethod?.description && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {selectedMethod.description}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text>
                    <FileTextOutlined /> {t('instructionEditDialog.wholeProject')}
                  </Text>
                )}
              </Space>
            </Card>
          </div>

          {/* 優先度 */}
          <Form.Item
            name="priority"
            label={t('instructionEditDialog.priorityLabel')}
            rules={[{ required: true, message: t('instructionEditDialog.priorityRequired') }]}
          >
            <Select 
              style={{ width: '100%' }} 
              disabled={isSentInstruction}
              loading={isLoadingCodeMaster}
            >
              {priorityOptions.length > 0 ? (
                priorityOptions.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))
              ) : (
                // フォールバック: ハードコードされた値
                <>
                  <Select.Option value={InstructionPriority.HIGH}>{t('instruction.priority.high')}</Select.Option>
                  <Select.Option value={InstructionPriority.MEDIUM}>{t('instruction.priority.medium')}</Select.Option>
                  <Select.Option value={InstructionPriority.NORMAL}>{t('instruction.priority.normal')}</Select.Option>
                  <Select.Option value={InstructionPriority.LOW}>{t('instruction.priority.low')}</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>

          {/* タイプ */}
          <Form.Item
            name="type"
            label={t('instructionEditDialog.typeLabel')}
            rules={[{ required: true, message: t('instructionEditDialog.typeRequired') }]}
          >
            <Select 
              style={{ width: '100%' }} 
              disabled={isSentInstruction}
              loading={isLoadingCodeMaster}
            >
              {typeOptions.length > 0 ? (
                typeOptions.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))
              ) : (
                // フォールバック: ハードコードされた値
                <>
                  <Select.Option value={InstructionTypeCode.GENERAL}>{t('instruction.type.general')}</Select.Option>
                  <Select.Option value={InstructionTypeCode.SETUP}>{t('instruction.type.setup')}</Select.Option>
                  <Select.Option value={InstructionTypeCode.MEASUREMENT}>{t('instruction.type.measurement')}</Select.Option>
                  <Select.Option value={InstructionTypeCode.SAFETY}>{t('instruction.type.safety')}</Select.Option>
                  <Select.Option value={InstructionTypeCode.CLEANING}>{t('instruction.type.cleaning')}</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>

          {/* 対象タスク */}
          <Form.Item
            name="taskNumber"
            label={t('instructionEditDialog.taskLabel')}
          >
            <Select
              placeholder={t('instructionEditDialog.taskPlaceholder')}
              disabled={isSentInstruction || !selectedMethodId || !selectedTask || selectedTask.experimentCondition !== ExperimentCondition.INDIVIDUAL_CONDITIONS}
              allowClear
            >
              {selectedTask?.taskNumberOptions.map((taskNum) => (
                <Select.Option key={taskNum} value={taskNum}>
                  {t('instructionEditDialog.taskOption').replace('{taskNum}', String(taskNum))}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* トランジションID */}
          <Form.Item
            name="transitionId"
            label={t('instructionEditDialog.transitionLabel')}
          >
            <Select
              placeholder={t('instructionEditDialog.transitionPlaceholder')}
              disabled={isSentInstruction || !selectedMethodId}
              onChange={(value) => setSelectedTransitionId(value)}
              allowClear
            >
              {filteredTransitions.map((transition) => (
                <Select.Option key={transition.id} value={transition.id}>
                  {transition.isExperimentRelevant && '⭐ '}
                  {transition.displayName}
                  {transition.category !== 'other' && ` [${transition.category}]`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 選択されたトランジションの詳細 */}
          {selectedTransition && (
            <Alert
              title={
                <Space orientation="vertical" size="small">
                  <Text>
                    <Text strong>{t('instructionEditDialog.alertSelected')}</Text> {selectedTransition.displayName}
                  </Text>
                  <Text>
                    <Text strong>{t('instructionEditDialog.alertCategory')}</Text> {selectedTransition.category}
                  </Text>
                  {selectedTransition.description && (
                    <Text>
                      <Text strong>{t('instructionEditDialog.alertDescription')}</Text> {selectedTransition.description}
                    </Text>
                  )}
                </Space>
              }
              type="success"
              showIcon
            />
          )}

          {/* 指示内容 */}
          <Form.Item
            name="content"
            label={
              <>
                {t('instructionEditDialog.contentLabel')} {!isSentInstruction && <Text type="danger">*</Text>}
              </>
            }
            rules={[
              { required: true, message: t('instructionEditDialog.contentRequired') },
              { max: 1000, message: t('instructionEditDialog.contentMaxLength') },
            ]}
          >
          <TextArea
              placeholder={t('instructionEditDialog.contentPlaceholder')}
              rows={6}
              showCount
              maxLength={1000}
              disabled={isSentInstruction}
              data-testid="instruction-edit-dialog-content"
            />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
};

export default InstructionEditDialog;
