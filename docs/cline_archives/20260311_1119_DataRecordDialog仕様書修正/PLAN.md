# タスク計画書: DataRecordDialog 仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 11:19
- **タスクID**: DataRecordDialog仕様書修正
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

`docs/design/ui/experiment_worker/ui_data_record_dialog.md` の仕様書を、現在のソースコード実装に合わせて修正する。

ソースコード調査により、以下の主要な差分が判明した：
1. Props定義に実装済みの項目が未記載
2. ステータス定義が文字列型→数値型に変更されているが仕様書は旧仕様のまま
3. ステータス遷移ルールが仕様書に未記載
4. GET API（実績データ取得）が仕様書に未記載
5. ステータス更新APIのエンドポイント・HTTPメソッドが旧仕様のまま
6. 保存処理の実装が大幅に変更されているが仕様書はモック記述のまま
7. みなし進捗の挙動が一部未記載
8. テンプレート一覧の表示ロジック（API取得優先）が未記載

## 目的と期待される成果
- [ ] 仕様書がソースコードの実装内容と一致する状態にする
- [ ] 将来の開発者が仕様書を見て正確に実装を理解できる状態にする

---

## 調査結果サマリー

### 差分一覧

| # | カテゴリ | 差分内容 | 優先度 |
|---|---------|---------|--------|
| 1 | Props定義 | `projectName`, `taskNo`, `useDeemedProgress` が未記載 | 高 |
| 2 | ステータス定義 | 文字列型→数値型（0〜6）への変更が未反映 | 高 |
| 3 | ステータス遷移ルール | `ALLOWED_TRANSITIONS` が仕様書に未記載 | 高 |
| 4 | GET API | テンプレート実績データ取得APIが仕様書に未記載 | 高 |
| 5 | ステータス更新API | エンドポイント・HTTPメソッドが旧仕様（PUT→PATCH、/experiments→/progress、projectId→projectName） | 高 |
| 6 | 保存API | パスパラメータが `projectId`→`projectName` に変更 | 高 |
| 7 | State定義 | `templateDataLoading`, `fetchedTemplates`, `fetchedTemplateItems` が未記載 | 中 |
| 8 | 保存処理 | モック→実API実装への変更、placeId設定処理などが未反映 | 中 |
| 9 | みなし進捗 | `useDeemedProgressProp=false`時にチェックボックス非表示の挙動が未記載 | 中 |
| 10 | テンプレート表示 | API取得データ優先・Spinコンポーネントが未記載 | 中 |
| 11 | 未使用import | `Collapse`, `Card` が未使用（低優先、コードの問題のため仕様書修正対象外） | 低 |

---

## 実装ステップ（細分化）

### Phase 1: Props定義の修正
- [ ] Step 1-1: `projectName?: string` を Props に追加（API呼び出しに使用する旨を記載）
- [ ] Step 1-2: `taskNo?: number` を Props に追加（実験データ保存APIのパスパラメータ）
- [ ] Step 1-3: `useDeemedProgress?: boolean` を Props に追加（組織設定フラグ）

### Phase 2: ステータス定義の修正
- [ ] Step 2-1: ステータス選択肢の値を文字列型から数値型（0〜6）に変更
- [ ] Step 2-2: ステータスラベルを実装に合わせて更新（「準備完了状態」など）
- [ ] Step 2-3: `TransitionStatus = number` 型の説明を追記

### Phase 3: ステータス遷移ルールの追加
- [ ] Step 3-1: `ALLOWED_TRANSITIONS` の遷移ルール表を仕様書に追記
- [ ] Step 3-2: 終端ステータス（5: 終状態、6: 異常終了）での変更不可ルールを追記
- [ ] Step 3-3: `statusOptions`（遷移可能なステータスのみ表示）の動作を追記

### Phase 4: State定義の修正
- [ ] Step 4-1: `templateDataLoading` State を追加
- [ ] Step 4-2: `fetchedTemplates` State を追加
- [ ] Step 4-3: `fetchedTemplateItems` State を追加
- [ ] Step 4-4: `selectedStatus` の初期値・型変更を反映（文字列→数値）
- [ ] Step 4-5: `useDeemedProgress` の初期値変更を反映（Propsから同期）

### Phase 5: useMemoの更新
- [ ] Step 5-1: `filteredTemplates` の依存配列を更新（`fetchedTemplates`, `transition?.templates` を追加）
- [ ] Step 5-2: `selectedTemplate` の依存配列は変更なし（確認のみ）

### Phase 6: APIエンドポイントの修正
- [ ] Step 6-1: 実験データ保存APIのパスパラメータを `projectId`→`projectName` に修正
- [ ] Step 6-2: ステータス更新APIのHTTPメソッドを `PUT`→`PATCH` に修正
- [ ] Step 6-3: ステータス更新APIのパスを `/api/v1/experiments/...`→`/api/v1/progress/...` に修正
- [ ] Step 6-4: ステータス更新APIの `taskNo` をパスパラメータからリクエストボディに移動
- [ ] Step 6-5: GET API（テンプレート実績データ取得）の仕様を新規追加

### Phase 7: 保存処理の更新
- [ ] Step 7-1: `handleSaveTemplate` のモック処理の記述を実際のAPI呼び出し処理に更新
- [ ] Step 7-2: `placeId` 設定ロジックの説明を追記
- [ ] Step 7-3: GETレスポンスの `fetchedTemplateItems` を参照するデータ構造保持の説明を追記
- [ ] Step 7-4: エラーハンドリング（サーバーエラーメッセージ優先表示）の記述を追加

### Phase 8: みなし進捗機能の更新
- [ ] Step 8-1: `useDeemedProgressProp=false` 時にチェックボックスが非表示になる動作を追記
- [ ] Step 8-2: チェックボックス非表示時はステータス更新を常時表示する動作を追記

### Phase 9: テンプレート一覧の更新
- [ ] Step 9-1: API取得データ（`fetchedTemplates`）を優先、`transition.templates` へのフォールバックを記載
- [ ] Step 9-2: `Spin` コンポーネント（テンプレート実績データ読み込み中表示）を使用コンポーネントに追加
- [ ] Step 9-3: ダイアログオープン時のテンプレート実績データ自動取得の動作を追記

### Phase 10: バージョン管理の更新
- [ ] Step 10-1: 変更履歴テーブルに今回の修正内容を追記

---

## 変更ファイル

1. `docs/design/ui/experiment_worker/ui_data_record_dialog.md` - 仕様書の修正（全Phase対象）

---

## リスク

| リスク | 対策 |
|--------|------|
| 仕様書の修正漏れ | Phase単位で細かく実施・確認 |
| ソースコードとの再乖離 | 各修正後にソースコードと照合確認 |

---

## 承認記録
- **計画書提示日時**: 2026-03-11 11:19
- **承認日時**: （承認後記入）
