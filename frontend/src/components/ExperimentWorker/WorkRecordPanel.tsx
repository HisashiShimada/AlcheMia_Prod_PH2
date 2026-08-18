'use client';

import React from 'react';
import { Empty, Typography } from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProgressRow } from './ProgressOverviewTab';
import DataRecordDialog from './DataRecordDialog';
import type { Transition, ProjectStatus, ExperimentDataValue } from '@/types/experimentWorker';

const { Text } = Typography;

interface WorkRecordPanelProps {
  /** 選択中プロジェクトID */
  projectId?: string;
  /** 全体進捗行（ExperimentWorkerMenu から渡す） */
  progressRows: ProgressRow[];
  /** みなし進捗使用フラグ */
  useDeemedProgress?: boolean;
  /** プロジェクトステータス */
  projectStatus?: number | null;
}

/**
 * 作業記録パネル
 *
 * progressRows から status === 'in_progress' のトランジションを特定し、
 * DataRecordDialog を使って実験データ入力UIを表示する。
 *
 * - データ取得元: GET /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data?transitionId=xxx
 * - データ保存先: POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data
 * - サービス: frontend/src/services/experimentDataApiService.ts
 */
export default function WorkRecordPanel({
  projectId,
  progressRows,
  useDeemedProgress = true,
  projectStatus = null,
}: WorkRecordPanelProps) {
  const { t } = useLanguage();

  // in_progress トランジションを取得（複数あれば先頭を使用）
  const inProgressRow = progressRows.find((r) => r.status === 'in_progress') ?? null;

  // DataRecordDialog に渡す Transition オブジェクトを構築
  const transition: Transition | null = inProgressRow
    ? {
        transitionId: inProgressRow.transitionId,
        transitionName: inProgressRow.transitionName ?? '',
        status: 'in_progress',
        templates: [],
      }
    : null;

  if (!projectId || !inProgressRow || !transition) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Empty
          description={
            <Text type="secondary">{t('workRecord.noActiveTransition')}</Text>
          }
        />
      </div>
    );
  }

  const handleSave = (_data: ExperimentDataValue[]) => {
    // 保存後の後処理（必要に応じて progressRows 再取得を追加）
  };

  return (
    <DataRecordDialog
      open={true}
      inlineMode={true}
      transition={transition}
      projectStatus={projectStatus as ProjectStatus | null}
      onClose={() => {
        // パネル表示なので閉じる操作は何もしない
      }}
      onSave={handleSave}
      projectId={projectId}
      methodId={inProgressRow.methodId}
      taskNo={inProgressRow.taskNo}
      useDeemedProgress={useDeemedProgress}
    />
  );
}
