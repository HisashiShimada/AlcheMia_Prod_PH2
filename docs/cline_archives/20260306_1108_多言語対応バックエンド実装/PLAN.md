# タスク計画書: 多言語対応バックエンド実装

## メタデータ
- **作成日時**: 2026-03-06 11:08
- **タスクID**: i18n-backend
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

プロバイダーメニュー/システム管理者メニュー/データ管理者メニューの多言語対応において、フロントエンドの対応は完了しているが、バックエンド側で必要な対応（情報ダウンロードCSVのカラムヘッダー多言語化）を実装する。

## 目的と期待される成果

- [ ] 情報ダウンロードCSVのカラムヘッダーが現在の言語設定（日本語/英語）に応じて切り替わる
- [ ] フロントエンドから `lang` パラメータを渡すことで、バックエンドが対応するヘッダーでCSVを生成する

## 実装ステップ

### Phase 1: バックエンド実装
- [ ] `organizationService.ts` の `downloadOrganizationsInformation()` に `lang` パラメータを追加し、日本語/英語ヘッダーを切り替える
- [ ] `organizationController.ts` の `downloadInformationCsv()` でクエリパラメータ `lang` を受け取り、サービス層に渡す

### Phase 2: フロントエンド実装
- [ ] `InformationDownload.tsx` でCSVダウンロードAPIに `lang` クエリパラメータ（現在の言語）を追加する

## 変更ファイル

1. `backend/src/services/organizationService.ts` - `downloadOrganizationsInformation(lang?)` に言語パラメータ追加、日英CSVヘッダー切り替え
2. `backend/src/controllers/organizationController.ts` - `downloadInformationCsv()` に `lang` クエリパラメータ受け取り追加
3. `frontend/src/components/Provider/InformationDownload.tsx` - APIリクエストに `lang` パラメータ追加

## 承認記録
- **計画書提示日時**: 2026-03-06 11:08
- **承認日時**: 2026-03-06 11:08

## 11. 実施記録

### 実施日時
開始: 2026-03-06 11:18
完了: 2026-03-06 11:30

### 最終的な成果物
- [x] `backend/src/utils/messages.ts` - 多言語メッセージ定義（ja/en対応）
- [x] `backend/src/services/corporationService.ts` - getMessage()に置き換え
- [x] `backend/src/services/organizationService.ts` - getMessage()に置き換え
- [x] `backend/src/services/departmentService.ts` - getMessage()に置き換え
- [x] `backend/src/services/roleService.ts` - getMessage()に置き換え
- [x] `backend/src/services/userService.ts` - getMessage()に置き換え
- [x] `backend/src/services/masterService.ts` - getMessage()に置き換え（lang引数追加）
- [x] `backend/src/controllers/organizationController.ts` - langをサービスに渡す
- [x] `backend/src/controllers/departmentControler.ts` - langをサービスに渡す
- [x] `backend/src/controllers/roleController.ts` - langをサービスに渡す
- [x] `backend/src/controllers/userController.ts` - langをサービスに渡す
- [x] `backend/src/controllers/masterController.ts` - langをサービスに渡す
- [x] `frontend/src/utils/authUtils.ts` - Accept-Languageヘッダーを全リクエストに自動付与
