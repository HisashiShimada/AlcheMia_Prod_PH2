# 通知バッジ表示ポリシー

## 概要
通知バッジは、未読通知数や新着情報の存在、ステータス状態を視覚的に伝えるために使用します。Ant Designの`Badge`コンポーネントをベースに、3つの標準パターンを定義します。

---

## 標準3パターン

### パターン1: 数値表示バッジ（カウント表示）
**用途**: 未読通知数、未処理タスク数、新着件数の表示

#### 基本仕様
- 背景色: `token.colorError` (#d32f2f)
- テキスト色: `#ffffff`
- フォントサイズ: 12px
- フォントウェイト: 400（normal）
- 高さ: 20px（最小）
- パディング: 左右6px、上下0px
- 角丸: `10px`（完全な楕円形）
- 位置: 親要素の右上に配置（offset: [-5, 5]）

#### 数値表示ルール
- **1-99**: そのまま数値を表示（例: "1", "99"）
- **100以上**: "99+"と表示
- **0**: バッジ非表示

#### サイズバリエーション
- **default（標準）**: 高さ20px、フォントサイズ12px
- **small**: 高さ16px、フォントサイズ10px（アイコン用）

#### 使用例
```tsx
<Badge count={5}>
  <BellOutlined style={{ fontSize: 24 }} />
</Badge>

<Badge count={150} overflowCount={99}>
  <MailOutlined style={{ fontSize: 24 }} />
</Badge>

<Badge count={0} showZero={false}>
  <MessageOutlined style={{ fontSize: 24 }} />
</Badge>
```

---

### パターン2: ドット表示バッジ（新着通知）
**用途**: 新着情報の有無、更新の有無を示す

#### 基本仕様
- 背景色: `token.colorError` (#d32f2f)
- サイズ: 直径6px
- 位置: 親要素の右上に配置（offset: [0, 0]）
- アニメーション: なし（静的表示）

#### 表示ルール
- **新着あり**: ドット表示
- **新着なし**: ドット非表示

#### サイズバリエーション
- **default（標準）**: 直径6px
- **small**: 直径4px（小さなアイコン用）

#### 使用例
```tsx
<Badge dot>
  <NotificationOutlined style={{ fontSize: 24 }} />
</Badge>

<Badge dot>
  <Avatar icon={<UserOutlined />} />
</Badge>

{/* 条件付き表示 */}
<Badge dot={hasNewMessage}>
  <MessageOutlined style={{ fontSize: 24 }} />
</Badge>
```

---

### パターン3: ステータスバッジ（状態表示）
**用途**: オンライン/オフライン状態、処理状態、承認状態の表示

#### 基本仕様
- サイズ: 直径6px
- テキスト: ステータスラベル（オプション）
- テキスト色: `token.colorText` (#212121)
- テキストフォントサイズ: 14px
- 位置: テキストの左側に配置（間隔8px）

#### ステータス色定義
| ステータス | 色 | 用途 |
|-----------|-----|------|
| **success** | `token.colorSuccess` (#2e7d32) | 完了、承認済み、オンライン |
| **processing** | `token.colorInfo` (#0093CF) | 処理中、進行中 |
| **default** | `token.colorTextQuaternary` (#bdbdbd) | オフライン、未設定 |
| **error** | `token.colorError` (#d32f2f) | エラー、却下、期限切れ |
| **warning** | `token.colorWarning` (#ed6c02) | 警告、保留中 |

#### 使用例
```tsx
{/* ドットのみ */}
<Badge status="success" />
<Badge status="processing" />
<Badge status="default" />
<Badge status="error" />
<Badge status="warning" />

{/* テキスト付き */}
<Badge status="success" text="オンライン" />
<Badge status="processing" text="処理中" />
<Badge status="default" text="オフライン" />
<Badge status="error" text="エラー" />
<Badge status="warning" text="警告" />

{/* リスト表示 */}
<Space direction="vertical">
  <Badge status="success" text="承認済み" />
  <Badge status="processing" text="審査中" />
  <Badge status="error" text="却下" />
</Space>
```

---

## 共通仕様（全パターン）

### 色定義

#### パターン1・2: 数値/ドット表示
- 背景色: `token.colorError` (#d32f2f)
- テキスト色: `#ffffff`

#### パターン3: ステータス表示
- success: `token.colorSuccess` (#2e7d32)
- processing: `token.colorInfo` (#0093CF)
- default: `token.colorTextQuaternary` (#bdbdbd)
- error: `token.colorError` (#d32f2f)
- warning: `token.colorWarning` (#ed6c02)

### アニメーション
- **数値バッジ**: 数値変化時にスケールアニメーション（0.3s）
- **ドットバッジ**: アニメーションなし（静的）
- **ステータスバッジ**: processingステータスのみ点滅アニメーション

### レスポンシブ対応
- **デスクトップ**: default サイズ使用
- **モバイル**: small サイズ推奨（タッチ領域を考慮）

---

## パターン選択ガイド

### パターン1（数値表示バッジ）を使用するケース
- ✅ 未読メッセージ数の表示
- ✅ 未処理タスク数の表示
- ✅ カート内の商品数
- ✅ 新着通知件数
- ✅ 承認待ち件数

### パターン2（ドット表示バッジ）を使用するケース
- ✅ 新着情報の有無（件数不要）
- ✅ 更新があることを示す
- ✅ 読み取り済み/未読の区別
- ✅ ユーザーアバターの新着通知
- ✅ メニュー項目の更新通知

### パターン3（ステータスバッジ）を使用するケース
- ✅ オンライン/オフライン状態
- ✅ 処理ステータス（成功/失敗/進行中）
- ✅ 承認状態（承認済み/保留中/却下）
- ✅ タスク状態（完了/進行中/未着手）
- ✅ サービス稼働状態

---

## 配置ルール

### アイコンとの組み合わせ
```tsx
{/* 標準配置: 右上 */}
<Badge count={5}>
  <BellOutlined style={{ fontSize: 24 }} />
</Badge>

{/* カスタムオフセット */}
<Badge count={5} offset={[-10, 10]}>
  <BellOutlined style={{ fontSize: 24 }} />
</Badge>
```

### アバターとの組み合わせ
```tsx
{/* ドットバッジ */}
<Badge dot>
  <Avatar icon={<UserOutlined />} />
</Badge>

{/* 数値バッジ */}
<Badge count={3}>
  <Avatar icon={<UserOutlined />} />
</Badge>
```

### テキスト・ボタンとの組み合わせ
```tsx
{/* スタンドアロン表示 */}
<Badge count={5} />

{/* ボタン内 */}
<Button>
  通知 <Badge count={5} style={{ marginLeft: 8 }} />
</Button>

{/* テキスト横 */}
<Space>
  <span>新着メッセージ</span>
  <Badge count={10} />
</Space>
```

---

## アクセシビリティ

### スクリーンリーダー対応
```tsx
{/* aria-label を使用 */}
<Badge count={5} aria-label="5件の未読通知">
  <BellOutlined style={{ fontSize: 24 }} />
</Badge>

{/* title 属性 */}
<Badge count={5} title="未読メッセージ5件">
  <MailOutlined style={{ fontSize: 24 }} />
</Badge>
```

### キーボード操作
- バッジ自体はフォーカス不可
- 親要素（アイコン、ボタン等）がフォーカス可能であること

### カラーコントラスト
- 背景色とテキスト色のコントラスト比: 4.5:1以上を確保
- error色（#d32f2f）と白色（#ffffff）: 8.0:1（推奨値を満たす）

---

## 使用禁止パターン

### ❌ 避けるべき使い方
- **多色使用**: 数値バッジに異なる色を使用しない（errorカラーで統一）
- **過度なアニメーション**: 点滅や回転アニメーションは避ける
- **極端に大きな数値**: 9999+のような表示は避け、"99+"で統一
- **意味のない0表示**: 件数が0の場合はバッジを非表示にする
- **ステータスバッジの独自色**: 定義された5色以外を使用しない

### ❌ 非推奨の配置
```tsx
{/* 左上配置: 視認性が低い */}
<Badge count={5} offset={[5, 5]}>
  <BellOutlined style={{ fontSize: 24 }} />
</Badge>

{/* バッジの重複: 混乱を招く */}
<Badge count={5}>
  <Badge dot>
    <BellOutlined style={{ fontSize: 24 }} />
  </Badge>
</Badge>
```

---

## 実装例

### ヘッダー通知アイコン
```tsx
import { Badge, Space } from 'antd';
import { BellOutlined, MailOutlined, MessageOutlined } from '@ant-design/icons';

function HeaderNotifications() {
  return (
    <Space size={24}>
      <Badge count={5}>
        <BellOutlined style={{ fontSize: 24, color: '#757575' }} />
      </Badge>
      <Badge count={12} overflowCount={9}>
        <MailOutlined style={{ fontSize: 24, color: '#757575' }} />
      </Badge>
      <Badge dot>
        <MessageOutlined style={{ fontSize: 24, color: '#757575' }} />
      </Badge>
    </Space>
  );
}
```

### ユーザーステータス一覧
```tsx
import { Badge, List, Avatar } from 'antd';

const users = [
  { name: '田中太郎', status: 'success', statusText: 'オンライン' },
  { name: '佐藤花子', status: 'default', statusText: 'オフライン' },
  { name: '鈴木一郎', status: 'processing', statusText: '取り込み中' },
];

function UserStatusList() {
  return (
    <List
      dataSource={users}
      renderItem={(user) => (
        <List.Item>
          <List.Item.Meta
            avatar={
              <Badge dot status={user.status}>
                <Avatar>{user.name[0]}</Avatar>
              </Badge>
            }
            title={user.name}
            description={<Badge status={user.status} text={user.statusText} />}
          />
        </List.Item>
      )}
    />
  );
}
```

### タスクステータス表示
```tsx
import { Badge, Card, Space } from 'antd';

function TaskStatusCard() {
  return (
    <Card title="タスク状況">
      <Space direction="vertical" size="middle">
        <div>
          <Badge status="success" text="完了" />
          <span style={{ marginLeft: 16, color: '#757575' }}>15件</span>
        </div>
        <div>
          <Badge status="processing" text="進行中" />
          <span style={{ marginLeft: 16, color: '#757575' }}>8件</span>
        </div>
        <div>
          <Badge status="error" text="エラー" />
          <span style={{ marginLeft: 16, color: '#757575' }}>2件</span>
        </div>
        <div>
          <Badge status="default" text="未着手" />
          <span style={{ marginLeft: 16, color: '#757575' }}>20件</span>
        </div>
      </Space>
    </Card>
  );
}
```

---

## まとめ

通知バッジは以下の3パターンを使い分けることで、統一感のあるUIを実現します：

1. **数値表示バッジ**: 具体的な件数を表示（未読通知、未処理タスク等）
2. **ドット表示バッジ**: 新着の有無を表示（件数不要な場合）
3. **ステータスバッジ**: 状態を色とテキストで表示（オンライン/オフライン等）

適切なパターンを選択し、ユーザーに分かりやすい情報提示を心がけてください。
