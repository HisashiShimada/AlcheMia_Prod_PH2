/**
 * InstructionEditDialog.tsx
 * プロジェクト指示の編集/追加ダイアログコンポーネント
 *
 * 操作フロー:
 *   ① 指示種別を選択（MAIMLのpropertyタグキー、必須）
 *   ② 指示対象を入力（任意）
 *      - メソッドID: 常に表示、全メソッドから選択
 *      - トランジションID: 常に表示、メソッド選択後にそのメソッドのトランジションから選択
 *      - タスクNo: 常に表示、メソッド選択後にそのメソッドの試行回数から選択
 *      - 未入力の場合は全体指示として扱う
 *   ③ 指示内容を入力
 *
 * granularity自動判定ルール（保存時）:
 *   taskNo入力あり                  → TASK
 *   transitionId入力あり (taskNoなし) → TRANSITION
 *   methodIdのみ入力あり             → METHOD
 *   すべて空                        → OVERALL（全体指示）
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
} from '@/types/instructionRegistration';
import {
  INSTRUCTION_KEY_LABELS,
  INSTRUCTION_KEY,
  INSTRUCTION_GRANULARITY,
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
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [selectedTransitionId, setSelectedTransitionId] = useState<string>('');
  const [selectedTaskNo, setSelectedTaskNo] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && instruction) {
      setSelectedInstructionKey(instruction.instructionKey ?? null);
      setSelectedMethodId(instruction.methodId || '');
      setSelectedTransitionId(instruction.transitionId || '');
      setSelectedTaskNo(instruction.taskNumber);
      form.setFieldsValue({
        instructionKey: instruction.instructionKey ?? undefined,
        content: instruction.content,
      });
    } else {
      setSelectedInstructionKey(null);
      setSelectedMethodId('');
      setSelectedTransitionId('');
      setSelectedTaskNo(undefined);
      form.resetFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleMethodChange = useCallback((value: string) => {
    setSelectedMethodId(value ?? '');
    // メソッド変更時は下流の選択をクリア
    setSelectedTransitionId('');
    setSelectedTaskNo(undefined);
  }, []);

  const taskNoOptions = useMemo(() => {
    if (!selectedMethodId) return [];
    const matched = tasks.filter(tk => tk.methodId === selectedMethodId);
    const nos = new Set<number>();
    matched.forEach(tk => {
      Array.from({ length: tk.trialCount }, (_, i) => i + 1).forEach(n => nos.add(n));
    });
    return Array.from(nos).map(n => ({ label: t('instructionEditDialog.taskOptionLabel', { n: String(n) }), value: n }));
  }, [tasks, selectedMethodId, t]);

  const instructionKeyOptions = useMemo(() =>
    Object.keys(INSTRUCTION_KEY_LABELS).map((value) => ({
      value,
      label: t(`instructionEditDialog.instructionKeyOptions.${value}`),
    }))
  , [t]);

  const methodOptions = useMemo(() =>
    (availableMethods ?? []).map(m => ({ value: m.id, label: m.displayName || m.id }))
  , [availableMethods]);

  /**
   * メソッドが選択されている場合はそのメソッドのトランジションのみ表示
   * メソッド未選択時は空配列
   */
  const transitionOptions = useMemo(() => {
    if (!selectedMethodId) return [];
    return availableTransitions
      .filter(tr => tr.methodId === selectedMethodId)
      .map(tr => ({ value: tr.id, label: tr.displayName }));
  }, [availableTransitions, selectedMethodId]);

  /**
   * 入力値からgranularityを自動判定する
   *   taskNo入力あり                   → TASK
   *   transitionId入力あり (taskNoなし) → TRANSITION
   *   methodIdのみ入力あり              → METHOD
   *   すべて空                         → OVERALL（全体指示）
   */
  const calcEffectiveGranularity = useCallback(() => {
    if (selectedTaskNo !== undefined) return INSTRUCTION_GRANULARITY.TASK;
    if (selectedTransitionId)         return INSTRUCTION_GRANULARITY.TRANSITION;
    if (selectedMethodId)             return INSTRUCTION_GRANULARITY.METHOD;
    return INSTRUCTION_GRANULARITY.OVERALL;
  }, [selectedMethodId, selectedTransitionId, selectedTaskNo]);

  const calcTargetType = useCallback((granularity: string): number => {
    if (granularity === INSTRUCTION_GRANULARITY.TASK)       return InstructionTarget.TASK;
    if (granularity === INSTRUCTION_GRANULARITY.TRANSITION) return InstructionTarget.TRANSITION;
    return InstructionTarget.FILE;
  }, []);

  const doSave = useCallback(async (keepDialogOpen: boolean) => {
    try {
      const values = await form.validateFields();
      const effectiveGranularity = calcEffectiveGranularity();
      const instructionData: InstructionData = {
        id: instruction?.id || Date.now(),
        content: values.content.trim(),
        targetType: calcTargetType(effectiveGranularity),
        methodId: selectedMethodId || '',
        transitionId: selectedTransitionId || '',
        taskNumber: selectedTaskNo,
        instructionKey: selectedInstructionKey ?? INSTRUCTION_KEY.GENERAL,
        granularity: effectiveGranularity,
      };
      onSave(instructionData, keepDialogOpen);
      if (keepDialogOpen) {
        form.resetFields();
        setSelectedInstructionKey(null);
        setSelectedMethodId('');
        setSelectedTransitionId('');
        setSelectedTaskNo(undefined);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [
    form, instruction, onSave, calcEffectiveGranularity,
    selectedInstructionKey,
    selectedMethodId, selectedTransitionId, selectedTaskNo,
    calcTargetType,
  ]);

  const handleSave            = useCallback(() => doSave(false), [doSave]);
  const handleSaveAndContinue = useCallback(() => doSave(true),  [doSave]);

  const handleCancel = useCallback(() => {
    form.resetFields();
    setSelectedInstructionKey(null);
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
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>

          {/* ① 指示種別（必須） */}
          <Form.Item
            name="instructionKey"
            label={
              <>{t('instructionEditDialog.instructionKeyLabel')}{' '}{!isSentInstruction && <Text type="danger">*</Text>}</>
            }
            rules={[{ required: true, message: t('instructionEditDialog.instructionKeyRequired') }]}
          >
            <Select
              placeholder={t('instructionEditDialog.instructionKeyPlaceholder')}
              options={instructionKeyOptions}
              onChange={(v) => setSelectedInstructionKey(v ?? null)}
              disabled={isSentInstruction}
              allowClear
              data-testid="instruction-key-select"
            />
          </Form.Item>

          {/* ② 指示対象（任意：未入力=全体指示） */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
              {t('instructionEditDialog.instructionTargetLabel')}
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                {t('instructionEditDialog.instructionTargetHint')}
              </Text>
            </Text>
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              {/* メソッドID選択 - 常に表示 */}
              <Select
                placeholder={t('instructionEditDialog.methodPlaceholder')}
                options={methodOptions}
                value={selectedMethodId || undefined}
                onChange={handleMethodChange}
                disabled={isSentInstruction}
                allowClear
                style={{ width: '100%' }}
                data-testid="instruction-method-select"
              />
              {/* トランジションID選択 - 常に表示。メソッド未選択時はdisabled */}
              <Select
                placeholder={t('instructionEditDialog.transitionSelectPlaceholder')}
                options={transitionOptions}
                value={selectedTransitionId || undefined}
                onChange={setSelectedTransitionId}
                disabled={isSentInstruction || !selectedMethodId}
                allowClear
                style={{ width: '100%' }}
                data-testid="instruction-transition-select"
              />
              {/* タスクNo選択 - 常に表示。メソッド未選択時はdisabled */}
              <Select
                placeholder={t('instructionEditDialog.taskNoPlaceholder')}
                options={taskNoOptions}
                value={selectedTaskNo ?? undefined}
                onChange={(v) => setSelectedTaskNo(v)}
                disabled={isSentInstruction || !selectedMethodId}
                allowClear
                style={{ width: '100%' }}
                data-testid="instruction-taskno-select"
              />
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


