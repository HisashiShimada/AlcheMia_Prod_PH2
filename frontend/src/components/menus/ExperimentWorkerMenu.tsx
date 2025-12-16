'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Space, Button, Tabs, theme, Select } from 'antd';
import {
  FileTextOutlined,
  FormOutlined,
  LineChartOutlined,
  CheckSquareOutlined,
  FolderOutlined,
  ToolOutlined,
  CheckOutlined,
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
import UnifiedSelectionDialog from '../ExperimentWorker/UnifiedSelectionDialog';
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
  const { token } = theme.useToken();
  const [currentTab, setCurrentTab] = useState('4');
  const [isClient, setIsClient] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('new');
  const [dialogOpen, setDialogOpen] = useState(false);

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

  // 選択中のプロジェクト情報を取得
  const selectedProjectData = selectedProject ? projectsData[selectedProject] : null;

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

  const handleTabChange = (key: string) => {
    setCurrentTab(key);
  };

  const handleMenuChange = (menuType: MenuType) => {
    if (onMenuChange) {
      onMenuChange(menuType);
    }
  };

  // タブアイテムの定義
  const tabItems = [
    {
      key: '4',
      label: t('menu.experiment_worker.tabs.experimentWork'),
      icon: <CheckSquareOutlined />,
      children: (
        <ExperimentWorkTab
          selectedProject={selectedProject}
          onProjectChange={handleProjectChange}
          selectedMethodId={selectedMethodId}
          onSelectMethod={handleSelectMethod}
          onTabChange={handleTabChange}
        />
      ),
    },
    {
      key: '2',
      label: t('menu.experiment_worker.tabs.workInstruction'),
      icon: <FileTextOutlined />,
      children: (
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
      ),
    },
    {
      key: '3',
      label: t('menu.experiment_worker.tabs.experimentRecord'),
      icon: <FormOutlined />,
      children: (
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
      ),
    },
    {
      key: '6',
      label: t('menu.experiment_worker.tabs.progressReport'),
      icon: <LineChartOutlined />,
      children: (
        <ProgressReportTab
          selectedProject={selectedProject}
          onProjectChange={handleProjectChange}
          selectedMethodId={selectedMethodId}
          onSelectMethod={handleSelectMethod}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          selectedMethod={selectedMethod}
        />
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader 
        title={t('menu.experiment_worker.title')}
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
          {/* 選択プロジェクト・メソッド */}
          <Card 
            style={{ 
              marginBottom: token.marginLG,
              backgroundColor: selectedProject ? token.colorPrimaryBg : token.colorBgContainer,
              borderColor: selectedProject ? token.colorPrimary : token.colorBorder,
            }}
          >
            <div style={{ width: '100%' }}>
              {/* プロジェクト */}
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: token.margin }}>
                <Space size="middle" style={{ flex: 1, width: '100%' }}>
                  <FolderOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
                  <Text strong style={{ minWidth: 80 }}>{t('experimentWork.labels.project')}:</Text>
                  <Select
                    value={selectedProject || undefined}
                    placeholder="-"
                    style={{ flex: 1, minWidth: 200 }}
                    onChange={handleProjectChange}
                    options={[
                      { value: undefined, label: '-' },
                      ...Object.entries(projectsData).map(([id, project]) => ({
                        value: id,
                        label: project.projectName
                      }))
                    ]}
                    size="middle"
                  />
                </Space>
              </div>

              {/* メソッド + 選択ボタン */}
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                <Space size="middle" style={{ flex: 1 }}>
                  <ToolOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
                  <Text strong style={{ minWidth: 80 }}>{t('experimentWork.labels.method')}:</Text>
                  <Select
                    value={selectedMethodId || undefined}
                    placeholder="-"
                    style={{ flex: 1, minWidth: 200 }}
                    onChange={handleSelectMethod}
                    disabled={!selectedProject}
                    options={[
                      { value: undefined, label: '-' },
                      ...(selectedProject && projectsData[selectedProject]?.methods
                        ? projectsData[selectedProject].methods.map(method => ({
                            value: method.methodId,
                            label: method.methodName
                          }))
                        : [])
                    ]}
                    size="middle"
                  />
                </Space>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => setDialogOpen(true)}
                  size="large"
                >
                  {t('experimentWork.selectButton')}
                </Button>
              </div>
            </div>
          </Card>

          {/* タブ */}
          <Tabs
            activeKey={currentTab}
            onChange={handleTabChange}
            items={tabItems}
            size="large"
            style={{
              backgroundColor: token.colorBgContainer,
              padding: token.paddingLG,
              borderRadius: token.borderRadiusLG,
            }}
          />

          {/* 統合選択ダイアログ */}
          <UnifiedSelectionDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            selectedProject={selectedProject}
            selectedMethodId={selectedMethodId}
            selectedTaskId={selectedTaskId}
            onProjectChange={handleProjectChange}
            onSelectMethod={handleSelectMethod}
            onSelectTask={handleSelectTask}
          />
        </ResponsiveContainer>
      </Content>
    </Layout>
  );
}
