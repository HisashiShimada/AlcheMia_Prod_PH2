# ViewRenderer コンポーネント群

## 概要

ViewRendererは、referenceフォルダのViewRenderer.jsとその子コンポーネントを、現在のプロジェクトのUIポリシー（Ant Design v6、TypeScript、Next.js）に従って再作成したビューレンダリングコンポーネント群です。

## コンポーネント構成

### 1. ViewRenderer.tsx (更新済み)
**役割**: ビューレンダリングの統括コンポーネント

**機能**:
- ビューモードの切り替え（main/edit/experiment/experimentControl）
- ファイルタイプに応じた適切なビューアーの選択
- ファイル未選択時の初期画面表示
- サポートされていないファイルタイプの処理

**Props**:
```typescript
interface ViewRendererProps {
  currentView: 'main' | 'edit' | 'experiment' | 'experimentControl';
  selectedFile?: FileInfo | null;
  fileContent?: string | null;
  enhancedMode?: boolean;
  downloadingFile?: boolean;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  isTabletDevice?: boolean;
  isMobileDevice?: boolean;
  onFileDownload?: (fileKey: string, fileName: string) => void;
  onExitEdit?: () => void;
  onExitExperiment?: () => void;
  onExitExperimentControl?: () => void;
}
```

**使用例**:
```tsx
<ViewRenderer
  currentView="main"
  selectedFile={selectedFile}
  fileContent={fileContent}
  enhancedMode={true}
  deviceType="desktop"
  onFileDownload={handleFileDownload}
/>
```

### 2. ErrorBoundary.tsx
**役割**: エラーバウンダリコンポーネント

**機能**:
- 子コンポーネントのエラーをキャッチ
- エラー詳細の表示（メッセージ、スタック）
- エラー状態のリセット機能

**使用例**:
```tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 3. TiffViewer.tsx
**役割**: TIFFファイルビューアコンポーネント

**機能**:
- TIFFファイルの情報表示
- ダウンロード機能
- ズーム操作（拡大/縮小/リセット）

**注意**: ブラウザのTIFF表示制限により、ダウンロード推奨メッセージを表示

**Props**:
```typescript
interface TiffViewerProps {
  fileKey: string;
  fileName: string;
}
```

**使用例**:
```tsx
<TiffViewer
  fileKey="org_xxx/files/sample.tiff"
  fileName="sample.tiff"
/>
```

### 4. ImageViewer.tsx
**役割**: 画像ファイルビューアコンポーネント

**機能**:
- 画像の読み込みと表示
- ズーム操作（拡大/縮小/リセット）
- 再読み込み機能
- 画像サイズ情報の表示
- プレビュー機能（Ant Design Image）

**サポート形式**: jpg, jpeg, png, gif, bmp, webp

**Props**:
```typescript
interface ImageViewerProps {
  fileKey: string;
  fileName: string;
}
```

**使用例**:
```tsx
<ImageViewer
  fileKey="org_xxx/files/sample.png"
  fileName="sample.png"
/>
```

### 5. PetriNetViewer.tsx（完全版）
**役割**: ペトリネットビューアコンポーネント

**機能**:
- ✅ MAIMLファイルのペトリネット図表示（React Flow v11）
- ✅ カスタムノードコンポーネント（Material/Condition/Result/Transition）
- ✅ MAIMLパーサー（XMLからペトリネット構造を抽出）
- ✅ 自動レイアウト機能
- ✅ ズーム・パン操作
- ✅ MiniMap表示
- ✅ エクスポート機能（JSON対応、PNG/SVGは今後実装予定）
- ✅ アーク名表示切り替え

**使用技術**:
- React Flow v11.11.4
- カスタムノードコンポーネント
- DOMParser（MAIML XMLパース）
- 階層的自動レイアウト（BFSベース）

**Props**:
```typescript
interface PetriNetViewerProps {
  maimlData?: string | null;
  dotData?: string | null;
  enhancedMode?: boolean;
  performanceStats?: unknown;
}
```

**使用例**:
```tsx
<PetriNetViewer
  maimlData={fileContent}
  enhancedMode={true}
/>
```

### 6. PetriNetEditor.tsx（完全版 + Phase 4-5）
**役割**: ペトリネットエディタコンポーネント

**実装済み機能（Phase 1-5）**:
- ✅ React Flow v11統合
- ✅ ノード追加（Material/Condition/Result/Transition）
- ✅ ノード削除（Deleteキー）
- ✅ ノードドラッグ&ドロップ移動
- ✅ エッジ接続機能
- ✅ エッジ削除機能
- ✅ Undo/Redo機能（履歴管理50件）
- ✅ プロパティ編集パネル（Drawer）
- ✅ ノードプロパティ編集（ラベル・説明）
- ✅ **Document編集ダイアログ**（Phase 4）
- ✅ MAIML XML生成
- ✅ バリデーション機能
- ✅ ローカル保存（ダウンロード）
- ✅ **Draft保存ボタン（モック）**（Phase 5）
- ✅ **S3保存ボタン（モック）**（Phase 4）

**将来実装予定（Phase 6+）**:
- ⏸️ Draft保存・復元機能の実装（LocalStorage）
- ⏸️ S3保存API連携の実装
- ⏸️ テンプレート詳細編集ダイアログ
- ⏸️ Document複数Creator/Vendor管理
- ⏸️ ワークフロー追加機能
- ⏸️ 複数method管理

### 7. DocumentEditDialog.tsx（Phase 4）
**役割**: Document情報編集ダイアログ

**実装済み機能**:
- ✅ 基本情報編集（ID、名前、説明、日付）
- ✅ Creator編集（ID、名前）
- ✅ Vendor編集（ID、名前）
- ✅ 現在時刻設定ボタン
- ✅ バリデーション
- ✅ 未保存変更警告

**使用例**:
```tsx
<DocumentEditDialog
  open={open}
  documentData={documentInfo}
  onClose={handleClose}
  onSave={handleSave}
/>
```

**Props**:
```typescript
interface PetriNetEditorProps {
  editingFileName?: string;
  initialMaiMLData?: string | null;
  onDataChange?: (data: string) => void;
  onExitEdit?: () => void;
  availableFiles?: Array<{ key: string; name: string }>;
  userId?: string;
  initialEditMode?: 'new' | 'existing' | 'draft';
  originalFileName?: string | null;
  sourceS3Key?: string | null;
}
```

**使用例**:
```tsx
<PetriNetEditor
  editingFileName="experiment.maiml"
  initialMaiMLData={maimlContent}
  onDataChange={handleDataChange}
  onExitEdit={handleExit}
  userId="user-001"
  initialEditMode="existing"
/>
```

## UIポリシー準拠

### Ant Design v6 の使用

すべてのコンポーネントは、Ant Design v6のコンポーネントとデザイントークンを使用しています。

**使用コンポーネント**:
- Alert, Button, Card, Space, Typography, Flex, Spin, Image
- アイコン: @ant-design/icons

**デザイントークン**:
- プライマリカラー: #CF0027
- 背景色: theme.token を使用
- スペーシング: Space コンポーネントで制御

### TypeScript対応

すべてのコンポーネントは完全にTypeScriptで記述されています。

- Props の型定義
- State の型定義
- イベントハンドラーの型安全性

### レスポンシブデザイン

- デバイスタイプ（desktop/tablet/mobile）に応じた表示
- Ant Design の Flex、Space コンポーネントでレイアウト制御
- スマートフォン・タブレット対応

## モックモード

現在、API呼び出しはコメントアウトされており、モックデータを使用しています。

**モック対象**:
- `TiffViewer`: ダウンロードURL
- `ImageViewer`: 画像読み込みURL（placeholder画像を使用）

**実装時の対応**:
1. コメントアウトされたAPI呼び出しコードのコメントを外す
2. モック用のコードを削除
3. 実際のAPIエンドポイントに接続

## ファイル構成

```
frontend/src/components/viewer/
├── ViewRenderer.tsx              # メインコンポーネント
├── ErrorBoundary.tsx             # エラーバウンダリ
├── TiffViewer.tsx                # TIFFビューア
├── ImageViewer.tsx               # 画像ビューア
├── PetriNetViewer.tsx            # ペトリネットビューア（完全版）
├── PetriNetEditor.tsx            # ペトリネットエディタ（簡略版）
├── nodes/                        # カスタムノードコンポーネント
│   ├── MaterialTemplateNode.tsx  # Materialテンプレートノード
│   ├── ConditionTemplateNode.tsx # Conditionテンプレートノード
│   ├── ResultTemplateNode.tsx    # Resultテンプレートノード
│   └── TransitionNode.tsx        # Transitionノード
├── utils/                        # ユーティリティ
│   ├── maimlParser.ts            # MAIML XMLパーサー
│   └── reactFlowConverter.ts     # React Flow変換
└── README.md                     # このファイル
```

## 実装状況

### ✅ 実装済み
- ViewRenderer の基本構造
- ファイルタイプ判定
- ErrorBoundary
- TiffViewer
- ImageViewer
- ファイル未選択画面
- サポート外ファイル画面
- モックモード対応

### ⚠️ 未実装（参照先で実装が必要）
- PetriNetViewer（MAIMLファイル表示）
- PetriNetEditor（編集機能）
- ExperimentRecorder（実験記録機能）
- ExperimentManager（実験管理機能）

## 今後の拡張

### Phase 1: 基本機能
- [ ] PetriNetViewerの実装
- [ ] ファイルダウンロード機能の実装
- [ ] 実際のAPIとの接続

### Phase 2: 編集機能
- [ ] PetriNetEditorの実装
- [ ] Draft復元機能の実装

### Phase 3: 実験記録・管理
- [ ] ExperimentRecorderの実装
- [ ] ExperimentManagerの実装
- [ ] デバイス別最適化

## 参考

- 元コード: `reference/frontend/src/components/ViewRenderer/ViewRenderer.js`
- Ant Design v6: https://ant.design/
- UIポリシー: `.clinerules/ui_policy.md`

## 更新履歴

- 2024-12-18: 初版作成（referenceから移植）
