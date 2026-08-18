'use client';

/**
 * ApprovalWizardDialog.tsx
 * 承認処理ダイアログ（承認 / NG のみ）
 *
 * メソッド・タスク番号を選択し、承認 or NG を実行する。
 * 定性評価は EvaluationDialog で行う。
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Radio,
  Select,
  Input,
  Space,
  Typography,
  Flex,
  Button,
} from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────

/** レビュー待ちタスク情報 */
export interface ReviewTask {
  methodId: string;
  methodName: string;
  taskNumber: number;
}

/** 不確かさ基準セレクター用アイテム（EvaluationDialog でも共有） */
export interface UncertaintyCriteriaForSelector {
  uncertaintyKey: string;
  nameSpaceId: string;
  version: number;
  uncertaintyKeyLabel: string;
  evaluationMethod: number; // 1: 定量 / 2: 定性
  intuitionOptions: Array<{
    value: string;
    label: string;
    displayColor: string | null;
    sortOrder: number;
  }>;
}

/** コンポーネント Props */
export interface ApprovalWizardDialogProps {
  open: boolean;
  projectId: string;
  reviewWaitingTasks: ReviewTask[];
  /** 利用可能なメソッド一覧（全メソッド） */
  allMethods: Array<{ id: string; name: string }>;
  /** 不確かさ基準リスト（現在は未使用・後方互換のため残す） */
  criteriaList: UncertaintyCriteriaForSelector[];
  loading?: boolean;
  onCancel: () => void;
  /** 実行ボタン押下: methodId + taskNumber + 承認/NG + NG理由 */
  onExecute: (params: {
    methodId: string;
    taskNumber: number;
    action: 'approve' | 'ng';
    ngReason: string;
    evaluations: never[];
  }) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────────────────────

const ApprovalWizardDialog: React.FC<ApprovalWizardDialogProps> = ({
  open,
  reviewWaitingTasks,
  loading = false,
  onCancel,
  onExecute,
}) => {
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [selectedTaskKey,  setSelectedTaskKey]  = useState<string | null>(null);
  const [action,           setAction]           = useState<'approve' | 'ng'>('approve');
  const [ngReason,         setNgReason]         = useState('');
  const [submitting,       setSubmitting]       = useState(false);

  // ダイアログが開いたらリセット
  useEffect(() => {
    if (open) {
      setSelectedMethodId(null);
      setSelectedTaskKey(null);
      setAction('approve');
      setNgReason('');
    }
  }, [open]);

  // タスク選択オプション
  const taskOptions = useMemo(() => {
    return reviewWaitingTasks
      .filter((t) => selectedMethodId === null || t.methodId === selectedMethodId)
      .map((t) => ({
        label: `#${t.taskNumber}`,
        value: `${t.methodId}__${t.taskNumber}`,
      }));
  }, [reviewWaitingTasks, selectedMethodId]);

  // 実行ボタン有効条件
  const canExecute =
    !!selectedTaskKey &&
    (action === 'approve' || (action === 'ng' && ngReason.trim().length > 0));

  const handleExecute = async () => {
    if (!selectedTaskKey) return;
    const [methodId, taskNoStr] = selectedTaskKey.split('__');
    const taskNumber = Number(taskNoStr);

    setSubmitting(true);
    try {
      await onExecute({ methodId, taskNumber, action, ngReason, evaluations: [] });
    } finally {
      setSubmitting(false);
    }
  };

  const { t } = useLanguage();

  return (
    <Modal
      title={t('approvalWizard.title')}
      open={open}
      onCancel={onCancel}
      width={560}
      destroyOnClose
      footer={
        <Flex justify="flex-end">
          <Space>
            <Button onClick={onCancel}>{t('common.cancel')}</Button>
            <Button
              type="primary"
              disabled={!canExecute}
              loading={submitting || loading}
              onClick={handleExecute}
            >
              {t('approvalWizard.execute')}
            </Button>
          </Space>
        </Flex>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* メソッド + タスク選択 */}
        <Flex gap={12} align="center" wrap="wrap">
          <Text style={{ whiteSpace: 'nowrap' }}>{t('approvalWizard.methodName')}</Text>
          <Select
            allowClear
            placeholder={t('approvalWizard.methodNamePlaceholder')}
            style={{ width: 200 }}
            size="small"
            value={selectedMethodId}
            onChange={(v) => {
              setSelectedMethodId(v ?? null);
              setSelectedTaskKey(null);
            }}
            options={
              Array.from(new Set(reviewWaitingTasks.map((t) => t.methodId))).map((id) => ({
                label: id,
                value: id,
              }))
            }
            popupMatchSelectWidth={false}
          />
          <Text style={{ whiteSpace: 'nowrap' }}>{t('approvalWizard.taskNumber')}</Text>
          <Select
            placeholder={t('approvalWizard.taskNumberPlaceholder')}
            style={{ width: 120 }}
            size="small"
            value={selectedTaskKey}
            onChange={(v) => setSelectedTaskKey(v ?? null)}
            options={taskOptions}
            popupMatchSelectWidth={false}
          />
        </Flex>

        {/* 承認 / NG ラジオ */}
        <Flex align="center" gap={12}>
          <Text style={{ fontWeight: 500 }}>{t('approvalWizard.selectAction')}</Text>
          <Radio.Group
            value={action}
            onChange={(e) => {
              setAction(e.target.value as 'approve' | 'ng');
              if (e.target.value === 'approve') setNgReason('');
            }}
          >
            <Radio value="approve">
              <Text style={{ color: '#52c41a', fontWeight: 500 }}>{t('approvalWizard.approve')}</Text>
            </Radio>
            <Radio value="ng">
              <Text style={{ color: '#ff4d4f', fontWeight: 500 }}>{t('approvalWizard.ng')}</Text>
            </Radio>
          </Radio.Group>
        </Flex>

        {/* NG理由（NG選択時のみ） */}
        {action === 'ng' && (
          <Input.TextArea
            rows={3}
            placeholder={t('approvalWizard.ngReasonPlaceholder')}
            maxLength={500}
            showCount
            value={ngReason}
            onChange={(e) => setNgReason(e.target.value)}
            style={{ fontSize: 12 }}
          />
        )}
      </Space>
    </Modal>
  );
};

export default ApprovalWizardDialog;
