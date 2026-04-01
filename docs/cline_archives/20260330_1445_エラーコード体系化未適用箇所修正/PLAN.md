# タスク計画書: エラーコード体系化未適用箇所修正

## メタデータ
- **作成日時**: 2026-03-30 14:45
- **タスクID**: error-code-unification
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

プロバイダーメニュー・システム管理者メニュー・データ管理者メニューの各画面において、
エラーコード体系化（E1xxx〜E9xxx）が適用されていない箇所を修正する。

具体的には以下の問題を修正する：
1. ハードコードされた日本語文字列でエラー表示している箇所
2. `extractErrorMessage` を通さずにエラーメッセージを直接表示している箇所
3. 日本語文字列マッチングでエラー種別を判定している箇所
4. 翻訳キーを使わずに日本語をハードコードしている箇所

## 目的と期待される成果

- [ ] エラーメッセージが `extractErrorMessage` → `mapErrorToMessage` の体系を通じて表示される
- [ ] エラー判定がエラーコード（例: `E6005`）ベースに統一される
- [ ] `'エラーが発生しました'` 等のハードコードが排除される
- [ ] `MasterManagement.tsx` の直接 `fetch` 箇所でもエラーコード体系が機能する

## 実装ステップ

### Phase 1: プロバイダーメニュー修正
- [ ] `CorporationManagement.tsx` - CSVエラーのdirect表示を修正
- [ ] `OrganizationManagement.tsx` - CSVエラーのdirect表示・409判定を修正

### Phase 2: システム管理者メニュー修正
- [ ] `DepartmentManagement.tsx` - actionTextハードコード・文字列マッチングを修正
- [ ] `RoleManagement.tsx` - actionTextハードコード・ハードコードエラーを修正
- [ ] `FunctionPermissionDialog.tsx` - ハードコードボタンラベルを翻訳キーに変更

### Phase 3: データ管理者メニュー修正
- [ ] `MasterManagement.tsx` - 直接fetchのエラーハンドリングを `extractErrorMessage` 経由に修正

## 変更ファイル

1. `frontend/src/components/Provider/CorporationManagement.tsx`
2. `frontend/src/components/Provider/OrganizationManagement.tsx`
3. `frontend/src/components/SystemManagement/DepartmentManagement.tsx`
4. `frontend/src/components/SystemManagement/RoleManagement.tsx`
5. `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx`
6. `frontend/src/components/DataManagement/MasterManagement.tsx`

## 修正内容の詳細

### CorporationManagement.tsx
| 箇所 | 修正前 | 修正後 |
|------|--------|--------|
| handleCSVUpload - CSVエラー表示 | `messageApi.error(result.errors[0].message)` | `messageApi.error(extractErrorMessage(new Error(result.errors[0].message), t('corporationManagement.messages.csvUploadError')))` |
| handleCSVUpload - 非Axiosエラー | `messageApi.error(error.message)` | `messageApi.error(extractErrorMessage(error, t('corporationManagement.messages.csvUploadError')))` |

### OrganizationManagement.tsx
| 箇所 | 修正前 | 修正後 |
|------|--------|--------|
| handleCSVUpload - CSVエラー表示 | `messageApi.error(result.errors[0].message)` | `messageApi.error(extractErrorMessage(new Error(result.errors[0].message), t('organizationManagement.messages.csvUploadError')))` |
| handleCSVUpload - 非Axiosエラー | `messageApi.error(error.message)` | `messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.csvUploadError')))` |
| handleModalOk - 409判定 | `code === 'DUPLICATE_ORGANIZATION_CD'` の個別処理 | 同コードのまま（LEGACY_CODE_MAPに追加済みのため許容） |

### DepartmentManagement.tsx
| 箇所 | 修正前 | 修正後 |
|------|--------|--------|
| handleToggleActive - actionText | `'非アクティブ'` / `'アクティブ'` ハードコード | `t('departmentManagement.status.inactive')` / `t('departmentManagement.status.active')` |
| handleModalOk - エラー判定 | `errorMessage.includes('既に存在しています')` | `extractErrorCode(error)` がE6005/409相当かで判定 |
| handleModalOk - フォームエラー | `'入力されたIDは既に存在しています'` ハードコード | `t('departmentManagement.messages.duplicateIdError')` |

### RoleManagement.tsx
| 箇所 | 修正前 | 修正後 |
|------|--------|--------|
| handleToggleActive - actionText | `'非アクティブ'` / `'アクティブ'` ハードコード | `t('roleManagement.status.inactive')` / `t('roleManagement.status.active')` |
| handleFunctionDialogOk - エラー | `message.error('エラーが発生しました')` | `message.error(t('roleManagement.messages.unknownError'))` |
| handleFunctionDialogOk - catch | `extractErrorMessage(error, 'エラーが発生しました')` | `extractErrorMessage(error, t('roleManagement.messages.unknownError'))` |
| handleOpenFunctionModalDirect - catch | `extractErrorMessage(error, 'エラーが発生しました')` | `extractErrorMessage(error, t('roleManagement.messages.unknownError'))` |
| handleModalOk - エラー判定 | `errorMessage.includes('既に存在しています')` | `extractErrorCode(error)` が409/E6005相当かで判定 |
| handleModalOk - エラーメッセージ | `'エラーが発生しました'` ハードコード | `t('roleManagement.messages.unknownError')` |

### FunctionPermissionDialog.tsx
| 箇所 | 修正前 | 修正後 |
|------|--------|--------|
| キャンセルボタン | `'キャンセル'` | `t('common.buttons.cancel')` または `t('roleManagement.buttons.cancel')` |
| 機能を更新ボタン | `'機能を更新'` | `t('roleManagement.buttons.updateFunction')` |

### MasterManagement.tsx
| 箇所 | 修正前 | 修正後 |
|------|--------|--------|
| handleCSVUpload - エラーモーダルタイトル | `'CSVアップロードエラー'` ハードコード | `t('masterManagement.messages.csvUploadErrorTitle')` |
| handleCSVUpload - catch | `error.message` 直接使用 | `extractErrorMessage(error, t('masterManagement.messages.csvUploadFailed'))` |
| handleDownload - エラー | `'CSVダウンロードに失敗しました: ...'` ハードコード | `t('masterManagement.messages.csvDownloadFailed')` + status |
| handleModalOk各分岐 - エラースロー | `'更新に失敗しました'` / `'追加に失敗しました'` | `t('masterManagement.messages.saveError')` / `t('masterManagement.messages.addError')` |
| handleModalOk - 409判定 | `errorMessage.includes('既に存在しています')` | `error instanceof Response && error.status === 409` |
| handleModalOk - フォームエラー | `'入力されたIDは既に存在しています'` ハードコード | `t('masterManagement.messages.duplicateIdError')` |

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ja.jsonの翻訳キー不足 | 中 | 中 | 修正時に翻訳キーを確認・追加 |
| extractErrorCodeがResponseオブジェクトに対応していない | 中 | 低 | MasterManagementの直接fetchはステータスで判定 |

## テスト計画
- [ ] 各画面でAPIエラー発生時にエラーメッセージが表示されることを確認
- [ ] ハードコード文字列が残っていないことをコードレビューで確認

## 承認記録
- **計画書提示日時**: 2026-03-30 14:45
- **承認日時**: 
- **承認者コメント**: 
