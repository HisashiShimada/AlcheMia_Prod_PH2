'use client';

import React, { useState } from 'react';
import { Layout, theme } from 'antd';
import {
  ShopOutlined,
  AuditOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { User, MenuType } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPermissionsFromToken } from '@/utils/jwtUtils';
import dynamic from 'next/dynamic';

// Providerコンポーネントの動的インポート
const OrganizationManagement = dynamic(
  () => import('../Provider/OrganizationManagement'),
  { ssr: false }
);

const CorporationManagement = dynamic(
  () => import('../Provider/CorporationManagement'),
  { ssr: false }
);

const InformationDownload = dynamic(
  () => import('../Provider/InformationDownload'),
  { ssr: false }
);

const { Content } = Layout;

/**
 * プロバイダーメニューのProps
 */
interface ProviderMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onMenuChange?: (menuType: MenuType) => void;
}

/**
 * プロバイダーメニュー画面
 * タブ形式でメニューを表示
 */
export default function ProviderMenu({ user, onLogout, onMenuChange }: ProviderMenuProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [currentTab, setCurrentTab] = useState('1');
  
  // localStorageからpermissionsを取得（userInfo経由）
  const permissions = getPermissionsFromToken();

  const tabItems = [
    {
      key: '1',
      label: t('menu.provider.tabs.organizationManagement'),
      icon: <ShopOutlined />,
    },
    {
      key: '2',
      label: t('menu.provider.tabs.corporationManagement'),
      icon: <AuditOutlined />,
    },
    {
      key: '3',
      label: t('menu.provider.tabs.informationDownload'),
      icon: <DatabaseOutlined />,
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

  // Header + SubHeaderの高さ (Header: 64px, SubHeader with tabs: 約76px)
  const HEADER_TOTAL_HEIGHT = 140;

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader 
        title={t('menu.provider.title')}
        tabs={tabItems}
        activeTabKey={currentTab}
        onTabChange={handleTabChange}
        currentMenu="provider"
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
          padding: 0,
        }}
      >
        <div>
          {/* タブ1: 組織管理 */}
          {currentTab === '1' && <OrganizationManagement />}
          
          {/* タブ2: 会社管理 */}
          {currentTab === '2' && <CorporationManagement />}
          
          {/* タブ3: 情報ダウンロード */}
          {currentTab === '3' && <InformationDownload />}
        </div>
      </Content>
    </Layout>
  );
}
