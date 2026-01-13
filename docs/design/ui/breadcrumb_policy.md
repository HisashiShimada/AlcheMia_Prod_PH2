# パンくずリスト形状ポリシー

## 標準3パターン

### パターン1: 標準パンくずリスト（2-4階層）
**用途**: 一般的なナビゲーション
- 高さ: 自動（パディングに依存）
- フォントサイズ: `token.fontSize` (14px)
- セパレーター: `/`（デフォルト）
- アイテム間隔: 8px
- パディング: 上下8px、左右0px
- ホバー時: 背景色なし、テキスト色 `token.colorPrimary`
- 最大階層数: **4階層**
- 最後のアイテム: リンクなし（現在のページ）

**コード例**:
```typescript
<Breadcrumb
  items={[
    { title: 'ホーム', href: '/' },
    { title: 'プロジェクト', href: '/projects' },
    { title: 'プロジェクト詳細', href: '/projects/123' },
    { title: '実験データ' }
  ]}
/>
```

---

### パターン2: アイコン付きパンくずリスト
**用途**: 視認性を高めたいページ
- 高さ: 自動（パディングに依存）
- フォントサイズ: `token.fontSize` (14px)
- セパレーター: `/`
- アイテム間隔: 8px
- パディング: 上下8px、左右0px
- ホバー時: 背景色なし、テキスト色 `token.colorPrimary`
- 最大階層数: **4階層**
- 先頭アイテム: HomeOutlined アイコン（16px）
- 各アイテム: 適切なアイコン（16px）

**コード例**:
```typescript
<Breadcrumb
  items={[
    { title: <><HomeOutlined /> ホーム</>, href: '/' },
    { title: <><FolderOutlined /> プロジェクト</>, href: '/projects' },
    { title: <><FileOutlined /> 実験データ</> }
  ]}
/>
```

---

### パターン3: ドロップダウン付きパンくずリスト（長いパス）
**用途**: 5階層以上の深い階層を持つページ
- 高さ: 自動（パディングに依存）
- フォントサイズ: `token.fontSize` (14px)
- セパレーター: `/`
- アイテム間隔: 8px
- パディング: 上下8px、左右0px
- ホバー時: 背景色なし、テキスト色 `token.colorPrimary`
- 省略表示: 先頭1個 + `...` + 最後2個
- ドロップダウン: 省略された中間階層をメニュー表示

**表示形式**: `ホーム / ... / 親カテゴリ / 現在のページ`

**コード例**:
```typescript
<Breadcrumb
  items={[
    { title: 'ホーム', href: '/' },
    {
      title: '...',
      menu: {
        items: [
          { key: '1', label: '組織管理', href: '/organizations' },
          { key: '2', label: 'プロジェクト', href: '/projects' },
          { key: '3', label: 'プロジェクト詳細', href: '/projects/123' }
        ]
      }
    },
    { title: '実験管理', href: '/experiments' },
    { title: '実験データ詳細' }
  ]}
/>
```

---

## 共通仕様（全パターン）

### 色定義

**通常のリンク**
- テキスト色: `token.colorText` (#212121)
- ホバー時: `token.colorPrimary` (#CF0027)
- アクティブ時: `token.colorPrimaryActive` (#A50020)

**現在のページ（最後のアイテム）**
- テキスト色: `token.colorTextSecondary` (#757575)
- カーソル: default（リンクなし）

**セパレーター**
- 色: `token.colorTextTertiary` (#9e9e9e)
- フォントサイズ: `token.fontSize` (14px)
- マージン: 左右8px

**ドロップダウンメニュー**
- 背景色: `token.colorBgElevated` (#ffffff)
- ボーダー: 1px solid `token.colorBorderSecondary`
- シャドウ: `token.boxShadowSecondary`
- アイテムホバー: 背景色 `token.colorBgTextHover` (#f5f5f5)

### アイコン仕様
- サイズ: 16px
- 色: リンクと同じ（`token.colorText` / ホバー時 `token.colorPrimary`）
- テキストとの間隔: 4px

### レスポンシブ対応
**モバイル（xs, sm）**
- 省略表示を優先: 先頭1個 + `...` + 最後1個
- ドロップダウンで中間階層を表示

**タブレット・デスクトップ（md以上）**
- 4階層まで: 全て表示
- 5階層以上: パターン3を使用

---

## パターン選択

- 2-4階層の一般的なナビゲーション → **パターン1（標準パンくずリスト）**
- 視認性を高めたいページ（ダッシュボード等） → **パターン2（アイコン付き）**
- 5階層以上の深い階層 → **パターン3（ドロップダウン付き）**

---

## 配置ルール

### ページ上部に配置
- Header/SubHeaderの直下
- コンテンツエリアの最上部
- マージン: 上16px、下16px

### カードヘッダー内に配置（非推奨）
- 特別な理由がない限り避ける
- カード内では階層構造が不明確になるため

### Layout例
```typescript
<Layout>
  <Header />
  <SubHeader />
  <Content style={{ padding: '16px 50px' }}>
    {/* パンくずリストをここに配置 */}
    <Breadcrumb items={breadcrumbItems} />
    
    {/* メインコンテンツ */}
    <Card>
      <h1>ページタイトル</h1>
      {/* ... */}
    </Card>
  </Content>
</Layout>
```

---

## アクセシビリティ

### aria属性
```typescript
<Breadcrumb
  aria-label="パンくずリスト"
  items={items}
/>
```

### キーボード操作
- Tab: 次のリンクへ移動
- Shift+Tab: 前のリンクへ移動
- Enter: リンク先へ遷移
- Space: ドロップダウンメニューを開く（...アイテム）

### スクリーンリーダー対応
- 各アイテムに適切なaria-labelを付与
- 最後のアイテムは `aria-current="page"` を付与
- ドロップダウンは `aria-haspopup="menu"` を付与

---

## 使用上の注意

### DO（推奨）
✅ 階層が深い場合はドロップダウンで省略する
✅ 最後のアイテムはリンクなしにする
✅ ホームアイコンは先頭のみに使用する
✅ セパレーターは `/` を使用する（一貫性のため）
✅ モバイルでは簡潔に表示する

### DON'T（非推奨）
❌ 5階層以上を全て表示しない（画面が狭くなる）
❌ 最後のアイテムにリンクを付けない（現在のページのため）
❌ 過度な装飾（背景色、ボーダー等）を避ける
❌ セパレーターを独自のものに変更しない（`>` や `→` など）
❌ アイコンを全てのアイテムに付けない（冗長になる）

---

## 関連コンポーネント

- **Menu**: サイドバーナビゲーション
- **Tabs**: 同階層の切り替え
- **Dropdown**: 省略された階層の表示

---

## 実装例

### 基本的な実装
```typescript
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

const breadcrumbItems = [
  {
    title: <><HomeOutlined /> ホーム</>,
    href: '/'
  },
  {
    title: 'プロジェクト',
    href: '/projects'
  },
  {
    title: 'プロジェクト詳細'
  }
];

<Breadcrumb items={breadcrumbItems} />
```

### ドロップダウン付き実装
```typescript
const breadcrumbItems = [
  {
    title: 'ホーム',
    href: '/'
  },
  {
    title: '...',
    menu: {
      items: [
        {
          key: '1',
          label: '組織管理',
          onClick: () => router.push('/organizations')
        },
        {
          key: '2',
          label: 'プロジェクト',
          onClick: () => router.push('/projects')
        }
      ]
    }
  },
  {
    title: '実験管理',
    href: '/experiments'
  },
  {
    title: '実験データ詳細'
  }
];

<Breadcrumb items={breadcrumbItems} />
```

### Next.jsでの実装（動的ルーティング）
```typescript
'use client';

import { usePathname } from 'next/navigation';
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

export default function DynamicBreadcrumb() {
  const pathname = usePathname();
  
  // パスを分割してパンくずリストを生成
  const pathSegments = pathname.split('/').filter(segment => segment);
  
  const breadcrumbItems = [
    {
      title: <><HomeOutlined /> ホーム</>,
      href: '/'
    },
    ...pathSegments.map((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/');
      const isLast = index === pathSegments.length - 1;
      
      return {
        title: segment,
        href: isLast ? undefined : href
      };
    })
  ];
  
  return <Breadcrumb items={breadcrumbItems} />;
}
