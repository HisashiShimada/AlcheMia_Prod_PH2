# タスク計画書: 部署追加バリデーションエラー修正

## メタデータ
- **作成日時**: 2026-05-13 09:09
- **タスクID**: 部署追加バリデーションエラー修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

部署管理画面の部署追加ダイアログで保存ボタンを押下すると E1003 バリデーションエラー（HTTP 400）が発生する。
フロントエンドが送るリクエストボディのキーが snake_case（`department_cd`, `department_name`, `is_active`）である一方、
バックエンドのバリデーションが camelCase（`departmentCd`, `departmentName`, `isActive`）を期待しているため不一致が生じている。

## 目的と期待される成果

- [ ] 部署追加ダイアログから部署を正常に追加できるようになる
- [ ] バリデーションエラーが解消される

## 根本原因

| 層 | キー名 | 備考 |
|----|--------|------|
| フロントエンド送信（`DepartmentManagement.tsx`） | `department_cd`, `department_name`, `is_active` | snake_case（DBカラム名と同じ）|
| バックエンド バリデーション（`departmentRoutes.ts`） | `departmentCd`, `departmentName`, `isActive` | camelCase |
| バックエンド サービス層（`departmentService.ts`） | `departmentCd`, `departmentName`, `isActive` | camelCase |

フロントエンドが `MasterRecord`（DBカラム名の snake_case型）を流用してAPIに送信しているため、
バックエンドの `body('departmentCd').notEmpty()` で必須チェックが失敗し、4件のバリデーションエラーが返る。

## 実装ステップ

- [ ] `frontend/src/services/departmentApiService.ts` に API送信用型 `CreateDepartmentRequest` を追加し、`createMaster` の引数型を変更
- [ ] `frontend/src/components/SystemManagement/DepartmentManagement.tsx` の `handleModalOk` 内 `createMaster` 呼び出しのキーを camelCase に修正

## 変更ファイル

1. `frontend/src/services/departmentApiService.ts` - `CreateDepartmentRequest` 型追加・`createMaster` 引数型変更
2. `frontend/src/components/SystemManagement/DepartmentManagement.tsx` - `handleModalOk` 内の送信データキーを camelCase に修正

## リスク

| リスク | 対策 |
|--------|------|
| 他の箇所で `createMaster` を同様に snake_case で呼んでいる可能性 | 事前に検索して確認済み（他箇所なし） |

## テスト計画

- [ ] 部署追加ダイアログで部署CDと部署名を入力し、保存ボタン押下 → 正常に追加されること
- [ ] バリデーションエラーが出ないこと

## 承認記録

- **承認日時**: 2026-05-13 09:12
