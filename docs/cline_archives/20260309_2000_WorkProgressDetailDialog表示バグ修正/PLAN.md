# タスク計画書: WorkProgressDetailDialog 実験フロー図・トランジション詳細 表示バグ修正

## メタデータ
- **作成日時**: 2026-03-09 20:00
- **タスクID**: work_progress_detail_display_bug
- **優先度**: 高
- **推定工数**: 1時間

---

## 1. タスク概要

`WorkProgressDetailDialog`（プロジェクト進捗詳細ダイアログ）において、
UI仕様書（`ui_work_progress_detail_dialog.md`）に定義されている
「実験フロー図エリア」と「トランジション詳細エリア」が表示されない問題を修正する。

### 調査結果サマリー

調査の結果、**未実装ではなく、バグによる非表示**であることが判明した。

---

## 2. 調査結果詳細

### 2.1 問題1（致命的）: 実験フロー図（PetriNetVisualization）が表示されない

**ファイル**: `frontend/src/components/progress/WorkProgressDetailDialog.tsx`

**原因コード**（約380行目）:
```tsx
{fileDetails?.fileInfo && selectedWork.assignedWorkerId && (
  <PetriNetVisualization ... />
)}
```

表示条件に `selectedWork.assignedWorkerId` が含まれているが、
バックエンドの `progressService.getWorkDetails()` が返す `WorkDetailItem` に
`assignedWorkerId` フィールドが**完全に設定されていない**（常に `undefined`）。

**バックエンドのレスポンス組み立て**（`backend/src/services/progressService.ts`）:
```typescript
const workDetailItem: WorkDetailItem = {
  workId,
  taskNo: Number(task.experiment_order),
  methodName: task.method_id,
  workStatus: ...,
  progressPercentage: completionRate,
  stats: { ... },
  transitionProgress
  // ← assignedWorkerId が存在しない
};
```

**結果**: `assignedWorkerId` が常に `undefined` → 表示条件が常に `false`
→ `PetriNetVisualization` は**絶対に表示されない**。

### 2.2 問題2（軽微）: workStatus の型不一致バグ

| | バックエンドが返す値 | フロントエンドの期待する型 |
|---|---|---|
| workStatus | `'完了'`/`'進行中'`/`'未開始'`（日本語文字列） | `'completed'`/`'in_progress'`/`'pending'`（英語enum） |

**バックエンド**（`progressService.ts`）:
```typescript
workStatus: completedCount === totalTransitions && totalTransitions > 0 ? '完了'
  : workingCount > 0 ? '進行中'
  : '未開始',
```

**フロントエンド**（`WorkProgressDetailDialog.tsx`）の `getWorkStatusColor()` / `getWorkStatusLabel()`:
```typescript
case 'completed': return 'success';
case 'in_progress': return 'processing';
// 上記にマッチしないため常にデフォルト（灰色）になる
```

**結果**: タスクステータスTagが常にデフォルト（灰色）で表示される。

### 2.3 トランジション詳細リストについて

表示条件は `selectedWork.transitionProgress.length > 0` であり、
APIからデータが返ってきていれば表示される実装になっている。
ただし、バグの有無は実際のデータの有無に依存する。

---

## 3. 修正内容

### Fix 1: 実験フロー図の表示条件修正（フロントエンド）

**ファイル**: `frontend/src/components/progress/WorkProgressDetailDialog.tsx`

`assignedWorkerId` の存在チェックを削除し、`maimlFileKey` の存在チェックに変更する。

```tsx
// 修正前
{fileDetails?.fileInfo && selectedWork.assignedWorkerId && (
  <PetriNetVisualization
    fileKey={fileDetails.fileInfo.maimlFileKey}
    workerId={selectedWork.assignedWorkerId}
    workId={selectedWork.workId}
    progressData={selectedWork.transitionProgress}
  />
)}

// 修正後
{fileDetails?.fileInfo && fileDetails.fileInfo.maimlFileKey && (
  <PetriNetVisualization
    fileKey={fileDetails.fileInfo.maimlFileKey}
    workerId={selectedWork.assignedWorkerId || ''}
    workId={selectedWork.workId}
    progressData={selectedWork.transitionProgress}
  />
)}
```

### Fix 2: workStatus を英語enum値に統一（バックエンド）

**ファイル**: `backend/src/services/progressService.ts`

```typescript
// 修正前
workStatus: completedCount === totalTransitions && totalTransitions > 0 ? '完了'
  : workingCount > 0 ? '進行中'
  : '未開始',

// 修正後
workStatus: completedCount === totalTransitions && totalTransitions > 0 ? 'completed'
  : workingCount > 0 ? 'in_progress'
  : 'pending',
```

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/progress/WorkProgressDetailDialog.tsx` - Fix 1（実験フロー図表示条件）
2. `backend/src/services/progressService.ts` - Fix 2（workStatus英語化）

### 影響を受ける機能
- WorkProgressDetailDialog の実験フロー図エリア（表示されるようになる）
- WorkProgressDetailDialog のタスクステータスTag（正しい色で表示されるようになる）

### 影響を受けないもの
- トランジション詳細リスト（データがあれば既に表示される実装）
- ProgressMonitoring 一覧画面

---

## 5. 実装ステップ

- [ ] Step 1: `WorkProgressDetailDialog.tsx` の実験フロー図表示条件を修正
- [ ] Step 2: `progressService.ts` の workStatus を英語enum値に修正
- [ ] Step 3: 動作確認（スクロールして各エリアが表示されることを確認）

---

## 6. リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `workerId` が空文字になることでPetriNetVisualizationが誤動作 | 低 | `workerId` は `@deprecated` 済みで実質未使用（バックエンドAPIでは不要） |
| workStatus変更による既存処理への影響 | 低 | getWorkDetails のみで使用。他APIは別途英語値を返している |

---

## 7. テスト計画

### 手動テスト
- [ ] 進捗確認画面で「詳細」ボタンをクリック → WorkProgressDetailDialogが開く
- [ ] タスクタブを選択 → 実験フロー図エリアがスクロール先に表示される
- [ ] 実験フロー図（PetriNet）が描画される
- [ ] トランジション詳細リストが表示される
- [ ] タスクステータスTagが「実行待ち」「実行中」「完了」等の色で表示される

---

## 8. 承認記録

- **計画書提示日時**: 2026-03-09 20:00
- **承認日時**: 2026-03-09 20:00（ユーザー承認済み）

---

## 9. 実施記録

### 実施日時
開始: 2026-03-09 20:00
完了: 2026-03-09 20:00

### 最終的な成果物
- [x] Fix 1: WorkProgressDetailDialog.tsx 修正完了
- [x] Fix 2: progressService.ts 修正完了

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/progress/WorkProgressDetailDialog.tsx` | PetriNetVisualization 表示条件を `assignedWorkerId` → `maimlFileKey` の存在チェックに変更 |
| `backend/src/services/progressService.ts` | workStatus の値を日本語（`'完了'`/`'進行中'`/`'未開始'`）から英語enum（`'completed'`/`'in_progress'`/`'pending'`）に変更 |
