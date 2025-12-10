# UIポリシー

## デザインシステム概要

MaiML Viewerは、モダンで洗練されたUIを提供するため、Ant Design v6をベースとしたデザインシステムを採用します。白を基調とした明るく清潔感のあるインターフェースに、赤系のアクセントカラー（#CF0027）を組み合わせ、科学的な信頼性と使いやすさを両立します。

## カラーパレット

### プライマリカラー（赤系）
```typescript
token: {
  colorPrimary: '#CF0027',      // メインの赤色（メインヘッダー、プライマリボタン）
  colorPrimaryHover: '#E63946', // ライトレッド（ホバー、アクティブ状態）
  colorPrimaryActive: '#A50020', // ダークレッド（押下状態）
  colorPrimaryBorder: '#CF0027',
  colorPrimaryBg: '#FFF1F3',    // プライマリ背景色
  colorPrimaryBgHover: '#FFE4E8',
  colorPrimaryText: '#CF0027',
  colorPrimaryTextHover: '#E63946',
  colorPrimaryTextActive: '#A50020'
}
```

### セカンダリカラー（青系 - タブインジケーターなど）
```typescript
colorInfo: '#1976d2',           // セカンダリブルー
colorInfoHover: '#42a5f5',      // ライトブルー
colorInfoActive: '#1565c0',     // ダークブルー
colorInfoBg: '#E3F2FD',
colorInfoBorder: '#1976d2'
```

### 背景カラー
```typescript
colorBgBase: '#ffffff',         // 基本背景色
colorBgLayout: '#fafafa',       // レイアウト背景（全体背景）
colorBgContainer: '#ffffff',    // コンテナ背景（カード、モーダル等）
colorBgElevated: '#ffffff',     // 浮き上がった要素の背景
colorBgSpotlight: '#f5f5f5',    // スポットライト背景（セクション区切り）
colorFillSecondary: '#f5f5f5'   // セカンダリ塗りつぶし
```

### テキストカラー
```typescript
colorText: '#212121',           // メインテキスト
colorTextSecondary: '#757575',  // 補足テキスト
colorTextTertiary: '#9e9e9e',   // 三次テキスト（ヒント）
colorTextQuaternary: '#bdbdbd', // 四次テキスト（無効状態）
colorTextDisabled: '#bdbdbd'    // 無効状態テキスト
```

### 状態カラー
```typescript
colorSuccess: '#2e7d32',        // 成功メッセージ
colorSuccessBg: '#E8F5E9',      // 成功背景
colorSuccessBorder: '#2e7d32',  // 成功ボーダー

colorError: '#d32f2f',          // エラーメッセージ
colorErrorBg: '#FFEBEE',        // エラー背景
colorErrorBorder: '#d32f2f',    // エラーボーダー

colorWarning: '#ed6c02',        // 警告メッセージ
colorWarningBg: '#FFF4E5',      // 警告背景
colorWarningBorder: '#ed6c02',  // 警告ボーダー

colorInfo: '#0288d1',           // 情報メッセージ
colorInfoBg: '#E3F2FD',         // 情報背景
colorInfoBorder: '#0288d1'      // 情報ボーダー
```

### 境界線・分割線
```typescript
colorBorder: 'rgba(0, 0, 0, 0.12)',      // 標準ボーダー
colorBorderSecondary: 'rgba(0, 0, 0, 0.06)', // セカンダリボーダー
colorSplit: 'rgba(0, 0, 0, 0.06)'        // 分割線
```

## タイポグラフィ

### フォントファミリー
```typescript
fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans JP', 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`
```

### フォントサイズ
```typescript
fontSize: 14,              // 基本フォントサイズ（14px）
fontSizeSM: 12,           // 小（12px） - キャプション、ラベル
fontSizeLG: 16,           // 大（16px） - サブヘッディング
fontSizeXL: 20,           // 特大（20px） - 小見出し
fontSizeHeading1: 38,     // H1（38px） - ページタイトル
fontSizeHeading2: 30,     // H2（30px） - 大見出し
fontSizeHeading3: 24,     // H3（24px） - 見出し
fontSizeHeading4: 20,     // H4（20px） - 小見出し
fontSizeHeading5: 16      // H5（16px） - 最小見出し
```

### 行の高さ
```typescript
lineHeight: 1.5715,           // 基本行高
lineHeightSM: 1.66,          // 小
lineHeightLG: 1.5,           // 大
lineHeightHeading1: 1.21,    // H1
lineHeightHeading2: 1.35,    // H2
lineHeightHeading3: 1.35,    // H3
lineHeightHeading4: 1.4,     // H4
lineHeightHeading5: 1.5      // H5
```

### フォントウェイト
```typescript
fontWeightStrong: 600        // 強調（見出し）
// 通常は400がデフォルト
```

## スペーシング

Ant Designでは基本的に8pxを基準としたスペーシングを使用します。

```typescript
// Ant DesignのSpace、Paddingなどで使用されるサイズ
controlPaddingHorizontal: 12,    // コントロールの水平パディング
controlPaddingHorizontalSM: 8,   // 小
marginXS: 8,                      // 極小マージン
marginSM: 12,                     // 小マージン
margin: 16,                       // 標準マージン
marginMD: 20,                     // 中マージン
marginLG: 24,                     // 大マージン
marginXL: 32,                     // 特大マージン
marginXXL: 48                     // 超特大マージン
```

**推奨スペーシング値（Space componentで使用）:**
- `small` - 8px
- `middle` - 16px（デフォルト）
- `large` - 24px
- 数値指定: `8`, `16`, `24`, `32`, `48`, `64`

## ボーダーラジアス

```typescript
borderRadius: 8,              // 標準（ボタン、カード）
borderRadiusSM: 4,           // 小さなコンポーネント
borderRadiusLG: 12,          // 大きなカード
borderRadiusXS: 2,           // 極小
borderRadiusOuter: 8         // 外側要素
```

## シャドウ（影）

```typescript
boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',              // 基本シャドウ（カード）
boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.12)',    // セカンダリ（ドロップダウン）
boxShadowTertiary: '0 8px 24px rgba(0, 0, 0, 0.16)'     // 三次（モーダル）
```

**Ant Design標準シャドウレベル:**
- カード: 基本シャドウ
- ドロップダウン: セカンダリシャドウ
- モーダル/ドロワー: 三次シャドウ
- Popover: セカンダリシャドウ

## コンポーネントスタイル

### ボタン（Button）

#### プライマリボタン
```typescript
Button type="primary"
```
- 背景色: `colorPrimary` (#CF0027)
- テキスト色: `#ffffff`
- ホバー時: `colorPrimaryHover` (#E63946)
- 押下時: `colorPrimaryActive` (#A50020)
- 高さ: `32px`（middle）、`40px`（large）、`24px`（small）
- パディング: 水平 `15px`（middle）、`15px`（large）、`7px`（small）
- ボーダーラジアス: `8px`

#### デフォルトボタン（アウトライン）
```typescript
Button type="default"
```
- 背景色: `#ffffff`
- ボーダー: `1px solid colorBorder`
- テキスト色: `colorText`
- ホバー時: ボーダー `colorPrimaryHover`、テキスト `colorPrimaryHover`

#### テキストボタン
```typescript
Button type="text"
```
- 背景色: `transparent`
- テキスト色: `colorText`
- ホバー時: 背景 `colorBgTextHover`

#### リンクボタン
```typescript
Button type="link"
```
- 背景色: `transparent`
- テキスト色: `colorPrimary`
- ホバー時: `colorPrimaryHover`

### カード（Card）

- 背景色: `colorBgContainer` (#ffffff)
- ボーダーラジアス: `borderRadiusLG` (12px)
- ボーダー: `1px solid colorBorderSecondary`
- シャドウ: 基本シャドウ（ホバー時はセカンダリシャドウ）
- パディング: ヘッダー `24px`、ボディ `24px`

### インプットフィールド（Input）

#### テキストフィールド
```typescript
Input
```
- 背景色: `colorBgContainer` (#ffffff)
- ボーダー色: `colorBorder`
- フォーカス時ボーダー: `colorPrimary`
- 高さ: `24px`（small）、`32px`（middle）、`40px`（large）
- ボーダーラジアス: `borderRadius` (8px)
- パディング: 水平 `11px`

#### Select・ドロップダウン
```typescript
Select
```
- インプットと同じスタイル
- ドロップダウンメニュー: セカンダリシャドウ
- 選択済みアイテム背景: `colorPrimaryBg`
- ホバー背景: `colorBgTextHover`

### モーダル（Modal）

- 背景色: `colorBgElevated` (#ffffff)
- ボーダーラジアス: `borderRadiusLG` (12px)
- シャドウ: 三次シャドウ
- マスク背景: `rgba(0, 0, 0, 0.45)`
- パディング: ヘッダー `16px 24px`、ボディ `24px`、フッター `10px 16px`
- 最大幅: デフォルト `520px`、サイズ指定可能

### ドロワー（Drawer）

- 背景色: `colorBgElevated` (#ffffff)
- シャドウ: 三次シャドウ
- マスク背景: `rgba(0, 0, 0, 0.45)`
- 幅: デフォルト `378px`、サイズ指定可能

### ヘッダー（Layout.Header）

- **Header（1段目）**
  - 背景色: `#ffffff`（白）
  - 高さ: `64px`
  - ロゴ色: `#CF0027`（赤、アクセントカラー）
  - テキスト色: `colorTextSecondary`（グレー）
  - Avatar背景色: `#CF0027`（赤、アクセントカラー）
  
- **SubHeader（2段目）**
  - 背景色: `#1976d2`（青、プライマリカラー）
  - 高さ: `48px`
  - テキスト色: `white`
  
- シャドウ: 基本シャドウ
- ボーダー下: `1px solid colorBorderSecondary`
- パディング: `0 50px`

### サイドバー（Layout.Sider & Menu）

- 背景色: `colorBgContainer` (#ffffff)
- 幅: `256px`（デフォルト）、`280px`（広め）、折りたたみ時 `80px`
- シャドウ: 基本シャドウ（右側）
- メニューアイテム:
  - アクティブ背景: `colorPrimaryBg`
  - アクティブテキスト: `colorPrimary`
  - アクティブボーダー: 左側 `3px solid colorPrimary`
  - ホバー背景: `colorBgTextHover`

### テーブル（Table）

- ヘッダー背景: `colorFillAlter` (#fafafa)
- ボーダー: `1px solid colorBorder`
- 行ホバー背景: `colorBgTextHover`
- 選択行背景: `colorPrimaryBg`
- セル内パディング: `16px`
- 最小行高さ: `54px`（middle）

### タブ（Tabs）

- 未選択タブ色: `colorTextSecondary`
- 選択タブ色: `colorPrimary`
- インジケーター色: `colorPrimary`
- インジケーター高さ: `2px`
- タブ高さ: `46px`
- ホバー時テキスト: `colorPrimaryHover`

### タグ（Tag）

- デフォルト背景: `colorFillQuaternary`
- プライマリタグ背景: `colorPrimaryBg`
- テキスト色: `colorText`
- 高さ: `24px`（small）、`32px`（default）
- ボーダーラジアス: `borderRadiusSM` (4px)
- パディング: 水平 `7px`

### アラート（Alert）

#### 情報アラート
```typescript
Alert type="info"
```
- 背景色: `colorInfoBg`
- アイコン色: `colorInfo`
- テキスト色: `colorText`
- ボーダー: `1px solid colorInfoBorder`

#### 成功アラート
```typescript
Alert type="success"
```
- 背景色: `colorSuccessBg`
- アイコン色: `colorSuccess`
- ボーダー: `1px solid colorSuccessBorder`

#### 警告アラート
```typescript
Alert type="warning"
```
- 背景色: `colorWarningBg`
- アイコン色: `colorWarning`
- ボーダー: `1px solid colorWarningBorder`

#### エラーアラート
```typescript
Alert type="error"
```
- 背景色: `colorErrorBg`
- アイコン色: `colorError`
- ボーダー: `1px solid colorErrorBorder`

### メッセージ（message）・通知（notification）

- message: 画面上部中央に表示される軽量通知
- notification: 画面右上に表示されるリッチな通知
- 自動消去時間: デフォルト `3秒`（message）、`4.5秒`（notification）

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

## ダークモード

Ant Design v6では、ConfigProviderの`theme.algorithm`を使用して簡単にダークモードを実装できます。

### ダークモード設定
```typescript
import { theme as antdTheme } from 'antd';

<ConfigProvider
  theme={{
    algorithm: antdTheme.darkAlgorithm,
    token: {
      colorPrimary: '#CF0027',
      // その他のトークン設定
    }
  }}
>
  {/* アプリケーション */}
</ConfigProvider>
```

### ダークモード時の自動調整
- 背景色が自動的に暗い色に変換
- テキストカラーが白系に変換
- ボーダー、シャドウも自動調整
- プライマリカラーは明るさが自動調整される

## 実装例

### テーマ設定（theme.ts）
```typescript
import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    // カラー
    colorPrimary: '#CF0027',
    colorInfo: '#1976d2',
    colorSuccess: '#2e7d32',
    colorWarning: '#ed6c02',
    colorError: '#d32f2f',
    
    // 背景
    colorBgLayout: '#fafafa',
    
    // テキスト
    colorText: '#212121',
    colorTextSecondary: '#757575',
    
    // ボーダー
    colorBorder: 'rgba(0, 0, 0, 0.12)',
    
    // フォント
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans JP', 'Helvetica Neue', Arial, sans-serif`,
    fontSize: 14,
    
    // ボーダーラジアス
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    
    // スペーシング
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,
    
    // その他
    wireframe: false,  // ワイヤーフレームモードを無効化
    motion: true       // アニメーションを有効化
  },
  
  components: {
    Button: {
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 24,
      borderRadius: 8,
      fontWeight: 500
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 24
    },
    Input: {
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 24,
      borderRadius: 8
    },
    Modal: {
      borderRadiusLG: 12
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#212121',
      rowHoverBg: '#f5f5f5'
    }
  }
};
```

### 使用例（App.tsx）
```typescript
import { ConfigProvider, Button, Card, Input, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { theme } from './theme';

export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="ログインフォーム">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Input
              prefix={<UserOutlined />}
              placeholder="ユーザー名"
              size="large"
            />
            <Button
              type="primary"
              size="large"
              block
            >
              ログイン
            </Button>
          </Space>
        </Card>
      </Space>
    </ConfigProvider>
  );
}
```

### レイアウト例
```typescript
import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  UserOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 50px' }}>
        <div style={{ color: '#CF0027', fontSize: 20, fontWeight: 600 }}>
          MaiML Viewer
        </div>
      </Header>
      
      <Layout>
        <Sider width={256} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['1']}
            items={[
              {
                key: '1',
                icon: <HomeOutlined />,
                label: 'ホーム'
              },
              {
                key: '2',
                icon: <UserOutlined />,
                label: 'ユーザー管理'
              },
              {
                key: '3',
                icon: <SettingOutlined />,
                label: '設定'
              }
            ]}
          />
        </Sider>
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          {/* コンテンツ */}
        </Content>
      </Layout>
    </Layout>
  );
}
```

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
