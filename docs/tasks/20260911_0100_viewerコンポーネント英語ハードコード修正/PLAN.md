# タスク計画書: viewerコンポーネント英語ハードコード修正

## メタデータ
- **作成日時**: 2026-09-11
- **タスクID**: 20260911_0100
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要
`check-i18n-keys.js` の【7】で検知された6件に加え、同ファイル内のボタンラベル・テキスト等の英語ハードコードをすべて `t()` に置き換える。

## 修正対象ファイルと英語ハードコード一覧

### ErrorBoundary.tsx（クラスコンポーネント ※useLanguage不可 → `getTranslation()` 使用）
| 行 | 英語テキスト | キー |
|----|------------|------|
| 65 | `message="Component Display Error"` | `viewer.errorBoundary.title` |
| 66 | `description="An error occurred while rendering this component."` | `viewer.errorBoundary.description` |
| 73 | `title="Error Details"` | `viewer.errorBoundary.detailsTitle` |
| 82 | `Retry`（ボタン） | `viewer.errorBoundary.retry` |
| 89 | `Error Message:`（Textラベル） | `viewer.errorBoundary.errorMessage` |
| 98 | `Component Stack:`（Textラベル） | `viewer.errorBoundary.componentStack` |

### ImageViewer.tsx（useLanguage追加）
| 行 | 英語テキスト | キー |
|----|------------|------|
| 66 | `'Failed to load image. The format may not be supported.'` | `viewer.imageViewer.loadError` |
| 73 | `` `Failed to fetch image URL: ${msg}` `` | `viewer.imageViewer.fetchUrlError` |
| 116, 206 | `'Image File'`（フォールバック） | `viewer.imageViewer.defaultFileName` |
| 127 | `Zoom In`（ボタン） | `viewer.imageViewer.zoomIn` |
| 135 | `Zoom Out`（ボタン） | `viewer.imageViewer.zoomOut` |
| 143 | `Reset`（ボタン） | `viewer.imageViewer.reset` |
| 152 | `Reload`（ボタン） | `viewer.imageViewer.reload` |
| 176 | `Loading image...` | `viewer.imageViewer.loading` |
| 183 | `message="Error"` | `viewer.imageViewer.errorTitle` |
| 189 | `Retry`（ボタン） | `viewer.imageViewer.retry` |
| 215 | `mask: 'Preview'` | `viewer.imageViewer.preview` |
| 225 | `` Size: {w} x {h} px `` | `viewer.imageViewer.size` |
| 229 | `` Zoom: {scale}x `` | `viewer.imageViewer.zoom` |
| 232 | `` File Key: {key} `` | `viewer.imageViewer.fileKey` |

### TiffViewer.tsx（useLanguage追加）
| 行 | 英語テキスト | キー |
|----|------------|------|
| 50 | `` `Failed to fetch URL: ${msg}` `` | `viewer.tiffViewer.fetchUrlError` |
| 103 | `'TIFF File'`（フォールバック） | `viewer.tiffViewer.defaultFileName` |
| 113 | `Zoom In`（ボタン） | `viewer.imageViewer.zoomIn`（共通） |
| 120 | `Zoom Out`（ボタン） | `viewer.imageViewer.zoomOut`（共通） |
| 127 | `Reset`（ボタン） | `viewer.imageViewer.reset`（共通） |
| 136 | `Download`（ボタン） | `viewer.tiffViewer.download` |
| 155 | `message="Failed to fetch URL"` | `viewer.tiffViewer.urlErrorTitle` |
| 163 | `message="TIFF File Selected"` | `viewer.tiffViewer.selectedTitle` |
| 168-172 | TIFFブラウザ制限の説明文（2行） | `viewer.tiffViewer.browserLimitNote` / `viewer.tiffViewer.downloadRecommend` |
| 186 | `Download TIFF File`（ボタン） | `viewer.tiffViewer.downloadButton` |
| 192, 195 | `File Key: {key}` / `Zoom: {scale}x` | `viewer.imageViewer.fileKey`（共通） / `viewer.imageViewer.zoom`（共通） |

## 実装ステップ
- [ ] Step 1: `ja.json` / `en.json` の `viewer` セクションに `errorBoundary` / `imageViewer` / `tiffViewer` サブセクションを追加
- [ ] Step 2: `ErrorBoundary.tsx` を修正（クラスコンポーネントのため `getTranslation()` を使用）
- [ ] Step 3: `ImageViewer.tsx` を修正（`useLanguage()` を追加）
- [ ] Step 4: `TiffViewer.tsx` を修正（`useLanguage()` を追加）
- [ ] Step 5: `tsc --noEmit` でビルドエラーなし確認
- [ ] Step 6: `check-i18n-keys.js` 実行で【7】0件確認

## 変更ファイル
1. `frontend/src/locales/ja.json`
2. `frontend/src/locales/en.json`
3. `frontend/src/components/viewer/ErrorBoundary.tsx`
4. `frontend/src/components/viewer/ImageViewer.tsx`
5. `frontend/src/components/viewer/TiffViewer.tsx`

## 承認記録
- **計画書提示日時**: 2026-09-11
- **承認日時**: 2026-09-11（act モードにて即時承認）
- **承認者コメント**: スクリプトで検知したハードコードを修正してください

---

## 11. 実施記録

### 実施日時
開始: 2026-09-11
完了: 2026-09-11

### 最終的な成果物
- [x] `ja.json` / `en.json` — `viewer.errorBoundary` / `viewer.imageViewer` / `viewer.tiffViewer` サブセクション追加（各22キー）
- [x] `ErrorBoundary.tsx` — `getTranslation()` 導入、英語ハードコード6箇所を `t()` に置き換え
- [x] `ImageViewer.tsx` — `useLanguage()` 追加、英語ハードコード15箇所を `t()` に置き換え
- [x] `TiffViewer.tsx` — `useLanguage()` 追加、英語ハードコード10箇所を `t()` に置き換え
- [x] `tsc --noEmit` Exit: 0（ビルドエラーなし）
- [x] `check-i18n-keys.js` 実行結果: 【7】0件（修正前: 6件）
