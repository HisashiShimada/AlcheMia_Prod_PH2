'use client';

import React, { useState } from 'react';
import { Layout, Card, Typography, message } from 'antd';
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
import MasterManagementMock from '../../../mock/components/MasterManagementMock';

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

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
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
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* マスタ管理タブ */}
          {currentTab === '1' && <MasterManagementMock />}
        </div>
      </Content>
    </Layout>
  );
}
