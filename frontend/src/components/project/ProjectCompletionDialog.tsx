'use client';

/**
 * ProjectCompletionDialog.tsx
 * プロジェクト完了処理ダイアログ
 *
 * 構成:
 *   - プロジェクト全体に対する定性評価（不確かさ基準 / 評価値 / コメント入力）
 *   - 「プロジェクトを完了する」ボタン
 */

import React, { useState, useMemo } from 'react';
import {
  Modal,
  Select,
  Table,
  Input,
  Space,
  Typography,
  Flex,
  Button,
  Tag,
  Divider,
  App,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { saveEvaluations, exportEvaluationsToMaiml } from '@/services/experimentEvaluationApiService';
import type { EvaluationInput } from '@/services/experimentEvaluationApiService';
import type { UncertaintyCriteriaForSelector } from './ApprovalWizardDialog';

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────

/** 評価行（プロジェクト全体は1行固定） */
interface EvalRow {
  rowKey: string;
  label: string;
  evaluationValue: string | undefined;
  comment: string;
}

export interface ProjectCompletionDialogProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  criteriaList: UncertaintyCriteriaForSelector[];
  onCancel: () => void;
  /** 完了ボタン押下時のコールバック */
  onComplete: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────────────────────

const ProjectCompletionDialog: React.FC<ProjectCompletionDialogProps> = ({
  open,
  projectId,
  projectName,
  criteriaList,
  onCancel,
  onComplete,
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();

  const [selectedCriteriaKey, setSelectedCriteriaKey] = useState<string | null>(null);
  const [evalRows, setEvalRows] = useState<EvalRow[]>([
    { rowKey: 'project', label: projectName ?? t('projectCompletion.projectWholeLabel'), evaluationValue: undefined, comment: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const selectedCriteria = useMemo(
    () => criteriaList.find((c) => c.uncertaintyKey === selectedCriteriaKey) ?? null,
    [criteriaList, selectedCriteriaKey]
  );

  const updateRow = (field: 'evaluationValue' | 'comment', value: string) => {
    setEvalRows((prev) =>
      prev.map((r) => (r.rowKey === 'project' ? { ...r, [field]: value } : r))
    );
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      // 評価値が入力されている場合は保存
      const row = evalRows[0];
      if (selectedCriteria && row.evaluationValue) {
        const evaluations: EvaluationInput[] = [
          {
            evaluationUnit:  'project',
            methodId:        undefined,
            taskNo:          undefined,
            transitionId:    undefined,
            nameSpaceId:     selectedCriteria.nameSpaceId,
            uncertaintyKey:  selectedCriteria.uncertaintyKey,
            ucVersion:       selectedCriteria.version,
            evaluationValue: row.evaluationValue,
            comment:         row.comment || undefined,
          },
        ];
        await saveEvaluations({ projectId, evaluations });
      }
      // DBの評価データを MAiML ファイルへ書き込み
      try {
        const result = await exportEvaluationsToMaiml(projectId);
        if (result.written > 0) {
          message.success(t('projectCompletion.messages.exportSuccess', { count: String(result.written) }));
        }
      } catch (exportErr) {
        // MAiML 書き込み失敗はワーニング扱い（完了処理自体は続行）
        console.warn('[ProjectCompletionDialog] exportToMaiml error:', exportErr);
        message.warning(t('projectCompletion.messages.exportFailed'));
      }
      // 完了処理
      await onComplete();
    } catch (err) {
      console.error('[ProjectCompletionDialog] error:', err);
      message.error(t('projectCompletion.messages.completeFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  /** テーブルカラム定義 */
  const evalColumns: ColumnsType<EvalRow> = useMemo(() => [
    {
      title: t('projectCompletion.columns.target'),
      dataIndex: 'label',
      width: 180,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: t('projectCompletion.columns.qualEvaluation'),
      width: 200,
      render: (_: unknown, row: EvalRow) => (
        <Select
          allowClear
          placeholder={t('projectCompletion.placeholders.notEvaluated')}
          style={{ width: 180 }}
          size="small"
          value={row.evaluationValue}
          onChange={(v) => updateRow('evaluationValue', v ?? '')}
          options={
            selectedCriteria?.intuitionOptions.map((opt) => ({
              label: (
                <span>
                  {opt.displayColor && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: opt.displayColor,
                        marginRight: 6,
                      }}
                    />
                  )}
                  {opt.label}
                </span>
              ),
              value: opt.value,
            })) ?? []
          }
          disabled={!selectedCriteria}
        />
      ),
    },
    {
      title: t('projectCompletion.columns.comment'),
      render: (_: unknown, row: EvalRow) => (
        <Input
          size="small"
          placeholder={t('projectCompletion.placeholders.comment')}
          value={row.comment}
          onChange={(e) => updateRow('comment', e.target.value)}
          maxLength={200}
        />
      ),
    },
  ], [selectedCriteria]);

  return (
    <Modal
      title={t('projectCompletion.title')}
      open={open}
      onCancel={onCancel}
      width={680}
      destroyOnClose
      footer={
        <Flex justify="flex-end">
          <Space>
            <Button onClick={onCancel}>{t('common.cancel')}</Button>
            <Button
              type="primary"
              loading={submitting}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={handleComplete}
            >
              {t('projectCompletion.completeButton')}
            </Button>
          </Space>
        </Flex>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 説明文 */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('projectCompletion.description')}
        </Text>

        <Divider style={{ margin: '4px 0' }} />

        {/* 不確かさ基準選択 */}
        <Flex align="center" gap={8}>
          <Text style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: 12 }}>{t('projectCompletion.criteriaLabel')}</Text>
          <Select
            style={{ width: 280 }}
            size="small"
            allowClear
            placeholder={t('projectCompletion.selectCriteriaPlaceholder')}
            value={selectedCriteriaKey}
            onChange={(v) => {
              setSelectedCriteriaKey(v ?? null);
              // 基準を変えたら評価値をリセット
              setEvalRows((prev) =>
                prev.map((r) => ({ ...r, evaluationValue: undefined }))
              );
            }}
            options={criteriaList
              .filter((c) => c.evaluationMethod === 2)
              .map((c) => ({
                label: `${c.uncertaintyKeyLabel} (V${c.version})`,
                value: c.uncertaintyKey,
              }))}
          />
          {selectedCriteria && <Tag color="green" style={{ fontSize: 11 }}>{t('projectCompletion.tagQualitative')}</Tag>}
        </Flex>

        {/* 評価テーブル */}
        <Table<EvalRow>
          dataSource={evalRows}
          columns={evalColumns}
          rowKey="rowKey"
          size="small"
          pagination={false}
          bordered
          locale={{ emptyText: t('evaluation.empty.noTarget') }}
        />

        <Text type="secondary" style={{ fontSize: 11 }}>
          {t('projectCompletion.footerNote')}
        </Text>
      </Space>
    </Modal>
  );
};

export default ProjectCompletionDialog;
