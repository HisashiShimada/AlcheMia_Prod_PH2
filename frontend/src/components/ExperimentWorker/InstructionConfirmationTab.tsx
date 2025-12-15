'use client';

import React, { useMemo } from 'react';
import { Card, Typography, Space, theme, Divider } from 'antd';
import { FileTextOutlined, DownOutlined, RightOutlined, FileOutlined, ToolOutlined, AimOutlined } from '@ant-design/icons';
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

  return (
    <div style={{ padding: '24px' }}>
      <Card
        style={{
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* プロジェクト・メソッド選択エリア */}
        <div
          style={{
            background: '#E8F5E9',
            padding: '16px 24px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <ProjectSelector
              selectedProject={selectedProject}
              onProjectChange={onProjectChange}
            />
            <MethodSelector
              methods={methods}
              selectedMethodId={selectedMethodId}
              onSelectMethod={onSelectMethod}
              disabled={!selectedProject}
            />
          </Space>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {!selectedProject ? (
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
        ) : (
          <>
            {/* 指示サマリー */}
            <InstructionStats stats={stats} />

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
          </>
        )}
      </Card>
    </div>
  );
}
