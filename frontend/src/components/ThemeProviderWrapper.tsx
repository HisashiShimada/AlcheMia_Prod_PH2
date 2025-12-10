'use client';

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/theme/theme';
import { LanguageProvider } from '@/contexts/LanguageContext';

/**
 * Material-UI ThemeProvider と LanguageProvider のラッパー
 * クライアントコンポーネントとして分離
 */
export default function ThemeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <ThemeProvider theme={theme}>
        {/* CssBaseline: MUIのベーススタイルをリセット */}
        <CssBaseline />
        {children}
      </ThemeProvider>
    </LanguageProvider>
  );
}
