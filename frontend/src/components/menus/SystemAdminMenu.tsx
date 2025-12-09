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
  People as PeopleIcon,
  Business as BusinessIcon,
  Folder as FolderIcon,
  Science as ScienceIcon,
  BarChart as BarChartIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { User } from '@/types/auth';

/**
 * システム管理者メニューのProps
 */
interface SystemAdminMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

/**
 * システム管理者メニュー画面
 * タブ形式でメニューを表示
 */
export default function SystemAdminMenu({ user, onLogout, onNavigate }: SystemAdminMenuProps) {
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { label: 'ユーザー管理', icon: <PeopleIcon /> },
    { label: '組織設定', icon: <BusinessIcon /> },
    { label: 'ファイル管理', icon: <FolderIcon /> },
    { label: '実験一覧', icon: <ScienceIcon /> },
    { label: '統計情報', icon: <BarChartIcon /> },
    { label: '監査ログ', icon: <AssignmentIcon /> },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader title="システム管理者メニュー" />
      
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
              {/* コンテンツはここに追加されます */}
              コンテンツエリア（未実装）
            </Typography>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
