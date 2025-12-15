import type { ThemeConfig } from 'antd';

/**
 * MaiML Viewer カスタムテーマ
 * UIポリシーに基づいた Ant Design テーマ設定
 */
export const theme: ThemeConfig = {
  token: {
    // カラー
    colorPrimary: '#CF0027',
    colorInfo: '#0093CF',
    colorSuccess: '#2e7d32',
    colorWarning: '#ed6c02',
    colorError: '#d32f2f',
    
    // 背景
    colorBgBase: '#ffffff',
    colorBgLayout: '#fafafa',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgSpotlight: '#f5f5f5',
    colorFillSecondary: '#f5f5f5',
    
    // テキスト
    colorText: '#212121',
    colorTextSecondary: '#757575',
    colorTextTertiary: '#9e9e9e',
    colorTextQuaternary: '#bdbdbd',
    colorTextDisabled: '#bdbdbd',
    
    // ボーダー
    colorBorder: 'rgba(0, 0, 0, 0.12)',
    colorBorderSecondary: 'rgba(0, 0, 0, 0.06)',
    colorSplit: 'rgba(0, 0, 0, 0.06)',
    
    // フォント
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans JP', 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`,
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    
    // 行の高さ
    lineHeight: 1.5715,
    lineHeightSM: 1.66,
    lineHeightLG: 1.5,
    lineHeightHeading1: 1.21,
    lineHeightHeading2: 1.35,
    lineHeightHeading3: 1.35,
    lineHeightHeading4: 1.4,
    lineHeightHeading5: 1.5,
    
    // フォントウェイト
    fontWeightStrong: 600,
    
    // ボーダーラジアス
    borderRadius: 8,
    borderRadiusSM: 4,
    borderRadiusLG: 12,
    borderRadiusXS: 2,
    borderRadiusOuter: 8,
    
    // スペーシング
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,
    controlPaddingHorizontal: 12,
    controlPaddingHorizontalSM: 8,
    marginXS: 8,
    marginSM: 12,
    margin: 16,
    marginMD: 20,
    marginLG: 24,
    marginXL: 32,
    marginXXL: 48,
    
    // シャドウ
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.12)',
    boxShadowTertiary: '0 8px 24px rgba(0, 0, 0, 0.16)',
    
    // その他
    wireframe: false,
    motion: true,
  },
  
  components: {
    Button: {
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 24,
      borderRadius: 8,
      fontWeight: 500,
      paddingContentHorizontal: 15,
      algorithm: true,
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
      boxShadowTertiary: '0 4px 8px rgba(0,0,0,0.12)',
    },
    Input: {
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 24,
      borderRadius: 8,
      paddingBlock: 4,
      paddingInline: 11,
    },
    Select: {
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 24,
      borderRadius: 8,
    },
    Modal: {
      borderRadiusLG: 12,
      paddingMD: 24,
      paddingContentHorizontalLG: 24,
    },
    Drawer: {
      paddingLG: 24,
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#212121',
      rowHoverBg: '#f5f5f5',
      cellPaddingBlock: 16,
      cellPaddingInline: 16,
    },
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 50px',
      bodyBg: '#fafafa',
      siderBg: '#ffffff',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#FFF1F3',
      itemSelectedColor: '#CF0027',
      itemHoverBg: '#f5f5f5',
      itemHoverColor: '#CF0027',
      itemActiveBg: '#FFF1F3',
      itemHeight: 40,
      iconSize: 16,
      iconMarginInlineEnd: 10,
    },
    Tabs: {
      itemColor: '#757575',
      itemSelectedColor: '#CF0027',
      itemHoverColor: '#E63946',
      inkBarColor: '#CF0027',
      titleFontSize: 14,
    },
    Tag: {
      defaultBg: '#f5f5f5',
      defaultColor: '#212121',
    },
    Alert: {
      colorInfoBg: '#E6F7FC',
      colorInfoBorder: '#0093CF',
      colorSuccessBg: '#E8F5E9',
      colorSuccessBorder: '#2e7d32',
      colorWarningBg: '#FFF4E5',
      colorWarningBorder: '#ed6c02',
      colorErrorBg: '#FFEBEE',
      colorErrorBorder: '#d32f2f',
    },
    Message: {
      contentBg: '#ffffff',
      contentPadding: '10px 16px',
    },
    Notification: {
      width: 384,
    },
  },
  
  // アルゴリズムは使用しない（カスタムカラーを使うため）
  algorithm: undefined,
};
