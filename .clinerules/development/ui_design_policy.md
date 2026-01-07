# UI設計ポリシー統合ドキュメント

> **最終更新日**: 2026-01-06  
> **バージョン**: 1.0.0  
> **対象システム**: MaiML Viewer (mmdpf)

---

## 目次

1. [基本原則](#基本原則)
2. [デザイントークン](#デザイントークン)
3. [レイアウトコンポーネント](#レイアウトコンポーネント)
4. [データ入力コンポーネント](#データ入力コンポーネント)
5. [データ表示コンポーネント](#データ表示コンポーネント)
6. [フィードバックコンポーネント](#フィードバックコンポーネント)
7. [ナビゲーションコンポーネント](#ナビゲーションコンポーネント)
8. [アクセシビリティ](#アクセシビリティ)
9. [多言語化](#多言語化)

---

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

---

## デザイントークン

### カラートークン

> **注意**: 具体的な色の値は `frontend/src/theme/theme.ts` で定義されています。

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
- `colorBgContainerDisabled` - 無効状態の背景

**テキストカラー系:**
- `colorText` - メインテキスト
- `colorTextSecondary` - 補足テキスト
- `colorTextTertiary` - 三次テキスト（プレースホルダー等）
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

> **注意**: 具体的な値は `frontend/src/theme/theme.ts` で定義されています。

**フォント系:**
- `fontFamily` - フォントファミリー
- `fontSize` - 基本フォントサイズ
- `fontSizeSM` / `fontSizeLG` / `fontSizeXL` - サイズバリエーション
- `fontSizeHeading1` ～ `fontSizeHeading5` - 見出しサイズ
- `fontWeightStrong` - 強調フォントウェイト

**行の高さ:**
- `lineHeight` - 基本行高
- `lineHeightSM` / `lineHeightLG` - サイズバリエーション
- `lineHeightHeading1` ～ `lineHeightHeading5` - 見出し行高

### スペーシングトークン

> **注意**: 具体的な値は `frontend/src/theme/theme.ts` で定義されています。

**マージン系:**
- `marginXS` / `marginSM` / `margin` / `marginMD` / `marginLG` / `marginXL` / `marginXXL`

**パディング系:**
- `padding` / `paddingSM` / `paddingLG` / `paddingXL`
- `controlPaddingHorizontal` - コントロールの水平パディング
- `controlPaddingHorizontalSM` - 小サイズコントロールの水平パディング

**推奨する`<Space>`コンポーネントのサイズ指定:**
- `size="small"` - 小
- `size="middle"` - 中（デフォルト）
- `size="large"` - 大
- `size={数値}` - カスタム値（8の倍数を推奨）

### コントロールサイズトークン

> **注意**: 具体的な値は `frontend/src/theme/theme.ts` で定義されています。

- `controlHeight` - 標準コントロール高さ
- `controlHeightSM` - 小サイズコントロール高さ
- `controlHeightLG` - 大サイズコントロール高さ

### ボーダーラジアストークン

> **注意**: 具体的な値は `frontend/src/theme/theme.ts` で定義されています。

- `borderRadius` - 標準
- `borderRadiusSM` - 小
- `borderRadiusLG` - 大
- `borderRadiusXS` - 極小

### シャドウトークン

- `boxShadow` - 基本シャドウ（カード）
- `boxShadowSecondary` - セカンダリ（ドロップダウン）
- `boxShadowTertiary` - 三次（モーダル）

---

## レイアウトコンポーネント

### Layout

ページ全体の構造を定義します。

**DO（推奨）:**
```typescript
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

### Card

コンテンツをカード形式で表示します。

**DO（推奨）:**
```typescript
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

### Space

要素間のスペーシングを調整します。

**DO（推奨）:**
```typescript
<Space size="middle" direction="vertical" style={{ width: '100%' }}>
  <Card>カード1</Card>
  <Card>カード2</Card>
</Space>

// または Flex + gap
<Flex gap="middle" vertical>
  <Card>カード1</Card>
  <Card>カード2</Card>
</Flex>
```

### Grid（Row / Col）

24カラムグリッドシステムを使用します。

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

**DO（推奨）:**
```typescript
<Row gutter={16}>
  <Col xs={24} sm={12} md={8} lg={6}>
    コンテンツ1
  </Col>
  <Col xs={24} sm={12} md={8} lg={6}>
    コンテンツ2
  </Col>
</Row>
```

---

## データ入力コンポーネント

### Button（ボタン）

#### パターン選択フローチャート

```
操作の種類を判断する
│
├─ データを変更する操作？
│  ├─ YES → 取り返しのつかない操作（削除、非アクティブ化）？
│  │        ├─ YES → パターン3: danger (type="primary" danger)
│  │        └─ NO → ステータス切替操作？
│  │                 ├─ YES → パターン4: ステータス切替
│  │                 └─ NO → 最重要アクション？
│  │                          ├─ YES → パターン1: primary
│  │                          └─ NO → パターン2: default
│  │
│  └─ NO → 軽量なアクション（詳細表示、リンク）？
│           ├─ YES → パターン5: text/link
│           └─ NO → パターン2: default
```

#### 標準5パターン

**パターン1: 主要アクション**
- **用途**: ページ内で最も重要なアクション（保存、検索、新規作成など）
- **type**: `primary`
- **配置**: ツールバー右側、モーダルフッター右側
- **特徴**: 1画面に1〜2個まで

```typescript
<Button type="primary" icon={<SaveOutlined />}>保存</Button>
<Button type="primary" icon={<PlusOutlined />}>新規作成</Button>
```

> **注意**: 具体的なスタイル（色、サイズ、角丸など）は `frontend/src/theme/theme.ts` のデザイントークンにより自動的に適用されます。

**パターン2: 一般アクション**
- **用途**: 通常の操作（追加、リロード、詳細など）
- **type**: `default`
- **配置**: ツールバー左側〜中央、テーブル行内

```typescript
<Button icon={<ReloadOutlined />}>リロード</Button>
<Button icon={<PlusOutlined />}>追加</Button>
```

**パターン3: 危険アクション（削除系）**
- **用途**: 削除など取り返しのつかない操作
- **type**: `primary` + `danger`（重要な削除）または `default` + `danger`（一般的な削除）
- **配置**: ツールバー右側、テーブル行内

```typescript
<Button type="primary" danger icon={<DeleteOutlined />}>
  削除
</Button>
<Button type="default" danger>
  非アクティブ化
</Button>
```

**パターン4: ステータス切替アクション**
- **用途**: アクティブ化/非アクティブ化、有効化/無効化などステータスを切り替える操作
- **type**: `default`
- **配置**: ツールバー、テーブル行内
- **特徴**: 現在のステータスに応じて動的に配色を変更

```typescript
// 動的な配色切替
import { theme } from 'antd';
const { token } = theme.useToken();

<Button 
  size="small"
  danger={record.is_active}
  style={!record.is_active ? { 
    color: token.colorSuccess,
    borderColor: token.colorSuccess 
  } : undefined}
  onClick={() => handleToggle(record)}
>
  {record.is_active ? '非アクティブ化' : 'アクティブ化'}
</Button>
```

**パターン5: テキストリンク**
- **用途**: 軽量なアクション、インラインリンク、詳細表示
- **type**: `text` または `link`
- **配置**: テキスト中、カード内、ダイアログ内

```typescript
<Button type="link">詳細表示</Button>
<Button type="text" icon={<EyeOutlined />}>閲覧</Button>
```

**使い分け:**
- `text`: ホバー時に背景色が変わる
- `link`: 下線付きリンク風（ホバー時に色が変わる）

#### サイズバリエーション

全てのボタンに`size`プロパティでサイズを指定できます：

| size | 高さ | フォントサイズ | 用途 |
|------|------|---------------|------|
| `large` | token.controlHeightLG | token.fontSizeLG | ログイン画面、重要なCTA |
| `middle` | token.controlHeight | token.fontSize | 通常のボタン（デフォルト） |
| `small` | token.controlHeightSM | token.fontSizeSM | テーブル行内、コンパクトなUI |

```typescript
// 大きいボタン
<Button type="primary" size="large">ログイン</Button>

// 通常サイズ（デフォルト）
<Button type="primary">保存</Button>

// 小さいボタン（テーブル内など）
<Button type="default" size="small">編集</Button>
```

#### アイコン配置

**左アイコン（標準）:**
```typescript
<Button icon={<PlusOutlined />}>追加</Button>
```
- アイコンとテキストの間隔: デザイントークンで自動調整
- アイコンサイズ: ボタンサイズに応じて自動調整

**右アイコン（まれ）:**
```typescript
<Button>
  詳細 <RightOutlined />
</Button>
```
- 次へ、詳細など進行方向を示す場合

**アイコンのみ:**
```typescript
<Button icon={<SearchOutlined />} />
<Button icon={<SearchOutlined />} shape="circle" />
```
- Tooltip で機能を説明すること

#### 無効状態

```typescript
<Button disabled>保存</Button>
```

- `disabled` プロパティで制御
- 背景色、テキスト色、ボーダー色は自動的に適用
- 無効化条件の例:
  - 選択行がない（一括操作ボタン）
  - 入力が不完全（保存ボタン）
  - 権限がない（管理者専用ボタン）

#### ローディング状態

```typescript
<Button loading>送信中</Button>
```

- `loading` プロパティで制御
- スピナーアイコンが自動表示
- ボタンは無効化（クリック不可）
- 非同期処理中に使用（API呼び出し、ファイルアップロードなど）

#### 配置ルール

**ツールバー配置:**
```
┌─────────────────────────────────────────────────────┐
│ [検索バー] [詳細検索]    [CSV↑] [CSV↓] [追加] [リロード] │
└─────────────────────────────────────────────────────┘
```

**左側:**
- 検索・フィルタUI（Input、Select）
- 詳細検索ボタン

**右側:**
- CSVアップロード
- CSVダウンロード
- 追加・新規作成
- リロード・リフレッシュ

**テーブル行内配置:**
```
┌───────────────────────────────────────────────┐
│ ID | 名前 | ステータス | [編集] [詳細] [切替] │
└───────────────────────────────────────────────┘
```

**右端カラム:**
- 編集ボタン（パターン2 + size="small"）
- 詳細ボタン（パターン5 + size="small"）
- 状態切替ボタン（パターン4 + size="small"）

**モーダルフッター配置:**
```
┌────────────────────────────────────────┐
│ [クリア]          [キャンセル] [保存] │
└────────────────────────────────────────┘
```

**左側:**
- クリア、リセットなど補助的なボタン（default）

**右側:**
- キャンセル（default）
- 保存・確定（primary）

**配置:** `display: flex; justify-content: space-between`

#### パターン選択ガイド

**データ操作系:**

| 操作 | パターン | type | アイコン |
|------|---------|------|---------|
| 新規作成（重要） | パターン1 | primary | PlusOutlined |
| 追加（一般） | パターン2 | default | PlusOutlined |
| 編集（ツールバー） | パターン1 | primary | EditOutlined |
| 編集（行内） | パターン2 small | default small | EditOutlined |
| 削除 | パターン3 | primary danger | DeleteOutlined |
| 非アクティブ化 | パターン4 | default danger | なし |
| アクティブ化 | パターン4 | default | CheckOutlined |
| ステータス切替 | パターン4 | default | なし |

**ファイル操作系:**

| 操作 | パターン | type | アイコン |
|------|---------|------|---------|
| アップロード | パターン1 | primary | UploadOutlined |
| ダウンロード | パターン1 | primary | DownloadOutlined |
| CSVアップロード | パターン2 | default | UploadOutlined |
| CSVダウンロード | パターン2 | default | DownloadOutlined |

**表示制御系:**

| 操作 | パターン | type | アイコン |
|------|---------|------|---------|
| リフレッシュ（重要） | パターン1 | primary | ReloadOutlined |
| リロード（一般） | パターン2 | default | ReloadOutlined |
| 詳細検索 | パターン1 | primary | SearchOutlined |
| 詳細表示 | パターン5 | link | EyeOutlined |

**モーダル制御系:**

| 操作 | パターン | type | アイコン | 配置 |
|------|---------|------|---------|------|
| 保存・確定 | パターン1 | primary | SaveOutlined | 右側 |
| 次へ | パターン1 | primary | ArrowRightOutlined | 右側 |
| キャンセル | パターン2 | default | CloseOutlined | 左側 |
| 戻る | パターン2 | default | ArrowLeftOutlined | 左側 |
| クリア | パターン2 | default | ClearOutlined | 左側 |

#### 除外パターン（特殊用途）

以下のパターンは標準5パターンから除外されていますが、必要に応じて使用できます：

**Dashed Type（補助的な追加）:**
```typescript
<Button type="dashed" icon={<PlusOutlined />}>項目を追加</Button>
```
- パターン2（一般アクション）の変種
- ボーダーが点線
- 用途: 項目追加、領域追加などプレースホルダー的な追加

**Ghost Type（透明背景）:**
```typescript
<Button type="primary" ghost>アクション</Button>
```
- パターン1（主要アクション）の変種
- 背景が透明、ボーダーとテキストがPrimary色
- 用途: ダークな背景の上で使用、カード内で控えめにしたい主要アクション

**Block Type（全幅ボタン）:**
```typescript
<Button type="primary" block>送信</Button>
```
- パターン1の変種
- 幅が親要素の100%
- 用途: モーダル内、モバイルビュー、フォーム内の送信ボタン

**Button Group（ボタングループ）:**
```typescript
<Button.Group>
  <Button>左</Button>
  <Button>右</Button>
</Button.Group>
```
- パターン2の組み合わせ
- 用途: ページネーション、ビュー切替、ソート順切替

#### アクセシビリティ

**ARIA属性:**
```typescript
// 無効化されたボタン
<Button disabled aria-disabled="true">保存</Button>

// ローディング中のボタン
<Button loading aria-busy="true">送信中</Button>

// トグルボタン
<Button onClick={handleToggle} aria-pressed={isActive}>
  {isActive ? 'アクティブ' : '非アクティブ'}
</Button>

// アイコンのみボタン（ラベルが必須）
<Button icon={<SearchOutlined />} aria-label="検索" />
```

**キーボード操作:**
- **Tab**: 次のボタンにフォーカス移動
- **Shift + Tab**: 前のボタンにフォーカス移動
- **Enter/Space**: ボタンを実行
- **Escape**: モーダル内のキャンセルボタンに相当

#### ベストプラクティス

**DO（推奨）:**
- ✅ 1ページに primary ボタンは1〜2個まで
- ✅ アイコンとテキストを併用して視認性を高める
- ✅ 無効化条件を明確にする（Tooltip で説明）
- ✅ 非同期処理中は loading 状態にする
- ✅ 危険な操作には confirmation modal を表示
- ✅ ホバー時のフィードバックを提供する
- ✅ キーボード操作に対応する

**DON'T（非推奨）:**
- ❌ 同じページに primary ボタンを3個以上配置しない
- ❌ アイコンのみボタンに aria-label を付けないままにしない
- ❌ 無効化されたボタンに理由を説明しない
- ❌ 非同期処理中にユーザーが複数回クリックできる状態にしない
- ❌ 削除など危険な操作を確認なしで実行しない
- ❌ ボタンサイズを統一しない（同じツールバー内で異なるサイズを混在）

### Input（テキスト入力）

#### パターン選択フローチャート

```
入力の目的を判断する
│
├─ 検索・フィルタリング用？
│  └─ YES → パターン2: 検索入力
│           - prefix: SearchOutlined
│           - allowClear必須
│           - 幅: 250px固定
│
├─ 長文（説明文・コメント等）の入力？
│  └─ YES → パターン3: 複数行入力（TextArea）
│           - rows: 4
│
└─ NO → パターン1: 標準入力
         - 通常のフォーム入力
```

#### 標準3パターン

**パターン1: 標準入力**
- 用途: フォーム入力全般
- サイズ: `token.controlHeight`（デフォルト）

```typescript
<Input placeholder="ユーザー名を入力" />
```

**パターン2: 検索入力**
- 用途: 検索・フィルタリング
- 幅: 250px固定（200-300pxの範囲で調整可）
- prefix: SearchOutlined
- allowClear: 必須

```typescript
<Input
  placeholder="検索"
  prefix={<SearchOutlined />}
  style={{ width: 250 }}
  allowClear
/>
```

**パターン3: 複数行入力（TextArea）**
- 用途: 説明文・長文入力
- 行数: 4行固定

```typescript
<Input.TextArea 
  rows={4}
  placeholder="説明を入力"
/>
```

> **注意**: 入力フィールドのスタイルは、Ant Designのデザイントークンにより自動的に適用されます。具体的な色の値は `frontend/src/theme/theme.ts` で定義されています。

#### 特殊な入力タイプ

**パスワード入力:**
```typescript
<Input.Password 
  placeholder="パスワードを入力"
  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
/>
```

**検索入力（Input.Search）:**
```typescript
<Input.Search
  placeholder="検索"
  onSearch={(value) => console.log(value)}
  style={{ width: 250 }}
/>
```

### Select（選択入力）

選択肢から値を選ぶドロップダウンです。

**基本形状:**
- 幅: 150px / 200px / 250px（選択肢の長さに応じて固定幅を推奨）

```typescript
<Select
  placeholder="選択してください"
  style={{ width: 200 }}
  options={[
    { label: '選択肢1', value: '1' },
    { label: '選択肢2', value: '2' },
  ]}
/>

// 複数選択
<Select
  mode="multiple"
  placeholder="複数選択可能"
  style={{ width: 250 }}
/>
```

> **注意**: サイズ、角丸などのスタイルは、Ant Designのデザイントークンにより自動的に適用されます。

### Form（フォーム）

フォーム全体を管理します。

```typescript
<Form size="large" layout="vertical">
  <Form.Item 
    name="username" 
    label="ユーザー名"
    rules={[{ required: true, message: 'ユーザー名を入力してください' }]}
  >
    <Input />
  </Form.Item>
  <Form.Item name="role" label="ロール">
    <Select>
      <Select.Option value="admin">管理者</Select.Option>
      <Select.Option value="user">一般ユーザー</Select.Option>
    </Select>
  </Form.Item>
</Form>
```

### Checkbox / Radio / Switch

**Checkbox:**
```typescript
<Checkbox>オプションを有効にする</Checkbox>

<Checkbox.Group 
  options={['オプション1', 'オプション2', 'オプション3']} 
/>
```

**Radio:**
```typescript
<Radio.Group>
  <Radio value="1">選択肢1</Radio>
  <Radio value="2">選択肢2</Radio>
</Radio.Group>
```

**Radio.Button（ボタンスタイル - 視認性強調）:**

**用途**: 視認性を高めたい重要な選択、2〜5個程度の選択肢

```typescript
import { Radio } from 'antd';

<Radio.Group
  value={selectedValue}
  onChange={(e) => setSelectedValue(e.target.value)}
  optionType="button"
  buttonStyle="solid"
>
  <Radio.Button value="option1">選択肢1</Radio.Button>
  <Radio.Button value="option2">選択肢2</Radio.Button>
  <Radio.Button value="option3">選択肢3</Radio.Button>
</Radio.Group>
```

**buttonStyleの選択:**
- **solid（推奨）**: 選択時に背景色が塗りつぶされる、視認性の高いスタイル
- **outline**: 選択時にアウトラインが強調される、控えめなスタイル

**サイズバリエーション:**
```typescript
// 小サイズ
<Radio.Group optionType="button" buttonStyle="solid" size="small">
  <Radio.Button value="1">小</Radio.Button>
  <Radio.Button value="2">中</Radio.Button>
</Radio.Group>

// 大サイズ
<Radio.Group optionType="button" buttonStyle="solid" size="large">
  <Radio.Button value="1">大</Radio.Button>
  <Radio.Button value="2">特大</Radio.Button>
</Radio.Group>
```

**アイコン付き:**
```typescript
import { AppstoreOutlined, BarsOutlined } from '@ant-design/icons';

<Radio.Group optionType="button" buttonStyle="solid">
  <Radio.Button value="grid">
    <AppstoreOutlined /> グリッド
  </Radio.Button>
  <Radio.Button value="list">
    <BarsOutlined /> リスト
  </Radio.Button>
</Radio.Group>
```

> **注意**: 具体的な色の値は `frontend/src/theme/theme.ts` で定義されています。

**使用シーン:**
- 表示モード切り替え（リスト/グリッド/カード）
- 期間選択（日/週/月/年）
- サイズ選択（S/M/L/XL）
- ステータス選択（有効/無効）

**ベストプラクティス:**
- ✅ 2〜5個程度の選択肢で使用する
- ✅ 短いテキスト（10文字以内）を使用する
- ✅ 重要な選択にはbuttonStyle="solid"を使用する
- ✅ デフォルト値を設定する
- ❌ 6個以上の選択肢で使用しない
- ❌ 長いテキストを使用しない

**Switch:**
```typescript
<Switch 
  checkedChildren="ON" 
  unCheckedChildren="OFF" 
/>
```

### Upload（ファイルアップロード）

#### 標準パターン: ドラッグ&ドロップエリア

**用途**: ビジュアル重視の単一/複数ファイルアップロード

**サイズ仕様:**
- 最小高さ: 180px
- 推奨高さ: 200px
- 幅: 親要素に合わせる（または520px固定）

**基本実装:**
```typescript
import { Upload, message, theme } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Dragger } = Upload;
const { useToken } = theme;

const SingleFileUpload = () => {
  const { token } = useToken();

  const props = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: '.pdf,.png,.jpg,.jpeg',
    beforeUpload: (file) => {
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('ファイルサイズは10MB以下にしてください');
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    onChange: (info) => {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} のアップロードが完了しました`);
      }
    },
  };

  return (
    <Dragger {...props} style={{ minHeight: 200 }}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
      </p>
      <p className="ant-upload-text">
        ファイルをドラッグ&ドロップまたはクリックして選択
      </p>
      <p className="ant-upload-hint">
        対応形式: .pdf, .png, .jpg | 最大サイズ: 10MB
      </p>
    </Dragger>
  );
};
```

**状態:**
- **通常**: デザイントークンの標準色を使用
- **ホバー**: `colorPrimaryHover`でフィードバック
- **ドラッグオーバー**: ボーダー太さ2pxに変更
- **アップロード中**: LoadingOutlinedアイコンで表示
- **成功**: CheckCircleFilled + `colorSuccess`
- **エラー**: CloseCircleFilled + `colorError`

> **注意**: 具体的な色の値は `frontend/src/theme/theme.ts` で定義されています。

**バリデーション:**
```typescript
// ファイルサイズ制限
beforeUpload={(file) => {
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error('ファイルサイズは10MB以下にしてください');
  }
  return isLt10M || Upload.LIST_IGNORE;
}}

// ファイル形式制限
accept=".pdf,.png,.jpg,.jpeg"
```

**複数ファイルアップロード:**
```typescript
<Dragger
  multiple={true}
  fileList={fileList}
  onChange={(info) => setFileList(info.fileList)}
  showUploadList={{
    showRemoveIcon: true,
    showPreviewIcon: true
  }}
>
  {/* ... */}
</Dragger>
```

**ベストプラクティス:**
- ✅ ファイルサイズ制限を明示する
- ✅ 対応ファイル形式を明示する
- ✅ アップロード状態を視覚的にフィードバックする
- ✅ エラーメッセージは具体的に記述する
- ✅ アクセシビリティを考慮する（aria属性、キーボード操作）
- ❌ バリデーションなしでアップロードを許可しない
- ❌ 制限事項を隠さない

---

## データ表示コンポーネント

### Table（テーブル）

データの一覧表示、フィルタリング、ソート、ページングなどの機能を提供します。

#### 基本構造

```typescript
import { Table, Input, Select, Space, Row, Col, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface DataType {
  id: string;
  name: string;
  count: number;
  date: string;
  status: boolean;
}

const columns: ColumnsType<DataType> = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 80,
    align: 'right',  // 数値は右寄せ
    sorter: (a, b) => parseInt(a.id) - parseInt(b.id),
  },
  {
    title: '名前',
    dataIndex: 'name',
    width: 200,
    align: 'left',  // テキストは左寄せ（デフォルト）
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    title: 'ステータス',
    dataIndex: 'status',
    width: 100,
    align: 'center',  // Boolean/バッジは中央寄せ
    render: (status: boolean) => (
      <Badge 
        status={status ? 'success' : 'default'} 
        text={status ? '有効' : '無効'} 
      />
    ),
  },
];

<Table
  columns={columns}
  dataSource={data}
  rowKey="id"
  scroll={{ x: 1200 }}
  pagination={{
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (total) => `全 ${total} 件`,
    pageSizeOptions: ['10', '20', '50', '100'],
  }}
/>
```

#### 列の配置ルール

- **基本は左寄せ** (`align: 'left'` またはデフォルト)
- **数値は右寄せ** (`align: 'right'`)
- **日付は右寄せ** (`align: 'right'`)
- **バッジ・Boolean値は中央寄せ** (`align: 'center'`)

#### フィルタリング

```typescript
<Row gutter={16} style={{ marginBottom: 16 }}>
  <Col flex="400px">
    <Input
      placeholder="検索"
      prefix={<SearchOutlined />}
      allowClear
    />
  </Col>
  <Col flex="150px">
    <Select
      placeholder="カテゴリー"
      allowClear
      style={{ width: '100%' }}
    />
  </Col>
</Row>
```

#### ページング

```typescript
<Table
  pagination={{
    pageSize: 10,  // デフォルト
    showSizeChanger: true,
    showTotal: (total) => `全 ${total} 件`,
    pageSizeOptions: ['10', '20', '50', '100'],
  }}
/>
```

### Typography（テキスト表示）

```typescript
<Typography.Title level={1}>ページタイトル</Typography.Title>
<Typography.Title level={2}>セクションタイトル</Typography.Title>
<Typography.Text type="secondary">補足テキスト</Typography.Text>
<Typography.Text type="danger">エラーメッセージ</Typography.Text>
<Typography.Paragraph>
  段落テキスト
</Typography.Paragraph>
```

### Tag（タグ・ラベル）

```typescript
<Tag color="success">成功</Tag>
<Tag color="error">エラー</Tag>
<Tag color="warning">警告</Tag>
<Tag color="processing">処理中</Tag>
<Tag color="default">デフォルト</Tag>
```

### Badge（バッジ）

```typescript
<Badge count={5}>
  <Avatar shape="square" size="large" />
</Badge>

<Badge status="success" text="有効" />
<Badge status="error" text="エラー" />
<Badge status="default" text="無効" />
```

### Avatar（アバター）

```typescript
<Avatar size={64} icon={<UserOutlined />} />
<Avatar size="large">USER</Avatar>
<Avatar src="/path/to/image.jpg" />
```

### List（リスト）

```typescript
<List
  dataSource={data}
  renderItem={(item) => (
    <List.Item>
      <List.Item.Meta
        avatar={<Avatar src={item.avatar} />}
        title={<a href={item.href}>{item.title}</a>}
        description={item.description}
      />
    </List.Item>
  )}
/>
```

### Tree（ツリー）

```typescript
<Tree
  treeData={[
    {
      title: 'フォルダ1',
      key: '0-0',
      children: [
        { title: 'サブフォルダ1', key: '0-0-0' },
        { title: 'サブフォルダ2', key: '0-0-1' },
      ],
    },
  ]}
/>

// DirectoryTree（フォルダー専用）
<DirectoryTree
  treeData={treeData}
  onSelect={onSelect}
/>
```

### Divider（区切り線）

```typescript
<Divider />
<Divider orientation="left">左寄せテキスト</Divider>
<Divider type="vertical" />
```

### Image（画像表示）

```typescript
<Image
  width={200}
  src="/path/to/image.jpg"
  preview={{
    visible: previewVisible,
    onVisibleChange: setPreviewVisible,
  }}
/>
```

### Progress（進捗表示）

```typescript
<Progress percent={30} />
<Progress percent={50} status="active" />
<Progress percent={70} status="exception" />
<Progress percent={100} />

// 円形
<Progress type="circle" percent={75} />
```

### Collapse（折りたたみパネル）

```typescript
<Collapse>
  <Collapse.Panel header="パネル1" key="1">
    コンテンツ1
  </Collapse.Panel>
  <Collapse.Panel header="パネル2" key="2">
    コンテンツ2
  </Collapse.Panel>
</Collapse>
```

### Tooltip（ツールチップ）

```typescript
<Tooltip title="ツールチップテキスト">
  <Button>ホバーしてください</Button>
</Tooltip>
```

### Popover（ポップオーバー）

```typescript
<Popover 
  content={<div>詳細情報</div>}
  title="タイトル"
>
  <Button>クリック</Button>
</Popover>
```

---

## フィードバックコンポーネント

### Modal（モーダル）

```typescript
<Modal
  title="タイトル"
  open={open}
  onOk={handleOk}
  onCancel={handleCancel}
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

### Drawer（ドロワー）

```typescript
<Drawer
  title="タイトル"
  placement="right"
  onClose={onClose}
  open={open}
  width={720}
>
  コンテンツ
</Drawer>
```

### message（トーストメッセージ）

```typescript
import { message } from 'antd';

// 成功
message.success('保存しました');

// エラー
message.error('エラーが発生しました');

// 警告
message.warning('警告メッセージ');

// 情報
message.info('情報メッセージ');

// ローディング
message.loading('読み込み中...', 2.5);
```

### Alert（警告・情報表示）

```typescript
<Alert message="成功メッセージ" type="success" showIcon closable />
<Alert message="エラーメッセージ" type="error" showIcon closable />
<Alert message="警告メッセージ" type="warning" showIcon closable />
<Alert message="情報メッセージ" type="info" showIcon closable />

// 説明付き
<Alert
  message="警告"
  description="詳細な説明がここに表示されます"
  type="warning"
  showIcon
/>
```

### Spin（ローディングスピナー）

```typescript
<Spin />
<Spin size="small" />
<Spin size="large" />

// コンテンツをラップ
<Spin spinning={loading}>
  <div>ローディング中の内容</div>
</Spin>

// テキスト付き
<Spin tip="読み込み中...">
  <div>コンテンツ</div>
</Spin>
```

### notification（通知）

```typescript
import { notification } from 'antd';

// 成功通知
notification.success({
  message: '成功',
  description: '操作が正常に完了しました',
});

// エラー通知
notification.error({
  message: 'エラー',
  description: 'エラーが発生しました',
});

// 警告通知
notification.warning({
  message: '警告',
  description: '注意が必要です',
});

// 情報通知
notification.info({
  message: '情報',
  description: 'お知らせがあります',
});
```

### Popconfirm（確認ポップアップ）

```typescript
<Popconfirm
  title="削除してもよろしいですか？"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  okText="はい"
  cancelText="いいえ"
>
  <Button danger>削除</Button>
</Popconfirm>
```

### Result（結果ページ）

```typescript
<Result
  status="success"
  title="処理が完了しました"
  subTitle="注文番号: 2023001234"
  extra={[
    <Button type="primary" key="console">
      ホームへ戻る
    </Button>,
  ]}
/>

<Result
  status="error"
  title="エラーが発生しました"
  subTitle="再度お試しください"
/>

<Result
  status="404"
  title="404"
  subTitle="ページが見つかりません"
/>
```

### Empty（空状態）

```typescript
<Empty 
  description="データがありません"
  image={Empty.PRESENTED_IMAGE_SIMPLE}
/>

// カスタム画像とアクション
<Empty
  description="プロジェクトがありません"
  image="/path/to/empty.svg"
>
  <Button type="primary">新規作成</Button>
</Empty>
```

### Skeleton（スケルトンスクリーン）

```typescript
<Skeleton active />
<Skeleton avatar paragraph={{ rows: 4 }} />

// カスタムスケルトン
<Skeleton.Button active />
<Skeleton.Avatar active />
<Skeleton.Input active />
```

---

## ナビゲーションコンポーネント

### Tabs（タブ）

```typescript
<Tabs
  defaultActiveKey="1"
  items={[
    {
      key: '1',
      label: 'タブ1',
      children: 'コンテンツ1',
    },
    {
      key: '2',
      label: 'タブ2',
      children: 'コンテンツ2',
    },
  ]}
/>

// カード型
<Tabs type="card" items={items} />
```

### Menu（メニュー）

```typescript
<Menu
  mode="inline"
  defaultSelectedKeys={['1']}
  items={[
    {
      key: '1',
      icon: <UserOutlined />,
      label: 'メニュー1',
    },
    {
      key: 'sub1',
      label: 'サブメニュー',
      icon: <SettingOutlined />,
      children: [
        { key: '2', label: 'サブ1' },
        { key: '3', label: 'サブ2' },
      ],
    },
  ]}
/>
```

### Dropdown（ドロップダウン）

```typescript
<Dropdown
  menu={{
    items: [
      { key: '1', label: 'メニュー1' },
      { key: '2', label: 'メニュー2' },
      { type: 'divider' },
      { key: '3', label: 'メニュー3' },
    ],
  }}
>
  <Button>
    ドロップダウン <DownOutlined />
  </Button>
</Dropdown>
```

### Breadcrumb（パンくずリスト）

```typescript
<Breadcrumb
  items={[
    { title: 'ホーム' },
    { title: <a href="">カテゴリ</a> },
    { title: '現在のページ' },
  ]}
/>
```

### Pagination（ページネーション）

```typescript
<Pagination
  current={1}
  total={50}
  pageSize={10}
  showSizeChanger
  showTotal={(total) => `全 ${total} 件`}
  pageSizeOptions={['10', '20', '50', '100']}
/>
```

### Steps（ステップ）

```typescript
<Steps
  current={1}
  items={[
    {
      title: 'ステップ1',
      description: '完了',
    },
    {
      title: 'ステップ2',
      description: '進行中',
    },
    {
      title: 'ステップ3',
      description: '待機中',
    },
  ]}
/>
```

---

## アクセシビリティ

Ant Designは標準でアクセシビリティに対応していますが、以下の点に注意してください。

### コントラスト比

- **通常テキスト**: 最低 4.5:1
- **大きなテキスト**（18px以上）: 最低 3:1
- **UI要素**（ボタン、アイコン等）: 最低 3:1

### フォーカス表示

- Ant Designが自動的にフォーカススタイルを適用
- フォーカスアウトライン色: `colorPrimary`
- アウトライン幅: `2px`

### キーボード操作

- **Tab**: 次の要素にフォーカス移動
- **Shift + Tab**: 前の要素にフォーカス移動
- **Enter**: ボタン実行
- **Escape**: モーダル閉じる
- **矢印キー**: メニュー/リスト操作
- **Space**: チェックボックス/ラジオボタン切り替え

### スクリーンリーダー対応

- Ant Designコンポーネントは標準でARIA属性をサポート
- 追加のARIAラベルが必要な場合は適宜追加
- フォーム要素は自動的にラベル関連付け

```typescript
// アイコンのみボタン（ラベルが必要）
<Button icon={<SearchOutlined />} aria-label="検索" />

// トグルボタン
<Button onClick={handleToggle} aria-pressed={isActive}>
  {isActive ? 'アクティブ' : '非アクティブ'}
</Button>
```

---

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
```

### アニメーション対象

- ホバー状態: `0.2s ease-out`
- ボタン押下: `0.1s ease-in`
- モーダル表示/非表示: `0.3s ease-in-out`
- ドロップダウン: `0.2s ease-out`
- ページ遷移: `0.3s ease-in-out`

---

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

---

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
  "common": {
    "save": "保存",
    "cancel": "キャンセル",
    "delete": "削除"
  },
  "button": {
    "new": "新規作成",
    "edit": "編集",
    "search": "検索"
  }
}
```

---

## ベストプラクティス

### DO（推奨）

✅ デザイントークンを常に使用する  
✅ コンポーネントのpropsでスタイルを制御する  
✅ 一貫したスペーシングを維持する（8の倍数）  
✅ 適切なコンポーネントを選択する  
✅ アクセシビリティに配慮する  
✅ レスポンシブデザインを考慮する  
✅ 適切なローディング状態を表示する  
✅ エラーハンドリングを実装する  

### DON'T（非推奨）

❌ インラインスタイルでハードコーディングしない  
❌ 具体的なピクセル値を直接指定しない  
❌ カスタムカラーを乱用しない  
❌ 同じページに複数のprimaryボタンを配置しない  
❌ アクセシビリティを無視しない  
❌ ユーザーフィードバックを省略しない  

---

## 参考資料

- [Ant Design v6 公式ドキュメント](https://ant.design/)
- [Ant Design Design Values](https://ant.design/docs/spec/values)
- [デザイントークンリファレンス](https://ant.design/docs/react/customize-theme)
- [コンポーネントAPI](https://ant.design/components/overview/)

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-06 | 初版作成（54個のポリシーファイルを統合） | Development Team |

---

## 付録: UI要素一覧

### カテゴリ別統計

| カテゴリ | UI要素数 |
|---------|---------|
| レイアウト | 5種類 |
| データ表示 | 13種類 |
| データ入力 | 10種類 |
| フィードバック | 9種類 |
| ナビゲーション | 6種類 |
| その他 | 3種類 |
| **合計** | **46種類** |

### 使用頻度別

**★★★★★（必須）:**
- Layout, Card, Space, Typography, Table, Tag, Button, Input, Select, Form, Modal, message

**★★★★☆（推奨）:**
- Row/Col, Tree, Avatar, Input.TextArea, Upload, Alert, Spin, Menu, Tabs, Dropdown, Pagination

**★★★☆☆（オプション）:**
- Flex, Badge, List, Progress, Checkbox, Radio, Switch, Drawer, notification, Popconfirm, Breadcrumb

**★★☆☆☆（特殊用途）:**
- Image, Collapse, Tooltip, Popover, Result, Skeleton, Steps

---

**このドキュメントは、MaiML Viewerの全UIコンポーネントの使用方法を統一的に定義しています。新しい画面を開発する際は、このポリシーに従って一貫性のあるUIを実装してください。**


