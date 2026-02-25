# タスク計画書: No.12 TransitionList handleDataSave → 実験データ保存後のUI更新実装

## メタデータ
- **作成日時**: 2026-02-25 16:48
- **タスクID**: experiment-record-no12-handleDataSave-TransitionList
- **優先度**: 中
- **推定工数**: 1時間
- **親タスク**: `docs/20260225_0946_実験記録タブAPI統合/PLAN.md`（Phase 4）

---

## 1. タスク概要

`frontend/src/components/ExperimentWorker/TransitionList.tsx` の `handleDataSave` 関数が、
現在はコンソールログ出力のみでAPIを呼び出していない旨のTODOコメントが残っている。

ただし、実際のAPI呼び出しは **No.9 で既に実装済みの `DataRecordDialog.handleSaveTemplate`** 内で行われており、
`onSave`（= `handleDataSave`）はAPIによる保存成功後に呼び出されるコールバックである。

本タスクでは以下を実施する：
1. 不要な `console.log` およびTODOコメントを削除する
2. 保存成功後にトランジションの進捗データを再取得（リフレッシュ）して、画面に最新状態を反映するため、
   `TransitionListProps` に `onDataSaveComplete` コールバックを追加し、親コンポーネント（`ExperimentRecordTab`）の `fetchProgress` を呼び出す

### 対象箇所（現状コード）

```typescript
// frontend/src/components/ExperimentWorker/TransitionList.tsx
// データ保存ハンドラ
const handleDataSave = (data: ExperimentDataValue[]) => {
  console.log('保存されたデータ:', data);
  // TODO: バックエンドAPIへの保存処理を実装  ← モック（ログ出力のみ）
  message.success('実験データを保存しました');
  setDataRecordModalOpen(false);
  setSelectedTransition(null);
};
```

---

## 2. 目的と期待される成果

### 目的
- `handleDataSave` の不要な `console.log` とTODOコメントを削除してコードを整理する
- 保存成功後に親コンポーネント（`ExperimentRecordTab`）の進捗データ再取得を呼び出し、
  トランジション一覧に最新のステータス・進捗率を反映する

### 期待される成果
- [ ] `handleDataSave` から `console.log` とTODOコメントが削除される
- [ ] `TransitionListProps` に `onDataSaveComplete?: () => void` が追加される
- [ ] 保存成功後に `onDataSaveComplete` が呼び出され、親コンポーネントの `fetchProgress` が再実行される
- [ ] `ExperimentRecordTab.tsx` から `TransitionList` に `onDataSaveComplete={fetchProgress}` が渡される
- [ ] モーダルが正常にクローズされる
- [ ] TypeScript コンパイルエラーが発生しない

---

## 3. 事前調査結果

### 3.1 No.11（ExperimentRecordTab）との構造的な違い

`ExperimentRecordTab.tsx` と `TransitionList.tsx` では、`DataRecordDialog` を利用する構造が異なる。

| 比較項目 | ExperimentRecordTab（No.11） | TransitionList（No.12） |
|---------|---------------------------|------------------------|
| `DataRecordDialog` の使用 | 直接内包 | 直接内包 |
| 進捗データの管理 | `progressData` state を自コンポーネントで保持 | `transitions` を props で受け取る（進捗データは親管理） |
| 保存後の進捗再取得 | `fetchProgress()` を自コンポーネント内で呼び出し可能 | 自コンポーネントでは進捗データを管理しないため、親への通知が必要 |
| 採用するアプローチ | `fetchProgress` を `useCallback` で切り出して `handleDataSave` から呼び出す | `onDataSaveComplete` コールバックを追加し、親から `fetchProgress` を受け取る |

### 3.2 コールフロー整理

```
[ユーザー] 保存ボタン押下
    ↓
DataRecordDialog.handleSaveTemplate()
    ├─ saveBatchExperimentData() ← POST /api/v1/experiments/... を呼び出し（No.9で実装済み）
    ├─ message.success('「{テンプレート名}」を保存しました...')
    └─ onSave([templateData])  ← TransitionList.handleDataSave() を呼び出す
         ↓
TransitionList.handleDataSave(data)
    ├─ console.log('保存されたデータ:', data)   ← 削除対象
    ├─ // TODO: バックエンドAPIへの保存処理を実装 ← 削除対象
    ├─ message.success('実験データを保存しました') ← 維持
    ├─ setDataRecordModalOpen(false)              ← 維持
    ├─ setSelectedTransition(null)               ← 維持
    └─ onDataSaveComplete?.()                    ← 追加（親の fetchProgress を呼び出す）
         ↓
ExperimentRecordTab.fetchProgress()
    └─ GET /api/v1/progress/.../transitions を再取得してトランジション一覧を更新
```

**結論**: `handleDataSave` は API 呼び出し後のコールバックであり、API呼び出し自体は既に `DataRecordDialog` 内で完結している。
`TransitionList` 自身は進捗データを保持しないため、props で受け取った `onDataSaveComplete` を通じて親に再取得を依頼するアーキテクチャを採用する。

### 3.3 ExperimentRecordTab における fetchProgress の確認（No.11 実施後）

No.11 の実装により、`ExperimentRecordTab.tsx` では `fetchProgress` が `useCallback` で切り出し済みである。

```typescript
// ExperimentRecordTab.tsx（No.11実施後の状態）
const fetchProgress = useCallback(async () => {
  // ...進捗データを取得して setProgressData を更新
}, [selectedProjectName, selectedMethodId, selectedTaskId]);
```

このため、`ExperimentRecordTab.tsx` では `TransitionList` に対して
`onDataSaveComplete={fetchProgress}` を渡すだけで済む。

### 3.4 ExperimentRecordTab から TransitionList への現在の props 渡し状況

```tsx
// ExperimentRecordTab.tsx（現状）
<TransitionList
  transitions={transitionsWithProgress}
  methodName={selectedMethod?.methodName}
  selectedTaskId={selectedTaskId}
  projectStatus={projectStatus}
  onTaskCreated={onTaskCreated}
  projectId={selectedProject}
  methodId={selectedMethodId || undefined}
  projectName={selectedProjectName}
/>
```

`onDataSaveComplete` は現状渡されていないため追加が必要。

### 3.5 既存ファイル確認結果

| ファイル | 状態 |
|---------|------|
| `frontend/src/services/experimentDataApiService.ts` | ✅ 既存（No.9で作成済み） |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | ✅ No.9で `saveBatchExperimentData` 呼び出し実装済み |
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | ✅ No.11で `fetchProgress` を `useCallback` で切り出し済み |

---

## 4. 実装ステップ

### Phase 1: TransitionList.tsx の修正

- [ ] `TransitionListProps` に `onDataSaveComplete?: () => void` を追加する
- [ ] コンポーネント引数に `onDataSaveComplete` を追加する
- [ ] `handleDataSave` から `console.log('保存されたデータ:', data)` を削除する
- [ ] `handleDataSave` から `// TODO: バックエンドAPIへの保存処理を実装` コメントを削除する
- [ ] `handleDataSave` の末尾に `onDataSaveComplete?.()` の呼び出しを追加する

### Phase 2: ExperimentRecordTab.tsx の修正

- [ ] `TransitionList` への props に `onDataSaveComplete={fetchProgress}` を追加する

### Phase 3: 動作確認

- [ ] TypeScript コンパイルエラーがないことを確認（`npx tsc --noEmit`）
- [ ] 保存ボタン押下後にモーダルが正常に閉じることを確認
- [ ] 保存後にトランジション一覧の進捗データが最新状態に更新されることを確認

---

## 5. 影響範囲

### 変更するファイル

| No | ファイルパス | 変更内容 |
|----|------------|---------|
| 1 | `frontend/src/components/ExperimentWorker/TransitionList.tsx` | `TransitionListProps` に `onDataSaveComplete` 追加、`handleDataSave` のクリーンアップとコールバック呼び出し追加 |
| 2 | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | `TransitionList` に `onDataSaveComplete={fetchProgress}` を追加 |

### 新規作成するファイル

なし

### 影響を受ける機能

- `TransitionList` のデータ記録ダイアログの「保存」ボタン押下後の画面更新処理
- トランジション一覧の進捗データ表示（保存後のリフレッシュ）

---

## 6. 実装詳細

### 6.1 TransitionList.tsx の修正内容

#### TransitionListProps への追加

```typescript
// 変更前
interface TransitionListProps {
  transitions: Transition[];
  methodName?: string;
  selectedTaskId?: string;
  projectStatus: ProjectStatus | null;
  onTaskCreated?: (taskId: string) => void;
  projectId?: string;
  methodId?: string;
  projectName?: string;
}

// 変更後
interface TransitionListProps {
  transitions: Transition[];
  methodName?: string;
  selectedTaskId?: string;
  projectStatus: ProjectStatus | null;
  onTaskCreated?: (taskId: string) => void;
  projectId?: string;
  methodId?: string;
  projectName?: string;
  onDataSaveComplete?: () => void;  // 追加: 実験データ保存完了後のコールバック
}
```

#### コンポーネント引数への追加

```typescript
// 変更前
export default function TransitionList({
  transitions,
  projectStatus,
  selectedTaskId,
  projectId,
  methodId,
  projectName,
}: TransitionListProps) {

// 変更後
export default function TransitionList({
  transitions,
  projectStatus,
  selectedTaskId,
  projectId,
  methodId,
  projectName,
  onDataSaveComplete,
}: TransitionListProps) {
```

#### handleDataSave の修正

```typescript
// 変更前
const handleDataSave = (data: ExperimentDataValue[]) => {
  console.log('保存されたデータ:', data);
  // TODO: バックエンドAPIへの保存処理を実装  ← モック（ログ出力のみ）
  message.success('実験データを保存しました');
  setDataRecordModalOpen(false);
  setSelectedTransition(null);
};

// 変更後
const handleDataSave = (_data: ExperimentDataValue[]) => {
  message.success('実験データを保存しました');
  setDataRecordModalOpen(false);
  setSelectedTransition(null);
  // 保存後に親コンポーネントの進捗データを再取得してトランジション一覧を最新状態に更新
  onDataSaveComplete?.();
};
```

**変更点まとめ:**
- `data` → `_data`（未使用引数のため `_` プレフィックスを付加）
- `console.log` 削除
- `// TODO:` コメント削除
- 末尾に `onDataSaveComplete?.()` を追加

### 6.2 ExperimentRecordTab.tsx の修正内容

```tsx
// 変更前
<TransitionList
  transitions={transitionsWithProgress}
  methodName={selectedMethod?.methodName}
  selectedTaskId={selectedTaskId}
  projectStatus={projectStatus}
  onTaskCreated={onTaskCreated}
  projectId={selectedProject}
  methodId={selectedMethodId || undefined}
  projectName={selectedProjectName}
/>

// 変更後
<TransitionList
  transitions={transitionsWithProgress}
  methodName={selectedMethod?.methodName}
  selectedTaskId={selectedTaskId}
  projectStatus={projectStatus}
  onTaskCreated={onTaskCreated}
  projectId={selectedProject}
  methodId={selectedMethodId || undefined}
  projectName={selectedProjectName}
  onDataSaveComplete={fetchProgress}
/>
```

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `onDataSaveComplete` が `undefined` の場合のエラー | 低 | 低 | オプショナルチェーン（`?.`）を使用するため、未設定でも安全に動作する |
| 保存後の進捗再取得でエラーが発生した場合 | 低 | 低 | `fetchProgress` 内の既存エラーハンドリング（catch で空配列セット）がそのまま適用される |
| `ExperimentRecordTab` 以外から `TransitionList` を使用するコンポーネントが存在する場合 | 中 | 低 | `onDataSaveComplete` はオプショナル（`?`）のため、渡さなくても既存動作（モーダルを閉じるのみ）を維持できる |

---

## 8. テスト計画

### 手動テスト

- [ ] `TransitionList` のトランジション一覧から「記録」ボタンを押して `DataRecordDialog` を開く
- [ ] テンプレートを選択して「保存」ボタンを押す
  - 保存成功後に `message.success('実験データを保存しました')` が表示されることを確認
  - 保存成功後にモーダルが閉じることを確認
  - 保存後にトランジション一覧の進捗表示（ステータス・進捗率）が更新されることを確認
    （ブラウザ DevTools の Network タブで `GET /progress/.../transitions` が発火していることを確認）
- [ ] `onDataSaveComplete` が渡されない場合（TypeScript上あり得ないが）にクラッシュしないことを確認

### コンパイル確認

- [ ] `npx tsc --noEmit` でコンパイルエラーがないことを確認

---

## 9. 関連ドキュメント

- [モックデータ調査結果](./mock_investigation.md)
- [親タスク計画書](./PLAN.md)
- [No.9 計画書（DataRecordDialog handleSaveTemplate）](./PLAN_No9_handleSaveTemplate_API化.md)
- [No.11 計画書（ExperimentRecordTab handleDataSave）](./PLAN_No11_handleDataSave_ExperimentRecordTab_API化.md)

---

## 10. 承認記録

- **計画書提示日時**: 2026-02-25 16:48
- **承認日時**: 2026-02-25 16:51
- **承認者コメント**: 承認済み

## 11. 実施記録

### 実施日時
開始: 2026-02-25 16:51
完了: 2026-02-25 16:53

### 実施内容

#### Phase 1: TransitionList.tsx の修正
- `TransitionListProps` に `onDataSaveComplete?: () => void` を追加（JSDocコメント付き）
- コンポーネント引数に `onDataSaveComplete` を追加
- `handleDataSave` から `console.log('保存されたデータ:', data)` を削除
- `handleDataSave` から `// TODO: バックエンドAPIへの保存処理を実装` コメントを削除
- 引数 `data` を `_data` に変更（未使用引数のため `_` プレフィックス付加）
- `handleDataSave` の末尾に `onDataSaveComplete?.()` の呼び出しを追加

#### Phase 2: ExperimentRecordTab.tsx の修正
- `<TransitionList>` に `onDataSaveComplete={fetchProgress}` を追加

#### Phase 3: コンパイル確認
- `tsc --noEmit` でエラーなし（出力なし = 正常）を確認

### 計画からの変更点
なし（計画通り実施）

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] `handleDataSave` から `console.log` とTODOコメントが削除された
- [x] `TransitionListProps` に `onDataSaveComplete?: () => void` が追加された
- [x] 保存成功後に `onDataSaveComplete` が呼び出され、親の `fetchProgress` が再実行されるよう変更された
- [x] `ExperimentRecordTab.tsx` から `onDataSaveComplete={fetchProgress}` が渡されるよう変更された
- [x] TypeScript コンパイルエラーが発生しないことを確認
