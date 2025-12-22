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
import TaskListTab from '../ExperimentWorker/TaskListTab';
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
    handleProjectChange: originalHandleProjectChange,
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

  // プロジェクト変更時のハンドラー（メソッドを"-"にリセット）
  const handleProjectChange = (value: string | null) => {
    // nullは空文字列として扱う
    const projectValue = value || '';
    originalHandleProjectChange(projectValue);
    // プロジェクトが変更された場合、メソッドを"-"にリセット
    setSelectedMethodId(null);
    // タスクもリセット
    setSelectedTaskId('');
  };

  // メソッド選択ハンドラー
  const handleSelectMethod = (methodId: string | null) => {
    // null値をそのまま設定
    setSelectedMethodId(methodId);
    // メソッドが変更された場合、タスクをリセット
    setSelectedTaskId('');
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
      label: t('menu.experiment_worker.tabs.taskList'),
      icon: <CheckSquareOutlined />,
      children: (
        <TaskListTab
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
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
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
          padding: '0 16px 24px', // 上部の余白をなくし、左右と下部のみパディング
        }}
      >
        <ResponsiveContainer>
          {/* プロジェクト選択・メソッド選択・選択ボタン */}
          <div style={{ 
            height: 56,
            marginBottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: token.margin,
            flexWrap: 'nowrap',
            backgroundColor: token.colorBgContainer,
            border: `1px solid ${token.colorBorder}`,
            paddingLeft: token.paddingLG,
            paddingRight: token.paddingLG,
          }}>
            {/* プロジェクト選択 */}
            <Space size="small" style={{ flex: '1 1 250px', minWidth: 250 }}>
              <FolderOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
              <Text strong>{t('experimentWork.labels.project')}:</Text>
              <Select
                value={selectedProject === '' ? null : selectedProject}
                placeholder="-"
                style={{ flex: 1, minWidth: 150 }}
                onChange={handleProjectChange}
                options={[
                  { value: null, label: '-' },
                  ...Object.entries(projectsData).map(([id, project]) => ({
                    value: id,
                    label: project.projectName
                  }))
                ]}
                size="middle"
              />
            </Space>

            {/* メソッド選択 */}
            <Space size="small" style={{ flex: '1 1 250px', minWidth: 250 }}>
              <ToolOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
              <Text strong>{t('experimentWork.labels.method')}:</Text>
              <Select
                value={selectedMethodId}
                placeholder="-"
                style={{ flex: 1, minWidth: 150 }}
                onChange={handleSelectMethod}
                disabled={!selectedProject}
                options={[
                  { value: null, label: '-' },
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

            {/* 選択ボタン */}
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => setDialogOpen(true)}
              size="large"
              style={{ flexShrink: 0 }}
            >
              {t('experimentWork.selectButton')}
            </Button>
          </div>

          {/* タブ */}
          <div style={{
            height: `calc(100vh - ${TOTAL_HEADER_HEIGHT}px - 24px - 56px - 24px)`, // 画面高さ - ヘッダー - Content padding(下) - 選択エリア - margin
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: token.colorBgContainer,
            border: `1px solid ${token.colorBorder}`,
            borderTop: 'none',
            borderRadius: 0,
            overflow: 'hidden'
          }}>
            <Tabs
              activeKey={currentTab}
              onChange={handleTabChange}
              items={tabItems}
              size="large"
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              tabBarStyle={{
                padding: `0 ${token.paddingLG}px`,
                margin: 0,
                flexShrink: 0,
                border: `1px solid ${token.colorBorder}`,
                borderRadius: 0,
              }}
            />
          </div>

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
