# ImageViewer UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

画像ファイル（JPG、PNG、GIF等）を表示し、拡大縮小、リセット機能を提供するビューアコンポーネント。

### 1.2. 使用場面

- DocumentEditDialogで画像ファイルを選択した場合
- Result要素に添付された画像ファイルを表示する場合
- 実験データに含まれる画像を閲覧する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌──────────────────────────────────────────────────────────┐
│ 📷 sample_image.png                                      │
│ [🔍+ 拡大] [🔍- 縮小] [↻ リセット]                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                                                          │
│                   [  画像表示エリア  ]                    │
│                   ( 800 x 600 px )                       │
│                   倍率: 1.0x                             │
│                                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ヘッダー

| 要素 | 説明 |
|------|------|
| アイコン | FileImageOutlined |
| ファイル名 | fileName表示 |
| ツールバー | 拡大、縮小、リセットボタン |

#### 2.2.2. ツールバー

| ボタン | アイコン | 機能 |
|-------|---------|------|
| 拡大 | ZoomInOutlined | 画像を1.2倍に拡大 |
| 縮小 | ZoomOutOutlined | 画像を1/1.2倍に縮小 |
| リセット | ReloadOutlined | 倍率を1.0倍に戻す |

**制約:**
- 拡大上限: 5.0倍
- 縮小下限: 0.1倍

#### 2.2.3. 画像表示エリア

**表示方式:**
- Ant Design Image コンポーネントを使用
- preview機能を有効化（クリックで拡大プレビュー）
- transform: scale() で倍率を適用

**サイズ情報:**
- 画像の実サイズ（width x height）を表示
- 現在の倍率を表示

#### 2.2.4. ローディング状態

**表示内容:**
- Spin コンポーネント
- LoadingOutlined アイコン
- 「読み込み中...」メッセージ

#### 2.2.5. エラー状態

**表示内容:**
- Alert コンポーネント（type="error"）
- エラーメッセージ
- 「画像の読み込みに失敗しました」

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. 画像読み込み

**処理フロー:**
1. fileKeyをpropsから受け取る
2. S3から画像バイナリを取得するAPIを呼び出し
3. `/api/s3/file-binary?key={fileKey}&t={timestamp}`
4. Imageオブジェクトで画像を読み込み
5. onloadイベントで成功判定
6. onerrorイベントでエラー処理

**タイムスタンプ付きURL:**
- キャッシュ回避のため、クエリパラメータにtimestampを付与
- `&t=${new Date().getTime()}`

#### 3.1.2. 画像サイズ取得

**処理フロー:**
1. Imageオブジェクトのonloadで実行
2. img.width と img.height を取得
3. imageDimensions stateに保存
4. 画面に「{width} x {height} px」を表示

#### 3.1.3. 拡大機能

**処理フロー:**
1. 「拡大」ボタンをクリック
2. handleZoomIn() を実行
3. scale を 1.2倍に更新
4. 上限5.0倍でクリップ
5. transform: scale(scale) を適用

**計算式:**
```typescript
newScale = Math.min(scale * 1.2, 5);
```

#### 3.1.4. 縮小機能

**処理フロー:**
1. 「縮小」ボタンをクリック
2. handleZoomOut() を実行
3. scale を 1/1.2倍に更新
4. 下限0.1倍でクリップ
5. transform: scale(scale) を適用

**計算式:**
```typescript
newScale = Math.max(scale / 1.2, 0.1);
```

#### 3.1.5. リセット機能

**処理フロー:**
1. 「リセット」ボタンをクリック
2. handleReset() を実行
3. scale を 1.0 に戻す
4. transform: scale(1) を適用

#### 3.1.6. プレビュー機能（Ant Design Image）

**処理フロー:**
1. 画像をクリック
2. Ant Design Image の preview 機能が起動
3. 全画面プレビューモーダルが表示
4. ズーム、回転、ダウンロード機能が利用可能
5. Escapeキーまたは閉じるボタンでモーダルを閉じる

#### 3.1.7. クリーンアップ処理

**処理フロー:**
1. fileKeyが変更された場合
2. useEffectのクリーンアップ関数を実行
3. imageUrl, loading, error をリセット
4. 新しいfileKeyで画像を再読み込み

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| 拡大ボタン | 画像を1.2倍に拡大 | scale更新 |
| 縮小ボタン | 画像を1/1.2倍に縮小 | scale更新 |
| リセットボタン | 倍率を1.0に戻す | scale=1 |
| 画像クリック | プレビューモーダル表示 | Ant Design Image処理 |

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface ImageViewerProps {
  fileKey: string;    // S3ファイルキー
  fileName: string;   // ファイル名
}
```

### 4.2. State型定義

```typescript
interface State {
  imageUrl: string | null;               // 画像URL
  loading: boolean;                      // ローディング状態
  error: string | null;                  // エラーメッセージ
  scale: number;                         // 倍率（0.1〜5.0）
  imageDimensions: {
    width: number;                       // 画像幅（px）
    height: number;                      // 画像高さ（px）
  };
}
```

---

## 5. UI/UXポリシー準拠

### 5.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Card | 外側のコンテナ | bordered, style |
| Typography.Title | ヘッダータイトル | level={4} |
| Typography.Text | テキスト表示 | - |
| Button | 各種操作ボタン | type, icon, onClick |
| Space | ボタングループ | size |
| Flex | レイアウト | justify, align, vertical |
| Image | 画像表示 | src, alt, preview, style |
| Spin | ローディング | indicator, tip |
| Alert | エラー表示 | type, message, showIcon |

### 5.2. @ant-design/icons使用

- ZoomInOutlined: 拡大ボタン
- ZoomOutOutlined: 縮小ボタン
- ReloadOutlined: リセットボタン
- FileImageOutlined: ファイルアイコン
- LoadingOutlined: ローディングアイコン

---

## 6. 実装ファイル

### 6.1. ソースファイルパス

```
frontend/src/components/viewer/ImageViewer.tsx
```

### 6.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| DocumentEditDialog | ../editor/DocumentEditDialog | 親コンポーネント |
| TiffViewer | ./TiffViewer | TIFFファイル専用ビューア |

### 6.3. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| antd | 6.x | UIコンポーネント |
| @ant-design/icons | 5.x | アイコン |
| react | 18.2.0 | Reactライブラリ |

---

## 7. 既知の課題・TODO

- [ ] 画像の回転機能
- [ ] 画像の反転機能
- [ ] 画像の明るさ・コントラスト調整
- [ ] 複数画像のギャラリー表示

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-12-26 | Ant Design v6対応 | Development Team |
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 9. 使用例

```typescript
<ImageViewer
  fileKey="org_maiml_lab_001/experiments/exp_001/result_image.png"
  fileName="result_image.png"
/>
```

---

## 10. APIエンドポイント

### 10.1. 画像バイナリ取得

**エンドポイント:**
```
GET /api/s3/file-binary?key={fileKey}&t={timestamp}
```

**クエリパラメータ:**
| パラメータ | 必須 | 説明 |
|-----------|-----|------|
| key | ○ | S3ファイルキー |
| t | ○ | タイムスタンプ（キャッシュ回避） |

**レスポンス:**
- Content-Type: image/jpeg, image/png, image/gif等
- バイナリデータ

---

## 11. エラーハンドリング

### 11.1. 画像読み込みエラー

```typescript
img.onerror = (e) => {
  console.error('画像読み込みエラー:', e);
  setError('画像の読み込みに失敗しました。サポートされていない形式かもしれません。');
  setLoading(false);
};
```

**エラー表示:**
```tsx
{error && (
  <Alert
    type="error"
    message="エラー"
    description={error}
    showIcon
  />
)}
```

### 11.2. ネットワークエラー

APIエンドポイントに接続できない場合、onerrorが発火してエラーメッセージを表示します。

---

## 12. パフォーマンス最適化

### 12.1. useEffectのクリーンアップ

```typescript
useEffect(() => {
  const cleanup = () => {
    setImageUrl(null);
    setLoading(true);
    setError(null);
  };

  cleanup(); // 初期化

  // 画像読み込み処理...

  return cleanup; // クリーンアップ関数を返す
}, [fileKey]);
```

### 12.2. 画像キャッシュ

- ブラウザの標準的な画像キャッシュを利用
- タイムスタンプ付きURLで必要時にキャッシュ更新

---

## 13. アクセシビリティ

### 13.1. alt属性

```typescript
<Image
  src={imageUrl}
  alt={fileName}
  // ...
/>
```

### 13.2. キーボード操作

- Tab: フォーカス移動
- Enter/Space: ボタンクリック
- Escape: プレビューモーダルを閉じる

---

## 14. 対応画像形式

### 14.1. サポート形式

| 形式 | 拡張子 | 説明 |
|------|-------|------|
| JPEG | .jpg, .jpeg | 一般的な画像形式 |
| PNG | .png | 透過対応 |
| GIF | .gif | アニメーション対応 |
| WebP | .webp | 次世代画像形式 |
| SVG | .svg | ベクター画像 |

**注意:**
- TIFF形式は TiffViewer コンポーネントを使用

### 14.2. 非対応形式

- TIFF（.tif, .tiff） → TiffViewer を使用
- RAW形式
- HEIC形式（iOS専用）

---

## 15. スタイリング

### 15.1. 画像表示スタイル

```typescript
{
  width: '100%',
  height: 'auto',
  maxHeight: '600px',
  objectFit: 'contain',
  transform: `scale(${scale})`,
  transformOrigin: 'center',
  transition: 'transform 0.2s ease-out'
}
```

### 15.2. レスポンシブ対応

- maxHeight: 600px（大画面）
- maxHeight: 400px（モバイル）
- width: 100%（親要素に応じる）

---

## 16. 使用シナリオ

### 16.1. 実験結果画像の表示

1. DocumentEditDialogでResultファイルを選択
2. 画像ファイル（.png）が添付されている
3. ImageViewerが表示される
4. 画像が読み込まれて表示される
5. 拡大ボタンで詳細を確認
6. 画像クリックで全画面プレビュー

### 16.2. 拡大・縮小操作

1. 初期表示（倍率1.0x）
2. 拡大ボタンを3回クリック（1.0 → 1.2 → 1.44 → 1.728）
3. 細部を確認
4. リセットボタンで元の倍率に戻す

### 16.3. エラーハンドリング

1. 存在しない画像ファイルを指定
2. ローディング表示
3. 読み込みエラー発生
4. エラーメッセージが表示される
