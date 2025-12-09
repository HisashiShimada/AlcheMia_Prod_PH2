'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
} from '@mui/material';
import * as Icons from '@mui/icons-material';
import { SvgIconProps } from '@mui/material';

/**
 * メニューカードのProps
 */
interface MenuCardProps {
  label: string;
  icon: string;
  description?: string;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * メニューカードコンポーネント
 * UIポリシーに基づいたモダンなデザイン
 */
export default function MenuCard({
  label,
  icon,
  description,
  disabled = false,
  onClick,
}: MenuCardProps) {
  // アイコン名から対応するMUIアイコンコンポーネントを取得
  const IconComponent = (Icons as Record<string, React.ComponentType<SvgIconProps>>)[icon] || Icons.Apps;

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3, // 12px
        backgroundColor: 'background.paper', // #ffffff
        transition: 'all 200ms ease-out',
        '&:hover': !disabled
          ? {
              transform: 'translateY(-4px)',
              boxShadow: '0px 8px 16px rgba(0,0,0,0.16)', // elevation 4
            }
          : {},
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <CardActionArea
        onClick={onClick}
        disabled={disabled}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          p: 0,
        }}
      >
        <CardContent sx={{ width: '100%', flexGrow: 1, p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: 2, // 8px
                bgcolor: disabled ? 'action.disabledBackground' : 'primary.main',
                color: 'white',
                mr: 2,
                transition: 'all 200ms ease-out',
              }}
            >
              <IconComponent sx={{ fontSize: 32 }} />
            </Box>
            <Typography 
              variant="h6" 
              component="h2" 
              sx={{ 
                fontWeight: 600,
                color: 'text.primary',
              }}
            >
              {label}
            </Typography>
          </Box>

          {description && (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ lineHeight: 1.5 }}
            >
              {description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
