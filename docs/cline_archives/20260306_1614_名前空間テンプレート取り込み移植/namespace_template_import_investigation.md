# 「名前空間テンプレート取り込み」機能 調査レポート

調査日: 2026-03-06

---

## 1. ボタンの場所（ソースコード）

| 役割 | ファイルパス |
|------|------------|
| ボタンUI・ダイアログ表示・インポートハンドラー | `frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx` |
| 機能ロジック（カスタムフック） | `frontend/src/components/PetriNetEditorV2/hooks/useNamespaceOperations.js` |
| APIサービス | `frontend/src/services/apiService.js` |

---

## 2. ボタンの種類（2つ存在する）

TemplateEditorDialog内に、同じダイアログを開く「名前空間テンプレート取り込み」ボタンが **2箇所** あります。

| 場所 | モード設定 | 取り込み対象 |
|------|-----------|------------|
| Properties セクション | `namespaceImportMode = 'replace_all_properties'` | テンプレートの Properties を全置き換え |
| Contents セクション（ResultTemplate のみ） | `namespaceImportMode = 'replace_all_contents'` | テンプレートの Contents を全置き換え |

どちらのボタンも `handleOpenNamespaceDialog()` を呼び出します。

---

## 3. ボタン押下後の処理フロー

```
ボタン押下
  │
  ├─ [Step 0] handleOpenNamespaceDialog()
  │     └─ useNamespaceOperations.loadS3FolderStructure()
  │           └─ API: GET /api/s3/files?organizationId=xxx
  │                 └─ フォルダ構造をツリー形式に整形（階層・XMLファイル数を集計）
  │           └─ showNamespaceDialog = true → 取り込みダイアログを表示
  │
  ├─ [Step 1] フォルダ選択 (handleSelectNamespaceFolder)
  │     └─ useNamespaceOperations.loadNamespaceFilesFromS3Folder(folderPath)
  │           └─ API: GET /api/s3/files?organizationId=xxx（再取得）
  │                 └─ フォルダ配下の .xml ファイルのみ絞り込み
  │           └─ namespaceFiles に格納 → ファイル一覧を表示
  │
  ├─ [Step 2] ファイル選択 (handleSelectNamespaceFile)
  │     └─ useNamespaceOperations.analyzeNamespaceFile(fileKey)
  │           ├─ キャッシュヒット時: APIコールなし、キャッシュから返す
  │           └─ キャッシュなし時:
  │                 └─ API: GET /api/s3/file-content?key=<fileKey>
  │                       └─ parseNamespaceXML(xmlContent) でXML解析
  │                             ┌─ DOMParser でXMLをパース
  │                             ├─ xmlns 属性から namespaceURI を取得
  │                             ├─ 全 property 要素を再帰的に収集・重複排除・最適選択
  │                             └─ 全 content 要素を再帰的に収集・重複排除・最適選択
  │                 └─ キャッシュに保存（2回目以降はAPIコールなし）
  │           └─ namespaceData にパース結果を格納 → プレビュー表示
  │
  └─ [Step 3] 「取り込み」ボタン押下 (handleImportNamespace)
        ├─ [Properties モードの場合]
        │     └─ setProperties() で全 Properties を一括置き換え
        │           ※各プロパティに namespaceOrigin: true と
        │             namespaceSource（URI・日時等）を付与
        │
        └─ [Contents モードの場合]
              └─ setContents() で全 Contents を一括置き換え
                    ※各 Content に namespaceOrigin: true と
                      namespaceSource（URI・日時等）を付与

        → ダイアログを閉じる
        → forceRenderKey を更新して強制再レンダリング
        → アラートで取り込み件数を通知（例: 「5件取り込みました」）
```

---

## 4. XML解析の詳細仕様

### 4-1. parseNamespaceXML（ファイル全体のパース）

`useNamespaceOperations.js` 内の `parseNamespaceXML()` が担当。

| 処理 | 内容 |
|------|------|
| XMLパース | ブラウザ標準の `DOMParser` を使用 |
| namespaceURI取得 | ルート要素の `xmlns` 属性値を取得 |
| property 要素収集 | `collectAllElements(rootElement, 'property')` で全階層を再帰的に収集 |
| content 要素収集 | `collectAllElements(rootElement, 'content')` で全階層を再帰的に収集 |
| 重複キー解消 | `selectBestElement()` で同じ `key` 属性を持つ要素が複数あった場合、「階層スコア（子要素が多い・深い方）」が高いものを優先採用 |

### 4-2. parseUnifiedElement（要素単体のパース）

`useNamespaceOperations.js` 内の `parseUnifiedElement()` が担当。

| 処理 | 内容 |
|------|------|
| 属性抽出 | XML要素の全属性を `attributes` オブジェクトに格納（`xsi:type`、`units`、`key` 等） |
| 子要素の分類 | 親の `xsi:type` が `propertyListType` の場合、`property`/`content` タグは **children（真の子要素）** として扱い、それ以外は **elements（テキスト値を持つ要素）** として扱う |
| 再帰処理 | `children` を再帰的に `parseUnifiedElement()` で解析（深いネストに対応） |

### 4-3. 取り込み後のデータ構造

```javascript
{
  key: "propertyKey",
  tagName: "property",
  attributes: {
    "xsi:type": "stringType",
    "units": "nm",
    // ...その他XML属性
  },
  elements: {
    "value": "...",
    "description": "..."
  },
  children: [
    // xsi:type = propertyListType の場合のみ存在（再帰的に同構造）
  ],
  namespaceOrigin: true,          // 名前空間由来フラグ
  namespaceSource: {
    uri: "名前空間URI（xmlns属性値）",
    hierarchyPath: [ "path", "parts", "..." ],
    importedAt: "ISO8601日時"
  }
}
```

---

## 5. 使用しているAPIエンドポイント

### ① GET /api/s3/files — ファイル一覧取得

**呼び出し関数:** `fetchFileList()` in `apiService.js`

| 項目 | 内容 |
|------|------|
| メソッド | GET |
| エンドポイント | `/api/s3/files` |
| クエリパラメータ | `?organizationId=<組織ID>`（マルチテナント対応、`localStorage` から取得） |
| 用途 | S3バケット内の全ファイル一覧を取得。フロント側でフォルダ構造の構築・XMLファイルのフィルタリングを実施 |
| 認証 | Bearer Token（`localStorage` / `sessionStorage` から取得）+ Cookie |
| レスポンス形式 | `{ success: true, files: [...] }` または配列形式（両対応） |
| タイムアウト | 30秒（DEFAULT_TIMEOUT） |
| リトライ | 1回 |

**呼び出しタイミング（2回）:**
1. フォルダツリーを構築するとき（`loadS3FolderStructure()`）
2. フォルダを選択してXMLファイル一覧を絞り込むとき（`loadNamespaceFilesFromS3Folder()`）

---

### ② GET /api/s3/file-content — ファイル内容取得

**呼び出し関数:** `fetchFileContent(fileKey)` in `apiService.js`

| 項目 | 内容 |
|------|------|
| メソッド | GET |
| エンドポイント | `/api/s3/file-content` |
| クエリパラメータ | `?key=<URLエンコードされたS3ファイルキー>` |
| 用途 | 選択されたXMLファイルの内容を取得。その後フロント側でDOMParserによりXML解析 |
| 認証 | ※`ApiClient` クラスを使わず直接 `fetch` を使用（Bearer トークンヘッダーなし） |
| レスポンス形式 | プレーンテキスト or `{ success: true, data: { content: "..." } }` のJSON（両対応） |
| タイムアウト | ブラウザデフォルト（明示的な指定なし） |
| キャッシュ | `namespaceCache` に保存。同じ `fileKey` は2回目以降APIコールなし |

**呼び出しタイミング:**
- ファイルを選択したとき（`analyzeNamespaceFile()` 内）
- キャッシュに存在しない場合のみ呼び出す

---

## 6. API呼び出し全体の流れ（まとめ）

```
① ボタン押下
   └→ GET /api/s3/files?organizationId=xxx
         └─ フォルダ構造を構築（フロントエンド処理）

② フォルダ選択
   └→ GET /api/s3/files?organizationId=xxx
         └─ フォルダ内XMLファイルのみ絞り込み（フロントエンド処理）

③ ファイル選択
   └→ GET /api/s3/file-content?key=<fileKey>  ※キャッシュなし時のみ
         └─ DOMParserでXML解析（フロントエンド処理）
         └─ キャッシュに保存（2回目以降はAPIコールなし）

④ 「取り込み」ボタン押下
   └─ APIコールなし（フロントエンドのState更新のみ）
```

---

## 7. 関連ファイル一覧

| ファイル | 役割 |
|---------|------|
| `frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx` | ボタンUI・取り込みダイアログUI・`handleOpenNamespaceDialog`・`handleImportNamespace` 等のハンドラー |
| `frontend/src/components/PetriNetEditorV2/hooks/useNamespaceOperations.js` | S3フォルダ構造取得・XML解析（`parseNamespaceXML`、`parseUnifiedElement`）・キャッシュ管理 |
| `frontend/src/services/apiService.js` | `fetchFileList()`・`fetchFileContent()` の実装。`ApiClient` クラスによるHTTPリクエスト管理・統計記録 |
