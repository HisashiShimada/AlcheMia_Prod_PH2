'use client';

import React, { useState } from 'react';
import { Layout, theme } from 'antd';
import {
  FolderOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { User, MenuType } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPermissionsFromToken } from '@/utils/jwtUtils';
import MasterManagement from '../DataManagement/MasterManagement';

const { Content } = Layout;

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
export default function DataAdminMenu({ user, onLogout, onMenuChange }: DataAdminMenuProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [currentTab, setCurrentTab] = useState('1');
  
  // localStorageからpermissionsを取得（userInfo経由）
  const permissions = getPermissionsFromToken();

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
        userPermissions={permissions}
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
