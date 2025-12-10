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
  Science as ScienceIcon,
  AssignmentInd as AssignmentIndIcon,
  Timeline as TimelineIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * 実験管理者メニューのProps
 */
interface ExperimentAdminMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

/**
 * 実験管理者メニュー画面
 * タブ形式でメニューを表示
 */
export default function ExperimentAdminMenu({ user, onLogout, onNavigate }: ExperimentAdminMenuProps) {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { label: t('menu.experiment_admin.tabs.experimentManagement'), icon: <ScienceIcon /> },
    { label: t('menu.experiment_admin.tabs.workerAssignment'), icon: <AssignmentIndIcon /> },
    { label: t('menu.experiment_admin.tabs.progressManagement'), icon: <TimelineIcon /> },
    { label: t('menu.experiment_admin.tabs.maimlEditor'), icon: <EditIcon /> },
    { label: t('menu.experiment_admin.tabs.fileManagement'), icon: <FolderIcon /> },
    { label: t('menu.experiment_admin.tabs.statistics'), icon: <BarChartIcon /> },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader title={t('menu.experiment_admin.title')} />
      
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
