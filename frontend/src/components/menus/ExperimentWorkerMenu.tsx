'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography } from 'antd';
import {
  FileTextOutlined,
  FormOutlined,
  LineChartOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';
import styled from '@emotion/styled';
import Header from '../common/Header';
import SubHeader, { MenuType } from '../common/SubHeader';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInstructions } from '@/hooks/useInstructions';
import { useExpandState } from '@/hooks/useExpandState';
import InstructionConfirmationTab from '../ExperimentWorker/InstructionConfirmationTab';
import ExperimentRecordTab from '../ExperimentWorker/ExperimentRecordTab';
import ExperimentWorkTab from '../ExperimentWorker/ExperimentWorkTab';
import ProgressReportTab from '../ExperimentWorker/ProgressReportTab';
import { projectsData } from '@/data/projectsData';

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * レイアウト定数（UIポリシー準拠）
 */
const HEADER_HEIGHT = 64;      // UIポリシー: Header高さ 64px
const SUBHEADER_HEIGHT = 48;   // UIポリシー: SubHeader高さ 48px
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + SUBHEADER_HEIGHT; // 合計 112px

/**
 * レスポンシブコンテナ（UIポリシー準拠）
 * ブレークポイント:
 * - xs, sm (< 768px): 100% 幅
 * - md (768px+): 最大768px
 * - lg (992px+): 最大992px
 * - xl (1200px+): 最大1200px
 * - xxl (1600px+): 最大1400px
 */
const ResponsiveContainer = styled.div`
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  padding: 0 8px;

  @media (min-width: 768px) {
    max-width: 768px;
    padding: 0 16px;
  }

  @media (min-width: 992px) {
    max-width: 992px;
  }

  @media (min-width: 1200px) {
    max-width: 1200px;
  }

  @media (min-width: 1600px) {
    max-width: 1400px;
  }
`;

/**
 * 実験作業者メニューのProps
 */
interface ExperimentWorkerMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onMenuChange?: (menuType: MenuType) => void;
}

/**
 * 実験作業者メニュー画面
 * サブヘッダーに埋め込まれたタブでメニューを表示
 */
export default function ExperimentWorkerMenu({ user, onLogout, onNavigate, onMenuChange }: ExperimentWorkerMenuProps) {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState('2');
  const [isClient, setIsClient] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('new');

  // カスタムフック
  const {
    selectedProject,
    sortedInstructions,
    stats,
    handleProjectChange,
  } = useInstructions();

  const {
    expandedGroups,
    toggleGroup,
  } = useExpandState();

  // クライアント側フラグ（ハイドレーションエラー防止）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setIsClient(true);
  }, []);

  // プロジェクト選択時、または実験記録タブ・進捗報告タブ表示時に最初のメソッドを自動選択
  useEffect(() => {
    // 実験記録タブ（key='3'）または進捗報告タブ（key='6'）が選択されている場合のみ
    if ((currentTab === '3' || currentTab === '6') && selectedProject && !selectedMethodId) {
      const methods = projectsData[selectedProject]?.methods || [];
      if (methods.length > 0) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        setSelectedMethodId(methods[0].methodId);
      }
    }
  }, [currentTab, selectedProject, selectedMethodId]);

  // メソッド選択ハンドラー
  const handleSelectMethod = (methodId: string) => {
    setSelectedMethodId(methodId);
  };

  // タスク選択ハンドラー
  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  // タスク発行時のハンドラー
  const handleTaskCreated = (newTaskId: string) => {
    setSelectedTaskId(newTaskId);
  };

  // 選択されたメソッドを取得
  const selectedMethod = (selectedProject && selectedMethodId
    ? projectsData[selectedProject]?.methods?.find((m) => m.methodId === selectedMethodId)
    : null) ?? null;

  const tabItems = [
    {
      key: '2',
      label: t('menu.experiment_worker.tabs.workInstruction'),
      icon: <FileTextOutlined />,
    },
    {
      key: '3',
      label: t('menu.experiment_worker.tabs.experimentRecord'),
      icon: <FormOutlined />,
    },
    {
      key: '4',
      label: t('menu.experiment_worker.tabs.experimentWork'),
      icon: <CheckSquareOutlined />,
    },
    {
      key: '6',
      label: t('menu.experiment_worker.tabs.progressReport'),
      icon: <LineChartOutlined />,
    },
  ];

  const handleTabChange = (key: string) => {
    setCurrentTab(key);
  };

  const handleMenuChange = (menuType: MenuType) => {
    if (onMenuChange) {
      onMenuChange(menuType);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader 
        title={t('menu.experiment_worker.title')}
        tabs={tabItems}
        activeTabKey={currentTab}
        onTabChange={handleTabChange}
        currentMenu="experiment_worker"
        onMenuChange={handleMenuChange}
      />

      {/* コンテンツエリア */}
      <Content
        style={{
          marginTop: TOTAL_HEADER_HEIGHT, // UIポリシー: Header(64px) + SubHeader(48px) = 112px
          padding: '24px 16px', // UIポリシー: レスポンシブpadding
        }}
      >
        <ResponsiveContainer>
          {/* タブ2: 作業指示 */}
          {currentTab === '2' && (
            <InstructionConfirmationTab
              selectedProject={selectedProject}
              onProjectChange={handleProjectChange}
              selectedMethodId={selectedMethodId}
              onSelectMethod={handleSelectMethod}
              sortedInstructions={sortedInstructions}
              stats={stats}
              isClient={isClient}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
            />
          )}

          {/* タブ3: 実験記録 */}
          {currentTab === '3' && (
            <ExperimentRecordTab
              selectedProject={selectedProject}
              onProjectChange={handleProjectChange}
              selectedMethodId={selectedMethodId}
              onSelectMethod={handleSelectMethod}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              onTaskCreated={handleTaskCreated}
              selectedMethod={selectedMethod}
            />
          )}

          {/* タブ4: 実験作業 */}
          {currentTab === '4' && (
            <ExperimentWorkTab
              selectedProject={selectedProject}
              onProjectChange={handleProjectChange}
              selectedMethodId={selectedMethodId}
              onSelectMethod={handleSelectMethod}
              onTabChange={handleTabChange}
            />
          )}

          {/* タブ6: 進捗報告 */}
          {currentTab === '6' && (
            <ProgressReportTab
              selectedProject={selectedProject}
              onProjectChange={handleProjectChange}
              selectedMethodId={selectedMethodId}
              onSelectMethod={handleSelectMethod}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              selectedMethod={selectedMethod}
            />
          )}

        </ResponsiveContainer>
      </Content>
    </Layout>
  );
}
