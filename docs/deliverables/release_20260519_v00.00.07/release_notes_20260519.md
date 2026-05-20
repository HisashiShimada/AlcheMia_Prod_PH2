# リリースノート

**リリース日**: 2026-05-19  
**対象ブランチ**: main  
**前回リリースコミット**: `b2b9066b`  
**今回リリースコミット**: `3cdd9b28`

---

## バグ修正

### 1. 重複エラーメッセージ改善（会社管理・マスタ管理・ユーザー管理・ロール管理・組織管理）

- **会社管理**: 重複する会社名で登録した際、フィールド下インライン表示＋トーストで正確なエラーメッセージが表示されるよう修正
- **マスタ管理**: Creator / Vendor / Instrument / Attribute の重複ID登録時に `E9999` フォールバックではなく正確なメッセージが表示されるよう修正
- **ユーザー管理**: 重複メールアドレスで登録した際、フィールド下インライン表示＋トーストでメッセージが表示されるよう修正
- **ロール管理**: バックエンドに重複チェックを追加し、重複 `role_cd` 登録時に HTTP 500 ではなく HTTP 409 + `DUPLICATE_ROLE_CD` を返すよう修正
- **組織管理**: 入力中のリアルタイム重複チェックを廃止し、保存後にインライン表示＋トーストで表示する方式に統一

### 2. 実験開始後ボタン非活性バグ修正

- 実験作業者画面で「実験開始」を実行後、指示確認タブの「確認完了」ボタンおよび実験記録タブの「記録」ボタンが非活性のままになるバグを修正
- 実験開始・強制終了後にプロジェクト一覧を再取得し、プロジェクトステータスを即座に反映するよう対応

### 3. MAIMLアップロード UUID重複エラー対応

- 別プロジェクトに登録済みの UUID を持つ MAIML ファイルをアップロードした際、ストレージ書き込み前にエラーを返すよう修正（従来は「アップロード成功」として返っていた）
- 通常アップロード・チャンクアップロードの両方に対応
- 新規エラーコード `E7013`（MAIML UUID重複）を追加

### 4. 実験管理者タブ遷移時の状態保持修正

- 実験管理者画面でフォーマット管理タブ・進捗確認タブのフィルタ・選択状態が、別タブへ遷移後にリセットされるバグを修正
- タブ切り替え時にコンポーネントがアンマウントされないよう `display: none` 方式に変更

### 5. ロール管理リロードメッセージ未表示修正

- ロール管理画面でリロードボタンをクリックした際に「データをリロードしました」のサクセスメッセージが表示されないバグを修正
- 他の管理画面（部署管理・ユーザー管理等）と一貫した UX に統一

### 6. ユーザー管理 部署プルダウン非アクティブ除外

- ユーザー追加・編集ダイアログの「所属部署」プルダウンに非アクティブ（`isActive=false`）の部署が表示されるバグを修正
- アクティブな部署のみが選択肢として表示されるよう対応

### 7. ProjectManagement タブデータ再取得修正

- プロジェクト管理画面でプロジェクトを切り替えた際、現在表示中のタブのデータが再取得されないバグを修正
- `file_management` タブ・`task_results` タブ表示中にプロジェクトを変更すると、新しいプロジェクトのデータが即座に表示されるよう対応

### 8. プロジェクト初期登録漏れ修正（department_cd）

- プロジェクト作成時に `department_cd` が常に `null` で登録されていたバグを修正
- ログインユーザーの `departmentCd` を正しく取得して登録するよう対応

### 9. ProjectManagement 検索フィルタ修正

- プロジェクト管理画面の検索窓でステータス名（「計画中」「実行中」等）やチェックアウト状態ラベルの文字が一致するプロジェクトが意図せず表示されるバグを修正
- 検索対象をプロジェクト名・説明・オーナー名のみに限定

### 10. プロジェクト一覧フィルタ状態リセットバグ修正

- プロジェクト一覧でフィルタ・ソートを設定後にペトリネット編集を開いて閉じると、フィルタ・ソート状態がリセットされるバグを修正
- フィルタ・ソート状態を `sessionStorage` に保存・復元するよう対応

### 11. プロジェクト名重複エラーメッセージ修正

- 重複したプロジェクト名で作成しようとした際、エラーモーダルに「Request failed with status code 409」という技術的メッセージが表示されていた問題を修正
- バックエンドが返す日本語メッセージ（「プロジェクト名が既に存在します」）が正しく表示されるよう対応

### 12. ページネーション表記統一

- 各画面のページネーション部品で「件/ページ」「ページ」「Page」「/page」が混在していた表記を多言語ファイル（i18n）経由に統一
- 日本語・英語の切り替えに対応

---

## 改善

### 1. 英語ハードコードメッセージの多言語化対応（改善仕様書 No.17a）

- **認証フロー**: バックエンド接続不可時の「Unable to connect to server」等、`authService.ts` 内の英語ハードコードメッセージを `mapErrorToMessage()` 経由の翻訳済みメッセージに変更
- **実験作業ダイアログ**: `DataRecordDialog.tsx` 内の英語ハードコードメッセージを `t()` 関数対応に変更
- 翻訳キー 7件（`PIN_VERIFY_FAILED` 等）を `ja.json` / `en.json` に追加

### 2. 言語ファイル整理・型定義整理

- **言語ファイル整理**: `ja.json` / `en.json` の重複キー（`priorityLabels`・`typeLabels`・旧 `progressStatus`・`taskStatus`）を削除し、翻訳キーの一元化を実施
- **型定義整理**: `Project` 型・`Task` 型から未使用プロパティ（`members`・`tags`・`totalSize`・`assignedWorker`・`progressPercentage`）を削除し、型定義の可読性・保守性を向上

---

## DB マイグレーション

なし

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/services/roleService.ts` | `createRole` に重複チェック追加（HTTP 409 + `DUPLICATE_ROLE_CD`） |
| `backend/src/repositories/projectRepository.ts` | `findProjectNameByUuid()` 関数追加（UUID重複チェック用） |
| `backend/src/services/fileAccessService.ts` | 通常アップロード時の UUID 事前重複チェック追加 |
| `backend/src/controllers/fileAccessController.ts` | チャンクアップロード時の UUID 事前重複チェック追加 |
| `backend/src/controllers/projectController.ts` | `department_cd` を `req.user.departmentCd` から取得するよう修正 |
| `backend/src/enums/errorCodes.ts` | `E7013` 定数追加 |
| `backend/src/types/project.ts` | `Project` 型から未使用プロパティ削除 |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | `onTaskStatusChanged` コールバック追加 |
| `frontend/src/components/menus/ExperimentAdminMenu.tsx` | タブ切り替えを `display: none` 方式に変更 |
| `frontend/src/components/project/ProjectManagement.tsx` | 検索フィルタ修正・フィルタ状態 sessionStorage 保存・タブデータ再取得・重複エラーメッセージ修正 |
| `frontend/src/components/SystemManagement/UserManagement.tsx` | 部署プルダウン非アクティブ除外・重複メールインライン表示追加 |
| `frontend/src/components/SystemManagement/RoleManagement.tsx` | リロードメッセージ追加 |
| `frontend/src/services/authService.ts` | 英語ハードコードメッセージを `mapErrorToMessage()` に変更 |
| `frontend/src/locales/ja.json` | 翻訳キー追加・整理 |
| `frontend/src/locales/en.json` | 翻訳キー追加・整理 |
| `frontend/src/types/project.ts` | `Project` 型・`Task` 型から未使用プロパティ削除 |
| `frontend/src/utils/errorCodes.ts` | `E7013` 定数追加 |
