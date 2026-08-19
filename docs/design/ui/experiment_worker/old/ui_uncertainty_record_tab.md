# 不確かさ記録タブ UI設計書

## メタデータ
- **画面名**: 不確かさ記録タブ
- **物理名**: UncertaintyRecordTab.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/UncertaintyRecordTab.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

実験記録タブで保存された property / content の値に対して、不確かさ基準を付与するタブです。
実験作業者メニューの**タブ key='5'**（不確かさ記録）に配置されます。

**左右2パネル構成**：
- **左パネル**: 実験記録の property / content 一覧（行選択可能）
- **右パネル**: 選択した property を対象に `UncertaintyCriteriaSelectorPanel` をインライン表示

### 1.2. 主要機能

1. 実験記録の全 property / content 行を左パネルに表示
2. 行をクリックして対象 property を選択
3. 右パネルで不確かさ基準の選択・付与
4. 付与完了後に自動的に次の property へ遷移

> ⚠️ **現フェーズ（モック）**: `INITIAL_TASKS` / `MOCK_TRANSITIONS` のモックデータを使用。実際の保存データとの連携は別フェーズで実装予定。

---

## 2. 画面レイアウト

```
┌─────────────────────────────────────────────────────────────────────┐
│ Layout（高さ: calc(100vh - 280px)）                                │
│ ┌─────────────────────────┐  ┌────────────────────────────────────┐ │
│ │ Sider（幅300px）         │  │ Content（残り幅）                  │ │
│ │ 📋 実験記録のprop/content│  │ UncertaintyCriteriaSelectorPanel   │ │
│ │ 行を選択すると右に       │  │                                    │ │
│ │ 不確かさ基準が表示されます│  │ （選択中 property に対して         │ │
│ │ ─────────────────────   │  │   不確かさ基準を選択・付与）       │ │
│ │ Task #1 [condition][Float]│ │                                    │ │
│ │ 温度 [℃]               │  │                                    │ │
│ │ 25.3℃                  │  │                                    │ │
│ │ ─────────────────────   │  │                                    │ │
│ │ Task #1 [result][Float] │  │                                    │ │
│ │ 質量 [g]               │  │                                    │ │
│ │ 未記録                  │  │                                    │ │
│ └─────────────────────────┘  └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 左パネル：property 行の表示仕様

### 行の構成要素

| 要素 | 説明 |
|------|------|
| バッジ上部 | `Task #N` タグ + section タグ（material/condition/result）+ xsiType タグ |
| ラベル | property のラベル名 + 単位 |
| 実績値 | 記録済みの値（未記録は「未記録」斜体テキスト）|
| プロパティキー | Tooltip付きの小さいコードフォント |

### セクション・タイプ別カラー

| 区分 | 値 | タグカラー |
|------|-----|----------|
| section: material | `green` | 緑 |
| section: condition | `blue` | 青 |
| section: result | `purple` | 紫 |
| xsiType: FloatValue | `Float` | `geekblue` |
| xsiType: IntegerValue | `Int` | `purple` |
| xsiType: StringValue | `Str` | `cyan` |

### 選択状態

| 状態 | 左ボーダー | 背景色 |
|------|----------|--------|
| 選択中 | `3px solid colorPrimary` | `#e6f0ff` |
| 未選択 | `3px solid transparent` | 透明 |

---

## 4. 右パネル：不確かさ基準セレクタ

`UncertaintyCriteriaSelectorPanel` コンポーネントをインライン表示。

| Prop | 値 |
|------|-----|
| `targetProperty` | 選択中 property から生成した `TargetProperty` オブジェクト |
| `onAssign` | 付与完了ハンドラ（次の property へ自動遷移）|

### `TargetProperty` の生成ルール

| フィールド | 生成値 |
|----------|--------|
| `name` | `${row.label} (${row.propKey})` |
| `xpath` | `//transition[@id="${row.transitionId}"]//property[@key="${row.propKey}"]` |
| `tag` | `'property'` |
| `type` | xsiType → MAIML type変換（Float/Integer/String）|
| `value` | `row.actual` の文字列表現（null時は空文字）|
| `unit` | `row.unit`（空の場合は `'—'`）|
| `section` | `row.section`（material/condition/result）|

---

## 5. データ生成ロジック

モックデータ（`INITIAL_TASKS`・`MOCK_TRANSITIONS`・`MOCK_METHODS`）から property 行を生成：

**順序**: Method order 昇順 → Transition order 昇順 → Template 順 → Property 順 → Task No 昇順

---

## 6. 付与後の自動遷移

`onAssign` 実行後、現在選択行の次の行を自動選択。最後の行に到達した場合は現在行を維持。

---

## 7. 空状態

property が0件の場合: `Empty` コンポーネントで「記録された property / content がありません」を表示。
