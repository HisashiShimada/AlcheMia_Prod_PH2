'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Assignment as AssignmentIcon,
  Storage as StorageIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * プロバイダーメニューのProps
 */
interface ProviderMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

/**
 * プロバイダーメニュー画面
 * タブ形式でメニューを表示
 */
export default function ProviderMenu({ user, onLogout, onNavigate }: ProviderMenuProps) {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { label: t('menu.provider.tabs.organizationManagement'), icon: <BusinessIcon /> },
    { label: t('menu.provider.tabs.userManagement'), icon: <PeopleIcon /> },
    { label: t('menu.provider.tabs.systemSettings'), icon: <SettingsIcon /> },
    { label: t('menu.provider.tabs.auditLog'), icon: <AssignmentIcon /> },
    { label: t('menu.provider.tabs.storageManagement'), icon: <StorageIcon /> },
    { label: t('menu.provider.tabs.statistics'), icon: <BarChartIcon /> },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader title={t('menu.provider.title')} />
      
      {/* タブバー */}
      <Box
        sx={{
          position: 'fixed',
          top: 112, // Header(64px) + SubHeader(48px)
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.drawer - 1,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Container>
      </Box>

      {/* コンテンツエリア */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 26, // Header(64px) + SubHeader(48px) + Tabs(64px) + margin
          pb: 4,
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="lg">
          <Paper
            elevation={2}
            sx={{
              p: 3,
              minHeight: 400,
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom>
              {tabs[currentTab].label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('content.notImplemented')}
            </Typography>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
