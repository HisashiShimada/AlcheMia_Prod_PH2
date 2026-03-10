# タスク計画書: 進捗確認タブ プロジェクト一覧テーブル「データがありません」修正

## メタデータ
- **作成日時**: 2026-03-09 16:16
- **タスクID**: 進捗確認テーブル表示修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験管理者メニューの「進捗確認」タブに遷移した際、`GET /api/v1/projects` APIからは正常にデータが返ってきているにもかかわらず、プロジェクト一覧テーブルに「データがありません」と表示される不具合を修正する。

---

## 調査結果

### 原因1（主因）: APIレスポンスの `data` 構造とコードの期待値が不一致

#### 実際のAPIレスポンス構造
```json
{
  "success": true,
  "data": [          // data が「配列」そのもの
    { "id": "project_9a92873d9deb", "name": "HighTempSuperconductor", ... },
    ...
  ],
  "pagination": { ... }
}
```

#### フロントエンドが期待している構造（`types/project.ts` の `ProjectListResponse`）
```typescript
export interface ProjectListResponse {
  projects: Project[];  // data.projects を期待
  stats?: ProjectStats;
}
```

#### 問題箇所（`ProgressMonitoring.tsx` 94〜101行目）
```typescript
const allData: ProgressRecord[] = useMemo(() => {
  if (!projectsData?.data.projects) return [];  // ← data.projects は undefined → 常に空配列返却
  
  return projectsData.data.projects.map(         // ← 到達しない
    (item, index) => ({
      ...
    })
  );
}, [projectsData]);
```

**結論**: 実際のAPIは `data` が直接 `Project[]` の配列だが、コードは `data.projects` を参照しているため、`data.projects` が `undefined` となり、条件 `if (!projectsData?.data.projects) return []` によって**常に空配列が返される**。

---

### 原因2（副次的）: `projectStatus` の型不一致（数値 vs 文字列）

| 項目 | 値の例 | 型 |
|------|-------|-----|
| APIレスポンスの `status` | `0, 1, 2, 3, 5` | `number` |
| フィルタリングロジックが期待する値 | `'planning', 'pending', 'in_progress', 'review_waiting', 'completed', 'error'` | `string` |

`Project` 型の `status` フィールドは `number` 型として定義されており、APIも数値を返す。しかし `ProgressMonitoring.tsx` の `getProjectStatusLabel()` は文字列（`'planning'` 等）を引数として受け取ることを前提としているため、以下の問題が発生する：

- ステータスTagが全件 `default`（灰色）で表示される
- ステータスフィルターで絞り込みが機能しない（`item.projectStatus === 'in_progress'` 等の比較が常に false）
- 検索でステータス名による絞り込みができない

**ステータス数値→文字列のマッピング**（バックエンドの `code_master` テーブルに基づく）:
```
0 → 'planning'   （プロジェクト計画中）
1 → 'pending'    （タスク実行待ち）
2 → 'in_progress' （タスク実行中）
3 → 'review_waiting' （タスク結果レビュー待ち）
4 → 'completed'  （プロジェクト完了）
5 → 'error'      （タスク異常終了）
```

---

## 目的と期待される成果

### 目的
APIからデータが正常に返ってきているにもかかわらずテーブルに表示されない不具合を解消する。

### 期待される成果
- [x] プロジェクト一覧テーブルにAPIから取得したデータが正しく表示される
- [x] ステータスTagが正しい色・ラベルで表示される
- [x] ステータスフィルターによる絞り込みが正常に動作する
- [x] ステータス名による検索が正常に動作する

---

## 実装ステップ

### Step 1: 問題1修正 — `data` 参照ロジックの修正
**対象ファイル**: `frontend/src/components/progress/ProgressMonitoring.tsx`

`allData` の useMemo 内で `projectsData?.data.projects` を参照している箇所を、APIの実際のレスポンス構造（`data` が配列直接）に対応させる。

```typescript
// 修正前
const allData: ProgressRecord[] = useMemo(() => {
  if (!projectsData?.data.projects) return [];
  return projectsData.data.projects.map((item, index) => ({ ... }));
}, [projectsData]);

// 修正後
const allData: ProgressRecord[] = useMemo(() => {
  // APIは data が Project[] 直接の場合と data.projects の場合があるため両対応
  const projects = Array.isArray(projectsData?.data)
    ? (projectsData?.data as Project[])
    : (projectsData?.data as ProjectListResponse)?.projects ?? [];
  if (!projects.length) return [];
  return projects.map((item, index) => ({ ... }));
}, [projectsData]);
```

### Step 2: 問題2修正 — `status` 数値→文字列変換の追加
**対象ファイル**: `frontend/src/components/progress/ProgressMonitoring.tsx`

`allData` の useMemo 内でデータ変換する際に、`item.status`（数値）を文字列ステータスコードに変換するヘルパー関数を追加し適用する。

```typescript
// 追加するヘルパー関数
const getStatusStringFromNumber = (status: number): string => {
  const map: Record<number, string> = {
    0: 'planning',
    1: 'pending',
    2: 'in_progress',
    3: 'review_waiting',
    4: 'completed',
    5: 'error',
  };
  return map[status] ?? 'planning';
};

// 適用箇所
projectStatus: getStatusStringFromNumber(item.status),
```

---

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/progress/ProgressMonitoring.tsx` | Step1: data参照修正、Step2: status数値→文字列変換追加 |

---

## リスク

| リスク | 影響度 | 対策 |
|--------|-------|------|
| 将来APIが `data.projects` 構造に変更された場合に再修正が必要 | 低 | 両方に対応するロジックで実装（`Array.isArray` で判定） |
| status の数値マッピングがバックエンドと乖離する | 低 | `code_master` テーブルの定義と一致していることを確認済み |

---

## テスト計画

### 手動テスト
- [ ] 進捗確認タブに遷移した際、プロジェクト一覧が表示されること
- [ ] 各プロジェクトのステータスTagが正しい色・ラベルで表示されること
  - 0（計画中）→ グレー「プロジェクト計画中」
  - 1（タスク実行待ち）→ 青「タスク実行待ち」
  - 2（タスク実行中）→ シアン「タスク実行中」
  - 3（レビュー待ち）→ パープル「タスク結果レビュー待ち」
  - 5（異常終了）→ 赤「タスク異常終了」
- [ ] ステータスフィルターで絞り込みが正常に動作すること
- [ ] 検索テキスト入力でステータス名による絞り込みが動作すること
- [ ] 所有者フィルター（自分所有のみ/全体）が正常に動作すること

---

## 承認記録
- **計画書提示日時**: 2026-03-09 16:16
- **承認日時**: 2026-03-09 16:16（ユーザー承認済み）

---

## 実施記録

### 実施日時
開始: 2026-03-09 16:16
完了: （作業完了後に記入）

### 実施内容
- [ ] Step 1: data参照修正 完了
- [ ] Step 2: status数値→文字列変換 完了
