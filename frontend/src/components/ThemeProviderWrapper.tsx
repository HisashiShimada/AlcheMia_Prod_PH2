'use client';

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/theme/theme';

/**
 * Material-UI ThemeProvider ラッパー
 * クライアントコンポーネントとして分離
 */
export default function ThemeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline: MUIのベーススタイルをリセット */}
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
