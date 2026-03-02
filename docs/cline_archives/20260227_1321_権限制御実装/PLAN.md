# タスク計画書: 権限制御実装（読取専用時のボタン非活性化）

## メタデータ
- **作成日時**: 2026-02-27 13:21
- **タスクID**: 権限制御実装
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要
セッショントークンで保持している機能CDに紐づく権限（permission: 0=読取専用, 1=書込可）に基づき、
各管理画面のボタンを制御する。読取専用（permission: 0）の場合、「CSVダウンロード」「リロード」以外のボタンを非活性にする。

## 変更ファイル
1. `frontend/src/utils/menuPermissions.ts` - getMenuPermission()関数を追加
2. `frontend/src/components/Provider/CorporationManagement.tsx` - 権限制御追加
3. `frontend/src/components/Provider/OrganizationManagement.tsx` - 権限制御追加
4. `frontend/src/components/SystemManagement/UserManagement.tsx` - 権限制御追加
5. `frontend/src/components/SystemManagement/DepartmentManagement.tsx` - 権限制御追加
6. `frontend/src/components/SystemManagement/RoleManagement.tsx` - 権限制御追加
7. `frontend/src/components/DataManagement/MasterManagement.tsx` - 権限制御追加

## 承認記録
- **承認日時**: 2026-02-27 13:26
