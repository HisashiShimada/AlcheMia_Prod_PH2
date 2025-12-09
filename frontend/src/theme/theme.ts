import { createTheme } from '@mui/material/styles';

/**
 * MaiML Viewer カスタムテーマ
 * UIポリシーに基づいた Material-UI テーマ設定
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#bdbdbd',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Noto Sans JP',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.08)',
    '0px 4px 8px rgba(0,0,0,0.12)',
    '0px 4px 8px rgba(0,0,0,0.12)',
    '0px 8px 16px rgba(0,0,0,0.16)',
    '0px 8px 16px rgba(0,0,0,0.16)',
    '0px 8px 16px rgba(0,0,0,0.16)',
    '0px 8px 16px rgba(0,0,0,0.16)',
    '0px 16px 32px rgba(0,0,0,0.20)',
    '0px 16px 32px rgba(0,0,0,0.20)',
    '0px 16px 32px rgba(0,0,0,0.20)',
    '0px 16px 32px rgba(0,0,0,0.20)',
    '0px 16px 32px rgba(0,0,0,0.20)',
    '0px 16px 32px rgba(0,0,0,0.20)',
    '0px 16px 32px rgba(0,0,0,0.20)',
    '0px 16px 32px rgba(0,0,0,0.20)',
    '0px 24px 48px rgba(0,0,0,0.24)',
    '0px 24px 48px rgba(0,0,0,0.24)',
    '0px 24px 48px rgba(0,0,0,0.24)',
    '0px 24px 48px rgba(0,0,0,0.24)',
    '0px 24px 48px rgba(0,0,0,0.24)',
    '0px 24px 48px rgba(0,0,0,0.24)',
    '0px 24px 48px rgba(0,0,0,0.24)',
    '0px 24px 48px rgba(0,0,0,0.24)',
    '0px 24px 48px rgba(0,0,0,0.24)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
          padding: '8px 16px',
          transition: 'all 200ms ease-out',
        },
        sizeLarge: {
          padding: '12px 24px',
          fontSize: '1rem',
        },
        sizeMedium: {
          height: '40px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 8px rgba(0,0,0,0.12)',
          transition: 'box-shadow 200ms ease-out',
          '&:hover': {
            boxShadow: '0px 8px 16px rgba(0,0,0,0.16)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 12,
        },
        elevation2: {
          boxShadow: '0px 4px 8px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#ffffff',
            transition: 'all 200ms ease-out',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(25, 118, 210, 0.4)',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
                borderWidth: '2px',
              },
            },
          },
          '& .MuiInputLabel-root': {
            color: '#757575',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        standardError: {
          backgroundColor: 'rgba(239, 83, 80, 0.12)',
          borderLeft: '4px solid #d32f2f',
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 152, 0, 0.12)',
          borderLeft: '4px solid #ed6c02',
        },
        standardInfo: {
          backgroundColor: 'rgba(3, 169, 244, 0.12)',
          borderLeft: '4px solid #0288d1',
        },
        standardSuccess: {
          backgroundColor: 'rgba(76, 175, 80, 0.12)',
          borderLeft: '4px solid #2e7d32',
        },
      },
    },
  },
});
