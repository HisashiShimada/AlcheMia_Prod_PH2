'use client';

import React from 'react';
import { ConfigProvider } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import enUS from 'antd/locale/en_US';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { theme } from '@/theme/theme';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

/**
 * Ant Design ConfigProvider のラッパー（内部コンポーネント）
 * LanguageContextからロケールを取得してAnt Designに適用
 */
function AntdConfigProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLanguage();

  // Ant Designのロケール設定
  const antdLocale = locale === 'ja' ? jaJP : enUS;

  return (
    <ConfigProvider theme={theme} locale={antdLocale}>
      {children}
    </ConfigProvider>
  );
}

/**
 * Ant Design ThemeProvider と LanguageProvider のラッパー
 * クライアントコンポーネントとして分離
 * 
 * AntdRegistry: Next.js App RouterでAnt Designのスタイルを適切に処理
 */
export default function ThemeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AntdRegistry>
      <LanguageProvider>
        <AntdConfigProvider>
          {children}
        </AntdConfigProvider>
      </LanguageProvider>
    </AntdRegistry>
  );
}
