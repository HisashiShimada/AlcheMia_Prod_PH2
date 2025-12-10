'use client';

import React, { useState } from 'react';
import { Layout, Card, Typography, message } from 'antd';
import {
  ExperimentOutlined,
  UserSwitchOutlined,
  LineChartOutlined,
  EditOutlined,
  FolderOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader, { MenuType } from '../common/SubHeader';
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
export default function ExperimentAdminMenu({ user, onLogout, onNavigate, onMenuChange }: ExperimentAdminMenuProps) {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState('1');

  const tabItems = [
    {
      key: '1',
      label: t('menu.experiment_admin.tabs.experimentManagement'),
      icon: <ExperimentOutlined />,
    },
    {
      key: '2',
      label: t('menu.experiment_admin.tabs.workerAssignment'),
      icon: <UserSwitchOutlined />,
    },
    {
      key: '3',
      label: t('menu.experiment_admin.tabs.progressManagement'),
      icon: <LineChartOutlined />,
    },
    {
      key: '4',
      label: t('menu.experiment_admin.tabs.maimlEditor'),
      icon: <EditOutlined />,
    },
    {
      key: '5',
      label: t('menu.experiment_admin.tabs.fileManagement'),
      icon: <FolderOutlined />,
    },
    {
      key: '6',
      label: t('menu.experiment_admin.tabs.statistics'),
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

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader 
        title={t('menu.experiment_admin.title')}
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
          padding: '24px',
        }}
      >
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
              {t('content.notImplemented')}
            </Text>
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
