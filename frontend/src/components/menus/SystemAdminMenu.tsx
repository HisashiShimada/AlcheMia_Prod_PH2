'use client';

import React, { useState } from 'react';
import { Layout, Card, Typography, theme } from 'antd';
import {
  TeamOutlined,
  ShopOutlined,
  FolderOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  AuditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader, { MenuType } from '../common/SubHeader';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';
// モックコンポーネントのインポート
import SystemOverviewMock from '../../../mock/components/SystemOverviewMock';
import UserManagement from '../../../mock/components/UserManagement';
import OrganizationStatisticsMock from '../../../mock/components/OrganizationStatisticsMock';
import SessionManagementMock from '../../../mock/components/SessionManagementMock';
import MasterManagementMock from '../../../mock/components/MasterManagementMock';
import RoleManagementMock from '../../../mock/components/RoleManagementMock';

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * システム管理者メニューのProps
 */
interface SystemAdminMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onMenuChange?: (menuType: MenuType) => void;
}

/**
 * システム管理者メニュー画面
 * タブ形式でメニューを表示
 */
export default function SystemAdminMenu({ user, onLogout, onNavigate, onMenuChange }: SystemAdminMenuProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [currentTab, setCurrentTab] = useState('1');

  const tabItems = [
    {
      key: '1',
      label: t('menu.system_admin.tabs.systemOverview'),
      icon: <EyeOutlined />,
    },
    {
      key: '2',
      label: t('menu.system_admin.tabs.organizationStatistics'),
      icon: <BarChartOutlined />,
    },
    {
      key: '3',
      label: t('menu.system_admin.tabs.userManagement'),
      icon: <TeamOutlined />,
    },
    {
      key: '4',
      label: t('menu.system_admin.tabs.sessionManagement'),
      icon: <ExperimentOutlined />,
    },
    {
      key: '5',
      label: '部署管理',
      icon: <ShopOutlined />,
    },
    {
      key: '6',
      label: 'ロール管理',
      icon: <AuditOutlined />,
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
        title={t('menu.system_admin.title')}
        tabs={tabItems}
        activeTabKey={currentTab}
        onTabChange={handleTabChange}
        currentMenu="system_admin"
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
        {/* タブ1: システム概要 */}
        {currentTab === '1' && <SystemOverviewMock />}

        {/* タブ2: 組織統計情報 */}
        {currentTab === '2' && <OrganizationStatisticsMock />}

        {/* タブ3: ユーザー管理 */}
        {currentTab === '3' && <UserManagement />}

        {/* タブ4: セッション管理 */}
        {currentTab === '4' && <SessionManagementMock />}

        {/* タブ5: 部署管理 */}
        {currentTab === '5' && (
          <div style={{ padding: token.paddingContentVertical }}>
            <MasterManagementMock initialMasterId="2" />
          </div>
        )}

        {/* タブ6: ロール管理 */}
        {currentTab === '6' && (
          <div style={{ padding: token.paddingContentVertical }}>
            <RoleManagementMock />
          </div>
        )}
      </Content>
    </Layout>
  );
}
