# 調査レポート: 進捗確認タブ 実装状況調査

## メタデータ
- **作成日時**: 2026-03-09 09:14
- **タスクID**: 進捗確認タブ実装状況調査
- **優先度**: 高
- **種類**: 調査レポート

## タスク概要

実験管理者メニュー画面の進捗確認タブに関連する以下のコンポーネントについて、APIの呼び出しが未実装またはモックデータを使用している箇所を調査し、追加で実装が必要な箇所をまとめる。

**調査対象UI仕様書:**
- `docs/design/ui/experiment_admin/03_progress_monitoring/ui_progress_monitoring.md`
- `docs/design/ui/experiment_admin/03_progress_monitoring/ui_petri_net_visualization.md`
- `docs/design/ui/experiment_admin/03_progress_monitoring/ui_work_progress_detail_dialog.md`
- `docs/design/ui/experiment_admin/03_progress_monitoring/ui_task_results_table.md`
- `docs/design/ui/experiment_admin/03_progress_monitoring/ui_instruction_dialog.md`（※ProgressMonitoringタブからは呼び出されないため対象外）

**調査対象ソースファイル:**
- `frontend/src/components/progress/ProgressMonitoring.tsx`
- `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
- `frontend/src/components/progress/PetriNetVisualization.tsx`
- `frontend/src/components/project/TaskResultsTable.tsx`
- `backend/src/routes/progressRoutes.ts`
- `backend/src/routes/projectRoutes.ts`
- `backend/src/routes/maimlRoutes.ts`
- `backend/src/controllers/`（一覧確認）

---

## 調査結果

### 1. `ProgressMonitoring.tsx`（進捗管理画面）

#### ✅ 実装済み
- `GET /api/v1/projects` の呼び出し（`fetchProjects()`）→ バックエンドのルート・コントローラー実装済み

#### 🔴 未実装・問題あり

| # | 箇所 | 問題内容 | 必要な実装 |
|---|------|----------|----------|
| 1 | `handleViewDetails()` 内の `maimlFileKey` | `org_001/projects/${projectId}/test_omori11.maiml` というハードコードされた固定値を使用 | プロジェクトに紐づく実際のmaimlFileKeyをAPIから取得して動的に生成する |
| 2 | `managerId` state | `'manager_001'` のハードコード | 認証コンテキスト（ログインユーザー情報）から実際のユーザーIDを取得する |
| 3 | `ownerFilter`（my_only）| stateとUIは存在するが、`filteredData` の `useMemo` 計算に `ownerFilter` 条件が含まれていない（フィルターが機能していない） | `filteredData` の `useMemo` 内に「ログインユーザーの所有プロジェクトのみ」を絞り込む条件を追加する |

---

### 2. `WorkProgressDetailDialog.tsx`（プロジェクト進捗詳細ダイアログ）

#### 🔴 完全モック使用

| # | 箇所 | 問題内容 | 必要な実装 |
|---|------|----------|----------|
| 1 | `fetchFileDetails()` 全体 | モックデータ（`mockProjects.json`）から全データを取得。実APIコールはコメントアウト済み | コメントアウトされたAPIコールを復活させ、対応するバックエンドAPIを実装する |
| 2 | プロジェクトID抽出ロジック | `fileKey.match(/projects?\/(proj_\d+)/)` という `proj_XXX` 形式を前提とした正規表現。実際のプロジェクトIDがUUID形式ならマッチしない | 実APIに切り替える際にID抽出ロジックも見直す |

**必要なバックエンドAPI（現在未実装）:**

プロジェクト進捗詳細取得エンドポイントを新規作成する必要がある。
```
GET /api/v1/projects/:projectId/work-details  （エンドポイント名は要検討）
```

レスポンスに含める必要がある情報：
- `projectInfo`（プロジェクト名・ステータス・オーナー名・部門・メソッド一覧・作成日時・更新日時）
- `fileInfo`（maimlFileKey・ファイル名・チェックアウト状態）
- `workDetails[]`（タスク一覧・各タスクのトランジション進捗・統計情報）

---

### 3. `PetriNetVisualization.tsx` + `apiClient.ts`（実験フロー図）

#### 🔴 完全モック使用（3つの関数すべて）

`apiClient.ts` 内の `shouldUseMockAPI()` 関数が `return true` でハードコードされており、全API呼び出しが強制的にモックデータを返す。

| # | 関数 | 問題内容 | 必要な実装 |
|---|------|----------|----------|
| 1 | `shouldUseMockAPI()` | `return true` ハードコードでモック固定 | 環境変数（例: `NEXT_PUBLIC_USE_MOCK_API`）で切り替えられるよう変更する |
| 2 | `fetchPetriNetStructure()` | モックJSONを返す。実APIモード時は `GET /api/worker/petri-net-structure/:fileKey` を呼び出そうとするが、このパスはバックエンドに存在しない | `POST /api/v1/maiml/parse-petri-net-structure`（**バックエンド実装済み**）を呼び出すよう書き換える |
| 3 | `fetchTransitionStatus()` | モックJSONを返す。実APIモード時は `GET /api/worker/transition-status/:workerId/:fileKey` を呼び出そうとするが、このパスはバックエンドに存在しない | `GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions`（**バックエンド実装済み**）に接続するよう書き換える。ただし引数形式（workerId/fileKey → projectName/methodId/taskNo）の変換ロジックが必要 |
| 4 | `fetchExperimentRecords()` | モックJSONを返す。実APIモード時は `GET /api/experiment-records/by-work-id/:workId` を呼び出そうとするが、このパスの実装状況は要確認 | 実験記録取得APIへの接続。バックエンドの実装状況を確認してから対応する |

---

### 4. `TaskResultsTable.tsx`（タスク結果テーブル）

#### 結果: API依存なし（表示専用コンポーネント）

親コンポーネントからPropsでデータを受け取る純粋な表示コンポーネントのため、API連携は不要。

#### 🔴 UI実装漏れ（APIとは無関係）

| # | 箇所 | 問題内容 |
|---|------|----------|
| 1 | 操作カラム | 仕様書に「詳細ボタン → `onViewResult(result)` コールバック」が定義されているが、コード上に操作カラム・詳細ボタンが実装されていない |

---

## 対応が必要な実装作業一覧

### フロントエンド側

| 優先度 | コンポーネント / ファイル | 実装箇所 | 実装内容 |
|--------|------------------------|---------|---------|
| ⭐⭐⭐ 高 | `ProgressMonitoring.tsx` | `handleViewDetails()` | `maimlFileKey` をAPIから取得した実際の値で生成する（ハードコード廃止） |
| ⭐⭐⭐ 高 | `ProgressMonitoring.tsx` | `managerId` state初期値 | 認証コンテキストからログインユーザーのIDを取得して設定する |
| ⭐⭐⭐ 高 | `WorkProgressDetailDialog.tsx` | `fetchFileDetails()` | モックデータをAPIコールに置き換える（コメントアウト解除＋エンドポイントURL修正） |
| ⭐⭐⭐ 高 | `apiClient.ts` | `shouldUseMockAPI()` | 環境変数による切り替えに変更する |
| ⭐⭐⭐ 高 | `apiClient.ts` | `fetchPetriNetStructure()` | APIパスを `POST /api/v1/maiml/parse-petri-net-structure` に修正する |
| ⭐⭐ 中 | `apiClient.ts` | `fetchTransitionStatus()` | APIパスをバックエンドの既存progressRoutesに合わせて修正し、引数変換ロジックを実装する |
| ⭐⭐ 中 | `ProgressMonitoring.tsx` | `ownerFilter`（my_only） | `filteredData` の `useMemo` 内にownerFilter条件を追加する |
| ⭐ 低 | `apiClient.ts` | `fetchExperimentRecords()` | バックエンド実装状況確認後、実APIに接続する |
| ⭐ 低 | `TaskResultsTable.tsx` | 操作カラム | 仕様書に従い詳細ボタン（`onViewResult`コールバック）を実装する |

### バックエンド側

| 優先度 | API | 現状 | 実装内容 |
|--------|-----|------|---------|
| ⭐⭐⭐ 高 | プロジェクト進捗詳細取得 | 🔴 未実装 | `WorkProgressDetailDialog` 用のAPI（projectInfo・fileInfo・workDetails・transitionProgressを一括返却）を設計・実装する |
| ⭐⭐ 中 | `GET /api/v1/projects/:projectId/methods/:methodId/tasks` | 🔴 未実装（仕様書に記載あり） | メソッド別タスク一覧＋進捗情報を取得するAPIを実装する |
| ⭐ 低 | `GET /api/v1/tasks/:taskId` | 🔴 未実装（仕様書に記載あり） | タスク詳細取得APIを実装する |

---

## 特記事項

### 既存バックエンド実装の活用可能なAPI

以下のAPIはバックエンドに実装済みのため、フロントエンド側のAPIパス・引数形式を合わせることで活用できる。

| API | エンドポイント | 活用先コンポーネント |
|-----|-------------|------------------|
| Petri Net構造解析 | `POST /api/v1/maiml/parse-petri-net-structure` | `PetriNetVisualization.fetchPetriNetStructure()` |
| トランジション進捗取得 | `GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` | `PetriNetVisualization.fetchTransitionStatus()` |
| プロジェクト一覧取得 | `GET /api/v1/projects` | `ProgressMonitoring`（実装済み） |

### InstructionDialogについて

`docs/design/ui/experiment_admin/03_progress_monitoring/ui_instruction_dialog.md` に記載されているInstructionDialogコンポーネントは、仕様書の「1.2. 使用場面」に「**ProjectManagement画面**から作業指示を送信する場合」と明記されており、**進捗確認タブからは呼び出されないため調査・修正対象外**とした。

---

## 変更履歴

| 日付 | 内容 | 担当者 |
|------|------|--------|
| 2026-03-09 | 初版作成（調査レポート） | Cline |
