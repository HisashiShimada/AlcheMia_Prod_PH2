# ConfigProvider ポリシー

## 概要
ConfigProviderは、Ant Design v6の全体設定を管理するコンポーネントです。テーマ設定、国際化、コンポーネントのグローバル設定を一元管理します。

---

## 標準3パターン

### パターン1: 基本テーマ（デフォルト）
**用途**: 通常の画面全般

```typescript
<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#CF0027',
      colorInfo: '#0093CF',
      fontSize: 14,
      borderRadius: 8,
      // その他のトークン設定
    }
  }}
  locale={jaJP}
>
  {children}
</ConfigProvider>
```

**特徴**:
- プライマリカラー: `#CF0027`（赤系）
- インフォカラー: `#0093CF`（青系）
- フォントサイズ: 14px
- ボーダーラジアス: 8px
- 言語: 日本語（jaJP）

---

### パターン2: ダークモード
**用途**: 夜間作業やダークモード対応

```typescript
import { theme as antdTheme } from 'antd';

<ConfigProvider
  theme={{
    algorithm: antdTheme.darkAlgorithm,
    token: {
      colorPrimary: '#CF0027',
      colorInfo: '#0093CF',
      fontSize: 14,
      borderRadius: 8,
    }
  }}
  locale={jaJP}
>
  {children}
</ConfigProvider>
```

**特徴**:
- `darkAlgorithm`を使用してダークモード化
- カラートークンは自動的に暗い背景に適応
- プライマリカラーは維持
- 言語: 日本語（jaJP）

---

### パターン3: 多言語切り替え
**用途**: 国際化対応が必要な画面

```typescript
import jaJP from 'antd/locale/ja_JP';
import enUS from 'antd/locale/en_US';

const [locale, setLocale] = useState<'ja' | 'en'>('ja');

<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#CF0027',
      colorInfo: '#0093CF',
      fontSize: 14,
      borderRadius: 8,
    }
  }}
  locale={locale === 'ja' ? jaJP : enUS}
>
  {children}
</ConfigProvider>
```

**特徴**:
- 言語を動的に切り替え可能
- Ant Designの組み込みコンポーネントの言語も自動変更
- アプリケーション独自のテキストは別途管理

---

## 共通仕様（全パターン）

### テーマトークン（token）

#### カラー
```typescript
token: {
  // プライマリカラー（赤系）
  colorPrimary: '#CF0027',
  colorPrimaryHover: '#E63946',
  colorPrimaryActive: '#A50020',
  colorPrimaryBorder: '#CF0027',
  colorPrimaryBg: '#FFF1F3',
  colorPrimaryBgHover: '#FFE4E8',
  colorPrimaryText: '#CF0027',
  
  // インフォカラー（青系）
  colorInfo: '#0093CF',
  colorInfoHover: '#33ACD9',
  colorInfoActive: '#007AB3',
  colorInfoBg: '#E6F7FC',
  colorInfoBorder: '#0093CF',
  
  // 背景色
  colorBgBase: '#ffffff',
  colorBgLayout: '#fafafa',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBgSpotlight: '#f5f5f5',
  colorFillSecondary: '#f5f5f5',
  
  // テキスト色
  colorText: '#212121',
  colorTextSecondary: '#757575',
  colorTextTertiary: '#9e9e9e',
  colorTextQuaternary: '#bdbdbd',
  colorTextDisabled: '#bdbdbd',
  
  // 状態色
  colorSuccess: '#2e7d32',
  colorSuccessBg: '#E8F5E9',
  colorSuccessBorder: '#2e7d32',
  colorError: '#d32f2f',
  colorErrorBg: '#FFEBEE',
  colorErrorBorder: '#d32f2f',
  colorWarning: '#ed6c02',
  colorWarningBg: '#FFF4E5',
  colorWarningBorder: '#ed6c02',
  
  // ボーダー
  colorBorder: 'rgba(0, 0, 0, 0.12)',
  colorBorderSecondary: 'rgba(0, 0, 0, 0.06)',
  colorSplit: 'rgba(0, 0, 0, 0.06)',
}
```

#### タイポグラフィ
```typescript
token: {
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans JP', 'Helvetica Neue', Arial, sans-serif`,
  fontSize: 14,
  fontSizeSM: 12,
  fontSizeLG: 16,
  fontSizeXL: 20,
  fontSizeHeading1: 38,
  fontSizeHeading2: 30,
  fontSizeHeading3: 24,
  fontSizeHeading4: 20,
  fontSizeHeading5: 16,
  lineHeight: 1.5715,
  fontWeightStrong: 600,
}
```

#### スペーシング
```typescript
token: {
  controlPaddingHorizontal: 12,
  controlPaddingHorizontalSM: 8,
  marginXS: 8,
  marginSM: 12,
  margin: 16,
  marginMD: 20,
  marginLG: 24,
  marginXL: 32,
  marginXXL: 48,
}
```

#### ボーダーラジアス
```typescript
token: {
  borderRadius: 8,
  borderRadiusSM: 4,
  borderRadiusLG: 12,
  borderRadiusXS: 2,
  borderRadiusOuter: 8,
}
```

#### シャドウ
```typescript
token: {
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.12)',
  boxShadowTertiary: '0 8px 24px rgba(0, 0, 0, 0.16)',
}
```

### コンポーネント設定（components）

```typescript
components: {
  Button: {
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,
    borderRadius: 8,
    fontWeight: 500,
  },
  Card: {
    borderRadiusLG: 12,
    paddingLG: 24,
  },
  Input: {
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,
    borderRadius: 8,
  },
  Modal: {
    borderRadiusLG: 12,
  },
  Table: {
    headerBg: '#fafafa',
    headerColor: '#212121',
    rowHoverBg: '#f5f5f5',
  },
}
```

### 国際化（locale）

#### 日本語（jaJP）
```typescript
import jaJP from 'antd/locale/ja_JP';

locale={jaJP}
```

**含まれる翻訳**:
- DatePicker: 「年」「月」「日」
- Pagination: 「ページ」「件」
- Modal: 「OK」「キャンセル」
- Popconfirm: 「はい」「いいえ」
- Upload: 「ファイルを選択」「アップロード」
- Table: 「フィルタ」「ソート」「リセット」

#### 英語（enUS）
```typescript
import enUS from 'antd/locale/en_US';

locale={enUS}
```

**含まれる翻訳**:
- DatePicker: "Year" "Month" "Day"
- Pagination: "Page" "items"
- Modal: "OK" "Cancel"
- Popconfirm: "Yes" "No"
- Upload: "Select File" "Upload"
- Table: "Filter" "Sort" "Reset"

---

## パターン選択ガイド

### パターン1（基本テーマ）を使用する場合
- ✅ 通常の業務画面
- ✅ 管理画面
- ✅ ダッシュボード
- ✅ フォーム画面
- ✅ 日本語のみのアプリケーション

### パターン2（ダークモード）を使用する場合
- ✅ 夜間作業が多いユーザー向け
- ✅ 長時間画面を見続ける場合
- ✅ ユーザーがダークモードを選択できる設定がある場合
- ⚠️ データの可視性が重要な場合は慎重に検討

### パターン3（多言語切り替え）を使用する場合
- ✅ 国際的なユーザーベース
- ✅ 多言語サポートが必要
- ✅ 組織ごとに言語を切り替える必要がある
- ✅ ユーザーが言語を選択できる設定がある

---

## 高度な使用パターン

### パターン4: 組織別テーマ
**用途**: マルチテナントで組織ごとにテーマを変更

```typescript
const organizationThemes = {
  org_001: {
    colorPrimary: '#CF0027',
    colorInfo: '#0093CF',
  },
  org_002: {
    colorPrimary: '#1976d2',
    colorInfo: '#0288d1',
  },
};

<ConfigProvider
  theme={{
    token: organizationThemes[currentOrganizationId] || organizationThemes.org_001,
  }}
  locale={jaJP}
>
  {children}
</ConfigProvider>
```

### パターン5: コンパクトモード
**用途**: 情報密度の高い画面

```typescript
import { theme as antdTheme } from 'antd';

<ConfigProvider
  theme={{
    algorithm: antdTheme.compactAlgorithm,
    token: {
      colorPrimary: '#CF0027',
      fontSize: 12,  // 通常より小さく
    }
  }}
  locale={jaJP}
>
  {children}
</ConfigProvider>
```

### パターン6: アルゴリズム組み合わせ
**用途**: ダークモード + コンパクト

```typescript
import { theme as antdTheme } from 'antd';

<ConfigProvider
  theme={{
    algorithm: [antdTheme.darkAlgorithm, antdTheme.compactAlgorithm],
    token: {
      colorPrimary: '#CF0027',
    }
  }}
  locale={jaJP}
>
  {children}
</ConfigProvider>
```

---

## 実装例

### 基本的な実装（theme.ts）
```typescript
import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#CF0027',
    colorInfo: '#0093CF',
    colorSuccess: '#2e7d32',
    colorWarning: '#ed6c02',
    colorError: '#d32f2f',
    colorBgLayout: '#fafafa',
    colorText: '#212121',
    colorTextSecondary: '#757575',
    colorBorder: 'rgba(0, 0, 0, 0.12)',
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans JP', sans-serif`,
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
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
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
    },
    Input: {
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 24,
      borderRadius: 8,
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#212121',
      rowHoverBg: '#f5f5f5',
    },
  },
};
```

### アプリケーションでの使用（layout.tsx）
```typescript
import { ConfigProvider } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import { theme } from '@/theme/theme';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <ConfigProvider theme={theme} locale={jaJP}>
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
```

### ダークモード切り替え実装
```typescript
'use client';

import { ConfigProvider, Switch, Space, Typography } from 'antd';
import { theme as antdTheme } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import { useState } from 'react';
import { theme } from '@/theme/theme';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  return (
    <ConfigProvider
      theme={{
        ...theme,
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
      locale={jaJP}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Typography.Text>ダークモード</Typography.Text>
          <Switch checked={isDark} onChange={setIsDark} />
        </Space>
        {/* アプリケーションコンテンツ */}
      </Space>
    </ConfigProvider>
  );
}
```

### 多言語切り替え実装
```typescript
'use client';

import { ConfigProvider, Select, Space, DatePicker, Button, Modal } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import enUS from 'antd/locale/en_US';
import { useState } from 'react';
import { theme } from '@/theme/theme';

export default function LocaleToggle() {
  const [locale, setLocale] = useState<'ja' | 'en'>('ja');

  return (
    <ConfigProvider
      theme={theme}
      locale={locale === 'ja' ? jaJP : enUS}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          value={locale}
          onChange={setLocale}
          options={[
            { label: '日本語', value: 'ja' },
            { label: 'English', value: 'en' },
          ]}
          style={{ width: 150 }}
        />
        <DatePicker />
        <Button type="primary">
          {locale === 'ja' ? '送信' : 'Submit'}
        </Button>
      </Space>
    </ConfigProvider>
  );
}
```

---

## ベストプラクティス

### DO（推奨）
✅ ConfigProviderはアプリケーションのルートに配置する
✅ テーマ設定はtheme.tsファイルで一元管理する
✅ 組織ごとのテーマ設定は環境変数やAPIから取得する
✅ ダークモードはユーザーの選択を保存する（localStorage）
✅ 言語切り替えはユーザーの選択を保存する
✅ tokenの値は一貫性を保つ
✅ コンポーネント設定は必要最小限にする

### DON'T（非推奨）
❌ ConfigProviderをネストして複数配置しない（特別な理由がない限り）
❌ tokenの値を画面ごとに異なる値にしない
❌ インラインスタイルで色を直接指定しない（tokenを使う）
❌ アルゴリズムを無闇に組み合わせない
❌ コンポーネント設定で全てのプロパティをオーバーライドしない
❌ ダークモードで読みにくい色を使用しない

---

## トークン参照方法

### useToken フックで取得
```typescript
import { theme } from 'antd';

const MyComponent = () => {
  const { token } = theme.useToken();

  return (
    <div style={{ 
      color: token.colorPrimary,
      fontSize: token.fontSize,
      padding: token.margin,
    }}>
      トークンを使用したスタイリング
    </div>
  );
};
```

### CSS変数として使用
```css
.my-class {
  color: var(--ant-color-primary);
  font-size: var(--ant-font-size);
  padding: var(--ant-margin);
}
```

---

## 除外されたパターン

### カスタムプレフィックス
**除外理由**: 標準の `ant-` プレフィックスで統一するため

```typescript
// ❌ 使用しない
<ConfigProvider prefixCls="custom">
```

### getPopupContainer
**除外理由**: デフォルトの body 配置で問題ないため

```typescript
// ❌ 特別な理由がない限り使用しない
<ConfigProvider getPopupContainer={trigger => trigger.parentElement}>
```

### renderEmpty
**除外理由**: デフォルトの空状態で十分なため

```typescript
// ❌ 特別な理由がない限り使用しない
<ConfigProvider renderEmpty={customEmpty}>
```

---

## まとめ

- **基本テーマ（パターン1）**: 通常の画面で使用
- **ダークモード（パターン2）**: ユーザーオプションとして提供
- **多言語切り替え（パターン3）**: 国際化が必要な場合に使用
- tokenとcomponentsで一貫したデザインシステムを構築
- useTokenフックでトークン値を取得して使用
- アプリケーションのルートで一度だけConfigProviderを設定
