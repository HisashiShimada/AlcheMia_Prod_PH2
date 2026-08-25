# タスク選択カード UI設計書

## メタデータ
- **画面名**: タスク選択カード
- **物理名**: TaskSelector.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/TaskSelector.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

現在選択中のタスク情報をカード形式で表示する**表示専用コンポーネント**です。
サブヘッダーエリアに配置され、選択状態を一目で確認できます。

> ⚠️ **現時点**: タスク一覧はダミーデータで実装。将来的にAPIから取得予定。

### 1.2. 主要機能

1. 選択中タスク名の表示
2. タスクのタグ表示
3. 未選択時のプレースホルダー表示
4. disabled状態の表示

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────┐
│ Card（選択時: 青背景・青ボーダー）                 │
│ 🎯 タスク                                        │
│    タスク001                                     │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Card（未選択時）                                  │
│ 🎯 タスク                                        │
│    タスクが選択されていません                     │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Card（disabled時: 透明度60%）                    │
│ 🎯 タスク                                        │
│    プロジェクトを選択してください                 │
└──────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
interface TaskSelectorProps {
  selectedTaskId: string | null;
  onSelectTask?: (taskId: string) => void;
  disabled?: boolean;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `selectedTaskId` | `string \| null` | ✅ | 選択中のタスクID（null = 未選択）|
| `onSelectTask` | `(taskId: string) => void` | ❌ | タスク変更コールバック（現時点では未使用）|
| `disabled` | `boolean` | ❌ | 無効化フラグ（デフォルト: false）|

---

## 4. 表示状態

| 状態 | カード背景 | カード枠色 | 透明度 | 表示内容 |
|------|----------|----------|--------|--------|
| 選択中 | `colorPrimaryBg` | `colorPrimary` | 1.0 | タスク名・タグ |
| 未選択 | `colorBgContainer` | `colorBorder` | 1.0 | 「タスクが選択されていません」|
| disabled | `colorBgContainer` | `colorBorder` | 0.6 | 「プロジェクトを選択してください」|

---

## 5. data-testid

| 要素 | testid |
|------|--------|
| Card全体 | `task-selector-card` |
| 選択中情報エリア | `task-selector-selected-info` |
| タスク名 | `task-selector-task-name` |
| タグ | `task-selector-task-tag` |
| プレースホルダー | `task-selector-placeholder` |
