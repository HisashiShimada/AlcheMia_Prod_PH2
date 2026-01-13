# ページレイアウト形状ポリシー

## 標準3パターン

### パターン1: 2段ヘッダー + メインコンテンツ
**用途**: 通常の画面（メニュー画面、一覧画面、詳細画面）

#### Header（1段目）
- 高さ: `64px`
- 背景色: `token.colorBgContainer` (#ffffff)
- position: `fixed`
- z-index: `1000`
- ボーダー下: `1px solid token.colorBorderSecondary`
- パディング: 左右 `token.paddingXL * 2` (50px)

**構成要素:**
- アプリケーション名（左）
  - フォントサイズ: `token.fontSizeHeading1` (38px)
  - 色: `token.colorPrimary` (#CF0027)
  - フォントウェイト: `token.fontWeightStrong` (600)

- サブタイトル（中央）
  - フォントサイズ: `token.fontSizeLG` (16px)
  - 色: `token.colorTextSecondary` (#757575)

- ユーザー情報（右）
  - ユーザー名: `token.fontSizeLG` (16px)、フォントウェイト 500
  - 組織名・ロール: `token.fontSize` (14px)、セカンダリカラー
  - Avatar: 直径 `36px`、背景 `token.colorPrimary`

#### SubHeader（2段目）
- 高さ: `48px`
- 背景色: `token.colorInfo` (#0093CF) - 青系
- position: `fixed`
- top: `64px`
- z-index: `999`
- ボーダー下: `1px solid token.colorBorderSecondary`
- パディング: 左右 `token.paddingXL * 2` (50px)
- テキスト色: `#ffffff` (白)

**構成要素:**
- タイトル（左）
  - フォントサイズ: `token.fontSizeHeading4` (20px)
  - フォントウェイト: `token.fontWeightStrong` (600)

- タブ（中央、オプション）
  - フォントサイズ: `16px`
  - 未選択: `rgba(255, 255, 255, 0.7)`
  - 選択時: `#ffffff`、フォントウェイト 600
  - アクティブインジケーター: 高さ `3px`、白色

- アクションボタン + メニュー切替（右）
  - ボタン高さ: `36px`
  - ボタンスタイル: `type="primary" ghost`
  - ボーダー色: `rgba(255, 255, 255, 0.8)`

#### メインコンテンツ
- margin-top: `112px` (64px + 48px)
- パディング: `40px` (推奨)
- 背景色: `token.colorBgLayout` (#fafafa)
- 最小高さ: `calc(100vh - 112px)`

---

### パターン2: 1段ヘッダー + メインコンテンツ
**用途**: ログイン画面、エラー画面など、SubHeaderが不要な画面

#### Header（1段目）
- 同上（パターン1と同じ）

#### メインコンテンツ
- margin-top: `64px` (64px)
- パディング: `40px` (推奨)
- 背景色: `token.colorBgLayout` (#fafafa)
- 最小高さ: `calc(100vh - 64px)`
- 中央配置: 必要に応じて `display: flex; align-items: center; justify-content: center`

---

### パターン3: ヘッダーなし（フルスクリーン）
**用途**: モーダル内コンテンツ、エラーページ、メンテナンス画面

#### メインコンテンツ
- margin-top: `0`
- パディング: 用途に応じて設定
- 背景色: `token.colorBgLayout` (#fafafa) または カスタム
- 最小高さ: `100vh`

---

## 共通仕様（全パターン）

### 色定義

**Header（1段目）**
- 背景色: `#ffffff` (白)
- テキスト色（プライマリ）: `token.colorPrimary` (#CF0027)
- テキスト色（セカンダリ）: `token.colorTextSecondary` (#757575)
- ボーダー色: `token.colorBorderSecondary` (rgba(0,0,0,0.06))

**SubHeader（2段目）**
- 背景色: `token.colorInfo` (#0093CF) - 青系
- テキスト色: `#ffffff` (白)
- 未選択タブ: `rgba(255, 255, 255, 0.7)`
- アクティブインジケーター: `#ffffff` (白)
- ボーダー色: `token.colorBorderSecondary`

**メインコンテンツ**
- 背景色: `token.colorBgLayout` (#fafafa)
- カード背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)

### スペーシング

**パディング:**
- Header・SubHeader 左右: `50px` (token.paddingXL * 2)
- メインコンテンツ: `40px` (推奨)
- カード内: `24px` (token.paddingLG)

**マージン:**
- セクション間: `24px` (token.marginLG)
- 要素間: `16px` (token.margin)
- 小要素間: `8px` (token.marginXS)

### z-index管理

| 要素 | z-index | 理由 |
|------|---------|------|
| Header（1段目） | 1000 | 最上位固定ヘッダー |
| SubHeader（2段目） | 999 | Headerの下 |
| モーダル | 1000～ | Ant Designデフォルト |
| 全画面ローディング | 9999 | 最前面 |

### レスポンシブデザイン

#### デスクトップ（lg以上: 992px～）
- Header・SubHeaderのパディング: `50px`
- メインコンテンツの最大幅: 制限なし
- サイドバー: 表示（必要に応じて）

#### タブレット（md: 768px～991px）
- Header・SubHeaderのパディング: `24px`
- メインコンテンツの最大幅: 制限なし
- サイドバー: 折りたたみ可能

#### モバイル（sm以下: ～767px）
- Header・SubHeaderのパディング: `16px`
- Header: ロゴとユーザーアイコンのみ表示
- SubHeader: タイトルのみ、タブはドロップダウン化
- メインコンテンツのパディング: `16px`

---

## パターン選択

### パターン1（2段ヘッダー + メインコンテンツ）を使用する場合
- ✅ メニュー画面
- ✅ 一覧画面（プロジェクト一覧、ユーザー一覧など）
- ✅ 詳細画面（プロジェクト詳細、ユーザー詳細など）
- ✅ タブがある画面
- ✅ アクションボタンがヘッダーに必要な画面

### パターン2（1段ヘッダー + メインコンテンツ）を使用する場合
- ✅ ログイン画面
- ✅ 初期設定画面
- ✅ エラー画面（404、500など）
- ✅ SubHeaderが不要なシンプルな画面

### パターン3（ヘッダーなし）を使用する場合
- ✅ モーダル内のコンテンツ
- ✅ 印刷プレビュー画面
- ✅ メンテナンス画面
- ✅ 外部公開ページ（ヘッダー不要）

---

## メインコンテンツの構成パターン

### パターンA: カード中心レイアウト
**用途**: ダッシュボード、統計画面

```tsx
<div style={{ padding: '40px', backgroundColor: '#fafafa' }}>
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Card title="統計情報">
      {/* コンテンツ */}
    </Card>
    <Card title="グラフ">
      {/* コンテンツ */}
    </Card>
  </Space>
</div>
```

### パターンB: テーブル中心レイアウト
**用途**: 一覧画面、検索結果画面

```tsx
<div style={{ padding: '40px', backgroundColor: '#fafafa' }}>
  <Card>
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* 検索フィルタ */}
      <Space>
        <Input.Search placeholder="検索" style={{ width: 250 }} />
        <Button>フィルタ</Button>
      </Space>
      
      {/* テーブル */}
      <Table columns={columns} dataSource={data} />
    </Space>
  </Card>
</div>
```

### パターンC: フォーム中心レイアウト
**用途**: 登録画面、編集画面

```tsx
<div style={{ padding: '40px', backgroundColor: '#fafafa' }}>
  <Card title="プロジェクト登録">
    <Form layout="vertical">
      {/* フォームアイテム */}
      <Form.Item label="プロジェクト名">
        <Input />
      </Form.Item>
      
      {/* アクションボタン */}
      <Space>
        <Button type="primary">保存</Button>
        <Button>キャンセル</Button>
      </Space>
    </Form>
  </Card>
</div>
```

### パターンD: 2カラムレイアウト
**用途**: 詳細画面、設定画面

```tsx
<div style={{ padding: '40px', backgroundColor: '#fafafa' }}>
  <Row gutter={24}>
    <Col span={16}>
      <Card title="詳細情報">
        {/* メインコンテンツ */}
      </Card>
    </Col>
    <Col span={8}>
      <Card title="関連情報">
        {/* サイドコンテンツ */}
      </Card>
    </Col>
  </Row>
</div>
```

---

## 実装例

### パターン1: 2段ヘッダー + メインコンテンツ

```tsx
import { Layout } from 'antd';
import Header from '@/components/common/Header';
import SubHeader from '@/components/common/SubHeader';

const { Content } = Layout;

export default function StandardPage() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header（1段目） */}
      <Header user={user} onLogout={handleLogout} />
      
      {/* SubHeader（2段目） */}
      <SubHeader
        title="プロジェクト管理"
        tabs={[
          { key: 'list', label: '一覧', icon: <UnorderedListOutlined /> },
          { key: 'kanban', label: 'カンバン', icon: <AppstoreOutlined /> },
        ]}
        activeTabKey={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* メインコンテンツ */}
      <Content style={{ marginTop: '112px', padding: '40px', backgroundColor: '#fafafa' }}>
        {/* コンテンツ */}
      </Content>
    </Layout>
  );
}
```

### パターン2: 1段ヘッダー + メインコンテンツ

```tsx
import { Layout } from 'antd';
import Header from '@/components/common/Header';

const { Content } = Layout;

export default function LoginPage() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header（1段目）のみ */}
      <Header user={null} onLogout={() => {}} />
      
      {/* メインコンテンツ */}
      <Content 
        style={{ 
          marginTop: '64px', 
          padding: '40px',
          backgroundColor: '#fafafa',
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card style={{ width: 400 }}>
          {/* ログインフォーム */}
        </Card>
      </Content>
    </Layout>
  );
}
```

### パターン3: ヘッダーなし

```tsx
export default function MaintenancePage() {
  return (
    <div 
      style={{ 
        minHeight: '100vh',
        backgroundColor: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}
    >
      <Card style={{ maxWidth: 600, textAlign: 'center' }}>
        <Title level={2}>メンテナンス中</Title>
        <Paragraph>
          現在、システムメンテナンスを実施しています。
        </Paragraph>
      </Card>
    </div>
  );
}
```

---

## アクセシビリティ

### セマンティックHTML
```tsx
<Layout>
  <Header as="header" role="banner">
    {/* ヘッダーコンテンツ */}
  </Header>
  
  <Content as="main" role="main">
    {/* メインコンテンツ */}
  </Content>
  
  <Footer as="footer" role="contentinfo">
    {/* フッターコンテンツ */}
  </Footer>
</Layout>
```

### スキップリンク
```tsx
<a 
  href="#main-content"
  style={{
    position: 'absolute',
    left: '-9999px',
    zIndex: 10000,
  }}
  onFocus={(e) => {
    e.currentTarget.style.left = '0';
  }}
  onBlur={(e) => {
    e.currentTarget.style.left = '-9999px';
  }}
>
  メインコンテンツへスキップ
</a>
```

### フォーカス管理
- ページ遷移時、フォーカスをメインコンテンツの先頭に移動
- モーダル表示時、フォーカスをモーダル内に閉じ込める
- モーダルを閉じたら、元の位置にフォーカスを戻す

---

## 実装ガイドライン

### DO（推奨）
✅ 固定ヘッダーを使用する（スクロールしても常に表示）
✅ ヘッダーの高さは一定に保つ（64px + 48px = 112px）
✅ メインコンテンツの margin-top をヘッダーの高さに合わせる
✅ レスポンシブデザインを考慮する
✅ z-index を適切に管理する
✅ アクセシビリティを考慮する（スキップリンク、フォーカス管理）
✅ 統一された余白を使用する（token.padding*, token.margin*）

### DON'T（非推奨）
❌ ヘッダーの高さを可変にしない（レイアウト崩れの原因）
❌ z-index を無秩序に設定しない
❌ 固定ヘッダーを使わずにスクロールで消す
❌ メインコンテンツの margin-top を忘れる
❌ レスポンシブ対応を省略しない
❌ 過度に深いネストを作らない（最大3階層程度）
❌ インラインスタイルを乱用しない（必要最小限に）

---

## パフォーマンス最適化

### 固定ヘッダーの最適化
```tsx
// will-change を使用してブラウザに最適化のヒントを与える
<Header style={{ willChange: 'transform' }} />
```

### スクロールパフォーマンス
```tsx
// パッシブリスナーを使用
useEffect(() => {
  const handleScroll = () => {
    // スクロール処理
  };
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, []);
```

---

## まとめ

### パターン選択フローチャート
```
画面の種類は？
├─ 通常の業務画面 → パターン1（2段ヘッダー + メインコンテンツ）
├─ ログイン・エラー画面 → パターン2（1段ヘッダー + メインコンテンツ）
└─ モーダル内・メンテナンス画面 → パターン3（ヘッダーなし）
```

### 実装チェックリスト
- [ ] 適切なパターンを選択
- [ ] Header・SubHeaderの高さを正しく設定
- [ ] メインコンテンツの margin-top を設定
- [ ] レスポンシブデザインを実装
- [ ] z-index を適切に管理
- [ ] アクセシビリティを考慮
- [ ] 統一された余白を使用
- [ ] パフォーマンスを最適化
