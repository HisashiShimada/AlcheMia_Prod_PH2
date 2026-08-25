# タスク計画書: フォーマット管理画面 組織階層グループ対応

## メタデータ
- **作成日時**: 2026-07-13 16:48
- **タスクID**: format-management-org-group
- **優先度**: 高
- **推定工数**: 4時間

## タスク概要

フォーマット管理画面が「部門」前提で実装されているため、「組織階層グループ」への変更対応を行う。
ユーザーは複数グループに所属できるため、所属グループを選択してそのグループのフォーマットフォルダを取得・操作できるようにする。

## 目的と期待される成果
- [ ] フォーマット管理画面に組織グループ選択UIを追加
- [ ] 選択中グループのフォーマット一覧・ファイル一覧を取得できる
- [ ] グループを跨いだ不正アクセスを防止（バックエンドで所属チェック）
- [ ] 選択したグループをlocalStorageに保存して次回復元
- [ ] 1グループ所属の場合は選択UI表示・非活性
- [ ] バックエンドの命名を `departmentCd` → `organizationGroupCd` に統一

## 実装ステップ

### Phase 1: バックエンド修正 ✅ 完了 (2026-07-13)

- [x] `backend/src/controllers/formatController.ts`
  - 各エンドポイントに `organizationGroupCd` クエリ/ボディ受取を追加
  - 所属チェックヘルパー `assertBelongsToOrganizationGroup()` を追加（非所属なら E5015）
  - 未指定時は `req.user.organizationGroupCds[0]` にフォールバック
- [x] `backend/src/services/formatService.ts`
  - 変数名 `departmentCd` → `organizationGroupCd` にリネーム（S3パスの構造は変更しない）

### Phase 2: フロントエンド修正

- [ ] `frontend/src/services/formatApiService.ts`
  - `fetchFormats`, `createFormatFolder`, `createFormatSubfolder`, `createFormatFile` の引数に `organizationGroupCd?: string` を追加
- [ ] `frontend/src/components/format/OrganizationGroupSelector.tsx`（新規作成）
  - `GET /api/v1/organization-groups` でグループ一覧取得
  - ユーザー所属グループのみフィルタして `Select` に表示
  - 1件のみの場合は `disabled`
- [ ] `frontend/src/components/format/FormatManagement.tsx`
  - `selectedOrganizationGroupCd` state追加（localStorage復元 or 先頭グループ）
  - グループ変更時: localStorage保存 → selectedFormatIdリセット → refetch
  - ツールバーに `OrganizationGroupSelector` を追加
  - API呼び出し時に `selectedOrganizationGroupCd` を渡す
- [ ] `frontend/src/components/format/CreateFormatModal.tsx`
  - `departmentName` prop → `organizationGroupName` にリネーム、表示文言変更
- [ ] `frontend/src/components/format/FormatUploadDialog.tsx`
  - `baseFolder.departmentCd` → `baseFolder.organizationGroupCd` にリネーム

### Phase 3: i18n修正

- [ ] 翻訳ファイル内の「部門」表現（`createFormatModal.departmentNote` 等）を「組織グループ」表現に変更

## 変更ファイル一覧

### 修正
1. `backend/src/controllers/formatController.ts` - organizationGroupCd受取・所属チェック追加
2. `backend/src/services/formatService.ts` - departmentCd → organizationGroupCd リネーム
3. `frontend/src/services/formatApiService.ts` - organizationGroupCdパラメータ追加
4. `frontend/src/components/format/FormatManagement.tsx` - グループ選択state・UI追加
5. `frontend/src/components/format/CreateFormatModal.tsx` - departmentName → organizationGroupName
6. `frontend/src/components/format/FormatUploadDialog.tsx` - departmentCd → organizationGroupCd
7. 翻訳ファイル（ja.ts / en.ts） - 文言更新

### 新規作成
1. `frontend/src/components/format/OrganizationGroupSelector.tsx` - グループ選択コンポーネント

## リスク
| リスク | 対策 |
|--------|------|
| S3パス変更なしのため既存データとの互換性は維持 | formatController/formatServiceの変数名リネームのみで対応 |
| 1グループのユーザーへの影響 | フォールバック実装で影響なし |
| localStorage保存値が古いグループCDになるケース | user.organizationGroupCdsで存在チェックして無効値は無視 |

## テスト計画
- [ ] 複数グループ所属ユーザーでグループ切替 → 各グループのフォルダが表示される
- [ ] グループ切替後にリロード → 前回選択グループが復元される
- [ ] 1グループのみ所属ユーザー → Selectが表示・非活性で操作不可
- [ ] 未所属グループCDをAPIに直接送信 → 403 E5015 が返る

## 承認記録
- **計画書提示日時**: 2026-07-13 16:48
- **承認日時**: 2026-07-13 16:51
- **承認者コメント**: 内容は問題なし（Phaseごとに一度止める方針）
