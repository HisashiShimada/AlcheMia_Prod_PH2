# XMLビューアー UI設計書

## メタデータ
- **画面名**: XMLビューアー
- **物理名**: XMLViewer.tsx / XMLViewerWrapper.tsx
- **ファイルパス**: `frontend/src/components/editorv2/XMLViewer.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-14
- **最終更新日**: 2026-08-14
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

MAIMLエディタ内で**XMLコンテンツをシンタックスハイライト付きで表示**するコンポーネントです。
`XMLViewerWrapper` が ReactFlowのノード/エッジからXMLを非同期生成し、ローディング状態を管理した上で `XMLViewer` に渡します。

### 1.2. 主要機能

1. XMLコンテンツのシンタックスハイライト表示
2. 行番号表示
3. コピーボタン
4. ダウンロードボタン（`.xml` ファイルとしてエクスポート）

---

## 2. コンポーネント構成

```
XMLViewerWrapper（ReactFlow→XML変換・ローディング管理）
  └─ XMLViewer（シンタックスハイライト本体）
```

### XMLViewer Props

| Prop名 | 型 | 必須 | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| `xmlContent` | `string` | ❌ | `''` | 表示するXMLコンテンツ |
| `showLineNumbers` | `boolean` | ❌ | `true` | 行番号表示フラグ |
| `highlightErrors` | `boolean` | ❌ | `true` | パースエラー表示フラグ |
| `maxHeight` | `string` | ❌ | `'600px'` | 表示エリアの最大高さ |
| `onError` | `((error: Error) => void) \| null` | ❌ | `null` | エラーコールバック |

### XMLViewerWrapper Props

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `nodes` | `Node<NodeData>[]` | ✅ | ReactFlowノード一覧 |
| `edges` | `Edge<EdgeData>[]` | ✅ | ReactFlowエッジ一覧 |
| `documentData` | `DocumentData \| null` | ✅ | MAIMLドキュメントデータ |
| `multiMethodMode` | `boolean` | ✅ | マルチメソードモードフラグ |
| `methods` | `MethodData[]` | ✅ | メソッド一覧 |
| `activeMethodIndex` | `number` | ✅ | 現在のアクティブメソッドインデックス |
| `projectId` | `string` | ✅ | プロジェクトID（名前空間注入に使用） |

---

## 3. スタイル

`XMLViewer.css` でシンタックスハイライトのカラーテーマを定義。
Ant Design の `theme.useToken()` に連動したダーク/ライトテーマ切り替えに対応。

---

## 4. 備考・注意事項

1. MAIMLエディタの「XMLビュー」タブで使用。
2. `XMLViewerWrapper` は内部で `convertReactFlowToMaiML`（シングルメソード）または `convertMultipleMethodsToMaiML`（マルチメソード）を呼び出してXMLを生成する。
3. XML生成後、`injectNamespacesToMaiml` で名前空間を注入する（失敗した場合はスキップ）。
4. `XMLViewer` 自体は基本的に表示専用（編集は別コンポーネントで行う）。
