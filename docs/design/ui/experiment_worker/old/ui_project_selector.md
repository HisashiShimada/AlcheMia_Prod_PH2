# プロジェクト選択カード UI設計書

## メタデータ
- **画面名**: プロジェクト選択カード
- **物理名**: ProjectSelector.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/ProjectSelector.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

現在選択中のプロジェクト情報をカード形式で表示する**表示専用コンポーネント**です。
サブヘッダーエリアに配置され、選択状態を一目で確認できます。

### 1.2. 主要機能

1. 選択中プロジェクト名の表示
2. ファイル名・メソッド数の表示
3. 未選択時のプレースホルダー表示

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────┐
│ Card（選択時: 青背景・青ボーダー）                 │
│ 📁 プロジェクト                                  │
│    材料実験A                                     │
│    experiment_a.xml • 3 メソッド                 │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Card（未選択時: 通常背景）                         │
│ 📁 プロジェクト                                  │
│    プロジェクトが選択されていません               │
└──────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
interface ProjectSelectorProps {
  selectedProject: string;
  onProjectChange?: (value: string) => void;
  projectName?: string;
  fileName?: string;
  methodCount?: number;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `selectedProject` | `string` | ✅ | 選択中プロジェクトID（空文字 = 未選択）|
| `onProjectChange` | `(value: string) => void` | ❌ | プロジェクト変更コールバック（現時点では未使用）|
| `projectName` | `string` | ❌ | 表示するプロジェクト名 |
| `fileName` | `string` | ❌ | MAIMLファイル名 |
| `methodCount` | `number` | ❌ | メソッド数 |

---

## 4. 表示状態

| 状態 | カード背景 | カード枠色 | 表示内容 |
|------|----------|----------|--------|
| 選択中 | `colorPrimaryBg` | `colorPrimary` | プロジェクト名・ファイル名・メソッド数 |
| 未選択 | `colorBgContainer` | `colorBorder` | 「プロジェクトが選択されていません」|

---

## 5. data-testid

| 要素 | testid |
|------|--------|
| Card全体 | `project-selector` |
