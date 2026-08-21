# タスク計画書: 多言語化対応（評価ダイアログ・不確かさ管理）

## メタデータ
- **作成日時**: 2026-07-24 15:14
- **タスクID**: 多言語化対応_評価ダイアログ
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
新規追加した機能（評価ダイアログ・ProjectCompletionDialog）で多言語化対応が出来ていない部分を修正する。

## 目的と期待される成果
- [ ] EvaluationDialog.tsx の日本語ハードコード文字列を `t()` に変換
- [ ] EvaluationRegistrationTab.tsx の日本語ハードコード文字列を `t()` に変換
- [ ] ProjectCompletionDialog.tsx の日本語ハードコード文字列を `t()` に変換
- [ ] ja.json / en.json に対応キーを追加

## 変更ファイル
1. `frontend/src/locales/ja.json` — `evaluation` / `projectCompletion` セクション追加
2. `frontend/src/locales/en.json` — 同セクション追加（英語訳）
3. `frontend/src/components/project/EvaluationDialog.tsx` — `t()` 対応
4. `frontend/src/components/project/EvaluationRegistrationTab.tsx` — `t()` 対応
5. `frontend/src/components/project/ProjectCompletionDialog.tsx` — `t()` 対応

## 承認記録
- **計画書提示日時**: 2026-07-24 15:14
- **承認日時**: 2026-07-24 15:16
