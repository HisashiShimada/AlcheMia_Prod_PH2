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
import MasterManagement from '../DataManagement/MasterManagement';

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
      label: t('menu.data_admin.tabs.masterManagement'),
      icon: <FolderOutlined />,
    }
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
          marginTop: HEADER_TOTAL_HEIGHT,
          height: `calc(100vh - ${HEADER_TOTAL_HEIGHT}px)`,
          overflow: 'auto',
          background: token.colorBgContainer,
          padding: `0 ${token.paddingContentHorizontal}px`,
        }}
      >
        {/* マスタ管理タブ */}
        {currentTab === '1' && <MasterManagement />}
      </Content>
    </Layout>
  );
}
