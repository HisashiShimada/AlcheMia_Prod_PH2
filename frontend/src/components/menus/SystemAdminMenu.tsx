'use client';

import React, { useState } from 'react';
import { Layout, Tabs, Card, Typography, message } from 'antd';
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
  const [currentTab, setCurrentTab] = useState('1');

  const tabItems = [
    {
      key: '1',
      label: t('menu.system_admin.tabs.systemOverview'),
      icon: <EyeOutlined />,
    },
    {
      key: '2',
      label: t('menu.system_admin.tabs.statistics'),
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
          marginTop: 0, // Header(64px) + SubHeader(タブ込みで約76px)
          padding: 50,
        }}
      >
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          {/* タブ1: システム概要 */}
          {currentTab === '1' && <SystemOverviewMock />}

          {/* タブ2: 組織統計情報 */}
          {currentTab === '2' && <OrganizationStatisticsMock />}

          {/* タブ3: ユーザー管理 */}
          {currentTab === '3' && (
            <Card
              style={{
                minHeight: 400,
                borderRadius: 12,
                margin: '24px',
              }}
              styles={{
                body: {
                  padding: 24,
                },
              }}
            >
              <Title level={4} style={{ marginTop: 0, marginBottom: 24 }}>
                {/* {currentTabLabel} */}
              </Title>
              <UserManagement />
            </Card>
          )}

          {/* タブ4: セッション管理 */}
          {currentTab === '4' && (
            <Card
              style={{
                minHeight: 400,
                borderRadius: 12,
                margin: '24px',
              }}
              styles={{
                body: {
                  padding: 24,
                },
              }}
            >
              <Title level={4} style={{ marginTop: 0, marginBottom: 24 }}>
                {/* {currentTabLabel} */}
              </Title>
              <SessionManagementMock />
            </Card>
          )}
        </div>
      </Content>
    </Layout>
  );
}
