# タスク計画書: 4-10 プロジェクト公開 E2Eテスト作成

## メタデータ
- **作成日時**: 2026-03-13 20:24
- **タスクID**: 4-10_maiml_publish_e2e
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の「4-10: プロジェクト公開」に対応する
E2Eテスト用 featureファイルおよび stepsファイル（TypeScript）を作成する。

対象シナリオは全4件（すべてPlaywright自動テスト対象）。
手動テスト項目なし。

フロントエンド未実装のため、テストは `@pending` タグを付与しスキップ可能にする。

## 目的と期待される成果

- [ ] `4-10_maiml_publish.feature` の作成（日本語 Gherkin）
- [ ] `4-10_maiml_publish.ts` の作成（ステップ定義）
- [ ] 既存テストのコーディングスタイルと統一された実装

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] タスク専用フォルダ作成: `docs/20260313_2024_4-10_プロジェクト公開E2Eテスト/`
- [x] タスク計画書作成: `PLAN.md`

### Phase 2: featureファイル作成
- [ ] `tests/e2e/features/4_experiment_admin/4-10_maiml_publish.feature` 作成
  - 機能説明・背景・4シナリオ（@4-10-1 〜 @4-10-4）
  - フロントエンド未実装のため `@pending` タグを付与

### Phase 3: stepsファイル作成
- [ ] `tests/e2e/steps/4_experiment_admin/4-10_maiml_publish.ts` 作成
  - 定数定義（ORG_ID / ユーザー情報 / テストデータ名）
  - Before フック（シナリオ別テストデータ準備）
  - After フック（クリーンアップ: maiml_publish_registry → maiml_asset → project）
  - Given / When / Then ステップ定義
  - ヘルパー関数（upsertProject / upsertMaimlAsset）

## 変更ファイル

### 新規作成
1. `tests/e2e/features/4_experiment_admin/4-10_maiml_publish.feature`
2. `tests/e2e/steps/4_experiment_admin/4-10_maiml_publish.ts`
3. `docs/20260313_2024_4-10_プロジェクト公開E2Eテスト/PLAN.md`（本ファイル）

## 技術仕様

### data-testid 一覧（フロントエンド実装時に付与すること）

| data-testid | 対応要素 | 対応シナリオ |
|---|---|---|
| `maiml-publish-button` | 「公開」ボタン（未公開時） | 4-10-1, 4-10-2 |
| `maiml-publish-dialog` | MaimlPublishDialog モーダル | 4-10-1, 4-10-2 |
| `maiml-publish-preview-mode-select` | プレビューモード Selectコンポーネント | 4-10-2 |
| `maiml-publish-store-raw-checkbox` | 生データを保存するチェックボックス | 4-10-2 |
| `maiml-publish-submit-button` | 「公開する」実行ボタン | 4-10-2 |
| `maiml-publish-result` | 公開完了結果表示エリア | 4-10-2 |
| `maiml-publish-close-button` | 完了後「閉じる」ボタン | 4-10-2 |
| `maiml-published-button` | 「公開済み」ボタン（緑・disabled） | 4-10-3, 4-10-4 |
| `maiml-unpublish-menu-item` | 「非公開にする」ドロップダウン項目 | 4-10-4 |
| `maiml-unpublish-confirm-dialog` | MaimlUnpublishConfirmDialog モーダル | 4-10-4 |
| `maiml-unpublish-submit-button` | 「非公開にする」実行ボタン（赤） | 4-10-4 |
| `maiml-unpublish-cancel-button` | キャンセルボタン | 4-10-4 |

### API 連携

| シナリオ | API | メソッド |
|---|---|---|
| 4-10-2 | `/api/v1/maiml-opendata/publish` | POST |
| 4-10-3 | `/api/v1/maiml-opendata/status` | GET |
| 4-10-4 | `/api/v1/maiml-opendata/unpublish/:assetId` | DELETE |

### DBテーブル（クリーンアップ対象）

削除順序（外部キー制約のため）:
1. `maiml_series_preview`
2. `maiml_condition_kv`
3. `maiml_material_kv`
4. `maiml_publish_registry`
5. `maiml_asset`
6. `project`

## リスク

| リスク | 対策 |
|--------|------|
| フロントエンド未実装 | `@pending` タグで自動スキップ。フロントエンド実装後にタグ削除で有効化 |
| MAIMLファイルのS3配置が必要 | Before フックでプロジェクトのDBレコードのみ準備。S3ファイルは前提条件として記載 |
| asset_id が動的生成 | After フックでDBから `file_uri` 指定でクリーンアップ |

## 承認記録
- **計画書提示日時**: 2026-03-13 20:24
- **承認日時**: 2026-03-13 20:24
- **承認者コメント**: 承認済み
