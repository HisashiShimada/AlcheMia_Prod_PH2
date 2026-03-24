# タスク計画書: 4-8 フォーマット管理 E2Eテスト

## メタデータ
- **作成日時**: 2026-03-13 19:40
- **タスクID**: e2e-4-8-format-management
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の「4-8: フォーマット管理」シナリオに対応する
Playwright E2Eテスト（featureファイル + stepsファイル）を作成する。
対象シナリオ40件のうち、手動テスト対象（4-8-25/34/36/37）を除く36件を自動化する。

## 目的と期待される成果

- [ ] `4-8_format_management.feature` ファイルを作成する（40件全シナリオ）
- [ ] `4-8_format_management.ts` stepsファイルを作成する（手動テスト対象を除く36件）
- [ ] フォーマット管理関連コンポーネントに必要な `data-testid` を追加する

## 実装ステップ

### Phase 1: フロントエンドに data-testid を追加

- [ ] `FormatManagement.tsx`: 詳細検索ボタンに `data-testid="format-search-button"` を追加
- [ ] `FormatManagement.tsx`: 新規フォーマットボタン（フォルダ作成）に `data-testid="new-format-folder-button"` を追加
- [ ] `FormatManagement.tsx`: 新規サブフォルダボタンに `data-testid="new-folder-button"` を追加
- [ ] `FormatManagement.tsx`: 新規ファイルボタンに `data-testid="new-file-button"` を追加
- [ ] `FormatManagement.tsx`: アップロードボタンに `data-testid="upload-button"` を追加
- [ ] `FormatManagement.tsx`: フォーマット一覧各アイテムに `data-testid="format-item-{id}"` を追加
- [ ] `FormatSearchModal.tsx`: 条件追加ボタンに `data-testid="search-criteria-add-button"` を追加
- [ ] `FormatSearchModal.tsx`: リセットボタンに `data-testid="search-criteria-reset-button"` を追加
- [ ] `FormatSearchModal.tsx`: 検索実行ボタンに `data-testid="search-execute-button"` を追加
- [ ] `FormatSearchModal.tsx`: 検索条件行に `data-testid="search-criteria-row-{index}"` を追加
- [ ] `CreateFormatFolderModal.tsx`: フォルダ名Inputに `data-testid="folder-name-input"` を追加
- [ ] `CreateFormatFolderModal.tsx`: 作成ボタンに `data-testid="create-folder-submit-button"` を追加
- [ ] `CreateFormatFolderModal.tsx`: キャンセルボタンに `data-testid="create-folder-cancel-button"` を追加
- [ ] `CreateFormatFileModal.tsx`: ファイル名Inputに `data-testid="file-name-input"` を追加
- [ ] `CreateFormatFileModal.tsx`: 作成ボタンに `data-testid="create-file-submit-button"` を追加
- [ ] `CreateFormatFileModal.tsx`: キャンセルボタンに `data-testid="create-file-cancel-button"` を追加
- [ ] `FormatUploadDialog.tsx`: アップロードモード切り替えセグメントに `data-testid="upload-mode-segment"` を追加
- [ ] `FormatUploadDialog.tsx`: アップロード開始ボタンに `data-testid="upload-start-button"` を追加
- [ ] `FormatUploadDialog.tsx`: キャンセルボタンに `data-testid="upload-dialog-cancel-button"` を追加
- [ ] `FormatUploadDialog.tsx`: 進捗表示エリアに `data-testid="upload-progress"` を追加
- [ ] `FormatFileListTable.tsx`: 編集ボタンに `data-testid="file-edit-button"` を追加
- [ ] `FormatFileListTable.tsx`: ダウンロードボタンに `data-testid="file-download-button"` を追加
- [ ] `FormatFileListTable.tsx`: 削除ボタンに `data-testid="file-delete-button"` を追加

### Phase 2: featureファイルを作成

- [ ] `tests/e2e/features/4_experiment_admin/4-8_format_management.feature` を作成（40件全シナリオのGherkin）

### Phase 3: stepsファイルを作成

- [ ] `tests/e2e/steps/4_experiment_admin/4-8_format_management.ts` を作成

## 変更ファイル

### 新規作成
1. `tests/e2e/features/4_experiment_admin/4-8_format_management.feature` - Gherkinシナリオ（40件）
2. `tests/e2e/steps/4_experiment_admin/4-8_format_management.ts` - stepsの実装

### 修正
1. `frontend/src/components/project/FormatManagement.tsx` - data-testid追加
2. `frontend/src/components/project/FormatSearchModal.tsx` - data-testid追加
3. `frontend/src/components/project/CreateFormatFolderModal.tsx` - data-testid追加
4. `frontend/src/components/project/CreateFormatFileModal.tsx` - data-testid追加
5. `frontend/src/components/project/FormatUploadDialog.tsx` - data-testid追加
6. `frontend/src/components/project/FormatFileListTable.tsx` - data-testid追加

## シナリオ詳細

### 自動化対象（36件）

| シナリオID | シナリオ名 | 種別 | 対応API |
|-----------|-----------|------|---------|
| 4-8-1 | フォーマット一覧が表示されること | 正常系 | GET `/api/v1/formats` |
| 4-8-2 | フォーマット（ワークフローベース）を新規登録できること | 正常系 | POST `/api/v1/formats` |
| 4-8-3 | 登録済みフォーマットを削除できること | 正常系 | DELETE `/api/v1/formats/:formatId` |
| 4-8-4 | 「詳細検索」ボタンをクリックすると詳細検索モーダルが開くこと | 表示確認 | - |
| 4-8-5 | 検索条件を「条件追加」ボタンで5件まで追加できること | 表示確認 | - |
| 4-8-6 | 「リセット」ボタンをクリックすると検索条件と結果がクリアされること | 正常系 | - |
| 4-8-7 | 有効な検索条件が0件の状態で検索を実行するとエラーメッセージが表示されること | 異常系 | - |
| 4-8-8 | フォーマット未選択時に「新規フォルダ」ボタンをクリックすると警告メッセージが表示されること | 異常系 | - |
| 4-8-9 | フォーマット選択後に「新規フォルダ」ボタンをクリックすると新規フォルダ作成モーダルが開くこと | 表示確認 | - |
| 4-8-10 | フォルダ名が未入力の場合にバリデーションエラーが表示されること | 異常系 | - |
| 4-8-11 | フォルダ名に使用不可文字（日本語・スペース等）を含む場合にバリデーションエラーが表示されること | 異常系 | - |
| 4-8-12 | 「キャンセル」ボタンをクリックするとモーダルが閉じてフォルダが作成されないこと | 正常系 | - |
| 4-8-13 | フォーマット未選択時に「新規ファイル」ボタンをクリックすると警告メッセージが表示されること | 異常系 | - |
| 4-8-14 | フォーマット選択後に「新規ファイル」ボタンをクリックすると新規ファイル作成モーダルが開くこと | 表示確認 | - |
| 4-8-15 | XMLタイプのフォーマット選択時はテンプレートタイプ選択が表示されること | 表示確認 | - |
| 4-8-16 | MAIMLタイプのフォーマット選択時はテンプレートタイプ選択が表示されないこと | 表示確認 | - |
| 4-8-17 | ファイル名が未入力の場合にバリデーションエラーが表示されること | 異常系 | - |
| 4-8-18 | ファイル名が100文字超の場合にバリデーションエラーが表示されること | 異常系 | - |
| 4-8-19 | XMLファイル作成時にテンプレートタイプが未選択の場合にバリデーションエラーが表示されること | 異常系 | - |
| 4-8-20 | 「キャンセル」ボタンをクリックするとモーダルが閉じてファイルが作成されないこと | 正常系 | - |
| 4-8-21 | フォーマット未選択時に「アップロード」ボタンをクリックすると警告メッセージが表示されること | 異常系 | - |
| 4-8-22 | フォーマット選択後に「アップロード」ボタンをクリックするとアップロードダイアログが開くこと | 表示確認 | - |
| 4-8-23 | 単一ファイルモードでファイルを1件選択してアップロードできること（モック） | 正常系 | POST `/api/v1/formats/upload`（モック） |
| 4-8-24 | 一括ファイルモードで複数ファイルを選択してアップロードできること（モック） | 正常系 | POST `/api/v1/formats/upload`（モック） |
| 4-8-26 | モード切り替え時に選択済みファイルリストがクリアされること | 表示確認 | - |
| 4-8-27 | 単一ファイルモードで複数ファイルを選択すると最後の1ファイルのみが選択状態になること | 表示確認 | - |
| 4-8-28 | ファイルを選択せずにアップロードボタンを押すと警告メッセージが表示されること | 異常系 | - |
| 4-8-29 | アップロード中にファイル完了件数とパーセントが進捗表示されること（モック） | 表示確認 | - |
| 4-8-30 | アップロード完了後に成功メッセージが表示されること（モック） | 表示確認 | - |
| 4-8-31 | アップロード中にダイアログを閉じようとすると確認ダイアログが表示されること | 異常系 | - |
| 4-8-32 | MAIMLファイルの「編集」ボタンをクリックするとPetriNetEditorがフルスクリーンで開くこと | 正常系 | POST `/api/worker/load-maiml-file` |
| 4-8-33 | XMLファイルの「編集」ボタンをクリックするとTemplateEditorDialogがモーダルで開くこと | 正常系 | - |
| 4-8-35 | .maimlでも.xmlでもないファイルの「編集」ボタンをクリックするとエラーメッセージが表示されること | 異常系 | - |
| 4-8-38 | ファイルの「削除」ボタンをクリックすると削除確認ダイアログが表示されること | 表示確認 | - |
| 4-8-39 | 削除確認ダイアログで確認するとファイルが削除されること（UI確認のみ） | 正常系 | DELETE `/api/v1/formats/:formatId/files/:fileId`（未実装のためUI確認のみ） |
| 4-8-40 | 削除確認ダイアログでキャンセルするとファイルが削除されないこと | 正常系 | - |

### featureのみ（手動テスト対象 4件）

| シナリオID | シナリオ名 | 手動テスト理由 |
|-----------|-----------|--------------|
| 4-8-25 | フォルダモードでフォルダを選択してアップロードできること | ブラウザの `webkitdirectory` 属性を使用するためPlaywright自動化困難 |
| 4-8-34 | MAIMLファイルの編集後に保存するとS3ファイルが更新されること | `PUT /api/v1/formats/:formatId/files/:fileId` 未実装のためAPI実装後に確認 |
| 4-8-36 | ファイルの「ダウンロード」ボタンをクリックするとファイルがダウンロードされること | `POST /api/v1/files/download` 未実装のためAPI実装後に確認 |
| 4-8-37 | ファイルダウンロードに失敗した場合にエラーメッセージが表示されること | `POST /api/v1/files/download` 未実装のためAPI実装後に確認 |

## data-testid 設計

| コンポーネント | 要素 | data-testid |
|-------------|------|------------|
| FormatManagement.tsx | 詳細検索ボタン | `format-search-button` |
| FormatManagement.tsx | 新規フォーマット（フォルダ）ボタン | `new-format-folder-button` |
| FormatManagement.tsx | 新規サブフォルダボタン | `new-folder-button` |
| FormatManagement.tsx | 新規ファイルボタン | `new-file-button` |
| FormatManagement.tsx | アップロードボタン | `upload-button` |
| FormatManagement.tsx | フォーマット一覧アイテム | `format-item-{id}` |
| FormatSearchModal.tsx | 条件追加ボタン | `search-criteria-add-button` |
| FormatSearchModal.tsx | リセットボタン | `search-criteria-reset-button` |
| FormatSearchModal.tsx | 検索実行ボタン | `search-execute-button` |
| FormatSearchModal.tsx | 検索条件行 | `search-criteria-row-{index}` |
| CreateFormatFolderModal.tsx | フォルダ名Input | `folder-name-input` |
| CreateFormatFolderModal.tsx | 作成ボタン | `create-folder-submit-button` |
| CreateFormatFolderModal.tsx | キャンセルボタン | `create-folder-cancel-button` |
| CreateFormatFileModal.tsx | ファイル名Input | `file-name-input` |
| CreateFormatFileModal.tsx | 作成ボタン | `create-file-submit-button` |
| CreateFormatFileModal.tsx | キャンセルボタン | `create-file-cancel-button` |
| FormatUploadDialog.tsx | アップロードモードセグメント | `upload-mode-segment` |
| FormatUploadDialog.tsx | アップロード開始ボタン | `upload-start-button` |
| FormatUploadDialog.tsx | キャンセルボタン | `upload-dialog-cancel-button` |
| FormatUploadDialog.tsx | 進捗表示エリア | `upload-progress` |
| FormatFileListTable.tsx | 編集ボタン | `file-edit-button` |
| FormatFileListTable.tsx | ダウンロードボタン | `file-download-button` |
| FormatFileListTable.tsx | 削除ボタン | `file-delete-button` |

## テストデータ設計

### フォーマット管理テスト用データ（DBに事前準備が必要なもの）

| データ種別 | 用途 | 備考 |
|-----------|------|------|
| XMLタイプのフォーマット（format_typeがxml/material/condition/result） | 4-8-15、4-8-19 | フォーマット一覧に存在すること |
| MAIMLタイプのフォーマット（format_typeがmaiml） | 4-8-16 | フォーマット一覧に存在すること |
| 削除用テストフォーマット | 4-8-3 | テスト後にAfterフックで確認済みの場合はスキップ |

### S3/Swiftに事前準備が必要なもの

| データ種別 | 用途 | 備考 |
|-----------|------|------|
| MAIMLファイル（.maiml） | 4-8-32、4-8-34 | フォーマットフォルダ内に存在すること |
| XMLファイル（.xml） | 4-8-33 | フォーマットフォルダ内に存在すること |
| その他拡張子ファイル（例: .txt） | 4-8-35 | フォーマットフォルダ内に存在すること |
| 削除テスト用ファイル | 4-8-38〜4-8-40 | フォーマットフォルダ内に存在すること |

## 前提条件

- 実験管理者ロールでログイン済み
- フォーマット管理画面（タブ）が表示されている
- フォーマット一覧にテスト用フォーマットが1件以上存在すること
  - XMLタイプのフォーマットが1件以上存在すること（4-8-15、4-8-19）
  - MAIMLタイプのフォーマットが1件以上存在すること（4-8-16）
- ファイル操作シナリオ（4-8-32〜4-8-40）: 選択中のフォーマット内にテスト用ファイルが存在すること

## 注意事項

- 4-8-4〜4-8-7（詳細検索）: 検索実行APIは🔴未実装のため、UIモーダル動作のみを確認する
- 4-8-8〜4-8-12（新規フォルダ作成）: フォルダ作成APIは🔴未実装のため、バリデーション・モーダル動作のみを確認する
- 4-8-13〜4-8-20（新規XMLファイル作成）: ファイル作成APIは🔴未実装のため、バリデーション・モーダル動作のみを確認する
- 4-8-23〜4-8-31（アップロード）: `POST /api/v1/formats/upload` は🔴未実装のため、フロントエンドのモック動作のみ確認する
- 4-8-32〜4-8-33（編集・エディタ起動）: エディタが起動することのみ確認する
- 4-8-34（編集保存）: `PUT /api/v1/formats/:formatId/files/:fileId` は🔴未実装のため、featureのみ作成し手動テスト扱い
- 4-8-36〜4-8-37（ダウンロード）: `POST /api/v1/files/download` は🔴未実装のため、featureのみ作成し手動テスト扱い
- 4-8-39（削除）: ファイル削除APIは🔴未実装のため、削除確認ダイアログの表示・UIの動作のみ確認する

## 承認記録
- **計画書提示日時**: 2026-03-13 19:40
- **承認日時**: -
- **承認者コメント**: -
