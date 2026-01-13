# ツリー構造表示ポリシー

## 標準3パターン

### パターン1: 標準ツリー
**用途**: 階層データの閲覧・ナビゲーション

- 行の高さ: 32px
- フォントサイズ: `token.fontSize` (14px)
- インデント幅: 24px
- アイコンサイズ: 16px
- 展開/折りたたみアイコン: CaretDownOutlined / CaretRightOutlined
- showLine: false（線を表示しない）
- showIcon: true（フォルダ/ファイルアイコンを表示）
- selectable: true（選択可能）
- multiple: false（単一選択）
- 幅: 親要素に合わせる

**適用例**:
- 組織階層の表示
- カテゴリー階層の表示
- メニュー構造の表示

---

### パターン2: チェックボックスツリー
**用途**: 階層データからの複数選択

- 行の高さ: 32px
- フォントサイズ: `token.fontSize` (14px)
- インデント幅: 24px
- アイコンサイズ: 16px
- 展開/折りたたみアイコン: CaretDownOutlined / CaretRightOutlined
- showLine: false（線を表示しない）
- showIcon: false（フォルダ/ファイルアイコンを非表示）
- checkable: true（チェックボックスを表示）
- checkStrictly: false（親子連動）
- selectable: false（クリックで選択しない）
- 幅: 親要素に合わせる

**適用例**:
- 権限設定（機能の複数選択）
- カテゴリー選択（複数カテゴリー）
- フィルター設定（複数条件）

---

### パターン3: ディレクトリツリー
**用途**: ファイル/フォルダ構造の表示

- 行の高さ: 32px
- フォントサイズ: `token.fontSize` (14px)
- インデント幅: 24px
- アイコンサイズ: 16px
- 展開/折りたたみアイコン: CaretDownOutlined / CaretRightOutlined
- showLine: true（線を表示）
- showIcon: true（フォルダ/ファイルアイコンを表示）
- フォルダアイコン: FolderOutlined / FolderOpenOutlined
- ファイルアイコン: FileOutlined
- selectable: true（選択可能）
- multiple: false（単一選択）
- 幅: 親要素に合わせる

**適用例**:
- ファイルエクスプローラー
- プロジェクト構造の表示
- ドキュメント階層の表示

---

## 共通仕様（全パターン）

### 色定義

**通常**
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)
- アイコン色: `token.colorTextSecondary` (#757575)

**ホバー**
- 背景色: `token.colorBgTextHover` (#f5f5f5)
- テキスト色: `token.colorText` (#212121)
- アイコン色: `token.colorTextSecondary` (#757575)

**選択**
- 背景色: `token.colorPrimaryBg` (#FFF1F3)
- テキスト色: `token.colorPrimary` (#CF0027)
- アイコン色: `token.colorPrimary` (#CF0027)

**無効**
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorTextDisabled` (#bdbdbd)
- アイコン色: `token.colorTextDisabled` (#bdbdbd)

### スペーシング
- ノード間の余白: 0px（隙間なし）
- 左右のパディング: 8px
- アイコンとテキストの間隔: 8px
- チェックボックスとテキストの間隔: 8px

### インタラクション
- 展開/折りたたみ: アイコンクリックまたは矢印キー
- 選択: ノードクリックまたはEnterキー
- キーボードナビゲーション: 矢印キー（上下左右）
- フォーカス表示: 2px solid `token.colorPrimary`のアウトライン

---

## パターン選択

- 階層データの閲覧・ナビゲーション → **パターン1（標準ツリー）**
- 階層データからの複数選択 → **パターン2（チェックボックスツリー）**
- ファイル/フォルダ構造の表示 → **パターン3（ディレクトリツリー）**

---

## 応用パターン

以下のパターンは標準3パターンの応用として扱います。

### 検索可能ツリー
- **基本パターン**: パターン1（標準ツリー）+ 検索入力
- **追加要素**: 
  - 上部に検索入力フィールド（パターン2: 検索入力）
  - 検索結果のハイライト表示
  - 検索にヒットしたノードのみ表示
- **用途**: 大量の階層データから特定項目を検索

### ドラッグ可能ツリー
- **基本パターン**: パターン1（標準ツリー）または パターン3（ディレクトリツリー）
- **追加機能**: 
  - draggable: true
  - ドラッグ中の視覚的フィードバック
  - ドロップ可能位置の表示
- **用途**: 階層構造の並び替え、再編成

### 仮想スクロールツリー
- **基本パターン**: パターン1 / パターン2 / パターン3
- **追加機能**: 
  - virtual: true
  - height: 固定高さ（例: 400px）
- **用途**: 10,000件以上の大量ノード表示

### コンテキストメニュー付きツリー
- **基本パターン**: パターン1（標準ツリー）または パターン3（ディレクトリツリー）
- **追加機能**: 
  - 右クリックでコンテキストメニュー表示
  - メニュー項目（編集、削除、新規作成など）
- **用途**: ファイル操作、項目管理

---

## 実装例

### パターン1: 標準ツリー

```tsx
import { Tree } from 'antd';
import type { TreeDataNode } from 'antd';

const treeData: TreeDataNode[] = [
  {
    title: '本社',
    key: '0',
    children: [
      {
        title: '開発部',
        key: '0-0',
        children: [
          { title: 'フロントエンドチーム', key: '0-0-0' },
          { title: 'バックエンドチーム', key: '0-0-1' },
        ],
      },
      {
        title: '営業部',
        key: '0-1',
      },
    ],
  },
];

<Tree
  treeData={treeData}
  defaultExpandAll
  showIcon
/>
```

### パターン2: チェックボックスツリー

```tsx
import { Tree } from 'antd';
import type { TreeDataNode } from 'antd';

const treeData: TreeDataNode[] = [
  {
    title: 'ユーザー管理',
    key: '0',
    children: [
      { title: 'ユーザー一覧閲覧', key: '0-0' },
      { title: 'ユーザー作成', key: '0-1' },
      { title: 'ユーザー編集', key: '0-2' },
      { title: 'ユーザー削除', key: '0-3' },
    ],
  },
  {
    title: '組織管理',
    key: '1',
    children: [
      { title: '組織一覧閲覧', key: '1-0' },
      { title: '組織作成', key: '1-1' },
    ],
  },
];

<Tree
  checkable
  treeData={treeData}
  defaultExpandAll
/>
```

### パターン3: ディレクトリツリー

```tsx
import { Tree } from 'antd';
import { FolderOutlined, FolderOpenOutlined, FileOutlined } from '@ant-design/icons';
import type { TreeDataNode } from 'antd';

const treeData: TreeDataNode[] = [
  {
    title: 'プロジェクト',
    key: '0',
    icon: <FolderOutlined />,
    children: [
      {
        title: 'src',
        key: '0-0',
        icon: <FolderOutlined />,
        children: [
          { title: 'App.tsx', key: '0-0-0', icon: <FileOutlined />, isLeaf: true },
          { title: 'index.tsx', key: '0-0-1', icon: <FileOutlined />, isLeaf: true },
        ],
      },
      {
        title: 'package.json',
        key: '0-1',
        icon: <FileOutlined />,
        isLeaf: true,
      },
    ],
  },
];

<Tree
  showLine
  showIcon
  treeData={treeData}
  defaultExpandAll
/>
```

---

## アクセシビリティ

### キーボード操作
- **Tab**: ツリーにフォーカス移動
- **↑/↓**: ノード間移動
- **←/→**: ノード展開/折りたたみ
- **Enter**: ノード選択
- **Space**: チェックボックスツリーでチェック切り替え

### スクリーンリーダー対応
- 各ノードに適切なrole属性（treeitem）
- 展開状態をaria-expandedで表現
- 選択状態をaria-selectedで表現
- チェック状態をaria-checkedで表現

---

## パフォーマンス

### 最適化手法
- **仮想スクロール**: 1000ノード以上の場合は virtual={true} を使用
- **遅延読み込み**: loadData プロパティで必要に応じて子ノードを読み込み
- **メモ化**: useMemo で treeData をメモ化
- **展開状態の制御**: defaultExpandAll は初期表示のみ、その後は expandedKeys で制御

### 推奨ノード数
- 通常表示: 〜1,000ノード
- 仮想スクロール: 1,000〜100,000ノード
- 遅延読み込み: 100,000ノード以上

---

## 注意事項

### DO（推奨）
✅ ノード数が多い場合は仮想スクロールを使用する
✅ ファイル/フォルダ構造にはディレクトリツリーを使用する
✅ 複数選択が必要な場合はチェックボックスツリーを使用する
✅ キーボード操作をサポートする
✅ アイコンでノードの種類を視覚的に区別する

### DON'T（非推奨）
❌ 10階層以上の深いツリーは避ける（UX低下）
❌ ノード名が長すぎる場合は省略せずに表示しない（...で省略）
❌ ツリーの幅が狭すぎる（最低250px推奨）
❌ 仮想スクロールなしで10,000ノード以上を表示しない
❌ 重要な操作をドラッグ&ドロップのみに依存しない（代替手段を提供）
