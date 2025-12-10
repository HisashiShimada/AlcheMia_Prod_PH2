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
  Folder as FolderIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Science as ScienceIcon,
  Download as DownloadIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * データ管理者メニューのProps
 */
interface DataAdminMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

/**
 * データ管理者メニュー画面
 * タブ形式でメニューを表示
 */
export default function DataAdminMenu({ user, onLogout, onNavigate }: DataAdminMenuProps) {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { label: t('menu.data_admin.tabs.fileManagement'), icon: <FolderIcon /> },
    { label: t('menu.data_admin.tabs.maimlEditor'), icon: <EditIcon /> },
    { label: t('menu.data_admin.tabs.dataSearch'), icon: <SearchIcon /> },
    { label: t('menu.data_admin.tabs.experimentList'), icon: <ScienceIcon /> },
    { label: t('menu.data_admin.tabs.dataExport'), icon: <DownloadIcon /> },
    { label: t('menu.data_admin.tabs.statistics'), icon: <BarChartIcon /> },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader title={t('menu.data_admin.title')} />
      
      {/* タブバー */}
      <Box
        sx={{
          position: 'fixed',
          top: 112,
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
          pt: 26,
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
