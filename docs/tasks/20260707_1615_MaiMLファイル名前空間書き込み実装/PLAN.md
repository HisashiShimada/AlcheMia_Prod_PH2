# タスク計画書: MaiMLファイル名前空間書き込み実装

## メタデータ
- **作成日時**: 2026-07-07 16:15
- **タスクID**: maiml-namespace-writer
- **優先度**: 中
- **推定工数**: 1.5時間

## タスク概要

`namespace` テーブルに登録されている名前空間（prefix / uri の組み合わせ）を読み取り、
MaiML ファイルの `<maiml>` タグに `xmlns:prefix="uri"` 属性として書き込む機能を実装する。

## 目的と期待される成果

### 目的
- MaiML ファイルに組織固有の名前空間宣言を自動的に反映する
- 実験データ書き込み時（承認完了・チェックアウト時）に名前空間が正しく宣言された状態でファイルが保存される

### 期待される成果
- [ ] `namespace` テーブルから組織の名前空間一覧を取得できる
- [ ] `<maiml>` タグの `xmlns:` 宣言を DB の内容で完全上書きできる
- [ ] `writeDataAndEventLog()` 実行時に名前空間が書き込まれる
- [ ] `writeEventLogOnly()` 実行時にも名前空間が書き込まれる

## 実装ステップ

### Phase 1: Repository層
- [ ] `namespaceTermRepository.ts` に `findNamespacesByOrganization()` 関数を追加
  - `SELECT prefix, uri FROM namespace WHERE organization_id = $1 ORDER BY prefix ASC`
  - 戻り値: `Array<{ prefix: string; uri: string }>`

### Phase 2: Utility層
- [ ] `maimlDataWriter.ts` に `injectNamespaceDeclarations()` 関数を追記
  - `<maiml` タグを正規表現で検出
  - 既存の `xmlns:` 属性を除去（完全上書き）
  - DBから取得した名前空間を `xmlns:prefix="uri"` 形式で注入
  - 名前空間が空の場合はそのまま返す（ノーオペレーション）

### Phase 3: Service層
- [ ] `maimlWriterService.ts` の `writeDataAndEventLog()` に名前空間注入を追加
  - `updateDocumentUuidAndParent()` の直前に挿入
  - `findNamespacesByOrganization()` → `injectNamespaceDeclarations()` を呼び出す
- [ ] `maimlWriterService.ts` の `writeEventLogOnly()` に同様の処理を追加

### Phase 4: バックエンド — 手動書き込みAPIエンドポイント追加

- [ ] `backend/src/controllers/maimlController.ts` に `injectNamespaces` ハンドラを追加
  - リクエスト: `POST /api/v1/maiml/inject-namespaces` に `{ projectId, projectName }` を受け取る
  - 処理フロー:
    1. `resolveMaimlFilePath(organizationId, projectId, projectName)` でパス解決
    2. `storageService.fileExists()` で存在確認
    3. `storageService.downloadFile()` でMAIML取得
    4. `findNamespacesByOrganization(organizationId)` でDB取得
    5. `injectNamespaceDeclarations(maimlContent, namespaces)` で名前空間を注入
    6. `updateDocumentUuidAndParent(updatedMaiml)` でUUID更新
    7. アーカイブ保存（`maimlWriterService.ts` のパターンを踏襲）
    8. `storageService.uploadFile()` で上書き保存
    9. `res.json({ updatedXml: updatedMaiml })` でレスポンス返却
- [ ] `backend/src/routes/maimlRoutes.ts` に `POST /api/v1/maiml/inject-namespaces` を追加
  - `authMiddleware` 適用必須
  - `organizationId` はJWT（`req.user`）から取得

### Phase 5: フロントエンド — APIサービス関数 + コンポーネント修正

- [ ] `frontend/src/services/maimlService.ts` に `injectNamespacesToMaiml()` 関数追加
  - 引数: `{ projectId: string, projectName: string }`
  - 戻り値: `Promise<{ updatedXml: string }>`
  - エンドポイント: `POST /api/v1/maiml/inject-namespaces`

- [ ] `frontend/src/components/editorv2/XMLViewer.tsx` を修正
  - Props: `onInjectNamespaces?: () => Promise<void>` を追加
  - ツールバーに「🔧 名前空間を書き込む」ボタンを追加
  - `onInjectNamespaces` が未定義の場合はボタン非表示
  - ボタン押下中はローディング状態（`loading` state）で非活性化

- [ ] `frontend/src/components/editorv2/XMLViewerWrapper.tsx` を修正
  - Props: `projectId?: string`, `projectName?: string` を追加（`organizationId`はJWT不要、APIが `req.user` から取得）
  - `handleInjectNamespaces()` を実装:
    - `injectNamespacesToMaiml({ projectId, projectName })` を呼び出す
    - 成功時: `setXmlContent(updatedXml)` で即時表示更新 + 成功メッセージ表示
    - 失敗時: エラーメッセージ表示
  - `XMLViewer` に `onInjectNamespaces={handleInjectNamespaces}` を渡す

- [ ] `frontend/src/components/editorv2/PetriNetEditorInner.tsx` を修正
  - `XMLViewerWrapper` に `projectId`, `projectName` を渡す（`MaimlEditorParams` から取得）

### Phase 6: i18n対応

- [ ] `frontend/src/locales/ja.json` にキー追加
  - `xmlViewer.injectNamespacesButton`: `"名前空間を書き込む"`
  - `xmlViewer.injectNamespacesTitle`: `"名前空間管理のPrefix/URIをMAIMLファイルに書き込みます"`
  - `xmlViewer.injectNamespacesSuccess`: `"名前空間をMAIMLファイルに書き込みました"`
  - `xmlViewer.injectNamespacesFailed`: `"名前空間の書き込みに失敗しました"`

- [ ] `frontend/src/locales/en.json` にキー追加
  - `xmlViewer.injectNamespacesButton`: `"Write Namespaces"`
  - `xmlViewer.injectNamespacesTitle`: `"Write registered namespace prefixes/URIs into the MAIML file"`
  - `xmlViewer.injectNamespacesSuccess`: `"Namespaces successfully written to MAIML file"`
  - `xmlViewer.injectNamespacesFailed`: `"Failed to write namespaces"`

## 変更ファイル

| ファイル | 変更種別 | 変更内容 |
|---|---|---|
| `backend/src/repositories/namespaceTermRepository.ts` | 追記 | `findNamespacesByOrganization()` 関数追加 |
| `backend/src/utils/maimlDataWriter.ts` | 追記 | `injectNamespaceDeclarations()` 関数追加 |
| `backend/src/services/maimlWriterService.ts` | 修正 | 両メソッドに名前空間注入処理を追加 |
| `backend/src/controllers/maimlController.ts` | 追記 | `injectNamespaces` ハンドラ追加 |
| `backend/src/routes/maimlRoutes.ts` | 追記 | `POST /api/v1/maiml/inject-namespaces` エンドポイント追加 |
| `frontend/src/services/maimlService.ts` | 追記 | `injectNamespacesToMaiml()` 関数追加 |
| `frontend/src/components/editorv2/XMLViewer.tsx` | 修正 | ツールバーに「名前空間を書き込む」ボタン追加 |
| `frontend/src/components/editorv2/XMLViewerWrapper.tsx` | 修正 | Props追加、API呼び出し処理追加 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | 修正 | `XMLViewerWrapper` に `projectId/projectName` を渡す |
| `frontend/src/locales/ja.json` | 追記 | i18nキー追加 |
| `frontend/src/locales/en.json` | 追記 | i18nキー追加 |

## 技術的詳細

### 付録 B 準拠：MaiML ファイル記述例（名前空間仕様書より）

仕様書 付録 B に示された記述例を基準とする。

```xml
<maiml version="1.0"
       xmlns="http://www.maiml.org/schemas"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
       xmlns:CorpA="https://www.corpa.co.jp/"
       xmlns:LabA="https://www.corpa.co.jp/rd-lab/"
       xmlns:MyWord="https://orcid.org/0000-0002-2494-9603"
       xsi:type="maimlRootType">
```

上記の構造において：
- `xmlns=`（デフォルト名前空間）: MaiML 標準。**保持必須**
- `xmlns:xsi=`, `xmlns:xenc=` 等の標準 prefix: XML 標準仕様。**保持必須**
- `xsi:type=` 等の xsi 属性: XML Schema 属性。**保持必須**
- `xmlns:CorpA=`, `xmlns:LabA=` 等のカスタム prefix: **DBの内容で上書き**（書き込み対象）

### injectNamespaceDeclarations() の実装方針

```
入力: maimlContent（XML文字列）, namespaces（{prefix, uri}[]）

処理:
  1. <maiml[^>]*?> を正規表現でキャプチャ（複数行対応のため [\s\S] を使用）
  2. 既存の xmlns:prefix 属性を prefix ごとに解析
  3. 「保護する標準 prefix」リストを定義:
     PROTECTED_PREFIXES = ['xsi', 'xenc', 'xs', 'xsd', 'xlink']
     ※ xmlns=（prefix なし）も保持対象
  4. 保護対象 prefix の xmlns: 属性はそのまま残す
  5. 保護対象以外の xmlns:prefix を除去（既存カスタム名前空間を削除）
  6. DBの名前空間（namespaces配列）を xmlns:prefix="uri" 形式で追加
  7. 置換後の <maiml ...> タグで元のタグを置換

出力: 更新後の XML 文字列
```

### maimlWriterService.ts の修正位置

`writeDataAndEventLog()` と `writeEventLogOnly()` の共通フローにおいて、
`updateDocumentUuidAndParent()` の**直前**に挿入する：

```
// 既存
updatedMaiml = replaceDataAndEventLogInMaiml(...) or replaceEventLogInMaiml(...)

// ★ 追加: 名前空間を <maiml> タグに注入
const namespaces = await findNamespacesByOrganization(organizationId);
updatedMaiml = injectNamespaceDeclarations(updatedMaiml, namespaces);

// 既存
updatedMaiml = updateDocumentUuidAndParent(updatedMaiml);
```

## リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| `namespace` テーブルが空の場合 | 低 | 名前空間なしでそのまま処理継続（ノーオペレーション） |
| `<maiml>` タグが複数行にまたがる場合 | 中 | 正規表現に `[\s\S]` を使用して複数行対応 |
| `xmlns=`（デフォルト名前空間）が削除される | 高 | prefix なしの `xmlns=` は除去対象から除外し必ず保持する |
| `xmlns:xsi=`、`xmlns:xenc=` 等の標準宣言が削除される | 高 | `PROTECTED_PREFIXES = ['xsi', 'xenc', 'xs', 'xsd', 'xlink']` として保護リストで除去対象から除外する（仕様書 付録 B 準拠） |
| `xsi:type="maimlRootType"` 等の xsi 属性が消える | 高 | `xmlns:` でない通常属性（`xsi:type` 等）は処理対象外のため影響なし |
| MAIMLファイルが存在しない場合 | 低 | `storageService.fileExists()` チェック後にスキップまたはエラー返却 |

## 承認記録
- **計画書提示日時**: 2026-07-07 16:15
- **承認日時**: 
- **承認者コメント**: 
