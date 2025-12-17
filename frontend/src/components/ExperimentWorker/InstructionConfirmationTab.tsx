'use client';

import React, { useMemo } from 'react';
import { Card, Typography, Space, theme, Divider, Button } from 'antd';
import { FileTextOutlined, DownOutlined, RightOutlined, FileOutlined, ToolOutlined, AimOutlined, CheckCircleOutlined } from '@ant-design/icons';
import ProjectSelector from './ProjectSelector';
import MethodSelector from './MethodSelector';
import InstructionStats from './InstructionStats';
import InstructionGroup from './InstructionGroup';
import { Stats, Instruction } from '@/types/experimentWorker';
import { projectsData } from '@/data/projectsData';

const { Title, Text } = Typography;

/**
 * 空状態アイコンのサイズ（UIポリシー準拠）
 */
const EMPTY_ICON_SIZE = 48;

/**
 * 指示確認タブのProps
 */
interface InstructionConfirmationTabProps {
  selectedProject: string;
  onProjectChange: (value: string) => void;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string) => void;
  sortedInstructions: Instruction[];
  stats: Stats;
  isClient: boolean;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (groupKey: string) => void;
}

/**
 * 指示確認タブのコンテンツ
 */
export default function InstructionConfirmationTab({
  selectedProject,
  onProjectChange,
  selectedMethodId,
  onSelectMethod,
  sortedInstructions,
  stats,
  isClient,
  expandedGroups,
  toggleGroup,
}: InstructionConfirmationTabProps) {
  // テーマトークンを取得（UIポリシー準拠）
  const { token } = theme.useToken();

  // メソッド一覧の取得
  const methods = useMemo(() => {
    if (!selectedProject) return [];
    const project = projectsData[selectedProject];
    return project?.methods || [];
  }, [selectedProject]);

  // 全ての指示の確認完了ハンドラ
  const handleConfirmAllInstructions = () => {
    // 未読の指示数を確認
    const unreadCount = stats.unread;
    
    if (unreadCount === 0) {
      alert('全ての指示は既に確認済みです');
      return;
    }
    
    // モック実装：実際にはAPIを呼び出して全指示を確認済みに更新
    const confirmed = window.confirm(
      `全ての指示（${stats.total}件中${unreadCount}件未読）を確認完了にしますか？`
    );
    
    if (confirmed) {
      alert(`全ての指示の確認完了処理を実行しました（モック）`);
      // TODO: 実際のAPI実装時には、ここで全指示を確認済みにする処理を呼び出す
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px' }}>
      {!selectedProject ? (
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <FileTextOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              <FileTextOutlined style={{ marginRight: token.marginXS }} />
              指示確認
            </Title>
            <Text type="secondary">
              プロジェクトとメソッドを選択してください
            </Text>
          </Space>
        </Card>
      ) : (
        <>
          {/* 作業指示サマリーカード */}
          <InstructionStats stats={stats} />

          {/* 指示詳細カード */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileTextOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
                <span>指示詳細</span>
              </div>
            }
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* 全体指示グループ */}
            <div style={{ marginBottom: token.marginXL }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: token.marginXS,
                  cursor: 'pointer',
                  borderRadius: token.borderRadiusSM,
                }}
                onClick={() => toggleGroup('file')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Title level={4} style={{ margin: 0 }}>
                  {expandedGroups['file'] ? <DownOutlined /> : <RightOutlined />}{' '}
                  <FileOutlined style={{ marginRight: token.marginXS }} />
                  全体指示 (
                  {sortedInstructions.filter((i) => i.targetType === 'file').length}
                  件)
                </Title>
              </div>
              {expandedGroups['file'] && (
                <div style={{ marginTop: token.margin }}>
                  <InstructionGroup
                    title="全体指示"
                    emoji="file"
                    instructions={sortedInstructions.filter(
                      (i) => i.targetType === 'file'
                    )}
                    isClient={isClient}
                  />
                </div>
              )}
            </div>

            {/* メソッド単位指示グループ */}
            <div style={{ marginBottom: token.marginXL }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: token.marginXS,
                  cursor: 'pointer',
                  borderRadius: token.borderRadiusSM,
                }}
                onClick={() => toggleGroup('method')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Title level={4} style={{ margin: 0 }}>
                  {expandedGroups['method'] ? <DownOutlined /> : <RightOutlined />}{' '}
                  <ToolOutlined style={{ marginRight: token.marginXS }} />
                  メソッド単位指示 (
                  {
                    sortedInstructions.filter((i) => i.targetType === 'method')
                      .length
                  }
                  件)
                </Title>
              </div>
              {expandedGroups['method'] && (
                <div style={{ marginTop: token.margin }}>
                  <InstructionGroup
                    title="メソッド単位指示"
                    emoji="tool"
                    instructions={sortedInstructions.filter(
                      (i) => i.targetType === 'method'
                    )}
                    isClient={isClient}
                  />
                </div>
              )}
            </div>

            {/* トランジション単位指示グループ */}
            <div style={{ marginBottom: token.marginXL }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: token.marginXS,
                  cursor: 'pointer',
                  borderRadius: token.borderRadiusSM,
                }}
                onClick={() => toggleGroup('transition')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Title level={4} style={{ margin: 0 }}>
                  {expandedGroups['transition'] ? <DownOutlined /> : <RightOutlined />}{' '}
                  <AimOutlined style={{ marginRight: token.marginXS }} />
                  トランジション単位指示 (
                  {
                    sortedInstructions.filter(
                      (i) => i.targetType === 'transition'
                    ).length
                  }
                  件)
                </Title>
              </div>
              {expandedGroups['transition'] && (
                <div style={{ marginTop: token.margin }}>
                  <InstructionGroup
                    title="トランジション単位指示"
                    emoji="aim"
                    instructions={sortedInstructions.filter(
                      (i) => i.targetType === 'transition'
                    )}
                    isClient={isClient}
                  />
                </div>
              )}
            </div>

            {/* 全ての指示の確認完了ボタン */}
            <Divider style={{ margin: `${token.marginXL}px 0` }} />
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: token.marginLG }}>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleConfirmAllInstructions}
                disabled={stats.total === 0}
                style={{
                  minWidth: 300,
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600,
                  backgroundColor: stats.total === 0 ? undefined : token.colorSuccess,
                  borderColor: stats.total === 0 ? undefined : token.colorSuccess,
                }}
              >
                全ての指示の確認完了
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
