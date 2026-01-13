# ボタン形状ポリシー

## 標準5パターン

### パターン1: 主要アクション
**用途**: ページ内で最も重要なアクション（保存、検索、新規作成など）
- type: `primary`
- 高さ: `token.controlHeight` (32px)
- フォントサイズ: `token.fontSize` (14px)
- 角丸: `token.borderRadius` (8px)
- パディング: 左右 `token.controlPaddingHorizontal` (15px)
- 背景色: 用途に応じた配色（後述）
- テキスト色: `#ffffff`
- アイコンサイズ: 14px
- 配置: ツールバー右側、モーダルフッター右側

**配色バリエーション:**
- Primary色（赤）: 編集、検索、指示送信、保存、確定
- Success色（緑）: 新規作成、アップロード、チェックイン
- Info色（青）: ダウンロード、公開
- Warning色（オレンジ）: チェックアウト、保留

---

### パターン2: 一般アクション
**用途**: 通常の操作（追加、リロード、詳細など）
- type: `default`
- 高さ: `token.controlHeight` (32px)
- フォントサイズ: `token.fontSize` (14px)
- 角丸: `token.borderRadius` (8px)
- パディング: 左右 `token.controlPaddingHorizontal` (15px)
- 背景色: `token.colorBgContainer` (#ffffff)
- ボーダー: 1px solid `token.colorBorder`
- テキスト色: `token.colorText` (#212121)
- アイコンサイズ: 14px
- 配置: ツールバー左側〜中央、テーブル行内

**ホバー時:**
- ボーダー色: `token.colorPrimaryHover`
- テキスト色: `token.colorPrimaryHover`

---

### パターン3: 危険アクション
**用途**: 削除、非アクティブ化など取り返しのつかない操作
- type: `primary` + `danger`（重要な削除）または `default` + `danger`（一般的な無効化）
- 高さ: `token.controlHeight` (32px)
- フォントサイズ: `token.fontSize` (14px)
- 角丸: `token.borderRadius` (8px)
- パディング: 左右 `token.controlPaddingHorizontal` (15px)
- アイコンサイズ: 14px
- 配置: ツールバー右側、テーブル行内

**配色:**
- `primary` + `danger`: 背景色 `token.colorError` (#d32f2f)、テキスト色 `#ffffff`
- `default` + `danger`: 背景色 `#ffffff`、ボーダー・テキスト色 `token.colorError`

---

### パターン4: テーブル行内アクション
**用途**: テーブル各行の操作（編集、詳細、状態切替など）
- type: `default` または `link`
- サイズ: `small`
- 高さ: `token.controlHeightSM` (24px)
- フォントサイズ: `token.fontSizeSM` (12px)
- 角丸: `token.borderRadiusSM` (4px)
- パディング: 左右 `token.controlPaddingHorizontalSM` (7px)
- アイコンサイズ: 12px
- 配置: テーブル行の右端カラム

**使い分け:**
- `default` + `small`: 編集、状態切替など
- `link` + `small`: 詳細表示、ダイアログを開くリンク

---

### パターン5: テキストリンク
**用途**: 軽量なアクション、インラインリンク
- type: `text` または `link`
- 高さ: 制約なし（テキストに合わせる）
- フォントサイズ: `token.fontSize` (14px)
- パディング: 最小限
- 背景色: `transparent`
- テキスト色: `token.colorPrimary`
- アイコンサイズ: 14px
- 配置: テキスト中、カード内、ダイアログ内

**使い分け:**
- `text`: ホバー時に背景色が変わる
- `link`: 下線付きリンク風（ホバー時に色が変わる）

---

## 共通仕様（全パターン）

### サイズバリエーション

| サイズ | プロパティ | 高さ | フォントサイズ | パディング左右 | 用途 |
|--------|-----------|------|---------------|---------------|------|
| `large` | size="large" | 40px | 16px | 15px | ログイン画面、重要なCTA |
| `middle` | （デフォルト） | 32px | 14px | 15px | 通常のボタン（標準） |
| `small` | size="small" | 24px | 12px | 7px | テーブル行内、コンパクトなUI |

### アイコン配置

**左アイコン（標準）:**
```tsx
<Button icon={<PlusOutlined />}>追加</Button>
```
- アイコンとテキストの間隔: 8px
- アイコンサイズ: ボタンサイズに応じて自動調整（middle: 14px、small: 12px）

**右アイコン（まれ）:**
```tsx
<Button>
  詳細 <RightOutlined />
</Button>
```
- 次へ、詳細など進行方向を示す場合

**アイコンのみ:**
```tsx
<Button icon={<SearchOutlined />} />
```
- shape="circle" と組み合わせることもある
- Tooltip で機能を説明する

### 無効状態

- `disabled` プロパティで制御
- 背景色: `token.colorBgContainerDisabled` (#f5f5f5)
- テキスト色: `token.colorTextDisabled` (#bdbdbd)
- ボーダー色: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- カーソル: `not-allowed`
- 無効化条件の例:
  - 選択行がない（一括操作ボタン）
  - 入力が不完全（保存ボタン）
  - 権限がない（管理者専用ボタン）

### ローディング状態

- `loading` プロパティで制御
- スピナーアイコンが自動表示
- ボタンは無効化（クリック不可）
- 非同期処理中に使用（API呼び出し、ファイルアップロードなど）

---

## パターン選択ガイド

### データ操作系

| 操作 | パターン | type | 配色 | アイコン |
|------|---------|------|------|---------|
| 新規作成（重要） | パターン1 | primary | Success色 | PlusOutlined |
| 追加（一般） | パターン2 | default | 標準 | PlusOutlined |
| 編集（ツールバー） | パターン1 | primary | Primary色 | EditOutlined |
| 編集（行内） | パターン4 | default small | 標準 | EditOutlined |
| 削除 | パターン3 | primary danger | Error色 | DeleteOutlined |
| 非アクティブ化 | パターン3 | default danger | Error色 | DeleteOutlined |
| アクティブ化 | パターン2 | default | Success色 | CheckOutlined |

### ファイル操作系

| 操作 | パターン | type | 配色 | アイコン |
|------|---------|------|------|---------|
| アップロード | パターン1 | primary | Success色 | UploadOutlined |
| ダウンロード | パターン1 | primary | Info色 | DownloadOutlined |
| CSVアップロード | パターン2 | default | 標準 | UploadOutlined |
| CSVダウンロード | パターン2 | default | 標準 | DownloadOutlined |

### 表示制御系

| 操作 | パターン | type | 配色 | アイコン |
|------|---------|------|------|---------|
| リフレッシュ（重要） | パターン1 | primary | Primary色 | ReloadOutlined |
| リロード（一般） | パターン2 | default | 標準 | ReloadOutlined |
| 詳細検索 | パターン1 | primary | Primary色 | SearchOutlined |
| 詳細表示 | パターン5 | link | Primary色 | EyeOutlined |

### ワークフロー制御系

| 操作 | パターン | type | 配色 | アイコン |
|------|---------|------|------|---------|
| チェックアウト | パターン1 | primary | Warning色 | FileTextOutlined |
| チェックイン | パターン1 | primary | Success色 | FileTextOutlined |
| 指示送信 | パターン1 | primary | Primary色 | SendOutlined |
| 公開 | パターン1 | primary | Info色 | GlobalOutlined |
| 選択 | パターン1 | primary | Primary色 | CheckOutlined |
| 確認 | パターン1 | primary | Primary色 | CheckOutlined |

### モーダル制御系

| 操作 | パターン | type | 配色 | アイコン | 配置 |
|------|---------|------|------|---------|------|
| 保存・確定 | パターン1 | primary | Primary色 | SaveOutlined | 右側 |
| 次へ | パターン1 | primary | Primary色 | ArrowRightOutlined | 右側 |
| キャンセル | パターン2 | default | 標準 | CloseOutlined | 左側 |
| 戻る | パターン2 | default | 標準 | ArrowLeftOutlined | 左側 |
| クリア | パターン2 | default | 標準 | ClearOutlined | 左側 |

---

## 配置ルール

### ツールバー配置

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
- 追加・新規作成（primary + Success色）
- リロード・リフレッシュ

**間隔:** Space コンポーネントで `8px`

### テーブル行内配置

```
┌───────────────────────────────────────────────┐
│ ID | 名前 | ステータス | [編集] [詳細] [切替] │
└───────────────────────────────────────────────┘
```

**右端カラム:**
- 編集ボタン
- 詳細ボタン
- 状態切替ボタン

**サイズ:** すべて `small`
**間隔:** `8px`

### モーダルフッター配置

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

---

## 除外されたパターンと標準パターンの対応

以下のパターンは標準5パターンから除外されていますが、基本的には標準パターンの変種として扱います。

### Large Size（ログイン画面専用）

- **対応する標準パターン**: パターン1（主要アクション）の大型版
- **除外理由**: ログイン画面専用で汎用性が低いため
- **形状**: パターン1を大きくしたもの
- **差異**: 高さ40px（vs 32px）、フォント16px（vs 14px）
- **用途**: ログイン画面のログインボタンのみ
- **実装**: `<Button type="primary" size="large">`

### Dashed Type（補助的な追加）

- **対応する標準パターン**: パターン2（一般アクション）の変種
- **除外理由**: 使用頻度が極めて低いため
- **形状**: パターン2と同じ（高さ32px、角丸8px）
- **差異**: ボーダーが点線（dashed）
- **用途**: 項目追加、領域追加などプレースホルダー的な追加
- **実装**: `<Button type="dashed" icon={<PlusOutlined />}>`

### Ghost Type（透明背景）

- **対応する標準パターン**: パターン1（主要アクション）の変種
- **除外理由**: 使用頻度が低く、特殊用途のため
- **形状**: パターン1と同じ（高さ32px、角丸8px）
- **差異**: 背景が透明、ボーダーとテキストが Primary色
- **用途**: ダークな背景の上で使用、カード内で控えめにしたい主要アクション
- **実装**: `<Button type="primary" ghost>`

### Circle/Round Shape（アイコンのみボタン）

- **対応する標準パターン**: パターン2またはパターン5の変種
- **除外理由**: 使用頻度が低く、特殊用途のため
- **形状**: 正方形（circle）または丸型（round）
- **差異**: テキストなし、アイコンのみ
- **用途**: ツールバー右端のアイコンボタン、フローティングアクションボタン
- **実装**: `<Button icon={<SearchOutlined />} shape="circle" />`

### Block Type（全幅ボタン）

- **対応する標準パターン**: パターン1（主要アクション）の変種
- **除外理由**: 使用頻度が低く、特殊用途のため
- **形状**: パターン1と同じ（高さ32px、角丸8px）
- **差異**: 幅が親要素の100%
- **用途**: モーダル内、モバイルビュー、フォーム内の送信ボタン
- **実装**: `<Button type="primary" block>`

### Button Group（ボタングループ）

- **対応する標準パターン**: パターン2またはパターン4の組み合わせ
- **除外理由**: 複数ボタンの組み合わせのため
- **形状**: 複数のボタンが連結された形
- **用途**: ページネーション、ビュー切替、ソート順切替
- **実装**: `<Button.Group><Button>左</Button><Button>右</Button></Button.Group>`

---

## カラートークン一覧

### Primary系（赤）

```tsx
// Primary色（デフォルト）
<Button type="primary">編集</Button>

// ホバー時
colorPrimaryHover: '#E63946'

// 押下時
colorPrimaryActive: '#A50020'
```

### Success系（緑）

```tsx
// Success色
<Button 
  type="primary"
  style={{ 
    backgroundColor: token.colorSuccess,
    borderColor: token.colorSuccess 
  }}
>
  新規作成
</Button>

// ホバー時
colorSuccessHover: '#4caf50'

// 押下時
colorSuccessActive: '#1b5e20'
```

### Info系（青）

```tsx
// Info色
<Button 
  type="primary"
  style={{ 
    backgroundColor: token.colorInfo,
    borderColor: token.colorInfo 
  }}
>
  ダウンロード
</Button>

// ホバー時
colorInfoHover: '#33ACD9'

// 押下時
colorInfoActive: '#007AB3'
```

### Warning系（オレンジ）

```tsx
// Warning色
<Button 
  type="primary"
  style={{ 
    backgroundColor: token.colorWarning,
    borderColor: token.colorWarning 
  }}
>
  チェックアウト
</Button>

// ホバー時
colorWarningHover: '#ff9800'

// 押下時
colorWarningActive: '#e65100'
```

### Error系（赤）

```tsx
// Error色（danger）
<Button type="primary" danger>削除</Button>

// または
<Button 
  type="default"
  style={{ 
    color: token.colorError,
    borderColor: token.colorError 
  }}
>
  非アクティブ化
</Button>

// ホバー時
colorErrorHover: '#e57373'

// 押下時
colorErrorActive: '#c62828'
```

---

## 実装例

### 基本的なツールバー

```tsx
import { Button, Input, Space } from 'antd';
import { 
  SearchOutlined, 
  UploadOutlined, 
  DownloadOutlined,
  PlusOutlined, 
  ReloadOutlined 
} from '@ant-design/icons';

<Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
  <Space size="small">
    <Input 
      prefix={<SearchOutlined />}
      placeholder="検索"
      style={{ width: 250 }}
      allowClear
    />
    <Button type="primary" icon={<SearchOutlined />}>
      詳細検索
    </Button>
  </Space>
  
  <Space size="small">
    <Button icon={<UploadOutlined />}>CSVアップロード</Button>
    <Button icon={<DownloadOutlined />}>CSVダウンロード</Button>
    <Button 
      type="primary" 
      icon={<PlusOutlined />}
      style={{ 
        backgroundColor: token.colorSuccess,
        borderColor: token.colorSuccess 
      }}
    >
      追加
    </Button>
    <Button icon={<ReloadOutlined />}>リロード</Button>
  </Space>
</Space>
```

### テーブル行内ボタン

```tsx
import { Button, Space } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';

// Table columns定義内
{
  title: '操作',
  key: 'action',
  width: 150,
  render: (_, record) => (
    <Space size="small">
      <Button 
        size="small"
        icon={<EditOutlined />}
        onClick={() => handleEdit(record)}
      >
        編集
      </Button>
      <Button 
        size="small"
        type="link"
        icon={<EyeOutlined />}
        onClick={() => handleDetail(record)}
      >
        詳細
      </Button>
      <Button 
        size="small"
        danger={record.is_active}
        onClick={() => handleToggle(record)}
      >
        {record.is_active ? '非アクティブ化' : 'アクティブ化'}
      </Button>
    </Space>
  )
}
```

### モーダルフッター

```tsx
import { Modal, Button, Space } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';

<Modal
  title="編集"
  open={open}
  onCancel={handleCancel}
  footer={
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Button onClick={handleClear}>
        クリア
      </Button>
      <Space size="small">
        <Button onClick={handleCancel} icon={<CloseOutlined />}>
          キャンセル
        </Button>
        <Button 
          type="primary" 
          onClick={handleSave}
          icon={<SaveOutlined />}
          loading={loading}
        >
          保存
        </Button>
      </Space>
    </div>
  }
>
  {/* モーダルコンテンツ */}
</Modal>
```

### ステップ式モーダルフッター

```tsx
import { Button, Space } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined } from '@ant-design/icons';

const footer = (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <Button 
      onClick={handleBack}
      icon={<ArrowLeftOutlined />}
      disabled={currentStep === 0}
    >
      戻る
    </Button>
    <Space size="small">
      <Button onClick={handleCancel}>
        キャンセル
      </Button>
      {currentStep < totalSteps - 1 ? (
        <Button 
          type="primary" 
          onClick={handleNext}
          icon={<ArrowRightOutlined />}
        >
          次へ
        </Button>
      ) : (
        <Button 
          type="primary" 
          onClick={handleComplete}
          icon={<CheckOutlined />}
        >
          選択完了
        </Button>
      )}
    </Space>
  </div>
);
```

### カスタム配色ボタン

```tsx
import { Button, theme } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';

const { token } = theme.useToken();

// Success色（緑）
<Button 
  type="primary"
  icon={<UploadOutlined />}
  style={{ 
    backgroundColor: token.colorSuccess,
    borderColor: token.colorSuccess 
  }}
>
  アップロード
</Button>

// Info色（青）
<Button 
  type="primary"
  icon={<DownloadOutlined />}
  style={{ 
    backgroundColor: token.colorInfo,
    borderColor: token.colorInfo 
  }}
>
  ダウンロード
</Button>

// Warning色（オレンジ）
<Button 
  type="primary"
  style={{ 
    backgroundColor: token.colorWarning,
    borderColor: token.colorWarning 
  }}
>
  チェックアウト
</Button>
```

---

## アクセシビリティ

### キーボード操作

- **Tab**: 次のボタンにフォーカス移動
- **Shift + Tab**: 前のボタンにフォーカス移動
- **Enter/Space**: ボタンを実行
- **Escape**: モーダル内のキャンセルボタンに相当

### フォーカス表示

- Ant Designが自動的にフォーカスアウトライン（2px、Primary色）を適用
- カスタムボタンの場合も必ずフォーカススタイルを実装

### ARIA属性

```tsx
// 無効化されたボタン
<Button disabled aria-disabled="true">
  保存
</Button>

// ローディング中のボタン
<Button loading aria-busy="true">
  送信中
</Button>

// トグルボタン
<Button 
  onClick={handleToggle}
  aria-pressed={isActive}
>
  {isActive ? 'アクティブ' : '非アクティブ'}
</Button>

// アイコンのみボタン（ラベルが必要）
<Button 
  icon={<SearchOutlined />}
  aria-label="検索"
/>
```

### スクリーンリーダー対応

- ボタンテキストは明確に（「詳細」より「ユーザー詳細を表示」）
- アイコンのみボタンには `aria-label` を必ず追加
- 状態変化（loading、disabled）はARIA属性で伝える

---

## ベストプラクティス

### DO（推奨）

✅ 1ページに primary ボタンは1〜2個まで
✅ アイコンとテキストを併用して視認性を高める
✅ 無効化条件を明確にする（Tooltip で説明）
✅ 非同期処理中は loading 状態にする
✅ 危険な操作には confirmation modal を表示
✅ 配色は用途に応じて統一する（Success=作成、Info=取得、Error=削除）
✅ ホバー時のフィードバックを提供する
✅ キーボード操作に対応する

### DON'T（非推奨）

❌ 同じページに primary ボタンを3個以上配置しない
❌ アイコンのみボタンに aria-label を付けないままにしない
❌ 無効化されたボタンに理由を説明しない
❌ 非同期処理中にユーザーが複数回クリックできる状態にしない
❌ 削除など危険な操作を確認なしで実行しない
❌ カスタム配色を乱用しない（トークンを使用）
❌ ボタンサイズを統一しない（同じツールバー内で異なるサイズを混在）
❌ ボタンテキストを省略しすぎない（「詳細」ではなく「詳細表示」）

---

## まとめ

このポリシーに従うことで：
- **一貫性**: 全画面でボタンの見た目と動作が統一される
- **可読性**: ボタンの役割が視覚的に明確になる
- **保守性**: コンポーネント化により変更が容易になる
- **アクセシビリティ**: すべてのユーザーが操作できる
- **UX**: 直感的で使いやすいインターフェースを提供

標準5パターンを基本とし、特殊な用途のみ除外パターンを使用してください。
