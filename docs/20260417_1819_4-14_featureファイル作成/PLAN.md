# タスク計画書: 4-14 PropertyViewer 値なし区別表示・ツールチップ featureファイル作成

## メタデータ
- **作成日時**: 2026-04-17 18:19
- **タスクID**: 4-14_feature_file
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の **4-14: PropertyViewer 値なし区別表示・ツールチップ** に対応するfeatureファイルが存在しなかったため、手動テストの手順明確化を目的として新規作成する。

## 目的と期待される成果

### 目的
- 手動テスト実施者がテスト手順・確認ポイントを明確に把握できるようにする
- No.8（改善仕様）の対応内容（`undefined` / `null` / `""` / `0` / `true` / `false` の区別表示）を網羅的にテストできるようにする

### 期待される成果
- [x] `tests/e2e/features/4_experiment_admin/4-14_property_viewer_value_display.feature` を新規作成
- [x] 全15シナリオ（4-14-1〜4-14-15）が記述されていること
- [x] 各シナリオに手動テスト手順・確認ポイントが明記されていること
- [x] 既存featureファイル（4-17等）と同一フォーマットであること

## 実装ステップ

- [x] 既存の手動テスト用featureファイル（4-17）の形式を確認
- [x] 4-14のfeatureファイルを新規作成
  - ヘッダー部（テスト実行情報・前提条件・参照資料・対象コンポーネント・注意事項）
  - 機能ブロック（全15シナリオのタイトル一覧）
  - 背景（テストユーザー前提）
  - 各シナリオ（`@4-14-N @manual` タグ付き、手動テスト手順・確認ポイント付き）

## 変更ファイル

### 新規作成
1. `tests/e2e/features/4_experiment_admin/4-14_property_viewer_value_display.feature` - 4-14テストシナリオのfeatureファイル
2. `docs/20260417_1819_4-14_featureファイル作成/PLAN.md` - 本タスク計画書

### 修正
- なし

## 対象シナリオ一覧

| シナリオID | シナリオ名 | 種別 |
|-----------|-----------|------|
| 4-14-1 | PropertyViewer（Drawer）が開き、3タブが表示されること | 表示確認 |
| 4-14-2 | `undefined` → 「未設定」斜体グレー表示 | 表示確認 |
| 4-14-3 | `undefined` → ツールチップ「値が設定されていません」 | 表示確認 |
| 4-14-4 | `null` → 「null」斜体グレー表示 | 表示確認 |
| 4-14-5 | `null` → ツールチップ「null が設定されています」 | 表示確認 |
| 4-14-6 | `""` → `""(空文字)` 表示 | 表示確認 |
| 4-14-7 | `""` → ツールチップ「空の文字列が設定されています」 | 表示確認 |
| 4-14-8 | `0` → 「未設定」でなく「0」表示（falsy誤判定確認） | 表示確認 |
| 4-14-9 | `true` → 緑タグ「true」表示（「はい」でないこと） | 表示確認 |
| 4-14-10 | `false` → 赤タグ「false」表示（「未設定」でないこと） | 表示確認 |
| 4-14-11 | テンプレートタブ・`xsi:type`未設定 → 「-」＋ツールチップ | 表示確認 |
| 4-14-12 | テンプレートタブ・説明/単位未設定 → 「-」＋ツールチップ | 表示確認 |
| 4-14-13 | テンプレート未設定ノード → 空タブのツールチップ | 表示確認 |
| 4-14-14 | `StructuredPropertySelector` でも同様の区別表示 | 表示確認 |
| 4-14-15 | `PropertyViewerWithSelection` でも同様の区別表示 | 表示確認 |

## リスク

| リスク | 対策 |
|--------|------|
| テスト用MAIMLファイルに必要なプロパティ値が含まれていない場合、テストが実施できない | featureファイルのヘッダーに各シナリオで必要なMAIMLデータの具体的な記述例を明記した |
| `StructuredPropertySelector` / `PropertyViewerWithSelection` が使用される画面が不明な場合 | 各シナリオのコメントに画面の特定方法を記載した |

## 参照ドキュメント

- 実装ドキュメント: `docs/改善仕様調査/No.8/result.md`
- テストシナリオ: `tests/e2e/test-scenarios/4_experiment_admin.md` §4-14
- 対象コンポーネント:
  - `frontend/src/components/viewer/dialogs/PropertyViewer.tsx`
  - `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx`
  - `frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx`

## 承認記録

- **計画書提示日時**: 2026-04-17 18:19
- **承認日時**: -
- **承認者コメント**: -

## 実施記録

### 実施日時
開始: 2026-04-17 18:16
完了: 2026-04-17 18:21

### 計画からの変更点
なし

### 最終的な成果物
- [x] `tests/e2e/features/4_experiment_admin/4-14_property_viewer_value_display.feature` 作成完了（全15シナリオ）
- [x] `docs/20260417_1819_4-14_featureファイル作成/PLAN.md` 作成完了
