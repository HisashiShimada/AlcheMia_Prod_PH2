# タスク計画書: 実験記録ボタン群をContent内上部へ移動

## メタデータ
- **作成日時**: 2026-08-17 09:16
- **タスクID**: 実験記録ボタン群配置変更
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

実験作業者メニューの実験記録タブ（`DataRecordDialog.tsx`）において、
現在 `workStatusBar` の右隣（`<Content>` の外部）に配置されているボタン群（`inlineFooter`）を、
`<Content>` 内（緑枠内）の上部に移動する。

## 目的と期待される成果

- [ ] `inlineFooter`（終了・異常終了・コメント・保存・スキップ・次へ等のボタン群）を
      `<Content>` エリアの最上部に表示する
- [ ] `workStatusBar` は単独で表示される

## 実装ステップ

- [ ] `DataRecordDialog.tsx` の return ブロック（line ~3498〜3501）から
      `inlineFooter` を削除（`workStatusBar` のみを残す）
- [ ] `<Content>` 内部（line ~2837）の先頭に `inlineFooter` を追加

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`

## 承認記録

- **承認日時**: 2026-08-17 09:16
