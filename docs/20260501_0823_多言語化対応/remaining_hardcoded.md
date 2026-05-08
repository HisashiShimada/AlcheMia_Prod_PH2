# 日本語ハードコード残存調査結果

---

**調査日時**: 2026-05-01 10:34  
**調査範囲**: `frontend/src/**/*.tsx`, `frontend/src/**/*.ts`, `backend/src/**/*.ts`

---

## 対応が必要なファイル一覧（Phase 1〜9）

### Phase 1: 認証系コンポーネント（優先度：高）✅ 対応済み

| ファイル | 内容 | ステータス |
|---------|------|-----------|
| `frontend/src/components/auth/LoginForm.tsx` | ログインフォームの UI 文言・バリデーション | ✅ 対応済み |
| `frontend/src/components/auth/PINCodeForm.tsx` | PIN 入力画面の UI 文言・バリデーション | ✅ 対応済み |
| `frontend/src/components/auth/PasswordResetRequest.tsx` | パスワードリセット申請画面（auth/ 配下） | ✅ 対応済み |
| `frontend/src/components/auth/PasswordResetExecute.tsx` | パスワードリセット実行画面（auth/ 配下） | ✅ 対応済み |
| `frontend/src/components/PasswordResetRequest.tsx` | パスワードリセット申請画面（旧コンポーネント） | ✅ 対応済み |
| `frontend/src/components/PasswordResetExecute.tsx` | パスワードリセット実行画面（旧コンポーネント） | ✅ 対応済み |
| `frontend/src/components/ChangePasswordModal.tsx` | パスワード変更モーダル（14キー） | ✅ 対応済み |
| `frontend/src/components/LoginPage.tsx` | ログインページ（placeholder・ボタン・バリデーション） | ✅ 対応済み |
| `frontend/src/components/auth/AuthContainer.tsx` | message.success/error・getTitle() 日本語文字列 | ✅ 対応済み |

---

### Phase 2: エディタ系コンポーネント（優先度：高）✅ 対応済み

| ファイル | 内容 | ステータス |
|---------|------|-----------|
| `frontend/src/components/editorv2/PetriNetEditorScreen.tsx` | confirm ダイアログ・タイトル・状態表示 | ✅ 対応済み |
| `frontend/src/components/editorv2/components/XMLViewerWrapper.tsx` | Spin tip・エラーコメント | ✅ 対応済み |
| `frontend/src/components/editorv2/components/MethodTabPanel.tsx` | Tooltip 文言 | ✅ 対応済み |
| `frontend/src/components/editorv2/components/EditorToolbar.tsx` | Tooltip 文言 | ✅ 対応済み |
| `frontend/src/components/editorv2/components/PropertyPanel.tsx` | フィールドラベル・message・Modal title（約20箇所） | ✅ 対応済み |
| `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` | placeholder・message・Modal title（約20箇所） | ✅ 対応済み |
| `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` | Checkbox・Tag・message.success（約10箇所） | ✅ 対応済み |
| `frontend/src/components/editorv2/components/XMLViewer.tsx` | Tooltip・テキスト（約4箇所） | ✅ 対応済み |
| `frontend/src/components/viewer/ErrorBoundary.tsx` | Alert の message/description/title | ✅ 対応済み |
| `frontend/src/components/viewer/ImageViewer.tsx` | setError・Alert message/alt | ✅ 対応済み |
| `frontend/src/components/viewer/TiffViewer.tsx` | setUrlError・Alert message | ✅ 対応済み |
| `frontend/src/components/viewer/ViewRendererDialog.tsx` | message.error・タイトル生成関数 | ✅ 対応済み |
| `frontend/src/components/viewer/ViewRenderer.tsx` | message.success/error・Alert description | ✅ 対応済み |

---

### Phase 3: ユーティリティ・ローダー（優先度：高）✅ 対応済み

| ファイル | 内容 | ステータス |
|---------|------|-----------|
| `frontend/src/components/editorv2/loaders/maimlLoader.ts` | エラー文言・警告文言 | ✅ 対応済み |
| `frontend/src/components/editorv2/utils/nodeUtils.ts` | バリデーションエラー | ✅ 対応済み |
| `frontend/src/components/editorv2/utils/edgeUtils.ts` | バリデーションエラー | ✅ 対応済み |
| `frontend/src/components/editorv2/utils/validationUtils.ts` | バリデーションエラー・警告 | ✅ 対応済み |
| `frontend/src/components/editorv2/components/ValidationPanel.tsx` | バリデーション表示 | ✅ 対応済み |
| `frontend/src/components/editorv2/utils/converters/templateToXML.ts` | エラーメッセージ（12箇所） | ✅ 対応済み |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | alert() 呼び出し（11箇所） | ✅ 対応済み |
| `frontend/src/utils/formatApi.ts` | エラーメッセージ（6箇所） | ✅ 対応済み |
| `frontend/src/utils/errorHandler.ts` | コンソールログ内日本語（英語固定化） | ✅ 対応済み |
| `frontend/src/utils/apiClient.ts` | TRANSITION_STATUS_LABELS・エラーメッセージ | ✅ 対応済み |
| `frontend/src/utils/formatters.ts` | 相対日時・statusMap | ✅ 対応済み |
| `frontend/src/app/page.tsx` | Suspense フォールバック `'読み込み中...'` | ✅ 対応済み |
| `frontend/src/contexts/LanguageContext.tsx` | `getTranslation()` / `updateGlobalT()` 追加 | ✅ 対応済み |

---

### Phase 4: ja.json / en.json 不足キー追記（優先度：高）✅ 対応済み

| 内容 | ステータス |
|------|-----------|
| `editor.method.*` / `editor.toolbar.*` キーを追記 | ✅ 対応済み |
| `editor.validation.*` / `editor.loader.*` キーを追加 | ✅ 対応済み |
| `editor.validationPanel.*` キーを追加 | ✅ 対応済み |
| `editor.templateXml.*` キーを確認（12キー） | ✅ 対応済み |
| `editor.alert.*` キーを追加（11キー） | ✅ 対応済み |
| `auth.changePassword.*` キーを追加（14キー） | ✅ 対応済み |
| `formatApi.*` キーを確認（6キー） | ✅ 対応済み |
| `progressStatus.*` キーを追加 | ✅ 対応済み |

---

### Phase 5: サービス層エラーメッセージ英語化（優先度：中）✅ 対応済み

| ファイル | 内容 | ステータス |
|---------|------|-----------|
| `frontend/src/utils/errorMapper.ts` | `code` → 翻訳キーマッピング・i18n ベースに変更 | ✅ 対応済み |
| `frontend/src/services/authService.ts` | `AuthServiceError` コンストラクタの日本語メッセージ英語化 | ✅ 対応済み |
| `frontend/src/utils/authApi.ts` | `ApiError` の日本語メッセージ（3箇所）英語化 | ✅ 対応済み |
| `frontend/src/hooks/useInstructions.ts` | `setError('指示の取得に失敗しました')` 英語化 | ✅ 対応済み |
| `frontend/src/utils/apiClient.ts` | `error.message` 直参照を `mapErrorToMessage(code)` に統一 | ✅ 対応済み |
| `frontend/src/components/project/ProjectManagement.tsx` | `error.message` 直参照を `mapErrorToMessage(code)` に統一（3箇所） | ✅ 対応済み |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `error.message` 直参照を統一 | ✅ 対応済み |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | `error.message` 直参照を統一 | ✅ 対応済み |

---

### Phase 6: プロジェクト管理系（優先度：中）✅ 対応済み

| ファイル | 内容 | ステータス |
|---------|------|-----------|
| `frontend/src/components/project/ProjectManagement.tsx` | message.success/error/warning・confirm テキスト（約30箇所） | ✅ 対応済み |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | message.success/error/info/warning（約20箇所） | ✅ 対応済み |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | message.warning/error/success（約5箇所） | ✅ 対応済み |

---

### Phase 7: ファイル・フォーマット系（優先度：中）✅ 対応済み

| ファイル | 内容 | ステータス |
|---------|------|-----------|
| `frontend/src/components/project/BulkUploadDialog.tsx` | message・Modal title・Alert title・Text（約15箇所） | ✅ 対応済み |
| `frontend/src/components/project/FormatUploadDialog.tsx` | message・Modal title・Alert title・Text（約15箇所） | ✅ 対応済み |
| `frontend/src/components/project/FileListTable.tsx` | placeholder・Modal title・メニューラベル（約5箇所） | ✅ 対応済み |
| `frontend/src/components/project/FormatSearchModal.tsx` | 検索条件・結果ラベル・placeholder（約9箇所） | ✅ 対応済み |
| `frontend/src/components/project/FormatFolderTree.tsx` | 列ヘッダー（3箇所） | ✅ 対応済み |

---

### Phase 8: ダイアログ系（優先度：中）✅ 対応済み

| ファイル | 内容 | ステータス |
|---------|------|-----------|
| `frontend/src/components/project/UnifiedSelectionDialog.tsx` | ボタン・Tag・見出し・Empty テキスト（約15箇所） | ✅ 対応済み |
| `frontend/src/components/project/TaskSelectionDialog.tsx` | ボタン・Tag・ステータスラベル（約15箇所） | ✅ 対応済み |
| `frontend/src/components/project/InstructionEditDialog.tsx` | Select.Option ラベル（優先度・タイプ）・バリデーション | ✅ 対応済み |
| `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` | message・Modal title・Alert・Button（約20箇所） | ✅ 対応済み |
| `frontend/src/components/project/FormatEditorDialog.tsx` | message・Modal title・Alert（約20箇所） | ✅ 対応済み |
| `frontend/src/components/project/MaimlPublishDialog.tsx` | ダイアログ文言 | ✅ 対応済み |
| `frontend/src/components/project/MaimlUnpublishDialog.tsx` | ダイアログ文言 | ✅ 対応済み |
| `frontend/src/components/project/CreateFormatModal.tsx` | ダイアログ文言 | ✅ 対応済み |

---

### Phase 9: 実験作業系（優先度：中）✅ 対応済み

| ファイル | 内容 | ステータス |
|---------|------|-----------|
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | message・ステータスラベル・placeholder 英語化 | ✅ 対応済み |
| `frontend/src/components/progress/ProgressMonitoring.tsx` | message.error（2箇所） | ✅ 対応済み |
| `frontend/src/components/viewer/PetriNetViewer.tsx` | message.error/info/success（5箇所） | ✅ 対応済み |
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | message.error/success（2箇所） | ✅ 対応済み |
| `frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx` | message.warning（1箇所） | ✅ 対応済み |
| `frontend/src/components/ExperimentWorker/TransitionList.tsx` | message.success/error（複数箇所） | ✅ 対応済み |
| `frontend/src/contexts/AttributeDisplayContext.tsx` | ATTRIBUTE_OPTION_LABELS（4キー） | ✅ 対応済み |

---

## 対応不要（変更禁止）

| ファイル / 箇所 | 理由 |
|---------------|------|
| `FunctionPermissionDialog.tsx` の `dbValue` | DB/API 送信用固定値（日本語固定で管理） |
| `RoleManagement.tsx` のマッピングオブジェクトキー | DB から取得した値との照合用 |
| バックエンドの `console.log` / `console.error` | デバッグ用ログ（変更不要） |
| バックエンドの内部 `throw new Error()` | サーバー内部例外処理用ログのため変更不要 |
| バックエンドサービス層の内部エラー `message`（`jwtService`, `pinCodeService`, `passwordService` 等） | 内部処理用。`code` フィールドベースのフロントエンド翻訳方式で対応済み |
| `DocumentEditDialog.tsx` の `Creator`, `Vendor`, `Owner`, `Instrument` | MAIML 国際規格の技術用語のため英語固定 |
| `MultiObjectEditor.tsx` の `Name`, `Description`, `Annotation` 等 | MAIML 規格上のフィールド名のため英語固定 |
| `NestedPropertyEditor.tsx` の `Content Type`, `MaiML Property Type` | MAIML 規格用語のため英語固定 |
| `PropertyPanel.tsx` の `Arc ID` | MAIML 規格用語のため英語固定 |
| `placeholder` のサンプル値（`company_f`, `example@company.com` 等） | 入力例の文字列のため変更不要 |
| `frontend/src/constants/placeDescriptions.ts` の `'インポート済み'` / `'既存プレース'` | MAIMLデータに保存される値のため変更不可 |
| `backend/src/database/db.ts` の環境変数エラー説明文 | 開発者向けサーバー起動エラー（ユーザーに見えない） |
| `backend/src/workers/*.ts` の `throw new Error(日本語)` | サーバー内部例外処理用（変更禁止対象） |
