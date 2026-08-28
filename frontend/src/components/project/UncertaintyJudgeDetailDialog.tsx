'use client';

/**
 * UncertaintyJudgeDetailDialog.tsx
 * 不確かさ判定詳細ダイアログ（複数件時に表示）
 *
 * 上段: メソッド / タスク / トランジション / テンプレート
 * 下段: Key / 想定値 / 実績値 / 総合評価（集約バッジ）
 * テーブル: 基準名 / 許容値 / 判定結果 / 記録値
 */

import React from 'react';
import { Flex, Modal, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UncertaintyJudgeSummary } from '@/types/experimentInstruction';

const { Text } = Typography;

export interface UncertaintyJudgeDetailDialogProps {
  open: boolean;
  onClose: () => void;
  /** メソッドID */
  methodId: string;
  /** メソッド表示名（未設定の場合は methodId を表示） */
  methodName?: string;
  /** タスク番号 */
  taskNumber: number;
  /** トランジションID */
  transitionId: string;
  /** トランジション表示名（未設定の場合は transitionId を表示） */
  transitionName?: string;
  /** テンプレート名 */
  templateName: string;
  /** プロパティKey */
  propKey: string;
  /** プロパティ表示名 */
  propLabel: string;
  /** xsiType */
  xsiType: string;
  /** 想定値 */
  expected: number | string | null;
  /** 実績値 */
  actual: number | string | null;
  /** 単位 */
  unit?: string;
  /** 不確かさ判定一覧 */
  uncertaintyJudges: UncertaintyJudgeSummary[];
}

/**
 * 全件「良好」→「良好」、1件でも「不良」→「不良」、0件→null
 */
function aggregateJudgeResult(judges: UncertaintyJudgeSummary[]): '良好' | '不良' | null {
  if (judges.length === 0) return null;
  return judges.some((j) => j.judgeResult === '不良') ? '不良' : '良好';
}

export default function UncertaintyJudgeDetailDialog({
  open,
  onClose,
  methodId,
  methodName,
  taskNumber,
  transitionId,
  transitionName,
  templateName,
  propKey,
  propLabel,
  xsiType,
  expected,
  actual,
  unit,
  uncertaintyJudges,
}: UncertaintyJudgeDetailDialogProps) {
  const { t } = useLanguage();
  const aggregated = aggregateJudgeResult(uncertaintyJudges);

  const columns: ColumnsType<UncertaintyJudgeSummary> = [
    {
      key: 'instructionKey',
      title: t('experimentInstructionTab.col.uncertaintyInstructionKey'),
      dataIndex: 'instructionKey',
      ellipsis: true,
      render: (v: string, r: UncertaintyJudgeSummary) => (
        <Text style={{ fontSize: 12 }}>
          {r.criteriaName ?? v}
        </Text>
      ),
    },
    {
      key: 'tolerance',
      title: t('experimentInstructionTab.col.uncertaintyTolerance'),
      width: 150,
      render: (_: unknown, r: UncertaintyJudgeSummary) => {
        if (r.toleranceLower === null && r.toleranceUpper === null) {
          return <Text type="secondary">—</Text>;
        }
        return (
          <Text style={{ fontSize: 12 }}>
            {r.toleranceLower ?? '—'} ～ {r.toleranceUpper ?? '—'}
          </Text>
        );
      },
    },
    {
      key: 'judgeResult',
      title: t('experimentInstructionTab.col.uncertaintyJudgeResult'),
      dataIndex: 'judgeResult',
      width: 90,
      render: (v: '良好' | '不良') => (
        <Tag color={v === '良好' ? 'success' : 'error'} style={{ fontSize: 11 }}>
          {v}
        </Tag>
      ),
    },
    {
      key: 'recordedValue',
      title: t('experimentInstructionTab.col.uncertaintyRecordedValue'),
      dataIndex: 'recordedValue',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={t('experimentInstructionTab.judgeDetailDialog.title')}
      width={720}
    >
      {/* プロパティ情報欄 */}
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
        {/* 上段: メソッド / タスク / トランジション / テンプレート */}
        <Flex align="center" gap={20} wrap="wrap" style={{ marginBottom: 10 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
              {t('experimentInstructionTab.judgeDetailDialog.method')}
            </Text>
            <Text style={{ fontSize: 13 }}>{methodName || methodId}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
              {t('experimentInstructionTab.judgeDetailDialog.taskNo')}
            </Text>
            <Text strong style={{ fontSize: 13 }}>#{taskNumber}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
              {t('experimentInstructionTab.judgeDetailDialog.transition')}
            </Text>
            <Text style={{ fontSize: 13 }}>{transitionName || transitionId}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
              {t('experimentInstructionTab.judgeDetailDialog.template')}
            </Text>
            <Text style={{ fontSize: 13 }}>{templateName}</Text>
          </div>
        </Flex>
        {/* 下段: Key / 想定値 / 実績値 / 総合評価 */}
        <Flex align="center" gap={20} wrap="wrap" style={{ paddingTop: 10, borderTop: '1px solid #ebebeb' }}>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
              {t('experimentInstructionTab.judgeDetailDialog.key')}
            </Text>
            <Text strong style={{ fontSize: 14 }}>
              {propLabel && propLabel !== propKey ? propLabel : propKey}
            </Text>
            {xsiType && (
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>({xsiType})</Text>
            )}
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
              {t('experimentInstructionTab.judgeDetailDialog.expectedValue')}
            </Text>
            <Text style={{ fontSize: 14 }}>
              {expected ?? '—'}
              {unit && <Text type="secondary" style={{ fontSize: 12, marginLeft: 3 }}>{unit}</Text>}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
              {t('experimentInstructionTab.judgeDetailDialog.actualValue')}
            </Text>
            <Text style={{ fontSize: 14 }}>
              {actual ?? '—'}
              {unit && <Text type="secondary" style={{ fontSize: 12, marginLeft: 3 }}>{unit}</Text>}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
              {t('experimentInstructionTab.judgeDetailDialog.overallJudge')}
            </Text>
            {aggregated !== null ? (
              <Tag
                color={aggregated === '良好' ? 'success' : 'error'}
                style={{ fontSize: 13, padding: '2px 10px', margin: 0 }}
              >
                {aggregated}
              </Tag>
            ) : (
              <Text type="secondary" style={{ fontSize: 13 }}>—</Text>
            )}
          </div>
        </Flex>
      </div>

      {/* 不確かさ判定一覧テーブル */}
      <Table<UncertaintyJudgeSummary>
        dataSource={uncertaintyJudges}
        columns={columns}
        rowKey="instructionKey"
        size="small"
        pagination={false}
      />
    </Modal>
  );
}
