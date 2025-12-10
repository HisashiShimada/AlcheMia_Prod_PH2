'use client';

import React, { useState } from 'react';
import { Layout, Tabs, Card, Typography, message } from 'antd';
import {
  ShopOutlined,
  TeamOutlined,
  SettingOutlined,
  AuditOutlined,
  DatabaseOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader, { MenuType } from '../common/SubHeader';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

const { Content } = Layout;
const { Title, Text } = Typography;

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
export default function ProviderMenu({ user, onLogout, onNavigate, onMenuChange }: ProviderMenuProps) {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState('1');

  const tabItems = [
    {
      key: '1',
      label: t('menu.provider.tabs.organizationManagement'),
      icon: <ShopOutlined />,
    },
    {
      key: '2',
      label: t('menu.provider.tabs.userManagement'),
      icon: <TeamOutlined />,
    },
    {
      key: '3',
      label: t('menu.provider.tabs.systemSettings'),
      icon: <SettingOutlined />,
    },
    {
      key: '4',
      label: t('menu.provider.tabs.auditLog'),
      icon: <AuditOutlined />,
    },
    {
      key: '5',
      label: t('menu.provider.tabs.storageManagement'),
      icon: <DatabaseOutlined />,
    },
    {
      key: '6',
      label: t('menu.provider.tabs.statistics'),
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
        title={t('menu.provider.title')}
        tabs={tabItems}
        activeTabKey={currentTab}
        onTabChange={handleTabChange}
        currentMenu="provider"
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
