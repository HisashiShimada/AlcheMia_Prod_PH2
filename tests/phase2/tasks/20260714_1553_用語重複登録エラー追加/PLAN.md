# タスク計画書: 用語重複登録エラー追加

## メタデータ
- **作成日時**: 2026-07-14 15:53
- **タスクID**: 用語重複登録エラー追加
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

名前空間管理の「用語管理」タブで、研究開発部を選択した状態で新規用語を追加しようとした際、既存と同じ Prefix + 用語名（localName）の組み合わせがあればエラーメッセージを表示して登録をブロックする。

## 目的と期待される成果
- [ ] 研究開発部を選択した状態で「用語を追加」行に既存と同じ Prefix + localName を入力し、保存ボタンを押すとエラーメッセージが出て保存されない

## 現状の問題

`NamespaceMain.tsx` の `updateNewTerm` 関数では、`effectiveNsKey === 'dept-rd'`（研究開発部選択時）のみ `_isDuplicate` フラグをセットする処理が実装されている。

しかし `handleAddSave`（保存ボタン押下時）では `_isDuplicate` フラグを一切参照していないため、重複があってもそのまま API に投げてしまう。

## 実装ステップ
- [ ] `NamespaceMain.tsx` の `handleAddSave` 関数に `_isDuplicate` チェックを追加

## 変更ファイル
1. `frontend/src/components/namespace/NamespaceMain.tsx` - handleAddSave に重複チェック追加

## 承認記録
- **承認日時**: 2026-07-14 15:56
