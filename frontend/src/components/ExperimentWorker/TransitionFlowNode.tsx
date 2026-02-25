'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Typography, Tag, Progress, theme, Space, Button } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { Transition, ProgressStatus } from '@/types/experimentWorker';

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
  const { transition, onRecordClick, onIssueClick, isProjectRecordable } = data;

  // ステータスに応じた色とアイコンを取得
  const getStatusConfig = (status?: ProgressStatus) => {
    if (!status) {
      return {
        color: token.colorBorder,
        bgColor: token.colorBgContainer,
        icon: <MinusCircleOutlined />,
        text: '未開始',
      };
    }

    const configs = {
      not_started: {
        color: token.colorBorder,
        bgColor: token.colorBgContainer,
        icon: <MinusCircleOutlined />,
        text: '未開始',
      },
      in_progress: {
        color: token.colorWarning,
        bgColor: '#fff7e6',
        icon: <ClockCircleOutlined />,
        text: '作業中',
      },
      completed: {
        color: token.colorSuccess,
        bgColor: '#f6ffed',
        icon: <CheckCircleOutlined />,
        text: '完了',
      },
      on_hold: {
        color: token.colorWarning,
        bgColor: '#fffbe6',
        icon: <ExclamationCircleOutlined />,
        text: '保留中',
      },
      issue: {
        color: token.colorError,
        bgColor: '#fff1f0',
        icon: <ExclamationCircleOutlined />,
        text: '問題あり',
      },
    };

    return configs[status] || configs.not_started;
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
            <Button
              type="primary"
              size="small"
              onClick={handleRecordClick}
              disabled={!isProjectRecordable}
              style={{
                flex: 1,
                fontSize: 12,
                height: 28,
              }}
            >
              記録
            </Button>

            {/* 報告ボタン */}
            <Button
              size="small"
              onClick={handleIssueClick}
              style={{
                flex: 1,
                fontSize: 12,
                height: 28,
                color: token.colorPrimary,
                borderColor: token.colorPrimary,
              }}
            >
              報告
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
