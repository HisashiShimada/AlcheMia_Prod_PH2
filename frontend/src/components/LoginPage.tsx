'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
} from '@mui/icons-material';
import { LoginCredentials } from '@/types/auth';

/**
 * ログインページのProps
 */
interface LoginPageProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  error?: string | null;
  loading?: boolean;
}

/**
 * ログイン画面コンポーネント
 * UIポリシーに基づいたモダンで清潔感のあるデザイン
 */
export default function LoginPage({ onLogin, error, loading = false }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // バリデーション
    if (!username.trim()) {
      setValidationError('ユーザー名を入力してください');
      return;
    }

    if (!password) {
      setValidationError('パスワードを入力してください');
      return;
    }

    // ログイン処理
    try {
      await onLogin({ username: username.trim(), password });
    } catch (err) {
      // エラーは親コンポーネントで処理
      console.error('Login failed:', err);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default', // #fafafa
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={2}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 3, // 12px
            backgroundColor: 'background.paper', // #ffffff
          }}
        >
          {/* ロゴ・タイトル */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ 
                fontWeight: 600,
                color: 'primary.main',
                mb: 1,
              }}
            >
              MMDPF
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: '0.875rem' }}
            >
              マルチモーダルデータプラットフォーム
            </Typography>
          </Box>

          {/* エラーメッセージ */}
          {(error || validationError) && (
            <Alert 
              severity="error" 
              sx={{ 
                width: '100%', 
                mb: 3,
                borderRadius: 2,
              }}
            >
              {validationError || error}
            </Alert>
          )}

          {/* ログインフォーム */}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="ユーザー名"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              error={Boolean(validationError && !username.trim())}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="パスワード"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              error={Boolean(validationError && !password)}
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="パスワードの表示切り替え"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ 
                mt: 1,
                mb: 2,
                height: '48px',
                fontWeight: 500,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0px 4px 8px rgba(0,0,0,0.12)',
                },
              }}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </Box>

          {/* フッター */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: '0.75rem' }}
            >
              © 2024 MMDPF. All rights reserved.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
