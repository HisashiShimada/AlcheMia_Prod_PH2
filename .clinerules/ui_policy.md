# UIポリシー

## デザインシステム概要

MaiML Viewerは、モダンで洗練されたUIを提供するため、Material-UI (MUI) v5をベースとしたデザインシステムを採用します。白を基調とした明るく清潔感のあるインターフェースに、赤系のアクセントカラー（#CF0027）を組み合わせ、科学的な信頼性と使いやすさを両立します。

## カラーパレット

### プライマリカラー（赤系）
```typescript
primary: {
  main: '#CF0027',      // メインの赤色（メインヘッダー）
  light: '#E63946',     // ライトレッド（ホバー、アクティブ状態）
  dark: '#A50020',      // ダークレッド（押下状態）
  contrastText: '#ffffff' // プライマリカラー上のテキスト
}
```

### セカンダリカラー（青系 - タブインジケーターなど）
```typescript
secondary: {
  main: '#1976d2',      // セカンダリブルー
  light: '#42a5f5',     // ライトブルー
  dark: '#1565c0',      // ダークブルー
  contrastText: '#ffffff'
}
```


### 背景カラー
```typescript
background: {
  default: '#fafafa',   // 全体背景（ライトグレー）
  paper: '#ffffff',     // カード、ダイアログ等の背景
  accent: '#f5f5f5'     // セクション区切りなど
}
```

### テキストカラー
```typescript
text: {
  primary: '#212121',   // メインテキスト
  secondary: '#757575', // 補足テキスト
  disabled: '#bdbdbd',  // 無効状態テキスト
  hint: '#9e9e9e'       // ヒントテキスト
}
```

### 状態カラー
```typescript
success: {
  main: '#2e7d32',      // 成功メッセージ
  light: '#4caf50',
  dark: '#1b5e20'
}
error: {
  main: '#d32f2f',      // エラーメッセージ
  light: '#ef5350',
  dark: '#c62828'
}
warning: {
  main: '#ed6c02',      // 警告メッセージ
  light: '#ff9800',
  dark: '#e65100'
}
info: {
  main: '#0288d1',      // 情報メッセージ
  light: '#03a9f4',
  dark: '#01579b'
}
```

### 境界線・分割線
```typescript
divider: 'rgba(0, 0, 0, 0.12)' // 境界線色
```

## タイポグラフィ

### フォントファミリー
```typescript
fontFamily: [
  'Roboto',
  'Noto Sans JP',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Arial',
  'sans-serif'
].join(',')
```

### フォントサイズ
```typescript
fontSize: {
  xs: '0.75rem',   // 12px - キャプション、ラベル
  sm: '0.875rem',  // 14px - 小さなテキスト
  base: '1rem',    // 16px - 本文
  lg: '1.125rem',  // 18px - サブヘッディング
  xl: '1.25rem',   // 20px - 小見出し
  '2xl': '1.5rem', // 24px - 見出し
  '3xl': '1.875rem', // 30px - 大見出し
  '4xl': '2.25rem'   // 36px - ページタイトル
}
```

### フォントウェイト
```typescript
fontWeight: {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700
}
```

## スペーシング

Material-UIの8pxグリッドシステムを使用します。

```typescript
spacing: (factor: number) => `${8 * factor}px`
```

**推奨スペーシング値:**
- `0` - 0px
- `0.5` - 4px（極小）
- `1` - 8px（小）
- `1.5` - 12px
- `2` - 16px（標準）
- `3` - 24px（中）
- `4` - 32px（大）
- `5` - 40px
- `6` - 48px（極大）
- `8` - 64px（セクション間）

## ボーダーラジアス

```typescript
borderRadius: {
  none: '0',
  sm: '4px',      // 小さなコンポーネント
  base: '8px',    // 標準（カード、ボタン）
  md: '12px',     // 中サイズ
  lg: '16px',     // 大きなカード
  xl: '20px',     // モーダル
  full: '9999px'  // 円形ボタン
}
```

## シャドウ（影）

Material-UIのelevationシステムを使用します。

```typescript
elevation: {
  0: 'none',                               // 影なし
  1: '0px 2px 4px rgba(0,0,0,0.08)',      // 微小（ホバー時など）
  2: '0px 4px 8px rgba(0,0,0,0.12)',      // 小（カード）
  4: '0px 8px 16px rgba(0,0,0,0.16)',     // 中（ドロップダウン）
  8: '0px 16px 32px rgba(0,0,0,0.20)',    // 大（モーダル）
  16: '0px 24px 48px rgba(0,0,0,0.24)'    // 極大（ダイアログ）
}
```

## コンポーネントスタイル

### ボタン

#### プライマリボタン
- 背景色: `primary.main`
- テキスト色: `#ffffff`
- ホバー時: `primary.dark`
- 高さ: `36px`（medium）、`40px`（large）
- パディング: 水平 `16px`
- ボーダーラジアス: `8px`
- フォントウェイト: `medium (500)`

#### セカンダリボタン（アウトライン）
- 背景色: `transparent`
- ボーダー: `1px solid primary.main`
- テキスト色: `primary.main`
- ホバー時: 背景 `primary.light` (alpha: 0.08)

#### テキストボタン
- 背景色: `transparent`
- テキスト色: `primary.main`
- ホバー時: 背景 `primary.light` (alpha: 0.04)

### カード

- 背景色: `#ffffff`
- ボーダーラジアス: `12px`
- シャドウ: `elevation: 2`
- ホバー時シャドウ: `elevation: 4`
- パディング: `24px`
- ボーダー: なし（シャドウのみ）

### インプットフィールド

#### テキストフィールド
- バリアント: `outlined`（推奨）
- 背景色: `#ffffff`
- ボーダー色: `divider`
- フォーカス時ボーダー: `primary.main`
- 高さ: `40px`（small）、`48px`（medium）
- ボーダーラジアス: `8px`
- ラベル色: `text.secondary`

#### セレクト・ドロップダウン
- テキストフィールドと同じスタイル
- ドロップダウンメニュー: `elevation: 4`
- 選択済みアイテム背景: `primary.light` (alpha: 0.08)

### ダイアログ・モーダル

- 背景色: `#ffffff`
- ボーダーラジアス: `16px`
- シャドウ: `elevation: 8`
- オーバーレイ背景: `rgba(0, 0, 0, 0.5)`
- パディング: `24px`
- 最大幅: `600px`（小）、`900px`（中）、`1200px`（大）

### ヘッダー・AppBar

- **Header（1段目）**
  - 背景色: `#ffffff`（白）
  - 高さ: `64px`
  - ロゴ色: `#CF0027`（赤、アクセントカラー）
  - テキスト色: `text.secondary`（グレー）
  - Avatar背景色: `#CF0027`（赤、アクセントカラー）
  
- **SubHeader（2段目）**
  - 背景色: `#1976d2`（青、プライマリカラー）
  - 高さ: `48px`
  - テキスト色: `white`
  
- シャドウ: `elevation: 1`
- ボーダー下: `1px solid divider`
- タブインジケーター色: `secondary.main`（青）

### サイドバー・ナビゲーション

- 背景色: `#ffffff`
- 幅: `240px`（デフォルト）、`280px`（広め）
- シャドウ: `elevation: 2`
- アクティブアイテム背景: `primary.main` (alpha: 0.08)
- アクティブアイテムボーダー: 左側 `3px solid primary.main`
- ホバー時背景: `action.hover` (rgba(0, 0, 0, 0.04))

### テーブル

- ヘッダー背景: `background.accent` (`#f5f5f5`)
- ボーダー: `1px solid divider`
- 行ホバー背景: `action.hover`
- 選択行背景: `primary.light` (alpha: 0.08)
- セル内パディング: `16px`
- 最小行高さ: `52px`

### タブ

- 未選択タブ色: `text.secondary`
- 選択タブ色: `primary.main`
- インジケーター色: `primary.main`
- インジケーター高さ: `3px`
- タブ高さ: `48px`
- ホバー時背景: `action.hover`

### チップ・タグ

- デフォルト背景: `background.accent`
- プライマリチップ背景: `primary.light` (alpha: 0.12)
- テキスト色: `text.primary`
- 高さ: `32px`
- ボーダーラジアス: `16px`
- パディング: 水平 `12px`

### アラート・通知

#### 情報アラート
- 背景色: `info.light` (alpha: 0.12)
- アイコン色: `info.main`
- ボーダー: 左側 `4px solid info.main`

#### 成功アラート
- 背景色: `success.light` (alpha: 0.12)
- アイコン色: `success.main`
- ボーダー: 左側 `4px solid success.main`

#### 警告アラート
- 背景色: `warning.light` (alpha: 0.12)
- アイコン色: `warning.main`
- ボーダー: 左側 `4px solid warning.main`

#### エラーアラート
- 背景色: `error.light` (alpha: 0.12)
- アイコン色: `error.main`
- ボーダー: 左側 `4px solid error.main`

## レイアウト原則

### グリッドシステム

Material-UIの12カラムグリッドシステムを使用します。

```typescript
breakpoints: {
  xs: 0,      // モバイル
  sm: 600,    // タブレット（縦）
  md: 960,    // タブレット（横）・小型ラップトップ
  lg: 1280,   // デスクトップ
  xl: 1920    // 大型ディスプレイ
}
```

### コンテナ幅
- `sm`: `600px`
- `md`: `960px`
- `lg`: `1280px`
- `xl`: `1920px`

### レスポンシブデザイン

#### モバイル（xs, sm）
- シングルカラムレイアウト
- フルスクリーンモーダル
- ボトムナビゲーション推奨
- タッチターゲット最小サイズ: `44px x 44px`

#### タブレット（md）
- 2カラムレイアウト
- サイドバー折りたたみ可能
- モーダル幅: 最大 `600px`

#### デスクトップ（lg, xl）
- 3カラムレイアウト可能
- 固定サイドバー
- モーダル幅: 最大 `900px`

## アクセシビリティ

### コントラスト比
- 通常テキスト: 最低 4.5:1
- 大きなテキスト（18px以上）: 最低 3:1
- UI要素（ボタン、アイコン等）: 最低 3:1

### フォーカス表示
- フォーカスリング色: `primary.main`
- フォーカスリング幅: `2px`
- アウトラインオフセット: `2px`

### キーボード操作
- Tab順序の論理的な流れ
- Enterキーでボタン実行
- Escapeキーでモーダル閉じる
- 矢印キーでリスト/メニュー操作

### スクリーンリーダー対応
- 適切なARIAラベルの使用
- フォーム要素のラベル付け
- ボタンの説明的なテキスト
- 画像のalt属性

## アニメーション・トランジション

### デュレーション
```typescript
duration: {
  shortest: 150,  // 簡単な状態変化
  shorter: 200,   // ホバー、フォーカス
  short: 250,     // ドロップダウン展開
  standard: 300,  // 標準アニメーション
  complex: 375,   // 複雑な遷移
  enteringScreen: 225,
  leavingScreen: 195
}
```

### イージング
```typescript
easing: {
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',  // 標準
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',    // 要素の登場
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',       // 要素の退場
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'       // 素早い遷移
}
```

### トランジション対象
- ホバー状態: `200ms ease-out`
- ボタン押下: `150ms ease-in`
- モーダル表示: `300ms ease-in-out`
- ドロップダウン: `250ms ease-out`
- ページ遷移: `375ms ease-in-out`

## アイコン

### アイコンライブラリ
- **Lucide React**: 軽量でモダンなアイコンセット
- サイズ: `16px`（small）、`20px`（medium）、`24px`（large）
- 色: `text.primary`、`text.secondary`、または`primary.main`

### アイコン使用ガイドライン
- 左揃えテキストの場合、アイコンは左側に配置
- ボタン内のアイコン: テキストとの間隔 `8px`
- アイコンのみのボタン: パディング `8px`、最小サイズ `40x40px`
- 装飾的アイコン: `aria-hidden="true"`

## ダークモード（将来実装）

ダークモードは将来的に実装を検討します。実装時の基本方針：

### ダークモードカラー
```typescript
background: {
  default: '#121212',
  paper: '#1e1e1e',
  accent: '#2a2a2a'
}
text: {
  primary: '#ffffff',
  secondary: '#b3b3b3'
}
primary: {
  main: '#42a5f5',  // ライトブルー
  light: '#64b5f6',
  dark: '#1e88e5'
}
```

## 実装例

### テーマ設定（theme.ts）
```typescript
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#CF0027',
      light: '#E63946',
      dark: '#A50020',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff'
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff'
    },
    text: {
      primary: '#212121',
      secondary: '#757575'
    },
    success: {
      main: '#2e7d32'
    },
    error: {
      main: '#d32f2f'
    },
    warning: {
      main: '#ed6c02'
    },
    info: {
      main: '#0288d1'
    }
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Noto Sans JP',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Arial',
      'sans-serif'
    ].join(','),
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500
    },
    body1: {
      fontSize: '1rem'
    },
    body2: {
      fontSize: '0.875rem'
    }
  },
  spacing: 8,
  shape: {
    borderRadius: 8
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
    '0px 24px 48px rgba(0,0,0,0.24)'
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
          padding: '8px 16px'
        },
        sizeLarge: {
          padding: '12px 24px',
          fontSize: '1rem'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 8px rgba(0,0,0,0.12)'
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined'
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8
          }
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16
        }
      }
    }
  }
});
```

### 使用例（コンポーネント）
```typescript
import { ThemeProvider } from '@mui/material/styles';
import { Button, Card, TextField } from '@mui/material';
import { theme } from './theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <Card sx={{ p: 3, mb: 2 }}>
        <TextField
          label="ユーザー名"
          variant="outlined"
          fullWidth
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
        >
          ログイン
        </Button>
      </Card>
    </ThemeProvider>
  );
}
```

## ベストプラクティス

### DO（推奨）
✅ Material-UIの標準コンポーネントを使用する
✅ `sx` prop でスタイルを適用する
✅ テーマ変数を使用して一貫性を保つ
✅ 8pxグリッドシステムに従う
✅ 適切なelevation（影）を使用する
✅ アクセシビリティを考慮する
✅ レスポンシブデザインを実装する
✅ 適切なコントラスト比を確保する

### DON'T（非推奨）
❌ インラインスタイルを多用しない
❌ カスタムCSSでMUIのスタイルを上書きしすぎない
❌ 任意のカラーコードを使用しない
❌ 固定幅・固定高さを多用しない
❌ 過度なアニメーションを使用しない
❌ アクセシビリティを無視しない
❌ モバイルレスポンシブを後回しにしない

## 参考リンク

- [Material-UI公式ドキュメント](https://mui.com/)
- [Material Design ガイドライン](https://material.io/design)
- [Lucide Icons](https://lucide.dev/)
- [WCAG 2.1 アクセシビリティガイドライン](https://www.w3.org/WAI/WCAG21/quickref/)
