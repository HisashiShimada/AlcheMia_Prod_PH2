# タスク計画書: Prefix新規追加時 並列チーム重複警告

## メタデータ
- **作成日時**: 2026-08-03 11:32
- **タスクID**: Prefix重複警告実装
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
Prefix新規追加時に、同一組織内の並列チームに同名のprefixが存在していれば警告メッセージを表示する。

## 目的と期待される成果
- [ ] ハードコードされた `selectedNsKey === 'user-010'` 条件を削除
- [ ] 実際に `rows`（既存prefix一覧）から重複を検出するロジックを実装
- [ ] 警告ダイアログに「どのチームで登録済みか」を動的表示
- [ ] i18nキー `warnAlreadyRegistered` を動的メッセージ対応に更新

## 実装ステップ
- [ ] `PrefixManagement.tsx` の `handleSave()` を修正
- [ ] `ja.json` の `prefixManagement.warnAlreadyRegistered` を更新
- [ ] `en.json` の `prefixManagement.warnAlreadyRegistered` を更新

## 変更ファイル
1. `frontend/src/components/namespace/PrefixManagement.tsx` - 重複チェックロジック実装
2. `frontend/src/locales/ja.json` - i18nキー更新
3. `frontend/src/locales/en.json` - i18nキー更新

## 承認記録
- **承認日時**: 2026-08-03 11:36
