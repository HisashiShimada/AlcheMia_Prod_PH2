# MAIML検索モーダル UI設計書

---
title: MAIML検索モーダル UI設計書
category: UI設計
version: 1.0.0
last_updated: 2026-01-19
author: Development Team
tags: [search-modal, ui, maiml, search]
---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成（reference/SearchModal.js分析に基づく） | Development Team |

---

## 1. 画面概要

### 1.1 画面名

**日本語名**: MAIML検索モーダル  
**英語名**: MAIML Search Modal  
**コンポーネント名**: SearchModal

### 1.2 画面の目的

S3に保存されたMAIMLファイルを複数の条件で検索し、目的のファイルを効率的に見つけるためのモーダルダイアログです。Document情報、測定データ、ファイル構造、MaiML属性など、様々な角度から検索できます。

### 1.3 アクセス権限

| ロール | アクセス権 | 制限事項 |
|--------|----------|---------|
| System Admin | ○ | 全組織のファイルを検索可能 |
| Data Admin | ○ | 自組織のファイルのみ |
| Experiment Admin | ○ | 自組織のファイルのみ |
| Experiment Worker | ○ | 自組織のファイルのみ |
| MI Engineer | ○ | 自組織のファイルのみ |
| Provider | ○ | 自組織のファイルのみ |

### 1.4 表示タイミング

- プロジェクト管理画面などから「検索」ボタンクリック時
- ファイル選択が必要な画面で検索機能が呼び出された時

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────────────┐
│ [×] MAIML検索                                │ ← ヘッダー
├─────────────────────────────────────────────┤
│ 検索条件                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ 1. [属性▼]        [検索値入力]     [削除] │ │ ← 検索条件1
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 2. [属性▼]        [検索値入力]     [削除] │ │ ← 検索条件2
│ └─────────────────────────────────────────┘ │
│                                               │
│ [条件追加] [リセット] [検索]                  │ ← アクションボタン
│                                               │
│ 検索結果 [2ファイル]                          │
│ ┌─────────────────────────────────────────┐ │
│ │ 📁 sample_project.maiml      [3マッチ]    │ │
│ │ projects/sample_project/sample_project... │ │
│ │ ヒット属性:                                │ │
│ │ [条件1] Document名 (1件) → [実験A]        │ │
│ │ [条件2] 測定値 (5件) → [25.5][25.3]...   │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 📁 experiment_001.maiml      [3マッチ]    │ │
│ │ ...                                        │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 2.2 使用コンポーネント（Material-UI）

| コンポーネント | 用途 | 主要Props |
|--------------|------|----------|
| Dialog | モーダルダイアログ | open, onClose, maxWidth="md", fullWidth |
| DialogTitle | ヘッダー | - |
| DialogContent | コンテンツエリア | pt: 2 |
| Paper | 検索条件カード | elevation: 1, p: 2, mb: 1 |
| FormControl | 属性選択 | flex: 1 |
| Select | 属性ドロップダウン | value, onChange, size="small" |
| MenuItem | 選択肢 | value, disabled, sx: { pl: 4 } |
| TextField | 検索値入力 | size="small", placeholder |
| IconButton | アイコンボタン | onClick, size="small" |
| Button | テキストボタン | variant, startIcon, onClick |
| List | 検索結果リスト | maxHeight: 400px, overflow: auto |
| ListItem | 検索結果アイテム | component: Paper, elevation: 2 |
| Chip | バッジ | label, size="small", color |
| CircularProgress | ローディング | - |
| Alert | エラー表示 | severity: warning |
| Typography | テキスト | variant, fontWeight |
| Box | レイアウト | display: flex, gap |
| Divider | 区切り線 | - |

### 2.3 アイコン

| アイコン | 用途 | インポート元 |
|---------|------|------------|
| SearchIcon | 検索アイコン | @mui/icons-material/Search |
| CloseIcon | 閉じるボタン | @mui/icons-material/Close |
| AddIcon | 条件追加 | @mui/icons-material/Add |
| DeleteIcon | 条件削除 | @mui/icons-material/Delete |
| RefreshIcon | リセット | @mui/icons-material/Refresh |
| FolderIcon | ファイルアイコン | @mui/icons-material/Folder |

---

## 3. コントロール詳細

### 3.1 ヘッダー

#### 3.1.1 タイトル
- **表示**: 🔍アイコン + "MAIML検索"
- **スタイル**: variant="h6", 左寄せ
- **色**: primary

#### 3.1.2 閉じるボタン
- **表示**: ×アイコン
- **位置**: 右上
- **動作**: モーダルを閉じる

### 3.2 検索条件セクション

#### 3.2.1 見出し
- **表示**: "検索条件"
- **スタイル**: variant="subtitle1", fontWeight="bold"

#### 3.2.2 検索条件カード（最大5件）

##### 条件番号
- **表示**: "1.", "2.", "3.", "4.", "5."
- **スタイル**: 最小幅30px, color: text.secondary

##### 属性選択（Select）
- **ラベル**: "属性"
- **サイズ**: small
- **幅**: flex: 1
- **選択肢**: カテゴリ別にグループ化
  - **Document情報**（見出し、太字、無効化）
    - Document UUID
    - Document名
    - Document説明
  - **測定データ**（見出し、太字、無効化）
    - 測定値
    - 単位
  - **ファイル構造**（見出し、太字、無効化）
    - セクション種別
  - **MaiML属性**（見出し、太字、無効化）
    - ID属性
    - Ref属性
    - Key属性
    - Element名
    - 汎用Value

##### 検索値入力（TextField）
- **ラベル**: "検索値"
- **プレースホルダー**: "検索値を入力"
- **サイズ**: small
- **幅**: flex: 1

##### 削除ボタン（IconButton）
- **表示**: 🗑️アイコン
- **色**: error
- **サイズ**: small
- **表示条件**: 2件以上の条件がある場合のみ

#### 3.2.3 アクションボタン

##### 条件追加ボタン
- **表示**: ➕アイコン + "条件追加"
- **バリアント**: outlined
- **サイズ**: small
- **表示条件**: 条件が4件以下の場合のみ

##### リセットボタン
- **表示**: 🔄アイコン + "リセット"
- **バリアント**: outlined
- **サイズ**: small
- **動作**: 検索条件と結果をクリア

##### 検索ボタン
- **表示**: 🔍アイコン + "検索" または "検索中..."
- **バリアント**: contained
- **動作**: 検索API呼び出し
- **無効化**: 検索中の場合

### 3.3 エラー表示

- **コンポーネント**: Alert
- **重要度**: warning
- **表示タイミング**: 
  - 検索条件が未入力の場合
  - 検索結果が0件の場合
  - APIエラーが発生した場合

### 3.4 検索中表示

- **コンポーネント**: CircularProgress
- **位置**: 中央
- **表示条件**: isSearching === true

### 3.5 検索結果セクション

#### 3.5.1 見出し
- **表示**: "検索結果" + バッジ（件数）
- **スタイル**: variant="subtitle1", fontWeight="bold"
- **バッジ色**: primary

#### 3.5.2 検索結果なしの表示
- **コンポーネント**: Paper
- **背景**: grey.50
- **ボーダー**: 点線、grey.300
- **内容**: 
  - 🔍アイコン（大）
  - "検索条件を設定して「検索」ボタンを押してください"

#### 3.5.3 検索結果リスト

##### ファイルカード（ListItem）
- **コンポーネント**: ListItem + Paper
- **elevation**: 2
- **ホバー効果**: bgcolor: action.hover
- **クリック動作**: ファイル選択してモーダルを閉じる

##### ファイル名行
- **表示**: 📁アイコン + ファイル名 + マッチ件数バッジ
- **スタイル**: variant="subtitle2", fontWeight="bold"
- **バッジ**: "3マッチ", color: success, size: small

##### ファイルパス
- **表示**: S3キーまたはフォルダパス
- **スタイル**: 
  - variant="caption"
  - color: text.secondary
  - fontFamily: monospace
  - bgcolor: grey.100
  - p: 0.5, borderRadius: 0.5
  - wordBreak: break-all

##### ヒット属性セクション
- **見出し**: "ヒット属性:"
- **スタイル**: variant="caption", color: text.secondary, fontWeight="bold"

##### ヒット属性詳細（各属性ごと）
1. **条件番号バッジ**
   - **表示**: "条件1", "条件2", "条件3"...
   - **色**: primary
   - **サイズ**: height: 20px, fontSize: 10px

2. **属性名**
   - **表示**: Document名、測定値、単位など
   - **スタイル**: variant="caption", fontWeight="bold"

3. **マッチ件数**
   - **表示**: "(5件)"
   - **スタイル**: variant="caption", color: text.secondary

4. **マッチした値（Chip）**
   - **最大表示件数**: 5件
   - **超過時**: "+n件" バッジ表示
   - **スタイル**: 
     - variant: outlined
     - color: success
     - size: small
     - fontSize: 10px
     - maxWidth: 200px（長い値は省略）

---

## 4. 状態管理

### 4.1 ローカルState

```typescript
const [searchCriteria, setSearchCriteria] = useState([
  { attribute: '', value: '' }
]);
const [searchResults, setSearchResults] = useState([]);
const [isSearching, setIsSearching] = useState(false);
const [error, setError] = useState(null);
```

### 4.2 検索可能な属性の定義

```typescript
const searchableAttributes = [
  { 
    value: 'document.uuid', 
    label: 'Document UUID', 
    category: 'Document情報' 
  },
  { 
    value: 'document.name', 
    label: 'Document名', 
    category: 'Document情報' 
  },
  // ... 他の属性
];
```

---

## 5. イベント処理

### 5.1 モーダル開閉

#### モーダルオープン時
```typescript
useEffect(() => {
  if (isOpen) {
    // 初期化
    setSearchCriteria([{ attribute: '', value: '' }]);
    setSearchResults([]);
    setError(null);
  }
}, [isOpen]);
```

### 5.2 検索条件操作

#### 条件更新
```typescript
const updateSearchCriteria = (index, field, value) => {
  const newCriteria = [...searchCriteria];
  newCriteria[index][field] = value;
  setSearchCriteria(newCriteria);
};
```

#### 条件追加
```typescript
const addSearchCriteria = () => {
  if (searchCriteria.length < 5) {
    setSearchCriteria([...searchCriteria, { attribute: '', value: '' }]);
  }
};
```

#### 条件削除
```typescript
const removeSearchCriteria = (index) => {
  if (searchCriteria.length > 1) {
    const newCriteria = searchCriteria.filter((_, i) => i !== index);
    setSearchCriteria(newCriteria);
  }
};
```

### 5.3 検索実行

```typescript
const handleSearch = async () => {
  setError(null);
  
  // バリデーション
  const validCriteria = searchCriteria.filter(
    criteria => criteria.attribute && criteria.value.trim()
  );
  
  if (validCriteria.length === 0) {
    setError('検索条件を1つ以上設定してください');
    return;
  }

  try {
    setIsSearching(true);
    
    // API呼び出し
    const { searchMaimlFilesMetadata } = require('../services/apiService');
    const results = await searchMaimlFilesMetadata(validCriteria);
    
    // S3パス補正
    const correctedResults = results.map(file => correctS3Path(file));
    
    // マッチ属性情報追加
    const resultsWithMatchedAttributes = correctedResults.map(file => ({
      ...file,
      matchedAttributes: file.matchedAttributes || validCriteria.map(criterion => ({
        attribute: getAttributeDisplayName(criterion.attribute),
        value: criterion.value,
        searchCriterion: criterion.attribute
      }))
    }));
    
    setSearchResults(resultsWithMatchedAttributes);
    
    if (resultsWithMatchedAttributes.length === 0) {
      setError('検索条件に一致するMAIMLファイルが見つかりませんでした');
    }
    
  } catch (err) {
    console.error('検索エラー:', err);
    setError(`検索エラー: ${err.message}`);
    setSearchResults([]);
  } finally {
    setIsSearching(false);
  }
};
```

### 5.4 ファイル選択

```typescript
const handleFileSelect = (file) => {
  const correctedFile = correctS3Path(file);
  
  const fileForViewer = {
    key: correctedFile.key,
    name: correctedFile.maimlFileName,
    size: 0,
    lastModified: new Date().toISOString(),
    s3FolderPath: correctedFile.s3FolderPath,
    metadata: correctedFile.metadata || {}
  };
  
  // キーの正規化
  if (fileForViewer.key.startsWith('s3://')) {
    const keyParts = fileForViewer.key.split('/');
    if (keyParts.length > 3) {
      fileForViewer.key = keyParts.slice(3).join('/');
    }
  }
  
  onFileSelect(fileForViewer);
  onClose();
};
```

### 5.5 リセット

```typescript
const handleReset = () => {
  setSearchCriteria([{ attribute: '', value: '' }]);
  setSearchResults([]);
  setError(null);
};
```

---

## 6. バリデーション

### 6.1 クライアント側バリデーション

| 項目 | ルール | エラーメッセージ |
|------|--------|----------------|
| 検索条件数 | 1〜5件 | "検索条件を1つ以上設定してください" |
| 属性選択 | 必須 | 選択ドロップダウンで制御 |
| 検索値 | 必須、空白不可 | "検索値を入力してください" |

### 6.2 サーバー側バリデーション

APIレスポンスのエラーを表示：
- 400エラー: バリデーションエラー
- 401エラー: 認証エラー
- 403エラー: 権限エラー
- 500エラー: サーバーエラー

---

## 7. スタイリング

### 7.1 モーダルサイズ

```typescript
<Dialog 
  maxWidth="md"
  fullWidth
  PaperProps={{
    sx: { minHeight: '600px', maxHeight: '90vh' }
  }}
>
```

### 7.2 レスポンシブ対応

- **モバイル（xs）**: 全画面表示
- **タブレット（sm, md）**: 最大幅 960px
- **デスクトップ（lg, xl）**: 最大幅 960px

### 7.3 色の使用

| 要素 | 色 | 説明 |
|------|---|------|
| 主要アクション | primary | 検索ボタン |
| 削除アクション | error | 削除ボタン |
| 成功バッジ | success | マッチ件数 |
| セカンダリテキスト | text.secondary | 補足情報 |
| 背景（無効） | grey.100 | S3パス表示 |

---

## 8. API連携

### 8.1 使用するAPI

- **エンドポイント**: `POST /api/v1/maiml/search`
- **詳細**: [api_maiml_search.md](../api/api_maiml_search.md) を参照

### 8.2 リクエスト形式

```typescript
const requestBody = {
  criteria: [
    {
      attribute: "document.name",
      value: "実験A"
    },
    {
      attribute: "measurement_value",
      value: "25.5"
    }
  ]
};
```

### 8.3 レスポンス処理

1. **成功時**: 検索結果を表示
2. **0件の場合**: エラーメッセージ表示
3. **エラー時**: エラーメッセージ表示

---

## 9. S3パス補正ロジック

### 9.1 補正の必要性

検索APIから返却されるS3パスが不完全な場合があるため、クライアント側で補正を行います。

### 9.2 補正処理

```typescript
const correctS3Path = (file) => {
  try {
    const defaultBucket = process.env.REACT_APP_S3_BUCKET_NAME;
    
    let correctedS3FolderPath = file.s3FolderPath;
    let correctedKey = file.key;
    
    // s3://プレフィックス補完
    if (correctedS3FolderPath && !correctedS3FolderPath.startsWith('s3://')) {
      correctedS3FolderPath = `s3://${defaultBucket}/${correctedS3FolderPath}`;
    }
    
    // バケット名チェック
    if (correctedS3FolderPath && correctedS3FolderPath.startsWith('s3://')) {
      const pathParts = correctedS3FolderPath.split('/');
      if (pathParts.length >= 3) {
        const bucketName = pathParts[2];
        if (!bucketName || bucketName.length < 3) {
          const pathWithoutBucket = pathParts.slice(3).join('/');
          correctedS3FolderPath = `s3://${defaultBucket}/${pathWithoutBucket}`;
        }
      }
    }
    
    // keyからフォルダパス生成
    if (!correctedS3FolderPath && correctedKey) {
      const keyParts = correctedKey.split('/');
      if (keyParts.length > 1) {
        const folderPath = keyParts.slice(0, -1).join('/') + '/';
        correctedS3FolderPath = `s3://${defaultBucket}/${folderPath}`;
      }
    }
    
    // keyの正規化
    if (correctedKey && correctedKey.startsWith('s3://')) {
      const s3UriParts = correctedKey.split('/');
      if (s3UriParts.length > 3) {
        correctedKey = s3UriParts.slice(3).join('/');
      }
    }
    
    return {
      ...file,
      s3FolderPath: correctedS3FolderPath,
      key: correctedKey
    };
    
  } catch (error) {
    console.error('S3パス補正エラー:', error);
    const fallbackBucket = process.env.REACT_APP_S3_BUCKET_NAME || 'default-bucket';
    return {
      ...file,
      s3FolderPath: `s3://${fallbackBucket}/`,
      key: file.key || ''
    };
  }
};
```

---

## 10. アクセシビリティ

### 10.1 キーボード操作

- **Tab**: フォーカス移動
- **Enter**: 検索実行（検索ボタンフォーカス時）
- **Esc**: モーダルを閉じる

### 10.2 スクリーンリーダー対応

- モーダルに適切なaria-labelを設定
- フォームコントロールにラベル関連付け
- エラーメッセージにaria-liveを設定

---

## 11. 関連ドキュメント

- [MAIML検索API仕様](../api/api_maiml_search.md)
- [UIポリシー](../../.clinerules/references/ui_policy.md)
- [フロントエンド規約](../../.clinerules/development/frontend.md)

---

## 12. 今後の改善案

### 12.1 ユーザビリティ向上

- 検索履歴の保存・呼び出し
- よく使う検索条件のプリセット保存
- 検索候補の自動補完
- ドラッグ&ドロップでの条件並び替え

### 12.2 機能拡張

- OR条件のサポート
- 範囲検索（数値、日付）
- ワイルドカード検索
- 正規表現検索
- 検索結果のソート・フィルタリング
- 検索結果のエクスポート（CSV、JSON）

### 12.3 パフォーマンス改善

- 検索結果のページネーション
- 無限スクロール
- 検索結果のキャッシング
- デバウンス処理（入力中の自動検索）
