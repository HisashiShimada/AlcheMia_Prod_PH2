# 要素間スペーシングポリシー

## 概要

MaiML Viewerでは、Ant Design v6のデザインシステムに基づき、**8pxを基準単位とした一貫性のあるスペーシング**を採用します。このポリシーは、全画面における要素間の余白（マージン・パディング）を標準化し、視覚的な秩序と可読性を向上させます。

---

## 基本原則

### 8px基準システム
すべてのスペーシングは **8pxの倍数** を使用します。

```typescript
基準値: 8px
推奨値: 8px, 12px, 16px, 20px, 24px, 32px, 48px, 64px
```

### トークン体系
```typescript
// Ant Design Design Tokens
marginXS: 8,      // 極小マージン
marginSM: 12,     // 小マージン
margin: 16,       // 標準マージン（デフォルト）
marginMD: 20,     // 中マージン
marginLG: 24,     // 大マージン
marginXL: 32,     // 特大マージン
marginXXL: 48     // 超特大マージン
```

---

## 標準スペーシングパターン

### パターン1: 密接な関係（8px）
**用途**: 同一グループ内の密接に関連する要素

**適用箇所**:
- ラベルと入力フィールド間
- アイコンとテキスト間
- チェックボックスとラベル間
- フォーム内の連続する入力フィールド（縦方向）

**実装**:
```tsx
<Space direction="vertical" size={8}>
  <div>ラベル</div>
  <Input />
</Space>
```

**ピクセル値**: `8px` (`token.marginXS`)

---

### パターン2: 関連する要素（16px）
**用途**: 同一セクション内の関連する要素グループ

**適用箇所**:
- フォームグループ間
- カード内のセクション間
- ボタングループ内のボタン間（横方向）
- テーブルと検索フィールド間

**実装**:
```tsx
<Space direction="vertical" size={16}>
  <FormGroup1 />
  <FormGroup2 />
</Space>
```

**ピクセル値**: `16px` (`token.margin`)

---

### パターン3: 明確に分離された要素（24px）
**用途**: 異なるセクション・機能グループの分離

**適用箇所**:
- ページ内の主要セクション間
- カードコンポーネント間（縦方向）
- タブコンテンツとタブバー間
- テーブルとページネーション間

**実装**:
```tsx
<Space direction="vertical" size={24}>
  <Section1 />
  <Section2 />
</Space>
```

**ピクセル値**: `24px` (`token.marginLG`)

---

### パターン4: 大きく分離された要素（32px）
**用途**: 大きなコンテンツブロック間の分離

**適用箇所**:
- ページヘッダーとメインコンテンツ間
- メインコンテンツとフッター間
- モーダルヘッダーとボディ間
- 大きなカード間

**実装**:
```tsx
<div style={{ marginBottom: 32 }}>
  <PageHeader />
</div>
<MainContent />
```

**ピクセル値**: `32px` (`token.marginXL`)

---

## コンテキスト別スペーシング

### フォーム要素

#### 垂直スペーシング
| 要素間 | スペーシング | 用途 |
|--------|------------|------|
| ラベル - 入力フィールド | **4px** | フォームアイテム内 |
| 入力フィールド - 入力フィールド | **8px** | 同一グループ内 |
| フォームグループ - フォームグループ | **16px** | 異なるグループ |
| フォーム - ボタン | **24px** | アクションエリア分離 |

#### 水平スペーシング
| 要素間 | スペーシング | 用途 |
|--------|------------|------|
| ラベル - 入力フィールド | **8px** | インラインフォーム |
| ボタン - ボタン | **8px** | 同一優先度 |
| プライマリボタン - セカンダリボタン | **12px** | 異なる優先度 |

**実装例**:
```tsx
<Form layout="vertical">
  <Space direction="vertical" size={8}>
    {/* 同一グループ */}
    <Form.Item label="ユーザー名">
      <Input />
    </Form.Item>
    <Form.Item label="メールアドレス">
      <Input />
    </Form.Item>
  </Space>
  
  <div style={{ marginTop: 24 }}>
    {/* アクションエリア */}
    <Space size={12}>
      <Button type="primary">保存</Button>
      <Button>キャンセル</Button>
    </Space>
  </div>
</Form>
```

---

### カードレイアウト

#### カード間スペーシング
```typescript
// グリッドレイアウト
<Row gutter={[16, 16]}>  // 水平16px、垂直16px
  <Col span={8}><Card /></Col>
  <Col span={8}><Card /></Col>
  <Col span={8}><Card /></Col>
</Row>

// 縦並び
<Space direction="vertical" size={24}>
  <Card />
  <Card />
  <Card />
</Space>
```

#### カード内部スペーシング
| 要素 | パディング | 備考 |
|------|----------|------|
| カードヘッダー | **24px** | 上下左右 |
| カードボディ | **24px** | 上下左右 |
| カード内セクション間 | **16px** | 垂直マージン |

---

### テーブルレイアウト

#### テーブル周辺スペーシング
| 要素間 | スペーシング | 用途 |
|--------|------------|------|
| 検索フィールド - テーブル | **16px** | フィルタエリア |
| テーブル - ページネーション | **16px** | 下部ナビゲーション |
| タイトル - テーブル | **16px** | ヘッダー分離 |

**実装例**:
```tsx
<Space direction="vertical" size={16} style={{ width: '100%' }}>
  <Input.Search placeholder="検索" style={{ width: 250 }} />
  <Table dataSource={data} columns={columns} />
  <Pagination total={100} />
</Space>
```

---

### モーダル・ドロワー

#### 内部スペーシング
| 要素 | パディング/マージン | 備考 |
|------|------------------|------|
| モーダルヘッダー | **16px 24px** | 上下16px、左右24px |
| モーダルボディ | **24px** | 上下左右 |
| モーダルフッター | **10px 16px** | 上下10px、左右16px |
| セクション間 | **16px** | ボディ内の垂直マージン |

---

### ページレイアウト

#### ページ全体構造
```typescript
// ページコンテナ
<div style={{ 
  margin: '24px 16px',    // 外側マージン
  padding: 24,            // 内側パディング
  background: '#fff' 
}}>
  <PageHeader />          // ヘッダー
  <div style={{ marginTop: 32 }}>
    <MainContent />       // メインコンテンツ
  </div>
</div>
```

#### セクション間スペーシング
| 要素間 | スペーシング | 用途 |
|--------|------------|------|
| ヘッダー - コンテンツ | **32px** | ページ分離 |
| セクション - セクション | **24px** | コンテンツブロック |
| コンテンツ - フッター | **32px** | ページ下部分離 |

---

## Space コンポーネント

Ant DesignのSpaceコンポーネントを使用して、要素間のスペーシングを実装します。

### サイズ定義
```typescript
// 定義済みサイズ
<Space size="small">   // 8px
<Space size="middle">  // 16px（デフォルト）
<Space size="large">   // 24px

// カスタムサイズ（数値指定）
<Space size={12}>      // 12px
<Space size={32}>      // 32px
```

### 使用例

#### 垂直配置（縦方向）
```tsx
<Space direction="vertical" size={16} style={{ width: '100%' }}>
  <Card title="セクション1">コンテンツ1</Card>
  <Card title="セクション2">コンテンツ2</Card>
  <Card title="セクション3">コンテンツ3</Card>
</Space>
```

#### 水平配置（横方向）
```tsx
<Space size={12}>
  <Button type="primary">保存</Button>
  <Button>キャンセル</Button>
  <Button type="text">削除</Button>
</Space>
```

#### ネスト構造
```tsx
<Space direction="vertical" size={24}>
  {/* セクション1 */}
  <div>
    <h3>基本情報</h3>
    <Space direction="vertical" size={8}>
      <Input placeholder="名前" />
      <Input placeholder="メール" />
    </Space>
  </div>
  
  {/* セクション2 */}
  <div>
    <h3>詳細情報</h3>
    <Space direction="vertical" size={8}>
      <Input placeholder="電話番号" />
      <Input placeholder="住所" />
    </Space>
  </div>
</Space>
```

---

## CSS直接指定

Spaceコンポーネントが使用できない場合、CSS直接指定を使用します。

### マージン指定
```tsx
// 下マージン
<div style={{ marginBottom: 16 }}>要素1</div>

// 上マージン
<div style={{ marginTop: 24 }}>要素2</div>

// 左右マージン
<div style={{ marginLeft: 12, marginRight: 12 }}>要素3</div>
```

### パディング指定
```tsx
// 全方向
<div style={{ padding: 24 }}>コンテンツ</div>

// 個別指定
<div style={{ paddingTop: 16, paddingBottom: 16 }}>コンテンツ</div>

// 短縮記法
<div style={{ padding: '16px 24px' }}>上下16px、左右24px</div>
```

---

## レスポンシブスペーシング

### ブレークポイント別調整
```tsx
import { useToken } from 'antd';

const { token } = useToken();

// モバイル: 小さめのスペーシング
<Space size={token.marginSM}>  // 12px

// デスクトップ: 標準スペーシング
<Space size={token.margin}>    // 16px

// 大画面: 大きめのスペーシング
<Space size={token.marginLG}>  // 24px
```

### 条件付きスペーシング
```tsx
import { Grid } from 'antd';

const { useBreakpoint } = Grid;
const screens = useBreakpoint();

<Space 
  direction="vertical" 
  size={screens.md ? 24 : 16}  // タブレット以上: 24px、モバイル: 16px
>
  <Card />
  <Card />
</Space>
```

---

## アンチパターン（避けるべき実装）

### ❌ 不適切な例

#### 1. 8pxの倍数でない値
```tsx
// ❌ 悪い例
<div style={{ marginBottom: 15 }}>  // 15pxは基準外
<div style={{ marginBottom: 18 }}>  // 18pxは基準外
<div style={{ marginBottom: 25 }}>  // 25pxは基準外
```

#### 2. 過度な余白
```tsx
// ❌ 悪い例
<Space size={64}>  // 過度に大きい（特別な理由がない限り使用しない）
  <Button>保存</Button>
  <Button>キャンセル</Button>
</Space>
```

#### 3. 不十分な余白
```tsx
// ❌ 悪い例
<Space size={4}>  // 小さすぎる（8pxが最小推奨値）
  <Card />
  <Card />
</Space>
```

#### 4. 不統一なスペーシング
```tsx
// ❌ 悪い例
<div style={{ marginBottom: 10 }}>セクション1</div>
<div style={{ marginBottom: 15 }}>セクション2</div>
<div style={{ marginBottom: 20 }}>セクション3</div>

// ✅ 良い例: 統一されたスペーシング
<Space direction="vertical" size={16}>
  <div>セクション1</div>
  <div>セクション2</div>
  <div>セクション3</div>
</Space>
```

---

## ベストプラクティス

### ✅ 推奨される実装

#### 1. Spaceコンポーネントの優先使用
```tsx
// ✅ 良い例: Spaceコンポーネント
<Space direction="vertical" size={16}>
  <Input />
  <Input />
  <Input />
</Space>
```

#### 2. トークン値の使用
```tsx
// ✅ 良い例: デザイントークン
import { useToken } from 'antd';

const { token } = useToken();

<div style={{ marginBottom: token.marginLG }}>
  コンテンツ
</div>
```

#### 3. 一貫性のある階層構造
```tsx
// ✅ 良い例: 階層的なスペーシング
<Space direction="vertical" size={32}>  // ページレベル
  <Section1>
    <Space direction="vertical" size={16}>  // セクションレベル
      <Card />
      <Card />
    </Space>
  </Section1>
  
  <Section2>
    <Space direction="vertical" size={16}>
      <Form>
        <Space direction="vertical" size={8}>  // フォームレベル
          <Input />
          <Input />
        </Space>
      </Form>
    </Space>
  </Section2>
</Space>
```

#### 4. グリッドシステムとの併用
```tsx
// ✅ 良い例: Row/Colとgutter
<Row gutter={[16, 24]}>  // 水平16px、垂直24px
  <Col xs={24} md={12} lg={8}>
    <Card />
  </Col>
  <Col xs={24} md={12} lg={8}>
    <Card />
  </Col>
  <Col xs={24} md={12} lg={8}>
    <Card />
  </Col>
</Row>
```

---

## クイックリファレンス

### スペーシング値一覧
| トークン | ピクセル値 | 用途 |
|---------|----------|------|
| `marginXS` | **8px** | 密接な関係（ラベル-入力、アイコン-テキスト） |
| `marginSM` | **12px** | ボタン間、小さな区切り |
| `margin` | **16px** | 標準スペーシング（セクション内、カード間） |
| `marginMD` | **20px** | 中程度の区切り |
| `marginLG` | **24px** | 明確な分離（セクション間） |
| `marginXL` | **32px** | 大きな分離（ヘッダー-コンテンツ） |
| `marginXXL` | **48px** | 超大きな分離（特別な場合のみ） |

### Space サイズマッピング
| Spaceサイズ | ピクセル値 | トークン |
|-----------|----------|---------|
| `small` | **8px** | `marginXS` |
| `middle` | **16px** | `margin` |
| `large` | **24px** | `marginLG` |

### コンテキスト別推奨値
| コンテキスト | 推奨スペーシング |
|------------|---------------|
| フォーム項目間 | **8px** |
| フォームグループ間 | **16px** |
| カード間（縦） | **24px** |
| カード間（横） | **16px** |
| セクション間 | **24px** |
| ページ構造（大区分） | **32px** |
| ボタン間（同一優先度） | **8px** |
| ボタン間（異なる優先度） | **12px** |
| テーブル-検索 | **16px** |
| テーブル-ページネーション | **16px** |

---

## まとめ

### 覚えておくべき3つのポイント

1. **8pxを基準単位として使用する**
   - すべてのスペーシングは8pxの倍数
   - 推奨値: 8px, 12px, 16px, 24px, 32px

2. **Spaceコンポーネントを優先的に使用する**
   - `small` (8px), `middle` (16px), `large` (24px)
   - 一貫性のある実装が容易

3. **コンテキストに応じた適切な値を選択する**
   - 密接な関係: 8px
   - 関連する要素: 16px
   - 明確な分離: 24px
   - 大きな分離: 32px

これらのルールに従うことで、視覚的に秩序立った、読みやすく、保守性の高いUIを実現できます。
