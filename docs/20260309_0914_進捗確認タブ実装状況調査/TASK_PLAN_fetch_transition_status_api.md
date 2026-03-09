# タスク計画書: fetchTransitionStatus APIパス修正・引数変換ロジック実装

## メタデータ
- **作成日時**: 2026-03-09 15:13
- **タスクID**: fetch_transition_status_api
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

`frontend/src/utils/apiClient.ts` の `fetchTransitionStatus()` 関数を、現在のモックAPIから
バックエンドに実装済みの `GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions`
エンドポイントに接続するよう修正する。

現在の関数シグネチャ `(workerId: string, fileKey: string)` は既存バックエンドAPIのパス構造と一致しないため、
引数変換ロジックを実装し、呼び出し元の `PetriNetVisualization.tsx` も合わせて修正する。

---

## 現状分析

### 現在の `fetchTransitionStatus` の問題

```typescript
// 現在（モック）
export async function fetchTransitionStatus(workerId: string, fileKey: string): Promise<unknown> {
  await simulateApiDelay();
  const mockData = await import('@/data/mock/mockTransitionStatus.json');
  return { success: true, data: mockData.default || mockData };
}
```

- **引数**: `workerId`, `fileKey`
- **実態**: モックデータを返すだけ

### 既存バックエンドAPIのシグネチャ

```
GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions
```

- **パスパラメータ**: `projectName` (string), `methodId` (string), `taskNo` (int ≥ 1)
- **認証**: JWT Cookie + 権限チェック（機能CD: 050000, 読取専用）
- **実装状況**: バックエンド実装済み

### 引数の変換方法

| 現在の引数 | 変換先パラメータ | 変換ロジック |
|-----------|--------------|------------|
| `fileKey` | `projectName` | `fileKey` から抽出: `fileKey.split('/projects/')[1]?.split('/')[0]` |
| （なし） | `methodId` | 新規引数として追加が必要 |
| （なし） | `taskNo` | 新規引数として追加が必要 |
| `workerId` | （廃止） | バックエンドAPIでは不要 |

**`fileKey` からの `projectName` 抽出例:**
```
fileKey: "550e8400-e29b-41d4-a716-446655440000/projects/sample_project/sample_project.maiml"
→ projectName: "sample_project"
```

### 呼び出し元 `PetriNetVisualization.tsx` の現状

```typescript
// 現在の呼び出し
progressResult = await fetchTransitionStatusAPI(workerId, fileKey);
```

コンポーネントProps:
```typescript
interface PetriNetVisualizationProps {
  fileKey: string;
  workerId: string;
  workId: string;
  progressData?: TransitionProgress[];
}
```

`methodId` と `taskNo` がPropsに存在しないため、追加が必要。

---

## 目的と期待される成果

### 目的
- `fetchTransitionStatus()` をモックから実APIに接続する
- 引数変換ロジックを正確に実装し、バックエンドAPIのパス構造に合わせる
- `PetriNetVisualization.tsx` に必要な引数（`methodId`, `taskNo`）をPropsとして追加する

### 期待される成果
- [ ] `fetchTransitionStatus()` が実API `GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` を呼び出せる
- [ ] `fileKey` から `projectName` を正しく抽出できる
- [ ] `PetriNetVisualization` が `methodId` と `taskNo` をPropsで受け取れる
- [ ] `shouldUseMockAPI()` が `false` のときに実APIを呼び出し、`true` のときはモックデータを返す分岐が機能する
- [ ] 既存の `progressData` Props経由の動作が壊れない（後退しない）

---

## 実装ステップ

### Phase 1: `apiClient.ts` の `fetchTransitionStatus()` 修正

#### Step 1-1: 関数シグネチャの変更
- `(workerId: string, fileKey: string)` → `(fileKey: string, methodId: string, taskNo: number)` に変更
- `workerId` は廃止（バックエンドAPIで不要）

#### Step 1-2: `fileKey` → `projectName` 変換ロジックの実装
```typescript
// fileKey: "orgId/projects/projectName/projectName.maiml"
const projectNameFromFileKey = fileKey.split('/projects/')[1]?.split('/')[0];
```

エラーケース:
- `fileKey` に `/projects/` が含まれない場合 → エラーを投げる
- `projectName` が空文字の場合 → エラーを投げる

#### Step 1-3: 実API呼び出しの実装
```
GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions
```

#### Step 1-4: モック/実API切り替えの維持
- `shouldUseMockAPI()` が `true` の場合はモックデータを返す

---

### Phase 2: `PetriNetVisualization.tsx` の Props 追加・呼び出し修正

#### Step 2-1: `PetriNetVisualizationProps` に `methodId` と `taskNo` を追加
```typescript
interface PetriNetVisualizationProps {
  fileKey: string;
  workerId: string;   // 後方互換のため残す（使用しないが削除しない）
  workId: string;
  progressData?: TransitionProgress[];
  methodId?: string;  // 追加（オプショナル）
  taskNo?: number;    // 追加（オプショナル）
}
```

`methodId` と `taskNo` をオプショナルとする理由:
- 呼び出し元コンポーネントへの影響を最小限にするため
- 指定なしの場合はAPI呼び出しをスキップしてフォールバック動作（空の進捗データ）

#### Step 2-2: `fetchTransitionStatusAPI` の呼び出し修正
```typescript
// 変更前
progressResult = await fetchTransitionStatusAPI(workerId, fileKey);

// 変更後
if (methodId && taskNo !== undefined) {
  progressResult = await fetchTransitionStatusAPI(fileKey, methodId, taskNo);
} else {
  // methodId/taskNoが不明な場合は空データで代替
  progressResult = { success: true, data: { transitionStatus: [] } };
}
```

---

### Phase 3: 型定義の更新

`frontend/src/types/progress.ts`（または該当する型定義ファイル）を確認し、
`TransitionProgress` 型が既存APIレスポンスと整合しているか確認する。

---

## 影響範囲

### 変更するファイル
1. `frontend/src/utils/apiClient.ts`
   - `fetchTransitionStatus()` のシグネチャを変更
   - 実API呼び出しロジックを実装

2. `frontend/src/components/progress/PetriNetVisualization.tsx`
   - `PetriNetVisualizationProps` に `methodId?`, `taskNo?` を追加
   - `fetchTransitionStatusAPI()` の呼び出し箇所を修正

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 進捗確認タブ（ProgressMonitoring）→ PetriNetVisualization の表示
- 実験フロー図のトランジション進捗表示

### 影響を受けないもの
- `fetchPetriNetStructure()` は実装済みのため変更不要
- `fetchExperimentRecords()` はモックのまま（別タスクで対応予定）
- `progressData` Props経由でデータが渡される場合の動作（既存ロジック維持）

---

## 技術的詳細

### `fetchTransitionStatus` の実装後シグネチャ

```typescript
/**
 * トランジション進捗データを取得
 * GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions
 *
 * @param fileKey - MAIMLファイルキー（projectName抽出に使用）
 * @param methodId - メソッドID
 * @param taskNo - タスク連番（1以上の整数）
 * @returns トランジション進捗データ
 */
export async function fetchTransitionStatus(
  fileKey: string,
  methodId: string,
  taskNo: number
): Promise<unknown>
```

### `fileKey` → `projectName` 変換仕様

```
入力例: "550e8400-e29b-41d4-a716-446655440000/projects/sample_project/sample_project.maiml"
期待出力: "sample_project"

変換ロジック:
1. fileKey.split('/projects/') で分割
2. [1] 部分の最初のセグメント（'/'の前）を取得
3. 空文字や undefined の場合はエラー
```

### バックエンドAPIレスポンス形式

`progressController.ts` の `getProgressData` に基づく:
```json
{
  "success": true,
  "data": {
    "transitions": [
      {
        "transitionId": "...",
        "transitionName": "...",
        "progressStatus": "...",
        ...
      }
    ]
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**注意**: バックエンドのレスポンスは `data.transitions[]` 形式だが、
フロントエンドの `PetriNetVisualization.tsx` では `data.transitionStatus[]` 形式を期待している。
この差異を `fetchTransitionStatus()` 内でマッピングする必要がある。

### レスポンスマッピング仕様

```typescript
// バックエンドレスポンス → フロントエンド期待形式への変換
const transitionStatus = (result.data.transitions || []).map((t: TransitionApiItem) => ({
  transitionId: t.transitionId,
  transitionName: t.transitionName,
  progressStatus: t.progressStatus,
  latestStatus: t.latestStatus,
  // ... 他フィールド
}));

return {
  success: true,
  data: { transitionStatus },
};
```

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| バックエンドAPIレスポンス形式が異なる | 高 | 中 | 実装前にProgressServiceのレスポンス型を確認し、マッピング処理を調整する |
| `methodId`/`taskNo` が未指定の場合に空データになる | 中 | 高 | 空の場合は進捗なしとして扱い、ペトリネット自体は正常表示する |
| 呼び出し元への後退 | 中 | 低 | `workerId` をPropsから削除せず維持する |

---

## テスト計画

### 手動テスト
- [ ] `methodId` と `taskNo` を渡した場合に実APIが呼び出されること
- [ ] `fileKey` から `projectName` が正しく抽出されること
- [ ] `methodId` / `taskNo` が未指定の場合にエラーにならないこと
- [ ] `progressData` Propsが渡された場合は実APIが呼び出されないこと（既存動作維持）
- [ ] モックモード（`shouldUseMockAPI() = true`）でモックデータが返ること

---

## 承認記録

- **計画書提示日時**: 2026-03-09 15:13
- **承認日時**: 2026-03-09 15:22
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-03-09 15:22
完了: 2026-03-09 15:26

### 計画からの変更点
- 旧モック関数の重複定義が残存していたため、削除ステップを追加実施

### 実施内容

#### Phase 1: `apiClient.ts` の `fetchTransitionStatus()` 修正

**変更内容:**
- シグネチャを `(workerId: string, fileKey: string)` → `(fileKey: string, methodId: string, taskNo: number)` に変更
- `shouldUseMockAPI()` が `true` の場合はモックデータ（`mockTransitionStatus.json`）を返す分岐を追加
- `fileKey` から `/projects/` 区切りでプロジェクト名を抽出するロジックを実装
- `GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` への実API呼び出しを実装
- バックエンドレスポンス（`data.transitions[].transition_id`, `status` 数値）→ フロントエンド期待形式（`data.transitionStatus[].transitionId`, `progressStatus` 文字列）へのマッピングを実装
- ステータス数値→文字列変換用ヘルパー関数 `getTransitionStatusLabel()` を追加（0:未開始〜6:エラー）

#### Phase 2: `PetriNetVisualization.tsx` の Props追加・呼び出し修正

**変更内容:**
- `PetriNetVisualizationProps` に `methodId?: string`, `taskNo?: number` を追加
- `workerId` に `@deprecated` JSDocコメントを付与（後方互換のため削除せず維持）
- コンポーネント本体の分割代入に `methodId`, `taskNo` を追加
- モックモード分岐内: `progressData` Props優先 → `methodId`/`taskNo` 指定時はAPI呼び出し → 未指定時は空データ の3段階フォールバックに変更
- 実APIモード分岐内: `methodId`/`taskNo` 指定時はAPI呼び出し → 未指定時は空データ のフォールバックに変更
- 旧 `fetchTransitionStatusAPI(workerId, fileKey)` 形式の呼び出し2箇所を新形式 `fetchTransitionStatusAPI(fileKey, methodId, taskNo)` に変更

### 最終的な成果物
- [x] `fetchTransitionStatus()` が実API `GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` を呼び出せる
- [x] `fileKey` から `projectName` を正しく抽出できる
- [x] `PetriNetVisualization` が `methodId` と `taskNo` をPropsで受け取れる
- [x] `shouldUseMockAPI()` が `false` のときに実APIを呼び出し、`true` のときはモックデータを返す分岐が機能する
- [x] 既存の `progressData` Props経由の動作が壊れない（後退しない）
- [x] TypeScriptエラーなし
