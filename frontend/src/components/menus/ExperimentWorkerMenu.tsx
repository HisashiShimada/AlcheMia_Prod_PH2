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
  Assignment as AssignmentIcon,
  Create as CreateIcon,
  Visibility as VisibilityIcon,
  Upload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * 実験作業者メニューのProps
 */
interface ExperimentWorkerMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

/**
 * 実験作業者メニュー画面
 * タブ形式でメニューを表示
 */
export default function ExperimentWorkerMenu({ user, onLogout, onNavigate }: ExperimentWorkerMenuProps) {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { label: t('menu.experiment_worker.tabs.myTasks'), icon: <AssignmentIcon /> },
    { label: t('menu.experiment_worker.tabs.experimentRecord'), icon: <CreateIcon /> },
    { label: t('menu.experiment_worker.tabs.maimlViewer'), icon: <VisibilityIcon /> },
    { label: t('menu.experiment_worker.tabs.fileUpload'), icon: <UploadIcon /> },
    { label: t('menu.experiment_worker.tabs.progressReport'), icon: <CheckCircleIcon /> },
    { label: t('menu.experiment_worker.tabs.history'), icon: <HistoryIcon /> },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader title={t('menu.experiment_worker.title')} />
      
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
