# タスク計画書: ページネーション件数オプション統一

## メタデータ
- **作成日時**: 2026-04-24 09:54
- **タスクID**: pagination-unify
- **優先度**: 低
- **推定工数**: 1時間

## タスク概要

全ロール・全画面のページネーション件数オプションを `['20', '50', '100']` に統一する。
現在は画面ごとに `['10', '20', '50', '100']`、`['5', '10', '25', '50']`、`['10', '20', '50']` など
バラバラに設定されており、UXの一貫性を損ねている。

## 目的と期待される成果
- [ ] 全画面のページネーション件数オプションが `['20', '50', '100']` に統一される
- [ ] 初期表示件数が 20 件に統一される（現状 5 件・10 件になっている画面の修正を含む）

## 実装ステップ
- [ ] `SystemManagement/UserManagement.tsx` の pageSizeOptions を変更
- [ ] `SystemManagement/DepartmentManagement.tsx` の pageSizeOptions を変更
- [ ] `SystemManagement/RoleManagement.tsx` の pageSizeOptions を変更
- [ ] `SystemManagement/SessionManagement.tsx` の pageSizeOptions を追加・pageSize を 20 に変更
- [ ] `progress/ProgressMonitoring.tsx` の pageSizeOptions を変更・pageSize を 20 に変更
- [ ] `DataManagement/MasterManagement.tsx` の pageSizeOptions を変更
- [ ] `Provider/OrganizationManagement.tsx` の pageSizeOptions を変更
- [ ] `Provider/CorporationManagement.tsx` の pageSizeOptions を変更
- [ ] `ExperimentWorker/TaskListTable.tsx` の pageSizeOptions を変更
- [ ] `ExperimentWorker/TransitionList.tsx` の pageSizeOptions を変更
- [ ] `ExperimentWorker/ProjectSelectionModal.tsx` の pageSizeOptions を変更・pageSize を 20 に変更
- [ ] `ExperimentWorker/MethodSelectionModal.tsx` の pageSizeOptions を変更・pageSize を 20 に変更
- [ ] `ExperimentWorker/MethodTaskSelectionModal.tsx` の pageSizeOptions を変更・pageSize を 20 に変更

## 変更ファイル一覧

| # | ファイルパス | 現在の pageSizeOptions | 現在の pageSize | 変更内容 |
|---|------------|----------------------|----------------|---------|
| 1 | `frontend/src/components/SystemManagement/UserManagement.tsx` | `['10', '20', '50', '100']` | 20 | pageSizeOptions変更 |
| 2 | `frontend/src/components/SystemManagement/DepartmentManagement.tsx` | `['10', '20', '50', '100']` | 20 | pageSizeOptions変更 |
| 3 | `frontend/src/components/SystemManagement/RoleManagement.tsx` | `['10', '20', '50', '100']` | 20 | pageSizeOptions変更 |
| 4 | `frontend/src/components/SystemManagement/SessionManagement.tsx` | なし | 10 | pageSizeOptions追加 + pageSize → 20 |
| 5 | `frontend/src/components/progress/ProgressMonitoring.tsx` | `['5', '10', '25', '50']` | 10 | pageSizeOptions変更 + pageSize → 20 |
| 6 | `frontend/src/components/DataManagement/MasterManagement.tsx` | `['10', '20', '50', '100']` | 20 | pageSizeOptions変更 |
| 7 | `frontend/src/components/Provider/OrganizationManagement.tsx` | `['10', '20', '50', '100']` | 20 | pageSizeOptions変更 |
| 8 | `frontend/src/components/Provider/CorporationManagement.tsx` | `['10', '20', '50', '100']` | 20 | pageSizeOptions変更 |
| 9 | `frontend/src/components/ExperimentWorker/TaskListTable.tsx` | `['10', '20', '50', '100']` | 20 | pageSizeOptions変更 |
| 10 | `frontend/src/components/ExperimentWorker/TransitionList.tsx` | `['10', '20', '50', '100']` | 20 | pageSizeOptions変更 |
| 11 | `frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx` | `['10', '20', '50', '100']` | 10 | pageSizeOptions変更 + pageSize → 20 |
| 12 | `frontend/src/components/ExperimentWorker/MethodSelectionModal.tsx` | `['10', '20', '50']` | 10 | pageSizeOptions変更 + pageSize → 20 |
| 13 | `frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx` | `['10', '20', '50']` | 10 | pageSizeOptions変更 + pageSize → 20 |

## リスク
| リスク | 対策 |
|--------|------|
| pageSizeOptions 変更により既存の 10 件表示が消える | 初期 pageSize を 20 に統一し影響を最小化 |
| SessionManagement の pageSizeOptions が未設定のため設定追加が必要 | pagination オブジェクトに pageSizeOptions を追加する |

## テスト計画
- [ ] システム管理者でログインし、各管理画面のページネーション右下に 20件/50件/100件 が表示されることを確認
- [ ] 実験管理者でログインし、進捗確認タブのページネーションが 20件/50件/100件 であることを確認
- [ ] データ管理者でログインし、マスタ管理画面のページネーションを確認
- [ ] プロバイダーでログインし、組織管理・会社管理のページネーションを確認
- [ ] 実験作業者でログインし、タスク一覧・遷移一覧・各モーダルのページネーションを確認

## 承認記録
- **計画書提示日時**: 2026-04-24 09:54
- **承認日時**: 
- **承認者コメント**: 
