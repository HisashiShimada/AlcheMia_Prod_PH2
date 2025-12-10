'use client';

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  Language as LanguageIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(event.currentTarget);
  };

  const handleLangMenuClose = () => {
    setLangAnchorEl(null);
  };

  const handleLanguageChange = (newLocale: 'ja' | 'en') => {
    setLocale(newLocale);
    handleLangMenuClose();
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout();
  };

  // ロール名の表示
  const getRoleLabel = (role: string): string => {
    return t(`roles.${role}`) || role;
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={1}
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper', // 白背景
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ height: 64 }}>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 0, 
            mr: 4,
            fontWeight: 600,
            color: '#CF0027', // アクセントカラー（赤）
          }}
        >
          {t('common.appName')}
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            flexGrow: 1, 
            color: 'text.secondary',
          }}
        >
          {t('common.appSubtitle')}
        </Typography>

        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ textAlign: 'right', mr: 1 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  lineHeight: 1.2,
                  fontWeight: 500,
                  color: 'text.primary',
                }}
              >
                {user.displayName}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                }}
              >
                {getRoleLabel(user.role)} | {user.organizationName}
              </Typography>
            </Box>
            
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              sx={{ 
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
              aria-label="ユーザーメニュー"
            >
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36, 
                  bgcolor: '#CF0027', // アクセントカラー（赤）
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {user.displayName.charAt(0)}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                elevation: 4,
                sx: {
                  mt: 1,
                  minWidth: 200,
                  borderRadius: 2,
                },
              }}
            >
              <MenuItem 
                disabled
                sx={{
                  '&.Mui-disabled': {
                    opacity: 0.7,
                  },
                }}
              >
                <AccountCircleIcon sx={{ mr: 1.5, fontSize: 20 }} />
                <Typography variant="body2">{t('common.profile')}</Typography>
              </MenuItem>
              <MenuItem 
                disabled
                sx={{
                  '&.Mui-disabled': {
                    opacity: 0.7,
                  },
                }}
              >
                <SettingsIcon sx={{ mr: 1.5, fontSize: 20 }} />
                <Typography variant="body2">{t('common.settings')}</Typography>
              </MenuItem>
              <MenuItem 
                onClick={handleLangMenuOpen}
              >
                <LanguageIcon sx={{ mr: 1.5, fontSize: 20 }} />
                <Typography variant="body2">{t('common.language')}</Typography>
              </MenuItem>
              <Divider sx={{ my: 1 }} />
              <MenuItem 
                onClick={handleLogout}
                sx={{
                  color: 'error.main',
                  '&:hover': {
                    backgroundColor: 'error.light',
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9))',
                  },
                }}
              >
                <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                <Typography variant="body2">{t('common.logout')}</Typography>
              </MenuItem>
            </Menu>

            {/* 言語選択サブメニュー */}
            <Menu
              anchorEl={langAnchorEl}
              open={Boolean(langAnchorEl)}
              onClose={handleLangMenuClose}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                elevation: 4,
                sx: {
                  minWidth: 160,
                  borderRadius: 2,
                },
              }}
            >
              <MenuItem 
                onClick={() => handleLanguageChange('ja')}
                selected={locale === 'ja'}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="body2">{t('languages.ja')}</Typography>
                {locale === 'ja' && <CheckIcon sx={{ ml: 2, fontSize: 18, color: 'primary.main' }} />}
              </MenuItem>
              <MenuItem 
                onClick={() => handleLanguageChange('en')}
                selected={locale === 'en'}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="body2">{t('languages.en')}</Typography>
                {locale === 'en' && <CheckIcon sx={{ ml: 2, fontSize: 18, color: 'primary.main' }} />}
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
