'use client';

import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import LoginPage from '@/components/LoginPage';
import ProviderMenu from '@/components/menus/ProviderMenu';
import SystemAdminMenu from '@/components/menus/SystemAdminMenu';
import DataAdminMenu from '@/components/menus/DataAdminMenu';
import ExperimentAdminMenu from '@/components/menus/ExperimentAdminMenu';
import ExperimentWorkerMenu from '@/components/menus/ExperimentWorkerMenu';
import { User, UserRole, LoginCredentials } from '@/types/auth';
import { Alert, Snackbar } from '@mui/material';

// Material-UIテーマ設定
const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

/**
 * デモ用ユーザーデータ
 */
const demoUsers: Record<string, { password: string; user: User }> = {
  provider: {
    password: 'provider123',
    user: {
      id: '1',
      username: 'provider',
      email: 'provider@example.com',
      role: 'provider',
      organizationId: 'org_system',
      organizationName: 'システム管理組織',
      displayName: 'プロバイダー太郎',
    },
  },
  system_admin: {
    password: 'admin123',
    user: {
      id: '2',
      username: 'system_admin',
      email: 'system.admin@example.com',
      role: 'system_admin',
      organizationId: 'org_lab_001',
      organizationName: 'AIML研究所',
      displayName: 'システム管理者 花子',
    },
  },
  data_admin: {
    password: 'data123',
    user: {
      id: '3',
      username: 'data_admin',
      email: 'data.admin@example.com',
      role: 'data_admin',
      organizationId: 'org_lab_001',
      organizationName: 'AIML研究所',
      displayName: 'データ管理者 次郎',
    },
  },
  experiment_admin: {
    password: 'exp123',
    user: {
      id: '4',
      username: 'experiment_admin',
      email: 'exp.admin@example.com',
      role: 'experiment_admin',
      organizationId: 'org_lab_001',
      organizationName: 'AIML研究所',
      displayName: '実験管理者 三郎',
    },
  },
  experiment_worker: {
    password: 'worker123',
    user: {
      id: '5',
      username: 'experiment_worker',
      email: 'worker@example.com',
      role: 'experiment_worker',
      organizationId: 'org_lab_001',
      organizationName: 'AIML研究所',
      displayName: '実験作業者 四郎',
    },
  },
};

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ログイン処理
  const handleLogin = async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);

    // デモ用の遅延
    await new Promise((resolve) => setTimeout(resolve, 500));

    const demoUser = demoUsers[credentials.username];
    if (demoUser && demoUser.password === credentials.password) {
      setCurrentUser(demoUser.user);
      setSuccessMessage('ログインに成功しました');
    } else {
      setError('ユーザー名またはパスワードが正しくありません');
    }

    setLoading(false);
  };

  // ログアウト処理
  const handleLogout = () => {
    setCurrentUser(null);
    setSuccessMessage('ログアウトしました');
  };

  // ナビゲーション処理（デモ用）
  const handleNavigate = (path: string) => {
    setSuccessMessage(`画面遷移: ${path}`);
  };

  // Snackbarを閉じる
  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
  };

  // ログインしていない場合はログイン画面を表示
  if (!currentUser) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLogin={handleLogin} error={error} loading={loading} />
        <Snackbar
          open={Boolean(successMessage)}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
            {successMessage}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    );
  }

  // ロールに応じたメニュー画面を表示
  let MenuComponent: React.ReactNode;
  switch (currentUser.role) {
    case 'provider':
      MenuComponent = (
        <ProviderMenu user={currentUser} onLogout={handleLogout} onNavigate={handleNavigate} />
      );
      break;
    case 'system_admin':
      MenuComponent = (
        <SystemAdminMenu user={currentUser} onLogout={handleLogout} onNavigate={handleNavigate} />
      );
      break;
    case 'data_admin':
      MenuComponent = (
        <DataAdminMenu user={currentUser} onLogout={handleLogout} onNavigate={handleNavigate} />
      );
      break;
    case 'experiment_admin':
      MenuComponent = (
        <ExperimentAdminMenu
          user={currentUser}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      );
      break;
    case 'experiment_worker':
      MenuComponent = (
        <ExperimentWorkerMenu
          user={currentUser}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      );
      break;
    default:
      MenuComponent = <div>Unknown role</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {MenuComponent}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="info" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
