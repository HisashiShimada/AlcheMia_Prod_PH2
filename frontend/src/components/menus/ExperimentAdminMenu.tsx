'use client';

import React, { useState } from 'react';
import { Layout, Card, Typography } from 'antd';
import {
  ExperimentOutlined,
  UserSwitchOutlined,
  LineChartOutlined,
  EditOutlined,
  FolderOutlined,
  BarChartOutlined,
  FileTextOutlined,
  FolderAddOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader, { MenuType } from '../common/SubHeader';
import ProjectManagement from '../project/ProjectManagement';
import FormatManagement from '../project/FormatManagement';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * 実験管理者メニューのProps
 */
interface ExperimentAdminMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onMenuChange?: (menuType: MenuType) => void;
}

/**
 * 実験管理者メニュー画面
 * サブヘッダーに埋め込まれたタブでメニューを表示
 */
export default function ExperimentAdminMenu({ 
  user, 
  onLogout, 
  onNavigate, 
  onMenuChange 
}: ExperimentAdminMenuProps) {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState('1');

  const tabItems = [
    {
      key: '1',
      label: t('menu.experiment_admin.tabs.projectManagement') || 'プロジェクト管理',
      icon: <FolderAddOutlined />,
    },
    {
      key: '2',
      label: t('menu.experiment_admin.tabs.formatManagement') || 'フォーマット管理',
      icon: <FileTextOutlined />,
    },
    {
      key: '3',
      label: t('menu.experiment_admin.tabs.workerAssignment') || 'ワーカー割当',
      icon: <UserSwitchOutlined />,
    },
    {
      key: '4',
      label: t('menu.experiment_admin.tabs.progressManagement') || '進捗管理',
      icon: <LineChartOutlined />,
    },
    {
      key: '5',
      label: t('menu.experiment_admin.tabs.maimlEditor') || 'MAIML編集',
      icon: <EditOutlined />,
    },
    {
      key: '6',
      label: t('menu.experiment_admin.tabs.fileManagement') || 'ファイル管理',
      icon: <FolderOutlined />,
    },
    {
      key: '7',
      label: t('menu.experiment_admin.tabs.statistics') || '統計情報',
      icon: <BarChartOutlined />,
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

  const currentTabLabel = tabItems.find(item => item.key === currentTab)?.label || '';

  // タブ '1' と '2' は全幅表示、その他はカード内に表示
  const isFullWidthTab = currentTab === '1' || currentTab === '2';

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader 
        title={t('menu.experiment_admin.title') || '実験管理'}
        tabs={tabItems}
        activeTabKey={currentTab}
        onTabChange={handleTabChange}
        currentMenu="experiment_admin"
        onMenuChange={handleMenuChange}
      />

      {/* コンテンツエリア */}
      <Content
        style={{
          marginTop: 140, // Header(64px) + SubHeader(タブ込みで約76px)
          padding: isFullWidthTab ? 0 : '24px',
          height: isFullWidthTab ? 'calc(100vh - 140px)' : 'auto',
          overflow: isFullWidthTab ? 'hidden' : 'auto',
        }}
      >
        {currentTab === '1' ? (
          // プロジェクト管理: 全幅表示
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <ProjectManagement />
          </div>
        ) : currentTab === '2' ? (
          // フォーマット管理: 全幅表示
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <FormatManagement />
          </div>
        ) : (
          // その他のタブ: カード内に表示
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Card
              style={{
                minHeight: 400,
                borderRadius: 12,
              }}
              styles={{
                body: {
                  padding: 24,
                },
              }}
            >
              <Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
                {currentTabLabel}
              </Title>
              <Text type="secondary">
                {t('content.notImplemented') || 'コンテンツエリア（未実装）'}
              </Text>
            </Card>
          </div>
        )}
      </Content>
    </Layout>
  );
}
