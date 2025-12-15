'use client';

import React from 'react';
import { Card, Typography, Space, theme } from 'antd';
import { FileTextOutlined, DownOutlined, RightOutlined, FileOutlined, ToolOutlined, AimOutlined } from '@ant-design/icons';
import ProjectSelector from './ProjectSelector';
import InstructionStats from './InstructionStats';
import InstructionGroup from './InstructionGroup';
import { Stats, Instruction } from '@/types/experimentWorker';

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
  sortedInstructions,
  stats,
  isClient,
  expandedGroups,
  toggleGroup,
}: InstructionConfirmationTabProps) {
  // テーマトークンを取得（UIポリシー準拠）
  const { token } = theme.useToken();

  return (
    <>
      {/* プロジェクト選択 */}
      <ProjectSelector
        selectedProject={selectedProject}
        onProjectChange={onProjectChange}
      />

      {!selectedProject ? (
        <Card>
          <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <FileTextOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              <FileTextOutlined style={{ marginRight: token.marginXS }} />
              指示確認
            </Title>
            <Text type="secondary">
              プロジェクトを選択してください
            </Text>
          </Space>
        </Card>
      ) : (
        <Card>
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
        </Card>
      )}
    </>
  );
}
