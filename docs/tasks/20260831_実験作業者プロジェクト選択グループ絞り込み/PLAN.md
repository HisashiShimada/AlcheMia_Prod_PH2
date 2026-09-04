# タスク計画書: 実験作業者メニューのプロジェクト選択グループ絞り込み対応

## メタデータ
- **作成日時**: 2026-08-31
- **タスクID**: worker-project-group-filter
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

実験作業者メニューのプロジェクト選択モーダルに表示されるプロジェクト一覧を、
ログインユーザーの「組織 + グループ（organization_group_cd）」で絞り込む。

現状は `organization_id` のみで絞り込みを行っており、同一組織内のすべてのプロジェクトが
表示されてしまっている。`projectService.ts` の `list()` と同じグループ階層フィルタロジック
（`findDescendantCds` + 非アクティブグループ救済）をworker用APIに適用する。

## 目的と期待される成果

- [x] ログインユーザーが所属するグループ（直接所属 + 配下グループ）に属するプロジェクトのみが表示される
- [x] 非アクティブグループのプロジェクトも適切な条件下で閲覧可能
- [x] UIの変更なし（バックエンドのみ変更）

## 実装ステップ

- [x] PLAN.md 作成（今このファイル）
- [x] `backend/src/sql/queries/projects/findWorkerAccessible.sql` にグループフィルタ追加
- [x] `backend/src/sql/queries/projects/countWorkerAccessible.sql` にグループフィルタ追加
- [x] `backend/src/repositories/workerProjectRepository.ts` にvisibleGroupCdsフィルタ対応
- [x] `backend/src/services/workerProjectService.ts` にグループ絞り込みロジック追加
- [x] `backend/src/controllers/workerProjectController.ts` にorganizationGroupCds渡し対応
- [x] `backend/src/types/workerProject.ts` の型定義更新
- [x] 関連テストファイルの更新（新シグネチャ対応）

## 変更ファイル

| # | ファイル | 変更種別 |
|---|---|---|
| 1 | `backend/src/types/workerProject.ts` | 変更（型定義更新） |
| 2 | `backend/src/controllers/workerProjectController.ts` | 変更（organizationGroupCds をService に渡す） |
| 3 | `backend/src/services/workerProjectService.ts` | 変更（グループ絞り込みロジック追加） |
| 4 | `backend/src/repositories/workerProjectRepository.ts` | 変更（visibleGroupCds フィルタ対応） |
| 5 | `backend/src/sql/queries/projects/findWorkerAccessible.sql` | 変更（グループフィルタ条件追加） |
| 6 | `backend/src/sql/queries/projects/countWorkerAccessible.sql` | 変更（グループフィルタ条件追加） |

## リスク

| リスク | 対策 |
|--------|------|
| 所属グループが0件のユーザーが全プロジェクトを見られなくなる | 空の場合は0件を返す（既存 projectService.ts と同じ挙動） |
| 非アクティブグループ救済ロジックの漏れ | projectService.ts の実装を参考に同一ロジックを適用 |

## テスト計画

- [ ] 所属グループに紐づくプロジェクトのみ表示されること
- [ ] 所属グループの配下グループのプロジェクトも表示されること
- [ ] 所属グループが空の場合は0件が返ること
- [ ] APIのビルドが通ること（tsc --noEmit）

## 承認記録
- **承認日時**: 2026-08-31（Act モード切り替えにより承認済み）
