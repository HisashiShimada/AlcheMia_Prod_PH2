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
  SaveOutlined,
} from '@ant-design/icons';
import type {
  InstructionData,
  TransitionInfo,
  INSTRUCTION_TYPES,
  INSTRUCTION_PRIORITIES,
  TARGET_TYPES,
} from '@/types/instructionRegistration';
import type { TaskDetail, MethodInfo } from '@/types/taskRegistration';
import { useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import { getMultipleSelectOptions, type SelectOption } from '@/services/codeMasterApiService';

const { Text } = Typography;
const { TextArea } = Input;
const { useToken } = theme;

/**
 * 指示タイプの定数（code_master.instruction_type の code_value）
 */
const INSTRUCTION_TYPES_LOCAL = {
  GENERAL: 0,
  SETUP: 1,
  MEASUREMENT: 2,
  SAFETY: 3,
  CLEANUP: 4,
} as const;

/**
 * 優先度の定数（code_master.instruction_priority の code_value）
 */
const INSTRUCTION_PRIORITIES_LOCAL = {
  LOW: 0,
  NORMAL: 1,
  MEDIUM: 2,
  HIGH: 3,
} as const;

/**
 * 対象タイプの定数（code_master.instruction_target の code_value）
 */
const TARGET_TYPES_LOCAL = {
  FILE: 0,
  TASK: 1,
  TRANSITION: 2,
} as const;

/**
 * 優先度のラベルマッピング（code_value → code_name）
 */
const PRIORITY_LABELS: Record<number, string> = {
  0: '低',
  1: '通常',
  2: '中',
  3: '高',
};

/**
 * 指示タイプのラベルマッピング（code_value → code_name）
 */
const TYPE_LABELS: Record<number, string> = {
  0: '一般',
  1: 'セットアップ',
  2: '測定',
  3: '安全',
  4: '清掃',
};

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
        priority: INSTRUCTION_PRIORITIES_LOCAL.NORMAL,
        type: INSTRUCTION_TYPES_LOCAL.GENERAL,
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
            errors: ['指示内容を入力してください'],
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
        targetType: TARGET_TYPES_LOCAL.FILE, // デフォルト
        methodId: values.methodId || '',
        transitionId: values.transitionId || '',
        taskNumber: values.taskNumber,
      };

      // 対象タイプを判定
      if (instructionData.transitionId) {
        instructionData.targetType = TARGET_TYPES_LOCAL.TRANSITION;
      } else if (instructionData.taskNumber !== undefined) {
        instructionData.targetType = TARGET_TYPES_LOCAL.TASK;
      } else {
        instructionData.targetType = TARGET_TYPES_LOCAL.FILE;
      }

      // 保存コールバック
      onSave(instructionData, keepDialogOpen);

      // ダイアログを開いたままにする場合のみフォームをリセット
      if (keepDialogOpen) {
        // メソッドIDを保持
        const currentMethodId = values.methodId || '';
        
        form.resetFields();
        form.setFieldsValue({
          priority: INSTRUCTION_PRIORITIES_LOCAL.NORMAL,
          type: INSTRUCTION_TYPES_LOCAL.GENERAL,
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
      title={isSentInstruction ? '指示詳細' : mode === 'create' ? '新規指示の追加' : '指示の編集'}
      open={open}
      onCancel={handleCancel}
      width={700}
      footer={
        isSentInstruction ? [
          // 送信済：閉じるボタンのみ
          <Button key="close" type="default" onClick={handleCancel}>
            閉じる
          </Button>,
        ] : [
          // 未送信：通常のフッター
          <Button key="cancel" onClick={handleCancel}>
            キャンセル
          </Button>,
          mode === 'create' && (
            <Button
              key="saveAndContinue"
              type="default"
              icon={<PlusOutlined />}
              onClick={handleSaveAndContinue}
            >
              連続指示
            </Button>
          ),
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            data-testid="instruction-edit-dialog-save-button"
          >
            保存
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
              🎯 指示対象
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
                    <FileTextOutlined /> プロジェクト全体
                  </Text>
                )}
              </Space>
            </Card>
          </div>

          {/* 優先度 */}
          <Form.Item
            name="priority"
            label="優先度"
            rules={[{ required: true, message: '優先度を選択してください' }]}
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
                  <Select.Option value={INSTRUCTION_PRIORITIES_LOCAL.HIGH}>高</Select.Option>
                  <Select.Option value={INSTRUCTION_PRIORITIES_LOCAL.MEDIUM}>中</Select.Option>
                  <Select.Option value={INSTRUCTION_PRIORITIES_LOCAL.NORMAL}>通常</Select.Option>
                  <Select.Option value={INSTRUCTION_PRIORITIES_LOCAL.LOW}>低</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>

          {/* タイプ */}
          <Form.Item
            name="type"
            label="タイプ"
            rules={[{ required: true, message: 'タイプを選択してください' }]}
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
                  <Select.Option value={INSTRUCTION_TYPES_LOCAL.GENERAL}>一般</Select.Option>
                  <Select.Option value={INSTRUCTION_TYPES_LOCAL.SETUP}>セットアップ</Select.Option>
                  <Select.Option value={INSTRUCTION_TYPES_LOCAL.MEASUREMENT}>測定</Select.Option>
                  <Select.Option value={INSTRUCTION_TYPES_LOCAL.SAFETY}>安全</Select.Option>
                  <Select.Option value={INSTRUCTION_TYPES_LOCAL.CLEANUP}>清掃</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>

          {/* 対象タスク */}
          <Form.Item
            name="taskNumber"
            label="🎯 対象タスク"
          >
            <Select
              placeholder="タスク番号を選択..."
              disabled={isSentInstruction || !selectedMethodId || !selectedTask || selectedTask.experimentCondition !== 1}
              allowClear
            >
              {selectedTask?.taskNumberOptions.map((taskNum) => (
                <Select.Option key={taskNum} value={taskNum}>
                  タスク {taskNum}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* トランジションID */}
          <Form.Item
            name="transitionId"
            label="🔗 トランジションID"
          >
            <Select
              placeholder="トランジションを選択..."
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
              message={
                <Space orientation="vertical" size="small">
                  <Text>
                    <Text strong>選択中:</Text> {selectedTransition.displayName}
                  </Text>
                  <Text>
                    <Text strong>カテゴリ:</Text> {selectedTransition.category}
                  </Text>
                  {selectedTransition.description && (
                    <Text>
                      <Text strong>説明:</Text> {selectedTransition.description}
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
                指示内容 {!isSentInstruction && <Text type="danger">*</Text>}
              </>
            }
            rules={[
              { required: true, message: '指示内容を入力してください' },
              { max: 1000, message: '1000文字以内で入力してください' },
            ]}
          >
          <TextArea
              placeholder="作業者への具体的な指示を入力してください..."
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
