# タスク計画書: 多言語化対応改善

## メタデータ
- **作成日時**: 2026-04-10 13:41
- **タスクID**: i18n-improvement
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

システムで表示されるメッセージ・ラベルが日本語表記のままになっている箇所を多言語化対応する。  
既存の実装方針（英語コード値 + `t()` で表示）と統一し、言語切り替え時に全テキストが正しく切り替わる状態にする。  
あわせて、言語切り替えメニューを開発モード時のみ表示するよう制限する。

## 対象ファイル

### 定数ファイル（既存調査対象）
1. `frontend/src/constants/progressStatus.ts`
2. `frontend/src/constants/instructionType.ts`

### 翻訳ファイル
3. `frontend/src/locales/ja.json`
4. `frontend/src/locales/en.json`

### コンポーネント・コンテキスト
5. `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
6. `frontend/src/components/TransitionSetSearch/TransitionSetSearchModal.tsx`
7. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
8. `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx`
9. `frontend/src/components/SystemManagement/RoleManagement.tsx`
10. `frontend/src/contexts/ProjectMaimlContext.tsx`
11. `frontend/src/components/project/ProjectManagement.tsx`
12. `frontend/src/components/editorv2/components/FormatEditorDialog.tsx`
13. `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`
14. `frontend/src/app/page.tsx`
15. `frontend/src/components/common/Header.tsx`

### バックエンド Enum
16. `backend/src/enums/roleFunctionPermission.enum.ts`

## 実装ステップ

- [x] 既存実装調査・方針決定
- [x] `constants/progressStatus.ts` → 英語コード値で実装済み（変更不要）
- [x] `constants/instructionType.ts` → 英語コード値で実装済み（変更不要）
- [x] `WorkProgressDetailDialog.tsx` → 全箇所で `t()` を使用済み（変更不要）
- [x] `TransitionSetSearchModal.tsx` → 全箇所で `t()` を使用済み（変更不要）
- [x] `InstructionConfirmationTab.tsx` → 全箇所で `t()` を使用済み（変更不要）
- [x] `FunctionPermissionDialog.tsx` → `baseFunctions` に `dbValue`（DB送信用日本語固定値）を追加し、表示ラベルを `t()` で翻訳対応
- [x] `RoleManagement.tsx` → `functionNameToKey` / `roleNameToKey` マッピングを追加し、機能名・ロール名フィルタを `t()` で翻訳対応。`columns` / `getRoleNameOptions` の `useMemo` 依存配列に `t` を追加。「初期画面機能」列にも翻訳処理を追加
- [x] `ProjectMaimlContext.tsx` → ハードコードされた日本語エラーメッセージを `t()` に差し替え
- [x] `ProjectManagement.tsx` → ハードコードされた日本語エラーメッセージを `t()` に差し替え
- [x] `FormatEditorDialog.tsx` → ハードコードされた日本語エラーメッセージを `t()` に差し替え
- [x] `TemplateEditorDialog.tsx` → ハードコードされた日本語エラーメッセージを `t()` に差し替え
- [x] `page.tsx` → メニュー切替ボタンのハードコード日本語メニュー名を `t('page.menuName.*')` に変更
- [x] `Header.tsx` → 言語切り替えメニューを `isDev`（開発モード時）のみ表示するよう制限
- [x] `roleFunctionPermission.enum.ts` → i18n キー対応コメントを追記
- [x] `ja.json` / `en.json` → 不足キーを追加（`functionPermissionDialog.functions.*`、`page.menuName.*`、`roleManagement.messages.*`）

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx` | `baseFunctions` に `dbValue`（DB送信用日本語固定値）を追加。`handleOk` で DB 送信値として `dbValue` を使用。表示ラベルは `t('functionPermissionDialog.functions.XXXXX')` で翻訳 |
| `frontend/src/components/SystemManagement/RoleManagement.tsx` | `functionNameToKey` / `roleNameToKey` マッピングを追加。機能名表示（`func.name`）を `t(functionNameToKey[func.name])` で翻訳対応。「初期画面機能」列に同マッピングを使用した翻訳処理を追加。ロール名フィルタのラベルを `t(roleNameToKey[v])` で翻訳対応。`columns` / `getRoleNameOptions` の `useMemo` 依存配列に `t` を追加 |
| `frontend/src/contexts/ProjectMaimlContext.tsx` | `useLanguage` を import し、`message.error('MAIMLファイルの読み込みに失敗しました: ...')` を `t('project.messages.maiml_load_failed')` に変更 |
| `frontend/src/components/project/ProjectManagement.tsx` | `useLanguage` を import し、`message.error('ファイル一覧の取得に失敗しました')` を `t('project.messages.file_list_load_failed')` に変更 |
| `frontend/src/components/editorv2/components/FormatEditorDialog.tsx` | `useLanguage` を import し、`message.error('テンプレートファイル一覧の取得に失敗しました')` を `t('formatManagement.messages.file_list_load_failed')` に変更 |
| `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` | 同上 |
| `frontend/src/app/page.tsx` | `handleMenuChange` 関数内のハードコード日本語メニュー名を `t('page.menuName.*')` 呼び出しに変更 |
| `frontend/src/components/common/Header.tsx` | `isDev = process.env.NODE_ENV === 'development'` フラグを追加し、言語切り替えメニューを `isDev` の場合のみ `userMenuItems` に含めるよう変更 |
| `frontend/src/locales/ja.json` | `functionPermissionDialog.functions.*`（5項目）、`page.menuName.*`（6項目）、`roleManagement.messages.*`（不足9キー）を追加 |
| `frontend/src/locales/en.json` | `functionPermissionDialog` セクション全体、`page.menuName.*`（6項目）、`roleManagement.messages.*`（不足9キー）を追加 |
| `backend/src/enums/roleFunctionPermission.enum.ts` | i18n キー対応コメント追記。`RoleList` に `roleFunctionPermission.roles.*`、`FunctionList` に `functionPermissionDialog.functions.*` を対応付けるコメントを追加 |

## 調査結果サマリー

### 対応済み（変更不要）

PLAN.md 作成時点で対象としていた以下のファイルは、既に正しく多言語化対応されていた。

| ファイル | 状態 | 詳細 |
|---|---|---|
| `constants/progressStatus.ts` | ✅ 対応済み | 英語コード値（`not_started` 等）を使用、コメントで `t('progressStatus.<value>')` 使用を明示 |
| `constants/instructionType.ts` | ✅ 対応済み | 英語コード値（`project_instruction` 等）を使用、コメントで `t('instructionType.<value>')` 使用を明示 |
| `WorkProgressDetailDialog.tsx` | ✅ 対応済み | 全表示テキストで `t()` を使用 |
| `TransitionSetSearchModal.tsx` | ✅ 対応済み | 全表示テキストで `t()` を使用 |
| `InstructionConfirmationTab.tsx` | ✅ 対応済み | 全表示テキストで `t()` を使用 |
| `ja.json` / `en.json`（progress 系） | ✅ 対応済み | `progress.detail.*` / `progress.workStatus.*` / `progress.status.*` 等の全キーが存在 |

### 設計方針

- **DB送信値**: 日本語の機能名（`dbValue`）をそのまま使用（DB は日本語で保持）
- **画面表示**: `functionNameToKey` 経由で `t()` を呼び出し、現在の言語で表示
- マッピングにないキーはフォールバックとして元の日本語をそのまま表示するため、既存データへの影響なし

## 承認記録
- **計画書提示日時**: 2026-04-10 13:41
- **承認日時**: 2026-04-10 13:41

## タスクまとめ

システム全体でハードコードされていた日本語テキストを多言語化対応した。

対応内容は大きく以下の4点：

1. **機能名・メニュー名の多言語化**  
   `FunctionPermissionDialog.tsx` / `RoleManagement.tsx` / `page.tsx` で日本語固定だった機能名・メニュー名を `t()` に差し替え。DB送信値は日本語を維持しつつ、画面表示は `functionNameToKey` マッピングを経由して翻訳する設計を採用。

2. **エラーメッセージの多言語化**  
   `ProjectMaimlContext.ts
