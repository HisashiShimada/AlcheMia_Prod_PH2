# タスク計画書: Creator/Vendor/Instrument ID 文字種バリデーション追加

## メタデータ
- **作成日時**: 2026-09-04 00:00
- **タスクID**: 20260904_0000
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

データ管理者メニュー「マスタ管理」画面にて、Creator / Vendor / Instrument の ID フィールドに
ひらがな・カタカナ・漢字等の全角文字が登録できてしまう不具合を修正する。

phase1シナリオに「ひらがなは登録できないこと」と定義されているため、
バックエンドのバリデーションで半角英数字・ハイフン・アンダースコアのみ許可するよう修正する。

## 目的と期待される成果
- [x] POST /creator, POST /vendor, POST /instrument でひらがな等の全角文字を拒否する
- [x] CSV アップロードでも同様の文字種チェックを行う
- [x] エラーメッセージを日英両対応で追加する

## 実装ステップ
- [x] タスク計画書作成
- [x] messages.ts に文字種エラーメッセージキーを追加（型定義・ja・en の3箇所）
- [x] masterRoutes.ts の POST /creator・POST /vendor・POST /instrument に .matches() バリデーション追加
- [x] masterService.ts の CSV Upload Phase 2 に文字種チェック追加（Creator / Vendor / Instrument）
- [x] ビルド確認

## 変更ファイル
1. `backend/src/utils/messages.ts` - 文字種エラーメッセージキー追加
2. `backend/src/routes/masterRoutes.ts` - POST エンドポイントにバリデーション追加
3. `backend/src/services/masterService.ts` - CSV Upload に文字種チェック追加

## バリデーション仕様
- **許可文字**: 半角英字（大文字・小文字）、数字、ハイフン（-）、アンダースコア（_）
- **正規表現**: `^[a-zA-Z0-9_-]+$`
- **エラーコード**: E1005（入力形式エラー）
- **対象フィールド**: creatorId / vendorId / instrumentId（新規作成 POST のみ。更新時は ID 変更不可）
- **CSV**: 文字数チェックの直後に文字種チェックを追加

## リスク
| リスク | 対策 |
|--------|------|
| 既存データが非準拠 ID を持つ場合 | 既存データの変更は行わない（バリデーションは新規登録・CSVアップロード時のみ適用） |

## 承認記録
- **計画書提示日時**: 2026-09-04 00:00
- **承認日時**: 2026-09-04（ユーザー承認済み）
