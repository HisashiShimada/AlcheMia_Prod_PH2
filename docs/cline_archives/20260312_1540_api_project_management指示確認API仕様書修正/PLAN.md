# タスク計画書: api_project_management.md 指示確認関連API仕様書修正

## メタデータ
- **作成日時**: 2026-03-12 15:40
- **タスクID**: api_project_management指示確認API仕様書修正
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`docs/design/api/API一覧_実験作業者画面.md` の「6. 指示確認関連 API」（#15, #16）に記載されているAPIについて、`docs/design/api/api_project_management.md` の仕様書を実際のソースコード実装に合わせて修正する。

## 調査結果

### 調査対象ファイル

- **コントローラー**: `backend/src/controllers/projectController.ts`
- **修正対象仕様書**: `docs/design/api/api_project_management.md`
- **参照仕様**: `docs/design/api/API一覧_実験作業者画面.md` セクション6

### API #11: 指示一覧取得（実験作業者用） `GET /api/v1/projects/:projectName/worker-instructions`

対応するコントローラー関数: `getWorkerInstructions`

| 項目 | 現在の仕様書 | 実際の実装 | 修正要否 |
|------|------------|---------|---------|
| 実装状態 | 🔴 未実装 | ✅ 実装済み | ✅ 要修正 |
| クエリパラメータ | `projectId` のみ記載 | `projectId` のみ（実装と一致） | - |
| エラーハンドリング詳細 | 軽微な記述のみ | `RESOURCE_NOT_FOUND`(404), `VALIDATION_*`(400), `PERMISSION_INSUFFICIENT`(403), `SYSTEM_DATABASE_ERROR`(500) | ✅ 要修正 |
| 実装ファイル | 未記載 | `projectController.ts` (`getWorkerInstructions`), `projectService.ts` (`getWorkerInstructions`) | ✅ 要修正 |
| 実装要件（DBクエリ例） | 擬似コードで記述 | `projectService.getWorkerInstructions({ projectName, organizationId, userId, userRole, filters })` として呼び出し | ✅ 要修正 |

### API #12: 指示確認完了 `PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm`

対応するコントローラー関数: `confirmInstruction`

| 項目 | 現在の仕様書 | 実際の実装 | 修正要否 |
|------|------------|---------|---------|
| 実装状態 | 🔴 未実装 | ✅ 実装済み | ✅ 要修正 |
| エラーコード 400 | 「バリデーションエラー、既に確認済み」（コード名未記載） | `BUSINESS_ALREADY_ACKNOWLEDGED`(400), `VALIDATION_*`(400) | ✅ 要修正 |
| エラーコード 500 | 記載なし | `SYSTEM_DATABASE_ERROR`(500) | ✅ 要修正 |
| Service呼び出し方法 | DB直接操作コードで記述 | `projectService.confirmInstruction(instructionId, projectName, userId, organizationId, role)` | ✅ 要修正 |
| 実装ファイル | 未記載 | `projectController.ts` (`confirmInstruction`), `projectService.ts` (`confirmInstruction`) | ✅ 要修正 |

## 目的と期待される成果

- [ ] API一覧テーブルで #9, #10 の実装状態を「未実装」→「実装済み」に更新
- [ ] 実装状況サマリーの「指示管理」カテゴリを更新
- [ ] API #11（指示一覧取得 実験作業者用）の詳細仕様を実装に合わせて修正
- [ ] API #12（指示確認完了）の詳細仕様を実装に合わせて修正
- [ ] 変更履歴にバージョン 3.1.0 を追記

## 実装ステップ

### Phase 1: API一覧テーブルと実装状況サマリー修正
- [ ] API一覧テーブル（🎯 API一覧セクション）で #9, #10 を「✅ 実装済み」に変更
- [ ] 実装状況サマリーの「指示管理」カテゴリを「実装済み 4, 未実装 0」に変更

### Phase 2: API #11 詳細仕様の修正
- [ ] 実装状態を「🔴 未実装」→「✅ 実装済み」に変更
- [ ] 実装ファイル情報を追加
- [ ] 実装要件コードを実際の Service 呼び出しに更新

### Phase 3: API #12 詳細仕様の修正
- [ ] 実装状態を「🔴 未実装」→「✅ 実装済み」に変更
- [ ] エラーレスポンスに `BUSINESS_ALREADY_ACKNOWLEDGED`(400) を追加
- [ ] エラーコード `SYSTEM_DATABASE_ERROR`(500) を追加
- [ ] ビジネスロジックのコードを実際の Service 呼び出しに修正
- [ ] 実装ファイル情報を追加

### Phase 4: 変更履歴更新
- [ ] バージョン 3.1.0 として変更内容を記録

## 変更ファイル

1. `docs/design/api/api_project_management.md` - 指示確認関連API仕様書の修正

## リスク

| リスク | 対策 |
|--------|------|
| replace_in_fileのSEARCHブロックがマッチしない | 各修正を細かく分割し、最小限のSEARCHブロックを使用する |
| 仕様書の他の記述と矛盾が生じる | 修正箇所を限定し、関連する記述を確認してから修正する |

## 承認記録

- **計画書提示日時**: 2026-03-12 15:40
- **承認日時**: 2026-03-12 15:40
- **承認者コメント**: 承認済み（Act modeに切り替え）
