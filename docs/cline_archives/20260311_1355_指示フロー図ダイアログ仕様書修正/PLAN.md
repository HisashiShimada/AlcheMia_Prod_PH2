# タスク計画書: 指示フロー図ダイアログ仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 15:55
- **タスクID**: 指示フロー図ダイアログ仕様書修正
- **優先度**: 中
- **推定工数**: 30分

## タスク概要

`docs/design/ui/experiment_worker/ui_instruction_flow_dialog.md` の仕様書をソースコード（`InstructionFlowDialog.tsx`）の実装内容に合わせて修正する。

## 目的と期待される成果

- [ ] 仕様書がソースコードの現状を正確に反映すること
- [ ] `FileData` 型定義の `content` フィールドが追記されること
- [ ] `loadFileContent` の実際のロジック（API取得コンテンツ優先・エラーハンドリング）が仕様書に反映されること

## 実装ステップ

### Phase 1: `FileData` 型定義の修正（§3.3）
- [ ] `content?: string` フィールドを追加（「APIから取得済みのファイルコンテンツ」の説明付き）

### Phase 2: `loadFileContent` 関数の修正（§4.1）
- [ ] `file.content` 優先ロジック（API取得済みコンテンツを優先使用）を追記
- [ ] HTTPエラーチェック（`response.ok` 確認）を追記
- [ ] `try/catch` によるエラーハンドリング（`message.error()` 表示）を追記

### Phase 3: 初期化フローの修正（§5.1）
- [ ] ステップ3を「`file.content` が存在する場合は直接使用、ない場合はモックfetch」に更新

### Phase 4: スタイリングの修正（§6.1・§6.3）
- [ ] §6.1 に `Rnd` コンポーネント自体にも `style={{ zIndex }}` を設定していることを追記
- [ ] §6.3 にコンテンツコンテナの `id` 属性（`instruction-flow-dialog-container-${id}`）を追記

### Phase 5: メタデータ・変更履歴の更新
- [ ] 最終更新日を 2026-03-11 に更新
- [ ] 変更履歴にバージョン 1.1.0 を追記

## 変更ファイル

1. `docs/design/ui/experiment_worker/ui_instruction_flow_dialog.md` - 仕様書修正

## リスク

| リスク | 対策 |
|--------|------|
| 修正漏れ | Phaseごとに細かく分けて1箇所ずつ確認しながら修正する |

## 承認記録
- **計画書提示日時**: 2026-03-11 15:55
- **承認日時**: 
