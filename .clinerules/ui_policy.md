# UIポリシー

## 基本原則

### デザイントークンの使用を徹底

MaiML Viewerは、Ant Design v6のデザイントークンシステムを完全に活用し、一貫性のあるUIを提供します。

**重要なルール:**
- ✅ **Ant Designのデザイントークンを使用する**
- ❌ **インラインスタイル（`style` prop）でのハードコーディングを禁止**
- ✅ **テーマ設定（`theme.ts`）でトークンをカスタマイズする**
- ✅ **コンポーネントの props でスタイルを制御する**

### スタイル記述の原則

#### 1. デザイントークンの使用（推奨）

**DO（推奨）:**
```typescript
// ✅ コンポーネントのサイズpropsを使用
<Button size="large" type="primary">送信</Button>

// ✅ Spaceコンポーネントで間隔を制御
<Space size="middle" direction="vertical">
  <Card>...</Card>
  <Card>...</Card>
</Space>

// ✅ theme.tsで定義されたトークンを使用
import { theme } from 'antd';
const { token } = theme.useToken();
<div style={{ color: token.colorPrimary }}>テキスト</div>
```

**DON'T（非推奨）:**
```typescript
// ❌ インラインスタイルでハードコーディング
<Button style={{ height: '40px', backgroundColor: '#CF0027' }}>送信</Button>

// ❌ 具体的なピクセル値で間隔を指定
<div style={{ marginBottom: '16px' }}>...</div>

// ❌ 直接色コードを指定
<div style={{ color: '#CF0027' }}>テキスト</div>
```

#### 2. CSS Modules / CSS-in-JS（例外的に使用）

複雑なレイアウトやアニメーションが必要な場合のみ、CSS ModulesまたはCSS-in-JS（Emotion）を使用可能です。ただし、可能な限りデザイントークンを参照してください。

```typescript
// ✅ Emotionでデザイントークンを参照
import styled from '@emotion/styled';
import { theme } from 'antd';

const StyledCard = styled.div`
  padding: ${({ theme }) => theme.token.paddingLG}px;
  border-radius: ${({ theme }) => theme.token.borderRadiusLG}px;
  background: ${({ theme }) => theme.token.colorBgContainer};
`;

// 使用時にthemeを渡す
const { token } = theme.useToken();
<StyledCard theme={{ token }}>コンテンツ</StyledCard>
```

## デザインシステム概要

MaiML Viewerは、白を基調とした明るく清潔感のあるインターフェースに、赤系のアクセントカラーを組み合わせ、科学的な信頼性と使いやすさを両立します。

**具体的な色コードやサイズ値は `frontend/src/theme/theme.ts` で定義します。**

## デザイントークンの概要

### カラートークン

**プライマリカラー系:**
- `colorPrimary` - メインのブランドカラー（ボタン、リンクなど）
- `colorPrimaryHover` - ホバー時の色
- `colorPrimaryActive` - 押下時の色
- `colorPrimaryBg` - プライマリ背景色（薄い）
- `colorPrimaryText` - プライマリテキスト色

**背景カラー系:**
- `colorBgBase` - 基本背景色
- `colorBgLayout` - レイアウト背景（全体背景）
- `colorBgContainer` - コンテナ背景（カード、モーダル等）
- `colorBgElevated` - 浮き上がった要素の背景
- `colorBgSpotlight` - スポットライト背景

**テキストカラー系:**
- `colorText` - メインテキスト
- `colorTextSecondary` - 補足テキスト
- `colorTextTertiary` - 三次テキスト
- `colorTextDisabled` - 無効状態テキスト

**状態カラー系:**
- `colorSuccess` / `colorSuccessBg` - 成功
- `colorError` / `colorErrorBg` - エラー
- `colorWarning` / `colorWarningBg` - 警告
- `colorInfo` / `colorInfoBg` - 情報

**ボーダー系:**
- `colorBorder` - 標準ボーダー
- `colorBorderSecondary` - セカンダリボーダー
- `colorSplit` - 分割線

### タイポグラフィトークン

**フォント系:**
- `fontFamily` - フォントファミリー
- `fontSize` - 基本フォントサイズ（14px）
- `fontSizeSM` / `fontSizeLG` / `fontSizeXL` - サイズバリエーション
- `fontSizeHeading1` ～ `fontSizeHeading5` - 見出しサイズ
- `fontWeightStrong` - 強調フォントウェイト

**行の高さ:**
- `lineHeight` - 基本行高
- `lineHeightSM` / `lineHeightLG` - サイズバリエーション
- `lineHeightHeading1` ～ `lineHeightHeading5` - 見出し行高

### スペーシングトークン

**マージン系:**
- `marginXS` / `marginSM` / `margin` / `marginMD` / `marginLG` / `marginXL` / `marginXXL`

**パディング系:**
- `padding` / `paddingSM` / `paddingLG` / `paddingXL`
- `controlPaddingHorizontal` - コントロールの水平パディング

**推奨する`<Space>`コンポーネントのサイズ指定:**
- `size="small"` - 8px
- `size="middle"` - 16px（デフォルト）
- `size="large"` - 24px
- `size={数値}` - カスタム値（8の倍数を推奨）

### ボーダーラジアストークン

- `borderRadius` - 標準（8px）
- `borderRadiusSM` - 小（4px）
- `borderRadiusLG` - 大（12px）
- `borderRadiusXS` - 極小（2px）

### シャドウトークン

- `boxShadow` - 基本シャドウ（カード）
- `boxShadowSecondary` - セカンダリ（ドロップダウン）
- `boxShadowTertiary` - 三次（モーダル）

## コンポーネント使用ガイドライン

### ボタン（Button）

**DO（推奨）:**
```typescript
// ✅ type propsでスタイルを制御
<Button type="primary" size="large">送信</Button>
<Button type="default">キャンセル</Button>
<Button type="text">詳細</Button>
<Button type="link">リンク</Button>

// ✅ danger propsで危険な操作を表現
<Button type="primary" danger>削除</Button>

// ✅ icon propsでアイコン付きボタン
<Button type="primary" icon={<SearchOutlined />}>検索</Button>
```

**DON'T（非推奨）:**
```typescript
// ❌ インラインスタイルで色やサイズを指定
<Button style={{ backgroundColor: '#CF0027', height: '40px' }}>送信</Button>
```

### スペーシング（Space）

**DO（推奨）:**
```typescript
// ✅ Spaceコンポーネントで間隔を制御
<Space size="middle" direction="vertical" style={{ width: '100%' }}>
  <Card>カード1</Card>
  <Card>カード2</Card>
</Space>

// ✅ Flex + gap でレイアウト
<Flex gap="middle" vertical>
  <Card>カード1</Card>
  <Card>カード2</Card>
</Flex>
```

**DON'T（非推奨）:**
```typescript
// ❌ 各要素にmarginを個別指定
<div style={{ marginBottom: '16px' }}>カード1</div>
<div style={{ marginBottom: '16px' }}>カード2</div>
```

### カード（Card）

**DO（推奨）:**
```typescript
// ✅ Cardコンポーネントのpropsを使用
<Card 
  title="タイトル"
  bordered={false}
  size="small"
  hoverable
>
  コンテンツ
</Card>
```

**DON'T（非推奨）:**
```typescript
// ❌ インラインスタイルで背景や影を指定
<Card style={{ 
  background: '#fff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  borderRadius: '12px'
}}>
  コンテンツ
</Card>
```

### レイアウト（Layout）

**DO（推奨）:**
```typescript
// ✅ theme.useToken()でトークンを取得して使用
import { theme, Layout } from 'antd';

function AppLayout() {
  const { token } = theme.useToken();
  
  return (
    <Layout>
      <Layout.Header style={{ background: token.colorBgContainer }}>
        ヘッダー
      </Layout.Header>
      <Layout.Content style={{ padding: token.paddingLG }}>
        コンテンツ
      </Layout.Content>
    </Layout>
  );
}
```

**DON'T（非推奨）:**
```typescript
// ❌ 具体的な値をハードコーディング
<Layout>
  <Layout.Header style={{ background: '#ffffff' }}>
    ヘッダー
  </Layout.Header>
  <Layout.Content style={{ padding: '24px' }}>
    コンテンツ
  </Layout.Content>
</Layout>
```

### テキスト（Typography）

**DO（推奨）:**
```typescript
// ✅ Typographyコンポーネントを使用
<Typography.Title level={1}>ページタイトル</Typography.Title>
<Typography.Title level={2}>セクションタイトル</Typography.Title>
<Typography.Text type="secondary">補足テキスト</Typography.Text>
<Typography.Text type="danger">エラーメッセージ</Typography.Text>
```

**DON'T（非推奨）:**
```typescript
// ❌ 直接HTMLタグとインラインスタイル
<h1 style={{ fontSize: '38px', color: '#212121' }}>タイトル</h1>
<span style={{ color: '#757575' }}>補足テキスト</span>
```

### フォーム（Form, Input, Select）

**DO（推奨）:**
```typescript
// ✅ サイズpropsを使用

## レイアウト原則

### グリッドシステム（Grid / Row / Col）

Ant Designの24カラムグリッドシステムを使用します。

```typescript
// Gutterの設定
gutter: 16  // デフォルトの間隔
```

**ブレークポイント:**
```typescript
screen: {
  xs: 480,    // モバイル
  sm: 576,    // タブレット（縦）
  md: 768,    // タブレット（横）
  lg: 992,    // 小型ラップトップ
  xl: 1200,   // デスクトップ
  xxl: 1600   // 大型ディスプレイ
}
```

### レスポンシブデザイン

#### Col のレスポンシブプロパティ
```typescript
<Col xs={24} sm={12} md={8} lg={6} xl={4}>
  {/* コンテンツ */}
</Col>
```

#### モバイル（xs, sm）
- シングルカラムレイアウト（span={24}）
- フルスクリーンモーダル
- Drawer を使用したサイドナビゲーション
- タッチターゲット最小サイズ: `44px x 44px`

#### タブレット（md）
- 2カラムレイアウト（span={12}）
- サイドバー折りたたみ可能
- モーダル幅: 最大 `600px`

#### デスクトップ（lg, xl, xxl）
- 3-4カラムレイアウト可能（span={8} or span={6}）
- 固定サイドバー
- モーダル幅: 最大 `900px`

## アクセシビリティ

Ant Designは標準でアクセシビリティに対応していますが、以下の点に注意してください。

### コントラスト比
- 通常テキスト: 最低 4.5:1
- 大きなテキスト（18px以上）: 最低 3:1
- UI要素（ボタン、アイコン等）: 最低 3:1

### フォーカス表示
- Ant Designが自動的にフォーカススタイルを適用
- フォーカスアウトライン色: `colorPrimary`
- アウトライン幅: `2px`

### キーボード操作
- Tab順序の論理的な流れ
- Enterキーでボタン実行
- Escapeキーでモーダル閉じる
- 矢印キーでメニュー/リスト操作
- Space キーでチェックボックス/ラジオボタン切り替え

### スクリーンリーダー対応
- Ant Designコンポーネントは標準でARIA属性をサポート
- 追加のARIAラベルが必要な場合は適宜追加
- フォーム要素は自動的にラベル関連付け

## アニメーション・トランジション

### motion設定
```typescript
motion: true  // アニメーションを有効化（デフォルト）
```

### トランジション時間
```typescript
motionDurationFast: '0.1s',    // 100ms - 簡単な状態変化
motionDurationMid: '0.2s',     // 200ms - 標準
motionDurationSlow: '0.3s'     // 300ms - 複雑な遷移
```

### イージング関数
```typescript
motionEaseInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
motionEaseOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
motionEaseIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
motionEaseInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
motionEaseOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
motionEaseInCirc: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
motionEaseOutCirc: 'cubic-bezier(0.075, 0.82, 0.165, 1)'
```

### アニメーション対象
- ホバー状態: `0.2s ease-out`
- ボタン押下: `0.1s ease-in`
- モーダル表示/非表示: `0.3s ease-in-out`
- ドロップダウン: `0.2s ease-out`
- ページ遷移: `0.3s ease-in-out`

## アイコン

### アイコンライブラリ

#### @ant-design/icons（推奨）
```typescript
import { UserOutlined, HomeOutlined, SettingFilled } from '@ant-design/icons';
```
- Ant Design公式アイコンセット
- Outlined（線）、Filled（塗りつぶし）、TwoTone（2色）の3スタイル
- サイズ: デフォルト `14px`、`style={{ fontSize: 16 }}`でカスタマイズ可能

#### Lucide React（補助的に使用可）
```typescript
import { Settings, User } from 'lucide-react';
```
- 軽量でモダンなアイコンセット
- サイズ: `16px`（small）、`20px`（medium）、`24px`（large）
- 色: `currentColor`（親要素のテキスト色を継承）

### アイコン使用ガイドライン
- ボタン内のアイコン: `<Button icon={<UserOutlined />}>`
- テキストとの間隔: `Space` コンポーネントで `8px`
- アイコンのみのボタン: `<Button icon={<UserOutlined />} shape="circle" />`
- 装飾的アイコン: `aria-hidden="true"`

## 多言語化（i18n）

### 概要

MaiML Viewerは、テナント（組織）ごとに言語を切り替えられる多言語化システムを実装しています。

### Ant Designのローカライゼーション

```typescript
import { ConfigProvider } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import enUS from 'antd/locale/en_US';

<ConfigProvider locale={locale === 'ja' ? jaJP : enUS}>
  {/* アプリケーション */}
</ConfigProvider>
```

### ディレクトリ構造

```
frontend/src/
├── locales/                    # 言語ファイル
│   ├── ja.json                 # 日本語
│   └── en.json                 # 英語
└── contexts/
    └── LanguageContext.tsx     # 言語コンテキスト
```

### 言語ファイル形式

```json
{
  "common
