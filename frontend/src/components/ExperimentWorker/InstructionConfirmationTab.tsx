'use client';

import React from 'react';
import { Card, Typography, Space } from 'antd';
import { FileTextOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import ProjectSelector from './ProjectSelector';
import InstructionStats from './InstructionStats';
import InstructionGroup from './InstructionGroup';
import { Stats, Instruction } from '@/types/experimentWorker';

const { Title, Text } = Typography;

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
  return (
    <>
      {/* プロジェクト選択 */}
      <ProjectSelector
        selectedProject={selectedProject}
        onProjectChange={onProjectChange}
      />

      {!selectedProject ? (
        <Card>
          <Space direction="vertical" align="center" style={{ width: '100%', padding: '64px 0' }}>
            <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Title level={3} type="secondary">
              📋 指示確認
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
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 8,
                cursor: 'pointer',
                borderRadius: 4,
              }}
              onClick={() => toggleGroup('file')}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Title level={4} style={{ margin: 0 }}>
                {expandedGroups['file'] ? <DownOutlined /> : <RightOutlined />} 📄 全体指示 (
                {sortedInstructions.filter((i) => i.targetType === 'file').length}
                件)
              </Title>
            </div>
            {expandedGroups['file'] && (
              <div style={{ marginTop: 16 }}>
                <InstructionGroup
                  title="全体指示"
                  emoji="📄"
                  instructions={sortedInstructions.filter(
                    (i) => i.targetType === 'file'
                  )}
                  isClient={isClient}
                />
              </div>
            )}
          </div>

          {/* メソッド単位指示グループ */}
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 8,
                cursor: 'pointer',
                borderRadius: 4,
              }}
              onClick={() => toggleGroup('method')}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Title level={4} style={{ margin: 0 }}>
                {expandedGroups['method'] ? <DownOutlined /> : <RightOutlined />} 🔧 メソッド単位指示 (
                {
                  sortedInstructions.filter((i) => i.targetType === 'method')
                    .length
                }
                件)
              </Title>
            </div>
            {expandedGroups['method'] && (
              <div style={{ marginTop: 16 }}>
                <InstructionGroup
                  title="メソッド単位指示"
                  emoji="🔧"
                  instructions={sortedInstructions.filter(
                    (i) => i.targetType === 'method'
                  )}
                  isClient={isClient}
                />
              </div>
            )}
          </div>

          {/* トランジション単位指示グループ */}
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 8,
                cursor: 'pointer',
                borderRadius: 4,
              }}
              onClick={() => toggleGroup('transition')}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Title level={4} style={{ margin: 0 }}>
                {expandedGroups['transition'] ? <DownOutlined /> : <RightOutlined />} 🎯
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
              <div style={{ marginTop: 16 }}>
                <InstructionGroup
                  title="トランジション単位指示"
                  emoji="🎯"
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
