# タスク計画書: 会社名重複チェック追加

## メタデータ
- **作成日時**: 2026-03-05 10:05
- **タスクID**: corporation-duplicate-check
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

会社管理画面（CorporationManagement）にて、「追加」ボタンから単体追加する際に、
既にDBの`corporation`テーブルの`corporation_name`に存在する会社名を入力してもエラーとならない問題を修正する。

CSVアップロードには既に重複チェックが実装されているが、単体追加（`createCorporation`）には実装されていない。

## 目的と期待される成果

- [ ] 「追加」ボタンから既存の会社名を入力して保存しようとした場合、エラーメッセージが表示される
- [ ] 「編集」ボタンから他の会社と同名に変更しようとした場合も、エラーメッセージが表示される
- [ ] CSVアップロードの挙動は変更しない

## 実装ステップ

- [ ] `backend/src/services/corporationService.ts` の `createCorporation()` に重複チェックを追加
- [ ] `backend/src/services/corporationService.ts` の `updateCorporation()` に重複チェックを追加（自分自身を除外）

## 変更ファイル

1. `backend/src/services/corporationService.ts` - createCorporation/updateCorporationに重複チェック追加

## リスク

| リスク | 対策 |
|--------|------|
| updateCorporation時に自身の名前で保存できなくなる | existsByName(name, excludeId) を使用して自身を除外 |

## テスト計画

- [ ] 新規追加: 既存と同名 → エラー表示される
- [ ] 新規追加: 新規名 → 正常保存される
- [ ] 編集: 他社と同名に変更 → エラー表示される
- [ ] 編集: 自社名のまま保存 → 正常保存される

## 承認記録

- **計画書提示日時**: 2026-03-05 10:05
