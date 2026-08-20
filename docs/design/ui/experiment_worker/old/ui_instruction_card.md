# 指示カード UI設計書

## メタデータ
- **画面名**: 指示カード
- **物理名**: InstructionCard.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/InstructionCard.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

個別の作業指示1件を表示する汎用カードコンポーネントです。
`InstructionConfirmationModal` 内や `InstructionConfirmationTab` 内で、指示一覧の各行として使用されます。

### 1.2. 主要機能

1. 指示の優先度・タイプをタグで表示
2. 指示内容（テキスト）の表示
3. 作成日時の相対表示（「X分前」など）

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────┐
│ Card（左ボーダー: 優先度カラー、高優先度時: 赤背景）│
│                                                  │
│ [高優先度] [測定]            📅 3分前            │
│                                                  │
│ サンプルを準備してください。温度は20℃に設定すること。│
└──────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
interface InstructionCardProps {
  instruction: Instruction;
  projectStatus: ProjectStatus | null;
  isClient: boolean;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `instruction` | `Instruction` | ✅ | 表示する指示データ |
| `projectStatus` | `ProjectStatus \| null` | ✅ | プロジェクトステータス（将来の拡張用）|
| `isClient` | `boolean` | ✅ | クライアントサイドフラグ（日時表示制御）|

---

## 4. 表示仕様

### 4.1. 優先度カラー（左ボーダー・背景）

| 優先度 | `priority` 値 | 左ボーダー色 | 背景色 |
|--------|-------------|------------|--------|
| 高 | `high` | 赤系 | `#fef2f2` |
| 中 | `medium` | オレンジ系 | 白 |
| 通常 | `normal` | グレー系 | 白 |
| 低 | `low` | 薄グレー | 白 |

- `getPriorityColor(instruction.priority)` ユーティリティで取得
- `getPriorityLabel(instruction.priority)` でタグテキストを取得

### 4.2. タイプタグ

| `instructionType` | 表示テキスト |
|-----------------|------------|
| `general` | 一般 |
| `setup` | セットアップ |
| `measurement` | 測定 |
| `safety` | 安全 |
| `cleanup` | 清掃 |

- `getTypeLabel(instruction.instructionType)` ユーティリティで取得

### 4.3. 日時表示

- `isClient === true` の場合のみ表示（SSRヒドレーション対策）
- `formatRelativeTime(instruction.createdAt)` で「N分前」「N時間前」等の相対表示

---

## 5. 使用コンポーネント

| コンポーネント | 用途 |
|--------------|------|
| `Card` | カードコンテナ（`styles.body: padding 8px`）|
| `Tag` | 優先度・タイプ表示 |
| `Text` | 日時テキスト（`type="secondary"`）|
| `Paragraph` | 指示内容テキスト |
| `CalendarOutlined` | 日時アイコン |

---

## 6. 依存ユーティリティ

- `@/utils/instructionHelpers`
  - `getPriorityColor(priority)` - 優先度カラー
  - `getPriorityLabel(priority)` - 優先度テキスト
  - `getTypeLabel(instructionType)` - タイプテキスト
  - `formatRelativeTime(dateStr)` - 相対時間
