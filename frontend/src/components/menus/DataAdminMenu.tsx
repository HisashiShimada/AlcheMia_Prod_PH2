'use client';

import React, { useState } from 'react';
import { Layout, Card, Typography, theme } from 'antd';
import {
  FolderOutlined,
  EditOutlined,
  SearchOutlined,
  ExperimentOutlined,
  DownloadOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader, { MenuType } from '../common/SubHeader';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * データ管理者メニューのProps
 */
interface DataAdminMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onMenuChange?: (menuType: MenuType) => void;
}

/**
 * データ管理者メニュー画面
 * サブヘッダーに埋め込まれたタブでメニューを表示
 */
export default function DataAdminMenu({ user, onLogout, onNavigate, onMenuChange }: DataAdminMenuProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [currentTab, setCurrentTab] = useState('1');

  const tabItems = [
    {
      key: '1',
      label: t('menu.data_admin.tabs.fileManagement'),
      icon: <FolderOutlined />,
    },
    {
      key: '2',
      label: t('menu.data_admin.tabs.maimlEditor'),
      icon: <EditOutlined />,
    },
    {
      key: '3',
      label: t('menu.data_admin.tabs.dataSearch'),
      icon: <SearchOutlined />,
    },
    {
      key: '4',
      label: t('menu.data_admin.tabs.experimentList'),
      icon: <ExperimentOutlined />,
    },
    {
      key: '5',
      label: t('menu.data_admin.tabs.dataExport'),
      icon: <DownloadOutlined />,
    },
    {
      key: '6',
      label: t('menu.data_admin.tabs.statistics'),
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
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader 
        title={t('menu.data_admin.title')}
        tabs={tabItems}
        activeTabKey={currentTab}
        onTabChange={handleTabChange}
        currentMenu="data_admin"
        onMenuChange={handleMenuChange}
      />

      {/* コンテンツエリア */}
      <Content
        style={{
          marginTop: 140, // Header(64px) + SubHeader(タブ込みで約76px)
          padding: token.paddingLG,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Card
            style={{
              minHeight: 400,
            }}
          >
            <Title level={4} style={{ marginTop: 0, marginBottom: token.marginLG }}>
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
