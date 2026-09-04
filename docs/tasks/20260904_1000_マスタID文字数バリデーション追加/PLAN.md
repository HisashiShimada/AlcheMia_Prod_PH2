# タスク計画書: マスタID文字数バリデーション追加

## メタデータ
- **作成日時**: 2026-09-04 10:00
- **タスクID**: 20260904_1000_マスタID文字数バリデーション追加
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

データ管理者メニューのマスタ管理画面において、creatorId / vendorId / instrumentId の各フィールドに50文字以上のデータが登録できてしまう問題を修正する。

フロントエンドのUIには `maxLength={50}` が設定済みであるが、バックエンドAPI（POST/PUT）およびCSVアップロード処理にバリデーションが存在しないため、APIを直接呼び出すことで制限を回避できる状態となっている。

## 目的と期待される成果

- [x] POST /api/v1/master/creator でcreatorId・creatorNameの50文字超えを拒否する
- [x] PUT /api/v1/master/creator/:creatorId でcreatorNameの50文字超えを拒否する
- [x] POST /api/v1/master/vendor でvendorId・vendorNameの50文字超えを拒否する
- [x] PUT /api/v1/master/vendor/:vendorId でvendorNameの50文字超えを拒否する
- [x] POST /api/v1/master/instrument でinstrumentId・instrumentNameの50文字超えを拒否する
- [x] PUT /api/v1/master/instrument/:instrumentId でinstrumentNameの50文字超えを拒否する
- [x] CSVアップロード（creator/vendor/instrument）で各IDと名称の50文字超えを拒否する
- [x] エラーメッセージを日英両対応にする

## 実装ステップ

- [x] PLAN.md 作成
- [x] messages.ts にバリデーションメッセージ追加（ja・en・型定義）
- [x] masterRoutes.ts の POST/PUT エンドポイントにbodyバリデーション追加
- [x] masterService.ts の CSVアップロード処理に文字数チェック追加

## 変更ファイル

1. `backend/src/utils/messages.ts` - バリデーションメッセージ追加（idTooLong, nameTooLong, csv.idTooLong, csv.nameTooLong）
2. `backend/src/routes/masterRoutes.ts` - POST/PUT エンドポイントにbodyバリデーション追加
3. `backend/src/services/masterService.ts` - CSVアップロード処理に文字数チェック追加

## Do Not

- UIの変更は行わない（フロントエンドは既にmaxLength={50}対応済み）
- MaiMLファイルへの保存処理は変更しない
- DBのDDL（CHARACTER VARYING の上限設定）は変更しない

## リスク

| リスク | 対策 |
|--------|------|
| CSV一括登録で既存の50文字超えデータと整合性が取れなくなる | 本修正は新規登録・更新のバリデーションのみ。既存データは影響なし |
| 多言語メッセージキーの追加漏れ | Messages型・ja・en を同時に更新 |

## テスト計画

- [x] routes の POST /creator に51文字のcreatorIdを送信 → 400エラーを確認
- [x] routes の POST /creator に50文字のcreatorIdを送信 → 201成功を確認
- [x] CSV に51文字のcreator_idを含む行 → errors に該当行が含まれることを確認

## 承認記録
- **承認日時**: 2026-09-04 10:00
- **承認者コメント**: Act モードに切り替えて承認済み
