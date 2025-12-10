'use client';

import React, { useState } from 'react';
import { Layout, Tabs, Card, Typography } from 'antd';
import {
  TeamOutlined,
  ShopOutlined,
  FolderOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * システム管理者メニューのProps
 */
interface SystemAdminMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

/**
 * システム管理者メニュー画面
 * タブ形式でメニューを表示
 */
export default function SystemAdminMenu({ user, onLogout, onNavigate }: SystemAdminMenuProps) {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState('1');

  const tabItems = [
    {
      key: '1',
      label: t('menu.system_admin.tabs.userManagement'),
      icon: <TeamOutlined />,
    },
    {
      key: '2',
      label: t('menu.system_admin.tabs.organizationSettings'),
      icon: <ShopOutlined />,
    },
    {
      key: '3',
      label: t('menu.system_admin.tabs.fileManagement'),
      icon: <FolderOutlined />,
    },
    {
      key: '4',
      label: t('menu.system_admin.tabs.experimentList'),
      icon: <ExperimentOutlined />,
    },
    {
      key: '5',
      label: t('menu.system_admin.tabs.statistics'),
      icon: <BarChartOutlined />,
    },
    {
      key: '6',
      label: t('menu.system_admin.tabs.auditLog'),
      icon: <AuditOutlined />,
    },
  ];

  const handleTabChange = (key: string) => {
    setCurrentTab(key);
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
