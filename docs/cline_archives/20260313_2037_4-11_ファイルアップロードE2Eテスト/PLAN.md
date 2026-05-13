# タスク計画書: 4-11 ファイルアップロード E2Eテスト

## メタデータ
- **作成日時**: 2026-03-13 20:37
- **タスクID**: 4-11_file_upload_e2e
- **優先度**: 中
- **推定工数**: 1.5時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の「4-11: ファイルアップロード」シナリオに対応する E2E テストを実装する。

- **featureファイル**: BDD シナリオ定義（Gherkin 記法）
- **stepsファイル**: Playwright を使用したステップ定義（TypeScript）

手動テスト対象（4-11-3, 4-11-4）は featureファイルに `@manual` タグで定義するが、stepsファイルは作成しない。

## 目的と期待される成果

- [x] `tests/e2e/features/4_experiment_admin/4-11_file_upload.feature` が作成されること
- [x] `tests/e2e/steps/4_experiment_admin/4-11_file_upload.ts` が作成されること
- [x] Playwright 自動化対象（4-11-1, 4-11-2, 4-11-5〜4-11-10）のステップが実装されること
- [x] 手動テスト（4-11-3, 4-11-4）が `@manual` タグで featureファイルに定義されること

## 実装ステップ

### Phase 1: タスク計画書の作成
- [x] タスク専用フォルダの作成
- [x] PLAN.md の作成

### Phase 2: featureファイルの作成
- [ ] `4-11_file_upload.feature` の作成（ヘッダー・背景・自動化シナリオ）
- [ ] 手動テストシナリオ（4-11-3, 4-11-4）の追記

### Phase 3: stepsファイルの作成
- [ ] `4-11_file_upload.ts` のヘッダー・定数・型定義の作成
- [ ] Before/After フックの実装
- [ ] Given ステップの実装
- [ ] When ステップの実装（ダイアログ操作）
- [ ] Then ステップの実装（表示確認）
- [ ] ヘルパー関数の実装（upsertProject等）

## 変更ファイル

### 新規作成するファイル
1. `docs/20260313_2037_4-11_ファイルアップロードE2Eテスト/PLAN.md` - このファイル
2. `tests/e2e/features/4_experiment_admin/4-11_file_upload.feature` - featureファイル
3. `tests/e2e/steps/4_experiment_admin/4-11_file_upload.ts` - stepsファイル

## シナリオ詳細

| シナリオID | テスト方法 | シナリオ名 |
|-----------|-----------|-----------|
| 4-11-1 | Playwright自動 | 単一ファイルモードでファイルをアップロードできること |
| 4-11-2 | Playwright自動 | 一括ファイルモードで複数ファイルを同時にアップロードできること |
| 4-11-3 | **手動** | フォルダモードでフォルダをアップロードできること |
| 4-11-4 | **手動** | フォルダ構造を保持するオプションが有効な場合にフォルダ階層を維持してアップロードできること |
| 4-11-5 | Playwright自動 | アップロード中にファイル完了件数とパーセントが進捗表示されること |
| 4-11-6 | Playwright自動 | アップロード完了後に成功メッセージが表示されること |
| 4-11-7 | Playwright自動 | ファイルを選択せずにアップロードボタンを押すと警告メッセージが表示されること |
| 4-11-8 | Playwright自動 | アップロード中にダイアログを閉じようとすると確認ダイアログが表示されること |
| 4-11-9 | Playwright自動 | 単一ファイルモードで複数ファイルを選択すると最後の1ファイルのみが選択状態になること |
| 4-11-10 | Playwright自動 | モード切り替え時に選択済みファイルリストがクリアされること |

## data-testid 一覧（フロントエンド付与が必要）

```
BulkUploadDialog コンポーネント:
- [bulk-upload-dialog]              : ダイアログ本体（Modal）
- [upload-type-segment]             : アップロードタイプ Segmented
- [upload-dragger]                  : ファイルドラッグ&ドロップエリア
- [folder-select-button]            : フォルダ選択ボタン（フォルダモード）
- [upload-file-list]                : 選択ファイル一覧エリア
- [upload-start-button]             : 「アップロード開始」ボタン
- [upload-cancel-button]            : 「キャンセル」ボタン
- [upload-progress-alert]           : アップロード中 Alert
- [upload-progress-bar]             : 進捗バー
- [upload-success-alert]            : 完了 Alert（success）
- [upload-error-alert]              : エラー Alert（error）

ProjectManagement ツールバー:
- [upload-button]                   : 「アップロード」ボタン
```

## リスク

| リスク | 対策 |
|--------|------|
| POST `/api/v1/files/upload` のレスポンス待機タイムアウト | waitForResponse タイムアウトを30秒に設定 |
| S3 アップロードの後処理漏れ | After フックで upload_batch テーブルを削除 |
| 4-11-8（アップロード中のキャンセル）のタイミング制御困難 | アップロード開始直後にキャンセル操作を実行 |

## 承認記録
- **計画書提示日時**: 2026-03-13 20:37
- **承認日時**: 2026-03-13 20:37
- **承認者コメント**: 承認済み
