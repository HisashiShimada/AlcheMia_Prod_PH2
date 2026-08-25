# タスク計画書: ユーザー追加ダイアログ 名前空間フィールド追加

## メタデータ
- **作成日時**: 2026-06-29 17:59
- **タスクID**: user-add-namespace-fields
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

システム管理者メニュー > ユーザー管理タブの「追加」ボタンから開くダイアログに、
名前空間Prefix（prefix）と名前空間URI（uri）の入力フィールドを追加する。
新規ユーザー作成時に両フィールドが入力されていれば、namespaceテーブルにも登録する。
編集時はこれらのフィールドを表示しない（既存ユーザー編集では名前空間管理は別画面で行う）。

## 目的と期待される成果

- [ ] ユーザー追加ダイアログに「名前空間Prefix」フィールドを追加（任意入力）
- [ ] ユーザー追加ダイアログに「名前空間URI」フィールドを追加（Prefix入力時は必須）
- [ ] ユーザー作成時に namespace テーブルにも登録される（両方入力時）
- [ ] 編集ダイアログには名前空間フィールドを表示しない

## 実装ステップ

### Phase 1: 型定義・翻訳ファイル更新
- [ ] `frontend/src/types/user.ts` の CreateUserRequest に namespacePrefix/namespaceUri を追加
- [ ] `frontend/src/locales/ja.json` に翻訳キー追加（namespacePrefix, namespacePrefixPlaceholder, namespaceUri, namespacePrefixRequired等）
- [ ] `frontend/src/locales/en.json` に対応英語翻訳追加

### Phase 2: フロントエンド UI 更新
- [ ] `frontend/src/components/SystemManagement/UserManagement.tsx` のダイアログに名前空間フィールドを追加（新規追加時のみ表示）
- [ ] handleModalOk でフォームの namespacePrefix / namespaceUri を createData に含める

### Phase 3: バックエンド更新
- [ ] `backend/src/repositories/namespaceTermRepository.ts` に `createNamespace` 関数を追加（namespaceテーブルへのINSERT）
- [ ] `backend/src/services/userService.ts` の createUser で namespacePrefix/namespaceUri が指定されていれば namespace テーブルに登録

## 変更ファイル

1. `frontend/src/types/user.ts` - CreateUserRequest に namespace フィールド追加
2. `frontend/src/locales/ja.json` - 翻訳キー追加
3. `frontend/src/locales/en.json` - 翻訳キー追加
4. `frontend/src/components/SystemManagement/UserManagement.tsx` - ダイアログUI追加
5. `backend/src/repositories/namespaceTermRepository.ts` - createNamespace 追加
6. `backend/src/services/userService.ts` - createUser で namespace 登録

## リスク
| リスク | 対策 |
|--------|------|
| prefix 重複 | INSERT時に ON CONFLICT DO NOTHING または事前チェック |
| namespace 登録失敗時のロールバック | ユーザー作成とnamespace登録をトランザクションで包む |

## 承認記録
- **承認日時**: 2026-06-29 17:59
