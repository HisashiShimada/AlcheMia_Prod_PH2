'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography } from 'antd';
import {
  FileTextOutlined,
  FormOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader, { MenuType } from '../common/SubHeader';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInstructions } from '@/hooks/useInstructions';
import { useExpandState } from '@/hooks/useExpandState';
import InstructionConfirmationTab from '../ExperimentWorker/InstructionConfirmationTab';
import ExperimentRecordTab from '../ExperimentWorker/ExperimentRecordTab';
import ProgressReportTab from '../ExperimentWorker/ProgressReportTab';
import { projectsData } from '@/data/projectsData';

const { Content } = Layout;
const { Title, Text } = Typography;

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
          marginTop: 140, // Header(64px) + SubHeader(タブ込みで約76px)
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* タブ2: 作業指示 */}
          {currentTab === '2' && (
            <InstructionConfirmationTab
              selectedProject={selectedProject}
              onProjectChange={handleProjectChange}
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

        </div>
      </Content>
    </Layout>
  );
}
