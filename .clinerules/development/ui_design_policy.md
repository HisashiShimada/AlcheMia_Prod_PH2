# UI設計ポリシー - 条件分岐型ルールブック

> **最終更新日**: 2026-01-07  
> **バージョン**: 2.0.0  
> **対象システム**: MaiML Viewer (mmdpf)

---

## 🎯 基本方針

### 絶対ルール
- ✅ Ant Designのデフォルト値を使用（サイズ指定は省略）
- ✅ デザイントークンのみ使用（`theme.useToken()`）
- ❌ インラインスタイルでのハードコーディング禁止
- ❌ サイズ`large`は使用禁止
- ❌ 具体的な色コード（例: `#CF0027`）・サイズ値（例: `32px`）を直接記述禁止

### スタイル指定の判断基準

```
スタイルを適用したい
│
├─ Ant Designコンポーネントにpropsがある？
│  ├─ YES → propsを使用（例: type, size, dangerなど）
│  └─ NO  → 次へ
│
├─ デフォルト値で問題ない？
│  ├─ YES → サイズ指定を省略
│  └─ NO  → 次へ
│
├─ デザイントークンで対応可能？
│  ├─ YES → theme.useToken()で取得して使用
│  └─ NO  → theme.tsに新しいトークンを定義
│
└─ 複雑なレイアウトが必要？
   └─ YES → 例外的にEmotionを使用（ただしトークン参照必須）
```

---

## 📦 コンポーネント別条件分岐ルール

### Button（ボタン）

#### ▼ パターン選択フローチャート

```
操作の種類は？
│
├─ データを変更する？
│  ├─ 削除・非アクティブ化など取り返しがつかない
│  │  └─ → パターン3: primary danger
│  │
│  ├─ ステータス切替（アクティブ化/非アクティブ化）
│  │  └─ → パターン4: default + 動的配色
│  │
│  ├─ ページ内で最重要アクション（保存、検索、新規作成）
│  │  └─ → パターン1: primary
│  │
│  └─ 通常の操作（追加、リロード、編集）
│     └─ → パターン2: default
│
└─ データを変更しない？
   ├─ 軽量なアクション（詳細表示、リンク）
   │  └─ → パターン5: text/link
   │
   └─ 通常の表示操作
      └─ → パターン2: default
```

#### ▼ サイズの判断

```
ボタンのサイズは？
│
├─ テーブル行内 or コンパクトなUI
│  └─ → size="small"
│
└─ 通常のボタン
   └─ → サイズ指定を省略（デフォルト）
```

#### ▼ 配置の判断

```
配置場所は？
│
├─ ツールバー
│  ├─ 左側: 検索・フィルタUI、詳細検索
│  └─ 右側: CSV操作、追加、リロード（右から主要な順）
│
├─ テーブル行内
│  └─ 右端カラム: [編集] [詳細] [切替] （左から順に）
│
└─ モーダルフッター
   ├─ 左側: クリア、リセット（補助的な操作）
   └─ 右側: キャンセル、保存・確定（右が主要アクション）
```

#### ▼ 実装例

```typescript
// 条件: ページ内で最重要アクション
<Button type="primary" icon={<SaveOutlined />}>保存</Button>

// 条件: テーブル行内の編集ボタン
<Button type="default" size="small" icon={<EditOutlined />}>編集</Button>

// 条件: ステータス切替（動的配色）
<Button 
  size="small"
  danger={record.is_active}
  style={!record.is_active ? { 
    color: token.colorSuccess,
    borderColor: token.colorSuccess 
  } : undefined}
>
  {record.is_active ? '非アクティブ化' : 'アクティブ化'}
</Button>

// 条件: 削除など危険な操作
<Button type="primary" danger icon={<DeleteOutlined />}>削除</Button>

// 条件: 軽量なアクション
<Button type="link" icon={<EyeOutlined />}>詳細</Button>
```

---

### Input（入力フィールド）

#### ▼ パターン選択フローチャート

```
入力の目的は？
│
├─ 検索・フィルタリング
│  └─ → パターン2: 検索入力
│       - prefix: SearchOutlined
│       - allowClear: true
│       - width: 250px
│
├─ 長文入力（説明文・コメント）
│  └─ → パターン3: TextArea
│       - rows: 4
│
├─ パスワード入力
│  └─ → Input.Password
│       - iconRender付き
│
└─ 通常のフォーム入力
   └─ → パターン1: 標準入力
```

#### ▼ 実装例

```typescript
// 条件: 検索・フィルタリング
<Input
  placeholder="検索"
  prefix={<SearchOutlined />}
  style={{ width: 250 }}
  allowClear
/>

// 条件: 通常のフォーム入力
<Input placeholder="ユーザー名を入力" />

// 条件: 長文入力
<Input.TextArea rows={4} placeholder="説明を入力" />

// 条件: パスワード入力
<Input.Password 
  placeholder="パスワードを入力"
  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
/>
```

---

### Select（選択入力）

#### ▼ 幅の判断

```
選択肢の文字数は？
│
├─ 短い（5文字以内）   → width: 150px
├─ 中程度（10文字以内） → width: 200px
└─ 長い（15文字以内）   → width: 250px
```

#### ▼ モードの判断

```
選択形式は？
│
├─ 単一選択       → mode指定なし
├─ 複数選択       → mode="multiple"
├─ タグ形式      → mode="tags"
└─ コンボボックス → mode="combobox"
```

```typescript
<Select style={{ width: 200 }} mode="multiple" options={[...]} />
```

---

### Radio

#### ▼ スタイルの判断

```
視認性の要件は？
│
├─ 視認性を高めたい（重要な選択、2〜5個の選択肢）
│  └─ → Radio.Button（buttonStyle="solid"）
│
└─ 通常の選択
   └─ → Radio（標準）
```

#### ▼ 実装例

```typescript
// 条件: 視認性を高めたい重要な選択
<Radio.Group optionType="button" buttonStyle="solid">
  <Radio.Button value="list">リスト</Radio.Button>
  <Radio.Button value="grid">グリッド</Radio.Button>
</Radio.Group>

// 条件: 通常の選択
<Radio.Group>
  <Radio value="1">選択肢1</Radio>
  <Radio value="2">選択肢2</Radio>
</Radio.Group>
```

---

### Upload（ファイルアップロード）

#### ▼ UIの判断

```
アップロード方式は？
│
├─ ビジュアル重視（ドラッグ&ドロップ推奨）
│  └─ → Dragger
│       - minHeight: 200px
│       - アイコン: InboxOutlined (48px)
│       - 対応形式・サイズ制限を明示
│
└─ 簡易的なアップロード
   └─ → Upload（標準ボタン）
```

#### ▼ 実装例

```typescript
// 条件: ビジュアル重視のアップロード
const { token } = theme.useToken();

<Dragger {...props} style={{ minHeight: 200 }}>
  <InboxOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
  <p>ファイルをドラッグ&ドロップまたはクリックして選択</p>
  <p>対応形式: .pdf, .png, .jpg | 最大サイズ: 10MB</p>
</Dragger>
```

---

### Table（テーブル）

#### ▼ 列の配置判断

```
データ型は？
│
├─ 数値（ID、件数、金額など） → align: 'right'
├─ 日付・時刻                → align: 'right'
├─ Boolean・バッジ・ステータス → align: 'center'
└─ テキスト（名前、説明など）  → align: 'left'（デフォルト）
```

#### ▼ ページングの判断

```
データ量は？
│
├─ 10件以下     → ページング不要
├─ 100件以下    → pageSize: 10（デフォルト）
├─ 1000件以下   → pageSize: 20, showSizeChanger: true
└─ 1000件以上   → pageSize: 50, showSizeChanger: true
                  pageSizeOptions: ['10', '20', '50', '100']
```

#### ▼ 実装例

```typescript
const columns: ColumnsType<DataType> = [
  // 条件: 数値データ
  {
    title: 'ID',
    dataIndex: 'id',
    align: 'right',
    sorter: (a, b) => parseInt(a.id) - parseInt(b.id),
  },
  // 条件: テキストデータ
  {
    title: '名前',
    dataIndex: 'name',
    align: 'left',
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  // 条件: Boolean・ステータス
  {
    title: 'ステータス',
    dataIndex: 'status',
    align: 'center',
    render: (status: boolean) => (
      <Badge status={status ? 'success' : 'default'} />
    ),
  },
];
```

---

### Modal（モーダル）

#### ▼ フッター配置の判断

```
ボタンの役割は？
│
├─ 補助的な操作（クリア、リセット）
│  └─ → 左側配置
│
└─ 主要な操作（キャンセル、保存）
   └─ → 右側配置（右が最重要）
```

#### ▼ 実装例

```typescript
// 条件: カスタムフッター配置
<Modal
  footer={
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Button onClick={handleClear}>クリア</Button>
      <Space>
        <Button onClick={handleCancel}>キャンセル</Button>
        <Button type="primary" onClick={handleOk}>保存</Button>
      </Space>
    </div>
  }
>
  コンテンツ
</Modal>
```

---

### message / notification

#### ▼ 使い分けの判断

```
フィードバックの重要度は？
│
├─ 簡単な通知（3秒以内で消える）
│  └─ → message
│       例: 保存完了、削除完了
│
└─ 重要な通知（ユーザーが閉じるまで表示）
   └─ → notification
        例: エラー詳細、警告、複雑な情報
```

#### ▼ タイプの判断

```
通知の種類は？
│
├─ 成功   → success（緑）
├─ エラー → error（赤）
├─ 警告   → warning（黄）
├─ 情報   → info（青）
└─ 処理中 → loading（アニメーション）
```

```typescript
message.success('保存しました');
notification.error({ message: 'エラー', description: '詳細...' });
```

---

### Space / Flex

#### ▼ 使い分けの判断

```
レイアウトの要件は？
│
├─ 単純な等間隔配置
│  └─ → Space
│       - 縦: direction="vertical"
│       - 横: direction="horizontal"（デフォルト）
│       - サイズ: 省略（デフォルト = middle）
│
└─ 複雑なレイアウト（折り返し、配置制御）
   └─ → Flex
        - 縦: vertical
        - 折り返し: wrap
        - 配置: justify, align
```

#### ▼ サイズの判断

```
間隔の広さは？
│
├─ 狭い   → size="small"
├─ 通常   → サイズ指定を省略（デフォルト = middle）
└─ 広い   → size="large"
```

```typescript
<Space direction="vertical">{children}</Space>
<Flex gap="middle" vertical wrap>{children}</Flex>
```

---

### Checkbox（チェックボックス）

```typescript
単一: <Checkbox>ラベル</Checkbox>
複数: <Checkbox.Group options={[...]} />
```

---

### Switch（スイッチ）

```typescript
<Switch checked={...} onChange={...} checkedChildren="ON" unCheckedChildren="OFF" />
ローディング: <Switch loading />
無効: <Switch disabled />
```

---

### Form（フォーム）

#### ▼ レイアウトの判断

```
フォームのレイアウトは？
│
├─ 縦配置（ラベルが上）
│  └─ → layout="vertical" （推奨）
│
├─ 横配置（ラベルが左）
│  └─ → layout="horizontal"
│
└─ インライン（横一列）
   └─ → layout="inline"
```

```typescript
// 条件: 標準的なフォーム（縦配置）
<Form layout="vertical">
  <Form.Item 
    name="username" 
    label="ユーザー名"
    rules={[{ required: true, message: 'ユーザー名を入力してください' }]}
  >
    <Input />
  </Form.Item>
</Form>
```

---

### Card（カード）

#### ▼ サイズの判断

```
カードのサイズは？
│
├─ コンパクト → size="small"
└─ 通常      → サイズ指定なし（デフォルト）
```

```typescript
<Card title="..." bordered={false}>{children}</Card>
ホバー効果: <Card hoverable>{children}</Card>
```

---

### Typography（テキスト表示）

#### ▼ 用途別の判断

```
テキストの用途は？
│
├─ ページタイトル    → Title level={1}
├─ セクションタイトル → Title level={2-5}
├─ 本文テキスト      → Text
├─ 補足テキスト      → Text type="secondary"
├─ 危険テキスト      → Text type="danger"
└─ 段落             → Paragraph
```

```typescript
<Typography.Title level={1}>タイトル</Typography.Title>
<Typography.Text type="secondary">補足</Typography.Text>
<Typography.Text type="danger">エラー</Typography.Text>
```

---

### Tag（タグ）

#### ▼ 色の判断

```
タグの用途は？
│
├─ 成功・完了   → color="success"
├─ エラー・失敗 → color="error"
├─ 警告        → color="warning"
├─ 処理中      → color="processing"
└─ デフォルト   → color="default"
```

```typescript
<Tag color="success">完了</Tag>
<Tag color="error">エラー</Tag>
<Tag color="processing">処理中</Tag>
```

---

### Badge（バッジ）

#### ▼ 用途の判断

```
バッジの用途は？
│
├─ 数値表示（通知数など） → count={数値}
└─ ステータス表示        → status="success|error|default|processing|warning"
```

```typescript
数値: <Badge count={5}><Avatar /></Badge>
ステータス: <Badge status="success" text="有効" />
```

---

### Avatar（アバター）

#### ▼ サイズの判断

```
アバターのサイズは？
│
├─ 小    → size={24} or size="small"
├─ 中    → サイズ指定なし（デフォルト: 40px）
└─ 大    → size={64}
```

```typescript
<Avatar icon={<UserOutlined />} />
<Avatar src="..." />
<Avatar>TEXT</Avatar>
```

---

### List（リスト）

```typescript
<List dataSource={data} renderItem={(item) => <List.Item>{item}</List.Item>} />
メタ情報: <List.Item><List.Item.Meta avatar={...} title={...} /></List.Item>
```

---

### Tree（ツリー）

#### ▼ 種類の判断

```
ツリーの用途は？
│
├─ ファイル・フォルダー構造 → DirectoryTree
└─ 一般的な階層構造       → Tree
```

```typescript
<DirectoryTree treeData={...} onSelect={...} />
<Tree treeData={...} checkable onCheck={...} />
```

---

### Divider（区切り線）

#### ▼ 方向の判断

```
区切り線の方向は？
│
├─ 横方向（水平） → type指定なし（デフォルト）
└─ 縦方向（垂直） → type="vertical"
```

```typescript
<Divider />
<Divider orientation="left">テキスト</Divider>
<Divider type="vertical" />
```

---

### Image（画像表示）

```typescript
<Image width={200} src="..." preview />
```

---

### Progress（進捗表示）

#### ▼ 形状の判断

```
進捗バーの形状は？
│
├─ 直線型   → type指定なし（デフォルト）
├─ 円形     → type="circle"
└─ ダッシュ → type="dashboard"
```

```typescript
<Progress percent={30} />
<Progress type="circle" percent={75} />
<Progress type="dashboard" percent={75} />
```

---

### Collapse（折りたたみパネル）

```typescript
<Collapse><Collapse.Panel header="..." key="1">{children}</Collapse.Panel></Collapse>
アコーディオン: <Collapse accordion>...</Collapse>
```

---

### Tooltip（ツールチップ）

```typescript
<Tooltip title="説明">{children}</Tooltip>
位置指定: <Tooltip title="..." placement="top">{children}</Tooltip>
```

---

### Popover（ポップオーバー）

```typescript
<Popover content={<div>...</div>} title="..." trigger="click">{children}</Popover>
```

---

### Alert（警告・情報表示）

#### ▼ タイプの判断

```
アラートのタイプは？
│
├─ 成功 → type="success"
├─ エラー → type="error"
├─ 警告 → type="warning"
└─ 情報 → type="info"
```

```typescript
<Alert message="..." type="success" showIcon closable />
説明付き: <Alert message="..." description="..." type="warning" showIcon />
```

---

### Spin（ローディングスピナー）

#### ▼ サイズの判断

```
スピナーのサイズは？
│
├─ 小    → size="small"
├─ 中    → サイズ指定なし（デフォルト）
└─ 大    → カスタム indicator
```

```typescript
<Spin />
<Spin spinning={loading}>{children}</Spin>
<Spin tip="読み込み中...">{children}</Spin>
```

---

### Drawer（ドロワー）

#### ▼ 表示位置の判断

```
ドロワーの表示位置は？
│
├─ 右側 → placement="right" （デフォルト）
├─ 左側 → placement="left"
├─ 上部 → placement="top"
└─ 下部 → placement="bottom"
```

```typescript
<Drawer title="..." placement="right" onClose={...} open={...} width={720}>{children}</Drawer>
```

---

### Tabs（タブ）

#### ▼ スタイルの判断

```
タブのスタイルは？
│
├─ 標準     → type指定なし
├─ カード型 → type="card"
└─ 編集可能 → type="editable-card"
```

```typescript
<Tabs defaultActiveKey="1" items={[{ key: '1', label: '...', children: '...' }]} />
```

---

### Menu（メニュー）

#### ▼ モードの判断

```
メニューのモードは？
│
├─ 縦型（インライン） → mode="inline"
├─ 横型             → mode="horizontal"
└─ 縦型（ポップアップ） → mode="vertical"
```

```typescript
<Menu mode="inline" defaultSelectedKeys={['1']} items={[{ key: '1', label: '...' }]} />
```

---

### Dropdown（ドロップダウン）

```typescript
<Dropdown menu={{ items: [{ key: '1', label: '...' }] }}><Button>...</Button></Dropdown>
```

---

### Breadcrumb（パンくずリスト）

```typescript
<Breadcrumb items={[{ title: 'ホーム' }, { title: <a>カテゴリ</a> }, { title: '現在' }]} />
```

---

### Pagination（ページネーション）

```typescript
<Pagination current={1} total={50} pageSize={10} showSizeChanger showTotal={(total) => `全 ${total} 件`} pageSizeOptions={['10', '20', '50', '100']} />
```

---

### Steps（ステップ）

#### ▼ 方向の判断

```
ステップの方向は？
│
├─ 横方向 → direction="horizontal" （デフォルト）
└─ 縦方向 → direction="vertical"
```

```typescript
<Steps current={1} items={[{ title: 'ステップ1' }, { title: 'ステップ2' }]} />
```

---

### Result（結果ページ）

#### ▼ ステータスの判断

```
結果のステータスは？
│
├─ 成功     → status="success"
├─ エラー   → status="error"
├─ 警告     → status="warning"
├─ 情報     → status="info"
├─ 404      → status="404"
├─ 403      → status="403"
└─ 500      → status="500"
```

```typescript
<Result status="success" title="処理完了" extra={[<Button type="primary">ホーム</Button>]} />
```

---

### Empty（空状態）

```typescript
<Empty description="データがありません" image={Empty.PRESENTED_IMAGE_SIMPLE} />
アクション付き: <Empty><Button type="primary">新規作成</Button></Empty>
```

---

### Skeleton（スケルトンスクリーン）

#### ▼ 形状の判断

```
スケルトンの形状は？
│
├─ テキスト → デフォルト
├─ アバター → Skeleton.Avatar
├─ ボタン   → Skeleton.Button
└─ インプット → Skeleton.Input
```

```typescript
<Skeleton active />
<Skeleton.Avatar active />
<Skeleton.Button active />
```

---

### Popconfirm（確認ポップアップ）

```typescript
<Popconfirm title="削除しますか？" onConfirm={...} okText="はい" cancelText="いいえ"><Button danger>削除</Button></Popconfirm>
```