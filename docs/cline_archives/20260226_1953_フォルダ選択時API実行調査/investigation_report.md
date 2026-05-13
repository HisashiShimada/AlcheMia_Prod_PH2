# フォルダ選択時API実行調査レポート

## メタデータ
- **調査日時**: 2026-02-26 19:53
- **調査対象**: フォーマット管理画面 (FormatManagement.tsx)
- **調査者**: Cline

## 1. 質問内容

**質問**: フォーマット管理画面ではフォルダを選択するたびにAPIを実行して表示しているが、これはなぜ？

## 2. 調査結果

### 2.1 該当コードの特定

**ファイル**: `frontend/src/components/project/FormatManagement.tsx`  
**行数**: 587-637行目

```typescript
// フォーマット選択時、またはフォルダ移動時にファイルを取得
const [isLoadingFiles, setIsLoadingFiles] = React.useState(false);

React.useEffect(() => {
  const loadFormatFiles = async () => {
    if (!selectedFormatId || !selectedFormat) {
      console.log('⏳ [FormatManagement] No format selected, skipping file load');
      return;
    }
    
    try {
      setIsLoadingFiles(true);
      
      // 現在のフォルダパスを取得
      const currentPath = currentFolderPath.length > 0 
        ? currentFolderPath.join('/')
        : undefined;
      
      console.log('📂 [FormatManagement] Loading files for format:', selectedFormat.name, 'path:', currentPath || 'root');
      
      // 現在のフォルダの直下のファイル・フォルダのみを取得
      const fileResponse = await fetchFormatFiles(selectedFormatId, currentPath);
      
      const files = (fileResponse.success && fileResponse.data?.files) ? fileResponse.data.files as FormatFileData[] : [];
      
      console.log('✅ [FormatManagement] Files loaded:', files.length);
      
      // キャッシュキーを生成（フォーマットID + パス）
      const cacheKey = currentPath 
        ? `${selectedFormatId}/${currentPath}`
        : selectedFormatId;
      
      setFormatFilesData(prev => ({
        ...prev,
        [cacheKey]: { allFiles: files }
      }));
    } catch (error) {
      console.error('❌ [FormatManagement] Failed to fetch format files:', error);
      message.error('ファイル一覧の取得に失敗しました');
    } finally {
      setIsLoadingFiles(false);
    }
  };
  
  loadFormatFiles();
}, [selectedFormatId, selectedFormat, currentFolderPath]);
```

### 2.2 API実行のトリガー

このuseEffectは以下の3つの依存配列を監視しています：
1. **selectedFormatId** - フォーマット選択時
2. **selectedFormat** - フォーマット情報変更時
3. **currentFolderPath** - フォルダ移動時 ⭐

つまり、**フォルダを選択（移動）するたびに`currentFolderPath`が変わり、useEffectが発火してAPIが実行される**仕組みになっています。

### 2.3 API実行の理由

#### ✅ 合理的な理由

1. **S3の階層構造に基づく設計**
   - バックエンドAPI (`GET /api/v1/formats/:formatId/files`) は、指定されたパスの直下のファイル・フォルダのみを返す設計
   - すべてのファイルを一度に取得すると、データ量が膨大になる可能性がある
   - 必要な時に必要な分だけ取得する「遅延ロード」方式

2. **パフォーマンスの最適化**
   - ルートに数百～数千のファイルがある場合、すべてを一度に取得・表示すると重くなる
   - 現在のフォルダの内容だけを取得することで、初期表示を高速化

3. **リアルタイム性の確保**
   - フォルダを移動するたびに最新の状態をサーバーから取得
   - 他のユーザーがファイルを追加・削除した場合にも最新状態を表示できる

4. **キャッシュ機構の実装**
   ```typescript
   // キャッシュキーを生成（フォーマットID + パス）
   const cacheKey = currentPath 
     ? `${selectedFormatId}/${currentPath}`
     : selectedFormatId;
   
   setFormatFilesData(prev => ({
     ...prev,
     [cacheKey]: { allFiles: files }  // 一度取得したデータはキャッシュに保存
   }));
   ```
   - 一度取得したフォルダのデータは`formatFilesData`にキャッシュされる
   - 同じフォルダに戻った場合、キャッシュが使用される（再度API呼び出しは不要）

### 2.4 フォルダ移動のフロー

```
1. ユーザーがフォルダをクリック
   ↓
2. handleFolderClick() が実行
   ↓
3. currentFolderPath が更新される
   例: [] → ['subfolder1'] → ['subfolder1', 'subfolder2']
   ↓
4. useEffect が発火（currentFolderPath 変更を検知）
   ↓
5. fetchFormatFiles(formatId, currentPath) でAPI呼び出し
   ↓
6. 取得したファイル一覧をキャッシュに保存
   ↓
7. FormatFileListTable で表示
```

## 3. 設計の妥当性評価

### ✅ 良い点

1. **スケーラビリティ**
   - ファイル数が増えても初期表示は高速
   - 必要な時に必要な分だけ取得

2. **キャッシュによる最適化**
   - 一度訪れたフォルダは再度API呼び出し不要（※ただし現在の実装では完全には機能していない）

3. **リアルタイム性**
   - 常に最新の状態を表示

4. **ユーザビリティ**
   - 読み込み中は`isLoadingFiles`でスピナー表示
   - ユーザーに待ち時間が明示される

### ⚠️ 改善の余地

1. **キャッシュの有効活用が不十分**
   - 現在の実装では、同じフォルダに戻ってもuseEffectが発火してAPIを呼び出している
   - キャッシュがある場合はAPI呼び出しをスキップする処理を追加すべき

2. **不要なAPI呼び出し**
   - フォルダ作成後、ファイル作成後に明示的にAPI呼び出しを行っているが、useEffectも発火するため二重に呼び出される可能性がある

## 4. 代替案の検討

### 案1: 初回にすべてのファイルを取得
❌ **非推奨**
- ファイル数が多い場合、初期表示が遅くなる
- S3のリスト操作が重くなる
- メモリ使用量が増加

### 案2: 現在の設計（遅延ロード） + キャッシュ最適化
✅ **推奨**
- 現在の設計を維持
- キャッシュチェックを追加して不要なAPI呼び出しを削減

```typescript
React.useEffect(() => {
  const loadFormatFiles = async () => {
    if (!selectedFormatId || !selectedFormat) {
      return;
    }
    
    const currentPath = currentFolderPath.length > 0 
      ? currentFolderPath.join('/')
      : undefined;
    
    const cacheKey = currentPath 
      ? `${selectedFormatId}/${currentPath}`
      : selectedFormatId;
    
    // ✅ キャッシュがあればAPI呼び出しをスキップ
    if (formatFilesData[cacheKey]) {
      console.log('📦 [FormatManagement] Using cached data for:', cacheKey);
      return;
    }
    
    // キャッシュがない場合のみAPI呼び出し
    try {
      setIsLoadingFiles(true);
      const fileResponse = await fetchFormatFiles(selectedFormatId, currentPath);
      // ... 以降の処理
    } catch (error) {
      // ...
    } finally {
      setIsLoadingFiles(false);
    }
  };
  
  loadFormatFiles();
}, [selectedFormatId, selectedFormat, currentFolderPath, formatFilesData]);
```

### 案3: 仮想スクロール + ページネーション
⭕ **将来的に検討**
- ファイル数が非常に多い場合（10,000件以上）に有効
- 現時点では過剰最適化の可能性あり

## 5. まとめ

### 質問への回答

**Q: フォーマット管理画面ではフォルダを選択するたびにAPIを実行して表示しているが、これはなぜ？**

**A: 以下の理由により、現在の設計は合理的です：**

1. **S3の階層構造に基づく設計** - 各フォルダの内容を個別に取得
2. **パフォーマンス最適化** - 必要な時に必要な分だけ取得（遅延ロード）
3. **リアルタイム性** - フォルダ移動時に最新の状態を取得
4. **キャッシュ機構** - 一度取得したデータは保存される

ただし、キャッシュチェックを追加することで、不要なAPI呼び出しを削減できる余地があります。

### 推奨事項

現在の設計は適切ですが、以下の最適化を推奨します：

1. **キャッシュチェックの追加**
   - 既にキャッシュがある場合はAPI呼び出しをスキップ
   
2. **明示的なキャッシュ無効化**
   - ファイル作成・削除・アップロード後は該当フォルダのキャッシュを削除
   - 手動リフレッシュボタンではすべてのキャッシュをクリア

3. **ローディング状態の改善**
   - スケルトンUIの導入
   - より詳細な進捗表示

## 6. 関連ファイル

- `frontend/src/components/project/FormatManagement.tsx` - メインコンポーネント
- `frontend/src/utils/formatApi.ts` - API呼び出し関数
- `backend/src/routes/formatRoutes.ts` - バックエンドAPI

## 7. 参考情報

- S3フォルダ構成: `.clinerules/references/s3_structure.md`
- フォーマット管理画面設計: `docs/design/ui/ui_screen_list.md`
