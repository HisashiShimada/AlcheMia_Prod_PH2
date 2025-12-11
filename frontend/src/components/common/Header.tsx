'use client';

import React from 'react';
import { Layout, Typography, Avatar, Dropdown, Space, Divider } from 'antd';
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
const { Text } = Typography;

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
          {locale === 'ja' && <CheckOutlined style={{ color: '#CF0027' }} />}
        </Space>
      ),
      onClick: () => setLocale('ja'),
    },
    {
      key: 'en',
      label: (
        <Space>
          <span>{t('languages.en')}</span>
          {locale === 'en' && <CheckOutlined style={{ color: '#CF0027' }} />}
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
        padding: '0 50px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        height: 64,
        lineHeight: '64px',
      }}
    >
      {/* アプリケーション名 */}
      <div
        style={{
          fontSize: 36,
          fontWeight: 600,
          color: '#CF0027',
          marginRight: 32,
          cursor: 'default',
        }}
      >
        {t('common.appName')}
      </div>

      {/* サブタイトル */}
      <Text
        type="secondary"
        style={{
          flex: 1,
          fontSize: 18,
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
                fontSize: 18,
                fontWeight: 500,
                color: '#212121',
              }}
            >
              {user.displayName}
            </div>
            <Text
              type="secondary"
              style={{
                fontSize: 16,
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
                backgroundColor: '#CF0027',
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 600,
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
