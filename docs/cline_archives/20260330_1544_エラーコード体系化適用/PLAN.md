# タスク計画書: 実験管理者メニュー等へのエラーコード体系化適用

## メタデータ
- **作成日時**: 2026-03-30 15:44
- **タスクID**: error-code-apply-experiment-menu
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

プロバイダー・システム管理者・データ管理者メニューではすでに `extractErrorMessage()` を使った統一エラーコード体系が適用されている。実験管理者メニュー（`project/` 配下）の一部ファイルと、データ管理者メニューの `MasterManagement.tsx` に未適用箇所が存在するため、これらを統一パターンに修正する。

## 目的と期待される成果

- [ ] 全対象ファイルで `extractErrorMessage(error, t('...'))` パターンへ統一
- [ ] 日本語ハードコードのエラーメッセージを廃止
- [ ] `error instanceof Error ? error.message : '...'` 独自パターンを廃止

## 修正対象ファイルと方針

### 1. `MasterManagement.tsx`（データ管理者）
- CSV Upload/Download の `fetch` 直接呼び出しのエラー処理で `extractErrorMessage` 未使用
- `error instanceof Error ? error.message : ...` パターンを修正

### 2. `ProjectManagement.tsx`（実験管理者）
- 多数の `message.error('日本語ハードコード')` パターン
- 特殊ケース（`TASK_IN_PROGRESS`, `CHECKOUT_NO_MAIML_FILE` 等のビジネスエラーコード）は既存の `switch-case` ロジックを維持しつつ、汎用エラーのみ `extractErrorMessage` に統一

### 3. `FormatManagement.tsx`（実験管理者）
- `message.error(t('...') + ': ' + error.message)` パターンを修正
- `extractErrorMessage(error, t('...'))` に統一

### 4. `FileListTable.tsx`（実験管理者）
- `error instanceof Error ? error.message : '不明なエラー'` パターンを修正

### 5. `InstructionRegistrationTab.tsx`（実験管理者）
- `error instanceof Error ? error.message : t('...')` パターンを修正

### 6. `TaskRegistrationTab.tsx`（実験管理者）
- `error instanceof Error ? error.message : t('...')` パターンを修正

### 7. `FormatSearchModal.tsx`（実験管理者）
- `err instanceof Error ? err.message : '不明なエラーが発生しました'` パターンを修正

### 8. `CreateFormatFolderModal.tsx`（実験管理者）
- `message.error('フォーマットが選択されていません')` 等のハードコードを修正（※バリデーションエラーは翻訳キー使用のためそのまま維持）

## 実装ステップ

- [x] Phase 1: MasterManagement.tsx の修正
- [x] Phase 2: ProjectManagement.tsx の修正
- [x] Phase 3: FormatManagement.tsx の修正
- [x] Phase 4: FileListTable.tsx の修正
- [x] Phase 5: InstructionRegistrationTab.tsx の修正
- [x] Phase 6: TaskRegistrationTab.tsx の修正
- [x] Phase 7: FormatSearchModal.tsx の修正
- [x] Phase 8: CreateFormatFolderModal.tsx の確認（修正不要）

## 変更ファイル
1. `frontend/src/components/DataManagement/MasterManagement.tsx`
2. `frontend/src/components/project/ProjectManagement.tsx`
3. `frontend/src/components/project/FormatManagement.tsx`
4. `frontend/src/components/project/FileListTable.tsx`
5. `frontend/src/components/project/InstructionRegistrationTab.tsx`
6. `frontend/src/components/project/TaskRegistrationTab.tsx`
7. `frontend/src/components/project/FormatSearchModal.tsx`
8. `frontend/src/components/project/CreateFormatFolderModal.tsx`

## リスク

| リスク | 対策 |
|--------|------|
| ProjectManagement の switch-case ビジネスエラー処理が壊れる | switch-case ロジックは維持し、default ケースのみ extractErrorMessage に変更 |
| 翻訳キーが存在しないメッセージがある | t() で翻訳キーが未定義の場合は既存の文字列リテラルをデフォルトメッセージとして渡す |

## 承認記録
- **計画書提示日時**: 2026-03-30 15:44
- **承認日時**: 
