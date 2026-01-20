'use client';

import React, { useState } from 'react';
import { Card, Space, Dropdown, Tabs, Button, Menu, Avatar, Divider, Typography, Badge, theme } from 'antd';
import type { MenuProps, TabsProps } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  GlobalOutlined,
  CheckOutlined,
  SwapOutlined,
  AppstoreOutlined,
  TeamOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  HomeOutlined,
  DashboardOutlined,
  ProjectOutlined,
  FileTextOutlined,
  FolderOutlined,
  BellOutlined,
  MailOutlined,
} from '@ant-design/icons';
import styled from '@emotion/styled';

const { Title, Text, Paragraph } = Typography;

// タブ用のコンテナ（青背景をシミュレート）
const TabContainer = styled.div<{ bgColor: string }>`
  background-color: ${props => props.bgColor};
  padding: 16px 24px 0;
  border-radius: 8px 8px 0 0;
  
  /* Ant Design Tabsのカスタマイズ */
  .ant-tabs {
    color: white;
  }
  
  .ant-tabs-nav {
    margin-bottom: 0 !important;
    
    &::before {
      border-bottom: none !important;
    }
  }
  
  .ant-tabs-tab {
    padding: 8px 0 !important;
    margin: 0 24px 0 0 !important;
    color: rgba(255, 255, 255, 0.7) !important;
    font-size: 16px !important;
    font-weight: 400 !important;
    
    &:hover {
      color: white !important;
    }
    
    &.ant-tabs-tab-active {
      color: white !important;
      font-weight: 600 !important;
      
      .ant-tabs-tab-btn {
        color: white !important;
      }
    }
    
    &.ant-tabs-tab-disabled {
      color: rgba(255, 255, 255, 0.3) !important;
    }
  }
  
  .ant-tabs-ink-bar {
    background-color: white !important;
    height: 3px !important;
    border-radius: 3px 3px 0 0 !important;
  }
`;

// メニュー切り替えボタン用のスタイル（青背景用）
const MenuSwitchButton = styled(Button)`
  border-color: rgba(255, 255, 255, 0.8) !important;
  color: white !important;
  font-weight: 500 !important;
  height: 36px !important;
  transition: all 0.3s ease-out !important;
  
  &:hover {
    border-color: white !important;
    background-color: rgba(255, 255, 255, 0.15) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  }
`;

/**
 * メニューパターンのデモコンポーネント
 * 全5パターンを表示
 */
export default function MenuPatternsDemo() {
  const { token } = theme.useToken();
  
  // パターン1: ドロップダウンメニュー
  const [selectedLanguage, setSelectedLanguage] = useState('ja');
  
  // パターン2: タブメニュー
  const [activeTab, setActiveTab] = useState('overview');
  
  // パターン3: メニュー切り替え
  const [currentMenu, setCurrentMenu] = useState('provider');
  
  // パターン4: サイドバーメニュー
  const [selectedSidebarKey, setSelectedSidebarKey] = useState('home');
  
  // パターン5: 水平メニュー
  const [selectedHorizontalKey, setSelectedHorizontalKey] = useState('dashboard');

  // パターン1: ユーザードロップダウンメニュー
  const languageMenuItems: MenuProps['items'] = [
    {
      key: 'ja',
      label: (
        <Space>
          <span>日本語</span>
          {selectedLanguage === 'ja' && <CheckOutlined style={{ color: token.colorPrimary }} />}
        </Space>
      ),
      onClick: () => setSelectedLanguage('ja'),
    },
    {
      key: 'en',
      label: (
        <Space>
          <span>English</span>
          {selectedLanguage === 'en' && <CheckOutlined style={{ color: token.colorPrimary }} />}
        </Space>
      ),
      onClick: () => setSelectedLanguage('en'),
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'プロフィール',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: '設定',
      icon: <SettingOutlined />,
    },
    {
      key: 'language',
      label: '言語設定',
      icon: <GlobalOutlined />,
      children: languageMenuItems,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'ログアウト',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  // パターン2: タブメニュー
  const tabItems: TabsProps['items'] = [
    {
      key: 'overview',
      label: '概要',
      icon: <AppstoreOutlined />,
    },
    {
      key: 'users',
      label: 'ユーザー管理',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: '設定',
      icon: <SettingOutlined />,
    },
    {
      key: 'reports',
      label: 'レポート',
      icon: <FileTextOutlined />,
      disabled: true,
    },
  ];

  // パターン3: メニュー切り替えドロップダウン
  const menuSwitchItems: MenuProps['items'] = [
    {
      key: 'provider',
      label: 'プロバイダーメニュー',
      icon: <AppstoreOutlined />,
      disabled: currentMenu === 'provider',
      onClick: () => setCurrentMenu('provider'),
    },
    {
      key: 'system_admin',
      label: 'システム管理者メニュー',
      icon: <TeamOutlined />,
      disabled: currentMenu === 'system_admin',
      onClick: () => setCurrentMenu('system_admin'),
    },
    {
      key: 'data_admin',
      label: 'データ管理者メニュー',
      icon: <DatabaseOutlined />,
      disabled: currentMenu === 'data_admin',
      onClick: () => setCurrentMenu('data_admin'),
    },
    {
      key: 'experiment_admin',
      label: '実験管理者メニュー',
      icon: <ExperimentOutlined />,
      disabled: currentMenu === 'experiment_admin',
      onClick: () => setCurrentMenu('experiment_admin'),
    },
    {
      key: 'experiment_worker',
      label: '実験作業者メニュー',
      icon: <UserOutlined />,
      disabled: currentMenu === 'experiment_worker',
      onClick: () => setCurrentMenu('experiment_worker'),
    },
  ];

  // パターン4: サイドバーメニュー（垂直）
  const sidebarMenuItems: MenuProps['items'] = [
    {
      key: 'home',
      label: 'ホーム',
      icon: <HomeOutlined />,
    },
    {
      key: 'projects',
      label: 'プロジェクト',
      icon: <FolderOutlined />,
      children: [
        {
          key: 'projects-list',
          label: 'プロジェクト一覧',
        },
        {
          key: 'projects-create',
          label: '新規プロジェクト',
        },
      ],
    },
    {
      key: 'users',
      label: 'ユーザー管理',
      icon: <UserOutlined />,
      children: [
        {
          key: 'users-list',
          label: 'ユーザー一覧',
        },
        {
          key: 'users-create',
          label: 'ユーザー作成',
        },
      ],
    },
    {
      key: 'notifications',
      label: (
        <Badge count={5} size="small" offset={[10, 0]}>
          <span>通知</span>
        </Badge>
      ),
      icon: <BellOutlined />,
    },
    {
      key: 'messages',
      label: (
        <Badge count={2} size="small" offset={[10, 0]}>
          <span>メッセージ</span>
        </Badge>
      ),
      icon: <MailOutlined />,
    },
    {
      key: 'settings',
      label: '設定',
      icon: <SettingOutlined />,
    },
  ];

  // パターン5: 水平メニュー
  const horizontalMenuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      label: 'ダッシュボード',
      icon: <DashboardOutlined />,
    },
    {
      key: 'projects',
      label: 'プロジェクト',
      icon: <ProjectOutlined />,
    },
    {
      key: 'reports',
      label: 'レポート',
      icon: <FileTextOutlined />,
      children: [
        {
          key: 'reports-monthly',
          label: '月次レポート',
        },
        {
          key: 'reports-yearly',
          label: '年次レポート',
        },
      ],
    },
    {
      key: 'settings',
      label: '設定',
      icon: <SettingOutlined />,
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* ヘッダー */}
      <div>
        <Title level={2}>ナビゲーションメニューパターン</Title>
        <Paragraph>
          MaiML Viewerで使用する5種類のナビゲーションメニューパターンを表示します。
        </Paragraph>
      </div>

      {/* パターン1: ドロップダウンメニュー（Header用） */}
      <Card title="パターン1: ドロップダウンメニュー（Header用）">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> ヘッダーのユーザーアクション、言語切替、設定メニュー</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <Text> Avatar クリックで開く、階層構造サポート、danger項目サポート</Text>
          </div>
          
          <Divider>デモ</Divider>
          
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Avatar
                style={{
                  backgroundColor: token.colorPrimary,
                  cursor: 'pointer',
                  fontSize: token.fontSizeLG,
                  fontWeight: token.fontWeightStrong,
                }}
                size={36}
              >
                U
              </Avatar>
            </Dropdown>
          </div>
          
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ※ Avatarをクリックしてメニューを開いてください
          </Text>
        </Space>
      </Card>

      {/* パターン2: タブメニュー（SubHeader用） */}
      <Card title="パターン2: タブメニュー（SubHeader用）">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> サブヘッダーの画面切り替え、機能切り替え</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <Text> 青背景に最適化、白色インジケーター、アイコン付きサポート</Text>
          </div>
          
          <Divider>デモ</Divider>
          
          <TabContainer bgColor={token.colorInfo}>
            <Tabs
              activeKey={activeTab}
              items={tabItems}
              onChange={setActiveTab}
              size="large"
            />
          </TabContainer>
          
          <div style={{ 
            backgroundColor: token.colorBgContainer,
            padding: '16px 24px',
            border: `1px solid ${token.colorBorder}`,
            borderTop: 'none',
            borderRadius: '0 0 8px 8px'
          }}>
            <Text>現在のタブ: <Text strong>{activeTab}</Text></Text>
          </div>
        </Space>
      </Card>

      {/* パターン3: メニュー切り替えドロップダウン（SubHeader用） */}
      <Card title="パターン3: メニュー切り替えドロップダウン（SubHeader用）">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> ロール別メニューの切り替え</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <Text> 5種類のメニュータイプ対応、現在のメニューはdisabled、ホバーエフェクト</Text>
          </div>
          
          <Divider>デモ</Divider>
          
          <div style={{ 
            backgroundColor: token.colorInfo,
            padding: '16px 24px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Text style={{ color: 'white', fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong }}>
              {currentMenu === 'provider' && 'プロバイダーメニュー'}
              {currentMenu === 'system_admin' && 'システム管理者メニュー'}
              {currentMenu === 'data_admin' && 'データ管理者メニュー'}
              {currentMenu === 'experiment_admin' && '実験管理者メニュー'}
              {currentMenu === 'experiment_worker' && '実験作業者メニュー'}
            </Text>
            
            <Dropdown
              menu={{ items: menuSwitchItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <MenuSwitchButton type="primary" ghost icon={<SwapOutlined />}>
                メニュー切替
              </MenuSwitchButton>
            </Dropdown>
          </div>
        </Space>
      </Card>

      {/* パターン4: サイドバーメニュー（垂直） */}
      <Card title="パターン4: サイドバーメニュー（垂直）">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> メインナビゲーション、サイドバーメニュー</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <Text> 階層構造サポート、バッジ表示、左側アクティブボーダー</Text>
          </div>
          
          <Divider>デモ</Divider>
          
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Menu
              mode="inline"
              selectedKeys={[selectedSidebarKey]}
              items={sidebarMenuItems}
              onSelect={({ key }) => setSelectedSidebarKey(key)}
              style={{ 
                width: 256,
                border: `1px solid ${token.colorBorder}`,
                borderRadius: token.borderRadius
              }}
            />
          </div>
          
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ※ メニュー項目をクリックして選択状態を確認してください
          </Text>
        </Space>
      </Card>

      {/* パターン5: 水平メニュー */}
      <Card title="パターン5: 水平メニュー">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> トップナビゲーション、カテゴリ切り替え</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <Text> 下線インジケーター、サブメニュー対応、レスポンシブ対応</Text>
          </div>
          
          <Divider>デモ</Divider>
          
          <Menu
            mode="horizontal"
            selectedKeys={[selectedHorizontalKey]}
            items={horizontalMenuItems}
            onSelect={({ key }) => setSelectedHorizontalKey(key)}
            style={{ 
              height: 48,
              lineHeight: '48px',
              borderBottom: `1px solid ${token.colorBorder}`,
            }}
          />
          
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ※ メニュー項目をクリックして選択状態とインジケーターを確認してください
          </Text>
        </Space>
      </Card>

      {/* 実装ガイド */}
      <Card title="実装ガイド" type="inner">
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text strong>パターン選択の基準:</Text>
          <ul style={{ marginLeft: '20px' }}>
            <li><Text>ヘッダーのユーザーアクション → パターン1（ドロップダウンメニュー）</Text></li>
            <li><Text>サブヘッダーの画面切り替え → パターン2（タブメニュー）</Text></li>
            <li><Text>ロール別メニュー切り替え → パターン3（メニュー切り替えドロップダウン）</Text></li>
            <li><Text>サイドバーのメインナビゲーション → パターン4（サイドバーメニュー）</Text></li>
            <li><Text>トップナビゲーション → パターン5（水平メニュー）</Text></li>
          </ul>
          
          <Divider />
          
          <Text strong>共通仕様:</Text>
          <ul style={{ marginLeft: '20px' }}>
            <li><Text>アイコンとテキストを併用</Text></li>
            <li><Text>選択状態を明確に表示</Text></li>
            <li><Text>ホバーエフェクトを実装</Text></li>
            <li><Text>disabled状態をサポート</Text></li>
            <li><Text>階層は2階層まで</Text></li>
            <li><Text>メニュー項目は7±2個以内</Text></li>
          </ul>
        </Space>
      </Card>
    </Space>
  );
}
