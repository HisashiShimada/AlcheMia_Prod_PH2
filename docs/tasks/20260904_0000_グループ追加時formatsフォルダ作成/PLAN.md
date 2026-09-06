# タスク計画書: グループ追加時 formats フォルダ作成

## メタデータ
- **作成日時**: 2026-09-04 00:00
- **タスクID**: 20260904_0000
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`GroupManagement`（グループ管理）からグループを追加した際、ファイルサーバ（S3/Swift）の
`formats/{organization_group_cd}/` フォルダが自動作成されない問題を修正する。

## 目的と期待される成果

- [x] グループ新規作成時に `formats/{group_cd}/` および配下の3サブフォルダが自動作成される
- [x] 組織作成時の `formats/default/` 作成処理（`organizationService.ts`）と同等のパターンで実装

## 現状分析

`organizationGroupService.createOrganizationGroup()` のトランザクション内処理:

1. グループ本体 INSERT → ✅ 実装済み
2. 代表者をメンバーとして自動登録 → ✅ 実装済み
3. namespace URI 自動登録 → ✅ 実装済み
4. `formats/{group_cd}/` フォルダ作成 → ❌ **抜けている**

## 実装ステップ

- [x] `organizationGroupService.ts` に `getStorageService` インポートを追加
- [x] `createOrganizationGroup` 関数内のトランザクション後にフォルダ作成処理を追加
- [x] 作成フォルダ: `formats/{group_cd}/`, `material/`, `condition/`, `result/`
- [x] ストレージ失敗時はログのみ（グループ作成自体は成功とする）

## 変更ファイル

1. `backend/src/services/organizationGroupService.ts` - ストレージフォルダ作成処理を追加

## リスク

| リスク | 対策 |
|--------|------|
| ストレージ障害時にフォルダ作成失敗 | try/catch でエラーをキャッチしてログ出力のみ |
| 既存グループのフォルダが未作成 | 今回対応範囲外。必要であれば別途バックフィル |

## テスト計画

- [x] TypeScript コンパイルエラーがないこと（`tsc --noEmit`）

## 承認記録
- **承認日時**: 2026-09-04 00:00
- **承認者コメント**: 計画承認済み、Act モードで実装開始
