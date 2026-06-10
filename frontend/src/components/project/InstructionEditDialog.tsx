/**
 * InstructionEditDialog.tsx
 * プロジェクト指示の編集/追加ダイアログコンポーネント
 * プロジェクト指示専用：「対象」と「指示内容」のみ表示
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Space,
  Typography,
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
} from '@/types/instructionRegistration';
import { TARGET_TYPES } from '@/types/instructionRegistration';
import type { TaskDetail, MethodInfo } from '@/types/taskRegistration';
import {
  InstructionTypeCode,
  InstructionPriority,
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
 * プロジェクト指示の編集/追加ダイアログコンポーネント
 * 「対象」と「指示内容」のみ表示
 */
const InstructionEditDialog: React.FC<InstructionEditDialogProps> = ({
  open,
  mode,
  instruction,
  availableMethods,
  onClose,
  onSave,
  fixedMethodId,
}) => {
  const { token } = useToken();
  const { t } = useLanguage();
  const [form] = Form.useForm();

  // 表示用のメソッドID（対象表示に使用）
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');

  /**
   * ダイアログが開かれたときの初期化
   */
  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && instruction) {
      // 編集モード：既存データをフォームに設定
      form.setFieldsValue({
        methodId: instruction.methodId,
        content: instruction.content,
      });
      setSelectedMethodId(instruction.methodId);
    } else {
      // 新規作成モード：初期値を設定
      const initialMethodId = fixedMethodId || '';
      form.setFieldsValue({
        methodId: initialMethodId,
        content: '',
      });
      setSelectedMethodId(initialMethodId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fixedMethodId]);

  /**
   * 選択されたメソッド情報を取得
   */
  const selectedMethod = availableMethods?.find(m => m.id === selectedMethodId);

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

      // 指示データを構築（プロジェクト指示固定）
      const instructionData: InstructionData = {
        id: instruction?.id || Date.now(),
        content: values.content.trim(),
        priority: InstructionPriority.NORMAL,
        type: InstructionTypeCode.GENERAL,
        targetType: TARGET_TYPES.FILE,
        methodId: selectedMethodId || '',
        transitionId: '',
        taskNumber: undefined,
      };

      // 保存コールバック
      onSave(instructionData, keepDialogOpen);

      // ダイアログを開いたままにする場合のみフォームをリセット
      if (keepDialogOpen) {
        form.resetFields();
        form.setFieldsValue({
          methodId: selectedMethodId,
          content: '',
        });
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [form, instruction, onSave, selectedMethodId, t]);

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
    onClose();
  }, [form, onClose]);

  // 送信済フラグの確認
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
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
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
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
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

          {/* 指示内容 */}
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
