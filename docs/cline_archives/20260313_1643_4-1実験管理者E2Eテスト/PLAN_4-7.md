# タスク計画書: 4-7 プロジェクトフィルタ・検索 E2Eテスト

## メタデータ
- **作成日時**: 2026-03-13 19:09
- **タスクID**: e2e-4-7-project-filter-search
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の「4-7: プロジェクトフィルタ・検索」シナリオに対応する
Playwright E2Eテスト（featureファイル + stepsファイル）を作成する。

## 目的と期待される成果

- [ ] `4-7_project_filter_search.feature` ファイルを作成する
- [ ] `4-7_project_filter_search.ts` stepsファイルを作成する
- [ ] `ProjectManagement.tsx` に必要な `data-testid` を追加する
- [ ] `ProjectFolderTree.tsx` に必要な `data-testid` を追加する

## 実装ステップ

### Phase 1: フロントエンドに data-testid を追加

- [ ] `ProjectManagement.tsx`: ステータスフィルタ Select に `data-testid="project-status-filter"` を追加
- [ ] `ProjectManagement.tsx`: チェックアウトフィルタ Select に `data-testid="checkout-status-filter"` を追加
- [ ] `ProjectManagement.tsx`: 検索Input に `data-testid="project-search-input"` を追加
- [ ] `ProjectFolderTree.tsx`: プロジェクトアイテムに `data-testid="project-item-{projectId}"` を追加

### Phase 2: featureファイルを作成

- [ ] `tests/e2e/features/4_experiment_admin/4-7_project_filter_search.feature` を作成

### Phase 3: stepsファイルを作成

- [ ] `tests/e2e/steps/4_experiment_admin/4-7_project_filter_search.ts` を作成

## 変更ファイル

### 新規作成
1. `tests/e2e/features/4_experiment_admin/4-7_project_filter_search.feature` - Gherkinシナリオ
2. `tests/e2e/steps/4_experiment_admin/4-7_project_filter_search.ts` - stepsの実装

### 修正
1. `frontend/src/components/project/ProjectManagement.tsx` - data-testid追加
2. `frontend/src/components/project/ProjectFolderTree.tsx` - data-testid追加

## シナリオ詳細

| シナリオID | シナリオ名 | 種別 | 対応API |
|-----------|-----------|------|---------|
| 4-7-1 | プロジェクトステータスでフィルタリングできること | 正常系 | GET `/api/v1/projects` |
| 4-7-2 | チェックアウト状態でフィルタリングできること | 正常系 | GET `/api/v1/projects` |
| 4-7-3 | キーワード検索でプロジェクトを絞り込みできること | 正常系 | GET `/api/v1/projects` |

## テストデータ設計

### Beforeフックで準備するプロジェクト（DBに UPSERT）

| project_id | project_name | project_status | checkout_status | 説明 |
|-----------|-------------|----------------|-----------------|------|
| E2E-4-7-planning | E2Eテスト用プロジェクト_4-7-planning | 0（計画中） | 0（checked_in） | ステータスフィルタ確認用 |
| E2E-4-7-in-progress | E2Eテスト用プロジェクト_4-7-in-progress | 2（実行中） | 1（checked_out） | ステータスフィルタ確認用 + チェックアウトフィルタ確認用 |
| E2E-4-7-search | E2E検索用プロジェクト_4-7 | 0（計画中） | 0（checked_in） | キーワード検索確認用（ヒットするプロジェクト） |
| E2E-4-7-other | E2Eテスト用プロジェクト_4-7-other | 0（計画中） | 0（checked_in） | キーワード検索確認用（ヒットしないプロジェクト） |

### フィルタ選択肢（設計書より）
- **ステータス**: 全て / 計画中(0) / 実行待ち(1) / 実行中(2) / レビュー待ち(3) / 完了(4) / エラー(5)
- **チェックアウト状態**: 全て / チェックイン済み(checked_in) / チェックアウト中(checked_out)
- **検索対象**: プロジェクト名、プロジェクトID、ステータス表示名、部門名、所有者名

## data-testid 設計

| コンポーネント | 要素 | data-testid |
|-------------|------|------------|
| ProjectManagement.tsx | プロジェクトステータスフィルタ Select | `project-status-filter` |
| ProjectManagement.tsx | チェックアウトステータスフィルタ Select | `checkout-status-filter` |
| ProjectManagement.tsx | 検索Input | `project-search-input` |
| ProjectFolderTree.tsx | プロジェクトアイテム（行） | `project-item-{projectId}` |

## 承認記録
- **計画書提示日時**: 2026-03-13 19:09
- **承認日時**: 2026-03-13 19:09
- **承認者コメント**: 承認済み（ユーザー確認済み）
