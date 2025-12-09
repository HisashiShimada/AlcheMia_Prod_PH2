'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

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
}

/**
 * サブヘッダーコンポーネント
 * メニュー画面の2段目ヘッダー（青系背景）
 */
export default function SubHeader({ 
  title, 
  actions 
}: SubHeaderProps) {
  return (
      <Box
        sx={{
          position: 'fixed',
          top: 64, // Headerの高さ分下げる
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.drawer,
          backgroundColor: 'primary.main', // #1976d2
          color: 'white',
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'primary.dark',
          boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
        }}
      >
      <Container maxWidth="lg">
        {/* タイトルとアクション */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 600,
              color: 'white',
            }}
          >
            {title}
          </Typography>

          {/* アクションボタン */}
          {actions && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {actions}
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
}
