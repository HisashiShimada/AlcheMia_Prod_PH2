# ViewRenderer UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

選択されたファイルタイプに応じて適切なビューアーを表示する統括コンポーネント。MAIMLファイル、画像ファイル、TIFFファイルを自動判定して対応するビューアーにレンダリングします。

---

## 2. ファイルパス

```
frontend/src/components/viewer/ViewRenderer.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| currentView | ViewType | | ビューモード（'main' \| 'edit' \| 'experiment' \| 'experimentControl'） |
| selectedFile | FileInfo \| null | | 選択中のファイル情報 |
| fileContent | string \| null | | ファイルの内容 |
| enhancedMode | boolean | | Enhanced v2.0モード有効化 |
| downloadingFile | boolean | | ダウンロード中フラグ |
| deviceType | DeviceType | | デバイスタイプ（'desktop' \| 'tablet' \| 'mobile'） |
| isTabletDevice | boolean | | タブレット判定フラグ |
| isMobileDevice | boolean | | モバイル判定フラグ |
| hideMethodTabs | boolean | | メソッド選択Tabsを非表示（指示確認タブ用） |
| onFileDownload | (key, name) => void | | ファイルダウンロード |
| onExitEdit | () => void | | 編集モード終了 |
| onExitExperiment | () => void | | 実験記録モード終了 |
| onExitExperimentControl | () => void | | 実験制御モード終了 |
| onOpenSubNetViewer | (data) => void | | サブネット表示 |

**FileInfo型:**
```typescript
interface FileInfo {
  key: string;           // S3キー
  name: string;          // ファイル名
  content?: string;      // ファイル内容
  size?: number;         // サイズ
  lastModified?: string; // 最終更新日時
}
```

---

## 4. 主要機能

### 4.1. ファイルタイプ自動判定

**処理:**
1. ファイル名の拡張子から判定
2. `.maiml`, `.xml` → MAIMLビューア
3. `.tif`, `.tiff` → TIFFビューア
4. `.jpg`, `.png`等 → 画像ビューア
5. その他 → サポート対象外

### 4.2. 複数メソッド対応（MAIMLファイル）

**処理フロー:**
1. MAIMLファイル選択時、複数メソッドをチェック
2. fetchMultipleMethodsStructureFromContent()を呼び出し
3. 2個以上のメソッド検出時、Tabs表示
4. Tabクリックで該当メソッドのペトリネット表示

**State:**
- `methods`: メソッド配列
- `selectedMethodIndex`: 選択中のメソッドインデックス
- `isMultiMethod`: 複数メソッドフラグ
- `loadingMethods`: チェック中フラグ

### 4.3. ビューモード切替

**4種類のビュー:**

1. **main（メインビュー）**
   - ファイル未選択 → NoSelectionView
   - ファイル選択済み → 各種ビューア表示

2. **edit（編集モード）**
   - PetriNetEditorInnerで編集画面表示

3. **experiment（実験記録モード）**
   - 実験記録システム（未実装）

4. **experimentControl（実験制御モード）**
   - 実験制御画面（未実装）

---

## 5. サブコンポーネント

### 5.1. NoSelectionView

ファイル未選択時の初期表示。

**表示内容:**
- ロゴ・タイトル
- 使用方法の説明
- Enhanced v2.0モードバッジ
- デバイス情報カード

### 5.2. UnsupportedFileView

サポート対象外ファイルの表示。

**表示内容:**
- エラーメッセージ
- ダウンロードボタン

---

## 6. レンダリングフロー

```
currentView判定
├─ 'main' → renderFileViewer()
│   ├─ selectedFile未選択 → NoSelectionView
│   ├─ MAIMLファイル
│   │   ├─ 複数メソッド → Tabs + PetriNetViewer
│   │   └─ 単一メソッド → PetriNetViewer
│   ├─ TIFFファイル → TiffViewer
│   ├─ 画像ファイル → ImageViewer
│   └─ その他 → UnsupportedFileView
├─ 'edit' → PetriNetEditorInner
├─ 'experiment' → 未実装画面
└─ 'experimentControl' → 未実装画面
```

---

## 7. 使用コンポーネント

### 7.1. Ant Design

- Alert, Space, Typography, Card, Button, Tag, Tabs, Spin, message

### 7.2. 内部コンポーネント

- ErrorBoundary
- TiffViewer
- ImageViewer
- PetriNetViewer
- PetriNetEditorInner（editorv2）

### 7.3. アイコン

- RocketOutlined, FileTextOutlined, DownloadOutlined
- MobileOutlined, TabletOutlined, DesktopOutlined

---

## 8. 特徴

### 8.1. デバイス対応

- デスクトップ、タブレット、モバイルの統一UX
- デバイス情報の表示

### 8.2. エラーハンドリング

- ErrorBoundaryでラップ
- ビューアーごとにエラーを分離

### 8.3. Enhanced v2.0モード

- Parquet/Glueベース高速検索対応
- enhancedMode propsで制御

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-12-23 | 複数メソッド対応、デバイス対応 | Development Team |
| 1.0.0 | 2026-02-19 | UI仕様書作成 | Cline |
