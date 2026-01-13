'use client';

import React, { useState } from 'react';
import { Layout, Card, Typography, theme } from 'antd';
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
import dynamic from 'next/dynamic';

// モックコンポーネントの動的インポート
const OrganizationManagementMock = dynamic(
  () => import('../../../mock/components/OrganizationManagementMock'),
  { ssr: false }
);

const InformationDownloadMock = dynamic(
  () => import('../../../mock/components/InformationDownloadMock'),
  { ssr: false }
);

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
  const { token } = theme.useToken();
  const [currentTab, setCurrentTab] = useState('1');

  const tabItems = [
    {
      key: '1',
      label: t('menu.provider.tabs.organizationManagement'),
      icon: <ShopOutlined />,
    },
    {
      key: '2',
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

  const currentTabLabel = tabItems.find(item => item.key === currentTab)?.label || '';

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
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          {/* タブ1: 組織管理 */}
          {currentTab === '1' && <OrganizationManagementMock />}
          
          {/* タブ2: 情報ダウンロード */}
          {currentTab === '2' && <InformationDownloadMock />}
          
          {/* タブ3-6: 未実装 */}
          {/* {['3', '4', '5', '6'].includes(currentTab) && (
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
          )} */}
        </div>
      </Content>
    </Layout>
  );
}
