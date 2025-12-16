'use client';

import React from 'react';
import { Layout, Typography, Avatar, Dropdown, Space, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  GlobalOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

const { Header: AntHeader } = Layout;
const { Text, Title } = Typography;

/**
 * ヘッダーコンポーネントのProps
 */
interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

/**
 * ヘッダーコンポーネント
 * UIポリシーに基づいた白背景のモダンなヘッダー
 */
export default function Header({ user, onLogout }: HeaderProps) {
  const { t, locale, setLocale } = useLanguage();
  const { token } = theme.useToken();

  // ロール名の表示
  const getRoleLabel = (role: string): string => {
    return t(`roles.${role}`) || role;
  };

  // 言語選択サブメニュー
  const languageMenuItems: MenuProps['items'] = [
    {
      key: 'ja',
      label: (
        <Space>
          <span>{t('languages.ja')}</span>
          {locale === 'ja' && <CheckOutlined style={{ color: token.colorPrimary }} />}
        </Space>
      ),
      onClick: () => setLocale('ja'),
    },
    {
      key: 'en',
      label: (
        <Space>
          <span>{t('languages.en')}</span>
          {locale === 'en' && <CheckOutlined style={{ color: token.colorPrimary }} />}
        </Space>
      ),
      onClick: () => setLocale('en'),
    },
  ];

  // ユーザーメニュー
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: t('common.profile'),
      icon: <UserOutlined />,
      disabled: true,
    },
    {
      key: 'settings',
      label: t('common.settings'),
      icon: <SettingOutlined />,
      disabled: true,
    },
    {
      key: 'language',
      label: t('common.language'),
      icon: <GlobalOutlined />,
      children: languageMenuItems,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: t('common.logout'),
      icon: <LogoutOutlined />,
      danger: true,
      onClick: onLogout,
    },
  ];

  return (
    <AntHeader
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${token.paddingXL * 2}px`,
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        height: 64,
        lineHeight: '64px',
      }}
    >
      {/* アプリケーション名 */}
      <Title
        level={1}
        style={{
          margin: 0,
          marginRight: token.marginLG,
          fontSize: token.fontSizeHeading1,
          fontWeight: token.fontWeightStrong,
          color: token.colorPrimary,
          cursor: 'default',
        }}
      >
        {t('common.appName')}
      </Title>

      {/* サブタイトル */}
      <Text
        type="secondary"
        style={{
          flex: 1,
          fontSize: token.fontSizeLG,
        }}
      >
        {t('common.appSubtitle')}
      </Text>

      {/* ユーザー情報エリア */}
      {user && (
        <Space size="middle" style={{ marginLeft: 'auto' }}>
          <div style={{ textAlign: 'right', lineHeight: 1.4 }}>
            <div
              style={{
                fontSize: token.fontSizeLG,
                fontWeight: 500,
                color: token.colorText,
              }}
            >
              {user.displayName}
            </div>
            <Text
              type="secondary"
              style={{
                fontSize: token.fontSize,
              }}
            >
              {getRoleLabel(user.role)} | {user.organizationName}
            </Text>
          </div>

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
              {user.displayName.charAt(0)}
            </Avatar>
          </Dropdown>
        </Space>
      )}
    </AntHeader>
  );
}
