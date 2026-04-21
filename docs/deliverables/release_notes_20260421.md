# リリースノート

**リリース日**: 2026-04-21  
**対象ブランチ**: main  
**前回リリースコミット**: `5e4f610dca409634e0d64aea766b1881385aa38c`  
**今回リリースコミット**: `c4808e22bf56b94277cb494b7f153d3997770ef8`

---

## 新機能・改善

### 1. フォルダ削除機能追加

- **プロジェクト管理画面**: ファイル一覧テーブル（`FileListTable`）でフォルダ行に削除ボタンを追加。確認ダイアログ表示後、フォルダ配下のファイルを再帰的に削除できるようになった。
- **フォーマット管理画面**: フォーマットファイル一覧テーブル（`FormatFileListTable`）でも同様にフォルダ削除が可能になった。
- **バックエンドAPI**: `DELETE /api/v1/files/delete-folder` エンドポイントを新規追加。`folderPath` を受け取り、ストレージ上のフォルダを再帰削除する。
- **「↑ 戻る」行への削除ボタン非表示**: 疑似フォルダエントリには削除ボタンを表示しない制御を実装済み。

---

## バグ修正

### 1. カスタムプロパティ削除バグ修正（複数）

実験データ記録画面（`DataRecordDialog.tsx`）のカスタムプロパティリストに存在した以下の複数バグを修正した。

- **バグ①: 全削除しても再表示するとエントリが復活する** — クリーンアップ処理が `templateCustomProps.length > 0` 条件の内側にあったため、全削除時にスキップされていた。条件の外へ移動し常にフィルタ除去が実行されるよう修正。
- **バグ②: property 削除後に再表示すると value だけ null になる** — 値更新ループがカスタムプロパティエントリも対象としていたため、削除済みエントリの value が null に書き換えられていた。`isCustomProperty === true` のエントリをスキップするよう修正。
- **バグ③: content を他のカスタムプロパティと同時に削除すると消えない** — バグ①と同根。`baseData.contents` のクリーンアップも `filter(!isCustomProperty)` 方式に変更し非カスタム分を保持するよう修正。
- **バグ④: Property なしテンプレートにカスタムプロパティが出力されない** — クリーンアップ＆再追記処理が `baseData.properties` 存在チェックの内側にあったため、Property を持たないテンプレートでは処理全体がスキップされていた。条件を分離し Property の有無に関わらず実行されるよう修正。
- **バグ⑤: Property なしテンプレートでトップレベル Contents の値更新がスキップされる** — Contents 更新処理を `if (baseData.properties...)` ブロック外へ移動し、Property / Contents / Insertion を独立したブロックに分離。

### 2. MAIMLファイルキー読み込みバグ修正（Issue #5, #12, #13）

UUID から MAIML ファイルを特定する処理（`sourceS3Key` 生成）が、プロジェクト名と MAIML ファイル名が異なる場合に誤ったパスを参照していた問題を修正した。バックエンドのプロジェクト一覧 API に実際の `maimlFileKey` を追加し、フロントエンドがそれを優先使用するよう変更。

### 3. Creator / Vendor ID 自動採番修正

`MultiObjectEditor.tsx` の「空のXxxを追加」ボタンで採番される ID が、削除操作後に重複する問題を修正した。`objects.length + 1` による採番から「既存 ID の末尾数値の最大値 + 1」方式に変更し、削除後も ID が重複しないようにした。

### 4. 共通テンプレートチェックボックス不具合修正

テンプレート管理ビューで共通テンプレートを作成し、PlaceRef で 2 件のノードを紐づけて保存した際に片方のノードの PropertyPanel で「共通テンプレート」チェックボックスが ON にならない不具合を修正した。`setNodes` コールバック内で `pushState` を呼び出していたことで履歴の巻き戻しが発生していた問題を解消。

### 5. フォーマット一覧の空表示修正

`authService.ts` の `processRefreshToken` で `departmentCd` が `generateTokenPair` に渡されていなかったため、トークンリフレッシュ後のリクエストで `req.user.departmentCd` が `undefined` になり、フォーマット管理タブのフォーマット一覧が空になる問題を修正した。

### 6. PlaceRef ノードフィルタ修正 (Issue #9)

PlaceRef ノードのフィルタリング処理に関する不具合を修正した。

### 7. Issue #20、#22 対応

その他 GitHub Issues #20、#22 に対応した改善を実施した。

---

## インフラ・デプロイ対応

### 1. デプロイ用差分抽出スクリプト追加

デプロイ時に差分を抽出するためのスクリプトを追加した（`feature/github-issue27`）。

---

## DB マイグレーション

なし

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/controllers/fileAccessController.ts` | `deleteFolder` 関数を追加 |
| `backend/src/routes/fileAccessRoutes.ts` | `DELETE /api/v1/files/delete-folder` ルートを追加 |
| `backend/src/services/projectService.ts` | プロジェクト一覧クエリに `maiml_file_key` を追加 |
| `backend/src/services/authService.ts` | `processRefreshToken` の `generateTokenPair` 呼び出しに `departmentCd` を追加 |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | カスタムプロパティ削除バグ（①〜⑤）を修正 |
| `frontend/src/components/project/FileListTable.tsx` | フォルダ行に削除ボタンを追加 |
| `frontend/src/components/project/FormatFileListTable.tsx` | フォルダ行に削除ボタンを追加 |
| `frontend/src/components/project/ProjectManagement.tsx` | フォルダ削除ハンドラ追加・`sourceS3Key` 生成を `maimlFileKey` 優先に修正 |
| `frontend/src/components/project/FormatManagement.tsx` | フォルダ削除ハンドラ追加 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | 共通テンプレートチェックボックス不具合修正（`pushState` 移動、`setSelectedNode` ID解決修正） |
| `frontend/src/components/editorv2/components/MultiObjectEditor.tsx` | Creator / Vendor ID 自動採番ロジックを修正 |
| `frontend/src/services/fileAccessService.ts` | `deleteFolderByPath` 関数を追加（新規） |
| `frontend/src/types/project.ts` | `Project` 型に `maimlFileKey` を追加 |
