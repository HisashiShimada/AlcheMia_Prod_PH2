# リリースノート

**リリース日**: 2026-05-11  
**バージョン**: v00.00.06  
**対象ブランチ**: main  
**前回リリースコミット**: `f6b1de09`  
**今回リリースコミット**: `5955dd5a`

---

## 新機能・改善

### 1. SQL外部化とRepository層への移行（バックエンド リファクタリング）

- **Service層のSQL直書き排除**: `projectService.ts` / `progressService.ts` 内にインライン記述されていたSQLクエリをすべて Repository 層のメソッド呼び出しに置き換え
- **SQLファイル外部管理**: Repository 内の複雑なインラインSQLを `backend/src/sql/queries/` 配下のSQLファイルとして外部管理化（計24件）
- **対象 Repository**: `projectRepository`・`projectTaskRepository`・`projectTaskDetailRepository`・`loginHistoryRepository`・`maimlPublishJobRepository`・`progressService` 経由の各 Repository
- **単体テスト追加**: Phase5対応の35テストケースを追加し、全件パスを確認

### 2. 多言語化対応（i18n）

- **ハードコード日本語の排除**: フロントエンド全体にわたる日本語文字列のハードコードを `useLanguage()` フック / `getTranslation()` 関数による翻訳キー管理に置き換え
- **対象範囲**: 認証系（ログイン・PIN・パスワードリセット）・エディタ系・プロジェクト管理系・実験作業系・ダイアログ系・ファイル/フォーマット系の全画面
- **非 React TS ファイル対応**: `LanguageContext.tsx` に `getTranslation()` / `updateGlobalT()` を追加し、ユーティリティ・ローダーファイルからも翻訳関数を呼び出せるよう対応
- **翻訳ファイル拡充**: `ja.json` / `en.json` に認証・エディタ・検索・管理系の翻訳キーを大幅追加

### 3. マジックナンバーのENUM定数化

- **バックエンド ENUM 新規作成** (4ファイル):
  - `enums/projectStatus.enum.ts` — `ProjectStatusEnum`・`CheckoutStatusEnum`
  - `enums/instructionStatus.enum.ts` — `InstructionStatusEnum`・`InstructionPriorityEnum`・`InstructionTargetEnum`・`InstructionTypeEnum`
  - `enums/issueType.enum.ts` — `IssueTypeEnum`
  - `enums/experimentCondition.enum.ts` — `ExperimentConditionEnum`
- **フロントエンド定数集約**: `constants/codeMaster.ts` に `ProjectStatus`・`CheckoutStatus`・`InstructionStatus`・`InstructionPriority`・`InstructionTarget`・`InstructionTypeCode`・`IssueType`・`ExperimentCondition`・`TransitionStatusCode` を追加
- **重複マップ解消**: 各ファイルで個別定義されていた `TASK_STATUS_MAP` を `types/project.ts` の定義に統一

### 4. MAIML未登録プロジェクトの詳細ボタン無効化

- **詳細ボタン制御追加**: 進捗モニタリング画面（`ProgressMonitoring.tsx`）にて、MAIMLファイルが未登録のプロジェクト（`project_uuid` および `maimlFileKey` がともに未設定）に対する「詳細」ボタンを無効化
- **ツールチップ表示**: 無効化されたボタンにホバーすると「MAIMLファイルが登録されていないため詳細を表示できません」を表示
- **バックエンド変更なし**: 既存レスポンスフィールド（`project_uuid` / `maimlFileKey`）を活用したフロントエンドのみの対応

### 5. ファイル管理タブへの縦スクロールバー追加

- **スクロールバー追加**: プロジェクト管理画面の「ファイル管理」タブでファイル件数が多い場合に縦スクロールバーが表示されるよう修正
- **修正内容**: `file_management` タブの children を `overflow: auto` の div でラップ、`Tabs` コンポーネントに `minHeight: 0` を追加

### 6. API呼び出しファイルのService層への統合

- **Utilsフォルダ整理**: `frontend/src/` の `utils/` フォルダに配置されていたAPI呼び出しファイルを `services/` フォルダに統合し、不要なファイルを削減

### 7. 型定義の集約対応（フロントエンド リファクタリング）

- **インライン型定義の排除**: フロントエンド全体で各ファイルに散在していたインライン型定義を専用の型定義ファイルへ集約（対象104ファイル）
- **型定義ファイルの整備**: `types/common.ts`・`types/project.ts`・`types/format.ts`・`types/editor.ts`・`types/error.ts`・`types/experimentWorker.ts`・`types/hooks.ts`・`types/maimlEditor.ts`・`types/organization.ts`・`types/user.ts`・`types/file.ts` 等に型定義を集約
- **不正な依存方向の解消**: `AuthServiceError` クラスを `services/authService.ts` から `types/error.ts` へ移動し、Utils → Service の循環依存を排除
- **部署管理画面のインラインimport修正**: `DepartmentManagement.tsx` のインライン import 記述を `types/departmentTypes.ts` への外部 import に変更

---

## バグ修正

### 1. 指示確認タブ — 「全ての指示の確認完了」ボタンの活性制御不備（No.2）

- **問題**: 各指示グループの「確認完了」ボタンはプロジェクトステータスが実行中（`executing_task = 2`）以外のとき非活性になっていたが、下部の「全ての指示の確認完了」ボタンにはその条件が欠けており、ステータスに関わらず常に活性状態だった
- **修正**: `InstructionConfirmationTab.tsx` の `disabled` 条件とスタイル計算に `!isTaskExecuting` を追加

### 2. 指示確認タブ — タスクフィルタにプロジェクトIDが表示されるバグ（No.7）

- **問題**: 進捗確認タブの「指示」ボタン押下後、指示確認タブに遷移するとタスクフィルタのセレクトボックスにタスク番号ではなくプロジェクトIDを含む文字列が表示されていた
- **原因**: `ProgressCheckTab` と `InstructionConfirmationTab` で `taskId` の生成フォーマットが異なっていた（前者に末尾 `-{taskIndex}` が余分に付いていた）
- **修正**: `ProgressCheckTab.tsx` の `taskId` 生成フォーマットを統一し、遷移時に `methodId` も引き継ぐよう対応

### 3. 実験データ記録ダイアログ — 作業指示ダイアログのモックデータ参照（No.6）

- **問題**: 実験データ記録ダイアログ内の「作業指示」ボタンで表示されるモーダルがモックデータ（`frontend/src/data/projectsData.ts`）を参照しており、実際のAPI指示データが表示されなかった
- **修正**: `InstructionConfirmationModal` がAPIから指示データを取得するよう変更、`frontend/src/data/` フォルダを削除し関連5ファイルをprops/API経由のデータ取得に変更

### 4. プロジェクト完了時のボタングレーアウト未実装

- **問題**: プロジェクト完了状態（`status = 4`）でもアップロード・編集・削除・指示追加ボタンが有効のままだった
- **修正**: `ProjectManagement.tsx` のファイル操作ボタン3件および `TaskRegistrationTab.tsx` の指示追加ボタンに `status === 4` 時の `disabled` 制御とツールチップメッセージを追加

### 5. 記録ボタンの活性制御不備

- **問題**: 実験作業者画面の進捗確認タブで「開始」ボタンを押下しなくても実験記録タブの「記録」ボタンが押下できた
- **修正**: 「開始」ボタン押下前は「記録」ボタンが非活性になるよう制御を追加

### 6. パスワード変更時にパスワード有効期限がnullになるバグ

- **問題**: パスワード変更操作を実行するとパスワード有効期限（`password_expires_at`）が `null` に更新されていた
- **修正**: パスワード変更処理における有効期限の更新ロジックを修正（Jira対応）

### 7. ValidationPanel（バリデーション自動補正機能）の非表示対応

- **問題**: バリデーション自動補正機能が画面に表示されており、ユーザーに誤操作の余地があった
- **修正**: `ValidationPanel` コンポーネントを非表示に変更

### 8. ページネーション固定バグ修正

- **問題**: 画面のページ数表示が「20件/ページ」で固定され、切り替えができなかった
- **修正**: 各画面でページネーション件数の設定が統一され、ページ数切り替えが正常動作するよう修正

### 9. PINコードエラーメッセージの日本語化

- **問題**: PINコード入力画面で「Invalid PIN code」と英語表示されていた
- **修正**: 「PINコードが正しくありません」と日本語で表示されるよう修正

### 10. 多言語化対応漏れ修正

- **問題**: `ja.json` / `en.json` の変換キーが不足・誤っていた箇所があった
- **修正**: 変換先のキー追加漏れおよびJSONの記述漏れを修正

### 11. ant-design 非推奨警告修正

- **問題**: ant-design v6 の非推奨 API 使用によるコンソール警告が複数箇所で発生していた
- **修正**: 非推奨の props や API を最新の書き方に変更

### 12. 部署追加時のバリデーションエラー（AISOLMAIML-208）

- **問題**: 部署管理画面の部署追加ダイアログで保存ボタンを押下すると E1003 バリデーションエラー（HTTP 400）が発生していた
- **原因**: フロントエンドが送るリクエストボディのキーが snake_case（`department_cd`・`department_name`・`is_active`）である一方、バックエンドのバリデーションが camelCase（`departmentCd`・`departmentName`・`isActive`）を期待していたため不一致
- **修正**: `departmentApiService.ts` に `CreateDepartmentRequest` 型を追加し、`DepartmentManagement.tsx` の `createMaster` 呼び出しキーを camelCase に修正

### 13. 権限不足エラー発生時のエラーコード修正（AISOLMAIML-211 / GitHub issue #29）

- **問題**: 公開処理などで権限不足エラーが発生した際、`permissionCheckMiddleware.ts` が独自文字列コード（`PERMISSION_DENIED`・`INSUFFICIENT_PERMISSION`）を返しており、フロントエンドの `ERROR_MESSAGE_MAP` で日本語メッセージが引けず想定外の表示になっていた
- **修正**: エラーコードを統一規約の `E5012`（アクセス拒否）・`E5015`（権限不足）に変更

### 14. 公開・非公開ボタン押下後のプロジェクト一覧未更新（AISOLMAIML-220）

- **問題**: 公開/非公開 API 呼び出し後・ポーリング完了後に `refetchProjects()` が呼ばれておらず、左パネルのプロジェクト一覧・ステータスタグ・ボタン活性状態が古い状態のままになっていた
- **修正**: `ProjectManagement.tsx` の `handlePublishSuccess`・`handleUnpublishSuccess`・`handlePollingComplete` に `refetchProjects()` を追加、および `handleProjectReload` ハンドラーを新規追加

---

## インフラ・デプロイ対応

### 1. 本番環境検証用の検証環境修正

- 本番環境（ALBあり・nginxなし構成）での検証に向けた検証環境の設定修正
- ALB mTLS（相互TLS認証）の追加設定対応
- デプロイスクリプト修正

### 2. システムタイトルの変更

- フロントエンドのシステムタイトルを変更

### 3. デプロイ手順書・スクリプトの整備

- 検証環境デプロイ手順書の大幅改訂（リリースノート作成手順・スクリプトパス・環境変数確認手順など）
- デプロイ用差分抽出スクリプトの修正・ファイル出力対応
- 証明書設定手順書の修正

---

## DB マイグレーション

今回リリースにDBマイグレーションはありません。

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/enums/projectStatus.enum.ts`（新規） | ProjectStatusEnum・CheckoutStatusEnum 定義 |
| `backend/src/enums/instructionStatus.enum.ts`（新規） | InstructionStatusEnum 等4種類のENUM定義 |
| `backend/src/enums/issueType.enum.ts`（新規） | IssueTypeEnum 定義 |
| `backend/src/enums/experimentCondition.enum.ts`（新規） | ExperimentConditionEnum 定義 |
| `backend/src/sql/queries/projects/`（新規 複数） | projectService移行分SQLファイル（10件以上） |
| `backend/src/sql/queries/project_tasks/`（新規 複数） | projectTaskRepository対応SQLファイル（5件） |
| `backend/src/sql/queries/project_task_detail/`（新規） | findByProject.sql・findByPrimaryKey.sql |
| `backend/src/sql/queries/login_history/`（新規） | ログイン履歴SQLファイル（3件） |
| `backend/src/sql/queries/maiml_publish_job/`（新規） | 公開ジョブSQLファイル（4件） |
| `backend/src/services/projectService.ts` | SQL直書き → Repository呼び出しに置換・ENUM使用 |
| `backend/src/services/progressService.ts` | SQL直書き → Repository呼び出しに置換・ENUM使用 |
| `backend/src/repositories/projectRepository.ts` | 新メソッド追加・SQLファイル外出し・ENUM使用 |
| `backend/src/repositories/projectTaskRepository.ts` | SQLファイル外出し |
| `backend/src/repositories/loginHistoryRepository.ts` | SQLファイル外出し |
| `backend/src/repositories/maimlPublishJobRepository.ts` | SQLファイル外出し |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/constants/codeMaster.ts` | 全ENUM定数を集約追加（ProjectStatus等9種類） |
| `frontend/src/contexts/LanguageContext.tsx` | getTranslation()・updateGlobalT() 追加 |
| `frontend/src/locales/ja.json` | 多言語翻訳キー大幅追加 |
| `frontend/src/locales/en.json` | 多言語翻訳キー大幅追加 |
| `frontend/src/components/project/ProjectManagement.tsx` | ENUM使用・完了時ボタンdisabled追加・スクロール修正・多言語化 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | ローカル定数削除→ENUM統一・多言語化 |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | 全指示確認完了ボタン活性制御修正・ENUM使用 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | taskIdフォーマット修正・methodId引き継ぎ対応 |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx` | モックデータ → API取得に変更 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | TransitionStatusCode使用・記録ボタン活性制御修正 |
| `frontend/src/components/project/ProjectManagement.tsx` | 公開/非公開後リフレッシュ追加・handleProjectReload 追加 |
| `frontend/src/components/progress/ProgressMonitoring.tsx` | MAIML未登録プロジェクト詳細ボタン無効化 |
| `frontend/src/components/SystemManagement/DepartmentManagement.tsx` | 部署追加リクエストを camelCase に修正・インラインimport修正 |
| `frontend/src/services/departmentApiService.ts` | CreateDepartmentRequest 型追加・インラインimport修正 |
| `frontend/src/types/error.ts` | AuthServiceError クラスを移動追加 |
| `frontend/src/types/` 配下（複数） | インライン型定義を型定義ファイルに集約（common.ts・project.ts・format.ts・editor.ts 等） |
| `frontend/src/types/departmentTypes.ts` | 部署関連型の集約追加 |
| `frontend/src/utils/__tests__/errorMapper.test.ts` | importパス修正（付随修正） |
| `backend/src/middleware/permissionCheckMiddleware.ts` | エラーコードを E5012/E5015 に統一 |
