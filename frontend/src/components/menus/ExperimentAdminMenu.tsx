'use client';

import React, { useState } from 'react';
import { Layout, Card, Typography, theme } from 'antd';
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
  const { token } = theme.useToken();
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

  // Header + SubHeaderの高さ (Header: 64px, SubHeader with tabs: 約76px)
  const HEADER_TOTAL_HEIGHT = 140;

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
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
          marginTop: HEADER_TOTAL_HEIGHT,
          height: `calc(100vh - ${HEADER_TOTAL_HEIGHT}px)`,
          overflow: 'auto',
          background: token.colorBgContainer,
          paddingLeft: '15px',
          paddingRight: '15px',
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
          // その他のタブ: 全幅表示
          <div style={{ height: '100%', overflow: 'auto', padding: token.paddingLG }}>
            <Card
              style={{
                minHeight: 400,
              }}
            >
              <Title level={4} style={{ marginTop: 0, marginBottom: token.marginLG }}>
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
