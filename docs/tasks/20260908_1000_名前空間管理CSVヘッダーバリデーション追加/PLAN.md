# タスク計画書: 名前空間管理タブ CSVヘッダーバリデーション追加

## メタデータ
- **作成日時**: 2026-09-08 10:00
- **タスクID**: 20260908_1000
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要
プロバイダメニュー「名前空間管理」タブで、異なる列名・列数のCSVファイルをインポートできてしまう問題を修正する。
フロントエンド（クライアントサイド）およびバックエンドにヘッダーバリデーションを追加する。

## 目的と期待される成果
- [x] 意図しない列構成のCSVをインポートした場合に適切なエラーメッセージを表示する
- [x] グローバル名前空間宣言・Prefix・用語（Term）の各インポート箇所すべてに対応する
- [x] バックエンド側でもヘッダーが不正な場合にエラーをスローする安全設計にする

## 変更ファイル
1. `frontend/src/components/namespace/GlobalNamespaceView.tsx` - ヘッダー検証追加
2. `frontend/src/components/namespace/NamespaceMain.tsx` - ヘッダー検証追加
3. `frontend/src/components/namespace/PrefixManagement.tsx` - ヘッダー検証追加
4. `frontend/src/components/namespace/TermManagement.tsx` - ヘッダー検証追加
5. `backend/src/services/globalNamespaceFileService.ts` - ヘッダー検証追加
6. `frontend/src/locales/ja.json` - エラーメッセージ追加
7. `frontend/src/locales/en.json` - エラーメッセージ追加

## 実装ステップ
- [x] PLAN.md 作成
- [x] ja.json / en.json にエラーメッセージキー追加
- [x] GlobalNamespaceView.tsx ヘッダー検証追加
- [x] NamespaceMain.tsx ヘッダー検証追加
- [x] PrefixManagement.tsx ヘッダー検証追加
- [x] TermManagement.tsx ヘッダー検証追加（再構築）
- [x] globalNamespaceFileService.ts ヘッダー検証追加
- [x] types/namespace.ts に TermManagementProps 型定義追加
- [x] フロントエンド TypeScript コンパイルエラーゼロ確認
- [x] バックエンド TypeScript コンパイルエラーゼロ確認

## 承認記録
- **承認日時**: 2026-09-08 10:13
