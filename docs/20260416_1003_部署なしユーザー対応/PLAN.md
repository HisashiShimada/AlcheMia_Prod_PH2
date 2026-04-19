# タスク計画書: 部署なしユーザー対応

## メタデータ
- **作成日時**: 2026-04-16 10:03
- **タスクID**: no-department-user-support
- **優先度**: 高
- **推定工数**: 2〜3時間

## タスク概要

部署コードが設定されていないユーザー（組織追加時に自動登録されるシステム管理者等）が、フォーマット管理などを正常に利用できるようにする。

### 現状の問題
1. OrganizationManagement.tsx で組織追加時に登録されるシステム管理者は `departmentCd = null` でDB登録される
2. UserManagement.tsx のフォームでは `departmentCd` が `required: true`（必須）のため、後から編集する際に必ず部署を選択させられる
3. 部署コードが `null` のユーザーがフォーマット管理を開くと、S3上に対応フォルダが存在せず何も表示されない

## 目的と期待される成果
- [ ] UserManagement.tsx の部署コードを任意（required: false）に変更する
- [ ] 組織追加時（OrganizationManagement.tsx）に、部署なしユーザー用のS3フォルダ（`formats/default/` 等）を自動作成する
- [ ] 部署コードがnullのユーザーがフォーマット管理を開いた際、`default` フォルダの内容を表示する

## 実装ステップ

### Phase 1: フロントエンド修正（UserManagement.tsx）
- [ ] `departmentCd` の `rules` から `required: true` を削除（任意に変更）

### Phase 2: フロントエンド修正（FormatManagement.tsx / FormatUploadDialog.tsx）
- [ ] `FormatManagement.tsx`: `user.departmentCd` が null/'' の場合に `'default'` を使用するよう変更
- [ ] `FormatUploadDialog.tsx`: `baseFolder.departmentCd` が null/undefined の場合のパスを `formats/{folderName}` → `formats/default/{folderName}` に変更

### Phase 3: S3 デフォルトフォルダ自動作成（バックエンド - organizationService.ts）
- [ ] 組織作成時のS3フォルダ作成に以下3サブフォルダを追加（部署作成時と同じ構造）
  - `formats/default/condition/`
  - `formats/default/material/`
  - `formats/default/result/`

### Phase 4: フォーマット管理APIのdepartmentCd=null対応（バックエンド - formatService.ts）
- [ ] `getFormatFolders()` の引数 `departmentCd` が null/'' の場合に `'default'` を使用するフォールバックを追加

## 調査結果

### departmentCd 使用箇所まとめ

#### フロントエンド
| ファイル | 用途 | 修正要否 |
|---------|------|---------|
| `UserManagement.tsx` | ユーザー追加/編集フォームで `required: true` | ✅ 要修正（必須→任意） |
| `FormatManagement.tsx` | `user.departmentCd` をフォルダ参照・FormatUploadDialogに渡す | ✅ 要修正（null時は'default'を使用） |
| `FormatUploadDialog.tsx` | `baseFolder.departmentCd` でS3パスを構築（nullの場合は部署なしパスを使用） | 確認要（null時の動作） |
| `TemplateEditorDialog.tsx` | フォーマット一覧表示で `dept.departmentCd` を表示 | 影響なし（一覧表示のみ） |
| `DepartmentManagement.tsx` | 部署管理自体の操作 | 影響なし |
| `MasterManagement.tsx` | マスタ管理での部署CD使用 | 影響なし |

#### バックエンド
| ファイル | 用途 | 修正要否 |
|---------|------|---------|
| `organizationService.ts` | 組織作成時のS3フォルダ: `['projects/', 'formats/']` を自動作成 | ✅ 要修正（`formats/default/` を追加） |
| `formatService.ts` | `getFormatFolders()` で `formats/{departmentCd}/` を参照 | ✅ 要修正（departmentCdがnullなら'default'を使用） |
| `userController.ts` / `userRepository.ts` | ユーザー取得/更新でdepartment_cdをnull許容で扱っている | 修正不要（既にnull許容） |
| `authService.ts` / `authHelpers.ts` | セッションに `department_cd` を保存（nullの場合は`''`） | 確認要（空文字→nullに変更が必要か） |

## 変更ファイル（確定）

### フロントエンド
1. `frontend/src/components/SystemManagement/UserManagement.tsx` - departmentCd の `required: true` を削除
2. `frontend/src/components/project/FormatManagement.tsx` - `user.departmentCd` が null/'' の場合に `'default'` を使用
3. `frontend/src/components/project/FormatUploadDialog.tsx` - `baseFolder.departmentCd` が null/undefined 時のパスを `formats/default/{folderName}` に変更

### バックエンド
4. `backend/src/services/organizationService.ts` - 組織作成時のS3フォルダに `formats/default/` を追加
5. `backend/src/services/formatService.ts` - `getFormatFolders()` でdepartmentCdがnull/''/undefinedの場合に`'default'`を使用するフォールバック追加

## リスク
| リスク | 対策 |
|--------|------|
| 既存の部署コードnullユーザーへの影響 | defaultフォルダ作成はオンデマンドでも対応できるよう設計する |
| S3フォルダ作成失敗時の組織登録への影響 | S3フォルダ作成失敗は警告ログに留め、組織登録は成功させる |

## 承認記録
- **計画書提示日時**: 2026-04-16 10:03
- **承認日時**: 
- **承認者コメント**: 
