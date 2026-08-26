'use client';

/**
 * UncertaintyJudgeDetailDialog.tsx
 * 不確かさ判定詳細ダイアログ（複数件時に表示）
 *
 * 上部: プロパティ情報（Key / Label / 型 / 想定値 / 実績値）
 * 下部: 不確かさ一覧テーブル（指示キー / 許容値 / 判定結果 / 記録値）
 */

import React from 'react';
import { Modal, Table, Tag, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UncertaintyJudgeSummary } from '@/types/experimentInstruction';

const { Text } = Typography;

export interface UncertaintyJudgeDetailDialogProps {
  open: boolean;
  onClose: () => void;
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
  /** 不確かさ判定一覧 */
  uncertaintyJudges: UncertaintyJudgeSummary[];
}

export default function UncertaintyJudgeDetailDialog({
  open,
  onClose,
  propKey,
  propLabel,
  xsiType,
  expected,
  actual,
  uncertaintyJudges,
}: UncertaintyJudgeDetailDialogProps) {
  const { t } = useLanguage();

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
      width={680}
    >
      {/* 上部: プロパティ情報 */}
      <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
        <Space size={24} wrap>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Key: <Text strong style={{ fontSize: 12 }}>{propKey}</Text>
          </Text>
          {propLabel && propLabel !== propKey && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Label: <Text style={{ fontSize: 12 }}>{propLabel}</Text>
            </Text>
          )}
          {xsiType && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              型: <Text style={{ fontSize: 12 }}>{xsiType}</Text>
            </Text>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('experimentInstructionTab.col.expected')}: <Text style={{ fontSize: 12 }}>{expected ?? '—'}</Text>
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('experimentInstructionTab.col.actual')}: <Text style={{ fontSize: 12 }}>{actual ?? '—'}</Text>
          </Text>
        </Space>
      </div>

      {/* 下部: 不確かさ判定一覧 */}
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
