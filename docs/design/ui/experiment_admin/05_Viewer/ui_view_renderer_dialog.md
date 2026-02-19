# ViewRendererDialog UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

ViewRendererまたはSubNetViewerをフローティングダイアログとして表示するラッパーコンポーネント。react-rndによりドラッグ&リサイズが可能です。

---

## 2. ファイルパス

```
frontend/src/components/viewer/ViewRendererDialog.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| id | string | ✓ | ダイアログ識別子 |
| contentType | 'file' \| 'subnet' \| 'edit' | ✓ | コンテンツ種別 |
| file | FileData | | ファイル情報（fileまたはeditモード時） |
| subnetData | SubnetData | | サブネット情報（subnetモード時） |
| zIndex | number | ✓ | Z-index値（重ね順） |
| initialPosition | {x, y} | | 初期表示位置（デフォルト: {x:100, y:100}） |
| initialSize | {width, height} | | 初期サイズ（デフォルト: {width:1200, height:800}） |
| onClose | (id) => void | ✓ | 閉じる処理 |
| onFocus | (id) => void | ✓ | フォーカス時処理 |
| onOpenSubNetViewer | (data) => void | | サブネット表示 |

**FileData型:**
```typescript
interface FileData {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  isFolder?: boolean;
  fileCount?: number;
}
```

**SubnetData型:**
```typescript
interface SubnetData {
  transitionName: string;
  maimlData: string;
  templateMap: Record<string, { element: Element }>;
  petriNetData: { places, arcs };
}
```

---

## 4. レイアウト

```
┌─────────────────────────────────────────────┐
│ タイトル（ドラッグ可能）        [−] [×]   │
├─────────────────────────────────────────────┤
│                                             │
│  ViewRenderer または SubNetViewer          │
│                                             │
│  (リサイズ可能)                             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 5. 主要機能

### 5.1. コンテンツタイプ別表示

**3種類のコンテンツ:**

1. **file（ファイル表示）**
   - ViewRendererをmainモードで表示
   - ファイルコンテンツを自動ロード

2. **edit（編集モード）**
   - ViewRendererをeditモードで表示
   - PetriNetEditorInnerで編集画面

3. **subnet（サブネット表示）**
   - SubNetViewerを表示
   - トランジションのサブネット図

### 5.2. ファイルコンテンツ読み込み

**処理フロー:**
1. file/editモード時、useEffectでloadFileContent()実行
2. MAIMLファイルの場合、test_omori11.maimlを読み込み
3. ロード完了後、fileContentをViewRendererに渡す

### 5.3. ドラッグ&リサイズ

**react-rnd機能:**
- ドラッグ: タイトルバー（.drag-handleクラス）
- リサイズ: 四隅・辺をドラッグ
- 境界制限: bounds="window"
- 最小サイズ:
  - subnet: minWidth=1000, minHeight=600
  - その他: minWidth=800, minHeight=600

### 5.4. 最小化機能

**動作:**
- [−]ボタンクリック → isMinimized=true
- タイトルバーのみ表示（height=60px）
- [展開]ボタンで復元

---

## 6. State管理

| State | 型 | 説明 |
|------|---|------|
| fileContent | string \| null | ファイルの内容 |
| loading | boolean | ロード中フラグ |
| isMinimized | boolean | 最小化状態 |

---

## 7. 使用コンポーネント

### 7.1. 内部コンポーネント

- ViewRenderer（file/editモード）
- SubNetViewer（subnetモード）

### 7.2. ライブラリ

- react-rnd（Rnd）: ドラッグ&リサイズ機能
- ReactDOM.createPortal: document.bodyにPortalレンダリング

### 7.3. Ant Design

- Spin, message, Button, Typography

### 7.4. アイコン

- CloseOutlined（閉じる）
- MinusOutlined（最小化）
- ExpandOutlined（展開）

---

## 8. Portalレンダリング

**方式:**
```typescript
ReactDOM.createPortal(dialogContent, document.body)
```

**理由:**
- Z-indexスタッキングコンテキストの問題回避
- 親コンポーネントのoverflowに影響されない
- ダイアログが常に最前面に表示可能

**SSR対応:**
- `typeof document !== 'undefined'` でチェック
- SSR時はnullを返す

---

## 9. タイトル取得

**ルール:**
- file: ファイル名
- edit: "🚀 編集: {ファイル名}"
- subnet: "サブネット: {トランジション名}"

---

## 10. スタイル

**ダイアログ:**
- borderRadius: 8px
- boxShadow: Ant Design標準
- backgroundColor: #fff

**タイトルバー:**
- padding: 16px 24px
- backgroundColor: #fafafa
- cursor: move
- borderBottom: 1px solid #f0f0f0

**最小化時:**
- height: 60px
- borderBottomなし
- borderRadius: 8px（全周）

---

## 11. イベント処理

### 11.1. onMouseDown

ダイアログクリック時に`onFocus(id)`を呼び出し、Z-indexを最前面に更新。

### 11.2. onClose

[×]ボタンまたはViewRenderer/SubNetViewerのonClose時に`onClose(id)`を呼び出し。

---

## 12. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2025-12-19 | react-rnd対応フローティングダイアログ作成 | Development Team |
| 1.1.0 | 2026-02-19 | UI仕様書作成 | Cline |
