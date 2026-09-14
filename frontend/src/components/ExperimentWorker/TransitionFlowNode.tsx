'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Typography, Tag, Progress, theme, Space, Button } from 'antd';
import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
  PauseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Transition, ProgressStatus } from '@/types/experimentWorker';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

interface TransitionFlowNodeProps {
  data: {
    transition: Transition;
    onRecordClick: (transition: Transition) => void;
    onIssueClick: (transition: Transition) => void;
    isProjectRecordable: boolean;
  };
}

/**
 * トランジションフローノードコンポーネント
 * React Flowで使用するカスタムノード
 * トランジションを四角形で表示し、ステータスと進捗を視覚化
 * 各ノードに「記録」ボタンと「報告」ボタンを表示
 */
export default function TransitionFlowNode({ data }: TransitionFlowNodeProps) {
  const { token } = theme.useToken();
  const { t } = useLanguage();
  const { transition, onRecordClick, onIssueClick, isProjectRecordable } = data;

  // ステータスに応じた色とアイコンを取得
  // アイコン・色は ProgressOverviewTab の STATUS_CONFIG に合わせて統一
  const getStatusConfig = (status?: ProgressStatus) => {
    if (!status) {
      return {
        color: 'default' as const,
        bgColor: token.colorBgContainer,
        icon: <MinusCircleOutlined style={{ color: '#bfbfbf' }} />,
        text: t('progressOverview.status.not_started'),
      };
    }

    const configs: Record<ProgressStatus, { color: string; bgColor: string; icon: React.ReactNode; text: string }> = {
      not_started: {
        color: 'default',
        bgColor: token.colorBgContainer,
        icon: <MinusCircleOutlined style={{ color: '#bfbfbf' }} />,
        text: t('progressOverview.status.not_started'),
      },
      preparing: {
        color: 'processing',
        bgColor: '#e6f4ff',
        icon: <SyncOutlined style={{ color: '#1677ff' }} />,
        text: t('progressOverview.status.preparing'),
      },
      ready: {
        color: 'cyan',
        bgColor: '#e6fffb',
        icon: <CheckSquareOutlined style={{ color: '#13c2c2' }} />,
        text: t('progressOverview.status.ready'),
      },
      in_progress: {
        color: 'processing',
        bgColor: '#e6f4ff',
        icon: null,
        text: t('progressOverview.status.in_progress'),
      },
      completed: {
        color: 'success',
        bgColor: '#f6ffed',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        text: t('progressOverview.status.completed'),
      },
      on_hold: {
        color: 'warning',
        bgColor: '#fffbe6',
        icon: <PauseCircleOutlined style={{ color: '#faad14' }} />,
        text: t('progressOverview.status.on_hold'),
      },
      issue: {
        color: 'error',
        bgColor: '#fff1f0',
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
        text: t('progressOverview.status.issue'),
      },
    };

    return configs[status] ?? configs.not_started;
  };

  const statusConfig = getStatusConfig(transition.status);
  const progressRate = transition.progressRate ?? 0;

  // 記録ボタンクリックハンドラ
  const handleRecordClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRecordClick(transition);
  };

  // 問題報告ボタンクリックハンドラ
  const handleIssueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIssueClick(transition);
  };

  return (
    <>
      {/* 左側のハンドル（入力） */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: token.colorPrimary,
          width: 8,
          height: 8,
        }}
      />

      {/* ノードカード */}
      <Card
        size="small"
        style={{
          width: 200,
          borderColor: statusConfig.color,
          borderWidth: 2,
          backgroundColor: statusConfig.bgColor,
          transition: 'all 0.2s',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
        styles={{ body: { padding: token.paddingSM } }}
        data-testid={`transition-flow-node-${transition.transitionId}`}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="small">
          {/* ステータスタグ */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Tag
              icon={statusConfig.icon}
              color={statusConfig.color}
              style={{
                margin: 0,
                fontSize: 11,
                borderRadius: token.borderRadiusSM,
              }}
            >
              {statusConfig.text}
            </Tag>
          </div>

          {/* トランジション名 */}
          <div style={{ textAlign: 'center', minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text
              strong
              style={{
                fontSize: 13,
                color: token.colorText,
                lineHeight: '1.4',
                wordBreak: 'break-word',
              }}
            >
              {transition.transitionName}
            </Text>
          </div>

          {/* 進捗率 */}
          {progressRate !== undefined && (
            <div>
              <Progress
                percent={progressRate}
                size="small"
                strokeColor={
                  progressRate === 100
                    ? token.colorSuccess
                    : progressRate > 0
                    ? token.colorWarning
                    : token.colorBorder
                }
                style={{ marginBottom: 0 }}
              />
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  display: 'block',
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                進捗 {progressRate}%
              </Text>
            </div>
          )}

          {/* データ入力状況 */}
          {(transition.inputMaterialsCount !== undefined ||
            transition.inputIngredientsCount !== undefined ||
            transition.inputResultsCount !== undefined) && (
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4 }}>
              {transition.totalMaterialsCount !== undefined && transition.totalMaterialsCount > 0 && (
                <Text style={{ fontSize: 10 }} type="secondary">
                  材: {transition.inputMaterialsCount ?? 0}/{transition.totalMaterialsCount}
                </Text>
              )}
              {transition.totalIngredientsCount !== undefined && transition.totalIngredientsCount > 0 && (
                <Text style={{ fontSize: 10 }} type="secondary">
                  条: {transition.inputIngredientsCount ?? 0}/{transition.totalIngredientsCount}
                </Text>
              )}
              {transition.totalResultsCount !== undefined && transition.totalResultsCount > 0 && (
                <Text style={{ fontSize: 10 }} type="secondary">
                  結: {transition.inputResultsCount ?? 0}/{transition.totalResultsCount}
                </Text>
              )}
            </div>
          )}

          {/* ボタンエリア */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {/* 記録ボタン */}
            {/* disabled 条件:
                - isProjectRecordable=false: プロジェクトが記録操作不可状態（承認待ち外など）
                - transition.status === 'not_started': 初期状態（前提未完了）のトランジションは操作不可
                  ※リスト表示と同じ判定ロジックに統一 */}
            <Button
              type="primary"
              size="small"
              onClick={handleRecordClick}
              disabled={!isProjectRecordable || transition.status === 'not_started'}
              style={{
                flex: 1,
                fontSize: 12,
                height: 28,
              }}
              data-testid={`transition-node-record-button-${transition.transitionId}`}
            >
              {t('experimentWork.table.record')}
            </Button>
          </div>
        </Space>
      </Card>

      {/* 右側のハンドル（出力） */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: token.colorPrimary,
          width: 8,
          height: 8,
        }}
      />
    </>
  );
}
