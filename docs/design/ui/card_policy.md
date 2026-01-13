# カード形状ポリシー

## 標準5パターン

### パターン1: 標準カード（Default）
**用途**: 一般的なコンテンツコンテナ、情報表示エリア

```tsx
<Card>
  {/* コンテンツ */}
</Card>
```

- サイズ: `default`
- ボーダーラジアス: `token.borderRadiusLG` (12px)
- ボーダー: 1px solid `token.colorBorderSecondary`
- 背景色: `token.colorBgContainer` (#ffffff)
- シャドウ: `token.boxShadow`
- パディング: 
  - ヘッダー: `24px`
  - ボディ: `24px`
- 幅: 親要素に合わせる（100%）

**使用例**:
- フォームエリア
- データ表示エリア
- コンテンツセクション
- テーブルのラッパー

---

### パターン2: 小型カード（Small）
**用途**: コンパクトな情報表示、リスト項目

```tsx
<Card size="small">
  {/* コンテンツ */}
</Card>
```

- サイズ: `small`
- ボーダーラジアス: `token.borderRadiusLG` (12px)
- ボーダー: 1px solid `token.colorBorderSecondary`
- 背景色: `token.colorBgContainer` (#ffffff)
- シャドウ: `token.boxShadow`
- パディング:
  - ヘッダー: `12px`
  - ボディ: `12px`
- 幅: 親要素に合わせる（100%）

**使用例**:
- 検索フィルターエリア
- コンパクトな情報カード
- サイドバーウィジェット
- 補助情報表示

---

### パターン3: ホバーカード（Hoverable）
**用途**: クリック可能なメニューカード、アクション可能なアイテム

```tsx
<Card 
  hoverable 
  onClick={handleClick}
  style={{
    borderRadius: token.borderRadiusLG,
    cursor: 'pointer',
    transition: `all ${token.motionDurationMid} ease-out`,
  }}
>
  {/* コンテンツ */}
</Card>
```

- サイズ: `default`
- ボーダーラジアス: `token.borderRadiusLG` (12px)
- ボーダー: 1px solid `token.colorBorderSecondary`
- 背景色: `token.colorBgContainer` (#ffffff)
- シャドウ: `token.boxShadow`
- パディング: `24px`
- カーソル: `pointer`
- トランジション: `all 0.2s ease-out`

**ホバー時**:
- シャドウ: `token.boxShadowSecondary`
- 変形: `translateY(-4px)`（上に持ち上がる）

**使用例**:
- メニューカード（MenuCard）
- プロジェクト選択カード
- アクションカード
- ナビゲーション用カード

---

### パターン4: 統計カード（Statistics）
**用途**: 数値・統計情報の表示

```tsx
<Card 
  style={{ 
    textAlign: 'center', 
    backgroundColor: '#e6f7ff' // または他の淡い色
  }}
>
  <Title level={2} style={{ margin: 0 }}>42</Title>
  <Text>アクティブユーザー</Text>
</Card>
```

- サイズ: `default`
- ボーダーラジアス: `token.borderRadiusLG` (12px)
- ボーダー: なし（`bordered={false}`推奨）
- 背景色: 淡いカラー背景
  - 情報系: `#e6f7ff`（水色）
  - 成功系: `#f6ffed`（緑）
  - 警告系: `#fff7e6`（オレンジ）
- シャドウ: なし or `token.boxShadow`
- パディング: `24px`
- テキスト配置: `center`

**使用例**:
- ダッシュボードの統計カード
- KPI表示
- 数値サマリー
- メトリクス表示

---

### パターン5: インナーカード（Inner）
**用途**: カード内のネストされたセクション、副次的なコンテンツ

```tsx
<Card>
  <Card type="inner" title="サブセクション">
    {/* コンテンツ */}
  </Card>
</Card>
```

- タイプ: `inner`
- ボーダーラジアス: `token.borderRadius` (8px)
- ボーダー: なし
- 背景色: `token.colorFillAlter` (#fafafa)
- シャドウ: なし
- パディング: `16px`
- 幅: 親要素に合わせる（100%）

**使用例**:
- 親カード内のサブセクション
- グルーピングされたコンテンツ
- 関連情報の区切り
- ドキュメント内のセクション

---

## 共通仕様（全パターン）

### 色定義

**通常**
- ボーダー色: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- 背景色: `token.colorBgContainer` (#ffffff)
- タイトル色: `token.colorText` (#212121)
- テキスト色: `token.colorTextSecondary` (#757575)

**ホバー（hoverable時）**
- ボーダー色: `token.colorBorder` (rgba(0,0,0,0.12))
- 背景色: `token.colorBgContainer` (#ffffff)
- シャドウ: `token.boxShadowSecondary`
- 変形: `translateY(-4px)`

**無効（disabled）**
- ボーダー色: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- 背景色: `token.colorBgContainerDisabled` (#f5f5f5)
- カーソル: `not-allowed`
- 透明度: `0.6`

**bordered={false}**
- ボーダー: なし
- シャドウのみで視覚的な区切りを表現

### サイズ仕様

| サイズ | ヘッダーパディング | ボディパディング | 用途 |
|--------|-------------------|-----------------|------|
| `default` | 24px | 24px | 標準的な情報表示 |
| `small` | 12px | 12px | コンパクトな表示 |

### ボーダーラジアス

| 用途 | ボーダーラジアス |
|------|----------------|
| 標準カード | `token.borderRadiusLG` (12px) |
| インナーカード | `token.borderRadius` (8px) |

### シャドウ

| 状態 | シャドウ |
|------|---------|
| 通常 | `token.boxShadow` |
| ホバー | `token.boxShadowSecondary` |
| なし | `boxShadow: 'none'` |

### トランジション

```tsx
transition: `all ${token.motionDurationMid} ease-out`
```

- duration: `0.2s` (200ms)
- easing: `ease-out`

---

## パターン選択ガイドライン

| 用途 | 推奨パターン | 理由 |
|------|-------------|------|
| フォーム入力エリア | パターン1（標準カード） | 十分なスペースとパディング |
| データ一覧表示 | パターン1（標準カード、bordered={false}） | シンプルでクリーン |
| 検索フィルター | パターン2（小型カード） | コンパクトに収まる |
| メニュー項目 | パターン3（ホバーカード） | クリック可能な視覚的フィードバック |
| 統計・KPI表示 | パターン4（統計カード） | 数値を目立たせる |
| ネストされたコンテンツ | パターン5（インナーカード） | 階層構造を表現 |

---

## 実装例

### パターン1: 標準カード

```tsx
import { Card, Space, Typography } from 'antd';

const { Title, Text } = Typography;

<Card title="プロジェクト情報">
  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    <div>
      <Text strong>プロジェクト名：</Text>
      <Text>材料実験プロジェクトA</Text>
    </div>
    <div>
      <Text strong>責任者：</Text>
      <Text>山田太郎</Text>
    </div>
  </Space>
</Card>
```

### パターン2: 小型カード

```tsx
<Card 
  size="small" 
  title="検索条件"
  style={{ marginBottom: 16 }}
>
  <Space direction="vertical" size="small" style={{ width: '100%' }}>
    <Input placeholder="プロジェクト名" />
    <Select placeholder="ステータス" style={{ width: '100%' }} />
  </Space>
</Card>
```

### パターン3: ホバーカード

```tsx
import { theme } from 'antd';

const { token } = theme.useToken();

<Card
  hoverable
  onClick={() => navigate('/project/123')}
  style={{
    borderRadius: token.borderRadiusLG,
    cursor: 'pointer',
    transition: `all ${token.motionDurationMid} ease-out`,
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.boxShadow = token.boxShadowSecondary;
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = token.boxShadow;
  }}
>
  <Space direction="vertical" size="middle">
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 56,
      height: 56,
      borderRadius: token.borderRadius,
      backgroundColor: token.colorPrimary,
      color: 'white',
    }}>
      <ProjectOutlined style={{ fontSize: 30 }} />
    </div>
    <Title level={4} style={{ margin: 0 }}>プロジェクト管理</Title>
    <Text type="secondary">プロジェクトの作成と管理</Text>
  </Space>
</Card>
```

### パターン4: 統計カード

```tsx
<Row gutter={16}>
  <Col span={8}>
    <Card style={{ textAlign: 'center', backgroundColor: '#e6f7ff' }}>
      <Title level={2} style={{ margin: 0, color: token.colorPrimary }}>42</Title>
      <Text>アクティブプロジェクト</Text>
    </Card>
  </Col>
  <Col span={8}>
    <Card style={{ textAlign: 'center', backgroundColor: '#f6ffed' }}>
      <Title level={2} style={{ margin: 0, color: token.colorSuccess }}>15</Title>
      <Text>完了済み</Text>
    </Card>
  </Col>
  <Col span={8}>
    <Card style={{ textAlign: 'center', backgroundColor: '#fff7e6' }}>
      <Title level={2} style={{ margin: 0, color: token.colorWarning }}>27</Title>
      <Text>進行中</Text>
    </Card>
  </Col>
</Row>
```

### パターン5: インナーカード

```tsx
<Card title="ドキュメント">
  <Paragraph>
    このドキュメントには複数のセクションが含まれています。
  </Paragraph>
  
  <Card type="inner" title="セクション1" style={{ marginBottom: 16 }}>
    <Paragraph>セクション1の内容...</Paragraph>
  </Card>
  
  <Card type="inner" title="セクション2">
    <Paragraph>セクション2の内容...</Paragraph>
  </Card>
</Card>
```

---

## 除外されたパターンと標準パターンの対応

### bordered={false}カード
- **対応する標準パターン**: パターン1（標準カード）の変種
- **除外理由**: プロパティの変更で対応可能
- **用途**: ボーダーレスでシンプルな表示
- **差異**: ボーダーなし、シャドウで視覚的な区切り

### loading状態のカード
- **対応する標準パターン**: すべてのパターンで使用可能
- **除外理由**: 状態プロパティのため
- **用途**: データ読み込み中の表示
- **実装**: `<Card loading={true}>`

### カスタム背景色カード
- **対応する標準パターン**: パターン1またはパターン4の変種
- **除外理由**: スタイル指定で対応可能
- **用途**: 視覚的な強調、警告表示
- **実装**: `<Card style={{ backgroundColor: token.colorWarningBg }}>`

---

## スタイルカスタマイズ

### styles prop（Ant Design 5.x以降）

```tsx
<Card
  styles={{
    header: {
      backgroundColor: token.colorPrimaryBg,
      borderBottom: `2px solid ${token.colorPrimary}`,
    },
    body: {
      padding: token.paddingLG,
      backgroundColor: token.colorBgLayout,
    },
  }}
>
  {/* コンテンツ */}
</Card>
```

### actions（カードアクション）

```tsx
<Card
  actions={[
    <EditOutlined key="edit" />,
    <DeleteOutlined key="delete" />,
    <EllipsisOutlined key="ellipsis" />,
  ]}
>
  {/* コンテンツ */}
</Card>
```

### extra（ヘッダー右側コンテンツ）

```tsx
<Card
  title="プロジェクト情報"
  extra={<Button type="link">詳細</Button>}
>
  {/* コンテンツ */}
</Card>
```

### cover（カバー画像）

```tsx
<Card
  cover={
    <img
      alt="example"
      src="/images/project-cover.jpg"
      style={{ height: 200, objectFit: 'cover' }}
    />
  }
>
  {/* コンテンツ */}
</Card>
```

---

## レスポンシブデザイン

### モバイル（xs, sm）

```tsx
<Row gutter={[16, 16]}>
  <Col xs={24} sm={24} md={12} lg={8}>
    <Card>
      {/* コンテンツ */}
    </Card>
  </Col>
</Row>
```

- 1カラムレイアウト（xs: 24, sm: 24）
- カード間のマージン: 16px
- フルスクリーン幅

### タブレット（md）

- 2カラムレイアウト（md: 12）
- カード間のマージン: 16px

### デスクトップ（lg, xl, xxl）

- 3-4カラムレイアウト（lg: 8, xl: 6）
- カード間のマージン: 16px

---

## アクセシビリティ

### キーボード操作

```tsx
<Card
  hoverable
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  tabIndex={0}
  role="button"
  aria-label="プロジェクトカードを開く"
>
  {/* コンテンツ */}
</Card>
```

### ARIA属性

- `role="button"`: クリック可能なカードの場合
- `aria-label`: カードの説明
- `tabIndex={0}`: キーボードフォーカス可能にする

---

## ベストプラクティス

### DO（推奨）

✅ **パディングは token を使用する**
```tsx
<Card styles={{ body: { padding: token.paddingLG } }}>
```

✅ **ボーダーラジアスは token を使用する**
```tsx
<Card style={{ borderRadius: token.borderRadiusLG }}>
```

✅ **ホバー可能なカードにはトランジションを追加する**
```tsx
<Card 
  hoverable 
  style={{ transition: `all ${token.motionDurationMid} ease-out` }}
>
```

✅ **統計カードには中央揃えを使用する**
```tsx
<Card style={{ textAlign: 'center' }}>
```

✅ **ネストされたコンテンツには type="inner" を使用する**
```tsx
<Card>
  <Card type="inner" title="サブセクション">
  </Card>
</Card>
```

✅ **bordered={false} でシンプルな見た目にする**
```tsx
<Card bordered={false}>
```

✅ **Space コンポーネントでカード内のレイアウトを整える**
```tsx
<Card>
  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    {/* コンテンツ */}
  </Space>
</Card>
```

### DON'T（非推奨）

❌ **固定幅を避ける（レスポンシブデザインを妨げる）**
```tsx
// 悪い例
<Card style={{ width: 400 }}>
```

❌ **過度なシャドウを使用しない**
```tsx
// 悪い例
<Card style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
```

❌ **カスタムボーダーラジアスを避ける（token を使用）**
```tsx
// 悪い例
<Card style={{ borderRadius: '20px' }}>
```

❌ **インラインスタイルで複雑なレイアウトを組まない**
```tsx
// 悪い例
<Card style={{ 
  display: 'flex', 
  flexDirection: 'column', 
  justifyContent: 'space-between',
  height: '100%',
  padding: '32px'
}}>
```

❌ **hoverable なカードに onClick を忘れない**
```tsx
// 悪い例
<Card hoverable>
  {/* onClick がない */}
</Card>
```

❌ **カード内に直接大量のテキストを配置しない（Spaceを使用）**
```tsx
// 悪い例
<Card>
  <div>テキスト1</div>
  <div>テキスト2</div>
  <div>テキスト3</div>
</Card>

// 良い例
<Card>
  <Space direction="vertical" size="middle">
    <Text>テキスト1</Text>
    <Text>テキスト2</Text>
    <Text>テキスト3</Text>
  </Space>
</Card>
```

---

## パフォーマンス最適化

### 大量のカードを表示する場合

```tsx
import { List, Card } from 'antd';

<List
  grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 6 }}
  dataSource={data}
  renderItem={(item) => (
    <List.Item>
      <Card title={item.title}>
        {item.content}
      </Card>
    </List.Item>
  )}
  pagination={{
    pageSize: 12,
    showSizeChanger: true,
    showTotal: (total) => `全 ${total} 件`,
  }}
/>
```

### 遅延ロードカード

```tsx
import { Skeleton, Card } from 'antd';

<Card loading={isLoading}>
  {/* コンテンツ */}
</Card>

// または
<Card>
  {isLoading ? (
    <Skeleton active />
  ) : (
    <div>{content}</div>
  )}
</Card>
```

---

## よくあるユースケース

### ダッシュボードカード

```tsx
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={8}>
    <Card>
      <Statistic
        title="アクティブユーザー"
        value={112893}
        prefix={<UserOutlined />}
        valueStyle={{ color: token.colorPrimary }}
      />
    </Card>
  </Col>
</Row>
```

### リスト項目カード

```tsx
<Space direction="vertical" size="middle" style={{ width: '100%' }}>
  {items.map((item) => (
    <Card key={item.id} size="small">
      <Space>
        <Avatar icon={<UserOutlined />} />
        <div>
          <Text strong>{item.name}</Text>
          <br />
          <Text type="secondary">{item.description}</Text>
        </div>
      </Space>
    </Card>
  ))}
</Space>
```

### フォームカード

```tsx
<Card title="ユーザー登録">
  <Form layout="vertical">
    <Form.Item label="ユーザー名" name="username">
      <Input />
    </Form.Item>
    <Form.Item label="メールアドレス" name="email">
      <Input type="email" />
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit">
        登録
      </Button>
    </Form.Item>
  </Form>
</Card>
```

---

## まとめ

このポリシーに従うことで：
- **一貫性**: すべての画面で統一されたカードデザイン
- **保守性**: 標準パターンの使用により保守が容易
- **拡張性**: tokenベースのスタイリングで容易にカスタマイズ可能
- **アクセシビリティ**: キーボード操作とARIA属性のサポート
- **レスポンシブ**: モバイルからデスクトップまで最適化

標準5パターンを基本として、必要に応じてカスタマイズを加えることで、柔軟かつ統一感のあるUI/UXを実現できます。
