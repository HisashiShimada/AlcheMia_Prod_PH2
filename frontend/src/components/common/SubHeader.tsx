'use client';

import React from 'react';
import { Typography, Space, Tabs, Dropdown, Button, theme } from 'antd';
import type { TabsProps, MenuProps } from 'antd';
import styled from '@emotion/styled';
import {
  AppstoreOutlined,
  TeamOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  UserOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Permission, MenuType } from '@/types/auth';
import { hasMenuPermission } from '@/utils/menuPermissions';

const { Title } = Typography;

// テーマトークン用の型定義
interface ThemeToken {
  colorInfo: string;
  colorBorderSecondary: string;
  paddingXS: number;
  paddingLG: number;
  paddingXL: number;
  marginLG: number;
  fontSizeHeading4: number;
  fontWeightStrong: number;
  fontSize: number;
}

/**
 * サブヘッダーのルートコンテナ
 */
const SubHeaderContainer = styled.div<{ token: ThemeToken }>`
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  z-index: 999;
  background-color: ${props => props.token.colorInfo};
  color: white;
  border-bottom: 1px solid ${props => props.token.colorBorderSecondary};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

/**
 * 内部コンテナ
 */
const SubHeaderInner = styled.div<{ token: ThemeToken }>`
  margin: 0 auto;
  padding: 0 12px;
`;

/**
 * コンテンツ領域（タイトル、タブ、アクションを含む）
 */
const SubHeaderContent = styled.div<{ token: ThemeToken }>`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-top: ${props => props.token.paddingXL / 4}px;
  padding-bottom: 0;
  gap: ${props => props.token.marginLG}px;
`;

/**
 * タイトル領域
 */
const TitleWrapper = styled.div<{ hasTabs: boolean; token: ThemeToken }>`
  align-self: center;
  margin-bottom: ${(props: { hasTabs: boolean; token: ThemeToken }) => props.hasTabs ? '0' : `${props.token.paddingXL / 4}px`};
  flex-shrink: 0;
`;

/**
 * タブ領域
 */
const TabsWrapper = styled.div`
  flex: 1;
  min-width: 0;
  
  /* Ant Design Tabsのカスタマイズ */
  .ant-tabs {
    color: white;
  }
  
  /* タブナビゲーション */
  .ant-tabs-nav {
    margin-bottom: 0 !important;
    
    &::before {
      border-bottom: none !important;
    }
  }
  
  /* タブアイテム */
  .ant-tabs-tab {
    padding: 8px 0 !important;
    margin: 0 24px 0 0 !important;
    color: rgba(255, 255, 255, 0.7) !important;
    font-size: 16px !important;
    font-weight: 400 !important;
    transition: all 0.2s ease !important;
    
    /* ホバー時 */
    &:hover {
      color: white !important;
    }
    
    /* アクティブ状態 */
    &.ant-tabs-tab-active {
      color: white !important;
      font-weight: 600 !important;
      
      .ant-tabs-tab-btn {
        color: white !important;
      }
    }
    
    /* タブボタン */
    .ant-tabs-tab-btn {
      color: inherit;
    }
    
    /* 無効状態 */
    &.ant-tabs-tab-disabled {
      color: rgba(255, 255, 255, 0.3) !important;
      cursor: not-allowed !important;
      
      .ant-tabs-tab-btn {
        color: rgba(255, 255, 255, 0.3) !important;
      }
    }
  }
  
  /* アクティブインジケーター（下線） */
  .ant-tabs-ink-bar {
    background-color: white !important;
    height: 3px !important;
    border-radius: 3px 3px 0 0 !important;
  }
  
  /* アイコンとテキストのスペース */
  .ant-tabs-tab-icon {
    margin-right: 8px;
  }
`;

/**
 * アクション領域
 */
const ActionsWrapper = styled.div<{ hasTabs: boolean; token: ThemeToken }>`
  margin-bottom: ${(props: { hasTabs: boolean; token: ThemeToken }) => `${props.token.paddingXL / 4}px`};
  flex-shrink: 0;
`;

/**
 * タブアイテムの型定義
 */
interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

/**
 * サブヘッダーコンポーネントのProps
 */
interface SubHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{
    label: string;
    path?: string;
    onClick?: () => void;
  }>;
  actions?: React.ReactNode;
  
  // タブ機能
  tabs?: TabItem[];
  activeTabKey?: string;
  onTabChange?: (key: string) => void;
  
  // メニュー切り替え機能
  currentMenu?: MenuType;
  onMenuChange?: (menuType: MenuType) => void;
  userPermissions?: Permission[];
}

/**
 * サブヘッダーコンポーネント
 * メニュー画面の2段目ヘッダー（青系背景）
 * タブを埋め込むことが可能
 */
export default function SubHeader({ 
  title, 
  actions,
  tabs,
  activeTabKey,
  onTabChange,
  currentMenu,
  onMenuChange,
  userPermissions,
}: SubHeaderProps) {
  const { token } = theme.useToken();
  const hasTabs = tabs && tabs.length > 0;

  // Ant Design TabsPropsの形式に変換
  const tabItems: TabsProps['items'] = tabs?.map((tab) => ({
    key: tab.key,
    label: tab.label,
    icon: tab.icon,
    disabled: tab.disabled,
  }));

  // すべてのメニュー定義
  const allMenuItems = [
    {
      key: 'provider',
      menuType: 'provider' as MenuType,
      label: 'プロバイダーメニュー',
      icon: <AppstoreOutlined />,
    },
    {
      key: 'system_admin',
      menuType: 'system_admin' as MenuType,
      label: 'システム管理者メニュー',
      icon: <TeamOutlined />,
    },
    {
      key: 'data_admin',
      menuType: 'data_admin' as MenuType,
      label: 'データ管理者メニュー',
      icon: <DatabaseOutlined />,
    },
    {
      key: 'experiment_admin',
      menuType: 'experiment_admin' as MenuType,
      label: '実験管理者メニュー',
      icon: <ExperimentOutlined />,
    },
    {
      key: 'experiment_worker',
      menuType: 'experiment_worker' as MenuType,
      label: '実験作業者メニュー',
      icon: <UserOutlined />,
    },
  ];

  // 権限のあるメニューのみをフィルタリング & 現在のメニューを除外
  const menuItems: MenuProps['items'] = allMenuItems
    .filter(item => 
      hasMenuPermission(userPermissions, item.menuType) &&
      currentMenu !== item.menuType
    )
    .map(item => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      onClick: () => onMenuChange?.(item.menuType),
    }));

  return (
    <SubHeaderContainer token={token}>
      <SubHeaderInner token={token}>
        <SubHeaderContent token={token}>
          {/* 左側: タイトル */}
          <TitleWrapper hasTabs={!!hasTabs} token={token}>
            <Title
              level={4}
              style={{
                margin: 0,
                color: 'white',
                fontWeight: token.fontWeightStrong,
                fontSize: token.fontSizeHeading4,
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </Title>
          </TitleWrapper>

          {/* 中央: タブ（Ant Design Tabs） */}
          {hasTabs && (
            <TabsWrapper>
              <Tabs
                activeKey={activeTabKey}
                items={tabItems}
                onChange={onTabChange}
                size="large"
              />
            </TabsWrapper>
          )}

          {/* 右側: アクションボタン + メニュー切り替え */}
          {(actions || (onMenuChange && menuItems.length > 0)) && (
            <ActionsWrapper hasTabs={!!hasTabs} token={token}>
              <Space size="small">
                {actions}
                {onMenuChange && menuItems.length > 0 && (
                  <Dropdown
                    menu={{ items: menuItems }}
                    trigger={['click']}
                    placement="bottomRight"
                    styles={{
                      root: {
                        minWidth: 240,
                      },
                    }}
                  >
                    <Button
                      type="primary"
                      ghost
                      icon={<SwapOutlined />}
                      style={{
                        borderColor: 'rgba(255, 255, 255, 0.8)',
                        color: 'white',
                        fontWeight: 500,
                        height: 36,
                        paddingLeft: token.marginLG,
                        paddingRight: token.marginLG,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'white';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      メニュー切替
                    </Button>
                  </Dropdown>
                )}
              </Space>
            </ActionsWrapper>
          )}
        </SubHeaderContent>
      </SubHeaderInner>
    </SubHeaderContainer>
  );
}
