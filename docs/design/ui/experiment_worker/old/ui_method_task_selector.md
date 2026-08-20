# メソッド・タスク選択エリア UI設計書

## メタデータ
- **画面名**: メソッド・タスク選択エリア
- **物理名**: MethodTaskSelector.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/MethodTaskSelector.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

指示確認タブ・実験記録タブで**共通使用される**メソッド・タスク選択UIです。
高さ56pxの帯状エリアに、メソッド選択コンボボックスとタスク選択コンボボックスおよび選択ボタンを横並びで表示します。

### 1.2. 主要機能

1. メソッド選択ドロップダウン（`Select`）
2. タスク選択ドロップダウン（`Select`）
3. 選択モーダル起動ボタン（`UnifiedSelectionDialog` や `TaskSelectionDialog` を開く）

---

## 2. 画面レイアウト

```
┌─────────────────────────────────────────────────────────────────────┐
│ [🔀 メソッド: ▼ 測定メソッドA  ] [✓ タスク: ▼ タスク001  ] [選択] │
└─────────────────────────────────────────────────────────────────────┘
高さ: 56px、背景色: colorBgContainer、ボーダー: colorBorder
```

---

## 3. コンポーネント Props 定義

```typescript
interface MethodTaskSelectorProps {
  selectedProject: string;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string | null) => void;
  methods: Array<{ methodId: string; methodName: string }>;
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  tasks: Array<{ taskId: string; taskName: string }>;
  onOpenModal: () => void;
  methodDisabled?: boolean;
  taskDisabled?: boolean;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `selectedProject` | `string` | ✅ | 選択中プロジェクトID（選択ボタンの活性制御に使用）|
| `selectedMethodId` | `string \| null` | ✅ | 選択中メソッドID |
| `onSelectMethod` | `fn` | ✅ | メソッド変更ハンドラ |
| `methods` | `Array` | ✅ | メソッド選択肢一覧 |
| `selectedTaskId` | `string` | ✅ | 選択中タスクID |
| `onSelectTask` | `fn` | ✅ | タスク変更ハンドラ |
| `tasks` | `Array` | ✅ | タスク選択肢一覧 |
| `onOpenModal` | `() => void` | ✅ | 選択モーダルを開くハンドラ |
| `methodDisabled` | `boolean` | ❌ | メソッドSelect無効化（デフォルト: false）|
| `taskDisabled` | `boolean` | ❌ | タスクSelect無効化（デフォルト: false）|

---

## 4. 選択肢仕様

### メソッド選択肢

| 値 | ラベル |
|----|-------|
| `''`（空文字）| `-` |
| `method.methodId` | `method.methodName` |

### タスク選択肢

| 値 | ラベル |
|----|-------|
| `''`（空文字）| `-` |
| `task.taskId` | `task.taskName` |

---

## 5. ボタン仕様

| 要素 | 仕様 |
|------|------|
| 選択ボタン | `type="primary"`, `size="large"`, `CheckOutlined` アイコン |
| 活性条件 | `selectedProject` が空でない場合 |
| data-testid | `method-task-select-button` |

---

## 6. Select 仕様

| 要素 | data-testid | サイズ | 幅 |
|------|------------|--------|-----|
| メソッドSelect | `method-select` | `large` | 200px |
| タスクSelect | `task-select` | `large` | 200px |
