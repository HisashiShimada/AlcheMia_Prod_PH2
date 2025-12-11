'use client';

import React, { useState } from 'react';
import { Layout, Card, Typography, message } from 'antd';
import {
  CheckSquareOutlined,
  FormOutlined,
  EyeOutlined,
  UploadOutlined,
  LineChartOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader, { MenuType } from '../common/SubHeader';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * 実験作業者メニューのProps
 */
interface ExperimentWorkerMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onMenuChange?: (menuType: MenuType) => void;
}

/**
 * 実験作業者メニュー画面
 * サブヘッダーに埋め込まれたタブでメニューを表示
 */
export default function ExperimentWorkerMenu({ user, onLogout, onNavigate, onMenuChange }: ExperimentWorkerMenuProps) {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState('1');

  const tabItems = [
    {
      key: '1',
      label: t('menu.experiment_worker.tabs.myTasks'),
      icon: <CheckSquareOutlined />,
    },
    {
      key: '2',
      label: t('menu.experiment_worker.tabs.experimentRecord'),
      icon: <FormOutlined />,
    },
    {
      key: '3',
      label: t('menu.experiment_worker.tabs.maimlViewer'),
      icon: <EyeOutlined />,
    },
    {
      key: '4',
      label: t('menu.experiment_worker.tabs.fileUpload'),
      icon: <UploadOutlined />,
    },
    {
      key: '5',
      label: t('menu.experiment_worker.tabs.progressReport'),
      icon: <LineChartOutlined />,
    },
    {
      key: '6',
      label: t('menu.experiment_worker.tabs.history'),
      icon: <HistoryOutlined />,
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
        title={t('menu.experiment_worker.title')}
        tabs={tabItems}
        activeTabKey={currentTab}
        onTabChange={handleTabChange}
        currentMenu="experiment_worker"
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
