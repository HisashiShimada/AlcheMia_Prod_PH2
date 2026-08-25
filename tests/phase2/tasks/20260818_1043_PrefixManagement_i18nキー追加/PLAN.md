# タスク計画書: PrefixManagement i18nキー追加

## メタデータ
- **作成日時**: 2026-08-18 10:43
- **タスクID**: PrefixManagement_i18nキー追加
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要
`PrefixManagement.tsx` が `t('prefixManagement.xxx')` 形式で多数のi18nキーを参照しているが、`prefixManagement` セクションが `ja.json` / `en.json` に存在しないため、UIに `{count}件の保存に失敗しました: {names}` のようにパラメータ補間が行われないキー名がそのまま表示されている問題を修正する。

## 目的と期待される成果
- [ ] `ja.json` に `prefixManagement` セクションを追加し、日本語メッセージが正しく表示される
- [ ] `en.json` に `prefixManagement` セクションを追加し、英語メッセージが正しく表示される
- [ ] `{count}件の保存に失敗しました: {names}` のような補間付きメッセージが正しく表示される

## 実装ステップ
- [x] 問題の調査・特定
- [x] 修正方針の決定
- [ ] `frontend/src/locales/ja.json` に `prefixManagement` セクション追加
- [ ] `frontend/src/locales/en.json` に `prefixManagement` セクション追加

## 変更ファイル
1. `frontend/src/locales/ja.json` - `prefixManagement` セクション追加
2. `frontend/src/locales/en.json` - `prefixManagement` セクション追加

## 影響範囲
- `frontend/src/components/namespace/PrefixManagement.tsx` のメッセージ表示（コード変更なし）

## 承認記録
- **承認日時**: 2026-08-18 10:43
