# タスク計画書: 4-2 MAIML編集（PetriNetEditor）E2Eテスト featureファイル作成

## メタデータ
- **作成日時**: 2026-03-13 17:10
- **タスクID**: e2e-4-2-maiml-petri-net-editor
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の「4-2: MAIML編集（PetriNetEditor）」に記載された
26件のシナリオについて、playwright-bdd 形式の Gherkin featureファイルを作成する。

4-2 は**全件が手動テスト**のため、featureファイルのみ作成し、stepsファイルは作成しない。

## 目的と期待される成果
- [ ] featureファイル（26件）が作成されること
- [ ] 全シナリオに `@manual` タグが付与されること
- [ ] 手動テスト手順がコメントとして記述されること
- [ ] steps は作成しないこと（手動テスト項目のため）

## 実装ステップ

### Phase 1: featureファイル作成
- [ ] `tests/e2e/features/4_experiment_admin/4-2_maiml_petri_net_editor.feature` を新規作成
  - 機能ヘッダー・背景（Background）を記述
  - 4-2-1 〜 4-2-10（シナリオ10件）を記述
  - 4-2-11 〜 4-2-20（シナリオ10件）を追記
  - 4-2-21 〜 4-2-26（シナリオ6件）を追記

## 変更ファイル

### 新規作成
1. `tests/e2e/features/4_experiment_admin/4-2_maiml_petri_net_editor.feature` - 26件のシナリオ（全て手動テスト）

### 変更なし
- `tests/e2e/steps/4_experiment_admin/common.ts` - 背景ステップを再利用するため変更不要
- steps ファイル新規作成は不要（手動テストのため）

## 設計方針

### featureファイルの構成

```
# language: ja
機能: [4-2] MAIML編集（PetriNetEditor）
  ※テスト方法: 手動テスト（GUI操作が複雑なため自動化対象外）

  背景:
    前提 実験管理者のユーザID "experiment_admin_user@example.com" が
         DB（organization_userテーブル）に存在する

  @4-2-1 @manual
  シナリオ: [4-2-1] xxx
    # 手動テスト: xxx
```

### タグ設計
- `@{シナリオID}`: Playwright --grep による絞り込み用（例: `@4-2-1`）
- `@manual`: 手動テストシナリオの識別用、自動実行除外用

### シナリオ本文の記述方針
- 全シナリオは「手動テスト」のためステップなしのコメントのみ
- 前提条件・手順・注意事項を `#` コメントで記述
- テストシナリオ一覧の情報（根拠・種別）もコメントに含める

## 前提条件
- `common.ts` に `Given '実験管理者のユーザID {string} がDB（organization_userテーブル）に存在する'` が定義済みであること（確認済み）

## テスト計画
- 本タスクは featureファイル作成のみのため、Playwright実行は対象外
- 手動テスト実施者が本 featureファイルを参照してテストを実施する

## リスク
| リスク | 対策 |
|--------|------|
| シナリオ記述漏れ | テストシナリオ一覧（4_experiment_admin.md）と照合して26件全件を確認する |

## 承認記録
- **計画書提示日時**: 2026-03-13 17:10
- **承認日時**: 2026-03-13 17:10
- **承認者コメント**: 計画承認済み

## 実施記録

### 実施日時
開始: 2026-03-13 17:10
完了: -

### 最終的な成果物
- [ ] `tests/e2e/features/4_experiment_admin/4-2_maiml_petri_net_editor.feature`
