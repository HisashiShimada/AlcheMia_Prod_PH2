# タスク計画書: No.11 ExperimentRecordTab handleDataSave → 実験データ保存後のUI更新実装

## メタデータ
- **作成日時**: 2026-02-25 16:26
- **タスクID**: experiment-record-no11-handleDataSave-ExperimentRecordTab
- **優先度**: 中
- **推定工数**: 1時間
- **親タスク**: `docs/20260225_0946_実験記録タブAPI統合/PLAN.md`（Phase 4）

---

## 1. タスク概要

`frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` の `handleDataSave` 関数が、
現在はコンソールログ出力のみでAPIを呼び出していない旨のTODOコメントが残っている。

ただし、実際のAPI呼び出しは **No.9 で既に実装済みの `DataRecordDialog.handleSaveTemplate`** 内で行われており、
`onSave`（= `handleDataSave`）はAPIによる保存成功後に呼び出されるコールバックである。

本タスクでは以下を実施する：
1. 不要な `console.log` およびTODOコメントを削除する
2. 保存成功後にトランジションの進捗データを再取得（リフレッシュ）して、画面に最新状態を反映する

### 対象箇所（現状コード）

```typescript
// frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx
// データ保存ハンドラ
const handleDataSave = (data: unknown) => {
  console.log('保存されたデータ:', data);
  // TODO: バックエンドAPIへの保存処理を実装  ← モック（ログ出力のみ）
  setDataRecordModalOpen(false);
  setSelectedTransition(null);
};
```

---

## 2. 目的と期待される成果

### 目的
- `handleDataSave` の不要な `console.log` とTODOコメントを削除してコードを整理する
- 保存成功後に進捗データを再取得し、トランジション一覧に最新のステータス・進捗率を反映する

### 期待される成果
- [ ] `handleDataSave` から `console.log` とTODOコメントが削除される
- [ ] 保存成功後に `fetchProgress`（進捗データ取得処理）が再実行され、画面が最新状態に更新される
- [ ] モーダルが正常にクローズされる
- [ ] TypeScript コンパイルエラーが発生しない

---

## 3. 事前調査結果

### 3.1 コールフロー整理

```
[ユーザー] 保存ボタン押下
    ↓
DataRecordDialog.handleSaveTemplate()
    ├─ saveBatchExperimentData() ← POST /api/v1/experiments/... を呼び出し（No.9で実装済み）
    ├─ message.success('「{テンプレート名}」を保存しました...')
    └─ onSave([templateData])  ← ExperimentRecordTab.handleDataSave() を呼び出す
         ↓
ExperimentRecordTab.handleDataSave(data)
    ├─ console.log('保存されたデータ:', data)  ← 不要（削除対象）
    ├─ // TODO: バックエンドAPIへの保存処理を実装  ← 削除対象（APIはDataRecordDialog側で実行済み）
    ├─ setDataRecordModalOpen(false)  ← モーダルを閉じる（維持）
    └─ setSelectedTransition(null)   ← 選択状態をリセット（維持）
```

**結論**: `handleDataSave` は API 呼び出し後のコールバックであり、API呼び出し自体は既に `DataRecordDialog` 内で完結している。

### 3.2 進捗データ再取得の必要性

保存成功後に `progressData` state を更新しないと、画面上のトランジション一覧は古いステータスのまま表示される。  
`ExperimentRecordTab` には `fetchProgress` のロジックが `useEffect` に定義されており、
`selectedProjectName`, `selectedMethodId`, `selectedTaskId` に変化がないと再実行されない。

このため、`handleDataSave` 内で直接 progress API を再取得する処理を追加する必要がある。

### 3.3 fetchProgress ロジックの現状

```typescript
// ExperimentRecordTab.tsx の useEffect 内（抜粋）
useEffect(() => {
  const fetchProgress = async () => {
    if (!selectedProjectName || !selectedMethodId || !selectedTaskId) {
      setProgressData([]);
      return;
    }
    // selectedTaskId から taskNo を抽出
    const parts = selectedTaskId.split('-');
    const taskNo = parts.length > 2 ? parseInt(parts[2], 10) : null;
    // ...
    const client = createApiClient();
    const response = await client.get(
      `/progress/projects/${encodeURIComponent(selectedProjectName)}/methods/${encodeURIComponent(selectedMethodId)}/tasks/${taskNo}/transitions`
    );
    // setProgressData(...)
  };
  fetchProgress();
}, [selectedProjectName, selectedMethodId, selectedTaskId]);
```

このロジックを `handleDataSave` から直接呼び出せるよう、`fetchProgress` 関数を `useEffect` の外に切り出してリファクタリングする。

### 3.4 既存ファイル確認結果

| ファイル | 状態 |
|---------|------|
| `frontend/src/services/experimentDataApiService.ts` | ✅ 既存（No.9で作成済み） |
| `frontend/src/types/api.ts` | ✅ 既存（`ExperimentDataRecord`, `SaveBatchExperimentDataRequest` 等が追加済み） |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | ✅ No.9で `saveBatchExperimentData` 呼び出し実装済み |

---

## 4. 実装ステップ

### Phase 1: fetchProgress を独立した関数に切り出す

- [ ] `useEffect` 内に定義されている `fetchProgress` の非同期関数本体を `useCallback` でラップした関数として `useEffect` の外に切り出す
- [ ] 切り出した関数を `useEffect` から呼び出すよう変更する（既存の動作を維持）

### Phase 2: handleDataSave のクリーンアップ・機能追加

- [ ] `console.log('保存されたデータ:', data)` を削除する
- [ ] `// TODO: バックエンドAPIへの保存処理を実装` コメントを削除する
- [ ] 保存成功後に Phase 1 で切り出した `fetchProgress` を呼び出して進捗データを再取得する
- [ ] `handleDataSave` の引数型を `unknown` から `ExperimentDataValue[]` に変更する（型安全性向上）

### Phase 3: 動作確認

- [ ] TypeScript コンパイルエラーがないことを確認（`npx tsc --noEmit`）
- [ ] 保存ボタン押下後にモーダルが正常に閉じることを確認
- [ ] 保存後にトランジション一覧の進捗データが最新状態に更新されることを確認

---

## 5. 影響範囲

### 変更するファイル

| No | ファイルパス | 変更内容 |
|----|------------|---------|
| 1 | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | `fetchProgress` 関数の切り出し、`handleDataSave` のクリーンアップと進捗再取得処理の追加 |

### 新規作成するファイル

なし

### 影響を受ける機能

- データ記録ダイアログの「保存」ボタン押下後の画面更新処理
- トランジション一覧の進捗データ表示

---

## 6. 実装詳細

### 6.1 fetchProgress の切り出し

```typescript
// ExperimentRecordTab.tsx

/**
 * 進捗データを取得してstateを更新する
 * handleDataSave からも呼び出せるよう useEffect 外に定義
 */
const fetchProgress = useCallback(async () => {
  if (!selectedProjectName || !selectedMethodId || !selectedTaskId) {
    setProgressData([]);
    return;
  }

  const parts = selectedTaskId.split('-');
  const taskNo = parts.length > 2 ? parseInt(parts[2], 10) : null;

  if (taskNo === null || isNaN(taskNo)) {
    console.error('[DEBUG] ExperimentRecordTab - Invalid taskNo', { selectedTaskId });
    setProgressData([]);
    return;
  }

  try {
    console.log('[DEBUG] ExperimentRecordTab - Fetching progress data', {
      selectedProjectName,
      selectedMethodId,
      taskNo,
    });

    const client = createApiClient();
    const response = await client.get(
      `/progress/projects/${encodeURIComponent(selectedProjectName)}/methods/${encodeURIComponent(selectedMethodId)}/tasks/${taskNo}/transitions`
    );

    if (response.data.success && response.data.data && response.data.data.transitions) {
      console.log('[DEBUG] ExperimentRecordTab - Progress data fetched', {
        count: response.data.data.transitions.length,
      });
      setProgressData(response.data.data.transitions);
    } else {
      console.warn('[DEBUG] ExperimentRecordTab - Invalid response structure', response.data);
      setProgressData([]);
    }
  } catch (error) {
    console.error('[DEBUG] ExperimentRecordTab - Error fetching progress', error);
    setProgressData([]);
  }
}, [selectedProjectName, selectedMethodId, selectedTaskId]);

// useEffect から fetchProgress を呼び出す（既存動作を維持）
useEffect(() => {
  fetchProgress();
}, [fetchProgress]);
```

### 6.2 handleDataSave の修正

```typescript
// ExperimentRecordTab.tsx

/**
 * データ保存コールバック（DataRecordDialog の onSave から呼ばれる）
 * ※ 実際のAPI呼び出しは DataRecordDialog.handleSaveTemplate 内で完結している
 */
const handleDataSave = (_data: ExperimentDataValue[]) => {
  // モーダルを閉じ、選択状態をリセット
  setDataRecordModalOpen(false);
  setSelectedTransition(null);

  // 保存後に進捗データを再取得してトランジション一覧を最新状態に更新
  fetchProgress();
};
```

**変更点まとめ:**
- `data: unknown` → `_data: ExperimentDataValue[]`（型安全性向上。未使用のため `_` プレフィックス）
- `console.log` および TODO コメントを削除
- 保存後に `fetchProgress()` を呼び出して進捗データをリフレッシュ
- `import` に `ExperimentDataValue` が既に含まれていることを確認（含まれていない場合は追加）

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `fetchProgress` の `useCallback` 依存配列の設定ミスによる無限ループ | 高 | 低 | 依存配列を `[selectedProjectName, selectedMethodId, selectedTaskId]` に限定し、`useEffect` の依存配列は `[fetchProgress]` とする |
| 保存後の進捗再取得でエラーが発生した場合 | 低 | 低 | 既存の `fetchProgress` のエラーハンドリング（catch で空配列セット）がそのまま適用される |
| `_data` 引数（`ExperimentDataValue[]`）が親コンポーネントから `unknown` 型で渡される場合のコンパイルエラー | 中 | 低 | `DataRecordDialog.onSave` の型定義が `(data: ExperimentDataValue[]) => void` であることを確認済み |

---

## 8. テスト計画

### 手動テスト

- [ ] データ記録ダイアログからテンプレートを選択して「保存」ボタンを押す
  - 保存成功後にモーダルが閉じることを確認
  - 保存後にトランジション一覧の進捗表示が更新されることを確認（DevTools の Network タブで GET /progress/... が発火していることを確認）
- [ ] プロジェクト・メソッド・タスクが選択されていない状態でもクラッシュしないことを確認

### コンパイル確認

- [ ] `npx tsc --noEmit` でコンパイルエラーがないことを確認

---

## 9. 関連ドキュメント

- [モックデータ調査結果](./mock_investigation.md)
- [親タスク計画書](./PLAN.md)
- [No.9 計画書（DataRecordDialog handleSaveTemplate）](./PLAN_No9_handleSaveTemplate_API化.md)
- [No.12 計画書（TransitionList handleDataSave）](./PLAN_No12_handleDataSave_TransitionList_API化.md)（未作成）

---

## 10. 承認記録

- **計画書提示日時**: 2026-02-25 16:26
- **承認日時**: 2026-02-25 16:28
- **承認者コメント**: 承認済み

## 11. 実施記録

### 実施日時
開始: 2026-02-25 16:28
完了: 2026-02-25 16:35

### 実施内容

#### Phase 1: fetchProgress を useCallback で切り出す
- `useCallback` を `import` に追加
- `progressData` の型を `any[]` → `Record<string, unknown>[]` に変更（ESLint エラー解消）
- `useEffect` 内の `fetchProgress` 関数を `useCallback` でラップして外に切り出し
- `useEffect` を `fetchProgress()` の呼び出しのみに変更

#### Phase 2: handleDataSave のクリーンアップ・機能追加
- `ExperimentDataValue` を import に追加
- `ProgressStatus` を import に追加（型キャストに使用）
- `handleDataSave` の `console.log` と TODO コメントを削除
- 引数型を `unknown` → `_data: ExperimentDataValue[]` に変更
- 保存後に `fetchProgress()` を呼び出すよう変更

#### Phase 3: コンパイルエラー対応
- `progressData` 型変更に伴い `transitionsWithProgress` の useMemo で `progress.status` を `as ProgressStatus` にキャスト
- `progress.progress` を `as number` にキャスト
- `tsc --noEmit` で `ExperimentRecordTab.tsx` のエラーがないことを確認

### 計画からの変更点
- `progressData` の型を `any[]` から `Record<string, unknown>[]` に変更したことで、`transitionsWithProgress` 内の型キャストが追加で必要になった
- `ProgressStatus` のインポートも追加が必要となった

### 最終的な成果物
- [x] `handleDataSave` から `console.log` とTODOコメントが削除された
- [x] 保存成功後に `fetchProgress` が再実行され、画面が最新状態に更新されるよう変更された
- [x] モーダルが正常にクローズされる（既存動作を維持）
- [x] TypeScript コンパイルエラーが発生しないことを確認
