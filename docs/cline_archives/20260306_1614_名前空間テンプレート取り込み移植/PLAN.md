# 調査レポート：名前空間テンプレート取り込み機能 移植分析

作成日: 2026-03-06  
調査者: Cline

---

## 1. 調査概要

V1実装（`PetriNetEditorV2` / JS版）の「名前空間テンプレート取り込み」機能を  
V2実装（`editorv2` / TS版）に移植するにあたり、現状の実装状況と不足・誤りを洗い出した。

---

## 2. 関連ファイル一覧

### V2（移植先）

| ファイル | 役割 |
|---------|------|
| `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` | ボタンUI・取り込みダイアログ・ハンドラー（現在は独自実装で完結） |
| `frontend/src/components/editorv2/hooks/useNamespaceOperations.ts` | S3フォルダ構造取得・XML解析・取り込み処理（**実装済みだが未使用**） |
| `frontend/src/components/editorv2/utils/templateConverter.ts` | XML解析・Property/Content変換ユーティリティ |
| `frontend/src/services/templateApi.ts` | テンプレートファイル取得APIクライアント（**存在しないエンドポイントを呼んでいる**） |

### V1（移植元）

| ファイル | 役割 |
|---------|------|
| `frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx` | ボタンUI・ハンドラー |
| `frontend/src/components/PetriNetEditorV2/hooks/useNamespaceOperations.js` | 機能ロジック本体 |
| `frontend/src/services/apiService.js` | `fetchFileList()` / `fetchFileContent()` |

---

## 3. V1仕様のUIフロー（3ステップ）

```
ボタン押下
  → [Step 0] S3全体のフォルダツリーを取得して表示
              GET /api/s3/files?organizationId=xxx
              フォルダ構造を階層・XMLファイル数付きで表示

  → [Step 1] フォルダ選択
              GET /api/s3/files?organizationId=xxx（再取得）
              選択フォルダ配下の .xml ファイルのみ絞り込んで表示

  → [Step 2] ファイル選択
              GET /api/s3/file-content?key=<fileKey>  ※キャッシュなし時のみ
              DOMParser で XML解析 → プレビュー表示
              キャッシュに保存（2回目以降はAPIコールなし）

  → [Step 3] 「取り込み」ボタン
              APIコールなし（フロントのState更新のみ）
              setProperties() または setContents() で全置き換え
              各要素に namespaceOrigin: true + namespaceSource 付与
              forceRenderKey 更新 → アラートで件数通知
```

---

## 4. V2現状のUIフロー（2ステップ）

```
ボタン押下
  → /api/v1/templates/list (category別) でファイル一覧取得 ← ❌ エンドポイント未実装
  → TreeSelectでファイルを直接選択
  → ファイル選択 → XML解析（xml-js） → プレビュー表示
  → 「取り込み」ボタン → State更新（マージ方式）
```

---

## 5. 差分・不足・誤り一覧

### 🔴 必須対応（機能が動かない）

#### 5-1. バックエンドAPIエンドポイントの不一致 → 新規API追加が必要

`templateApi.ts` が呼び出している `/api/v1/templates/list` と `/api/v1/templates/content` は
バックエンドに**存在しない**。

また、既存APIの適合性を調査した結果、以下の問題が判明した：

| 既存API | 実態 | 適合性 |
|---|---|---|
| `GET /api/v1/maiml/files` | 組織配下の**全ファイル**を返す汎用API（.maiml/.xml混在、部門フィルタなし） | ❌ 不適切 |
| `GET /api/v1/maiml/file-content` | 任意キーのファイル内容を返す汎用API | ✅ ファイル内容取得に流用可能 |
| `GET /api/v1/formats` | セッションの `departmentCd` に紐づく**単一部門**のフォルダ一覧 | △ 全部門横断不可 |
| `GET /api/v1/formats/:folderName/files` | セッションの `departmentCd` に紐づく**単一部門**のファイル一覧 | △ 全部門横断不可 |

名前空間テンプレート取り込み機能は**全部門横断**で `material/` `condition/` `result/` 配下の
**`.xml` ファイルのみ**を取得する必要があるため、新規APIエンドポイントが必要。

| 用途 | エンドポイント | 対応内容 |
|---|---|---|
| テンプレートフォルダ＆ファイル一覧 | `GET /api/v1/maiml/formats` | **新規追加が必要**（全部門横断、`.xml` のみ） |
| ファイル内容取得 | `GET /api/v1/maiml/file-content` | **既存API流用**（`key` パラメータでS3フルキー指定） |

**対応:**
1. バックエンドに `GET /api/v1/maiml/formats` を新規追加する。  
   - `storageService.listFiles(organizationId, 'formats/')` で全部門を横断取得
   - `material/` `condition/` `result/` フォルダ配下の `.xml` ファイルのみを抽出
   - 部門CD → フォルダ → ファイルの階層構造でレスポンスを返す
2. `templateApi.ts` の呼び出し先を以下に修正する：
   - `fetchTemplateFiles` → `GET /api/v1/maiml/formats`
   - `fetchTemplateContent` → `GET /api/v1/maiml/file-content`

---

#### 5-2. useNamespaceOperations.ts が TemplateEditorDialog.tsx に接続されていない

`hooks/useNamespaceOperations.ts` は完全実装済みだが、`TemplateEditorDialog.tsx` で
一切 `import` されておらず、全機能が未使用。

| フック機能 | 状態 |
|---|---|
| `loadS3FolderStructure()` | 未使用 |
| `getFolderNamespaceFileCount()` | 未使用 |
| `loadNamespaceFilesFromS3Folder()` | 未使用 |
| `analyzeNamespaceFile()` （キャッシュ付きXML解析） | 未使用 |
| `replaceTemplateWithNamespace()` | 未使用 |
| `replaceElementWithNamespace()` | 未使用 |

**対応:** `TemplateEditorDialog.tsx` に `useNamespaceOperations` を `import` して接続する。

---

#### 5-3. ダイアログのUIフロー

V2現状のファイルを直接選択するUIフローで問題なし。V1仕様の「フォルダ選択 → ファイル絞り込み」2段階UIへの変更は不要。

**対応:** 対応不要。現状の取り込み方法を維持する。

---

#### 5-4. XML解析実装が V1仕様より低品質

| 比較項目 | V1仕様（useNamespaceOperations.js） | V2現状（templateConverter.ts） |
|---|---|---|
| パース方法 | **DOMParser**（ブラウザ標準） | **xml-js ライブラリ** |
| 収集範囲 | **全階層再帰**で property/content を収集 | ルート直下の `properties > property` のみ |
| 重複キー処理 | **selectBestElement()** で子要素が多い方を優先選択 | なし |
| PropertyListType対応 | **parseUnifiedElement()** で children/elements を分類 | 基本的な再帰のみ |

V2の `useNamespaceOperations.ts` にはDOMParser版の実装（`parseNamespaceXML`）が存在する。

**対応:** `TemplateEditorDialog.tsx` で `templateConverter.ts` の `parseNamespacesFromXml` を  
`useNamespaceOperations.ts` の `analyzeNamespaceFile()` に切り替える。

---

#### 5-5. 取り込みモード（全置き換え vs マージ）の不一致

| 項目 | V1仕様 | V2現状 |
|---|---|---|
| 取り込み方式 | **全置き換え**（既存を消して新規で上書き） | **マージ**（既存 + 新規） |
| `replaceTemplateWithNamespace()` | ← V1動作 | 未使用 |

**対応:** 取り込み処理を `useNamespaceOperations.ts` の `replaceTemplateWithNamespace()` に差し替える。

---

#### 5-6. Contentsセクションの表示バグ

`TemplateEditorDialog.tsx` の Contents セクション描画部分で、`contents` state ではなく  
`properties` state を参照している。

```tsx
// ❌ 現状（バグ）：約1520行付近
{Object.keys(properties).length === 0 ? (  // ← contents であるべき
  <Alert message="Contentがありません..." />
) : (
  Object.entries(properties).map(([key, data]) => (  // ← contents であるべき
    <NestedPropertyEditor ... />
  ))
)}

// ✅ 正しい
{Object.keys(contents).length === 0 ? (
  ...
  Object.entries(contents).map(([key, data]) => (
```

**対応:** `properties` → `contents` に修正する。

---

### 🟡 推奨対応（品質向上）

#### 5-7. namespaceSource の構造が V1仕様と異なる

V1仕様では `uri` と `hierarchyPath` を含むが、V2現状では欠落している。

**V1仕様のデータ構造**
```typescript
namespaceSource: {
  uri: "名前空間URI（xmlns属性値）",
  hierarchyPath: ["path", "parts", "..."],
  importedAt: "ISO8601日時"
}
```

**V2現状のデータ構造**
```typescript
namespaceSource: {
  fileName: "ファイル名",
  importedAt: "ISO8601日時"
  // ← uri と hierarchyPath が欠落
}
```

`useNamespaceOperations.ts` の `replaceTemplateWithNamespace()` は V1仕様通り  
`uri` / `hierarchyPath` / `importedAt` を付与する実装になっているため、  
5-5 の対応（`replaceTemplateWithNamespace()` への切り替え）で自動的に解消される。

---

#### 5-8. キャッシュ機能の活用

`useNamespaceOperations.ts` の `analyzeNamespaceFile()` にはキャッシュが実装済みで、  
同一ファイルの2回目以降のAPIコールを防ぐ。5-4 の対応で自動的に有効になる。

---

#### 5-9. 不要APIの整理

`templateApi.ts` の `getTemplateSignedUrl()` はどこからも呼び出されていない。  
移植後に不要であれば削除を検討する。

---

## 6. 対応優先度まとめ

| 優先度 | # | 対応内容 | 主な対象ファイル |
|---|---|---|---|
| 🔴 必須 | 5-1 | `templateApi.ts` の呼び出し先をV2バックエンドの実在エンドポイントに修正 | `templateApi.ts` |
| 🔴 必須 | 5-2 | `useNamespaceOperations` を `TemplateEditorDialog.tsx` に import・接続 | `TemplateEditorDialog.tsx` |
| ~~🔴 必須~~ | 5-3 | ~~ダイアログUIをV1仕様の3ステップ（フォルダ→ファイル→取り込み）に変更~~ → **対応不要**（現状の取り込み方法で問題なし） | — |
| 🔴 必須 | 5-4 | XML解析を `analyzeNamespaceFile()` に切り替え | `TemplateEditorDialog.tsx` |
| 🔴 必須 | 5-5 | 取り込み処理を `replaceTemplateWithNamespace()` に切り替え | `TemplateEditorDialog.tsx` |
| 🔴 必須 | 5-6 | Contentsセクションの `properties` → `contents` 参照バグ修正 | `TemplateEditorDialog.tsx` |
| 🟡 推奨 | 5-7 | `namespaceSource` の構造をV1仕様に合わせる（5-5 対応で自動解消） | — |
| 🟡 推奨 | 5-8 | キャッシュ機能の有効化（5-4 対応で自動有効化） | — |
| 🟡 推奨 | 5-9 | 未使用の `getTemplateSignedUrl()` 削除 | `templateApi.ts` |
