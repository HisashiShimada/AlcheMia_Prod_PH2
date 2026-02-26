# タスク計画書: 進捗データ取得API仕様修正

## メタデータ
- **作成日時**: 2026-02-26 20:07
- **更新日時**: 2026-02-26 20:25
- **タスクID**: 進捗データ取得API仕様修正
- **優先度**: 中
- **推定工数**: 1.5時間

## タスク概要

`GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions`（進捗データ取得API）のレスポンス仕様が `api_progress_monitoring.md` v1.4.2 に更新されたため、既存の実装を修正する。

各トランジションのレスポンスに、MAIMLファイルから取得した材料・条件・結果の**定義数**と、DBから取得した**実績数**（6フィールド）を追加する。

## 目的と期待される成果

### 目的
進捗データ取得APIのレスポンスに各トランジションに紐づくデータの定義数と実績数を含めることで、フロントエンドが進捗状況をより詳細に表示できるようにする。

### 期待される成果
- [ ] レスポンスの各トランジションオブジェクトに6フィールドが追加されている
  - `material_count` / `material_actual_count`
  - `condition_count` / `condition_actual_count`
  - `result_count` / `result_actual_count`
- [ ] 旧フィールド `has_data` / `data_count` を削除
- [ ] MAIMLファイル解析でトランジションに紐づくプレースのステレオタイプ別定義数を取得
- [ ] `template_data` テーブルから実績数を取得する新規SQLを実装

---

## 調査結果

### 現状の実装ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/routes/progressRoutes.ts` | ルート定義・ミドルウェアチェーン |
| `backend/src/controllers/progressController.ts` | `getProgressData()` ハンドラー |
| `backend/src/services/progressService.ts` | `ProgressService.getProgressData()` ビジネスロジック |
| `backend/src/types/progress.ts` | 型定義（`TransitionProgress`, `ProgressData` など） |
| `backend/src/repositories/transitionDataRepository.ts` | `transition_data` テーブルアクセス |
| `backend/src/services/maimlService.ts` | `parsePetriNetStructure()` MAIMLパーサー |

### 仕様差分

**現在のレスポンス（実装済み）:**
```typescript
interface TransitionProgress {
  transition_id: string;
  transition_name: string;
  status: TransitionStatus;
  progress: number;
  last_updated: string | null;
  has_data: boolean;      // ← 削除
  data_count: number;     // ← 削除
}
```

**新仕様（api_progress_monitoring.md v1.4.2）:**
```typescript
interface TransitionProgress {
  transition_id: string;
  transition_name: string;
  status: TransitionStatus;
  progress: number;
  last_updated: string | null;
  material_count: number;         // 追加: MAIMLから取得した材料の定義数
  material_actual_count: number;  // 追加: DBから取得した材料の実績数
  condition_count: number;        // 追加: MAIMLから取得した条件の定義数
  condition_actual_count: number; // 追加: DBから取得した条件の実績数
  result_count: number;           // 追加: MAIMLから取得した結果の定義数
  result_actual_count: number;    // 追加: DBから取得した結果の実績数
}
```

### 定義数の取得方法（MAIMLパーサー）

`parsePetriNetStructure()` が返す各メソッドデータの構造：
- `method.places[]` : プレース一覧（`data.stereotype` = `materialTemplate` / `conditionTemplate` / `resultTemplate`）
- `method.arcs[]` : アーク一覧（`source`, `target` でプレース↔トランジション接続を表現）
- `method.transitions[]` : トランジション一覧

**定義数算出ロジック:**
```
transitionId → arcs（source or target が transitionId のもの）
→ 接続するプレースID一覧 → places.data.stereotype でカウント
```

### 実績数の取得方法（DB）

`template_data` テーブルに以下のカラムが存在：
- `place_id`: プレースID
- `template_type`: `materialTemplate` / `conditionTemplate` / `resultTemplate`
- `organization_id`, `project_id`, `method_id`, `task_no`: フィルタ用

**実績数算出ロジック:**
```sql
SELECT template_type, COUNT(*) as count
FROM template_data
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
  AND task_no = $4
  AND place_id = ANY($5)  -- プレースIDの配列
GROUP BY template_type
```

---

## 実装ステップ

### Phase 1: 型定義の修正
- [ ] `backend/src/types/progress.ts` の `TransitionProgress` を修正
  - `has_data: boolean` を削除
  - `data_count: number` を削除
  - `material_count: number` を追加
  - `material_actual_count: number` を追加
  - `condition_count: number` を追加
  - `condition_actual_count: number` を追加
  - `result_count: number` を追加
  - `result_actual_count: number` を追加

### Phase 2: SQLファイルの新規作成
- [ ] `backend/src/sql/queries/template_data/countActualByPlaceIds.sql` を新規作成
  - `place_id = ANY($5)` でプレースIDリストを絞り込む
  - `template_type` 別に COUNT を集計

### Phase 3: ProgressServiceの修正
- [ ] `backend/src/services/progressService.ts` を修正
  - `getTransitionsProgress()` シグネチャ変更: `places` と `arcs` を追加引数として受け取る
  - `getSingleTransitionProgress()` シグネチャ変更: `places` と `arcs` を追加引数として受け取る
  - `getSingleTransitionProgress()` 内に定義数算出ロジックを追加
  - `getSingleTransitionProgress()` 内に実績数取得クエリを追加（`countActualByPlaceIds.sql` を使用）
  - `countRecordsByTransition()` 呼び出し（`has_data`, `data_count` 用）を削除
  - レスポンスオブジェクトを新仕様に合わせて更新
  - `getProgressData()` から `getTransitionsProgress()` 呼び出し時に `method.places`, `method.arcs` を渡す

### Phase 4: 動作確認
- [ ] TypeScriptコンパイルエラーがないことを確認
- [ ] 変更によって `ProgressData.transitions[]` の型が正しく反映されていることを確認

---

## 変更ファイル一覧

### 修正
1. `backend/src/types/progress.ts`
   - `TransitionProgress` インターフェースを新仕様に更新

2. `backend/src/services/progressService.ts`
   - `getTransitionsProgress()` の引数追加と処理変更
   - `getSingleTransitionProgress()` の引数追加・定義数算出・実績数取得

### 新規作成
1. `backend/src/sql/queries/template_data/countActualByPlaceIds.sql`
   - テンプレートタイプ別実績数カウントSQL

---

## 技術的詳細

### 定義数算出の実装イメージ

```typescript
// progressService.ts - getSingleTransitionProgress() 内
const connectedPlaceIds = places
  .filter(p => arcs.some(a =>
    (a.source === transition.id && a.target === p.id) ||
    (a.target === transition.id && a.source === p.id)
  ))
  .map(p => p.id);

const materialCount = places.filter(p =>
  connectedPlaceIds.includes(p.id) && p.data?.stereotype === 'materialTemplate'
).length;

const conditionCount = places.filter(p =>
  connectedPlaceIds.includes(p.id) && p.data?.stereotype === 'conditionTemplate'
).length;

const resultCount = places.filter(p =>
  connectedPlaceIds.includes(p.id) && p.data?.stereotype === 'resultTemplate'
).length;
```

### 実績数取得の実装イメージ

```typescript
// progressService.ts - getSingleTransitionProgress() 内
const pgp = getPgp();
const countSql = await loadSqlFile('template_data/countActualByPlaceIds.sql');
const countRows = await pgp.any<{ template_type: string; count: string }>(
  countSql,
  [organizationId, projectId, methodId, taskNo, connectedPlaceIds]
);

const actualCounts = { material: 0, condition: 0, result: 0 };
for (const row of countRows) {
  if (row.template_type === 'materialTemplate') actualCounts.material = Number(row.count);
  if (row.template_type === 'conditionTemplate') actualCounts.condition = Number(row.count);
  if (row.template_type === 'resultTemplate') actualCounts.result = Number(row.count);
}
```

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `has_data`/`data_count` を参照しているフロントエンドコードが存在する | 中 | バックエンドのみ修正。フロントエンドへの影響は別タスクで対応 |
| `connectedPlaceIds` が空配列の場合の `ANY($5)` SQL エラー | 低 | 空配列時は実績数をすべて0として返す |

---

## 承認記録
- **計画書提示日時**: 2026-02-26 20:25
- **承認日時**: 2026-02-26 20:25（ユーザー承認済み）

---

## 実施記録

### 実施日時
開始: 2026-02-26 20:25  
完了: 2026-02-26 20:41

### 変更ファイル（実施済み）
1. **`backend/src/types/progress.ts`** - `TransitionProgress` インターフェース修正
   - `has_data: boolean` 削除
   - `data_count: number` 削除
   - `material_count`, `material_actual_count`, `condition_count`, `condition_actual_count`, `result_count`, `result_actual_count` の6フィールド追加

2. **`backend/src/sql/queries/template_data/countActualByPlaceIds.sql`** - 新規作成
   - `template_data` テーブルからプレースIDリストでtempate_type別カウントを取得するSQL

3. **`backend/src/services/progressService.ts`** - ビジネスロジック修正
   - `getTransitionsProgress()` に `places`, `arcs` 引数を追加
   - `getSingleTransitionProgress()` に `places`, `arcs` 引数を追加
   - アーク経由でトランジションに接続するプレースIDを特定し、ステレオタイプ別定義数を算出
   - `template_data` テーブルから実績数を取得するロジックを追加
   - `countRecordsByTransition()` 呼び出し（旧 `has_data`/`data_count` 用）を削除
   - レスポンスオブジェクトを新仕様の6フィールドに更新

### コンパイル確認
✅ `npm run build` 成功（エラーなし）

### 最終的な成果物
- [x] `material_count` / `material_actual_count` フィールド追加
- [x] `condition_count` / `condition_actual_count` フィールド追加
- [x] `result_count` / `result_actual_count` フィールド追加
- [x] `has_data` / `data_count` フィールド削除
- [x] MAIMLアーク解析による定義数算出実装
- [x] `template_data` テーブルからの実績数取得SQL実装
- [x] TypeScriptコンパイル成功確認
