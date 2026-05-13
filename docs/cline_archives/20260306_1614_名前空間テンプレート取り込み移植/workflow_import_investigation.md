# 「ワークフロー取込」機能 調査結果

**調査日**: 2026/03/04  
**対象機能**: ワークフロー取込（他MaiMLファイルをペトリネットエディタに統合する機能）

---

## 1. 関連するソースコードのファイル一覧

### フロントエンド

| ファイル | 役割 |
|---|---|
| `frontend/src/components/PetriNetEditorV2/components/EditorToolbar.jsx` | ワークフロー追加ボタンのUI（`onAddWorkflow` prop受け取り） |
| `frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx` | メインコントローラー。ボタン押下 → ダイアログ表示 → ファイル選択 → ワークフロー追加実行を統括 |
| `frontend/src/components/PetriNetEditorV2/components/WorkflowSelectorDialog.jsx` | S3ファイル選択ダイアログ（フォルダツリー表示・検索・選択UI） |
| `frontend/src/components/PetriNetEditorV2/hooks/useWorkflow.js` | ワークフロー追加のコアロジック（MaiML変換・座標計算・ID重複解決・テンプレート統合） |
| `frontend/src/components/PetriNetEditorV2/utils/converters/maimlToReactFlow.js` | MaiML XML → React Flow形式への変換ユーティリティ |
| `frontend/src/components/PetriNetViewer/utils/petriNetExtractor.js` | MaiMLパース・ペトリネット構造抽出（既存ビューアから再利用） |
| `frontend/src/components/PetriNetViewer/utils/reactFlowConverter.js` | ペトリネット構造 → React Flow形式変換（既存ビューアから再利用） |

### バックエンド

| ファイル | 役割 |
|---|---|
| `backend/routes/s3/index.js` | S3関連全ルートの統合ルーター（認証・テナント分離ミドルウェア適用） |
| `backend/routes/s3/listingRoutes.js` | `GET /api/s3/files` ― S3ファイル一覧取得 |
| `backend/routes/s3/retrievalRoutes.js` | `GET /api/s3/file-content` ― ファイル内容取得 |
| `backend/services/maimlParser.js` | MaiMLパースサービス（バックエンド側・ワークフロー取込では直接使用せず） |

---

## 2. フロントエンドの設計

### 全体フロー

```
[ワークフローボタン押下]
    ↓
EditorToolbar: onAddWorkflow() 呼び出し
    ↓
PetriNetEditorInner: handleWorkflowModeToggle()
    → selectedTool = 'workflow' にセット（モード有効化）
    → ボタン表示が "ワークフロー (有効)" に変化
    ↓
[ユーザーがキャンバスをクリック]
    ↓
handlePaneClick() → selectedTool === 'workflow' を検出
    → クリック座標(clickPosition)を screenToFlowPosition で変換・保存
    → openWorkflowDialogInternal() 呼び出し
        │
        ├─ GET /api/s3/files?organizationId=... でS3ファイル一覧取得
        ├─ .maimlファイルのみフィルタリング
        └─ WorkflowSelectorDialog を開く
    ↓
[WorkflowSelectorDialog でファイル選択・確定]
    ↓
handleWorkflowFileSelect(file)
    → GET /api/s3/file-content?key=... でMaiMLコンテンツ取得
    → addWorkflow(clickPosition, maimlContent, fileName) 呼び出し（useWorkflowフック）
    ↓
[addWorkflow 内部処理]
    1. maimlToReactFlow(maimlContent) でReact Flow形式に変換
    2. calculateNodeBounds() でノード群の中心座標計算
    3. クリック座標 - 中心座標 = オフセット値算出
    4. 全ノードにオフセットを加算（クリック位置に配置）
    5. resolveIdConflicts() で既存ノードとのID重複を解決
       └─ 重複IDには "_added" サフィックスを付与（さらに重複なら "_added_N"）
    6. extractTemplatesFromNodes() でテンプレート情報抽出
    7. mergeTemplates() で既存テンプレートと統合
    8. setNodes / setEdges で React Flow 状態更新
    9. addToHistory() でUndo/Redo履歴追加
    ↓
完了 → アラートで「N ノード, M エッジ追加」メッセージ表示
    → selectedTool = 'select' に戻す（モード解除）
```

### コンポーネント・フック役割分担

| 処理 | 担当 |
|---|---|
| ボタンUIとモード切替 | `EditorToolbar.jsx` + `PetriNetEditorInner.jsx` |
| S3ファイル一覧取得 | `PetriNetEditorInner.jsx` の `openWorkflowDialogInternal()` |
| ファイル選択ダイアログ表示 | `WorkflowSelectorDialog.jsx` |
| MaiMLファイル内容取得 | `PetriNetEditorInner.jsx` の `handleWorkflowFileSelect()` |
| MaiML→React Flow変換 | `maimlToReactFlow.js` → `petriNetExtractor.js` + `reactFlowConverter.js` |
| 座標オフセット計算 | `useWorkflow.js` の `calculateNodeBounds()` |
| ID重複解決 | `useWorkflow.js` の `resolveIdConflicts()` |
| テンプレート統合 | `useWorkflow.js` の `extractTemplatesFromNodes()` + `mergeTemplates()` |
| React Flow状態更新 | `useWorkflow.js` の `setNodes / setEdges` |

### WorkflowSelectorDialog の詳細設計

- **レイアウト**: フォルダツリー（左40%）とファイル一覧（右60%）の2カラム構成
- **フォルダツリー構築**: `buildFolderTree()` でS3キーのパス文字列からフォルダ階層を動的構築
- **フィルタリング**: テキスト検索（ファイル名/S3キー）またはフォルダ選択でファイル絞り込み
- **フォルダ展開**: クリックで展開/折りたたみ（`Collapse` コンポーネント使用）
- **選択ファイル表示**: 選択中ファイルの名前・パス・サイズをフォーム下部に表示
- **確定処理**: 「ワークフロー追加」ボタン → `onSelect(file)` → `handleWorkflowFileSelect` 呼び出し
- **ローディング状態**: 追加処理中はボタンを無効化してスピナーを表示

### MaiML変換処理 (maimlToReactFlow.js) の詳細

1. `extractPetriNetStructure(maimlData)` でペトリネット構造（places/transitions/arcs）をパース
2. `buildTemplateMap(maimlData)` でテンプレートマップ（placeId → テンプレート情報）を構築
3. `convertToReactFlowFormat(petriNetData, templateMap)` でReact Flow形式（nodes/edges）に変換
4. 各ノードをEditorV2用ノードタイプにマッピング:
   - `materialTemplate` → `materialTemplate`
   - `conditionTemplate` → `conditionTemplate`
   - `resultTemplate` → `resultTemplate`
   - `transition` → `transition`

### ID重複解決アルゴリズム (resolveIdConflicts)

```
入力:
  newNodes, newEdges  : 取り込むノード/エッジ
  existingNodes, existingEdges : 既存のノード/エッジ

処理:
  1. 既存のノードID + エッジIDのSetを作成 (existingIds)
  2. 新規ノードをループ:
     - IDが existingIds に存在 → "{ID}_added" を生成（さらに重複なら "_added_1", "_added_2" ...）
     - 存在しない → そのまま使用
     - idMapping[oldId] = newId を記録
  3. 新規エッジをループ:
     - ノードと同様にID解決
  4. IDマッピング適用:
     - node.id, edge.source, edge.target を idMapping に従って更新
     - node.data.originalId に元のIDを保存

出力: mappedNodes, mappedEdges, idMapping
```

---

## 3. 使用するAPI

| # | エンドポイント | メソッド | 用途 | 呼び出し元（フロントエンド） |
|---|---|---|---|---|
| 1 | `/api/s3/files` | GET | S3上のMaiMLファイル一覧取得 | `openWorkflowDialogInternal()` |
| 2 | `/api/s3/file-content` | GET | 選択したMaiMLファイルのXMLコンテンツ取得 | `handleWorkflowFileSelect()` |

### API①: GET /api/s3/files

**クエリパラメータ:**
| パラメータ | 型 | 説明 |
|---|---|---|
| `organizationId` | string | 組織ID（省略時はユーザーのデフォルト組織） |

**レスポンス:**
```json
{
  "success": true,
  "files": [
    {
      "key": "{orgPrefix}/folder/sample.maiml",
      "name": "sample.maiml",
      "size": 12345,
      "lastModified": "2025-01-01T00:00:00.000Z",
      "isFolder": false,
      "organizationId": "org-001",
      "isCheckedOut": false,
      "checkedOutBy": null,
      "workId": null
    }
  ],
  "totalCount": 10,
  "cached": false
}
```

**フロントエンドでのフィルタリング:**
```javascript
// .maimlファイルのみ抽出
const maimlFiles = (result.files || []).filter(file => 
  file.key && file.key.endsWith('.maiml')
).map(file => ({
  ...file,
  name: file.name || file.key.split('/').pop(),
}));
```

### API②: GET /api/s3/file-content

**クエリパラメータ:**
| パラメータ | 型 | 説明 |
|---|---|---|
| `key` | string | S3オブジェクトキー（例: `{orgPrefix}/folder/sample.maiml`） |

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "content": "<?xml version=\"1.0\"?>...",
    "fileKey": "{orgPrefix}/folder/sample.maiml",
    "contentLength": 12345,
    "lastModified": "2025-01-01T00:00:00.000Z",
    "contentType": "application/xml"
  }
}
```

---

## 4. バックエンドの設計

### アーキテクチャ

```
server.js
    └── /api/s3  →  backend/routes/s3/index.js
                        │
                        ├── [ミドルウェア (全ルートに適用)]
                        │     ├── requireAuth         (認証チェック)
                        │     ├── setTenantContext     (テナントコンテキスト設定)
                        │     ├── validateS3Key        (S3キーのテナント検証)
                        │     ├── filterS3ResponseByOrganization (レスポンスフィルタリング)
                        │     └── enforceOrganizationPrefix      (組織プレフィックス強制)
                        │
                        ├── listingRoutes.js
                        │     └── GET /files          ← ①ファイル一覧取得
                        │
                        └── retrievalRoutes.js
                              └── GET /file-content   ← ②ファイル内容取得
```

### listingRoutes.js (GET /api/s3/files) の処理フロー

```
1. テナントコンテキスト確認
   └─ allowedOrgIds が空 → 403 エラー

2. organizationId クエリパラメータ検証
   └─ allowedOrgIds に含まれない → 403 エラー

3. キャッシュ確認
   └─ 有効なキャッシュあり → チェックアウト状態のみ再取得してキャッシュデータを返却

4. DBから s3_root_prefix を取得 (getOrganizationS3Prefix)
   └─ organizations テーブルから組織のS3ルートプレフィックスを取得

5. S3 ListObjectsV2Command でプレフィックス配下を取得
   └─ Prefix: {orgPrefix}, MaxKeys: 1000

6. ファイルフィルタリング
   ├─ .folder_placeholder を除外
   ├─ orgPrefix 外のファイルを除外
   └─ orgPrefix 自体を除外

7. DBの file_metadata テーブルから original_filename を取得
   └─ S3キーに対応するオリジナルファイル名でnameを上書き

8. DBの file_checkout_status テーブルからチェックアウト状態を取得
   └─ isCheckedOut, checkedOutBy, workId 等を付加

9. キャッシュに保存してレスポンス返却
```

### retrievalRoutes.js (GET /api/s3/file-content) の処理フロー

```
1. key クエリパラメータの存在確認
   └─ 未指定 → 400 エラー

2. S3 GetObjectCommand でオブジェクト取得
   └─ Bucket: S3_BUCKET_NAME, Key: {key}

3. ストリームをBufferに変換 → UTF-8文字列化

4. ファイル内容が空 → 404 エラー

5. JSONレスポンス返却
   └─ { success, data: { content, fileKey, contentLength, ... } }

エラーハンドリング:
  - NoSuchKey → 404
  - AccessDenied → 403
  - その他 → 500
```

### セキュリティ・マルチテナント設計

| 対策 | 実装 |
|---|---|
| 認証 | `requireAuth` ミドルウェアで全S3ルートに認証を強制 |
| テナント分離 | `setTenantContext` でセッションから `allowedOrgIds` を取得 |
| 組織ID検証 | リクエストの `organizationId` が `allowedOrgIds` に含まれるか確認 |
| S3パス検証 | `validateS3Key` ミドルウェアでS3キーが組織プレフィックス配下かを確認 |
| S3プレフィックス | DBから `s3_root_prefix` を取得して組織のS3領域を限定 |
| レスポンスフィルタ | `filterS3ResponseByOrganization` で他組織のデータが漏れないよう確認 |

---

## 5. 特記事項・注意点

### バックエンドAPIは補助的な役割のみ
ワークフロー追加の中核処理（MaiML変換・ID重複解決・座標配置・テンプレート統合）は**全てフロントエンドのみで完結**する。バックエンドはS3ファイルの一覧取得とファイル内容取得のみを担当しており、ワークフロー取込専用のバックエンドAPIは存在しない。

### クリック位置ベースの配置
追加するワークフローのノード群は、キャンバス内でクリックした座標を中心として配置される設計。ただし、ボタン直接クリック（キャンバスクリックなし）でダイアログを開いた場合は `pendingClickPosition` が `null` のため、デフォルト座標 `{x: 400, y: 300}` が使用される。

### ID重複解決の制約
ID重複解決は `_added` サフィックスを付与する単純な方式のため、取り込んだMaiMLのノードIDは元のファイルと異なる場合がある。これは保存時のMaiML出力にも影響する。

### テンプレート統合の簡易実装
`useWorkflow.js` の `setTemplates` は `PetriNetEditorInner.jsx` から `() => {}` （空関数）として渡されており、**テンプレート統合は現在有効に機能していない**（将来対応予定のスタブ実装）。

### ワークフローモード時のキーボードショートカット無効化
`workflowDialogOpen` が `true` の間は `PetriNetEditorInner.jsx` のキーボードショートカット（Ctrl+Z等）が無効化される。
