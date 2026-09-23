# タスク計画書: handleTaskStatusChanged と reloadProgressRows の統合

## メタデータ

- **作成日時**: 2026-09-15
- **タスクID**: 20260915_0002
- **優先度**: 中
- **推定工数**: 1時間

---

## 1. タスク概要

前タスク（20260915_0001）で `WorkRecordPanel` の保存成功後に `handleTaskStatusChanged()` を呼び出すようにしたが、
`handleTaskStatusChanged()` は `getWorkerAccessibleProjects()` → `setProjects()` のみを行い、
`reloadProgressRows()` を呼ばない。

そのため「保存」後に `ProgressOverviewTab` の進捗表示（`isRecorded` フラグや progressRate など）が更新されない問題がある。

本タスクでは、`handleTaskStatusChanged` と `reloadProgressRows` の両方をまとめて呼ぶ
**`refreshProjectAndProgress`** という統合ハンドラーを新設し、
`onSave` コールバックからこの統合ハンドラーを呼ぶよう変更する。
また、`handleConfirmInstruction` 内で `reloadProgressRows` + `handleTaskStatusChanged` を
別々に呼んでいる箇所も統合ハンドラーに置き換える。

---

## 2. 目的と期待される成果

- [ ] `WorkRecordPanel.handleSave` 保存成功後に `ProgressOverviewTab` の進捗表示も最新化される
- [ ] プロジェクト選択プルダウン（`setProjects`）も引き続き最新化される
- [ ] `handleConfirmInstruction` 内の二重呼び出しが統合ハンドラー1本にまとまる
- [ ] TypeScript ビルドエラーなし

---

## 3. 現状の問題の詳細

### 各ハンドラーの責務比較

| ハンドラー | `getWorkerAccessibleProjects` | `reloadProgressRows` |
|-----------|:---:|:---:|
| `handleTaskStatusChanged` | ✅ | ❌ |
| `reloadProgressRows(projectId)` | ❌ | ✅ |
| `onSave` コールバック（前タスク追加）が呼ぶもの | ✅ | ❌ |

→ 保存後は `ProgressOverviewTab` の `isRecorded` フラグ等が更新されない。

### `handleConfirmInstruction` の現状（L249〜252）

```typescript
await reloadProgressRows(selectedProject);          // ← 個別呼び出し
await handleTaskStatusChanged();                     // ← 個別呼び出し
```

これも統合ハンドラー1本に整理できる。

---

## 4. 実装ステップ

### Step 1: `refreshProjectAndProgress` 統合ハンドラーを新設

**ファイル**: `frontend/src/components/menus/ExperimentWorkerMenu.tsx`

`handleTaskStatusChanged` の直後に以下を追加する：

```typescript
/**
 * プロジェクト一覧（プロジェクト選択プルダウン）と
 * 進捗データ（ProgressOverviewTab）を同時に最新化する統合ハンドラー。
 * WorkRecordPanel の保存成功・handleConfirmInstruction など、
 * 両方の更新が必要な場面で使用する。
 */
const refreshProjectAndProgress = async () => {
  if (!selectedProject) return;
  await Promise.all([
    handleTaskStatusChanged(),
    reloadProgressRows(selectedProject),
  ]);
};
```

`Promise.all` で並列実行することで合計待ち時間を最小化する。

### Step 2: `onSave` コールバックを `refreshProjectAndProgress` に差し替え

**ファイル**: `frontend/src/components/menus/ExperimentWorkerMenu.tsx`

`<WorkRecordPanel>` の `onSave` を変更する：

```typescript
// 変更前
onSave={handleTaskStatusChanged}

// 変更後
onSave={refreshProjectAndProgress}
```

### Step 3: `handleConfirmInstruction` の二重呼び出しを統合ハンドラーに置き換え

**ファイル**: `frontend/src/components/menus/ExperimentWorkerMenu.tsx`

L249〜252 の以下の部分を置き換える：

```typescript
// 変更前
await reloadProgressRows(selectedProject);
// プロジェクト一覧を再取得してプロジェクトステータスを最新化する
// （プロジェクトステータスが TASK_PENDING → TASK_IN_PROGRESS に変わるため）
await handleTaskStatusChanged();

// 変更後
await refreshProjectAndProgress();
```

---

## 5. 変更ファイル一覧

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 修正 | `refreshProjectAndProgress` 統合ハンドラー新設・`onSave` 差し替え・`handleConfirmInstruction` 内の二重呼び出し置き換え |

変更ファイルは 1 ファイルのみ。

---

## 6. 影響範囲

| 呼び出し元 | 変更前 | 変更後 |
|-----------|--------|--------|
| `onSave`（WorkRecordPanel 保存後） | `handleTaskStatusChanged()` のみ | `refreshProjectAndProgress()`（両方並列） |
| `handleConfirmInstruction` | `reloadProgressRows` + `handleTaskStatusChanged` を直列 | `refreshProjectAndProgress()`（両方並列） |
| `onStart`（開始ボタン） | `reloadProgressRows` のみ | **変更なし** |
| `onEnd`（終了ボタン） | `reloadProgressRows` のみ | **変更なし** |
| `onStatusChange`（状態プルダウン変更） | `reloadProgressRows` のみ | **変更なし** |
| `onForceEnd`（強制終了） | `reloadProgressRows` のみ | **変更なし** |

> `onStart` / `onEnd` / `onStatusChange` / `onForceEnd` は、トランジションステータスの変更であり
> プロジェクトステータス（プルダウン表示）への影響が限定的なため変更しない。

---

## 7. リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `selectedProject` が null のとき `reloadProgressRows` が呼ばれる | 低 | `refreshProjectAndProgress` 内で `if (!selectedProject) return` ガードを入れる |
| `Promise.all` の一方が失敗した場合にもう一方がキャンセルされる | 低 | 各関数内部で `try/catch` 済みのため、片方の失敗でも続行される（`Promise.all` の拒否は発生しない） |
| `refreshProjectAndProgress` の定義が `reloadProgressRows` より先になる問題 | 低 | `refreshProjectAndProgress` は `handleTaskStatusChanged` の直後・`reloadProgressRows` の直前に配置し、前方参照が発生しないよう順序を確認する |

---

## 8. テスト計画

### 手動テスト

- [ ] WorkRecordPanel で「保存」ボタン押下後、ProgressOverviewTab の `isRecorded` / 進捗率が更新されることを確認
- [ ] 保存後にプロジェクト選択プルダウンのステータスも更新されることを確認
- [ ] 指示確認ボタン押下後も引き続き両方が更新されることを確認
- [ ] TypeScript ビルドエラーがないことを確認

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
- [x] `refreshProjectAndProgress` 統合ハンドラーを `handleTaskStatusChanged` 直後に新設
- [x] `<WorkRecordPanel onSave>` を `handleTaskStatusChanged` → `refreshProjectAndProgress` に差し替え
- [x] `handleConfirmInstruction` 内の `reloadProgressRows` + `handleTaskStatusChanged` 直列2呼び出し → `refreshProjectAndProgress` 1本に整理
- [x] TypeScript ビルドエラーなし（exit code: 0）
