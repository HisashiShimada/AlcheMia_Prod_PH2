# ViewRenderer コンポーネント UI仕様書

## 1. 概要

### 1.1 コンポーネントの目的
ViewRendererは、MAIML/画像ファイルのビューアー機能を統括する中核コンポーネントです。ファイルタイプに応じた適切なビューアーを選択し、複数のビューモード（メイン/編集/実験記録/実験制御）の切り替えを管理します。

### 1.2 使用場面
- プロジェクト管理画面でファイルを選択した際の表示エリア
- 進捗確認画面で実験結果ファイルを表示する際のビューアー
- MAIMLファイルの複数メソッド切り替え表示
- デスクトップ/タブレット/モバイルデバイスでの統一表示

### 1.3 アクセス権限
- **必須ロール**: Experiment Admin（実験管理者）
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

#### 2.1.1 メインビュー（currentView='main'）

**ファイル未選択時:**
```
┌─────────────────────────────────────────────────────────┐
│                   ファイル未選択表示                      │
│                                                         │
│  🚀 MAIML Viewer Enhanced v2.0                         │
│     デスクトップ/モバイル統一実験記録システム版          │
│                                                         │
│  📋 統一UX動線説明                                       │
│  ✅ Enhanced v2.0 モード有効（条件付き）                 │
│  📱 デバイス情報カード                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**MAIMLファイル選択時（単一メソッド）:**
```
┌─────────────────────────────────────────────────────────┐
│  <PetriNetViewer /> (Petri Net図表示)                   │
│                                                         │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**MAIMLファイル選択時（複数メソッド、hideMethodTabs=false）:**
```
┌─────────────────────────────────────────────────────────┐
│  [Method 1] [Method 2] [Method 3]  ← メソッド切り替えタブ │
├─────────────────────────────────────────────────────────┤
│  <PetriNetViewer /> (選択中メソッドのPetri Net図表示)    │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**画像ファイル選択時:**
```
┌─────────────────────────────────────────────────────────┐
│  <ImageViewer /> または <TiffViewer />                  │
│  (画像表示エリア)                                        │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**サポート外ファイル選択時:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  📄 このファイルタイプはビューアで表示できません          │
│                                                         │
│  [ファイルをダウンロード] ボタン                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 2.1.2 編集ビュー（currentView='edit'）

```
┌─────────────────────────────────────────────────────────┐
│  <PetriNetEditorInner />                                │
│  (Petri Net編集エディタ - ReactFlowベース)               │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 2.1.3 実験記録ビュー（currentView='experiment'）

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ 実験記録システム                                     │
│     実験記録機能は未実装です                              │
│     [メイン画面に戻る] ボタン                             │
└─────────────────────────────────────────────────────────┘
```

#### 2.1.4 実験制御ビュー（currentView='experimentControl'）

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ 実験制御（実験管理者）                               │
│     実験制御機能は未実装です                              │
│     [メイン画面に戻る] ボタン                             │
└─────────────────────────────────────────────────────────┘
```

### 2.2 主要UI要素

#### 2.2.1 ファイル未選択表示（NoSelectionView）
- **ロケットアイコン**（RocketOutlined）: 64px、赤色（#CF0027）
- **タイトル**: "MAIML Viewer Enhanced v2.0"
- **サブタイトル**: "デスクトップ/モバイル統一実験記録システム版"
- **説明カード**: 統一UX動線の説明（3項目）
- **Enhancedモードアラート**（条件付き表示）: Parquet/Glueベース高速検索対応
- **デバイス情報カード**: タイプ/モバイル/タブレット/画面サイズ

#### 2.2.2 メソッド切り替えタブ（複数メソッド時）
- **Tabs**（Ant Design）: アクティブなメソッドを選択
- **各タブ**: メソッド名 + Tag（ノード数、トランジション数）

#### 2.2.3 サポート外ファイル表示（UnsupportedFileView）
- **ファイルアイコン**（FileTextOutlined）: 64px、グレー
- **メッセージ**: "このファイルタイプはビューアで表示できません"
- **ダウンロードボタン**: Primary、Large、ダウンロード中はSpinner表示

---

## 3. 機能仕様

### 3.1 ファイルタイプ判定

#### 3.1.1 処理フロー
```typescript
const getFileType = (fileName: string): 'maiml' | 'tiff' | 'image' | 'unknown' => {
  if (!fileName) return 'unknown';
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (ext === 'maiml' || ext === 'xml') return 'maiml';
  if (ext === 'tif' || ext === 'tiff') return 'tiff';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return 'image';
  
  return 'unknown';
};
```

#### 3.1.2 サポートされるファイルタイプ
| ファイルタイプ | 拡張子 | ビューアー |
|-------------|-------|-----------|
| MAIML | `.maiml`, `.xml` | PetriNetViewer |
| TIFF | `.tif`, `.tiff` | TiffViewer |
| 画像 | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp` | ImageViewer |
| その他 | すべて | UnsupportedFileView（ダウンロード推奨） |

### 3.2 複数メソッド対応

#### 3.2.1 複数メソッドチェック処理
```typescript
useEffect(() => {
  if (!fileContent || !selectedFile || getFileType(selectedFile.name) !== 'maiml') {
    setMethods([]);
    setIsMultiMethod(false);
    setSelectedMethodIndex(0);
    setCheckedFileKey('');
    return;
  }

  // 既に同じファイルをチェック済みの場合はスキップ
  if (checkedFileKey === selectedFile.key) {
    console.log('ℹ️ [ViewRenderer] 既にチェック済み - スキップ:', selectedFile.key);
    return;
  }

  const checkMultipleMethods = () => {
    try {
      setLoadingMethods(true);
      console.log('🔍 [ViewRenderer] 複数メソッドチェック開始:', selectedFile.key);

      const parser = new MaimlParserTyped(fileContent);
      const parsedMethods: Method[] = parser.getMethods();

      if (parsedMethods.length > 1) {
        const methodDataList: MethodData[] = parsedMethods.map((m, index) => ({
          methodId: m.id || `method_${index}`,
          methodIndex: index,
          name: m.name || m.id || `Method ${index + 1}`,
          places: (m.pnml.places || []).map((p) => ({
            id: p.id,
            type: 'place',
            description: p.name,
          })),
          transitions: (m.pnml.transitions || []).map((t) => ({
            id: t.id,
            description: t.name,
          })),
          arcs: (m.pnml.arcs || []).map((a) => ({
            id: a.id,
            source: a.source,
            target: a.target,
          })),
        }));

        console.log('✅ [ViewRenderer] 複数メソッド検出:', methodDataList.length);
        setMethods(methodDataList);
        setIsMultiMethod(true);
        setSelectedMethodIndex(0);

        message.success({
          content: `${methodDataList.length}個のメソッドを検出しました`,
          key: 'multiple-methods-detected',
          duration: 3,
        });
      } else {
        console.log('ℹ️ [ViewRenderer] 単一メソッド');
        setMethods([]);
        setIsMultiMethod(false);
      }

      setCheckedFileKey(selectedFile.key);
    } catch (error) {
      console.error('❌ [ViewRenderer] 複数メソッドチェックエラー:', error);
      setMethods([]);
      setIsMultiMethod(false);
      setCheckedFileKey(selectedFile.key);
    } finally {
      setLoadingMethods(false);
    }
  };

  checkMultipleMethods();
}, [fileContent, selectedFile?.key]);
```

#### 3.2.2 UI動作
- **検出時**: `message.success`で「○個のメソッドを検出しました」を表示
- **タブ表示**: 各メソッド名とノード数/トランジション数のTagを表示
- **切り替え**: タブクリックで`selectedMethodIndex`を更新、PetriNetViewerに反映

#### 3.2.3 メソッドタブ非表示モード（hideMethodTabs）
- **用途**: 指示確認タブなど、外部から特定メソッドを指定して表示したい場合
- **動作**: タブを表示せず、`selectedMethodId`（Props）をPetriNetViewerに渡す

### 3.3 ビュー切り替え

#### 3.3.1 処理フロー
```typescript
switch (currentView) {
  case 'edit':
    return renderEditView();
  case 'experiment':
    return renderExperimentView();
  case 'experimentControl':
    return renderExperimentControlView();
  case 'main':
  default:
    return renderFileViewer();
}
```

#### 3.3.2 各ビューの役割
| ビュー | 役割 | レンダリング |
|-------|------|-------------|
| main | ファイルビューアー（デフォルト） | renderFileViewer() |
| edit | Petri Net編集エディタ | renderEditView() |
| experiment | 実験記録システム（未実装） | renderExperimentView() |
| experimentControl | 実験制御画面（未実装） | renderExperimentControlView() |

### 3.4 エラーハンドリング

#### 3.4.1 ErrorBoundary
- 各ビューアー（PetriNetViewer, TiffViewer, ImageViewer）を`<ErrorBoundary>`で包含
- エディタ（PetriNetEditorInner）もErrorBoundaryで保護
- エラー発生時は境界でキャッチし、ユーザーにエラー表示

#### 3.4.2 複数メソッドチェックのエラー
```typescript
catch (error) {
  console.error('❌ [ViewRenderer] 複数メソッドチェックエラー:', error);
  setMethods([]);
  setIsMultiMethod(false);
  setCheckedFileKey(selectedFile.key);
}
```
- パーサーエラーでも処理を継続（単一メソッドとして表示）

---

## 4. データ仕様

### 4.1 Props定義

```typescript
/**
 * ビュータイプ
 */
type ViewType = 'main' | 'edit' | 'experiment' | 'experimentControl';

/**
 * デバイスタイプ
 */
type DeviceType = 'desktop' | 'tablet' | 'mobile';

/**
 * ファイル情報
 */
interface FileInfo {
  key: string;
  name: string;
  content?: string;
  size?: number;
  lastModified?: string;
}

/**
 * ViewRenderer Props
 */
interface ViewRendererProps {
  // 現在のビューモード
  currentView: ViewType;
  
  // ファイル関連
  selectedFile?: FileInfo | null;
  fileContent?: string | null;
  enhancedMode?: boolean;
  downloadingFile?: boolean;
  
  // デバイス情報
  deviceType?: DeviceType;
  isTabletDevice?: boolean;
  isMobileDevice?: boolean;
  
  // UI制御
  hideMethodTabs?: boolean; // メソッド選択Tabsを非表示にする（指示確認タブ用）
  selectedMethodId?: string | null; // 表示するメソッドのID（hideMethodTabs時に使用）
  
  // イベントハンドラー
  onFileDownload?: (fileKey: string, fileName: string) => void;
  onExitEdit?: () => void;
  onExitExperiment?: () => void;
  onExitExperimentControl?: () => void;
  onOpenSubNetViewer?: (subnetData: {
    transitionName: string;
    maimlData: string;
    templateMap: Record<string, { element: Element }>;
    petriNetData: {
      places: Array<{
        id: string;
        data: {
          label?: string;
          stereotype?: string;
          template?: { id: string };
          templateId?: string;
        };
      }>;
      arcs: Array<{
        id: string;
        source: string;
        target: string;
      }>;
    };
  }) => void;
}
```

**Props説明:**
| Prop名 | 型 | 必須 | 説明 |
|--------|---|------|------|
| currentView | ViewType | ✅ | 現在のビューモード（main/edit/experiment/experimentControl） |
| selectedFile | FileInfo \| null | - | 選択中のファイル情報 |
| fileContent | string \| null | - | ファイルの内容（MAIML XML文字列など） |
| enhancedMode | boolean | - | Enhanced v2.0モードの有効化（Parquet/Glue対応） |
| downloadingFile | boolean | - | ファイルダウンロード中フラグ |
| deviceType | DeviceType | - | デバイスタイプ（desktop/tablet/mobile） |
| isTabletDevice | boolean | - | タブレットデバイスフラグ |
| isMobileDevice | boolean | - | モバイルデバイスフラグ |
| hideMethodTabs | boolean | - | メソッド選択タブを非表示にする（指示確認タブ用） |
| selectedMethodId | string \| null | - | 外部から指定する表示メソッドID（hideMethodTabs時） |
| onFileDownload | Function | - | ファイルダウンロード時のコールバック |
| onExitEdit | Function | - | 編集モード終了時のコールバック |
| onExitExperiment | Function | - | 実験記録モード終了時のコールバック |
| onExitExperimentControl | Function | - | 実験制御モード終了時のコールバック |
| onOpenSubNetViewer | Function | - | サブネットビューアー開く時のコールバック |

### 4.2 State定義

```typescript
// 複数メソッド対応
const [loadingMethods, setLoadingMethods] = useState(false);
const [methods, setMethods] = useState<MethodData[]>([]);
const [selectedMethodIndex, setSelectedMethodIndex] = useState<number>(0);
const [isMultiMethod, setIsMultiMethod] = useState(false);
const [checkedFileKey, setCheckedFileKey] = useState<string>('');
```

**State説明:**
| State名 | 型 | 初期値 | 説明 |
|---------|---|--------|------|
| loadingMethods | boolean | false | 複数メソッドチェック中フラグ |
| methods | MethodData[] | [] | 検出されたメソッドのリスト |
| selectedMethodIndex | number | 0 | 選択中のメソッドインデックス |
| isMultiMethod | boolean | false | 複数メソッドフラグ（2個以上の場合true） |
| checkedFileKey | string | '' | 最後にチェックしたファイルのkey（重複チェック防止） |

### 4.3 その他の型定義

```typescript
/**
 * メソッドデータ
 */
interface MethodData {
  methodId: string;
  methodIndex: number;
  name: string;
  places?: Array<{ id: string; type: string; description?: string }>;
  transitions?: Array<{ id: string; description?: string }>;
  arcs?: Array<{ id: string; source: string; target: string }>;
}
```

---

## 5. API連携

### 5.1 使用するAPI一覧

| # | API名 | メソッド | エンドポイント | 状態 | 説明 |
|---|------|---------|---------------|------|------|
| - | （なし） | - | - | - | API呼び出しは親コンポーネントで実施 |

**備考:**
- ViewRendererコンポーネント内では直接APIを呼び出さない
- `fileContent`はPropsとして親コンポーネントから受け取る
- ファイルダウンロードは`onFileDownload`コールバックで親に委譲

---

## 6. エラーハンドリング

### 6.1 エラーケース一覧

| エラーケース | 対処方法 |
|-------------|----------|
| 複数メソッドチェック失敗 | コンソールエラー出力、単一メソッドとして表示継続 |
| PetriNetViewerのエラー | ErrorBoundaryでキャッチ、エラー表示 |
| TiffViewerのエラー | ErrorBoundaryでキャッチ、エラー表示 |
| ImageViewerのエラー | ErrorBoundaryでキャッチ、エラー表示 |
| PetriNetEditorInnerのエラー | ErrorBoundaryでキャッチ、message.error表示 |

### 6.2 エラー処理コード

#### 6.2.1 複数メソッドチェックのエラー
```typescript
try {
  setLoadingMethods(true);
  const parser = new MaimlParserTyped(fileContent);
  const parsedMethods: Method[] = parser.getMethods();
  // ... 処理 ...
} catch (error) {
  console.error('❌ [ViewRenderer] 複数メソッドチェックエラー:', error);
  setMethods([]);
  setIsMultiMethod(false);
  setCheckedFileKey(selectedFile.key);
} finally {
  setLoadingMethods(false);
}
```

#### 6.2.2 エディタのエラー
```typescript
<PetriNetEditorInner
  maimlData={fileContent || null}
  editingFileName={selectedFile?.name}
  editMode="view"
  onError={(error: Error) => {
    console.error('❌ [ViewRenderer] PetriNetEditor error:', error);
    message.error('エディタの初期化に失敗しました');
  }}
/>
```

---

## 7. 実装ファイル

### 7.1 ファイルパス
- **メインファイル**: `frontend/src/components/viewer/ViewRenderer.tsx`

### 7.2 関連ファイル
- **型定義**: `frontend/src/types/maiml-unified.ts`（Method型）
- **パーサー**: `frontend/src/utils/maimlParserTyped.ts`
- **子コンポーネント**:
  - `frontend/src/components/viewer/ErrorBoundary.tsx`
  - `frontend/src/components/viewer/TiffViewer.tsx`
  - `frontend/src/components/viewer/ImageViewer.tsx`
  - `frontend/src/components/viewer/PetriNetViewer.tsx`
  - `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

### 7.3 依存コンポーネント
- `<ErrorBoundary />` - エラー境界コンポーネント
- `<TiffViewer />` - TIFFファイルビューアー
- `<ImageViewer />` - 画像ファイルビューアー
- `<PetriNetViewer />` - Petri Netビューアー
- `<PetriNetEditorInner />` - Petri Net編集エディタ
- `<ReactFlowProvider />` - ReactFlowのContextプロバイダー

### 7.4 依存ライブラリ
- `antd`: Alert, Space, Typography, Card, Button, Tag, Tabs, Spin, message
- `@ant-design/icons`: RocketOutlined, FileTextOutlined, DownloadOutlined, MobileOutlined, TabletOutlined, DesktopOutlined
- `reactflow`: ReactFlowProvider

---

## 8. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-03-12 | 実装ベースで仕様書を再作成 | Cline |
