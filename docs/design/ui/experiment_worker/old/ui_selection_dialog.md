# 汎用選択ダイアログ UI設計書

## メタデータ
- **画面名**: 汎用選択ダイアログ
- **物理名**: SelectionDialog.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/SelectionDialog.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

プロジェクト・メソッド・タスクのいずれかを選択する**汎用単一ダイアログ**です。
`type` プロパティで表示対象を切り替え、リスト形式で項目を選択できます。
選択と同時にダイアログを閉じる（シングルクリック確定）仕様です。

> **注意**: 3ステップまとめて選択する場合は `UnifiedSelectionDialog` を使用してください。

### 1.2. 主要機能

1. プロジェクト / メソッド / タスクいずれかのリスト表示
2. 選択中アイテムのハイライト表示
3. アイテムクリックで即時選択・ダイアログ閉じる

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────────┐
│ Modal（幅600px）                                     │
│ Title: 📁 プロジェクトを選択（typeによって変化）    │
├──────────────────────────────────────────────────────┤
│ Body:                                                │
│ ┌────────────────────────────────────────────────┐   │
│ │ アイテム名         [サブタイトル]  [選択中]     │   │
│ │ アイテム名         [サブタイトル]              │   │
│ │ アイテム名（説明）                             │   │
│ └────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────┤
│ Footer: なし（フッターなし）                         │
└──────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
interface SelectionDialogProps {
  open: boolean;
  onClose: () => void;
  type: SelectionType;          // 'project' | 'method' | 'task'
  items: SelectionItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}
```

### `SelectionItem` 型

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | `string` | ✅ | アイテムID |
| `name` | `string` | ✅ | 表示名 |
| `tag` | `string` | ❌ | タグテキスト |
| `subtitle` | `string` | ❌ | サブテキスト1行目 |
| `description` | `string` | ❌ | サブテキスト2行目 |

---

## 4. タイプ別タイトル・アイコン

| `type` | タイトル | アイコン |
|--------|--------|---------|
| `project` | 「プロジェクトを選択」 | `FolderOutlined` |
| `method` | 「メソッドを選択」 | `ToolOutlined` |
| `task` | 「タスクを選択」 | `AimOutlined` |

---

## 5. 各アイテムの表示仕様

| 状態 | 背景色 | タグ |
|------|--------|------|
| 選択中 | `colorPrimaryBg` | 「選択中」赤タグ + `item.tag` |
| 未選択 | 透明（ホバー時: `colorBgTextHover`）| `item.tag`（defaultカラー）|

---

## 6. data-testid

| 要素 | testid |
|------|--------|
| リストコンテナ | `selection-dialog-list-{type}` |
| 各アイテム | `selection-dialog-item-{item.id}` |
