# MaiML Viewer UIデザインポリシー

## メタデータ
- **作成日時**: 2025-12-23
- **対象システム**: mmdpf (マルチモーダルデータプラットフォーム)
- **UIライブラリ**: Ant Design v6
- **目的**: 機能・意味合いのセグメントごとに統一したデザインルールを定義

---

## 1. 概要

MaiML Viewerは、Ant Design v6を使用したマルチテナント対応のWebアプリケーションです。5つの異なるロールメニュー（プロバイダー、システム管理者、データ管理者、実験管理者、実験作業者）が存在し、それぞれが複数のタブと機能を持ちます。

---

## 2. カラーパレット

MaiML Viewerは、白を基調とした明るく清潔感のあるインターフェースに、赤系のアクセントカラーを組み合わせ、科学的な信頼性と使いやすさを両立します。

### カラーパレットの役割

- **プライマリカラー（赤系）**: ブランドアイデンティティを表現し、ユーザーの注目を重要なアクションに導く役割を果たします。科学研究における「正確さ」と「情熱」を象徴します。

- **セカンダリカラー（青・緑・オレンジ・赤）**: 情報の種類やステータスを直感的に識別できるよう設計されています。国際的なUIデザイン標準に準拠し、色覚多様性にも配慮しています。

- **背景カラー（白・グレー系）**: データの可読性を最優先し、長時間の作業でも目が疲れにくい配色を採用しています。清潔感のある白を基調とし、階層構造を表現するために微妙なグレーのグラデーションを使用します。

- **テキストカラー（黒・グレー系）**: 十分なコントラスト比を確保し、WCAG 2.1 AAレベルのアクセシビリティ基準を満たします。主要情報と補足情報を明確に区別できるよう、濃淡で階層を表現します。

- **ボーダーカラー（半透明黒）**: UIの構造を明確にしながらも、視覚的な主張を抑えることで、コンテンツに集中できる環境を提供します。

---

### 2.1 プライマリカラー

| カラー名 | カラーコード | 用途 |
|---------|-------------|------|
| **Primary** | `#CF0027` | ブランドカラー、アクションボタン、リンク、選択状態 |
| **Primary Hover** | `#E63946` | ホバー時の色 |
| **Primary Light** | `#FFF1F3` | 選択背景、アクティブ背景 |

**使用例:**
- ボタン: `<Button type="primary">保存</Button>`
- リンク: `<Typography.Link>詳細を見る</Typography.Link>`
- アイコン: `valueStyle={{ color: token.colorPrimary }}`

### 2.2 セカンダリカラー

| カラー名 | カラーコード | 用途 |
|---------|-------------|------|
| **Info** | `#0093CF` | 情報表示、補助的なアクション |
| **Success** | `#2e7d32` | 成功メッセージ、完了状態 |
| **Warning** | `#ed6c02` | 警告メッセージ、注意喚起 |
| **Error** | `#d32f2f` | エラーメッセージ、削除操作 |

**使用例:**
- 情報メッセージ: `<Alert type="info" message="情報" />`
- 成功バッジ: `<Badge status="success" text="完了" />`
- 警告タグ: `<Tag color="warning">注意</Tag>`
- 削除ボタン: `<Button danger>削除</Button>`

### 2.3 背景カラー

| カラー名 | カラーコード | 用途 |
|---------|-------------|------|
| **Base** | `#ffffff` | 基本背景（白） |
| **Layout** | `#fafafa` | レイアウト背景（グレー極薄） |
| **Container** | `#ffffff` | コンテナ背景（カード、モーダル等） |
| **Elevated** | `#ffffff` | 浮き上がった要素の背景 |
| **Spotlight** | `#f5f5f5` | ホバー時、強調エリア |

**使用例:**
- レイアウト: `style={{ background: token.colorBgLayout }}`
- カード: `<Card style={{ background: token.colorBgContainer }}>`
- ホバー行: `rowHoverBg: token.colorBgSpotlight`

### 2.4 テキストカラー

| カラー名 | カラーコード | 用途 |
|---------|-------------|------|
| **Text** | `#212121` | メインテキスト（黒） |
| **Text Secondary** | `#757575` | 補足テキスト（グレー） |
| **Text Tertiary** | `#9e9e9e` | 三次テキスト（グレー薄） |
| **Text Disabled** | `#bdbdbd` | 無効状態テキスト |

**使用例:**
- メインテキスト: `<Typography.Text>テキスト</Typography.Text>`
- 補足テキスト: `<Typography.Text type="secondary">補足</Typography.Text>`
- 無効テキスト: `<Input disabled />`

### 2.5 ボーダーカラー

| カラー名 | カラーコード | 用途 |
|---------|-------------|------|
| **Border** | `rgba(0, 0, 0, 0.12)` | 標準ボーダー |
| **Border Secondary** | `rgba(0, 0, 0, 0.06)` | セカンダリボーダー（薄い） |
| **Split** | `rgba(0, 0, 0, 0.06)` | 分割線 |

**使用例:**
- カードボーダー: `<Card bordered>`
- 分割線: `<Divider />`
- テーブルボーダー: デフォルトで適用

---

## 3. 使用コンポーネント一覧

### 3.1 レイアウトコンポーネント

| コンポーネント | 用途 | 推奨する使用例 |
|--------------|------|---------------|
| **Layout** | ページ全体のレイアウト | `<Layout><Header /><Content /></Layout>` |
| **Layout.Header** | ヘッダー領域 | ユーザー情報、ログアウトボタン |
| **Layout.Content** | メインコンテンツ領域 | タブコンテンツ、テーブル、フォーム |
| **Layout.Sider** | サイドバー | ナビゲーション（現在は未使用） |
| **Row** | グリッドレイアウト（行） | `<Row gutter={16}>` |
| **Col** | グリッドレイアウト（列） | `<Col xs={24} md={12}>` |
| **Space** | 要素間のスペーシング | `<Space size="middle">` |
| **Flex** | フレックスボックスレイアウト | `<Flex gap="middle" vertical>` |
| **Divider** | 分割線 | セクション区切り |

**推奨パターン:**
```typescript
<Layout style={{ background: token.colorBgLayout }}>
  <Header user={user} onLogout={onLogout} />
  <Content>
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Card>コンテンツ</Card>
      </Col>
    </Row>
  </Content>
</Layout>
```

### 3.2 ナビゲーションコンポーネント

| コンポーネント | 用途 | 推奨する使用例 |
|--------------|------|---------------|
| **Tabs** | タブナビゲーション | `<Tabs items={tabItems} onChange={handleChange} />` |
| **Menu** | メニューナビゲーション | SubHeader内（現在は未使用） |
| **Breadcrumb** | パンくずリスト | ファイル管理画面のパス表示 |
| **Pagination** | ページネーション | Tableコンポーネント内で自動表示 |

**推奨パターン:**
```typescript
<Breadcrumb>
  <Breadcrumb.Item><HomeOutlined /></Breadcrumb.Item>
  <Breadcrumb.Item>プロジェクト</Breadcrumb.Item>
</Breadcrumb>
```

### 3.3 データ表示コンポーネント

| コンポーネント | 用途 | 推奨する使用例 |
|--------------|------|---------------|
| **Table** | データ一覧表示 | `<Table columns={columns} dataSource={data} />` |
| **Card** | カードコンテナ | `<Card title="タイトル">コンテンツ</Card>` |
| **Descriptions** | 詳細情報表示 | `<Descriptions bordered column={1}>` |
| **List** | リスト表示 | 簡易的な一覧表示 |
| **Tree** | ツリー構造表示 | フォルダ階層表示 |
| **Statistic** | 統計数値表示 | `<Statistic title="ユーザー数" value={123} />` |
| **Badge** | バッジ表示 | `<Badge status="success" text="有効" />` |
| **Tag** | タグ表示 | `<Tag color="blue">カテゴリー</Tag>` |
| **Avatar** | アバター表示 | ユーザーアイコン |
| **Tooltip** | ツールチップ | `<Tooltip title="説明">要素</Tooltip>` |
| **Popover** | ポップオーバー | 追加情報表示 |

**推奨パターン:**
```typescript
<Card>
  <Statistic
    title="組織数"
    value={123}
    prefix={<TeamOutlined />}
    valueStyle={{ color: token.colorPrimary }}
  />
</Card>
```

### 3.4 入力コンポーネント

| コンポーネント | 用途 | 推奨する使用例 |
|--------------|------|---------------|
| **Form** | フォームコンテナ | `<Form layout="vertical" size="large">` |
| **Form.Item** | フォーム項目 | `<Form.Item label="名前" name="name">` |
| **Input** | テキスト入力 | `<Input placeholder="入力" allowClear />` |
| **Input.TextArea** | 複数行テキスト入力 | `<Input.TextArea rows={4} />` |
| **Input.Password** | パスワード入力 | `<Input.Password />` |
| **Input.Search** | 検索入力 | `<Input.Search placeholder="検索" />` |
| **Select** | ドロップダウン選択 | `<Select placeholder="選択" allowClear />` |
| **DatePicker** | 日付選択 | `<DatePicker format="YYYY-MM-DD" />` |
| **TimePicker** | 時刻選択 | `<TimePicker format="HH:mm" />` |
| **Checkbox** | チェックボックス | `<Checkbox>選択</Checkbox>` |
| **Radio** | ラジオボタン | `<Radio>オプション</Radio>` |
| **Switch** | スイッチ | `<Switch checkedChildren="ON" />` |
| **Slider** | スライダー | 進捗入力 |
| **Upload** | ファイルアップロード | `<Upload.Dragger>` |

**推奨パターン:**
```typescript
<Form layout="vertical" size="large">
  <Form.Item label="ユーザー名" name="username" rules={[{ required: true }]}>
    <Input allowClear />
  </Form.Item>
</Form>
```

### 3.5 フィードバックコンポーネント

| コンポーネント | 用途 | 推奨する使用例 |
|--------------|------|---------------|
| **Modal** | モーダルダイアログ | `<Modal title="タイトル" open={isOpen}>` |
| **Modal.confirm** | 確認ダイアログ | `Modal.confirm({ title: '削除確認' })` |
| **Drawer** | ドロワー | `<Drawer title="詳細" width={720}>` |
| **Alert** | アラート表示 | `<Alert type="info" message="情報" />` |
| **Message** | トーストメッセージ | `message.success('成功しました')` |
| **Notification** | 通知 | `notification.open({ message: '通知' })` |
| **Progress** | 進捗バー | `<Progress percent={75} />` |
| **Spin** | ローディング | `<Spin spinning={loading}>` |
| **Skeleton** | スケルトンローディング | `<Skeleton active />` |
| **Result** | 結果ページ | `<Result status="success" title="成功" />` |

**推奨パターン:**
```typescript
// モーダル
<Modal
  title="追加"
  open={isOpen}
  onOk={handleOk}
  onCancel={handleCancel}
  width={600}
>
  <Form>...</Form>
</Modal>

// 確認ダイアログ
Modal.confirm({
  title: '削除確認',
  content: '本当に削除しますか？',
  okText: '削除',
  okType: 'danger',
  onOk: handleDelete,
});
```

### 3.6 アクションコンポーネント

| コンポーネント | 用途 | 推奨する使用例 |
|--------------|------|---------------|
| **Button** | ボタン | `<Button type="primary">保存</Button>` |
| **Button (Dropdown)** | ドロップダウンボタン | `<Dropdown.Button menu={menu}>` |
| **Dropdown** | ドロップダウンメニュー | `<Dropdown menu={menu}>` |

**推奨パターン:**
```typescript
// プライマリボタン
<Button type="primary" icon={<SaveOutlined />}>
  保存
</Button>

// 危険なアクション
<Button type="primary" danger icon={<DeleteOutlined />}>
  削除
</Button>

// ボタングループ
<Space>
  <Button type="primary">OK</Button>
  <Button>キャンセル</Button>
</Space>
```

### 3.7 その他のコンポーネント

| コンポーネント | 用途 | 推奨する使用例 |
|--------------|------|---------------|
| **Typography** | テキスト表示 | `<Typography.Title level={1}>` |
| **Typography.Title** | タイトル | 見出し（h1-h5） |
| **Typography.Text** | テキスト | `<Typography.Text type="secondary">` |
| **Typography.Link** | リンク | `<Typography.Link href="#">リンク</Typography.Link>` |
| **Collapse** | 折りたたみパネル | `<Collapse items={items} />` |
| **Empty** | 空状態表示 | `<Empty description="データなし" />` |
| **Image** | 画像表示 | `<Image src="..." />` |

**推奨パターン:**
```typescript
<Typography.Title level={2}>セクションタイトル</Typography.Title>
<Typography.Text type="secondary">補足説明</Typography.Text>
```

---

## 4. 基本方針

#### デザイントークンの徹底使用
- ✅ **Ant Designのデザイントークンを最優先で使用**
- ❌ **インラインスタイル（`style` prop）でのハードコーディングを禁止**
- ✅ **theme.tsでトークンをカスタマイズ**
- ✅ **コンポーネントのpropsでスタイルを制御**

#### 一貫性の確保
- 同じ機能・意味合いのUI要素は、全メニューで統一されたスタイルを適用
- セグメント（機能グループ）単位でデザインルールを定義
- レスポンシブ対応を標準化

---

## 2. UIセグメント定義

### 2.1 レイアウト・構造セグメント

全メニューで共通するレイアウト構造を定義します。

#### 2.1.1 メニューレイアウト構造

**基本構造:**
```typescript
<Layout className="menu-layout" style={{ background: token.colorBgLayout }}>
  <Header user={user} onLogout={onLogout} />
  <SubHeader menuType={menuType} tabs={tabItems} />
  <Content className="menu-content">
    {/* コンテンツ */}
  </Content>
</Layout>
```

**レイアウト定数:**
| 要素 | 高さ | 備考 |
|------|------|------|
| Header | 64px | 全メニュー共通 |
| SubHeader（タブあり） | 76px | ProviderMenu, SystemAdminMenu, DataAdminMenu, ExperimentAdminMenu |
| SubHeader（タブなし） | 48px | ExperimentWorkerMenu |
| 選択エリア | 56px | ExperimentWorkerMenuのみ |
| 合計高さ（タブあり） | 140px | Header + SubHeader（タブあり） |
| 合計高さ（タブなし） | 112px | Header + SubHeader（タブなし） |

**Content領域のpadding:**
| パターン | padding設定 | 使用メニュー |
|---------|------------|-------------|
| パターンA: なし | `0` | ProviderMenu, ExperimentWorkerMenu, ExperimentAdminMenu（全幅タブ） |
| パターンB: 左右のみ | `token.paddingContentHorizontal` | SystemAdminMenu, DataAdminMenu |
| パターンC: 全方向 | `token.paddingLG` | ExperimentAdminMenu（通常タブ） |

**Content高さ計算:**
```scss
// タブあり
height: calc(100vh - 140px);

// タブなし
height: calc(100vh - 112px);
```

#### 2.1.2 レスポンシブブレークポイント

Ant Design準拠のブレークポイント:

| ブレークポイント | 幅 | デバイス |
|----------------|-------|---------|
| xs | 480px | モバイル |
| sm | 576px | タブレット（縦） |
| md | 768px | タブレット（横） |
| lg | 992px | 小型ラップトップ |
| xl | 1200px | デスクトップ |
| xxl | 1600px | 大型ディスプレイ |

**レスポンシブコンテナ最大幅:**
```typescript
// ExperimentWorkerMenu専用
const responsiveContainerMaxWidth = {
  xs: '100%',
  sm: '100%',
  md: '768px',
  lg: '992px',
  xl: '1200px',
  xxl: '1400px'
};
```

---

### 2.2 データ一覧・テーブルセグメント

データ一覧画面（CRUD画面、統計情報等）で使用するテーブルのデザインルール。

#### 2.2.1 テーブル基本スタイル

**使用コンポーネント:** `<Table />`

**標準設定:**
```typescript
<Table
  columns={columns}
  dataSource={data}
  rowKey="id"
  scroll={{ x: 1200 }}  // 横スクロール最小幅
  pagination={{
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (total) => `全 ${total} 件`,
    pageSizeOptions: ['10', '20', '50', '100'],
  }}
  locale={{
    emptyText: 'データがありません',
  }}
/>
```

**列の配置（align）ルール:**
| データ種別 | align設定 | 理由 |
|-----------|----------|------|
| テキスト | `left`（デフォルト） | 標準的な読みやすさ |
| 数値 | `right` | 桁揃え |
| 日付・時刻 | `right` | 桁揃え |
| Boolean/ステータス | `center` | バッジ表示の見栄え |
| アクションボタン | `center` | 操作性 |

**列幅の推奨値:**
```typescript
const columnWidths = {
  id: 80,              // ID列
  shortText: 120,      // 短いテキスト（ステータス等）
  normalText: 200,     // 通常のテキスト（名前等）
  longText: 300,       // 長いテキスト（説明等）
  date: 140,           // 日付
  actions: 150,        // アクションボタン列
};
```

#### 2.2.2 テーブル行のスタイル

**ストライプ行:**
```typescript
rowClassName={(record, index) => 
  index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
}
```

**ホバー効果:**
- Ant Designのデフォルトホバー効果を使用
- 背景色: `token.colorBgTextHover`

#### 2.2.3 テーブル内のアクションボタン

**行内アクションボタン:**
```typescript
<Space size="small">
  <Button 
    icon={<EditOutlined />} 
    size="small"
    onClick={() => handleEdit(record)}
  >
    編集
  </Button>
  <Button 
    danger 
    size="small"
    onClick={() => handleDelete(record.id)}
  >
    削除
  </Button>
</Space>
```

**配置:** 右寄せ、`Space`で8px間隔

---

### 2.3 フォーム・入力セグメント

データ入力、編集に使用するフォームのデザインルール。

#### 2.3.1 フォーム基本構造

**モーダル内フォーム:**
```typescript
<Modal
  title="追加/編集"
  open={isModalOpen}
  onOk={handleSubmit}
  onCancel={handleCancel}
  width={600}  // 標準幅
>
  <Form
    form={form}
    layout="vertical"  // 標準レイアウト
    size="large"       // 標準サイズ
  >
    <Form.Item
      name="name"
      label="名前"
      rules={[{ required: true, message: '名前を入力してください' }]}
    >
      <Input />
    </Form.Item>
    {/* ... */}
  </Form>
</Modal>
```

**フォームレイアウト:**
- モーダル内: `layout="vertical"`
- インラインフィルター: `layout="inline"`
- 複雑なフォーム: `layout="horizontal"` + Grid

**フォームサイズ:**
```typescript
// 標準サイズ
<Form size="large">

// 小さいサイズ（フィルター等）
<Form size="middle">
```

#### 2.3.2 入力コンポーネント

**Input（テキスト入力）:**
```typescript
<Input 
  placeholder="入力してください"
  allowClear
  maxLength={100}
/>
```

**TextArea（複数行入力）:**
```typescript
<Input.TextArea 
  placeholder="詳細を入力してください"
  rows={4}
  maxLength={500}
  showCount
/>
```

**Select（選択）:**
```typescript
<Select
  placeholder="選択してください"
  allowClear
  showSearch
  optionFilterProp="label"
  options={options}
  style={{ width: '100%' }}
/>
```

**DatePicker（日付選択）:**
```typescript
<DatePicker 
  placeholder="日付を選択"
  style={{ width: '100%' }}
  format="YYYY-MM-DD"
/>
```

#### 2.3.3 入力フィールド幅

| 用途 | 幅 | 備考 |
|------|------|------|
| 全文検索 | 400px | フィルターエリア |
| カテゴリー選択 | 150px | フィルターエリア |
| ステータス選択 | 150px | フィルターエリア |
| フォーム内（Modal） | 100% | 親要素幅に合わせる |

---

### 2.4 アクション・ボタンセグメント

ユーザーアクションを実行するボタンのデザインルール。

#### 2.4.1 ボタンタイプ

**プライマリアクション:**
```typescript
<Button type="primary" icon={<PlusOutlined />}>
  新規作成
</Button>
```

**セカンダリアクション:**
```typescript
<Button type="default" icon={<ReloadOutlined />}>
  リロード
</Button>
```

**危険なアクション:**
```typescript
<Button type="primary" danger icon={<DeleteOutlined />}>
  削除
</Button>
```

**テキストボタン:**
```typescript
<Button type="text" icon={<EditOutlined />}>
  編集
</Button>
```

**リンクボタン:**
```typescript
<Button type="link" icon={<DownloadOutlined />}>
  ダウンロード
</Button>
```

#### 2.4.2 ボタンサイズ

```typescript
// 大きいボタン（主要アクション）
<Button size="large">送信</Button>

// 標準ボタン（一般的な使用）
<Button size="middle">保存</Button>

// 小さいボタン（テーブル内、スペース制約）
<Button size="small">編集</Button>
```

#### 2.4.3 ボタングループ配置

**ページ上部（アクションボタン群）:**
```typescript
<Space size="middle" style={{ marginBottom: 16 }}>
  <Button type="primary" icon={<PlusOutlined />}>追加</Button>
  <Button icon={<UploadOutlined />}>CSVアップロード</Button>
  <Button icon={<DownloadOutlined />}>CSVダウンロード</Button>
  <Button icon={<ReloadOutlined />}>リロード</Button>
</Space>
```

**配置:** 左寄せ、`Space`で16px間隔

**モーダルフッター:**
```typescript
<Modal
  footer={[
    <Button key="cancel" onClick={handleCancel}>
      キャンセル
    </Button>,
    <Button key="submit" type="primary" onClick={handleSubmit}>
      確定
    </Button>,
  ]}
>
```

**配置:** 右寄せ、キャンセルボタンが左、確定ボタンが右

#### 2.4.4 アイコンボタン

**アイコンのみのボタン:**
```typescript
<Button 
  icon={<EditOutlined />} 
  shape="circle"
  title="編集"
/>
```

**アイコン付きボタン:**
```typescript
<Button icon={<SearchOutlined />}>
  検索
</Button>
```

---

### 2.5 フィルター・検索セグメント

データ一覧の絞り込み、検索機能のデザインルール。

#### 2.5.1 フィルターエリアレイアウト

**配置:** リスト上部に左寄せで配置

**基本構造:**
```typescript
<Row gutter={16} style={{ marginBottom: 16 }}>
  {/* 全体検索 */}
  <Col flex="400px">
    <Input
      placeholder="ID、名前、説明で検索"
      prefix={<SearchOutlined />}
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
      allowClear
    />
  </Col>
  
  {/* カテゴリーフィルター */}
  <Col flex="150px">
    <Select
      placeholder="カテゴリー"
      value={selectedCategory || undefined}
      onChange={setSelectedCategory}
      allowClear
      style={{ width: '100%' }}
      options={categoryOptions}
    />
  </Col>
  
  {/* ステータスフィルター */}
  <Col flex="150px">
    <Select
      placeholder="ステータス"
      value={selectedStatus || undefined}
      onChange={setSelectedStatus}
      allowClear
      style={{ width: '100%' }}
    />
  </Col>
</Row>
```

**レイアウト設定:**
- gutter（間隔）: 16px
- marginBottom: 16px
- Colのflex指定で幅制御

#### 2.5.2 検索入力

**全文検索:**
```typescript
<Input
  placeholder="検索"
  prefix={<SearchOutlined />}
  allowClear
  style={{ width: 400 }}
/>
```

**特徴:**
- プレフィックスアイコン: `<SearchOutlined />`
- クリアボタン: `allowClear={true}`
- 幅: 400px

---

### 2.6 モーダル・ダイアログセグメント

モーダルウィンドウ、ダイアログのデザインルール。

#### 2.6.1 モーダル基本設定

**標準モーダル:**
```typescript
<Modal
  title="タイトル"
  open={isOpen}
  onOk={handleOk}
  onCancel={handleCancel}
  width={600}  // 標準幅
  maskClosable={false}  // 背景クリックで閉じない
>
  {/* コンテンツ */}
</Modal>
```

**大型モーダル:**
```typescript
<Modal
  title="詳細情報"
  open={isOpen}
  onCancel={handleCancel}
  width={900}  // 大型幅
  footer={null}  // カスタムフッター
>
  {/* 複雑なコンテンツ */}
</Modal>
```

**全画面モーダル（Drawer）:**
```typescript
<Drawer
  title="プロジェクト詳細"
  placement="right"
  width={720}
  open={isOpen}
  onClose={handleClose}
>
  {/* コンテンツ */}
</Drawer>
```

#### 2.6.2 モーダル幅の標準

| 用途 | 幅 | 備考 |
|------|------|------|
| 簡易入力フォーム | 600px | 標準 |
| 複雑なフォーム | 800px | 大型 |
| 詳細表示 | 900px | 大型 |
| Drawer | 720px | 標準 |

#### 2.6.3 確認ダイアログ

**削除確認:**
```typescript
Modal.confirm({
  title: '削除確認',
  content: '選択した項目を削除してもよろしいですか？',
  okText: '削除',
  okType: 'danger',
  cancelText: 'キャンセル',
  onOk: handleDelete,
});
```

**成功メッセージ:**
```typescript
Modal.success({
  title: '成功',
  content: '保存しました',
});
```

**エラーメッセージ:**
```typescript
Modal.error({
  title: 'エラー',
  content: '保存に失敗しました',
});
```

---

### 2.7 統計・ダッシュボードセグメント

統計情報、ダッシュボード画面のデザインルール。

#### 2.7.1 統計カード

**基本構造:**
```typescript
<Row gutter={16}>
  <Col xs={24} sm={12} md={6}>
    <Card>
      <Statistic
        title="組織数"
        value={123}
        prefix={<TeamOutlined />}
        valueStyle={{ color: token.colorPrimary }}
      />
    </Card>
  </Col>
  <Col xs={24} sm={12} md={6}>
    <Card>
      <Statistic
        title="ユーザー数"
        value={456}
        prefix={<UserOutlined />}
      />
    </Card>
  </Col>
  {/* ... */}
</Row>
```

**レイアウト:**
- gutter: 16px
- レスポンシブ: xs=24, sm=12, md=6（1行4列）

#### 2.7.2 Progress（進捗バー）

**ストレージ使用率:**
```typescript
<Card title="ストレージ使用量">
  <Statistic
    title="使用量"
    value={1234}
    suffix="/ 5000 GB"
  />
  <Progress
    percent={Math.round((1234 / 5000) * 100)}
    status={percent > 80 ? 'exception' : 'normal'}
    strokeColor={token.colorPrimary}
  />
</Card>
```

**進捗ステータス:**
- normal: 80%以下（通常色）
- exception: 80%超（警告色）

---

### 2.8 ファイル管理セグメント

プロジェクト管理、フォーマット管理で使用するファイル管理UIのデザインルール。

#### 2.8.1 ツリー + テーブルレイアウト

**基本構造:**
```typescript
<Row gutter={16}>
  <Col xs={24} md={6}>
    <Card title="フォルダ">
      <Tree
        treeData={treeData}
        onSelect={handleSelect}
        defaultExpandAll
      />
    </Card>
  </Col>
  <Col xs={24} md={18}>
    <Card>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>プロジェクト</Breadcrumb.Item>
        <Breadcrumb.Item>フォルダA</Breadcrumb.Item>
      </Breadcrumb>
      <Table
        columns={fileColumns}
        dataSource={files}
      />
    </Card>
  </Col>
</Row>
```

**レイアウト:**
- ツリー: 6カラム（25%幅）
- テーブル: 18カラム（75%幅）
- gutter: 16px

#### 2.8.2 ファイルアップロード

**ドラッグ&ドロップ対応:**
```typescript
<Upload.Dragger
  name="file"
  multiple
  action="/api/upload"
  onChange={handleChange}
>
  <p className="ant-upload-drag-icon">
    <InboxOutlined />
  </p>
  <p className="ant-upload-text">
    クリックまたはドラッグしてファイルをアップロード
  </p>
  <p className="ant-upload-hint">
    複数ファイルの同時アップロードが可能です
  </p>
</Upload.Dragger>
```

#### 2.8.3 ファイル詳細表示（Drawer）

```typescript
<Drawer
  title="ファイル詳細"
  placement="right"
  width={720}
  open={isOpen}
  onClose={handleClose}
>
  <Descriptions bordered column={1}>
    <Descriptions.Item label="ファイル名">
      example.txt
    </Descriptions.Item>
    <Descriptions.Item label="サイズ">
      1.2 MB
    </Descriptions.Item>
    <Descriptions.Item label="更新日時">
      2025-12-23 09:00
    </Descriptions.Item>
  </Descriptions>
</Drawer>
```

---

### 2.9 ステータス・状態表示セグメント

ステータス、状態を視覚的に表現するデザインルール。

#### 2.9.1 Badge（バッジ）

**ステータスバッジ:**
```typescript
<Badge 
  status={isActive ? 'success' : 'default'} 
  text={isActive ? '有効' : '無効'} 
/>
```

**ステータス種類:**
| status | 色 | 用途 |
|--------|------|------|
| success | 緑 | 有効、完了、正常 |
| processing | 青 | 処理中、進行中 |
| error | 赤 | エラー、失敗 |
| warning | オレンジ | 警告、注意 |
| default | グレー | 無効、未設定 |

**件数表示バッジ:**
```typescript
<Badge count={inactiveCount} style={{ backgroundColor: token.colorPrimary }}>
  <span>ステータス</span>
</Badge>
```

#### 2.9.2 Tag（タグ）

**カテゴリータグ:**
```typescript
<Tag color="blue">カテゴリーA</Tag>
<Tag color="green">カテゴリーB</Tag>
```

**ステータスタグ:**
```typescript
<Tag color={status === 'active' ? 'success' : 'default'}>
  {status === 'active' ? 'アクティブ' : '非アクティブ'}
</Tag>
```

#### 2.9.3 Switch（スイッチ）

**アクティブ/非アクティブ切替:**
```typescript
<Switch
  checked={record.isActive}
  onChange={(checked) => handleToggle(record.id, checked)}
  checkedChildren="有効"
  unCheckedChildren="無効"
/>
```

---

### 2.10 ナビゲーションセグメント

ページ遷移、タブ切り替えのデザインルール。

#### 2.10.1 タブ（SubHeader内）

**基本構造:**
```typescript
const tabItems = [
  {
    key: '1',
    label: 'タブ1',
    icon: <HomeOutlined />,
  },
  {
    key: '2',
    label: 'タブ2',
    icon: <SettingOutlined />,
  },
];

<SubHeader
  menuType="system_admin"
  tabs={tabItems}
  activeTab={currentTab}
  onTabChange={setCurrentTab}
/>
```

**タブスタイル:**
- アイコン付きラベル
- アクティブタブは強調表示（`token.colorPrimary`）
- ホバー時に背景色変化

#### 2.10.2 Breadcrumb（パンくずリスト）

**ファイル管理画面:**
```typescript
<Breadcrumb>
  <Breadcrumb.Item>
    <HomeOutlined />
  </Breadcrumb.Item>
  <Breadcrumb.Item>
    <Link to="/projects">プロジェクト</Link>
  </Breadcrumb.Item>
  <Breadcrumb.Item>フォルダA</Breadcrumb.Item>
</Breadcrumb>
```

**配置:** ファイル一覧の上部に配置、marginBottom: 16px

---

## 3. メニュー別特殊セグメント

各メニュー固有の特殊なUIセグメントを定義します。

### 3.1 ExperimentWorkerMenu専用セグメント

#### 3.1.1 選択エリア

**プロジェクト・メソッド選択UI:**
```typescript
<div 
  className="selection-area"
  style={{
    height: 56,
    backgroundColor: token.colorBgContainer,
    border: `1px solid ${token.colorBorder}`,
    padding: `0 ${token.paddingLG}px`,
    display: 'flex',
    alignItems: 'center',
  }}
>
  <Space size="middle">
    <Select
      placeholder="プロジェクトを選択"
      style={{ width: 250 }}
      prefix={<FolderOutlined />}
    />
    <Select
      placeholder="メソッドを選択"
      style={{ width: 250 }}
      prefix={<ToolOutlined />}
    />
    <Button type="primary" icon={<CheckOutlined />}>
      選択
    </Button>
  </Space>
</div>
```

**特徴:**
- 固定高さ: 56px
- Content領域の上部に配置
- プロジェクトとメソッドの2段階選択

#### 3.1.2 作業指示カード

**カードグループ:**
```typescript
<Collapse defaultActiveKey={['1']}>
  <Collapse.Panel header="作業指示グループ1" key="1">
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card hoverable>
        <Card.Meta
          title="指示タイトル"
          description="指示内容の説明"
        />
        <Space style={{ marginTop: 16 }}>
          <Button type="primary" icon={<CheckOutlined />}>
            確認
          </Button>
          <Button icon={<EyeOutlined />}>
            詳細
          </Button>
        </Space>
      </Card>
      {/* 他のカード */}
    </Space>
  </Collapse.Panel>
</Collapse>
```

**特徴:**
- Collapseで折りたたみ可能
- カードは`hoverable`で反応
- 各カードにアクションボタン配置

#### 3.1.3 統合選択ダイアログ

**タブ付きモーダル:**
```typescript
<Modal
  title="選択"
  open={isOpen}
  onCancel={handleCancel}
  width={900}
  footer={[
    <Button key="cancel" onClick={handleCancel}>
      キャンセル
    </Button>,
    <Button key="submit" type="primary" onClick={handleSubmit}>
      選択
    </Button>,
  ]}
>
  <Tabs>
    <Tabs.TabPane tab="プロジェクト" key="1">
      <Table
        columns={projectColumns}
        dataSource={projects}
        rowSelection={{
          type: 'radio',
          onChange: handleProjectSelect,
        }}
      />
    </Tabs.TabPane>
    <Tabs.TabPane tab="メソッド" key="2">
      <Table
        columns={methodColumns}
        dataSource={methods}
        rowSelection={{
          type: 'radio',
          onChange: handleMethodSelect,
        }}
      />
    </Tabs.TabPane>
    <Tabs.TabPane tab="タスク" key="3">
      <Table
        columns={taskColumns}
        dataSource={tasks}
        rowSelection={{
          type: 'radio',
          onChange: handleTaskSelect,
        }}
      />
    </Tabs.TabPane>
  </Tabs>
</Modal>
```

**特徴:**
- 大型モーダル（900px）
- 3つのタブで階層的な選択
- ラジオボタンで単一選択

---

## 4. UI要素の出現頻度とパターン

### 4.1 全メニューでの共通UI要素

| 要素種別 | 出現頻度 | 主な用途 |
|---------|---------|---------|
| **Button** | 全メニュー | アクション、CRUD操作、確認 |
| **Table** | 15タブ以上 | データ一覧表示 |
| **Input** | 全メニュー | 検索、フォーム入力 |
| **Select** | 全メニュー | フィルター、選択 |
| **Modal** | 14タブ以上 | 追加/編集フォーム、確認 |
| **Form** | 14タブ以上 | データ入力 |
| **Badge** | 12タブ以上 | 件数、ステータス表示 |
| **Card** | 7タブ以上 | コンテンツグループ化 |
| **Row/Col** | 全メニュー | レイアウト |
| **Space** | 全メニュー | 要素間の間隔制御 |

### 4.2 CRUD画面の標準パターン

**典型的なCRUD画面のUI構成:**

```typescript
// 1. アクションボタン群（左寄せ）
<Space size="middle" style={{ marginBottom: 16 }}>
  <Button type="primary" icon={<PlusOutlined />}>追加</Button>
  <Button icon={<UploadOutlined />}>CSVアップロード</Button>
  <Button icon={<DownloadOutlined />}>CSVダウンロード</Button>
  <Button icon={<ReloadOutlined />}>リロード</Button>
</Space>

// 2. フィルターエリア（左寄せ）
<Row gutter={16} style={{ marginBottom: 16 }}>
  <Col flex="400px">
    <Input placeholder="検索" prefix={<SearchOutlined />} allowClear />
  </Col>
  <Col flex="150px">
    <Select placeholder="カテゴリー" allowClear />
  </Col>
  <Col flex="150px">
    <Select placeholder="ステータス" allowClear />
  </Col>
</Row>

// 3. データテーブル
<Table
  columns={columns}
  dataSource={data}
  rowKey="id"
  rowSelection={rowSelection}
  scroll={{ x: 1200 }}
  pagination={{
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (total) => `全 ${total} 件`,
  }}
/>

// 4. 編集/追加モーダル
<Modal
  title="追加/編集"
  open={isModalOpen}
  onOk={handleSubmit}
  onCancel={handleCancel}
  width={600}
>
  <Form form={form} layout="vertical" size="large">
    {/* フォーム項目 */}
  </Form>
</Modal>
```

### 4.3 ダッシュボード画面の標準パターン

**統計情報表示の構成:**

```typescript
<Row gutter={16}>
  <Col xs={24} sm={12} md={6}>
    <Card>
      <Statistic
        title="統計1"
        value={value1}
        prefix={<Icon />}
        valueStyle={{ color: token.colorPrimary }}
      />
    </Card>
  </Col>
  {/* 他の統計カード */}
</Row>
```

### 4.4 ファイル管理画面の標準パターン

**ツリー + テーブルレイアウト:**

```typescript
<Row gutter={16}>
  <Col xs={24} md={6}>
    <Card title="フォルダ">
      <Tree
        treeData={treeData}
        onSelect={handleSelect}
        defaultExpandAll
      />
    </Card>
  </Col>
  <Col xs={24} md={18}>
    <Card>
      <Breadcrumb style={{ marginBottom: 16 }}>
        {/* パンくずリスト */}
      </Breadcrumb>
      <Space size="middle" style={{ marginBottom: 16 }}>
        {/* アクションボタン */}
      </Space>
      <Table
        columns={fileColumns}
        dataSource={files}
      />
    </Card>
  </Col>
</Row>
```

---

## 5. デザイントークン活用ガイド

### 5.1 カラートークンの使用例

```typescript
import { theme } from 'antd';

function MyComponent() {
  const { token } = theme.useToken();
  
  return (
    <div style={{ 
      backgroundColor: token.colorBgContainer,
      borderColor: token.colorBorder,
      color: token.colorText,
      padding: token.paddingLG,
    }}>
      {/* コンテンツ */}
    </div>
  );
}
```

### 5.2 スペーシングトークンの使用例

**マージン・パディング:**
```typescript
// ✅ 推奨
style={{ padding: token.paddingLG }}        // 24px
style={{ margin: token.marginMD }}          // 16px
style={{ marginBottom: token.marginXS }}    // 8px

// ❌ 非推奨
style={{ padding: '24px' }}
style={{ margin: '16px' }}
```

### 5.3 フォントトークンの使用例

```typescript
// ✅ 推奨
<Typography.Title level={1}>タイトル</Typography.Title>
<Typography.Text type="secondary">補足</Typography.Text>

// ❌ 非推奨
<h1 style={{ fontSize: '38px' }}>タイトル</h1>
<span style={{ color: '#757575' }}>補足</span>
```

---

## 6. レスポンシブデザイン実装ガイド

### 6.1 Grid システムの活用

```typescript
<Row gutter={16}>
  <Col xs={24} sm={12} md={8} lg={6} xl={4}>
    {/* モバイル: 全幅 */}
    {/* タブレット: 半分 */}
    {/* デスクトップ: 1/3〜1/6 */}
  </Col>
</Row>
```

### 6.2 ブレークポイント別の対応

| デバイス | ブレークポイント | 推奨レイアウト |
|---------|----------------|---------------|
| モバイル | xs (〜480px) | 単一カラム、スタックレイアウト |
| タブレット（縦） | sm (576px〜) | 2カラムレイアウト |
| タブレット（横） | md (768px〜) | 2-3カラムレイアウト |
| デスクトップ | lg (992px〜) | 3-4カラムレイアウト |
| 大型ディスプレイ | xl (1200px〜) | 4-6カラムレイアウト |

### 6.3 レスポンシブコンテナの実装

ExperimentWorkerMenu専用のレスポンシブコンテナパターン:

```typescript
// SCSS版（推奨）
<div className="responsive-container">
  {/* コンテンツ */}
</div>

// インラインスタイル版（非推奨）
<div style={{
  maxWidth: '100%',
  width: '100%',
  margin: '0 auto',
  padding: '0 8px',
  // メディアクエリはSCSSで定義
}}>
  {/* コンテンツ */}
</div>
```

---

## 7. アクセシビリティ考慮事項

### 7.1 キーボード操作

- Tab順序は論理的に
- Enterキーでボタン実行
- Escapeキーでモーダル閉じる
- 矢印キーでメニュー/リスト操作

### 7.2 スクリーンリーダー対応

```typescript
// ✅ ARIA属性を適切に設定
<Button
  icon={<EditOutlined />}
  aria-label="編集"
>
  編集
</Button>

// フォーム要素にラベルを関連付け
<Form.Item label="ユーザー名" name="username">
  <Input />
</Form.Item>
```

### 7.3 コントラスト比

- 通常テキスト: 最低 4.5:1
- 大きなテキスト: 最低 3:1
- UI要素: 最低 3:1

---

## 8. ベストプラクティス

### 8.1 DO（推奨）

✅ **Ant Designのデザイントークンを使用する**
✅ **コンポーネントのpropsでスタイルを制御する**
✅ **Spaceコンポーネントで間隔を制御する**
✅ **Row/Colでレスポンシブレイアウトを実装する**
✅ **Modalのwidthは標準値（600px, 800px, 900px）を使用する**
✅ **Tableの列alignは適切に設定する（数値・日付は右、ステータスは中央）**
✅ **Buttonのtypeとsizeを適切に指定する**
✅ **Formのlayoutは用途に応じて使い分ける**

### 8.2 DON'T（非推奨）

❌ **インラインスタイルで具体的なピクセル値を指定しない**
❌ **カラーコードを直接指定しない**
❌ **個別の要素にmarginを指定しない（Spaceを使用）**
❌ **Tableの列幅を無計画に指定しない**
❌ **Modalの背景クリックで閉じる設定にしない（重要なフォームの場合）**
❌ **Formのバリデーションを省略しない**
❌ **アクセシビリティ属性を省略しない**

---

## 9. セグメント別チェックリスト

### 9.1 CRUD画面実装時のチェックリスト

- [ ] アクションボタン群を左寄せで配置（Spaceで16px間隔）
- [ ] フィルターエリアを左寄せで配置（Row/Col、gutter: 16px）
- [ ] 全文検索Inputは400px幅
- [ ] カテゴリー・ステータスSelectは150px幅
- [ ] Tableのscroll={{ x: 1200 }}を設定
- [ ] Tableのpaginationを適切に設定
- [ ] 数値列のalignを'right'に設定
- [ ] ステータス列のalignを'center'に設定
- [ ] 行内アクションボタンをSpaceでグループ化
- [ ] Modal幅は600px（標準）または800px（大型）
- [ ] Form layoutは'vertical'（モーダル内）
- [ ] Form sizeは'large'

### 9.2 ダッシュボード画面実装時のチェックリスト

- [ ] Row gutterは16px
- [ ] Col のレスポンシブ指定（xs, sm, md）
- [ ] Statisticにprefixアイコンを設定
- [ ] Card内にStatisticを配置
- [ ] Progressのstatusを適切に設定
- [ ] valueStyleでプライマリカラーを使用

### 9.3 ファイル管理画面実装時のチェックリスト

- [ ] Row gutterは16px
- [ ] ツリーエリアは6カラム（md）
- [ ] テーブルエリアは18カラム（md）
- [ ] Breadcrumbを配置（marginBottom: 16px）
- [ ] Treeのdefault ExpandAllを設定
- [ ] Upload.Draggerでドラッグ&ドロップ対応
- [ ] Drawerでファイル詳細表示（width: 720px）

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2025-12-23 | 初版作成 - UIセグメント定義とデザインルール | Cline |
