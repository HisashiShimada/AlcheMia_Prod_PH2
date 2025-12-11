'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import {
  Science as ScienceIcon,
  AssignmentInd as AssignmentIndIcon,
  Timeline as TimelineIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  BarChart as BarChartIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { FileEdit, FolderPlus } from 'lucide-react';
import Header from '../common/Header';
import ProjectManagement from '../project/ProjectManagement';
import FormatManagement from '../project/FormatManagement';
import { User } from '@/types/auth';

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
 * ExperimentManagement.tsxのヘッダーレイアウトを採用
 */
export default function ExperimentAdminMenu({ user, onLogout, onNavigate }: ExperimentAdminMenuProps) {
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { label: 'プロジェクト管理', icon: <ScienceIcon /> },
    { label: 'フォーマット管理', icon: <DescriptionIcon /> },
    { label: 'ワーカー割当', icon: <AssignmentIndIcon /> },
    { label: '進捗管理', icon: <TimelineIcon /> },
    { label: '統計情報', icon: <BarChartIcon /> },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* 共通ヘッダー */}
      <Header user={user} onLogout={onLogout} />
      
      {/* サブヘッダー: タイトル+タブ+アクションボタン（ExperimentManagement.tsxのスタイル） */}
      <Box
        sx={{
          position: 'fixed',
          top: 64, // Header の高さ
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.drawer - 1,
          bgcolor: '#1976d2',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 1,
          }}
        >
          {/* 左側: タイトルとタブメニュー */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontWeight: 600,
                mr: 3,
                minWidth: '120px',
              }}
            >
              実験管理
            </Typography>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 48,
                '& .MuiTab-root': {
                  minHeight: 48,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#ffffff',
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
          </Box>

          {/* 右側: アクションボタン */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<FileEdit size={16} />}
              sx={{
                bgcolor: '#4caf50',
                color: '#ffffff',
                '&:hover': {
                  bgcolor: '#388e3c',
                },
                textTransform: 'none',
                fontWeight: 500,
              }}
              onClick={() => console.log('実験記録画面へ遷移')}
            >
              実験記録
            </Button>
          </Box>
        </Box>
      </Box>

      {/* コンテンツエリア */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 18, // Header(64px = 8) + SubHeader(48px = 6) + margin(32px = 4) = 144px = 18
          pb: 4,
          bgcolor: 'background.default',
          height: 'calc(100vh - 144px)', // ビューポート高さ - (Header + SubHeader)
          overflow: 'hidden',
        }}
      >
        {currentTab === 0 ? (
          // プロジェクト管理: 全幅表示
          <Box sx={{ height: '100%', overflow: 'hidden' }}>
            <ProjectManagement />
          </Box>
        ) : currentTab === 1 ? (
          // フォーマット管理: 全幅表示
          <Box sx={{ height: '100%', overflow: 'hidden' }}>
            <FormatManagement />
          </Box>
        ) : (
          // その他のタブ: Container で幅を制限
          <Container 
            maxWidth="lg" 
            sx={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Paper
              elevation={2}
              sx={{
                p: 3,
                flex: 1,
                borderRadius: 2,
                overflow: 'auto',
              }}
            >
              <Typography variant="h6" gutterBottom>
                {tabs[currentTab].label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                コンテンツエリア（未実装）
              </Typography>
            </Paper>
          </Container>
        )}
      </Box>
    </Box>
  );
}
