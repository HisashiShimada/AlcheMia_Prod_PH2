/**
 * InstructionEditDialog.tsx
 * プロジェクト指示の編集/追加ダイアログコンポーネント
 *
 * 操作フロー:
 *   ① 指示種別を選択（MAIMLのpropertyタグキー、必須）
 *   ② 指示対象を選択（任意、未選択時は全体指示）
 *   ③ 指示内容を入力
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  theme,
  Button,
} from 'antd';
import {
  PlusOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import type {
  InstructionData,
  TransitionInfo,
  InstructionGranularityValue,
} from '@/types/instructionRegistration';
import {
  INSTRUCTION_KEY_LABELS,
  INSTRUCTION_KEY,
  INSTRUCTION_GRANULARITY,
  INSTRUCTION_GRANULARITY_LABELS,
} from '@/types/instructionRegistration';
import type { TaskDetail, MethodInfo } from '@/types/taskRegistration';
import {
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
   * 保存モード
   * - 'immediate': 即時DB保存（指示登録タブのデフォルト動作）
   * - 'local': ローカルstateに保存（タスク登録タブで使用）
   */
  saveMode?: 'immediate' | 'local';
}

/**
 * プロジェクト指示の編集/追加ダイアログコンポーネント
 * 指示種別（必須）→ 指示対象（任意）→ 指示内容 の順で入力する
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
}) => {
  const { token } = useToken();
  const { t } = useLanguage();
  const [form] = Form.useForm();

  const [selectedInstructionKey, setSelectedInstructionKey] = useState<string | null>(null);
  const [selectedGranularity, setSelectedGranularity] = useState<InstructionGranularityValue | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [selectedTransitionId, setSelectedTransitionId] = useState<string>('');
  const [selectedTaskNo, setSelectedTaskNo] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && instruction) {
      setSelectedInstructionKey(instruction.instructionKey ?? null);
      setSelectedGranularity(instruction.granularity ?? null);
      setSelectedMethodId(instruction.methodId || '');
      setSelectedTransitionId(instruction.transitionId || '');
      setSelectedTaskNo(instruction.taskNumber);
      form.setFieldsValue({
        instructionKey: instruction.instructionKey ?? undefined,
        content: instruction.content,
      });
    } else {
      setSelectedInstructionKey(null);
      setSelectedGranularity(null);
      setSelectedMethodId('');
      setSelectedTransitionId('');
      setSelectedTaskNo(undefined);
      form.resetFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleGranularityChange = useCallback((value: InstructionGranularityValue | null) => {
    setSelectedGranularity(value ?? null);
    setSelectedMethodId('');
    setSelectedTransitionId('');
    setSelectedTaskNo(undefined);
  }, []);

  const handleMethodChange = useCallback((value: string) => {
    setSelectedMethodId(value);
    setSelectedTransitionId('');
    setSelectedTaskNo(undefined);
  }, []);

  const taskNoOptions = useMemo(() => {
    const matched = tasks.filter(tk => tk.methodId === selectedMethodId);
    const nos = new Set<number>();
    matched.forEach(tk => {
      Array.from({ length: tk.trialCount }, (_, i) => i + 1).forEach(n => nos.add(n));
    });
    return Array.from(nos).map(n => ({ label: `タスク ${n}`, value: n }));
  }, [tasks, selectedMethodId]);

  const instructionKeyOptions = useMemo(() =>
    Object.entries(INSTRUCTION_KEY_LABELS).map(([value, label]) => ({ value, label }))
  , []);

  const granularityOptions = useMemo(() => [
    { value: INSTRUCTION_GRANULARITY.METHOD,     label: INSTRUCTION_GRANULARITY_LABELS.method },
    { value: INSTRUCTION_GRANULARITY.TRANSITION, label: INSTRUCTION_GRANULARITY_LABELS.transition },
    { value: INSTRUCTION_GRANULARITY.TASK,       label: INSTRUCTION_GRANULARITY_LABELS.task },
  ], []);

  const methodOptions = useMemo(() =>
    (availableMethods ?? []).map(m => ({ value: m.id, label: m.displayName || m.id }))
  , [availableMethods]);

  const transitionOptions = useMemo(() =>
    availableTransitions.map(tr => ({ value: tr.id, label: tr.displayName }))
  , [availableTransitions]);

  const calcTargetType = useCallback((granularity: InstructionGranularityValue | null): number => {
    if (granularity === INSTRUCTION_GRANULARITY.TASK)       return InstructionTarget.TASK;
    if (granularity === INSTRUCTION_GRANULARITY.TRANSITION) return InstructionTarget.TRANSITION;
    return InstructionTarget.FILE;
  }, []);

  const doSave = useCallback(async (keepDialogOpen: boolean) => {
    try {
      const values = await form.validateFields();
      const instructionData: InstructionData = {
        id: instruction?.id || Date.now(),
        content: values.content.trim(),
        targetType: calcTargetType(selectedGranularity),
        methodId: selectedMethodId || '',
        transitionId: selectedTransitionId || '',
        taskNumber: selectedTaskNo,
        instructionKey: selectedInstructionKey ?? INSTRUCTION_KEY.GENERAL,
        granularity: selectedGranularity ?? INSTRUCTION_GRANULARITY.OVERALL,
      };
      onSave(instructionData, keepDialogOpen);
      if (keepDialogOpen) {
        form.resetFields();
        setSelectedInstructionKey(null);
        setSelectedGranularity(null);
        setSelectedMethodId('');
        setSelectedTransitionId('');
        setSelectedTaskNo(undefined);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [
    form, instruction, onSave,
    selectedInstructionKey, selectedGranularity,
    selectedMethodId, selectedTransitionId, selectedTaskNo,
    calcTargetType,
  ]);

  const handleSave            = useCallback(() => doSave(false), [doSave]);
  const handleSaveAndContinue = useCallback(() => doSave(true),  [doSave]);

  const handleCancel = useCallback(() => {
    form.resetFields();
    setSelectedInstructionKey(null);
    setSelectedGranularity(null);
    setSelectedMethodId('');
    setSelectedTransitionId('');
    setSelectedTaskNo(undefined);
    onClose();
  }, [form, onClose]);

  const isSentInstruction = instruction?.isSent === true;

  return (
    <Modal
      data-testid="instruction-edit-dialog"
      title={
        isSentInstruction
          ? t('instructionEditDialog.titleDetail')
          : mode === 'create'
          ? t('instructionEditDialog.titleCreate')
          : t('instructionEditDialog.titleEdit')
      }
      open={open}
      onCancel={handleCancel}
      width={700}
      footer={
        isSentInstruction ? [
          <Button key="close" type="default" onClick={handleCancel}>
            {t('common.close')}
          </Button>,
        ] : [
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
      <Form form={form} layout="vertical" style={{ marginTop: token.marginSM }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>

          {/* ① 指示種別（必須） */}
          <Form.Item
            name="instructionKey"
            label={
              <>指示種別{' '}{!isSentInstruction && <Text type="danger">*</Text>}</>
            }
            rules={[{ required: true, message: '指示種別を選択してください' }]}
          >
            <Select
              placeholder="指示種別を選択"
              options={instructionKeyOptions}
              onChange={(v) => setSelectedInstructionKey(v ?? null)}
              disabled={isSentInstruction}
              allowClear
              data-testid="instruction-key-select"
            />
          </Form.Item>

          {/* ② 指示対象（任意：未選択=全体指示） */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
              指示対象
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                （未選択の場合は全体指示）
              </Text>
            </Text>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Select
                placeholder="指示対象を選択（任意）"
                options={granularityOptions}
                value={selectedGranularity ?? undefined}
                onChange={(v) => handleGranularityChange(v ?? null)}
                disabled={isSentInstruction}
                allowClear
                style={{ width: '100%' }}
                data-testid="instruction-granularity-select"
              />
              {selectedGranularity && selectedGranularity !== INSTRUCTION_GRANULARITY.OVERALL && (
                <Select
                  placeholder="メソッドを選択"
                  options={methodOptions}
                  value={selectedMethodId || undefined}
                  onChange={handleMethodChange}
                  disabled={isSentInstruction}
                  style={{ width: '100%' }}
                  data-testid="instruction-method-select"
                />
              )}
              {selectedGranularity === INSTRUCTION_GRANULARITY.TRANSITION && selectedMethodId && (
                <Select
                  placeholder="トランジションを選択"
                  options={transitionOptions}
                  value={selectedTransitionId || undefined}
                  onChange={setSelectedTransitionId}
                  disabled={isSentInstruction}
                  style={{ width: '100%' }}
                  data-testid="instruction-transition-select"
                />
              )}
              {selectedGranularity === INSTRUCTION_GRANULARITY.TASK && selectedMethodId && (
                <Select
                  placeholder="タスクNoを選択"
                  options={taskNoOptions}
                  value={selectedTaskNo ?? undefined}
                  onChange={(v) => setSelectedTaskNo(v)}
                  disabled={isSentInstruction}
                  style={{ width: '100%' }}
                  data-testid="instruction-taskno-select"
                />
              )}
            </Space>
          </div>

          {/* ③ 指示内容（必須） */}
          <Form.Item
            name="content"
            label={
              <>
                {t('instructionEditDialog.contentLabel')}{' '}
                {!isSentInstruction && <Text type="danger">*</Text>}
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


