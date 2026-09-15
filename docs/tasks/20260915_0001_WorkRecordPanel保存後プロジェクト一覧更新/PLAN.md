# タスク計画書: WorkRecordPanel 保存後プロジェクト一覧更新

## メタデータ

- **作成日時**: 2026-09-15
- **タスクID**: 20260915_0001
- **優先度**: 中
- **推定工数**: 1時間

---

## 1. タスク概要

`WorkRecordPanel` の `handleSave` 実行時、バックエンド側でプロジェクトステータスが更新されることがある。  
しかし現在、保存完了後に `ExperimentWorkerMenu` がプロジェクト一覧（プロジェクト選択プルダウン）を再取得する仕組みが存在しない。

本タスクでは、`WorkRecordPanel` に **`onSave` コールバック Props** を追加し、  
`handleSave` の成功後に `ExperimentWorkerMenu` の `handleTaskStatusChanged()` を呼び出すことで、  
`handleTaskStatusChanged` と同様にプロジェクト選択プルダウンを最新状態に更新できるようにする。

---

## 2. 目的と期待される成果

- [ ] `WorkRecordPanel.handleSave` 成功後に `ExperimentWorkerMenu` がプロジェクト一覧を再取得する
- [ ] プロジェクト選択プルダウンのステータス表示が保存直後に更新される
- [ ] 既存の `handleTaskStatusChanged` と同じ再取得処理を共有できる

---

## 3. 現状の動作・問題の詳細

### 現状の `handleTaskStatusChanged` の役割
`ExperimentWorkerMenu.tsx` の `handleTaskStatusChanged` は以下の場面で呼ばれる：

| 呼び出し元 | タイミング |
|-----------|-----------|
| `ProgressOverviewTab` (onStart/onEnd) | タスク開始・終了ボタン押下後 |
| `handleConfirmInstruction` | 指示確認ボタン押下後 |

呼び出し内容は `getWorkerAccessibleProjects()` → `setProjects()` で、プロジェクト選択プルダウンを最新状態に更新する。

### 現状の `handleSave` の場所
`WorkRecordPanel.tsx` L2733 に定義された `handleSave` は `saveBatchExperimentData` API 呼び出し後に成功したとき `modal.success()` を表示するが、**親コンポーネントへの通知コールバックを持たない**。

---

## 4. 実装ステップ

### Step 1: `WorkRecordPanelProps` に `onSave` を追加

**ファイル**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

`WorkRecordPanelProps` インターフェースに以下を追加する：

```typescript
/**
 * 実験データ保存成功後コールバック（任意）。
 * ExperimentWorkerMenu 側でプロジェクト一覧再取得などの後処理を行う際に使用する。
 */
onSave?: () => void;
```

追加箇所は既存の `onStatusChange?:` の直下。

### Step 2: `handleSave` 成功後に `onSave?.()` を呼び出す

**ファイル**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

`handleSave` 内の保存成功分岐（`modal.success(...)` の直後）に `onSave?.()` を追加する。

対象は以下2箇所：

1. **rawItems が空の場合のモック成功分岐**（L2753〜2757）  
   `modal.success(...)` → `setIsDirty(false)` → `onSave?.()` の順で追加

2. **API 呼び出し成功後**（L2855〜2857 付近）  
   `modal.success(...)` → `setIsDirty(false)` → `setApiTransitions(...)` の後 `onSave?.()` を追加

> **注意**: `onSave` は `useCallback` の依存配列にも追加する（`handleSave` が `useCallback` で定義されているため）。

### Step 3: `ExperimentWorkerMenu` で `onSave` に `handleTaskStatusChanged` を渡す

**ファイル**: `frontend/src/components/menus/ExperimentWorkerMenu.tsx`

`<WorkRecordPanel ... />` に `onSave={handleTaskStatusChanged}` を追加する。

---

## 5. 変更ファイル一覧

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 修正 | `WorkRecordPanelProps` に `onSave?` 追加・`handleSave` 成功後に `onSave?.()` 呼び出し・`useCallback` 依存配列に `onSave` 追加 |
| 2 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 修正 | `<WorkRecordPanel>` に `onSave={handleTaskStatusChanged}` を追加 |

---

## 6. 影響範囲

- `WorkRecordPanel` は `ExperimentWorkerMenu` 以外でも使用される可能性があるが、`onSave` は **オプショナル Props**（`onSave?`）のため、未指定の場合は何も起きず既存動作に影響しない
- `handleTaskStatusChanged` は既存の実装であり、新規ロジックの追加はない

---

## 7. リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `handleSave` が失敗した場合に `onSave` が呼ばれてしまう | 中 | `catch` ブロックには追加せず、成功ブロックのみに追加する |
| `rawItems` が空の場合（モック成功）でも `onSave` を呼ぶかどうか | 低 | 実際にはAPIを呼ばないため不要だが、一貫性のため追加する（プロジェクトステータスに影響しないため問題なし） |
| `useCallback` の依存配列に `onSave` を追加することによる不要な再生成 | 低 | `onSave` はメモ化された関数が渡されるため問題なし |

---

## 8. テスト計画

### 手動テスト

- [ ] WorkRecordPanel で「保存」ボタンを押下し、成功後にプロジェクト選択プルダウンのステータスが更新されることを確認
- [ ] 保存が失敗した場合（エラーモーダル表示時）に `onSave` が呼ばれないことを確認
- [ ] TypeScript ビルドエラーがないことを確認（`npm run build` 等）

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-15
- **承認日時**: 2026-09-15
- **承認者コメント**: 承認します。

---

## 10. 実施記録

### 実施日時
開始: 2026-09-15  
完了: 2026-09-15

### 最終的な成果物
- [x] `WorkRecordPanelProps` に `onSave?: () => void` を追加
- [x] `WorkRecordPanel` デストラクチャリングに `onSave` を追加
- [x] `handleSave` の rawItems 空（モック成功）分岐に `onSave?.()` を追加
- [x] `handleSave` の API 呼び出し成功後に `onSave?.()` を追加
- [x] `handleSave` の `useCallback` 依存配列に `onSave` を追加
- [x] `ExperimentWorkerMenu` の `<WorkRecordPanel>` に `onSave={handleTaskStatusChanged}` を追加
- [x] TypeScript ビルドエラーなし（exit code: 0）
