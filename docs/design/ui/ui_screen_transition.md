# 画面遷移図

## 概要

mmdpfプロジェクトの全画面遷移を、最新のソースコードをもとに整理したドキュメントです。

- **作成日**: 2026-08-24
- **ソース**: `frontend/src/components/menus/` 配下の各Menuコンポーネント

---

## 1. 全体概要（認証〜ロール別メニュー）

```mermaid
graph TD
    A([ブラウザアクセス]) --> B[ログイン画面\nLoginPage]

    B -->|ログインボタン| C{パスワード認証\nnginx証明書検証}
    B -->|パスワードを忘れた| PR1[パスワードリセット申請\nPasswordResetRequest]
    PR1 -->|メール受信後| PR2[パスワードリセット実行\nPasswordResetExecute]
    PR2 --> B

    C -->|認証OK| D[二段階認証画面\nPINCodeInputPage]
    C -->|認証NG| B

    D -->|PIN入力OK| E{ロール判定}
    D -->|PIN失敗3回| B

    E -->|experiment_admin\n実験管理者| F[実験管理者メニュー\nExperimentAdminMenu]
    E -->|experiment_worker\n実験作業者| G[実験作業者メニュー\nExperimentWorkerMenu]
    E -->|system_admin\nシステム管理者| H[システム管理者メニュー\nSystemAdminMenu]
    E -->|provider\nプロバイダ| I[プロバイダメニュー\nProviderMenu]
    E -->|data_admin\nデータ管理者| J[データ管理者メニュー\nDataAdminMenu]
```

---

## 2. 実験管理者メニュー（ExperimentAdminMenu）

```mermaid
graph TD
    F[実験管理者メニュー\nExperimentAdminMenu]

    F -->|タブ1| F1[プロジェクト管理\nProjectManagement]
    F -->|タブ2| F2[フォーマット管理\nFormatManagement]
    F -->|タブ3| F3[進捗確認\nProgressMonitoring]
    F -->|タブ4| F4[名前空間管理\nUncertaintyManagement]
    F -->|タブ5| F5[チーム管理\nTeamManagementPanel]

    F1 -->|MAIMLを編集| F6[MAIMLエディタ画面\nPetriNetEditorScreen\n全画面表示]
    F6 -->|閉じる| F1
```

### 2.1 プロジェクト管理（ProjectManagement）の内部タブ

```mermaid
graph TD
    F1[プロジェクト管理\nProjectManagement]

    F1 --> F1L[プロジェクト一覧\nProjectFolderTree\n左ペイン]
    F1L -->|プロジェクト選択| F1R[プロジェクト詳細\n右ペイン]

    F1R -->|タブ: ファイル管理| T1[ファイル管理タブ\nFileManagementTabContent]
    F1R -->|タブ: タスク登録| T2[タスク登録タブ\nTaskRegistrationTabContent]
    F1R -->|タブ: プロジェクト指示| T3[プロジェクト指示タブ\nProjectInstructionTabContent]
    F1R -->|タブ: 実験指示| T4[実験指示タブ\nExperimentInstructionTabContent]
    F1R -->|タブ: 評価登録| T5[評価登録タブ\nEvaluationRegistrationTabContent]
    F1R -->|タブ: 全体評価| T6[全体評価タブ\nOverallEvaluationTabContent]
```

### 2.2 プロジェクト管理から呼び出されるモーダル・ダイアログ

```mermaid
graph LR
    F1[プロジェクト管理\nProjectManagement]

    F1 -->|新規作成| M1[プロジェクト新規作成\nCreateProjectModal]
    F1 -->|リネーム| M2[プロジェクト名変更\nRenameProjectModal]
    F1 -->|ファイルアップロード| M3[ファイルアップロード\nUploadDialog]
    F1 -->|公開| M4[MAIML公開\nPublishDialog]
    F1 -->|非公開| M5[MAIML非公開\nUnpublishDialog]
    F1 -->|バリデーション| M6[MAIMLバリデーション\nValidationModal]
    F1 -->|問題管理| M8[問題管理\nIssueManagementModal]
    F1 -->|プロジェクト完了| M9[プロジェクト完了\nCompletionDialog]
    F1 -->|遷移検索| M10[遷移検索\nTransitionSetSearchModal]
```

---

## 3. 実験作業者メニュー（ExperimentWorkerMenu）

```mermaid
graph TD
    G[実験作業者メニュー\nExperimentWorkerMenu]

    G --> G0[プロジェクト選択\nプロジェクトドロップダウン]
    G0 -->|選択ボタン| G0M[プロジェクト選択モーダル\nProjectSelectionModal]
    G0M -->|確定| G0

    G -->|タブ: 実験記録| G1[実験記録タブ\nWorkRecordPanel]
    G -->|タブ: 進捗確認| G2[進捗確認タブ\nProgressOverviewTab]
    G -->|問題報告ボタン| G3[問題管理モーダル\nIssueManagementModal]
    G1 -->|指示確認ボタン| G1A[指示確認]
    G1A -->|開始ボタン| G1B[実行中に更新]
    G1B -->|終了ボタン| G1C[完了に更新]

    G2 -->|作業へ| G1
    G2 -->|承認依頼ボタン| G2A[承認依頼API呼出]
```

---

## 4. システム管理者メニュー（SystemAdminMenu）

```mermaid
graph TD
    H[システム管理者メニュー\nSystemAdminMenu]

    H -->|タブ1| H1[システム概要\nSystemOverview]
    H -->|タブ2| H2[ユーザー管理\nUserManagement]
    H -->|タブ3| H3[セッション管理\nSessionManagement]
    H -->|タブ5| H5[ロール管理\nRoleManagement]
    H -->|タブ6| H6[集約ルール設定\nAggregationRuleSettings]

    H2 -->|ユーザー追加| H2A[ユーザー追加ダイアログ\nUserAddDialog]
    H2 -->|ユーザー編集| H2B[ユーザー編集ダイアログ\nUserEditDialog]
    H5 -->|ロール追加| H5A[ロール追加ダイアログ\nRoleAddDialog]
    H5 -->|ロール編集| H5B[ロール編集ダイアログ\nRoleEditDialog]
    H5 -->|権限設定| H5C[機能権限管理ダイアログ\nFunctionPermissionDialog]
```

---

## 5. プロバイダメニュー（ProviderMenu）

```mermaid
graph TD
    I[プロバイダメニュー\nProviderMenu]

    I -->|タブ1| I1[組織管理\nOrganizationManagement]
    I -->|タブ2| I2[会社管理\nCorporationManagement]
    I -->|タブ3| I3[名前空間管理 グローバル\nGlobalNamespaceView]
    I -->|タブ4| I4[情報ダウンロード\nInformationDownload]

    I1 -->|組織追加| I1A[組織追加ダイアログ\nOrganizationAddDialog]
    I1 -->|組織編集| I1B[組織編集ダイアログ\nOrganizationEditDialog]
    I2 -->|会社追加| I2A[会社追加ダイアログ\nCorporationAddDialog]
    I2 -->|会社編集| I2B[会社編集ダイアログ\nCorporationEditDialog]
```

---

## 6. データ管理者メニュー（DataAdminMenu）

```mermaid
graph TD
    J[データ管理者メニュー\nDataAdminMenu]

    J -->|タブ1| J1[マスタ管理\nMasterManagement]

    J1 -->|マスタ追加| J1A[マスタ追加ダイアログ\nMasterAddDialog]
    J1 -->|マスタ編集| J1B[マスタ編集ダイアログ\nMasterEditDialog]
```

---

## 7. MAIMLエディタ（PetriNetEditorScreen）の内部遷移

```mermaid
graph TD
    F6[MAIMLエディタ\nPetriNetEditorScreen\n全画面]

    F6 --> E1[エディタツールバー\nEditorToolbar]
    F6 --> E2[PetriNetエディタ本体\nPetriNetEditorInner]
    F6 --> E3[ドラフト管理\nDraftManager]

    E2 -->|ドキュメント編集| E2A[ドキュメント編集ダイアログ\nDocumentEditDialog]
    E2 -->|マルチオブジェクト編集| E2B[マルチオブジェクトエディタ\nMultiObjectEditor]
    E2 -->|テンプレート編集| E2C[テンプレートエディタ\nTemplateEditorDialog]
    E1 -->|ワークフロー選択| E1A[ワークフロー選択ダイアログ\nWorkflowSelectorDialog]
    E1 -->|保存| E1B[保存確認ダイアログ\nSaveConfirmDialog]
```

---

## 8. 共通コンポーネント

```mermaid
graph LR
    ALL[全メニュー共通]

    ALL --> C1[ヘッダー\nHeader\nロゴ・ユーザー情報・ログアウト]
    ALL --> C2[サブヘッダー\nSubHeader\nタブ切替・メニュー切替]
    C1 -->|ログアウト| LOGIN[ログイン画面]
    C2 -->|メニュー切替| SWITCH{別メニューへ\n権限に応じて}
```

---

## 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-08-26 | §3 実験作業者メニュー: 問題報告ボタン → `IssueManagementModal` のフロー追加（タスク: 問題報告ボタン修正） | Cline |
| 2026-08-24 | 初版作成（最新ソースコードをもとにMermaid形式で作成） | Cline |
