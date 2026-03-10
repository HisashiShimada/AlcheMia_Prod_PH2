# タスク計画書: fetchExperimentRecords 実API接続

## メタデータ
- **作成日時**: 2026-03-09 15:36
- **タスクID**: fetch_experiment_records_api
- **優先度**: 低
- **推定工数**: 1時間
- **参照元**: `docs/20260309_0914_進捗確認タブ実装状況調査/PLAN.md`

---

## 1. タスク概要

`frontend/src/utils/apiClient.ts` の `fetchExperimentRecords()` 関数が現在モックデータ（`mockExperimentRecords.json`）を返している。  
バックエンドの実装状況を確認した上で、実APIへ接続する（またはモック継続の根拠を明示する）。

---

## 2. バックエンド実装状況調査結果

### 2-1. 現状の `fetchExperimentRecords()` が想定していたAPI

```
GET /api/experiment-records/by-work-id/:workId
```

→ **このエンドポイントはバックエンドに存在しない**（`backend/src/routes/` に対応ルートなし）

### 2-2. バックエンドに存在する近接API

| エンドポイント | 説明 | 問題点 |
|---|---|---|
| `GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data?transitionId=xxx` | 指定トランジションに隣接するプレースのテンプレート実績一覧取得 | **1トランジションごとのAPI** であり、全トランジション分の実績を一括取得する方法がない |

### 2-3. `fetchExperimentRecords()` の用途と引数の問題

`PetriNetVisualization.tsx` から以下のように呼び出される:
```typescript
const recordsData = await fetchExperimentRecordsAPI(workId);
```

- `workId` = `WorkDetail.workId`（タスクの識別子）
- 実APIを呼ぶには `projectName`・`methodId`・`taskNo`・`transitionId` が必要
- これらは `fetchExperimentRecords(workId)` の引数から導出不可能

### 2-4. 結論

**現時点でバックエンドに対応APIが存在しないため、実APIへの直接接続は不可能。**

ただし、以下の代替アプローチが考えられる：

| アプローチ | 説明 | 採否 |
|---|---|---|
| A. 関数シグネチャ拡張 + 複数API呼び出し | `projectName`, `methodId`, `taskNo` を追加引数にして、各トランジションごとに `GET .../data?transitionId=xxx` を繰り返し呼び出す | **非推奨**（N+1問題、呼び出し箇所の変更が多い） |
| B. バックエンドに一括取得APIを新規追加 | `GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/all-records` を追加 | **バックエンド実装が必要**（フロントエンド単体タスクのスコープ外） |
| C. モック維持 + 関数ドキュメント改善 | モックを維持しつつ、関数に必要なバックエンドAPI仕様を明記するTODOコメントを追加 | **採用** |

---

## 3. 採用アプローチ詳細（アプローチC）

### 実装方針

`fetchExperimentRecords()` の実装を以下のように改善する：

1. **モック継続**：バックエンドAPIが未実装のためモックデータを返す状態を維持
2. **ドキュメント改善**：
   - 現在の状態をコメントで明記（なぜモックか）
   - 実API接続に必要な条件（バックエンドAPI仕様）をTODOとして記載
   - 関連するバックエンドAPI（`/experiments/...`）への参照を追加
3. **不要な `workId` 依存の整理**：`workId` は現状モックデータでは実質的に無視されているため、コメントでその旨を明示

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/src/utils/apiClient.ts` | `fetchExperimentRecords()` のJSDocコメント改善、モック継続理由の明記 |

---

## 4. 実装ステップ

- [x] `frontend/src/utils/apiClient.ts` の `fetchExperimentRecords()` のJSDocコメントを改善する
  - 現状（モック）であることの理由を明記
  - 実API接続に必要な条件をTODOコメントとして記載
  - バックエンドの既存APIへの参照を追加
  - `workId` の扱い（現状は未使用）を明示

---

## 5. 変更内容の詳細

### `fetchExperimentRecords()` のコメント改善

**変更前:**
```typescript
/**
 * 実験記録データを取得（モック）
 */
export async function fetchExperimentRecords(workId: string): Promise<unknown> {
  await simulateApiDelay();
  
  // モックデータをダイナミックインポート
  try {
    const mockData = await import('@/data/mock/mockExperimentRecords.json');
    ...
```

**変更後:**
```typescript
/**
 * 実験記録データを取得
 *
 * @description
 * 指定されたワークID（タスク）に紐づく実験記録データを返す。
 *
 * ## ⚠️ 現状: モックデータを返しています
 *
 * ### 理由
 * この関数が想定していた `GET /api/experiment-records/by-work-id/:workId` は
 * バックエンドに実装されておらず、対応するエンドポイントが存在しない。
 *
 * ### 実APIに接続するために必要な条件
 * 実APIを呼ぶには以下の情報が必要だが、現在の引数 `workId` のみから導出できない：
 *   - `projectName`: プロジェクト名
 *   - `methodId`: メソッドID
 *   - `taskNo`: タスク連番（整数）
 *   - `transitionId`: トランジションID（トランジションごとに1回のAPI呼び出しが必要）
 *
 * ### バックエンドの既存API（参考）
 * ```
 * GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data?transitionId=xxx
 * ```
 * このAPIは「1トランジションごと」にしか呼び出せないため、
 * 全トランジション分を一括取得するには新しいバックエンドAPIの実装が必要。
 *
 * ### TODO: バックエンドAPI実装後の対応方針
 * 1. バックエンドに一括取得API `GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/all-records` を追加
 * 2. この関数のシグネチャを `fetchExperimentRecords(projectName, methodId, taskNo)` に変更
 * 3. 上記APIを呼び出すよう実装を変更
 * 4. `PetriNetVisualization.tsx` の呼び出し箇所も合わせて変更
 *
 * @param workId - ワークID（タスクの識別子）※現状は使用されていない（モックのため）
 */
export async function fetchExperimentRecords(workId: string): Promise<unknown> {
  ...
```

---

## 6. リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| モックのまま残すことでバックエンドAPI実装が後回しになる | 低 | TODOコメントで実装条件を明示し、バックエンド実装時の参照ドキュメントとする |

---

## 7. テスト計画

- [ ] `fetchExperimentRecords()` の呼び出しで依然としてモックデータが返ってくること（既存動作の維持）を確認
- [ ] TypeScriptコンパイルエラーが発生しないことを確認

---

## 8. 承認記録

- **計画書提示日時**: 2026-03-09 15:36
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）
