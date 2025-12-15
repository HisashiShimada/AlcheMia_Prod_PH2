'use client';

import React from 'react';
import { Typography, Space, Tabs, Dropdown, Button } from 'antd';
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

const { Title } = Typography;

/**
 * サブヘッダーのルートコンテナ
 * UIポリシー: 高さ48px固定
 */
const SubHeaderContainer = styled.div`
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  height: 48px;
  z-index: 999;
  background-color: #0093CF;
  color: white;
  border-bottom: 1px solid #007AB3;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

/**
 * 内部コンテナ
 * UIポリシー: レスポンシブpadding
 * - デスクトップ (lg+): 0 50px
 * - タブレット (md): 0 24px
 * - モバイル (xs, sm): 0 16px
 */
const SubHeaderInner = styled.div`
  height: 100%;
  margin: 0 auto;
  padding: 0 50px;

  @media (max-width: 991px) {
    padding: 0 24px;
  }

  @media (max-width: 767px) {
    padding: 0 16px;
  }
`;

/**
 * コンテンツ領域（タイトル、タブ、アクションを含む）
 */
const SubHeaderContent = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-top: 8px;
  padding-bottom: 0;
  gap: 24px;
`;

/**
 * タイトル領域
 */
const TitleWrapper = styled.div<{ hasTabs: boolean }>`
  margin-bottom: ${(props: { hasTabs: boolean }) => props.hasTabs ? '0' : '16px'};
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
  /* UIポリシー: インジケーター色は colorPrimary (#CF0027) */
  .ant-tabs-ink-bar {
    background-color: #CF0027 !important;
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
const ActionsWrapper = styled.div<{ hasTabs: boolean }>`
  margin-bottom: ${(props: { hasTabs: boolean }) => props.hasTabs ? '8px' : '16px'};
  flex-shrink: 0;
`;

/**
 * メニュー切替ボタン（styled-components）
 * UIポリシー: テーマベースのスタイル、transitionは0.2s
 */
const MenuSwitchButton = styled(Button)`
  border-color: rgba(255, 255, 255, 0.8) !important;
  color: white !important;
  font-weight: 500 !important;
  height: 36px !important;
  padding-left: 16px !important;
  padding-right: 16px !important;
  transition: all 0.2s ease !important;

  &:hover {
    border-color: white !important;
    background-color: rgba(255, 255, 255, 0.15) !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  }

  &:active {
    transform: translateY(0);
  }
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
 * メニュー種別
 */
export type MenuType = 'provider' | 'system_admin' | 'data_admin' | 'experiment_admin' | 'experiment_worker';

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
}: SubHeaderProps) {
  const hasTabs = tabs && tabs.length > 0;

  // Ant Design TabsPropsの形式に変換
  const tabItems: TabsProps['items'] = tabs?.map((tab) => ({
    key: tab.key,
    label: tab.label,
    icon: tab.icon,
    disabled: tab.disabled,
  }));

  // メニュー切り替えドロップダウンのアイテム
  const menuItems: MenuProps['items'] = [
    {
      key: 'provider',
      label: 'プロバイダーメニュー',
      icon: <AppstoreOutlined />,
      disabled: currentMenu === 'provider',
      onClick: () => onMenuChange?.('provider'),
    },
    {
      key: 'system_admin',
      label: 'システム管理者メニュー',
      icon: <TeamOutlined />,
      disabled: currentMenu === 'system_admin',
      onClick: () => onMenuChange?.('system_admin'),
    },
    {
      key: 'data_admin',
      label: 'データ管理者メニュー',
      icon: <DatabaseOutlined />,
      disabled: currentMenu === 'data_admin',
      onClick: () => onMenuChange?.('data_admin'),
    },
    {
      key: 'experiment_admin',
      label: '実験管理者メニュー',
      icon: <ExperimentOutlined />,
      disabled: currentMenu === 'experiment_admin',
      onClick: () => onMenuChange?.('experiment_admin'),
    },
    {
      key: 'experiment_worker',
      label: '実験作業者メニュー',
      icon: <UserOutlined />,
      disabled: currentMenu === 'experiment_worker',
      onClick: () => onMenuChange?.('experiment_worker'),
    },
  ];

  return (
    <SubHeaderContainer>
      <SubHeaderInner>
        <SubHeaderContent>
          {/* 左側: タイトル */}
          <TitleWrapper hasTabs={!!hasTabs}>
            <Title
              level={4}
              style={{
                margin: 0,
                color: 'white',
                fontWeight: 600,
                fontSize: 24, // UIポリシー: fontSizeHeading3 (24px)
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
          {(actions || onMenuChange) && (
            <ActionsWrapper hasTabs={!!hasTabs}>
              <Space size="small">
                {actions}
                {onMenuChange && (
                  <Dropdown
                    menu={{ items: menuItems }}
                    trigger={['hover']}
                    placement="bottomRight"
                    overlayStyle={{
                      minWidth: 240,
                    }}
                  >
                    <MenuSwitchButton
                      type="primary"
                      ghost
                      icon={<SwapOutlined />}
                    >
                      メニュー切替
                    </MenuSwitchButton>
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
