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
`XMLViewerWrapper` がラッパーとして `XMLViewer` を包み、エラー境界やローディング状態を管理します。

### 1.2. 主要機能

1. XMLコンテンツのシンタックスハイライト表示
2. 行番号表示
3. 折りたたみ（コードフォールディング）
4. コピーボタン

---

## 2. コンポーネント構成

```
XMLViewerWrapper
  └─ XMLViewer（シンタックスハイライト本体）
```

### XMLViewer Props

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `content` | `string` | ✅ | 表示するXMLコンテンツ |
| `height` | `string \| number` | ❌ | 表示エリアの高さ |
| `readOnly` | `boolean` | ❌ | 読み取り専用フラグ（デフォルト: true）|

### XMLViewerWrapper Props

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `content` | `string \| null` | ✅ | 表示するXMLコンテンツ |
| `loading` | `boolean` | ❌ | ローディングフラグ |
| `height` | `string \| number` | ❌ | 高さ指定 |

---

## 3. スタイル

`XMLViewer.css` でシンタックスハイライトのカラーテーマを定義。
Ant Design の `theme.useToken()` に連動したダーク/ライトテーマ切り替えに対応。

---

## 4. 備考・注意事項

1. MAIMLエディタの「XMLビュー」タブで使用。
2. 編集は別途エディタコンポーネントで行い、このコンポーネントは基本的に読み取り専用表示。
