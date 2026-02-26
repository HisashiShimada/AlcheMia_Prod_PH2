# TiffViewer UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

TIFFファイルを表示するビューアコンポーネント。ブラウザの制限により完全な表示は困難なため、ダウンロード機能を提供します。

### 1.2. 使用場面

- DocumentEditDialogでTIFFファイルを選択した場合
- Result要素に添付されたTIFFファイルを表示する場合
- 科学実験の画像データ（TIFF形式）を閲覧する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌──────────────────────────────────────────────────────────┐
│ 📷 sample_image.tiff                                     │
│ [🔍+ 拡大] [🔍- 縮小] [↻ リセット] [⬇ ダウンロード]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ⚠ TIFF形式はブラウザで直接表示できない場合があります    │
│                                                          │
│  TIFFファイルを表示するには、以下の方法をお試しください：│
│                                                          │
│  1. 「ダウンロード」ボタンでファイルをダウンロード       │
│  2. ローカルの画像ビューアで開く                         │
│  3. または、JPG/PNG形式に変換してアップロード             │
│                                                          │
│                   [⬇ ダウンロード]                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ヘッダー

| 要素 | 説明 |
|------|------|
| アイコン | FileImageOutlined（赤色） |
| ファイル名 | fileName表示 |
| ツールバー | 拡大、縮小、リセット、ダウンロードボタン |

#### 2.2.2. ツールバー

| ボタン | アイコン | 機能 |
|-------|---------|------|
| 拡大 | ZoomInOutlined | 画像を1.2倍に拡大（将来の実装用） |
| 縮小 | ZoomOutOutlined | 画像を1/1.2倍に縮小（将来の実装用） |
| リセット | ReloadOutlined | 倍率を1.0倍に戻す（将来の実装用） |
| ダウンロード | DownloadOutlined | TIFFファイルをダウンロード |

**制約:**
- 拡大上限: 5.0倍
- 縮小下限: 0.1倍
- 現在、拡大縮小は機能として実装されているが、TIFF表示が困難なため実質的には使用されない

#### 2.2.3. 警告メッセージ

**表示内容:**
- Alert コンポーネント（type="warning"）
- 「TIFF形式はブラウザで直接表示できない場合があります」
- 代替案の提示（ダウンロード、ローカルで開く、形式変換）

#### 2.2.4. ダウンロードエリア

**表示内容:**
- ダウンロード手順の説明
- ダウンロードボタン（大きめ）
- ファイル名とファイルサイズの表示

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. TIFF表示の試み

**処理フロー:**
1. fileKeyをpropsから受け取る
2. S3から画像バイナリを取得するAPIエンドポイントを生成
3. `/api/s3/file-binary?key={fileKey}&t={timestamp}`
4. ブラウザがTIFFをサポートしていれば表示
5. サポートしていなければ警告メッセージを表示

**ブラウザの制限:**
- Chrome: TIFF非対応
- Firefox: TIFF非対応
- Safari: 一部のTIFFのみ対応
- Edge: TIFF非対応

#### 3.1.2. ダウンロード機能

**処理フロー:**
1. 「ダウンロード」ボタンをクリック
2. handleDownload() を実行
3. `<a>` タグを動的に生成
4. href に画像バイナリURLを設定
5. download属性にfileNameを設定
6. プログラム的にクリック
7. ブラウザのダウンロードが開始

**実装例:**
```typescript
const link = document.createElement('a');
link.href = imageUrl;
link.download = fileName;
link.click();
```

#### 3.1.3. 拡大機能（将来の実装用）

**処理フロー:**
1. 「拡大」ボタンをクリック
2. handleZoomIn() を実行
3. scale を 1.2倍に更新
4. 上限5.0倍でクリップ
5. transform: scale(scale) を適用

**注意:**
- 現在はTIFFが表示されないため、実質的に使用されない
- 将来的にTIFF変換（Canvas経由）を実装した場合に有効化

#### 3.1.4. 縮小機能（将来の実装用）

**処理フロー:**
1. 「縮小」ボタンをクリック
2. handleZoomOut() を実行
3. scale を 1/1.2倍に更新
4. 下限0.1倍でクリップ
5. transform: scale(scale) を適用

#### 3.1.5. リセット機能（将来の実装用）

**処理フロー:**
1. 「リセット」ボタンをクリック
2. handleReset() を実行
3. scale を 1.0 に戻す
4. transform: scale(1) を適用

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| 拡大ボタン | scale更新（将来用） | scale更新 |
| 縮小ボタン | scale更新（将来用） | scale更新 |
| リセットボタン | scale=1（将来用） | scale=1 |
| ダウンロードボタン | ファイルをダウンロード | なし |

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface TiffViewerProps {
  fileKey: string;    // S3ファイルキー
  fileName: string;   // ファイル名
}
```

### 4.2. State型定義

```typescript
interface State {
  scale: number;  // 倍率（0.1〜5.0）将来の実装用
}
```

---

## 5. UI/UXポリシー準拠

### 5.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Card | ツールバー、メインエリア | size, style, bordered |
| Typography.Title | ヘッダータイトル | level={5} |
| Typography.Text | テキスト表示 | - |
| Button | 各種操作ボタン | type, icon, onClick, size |
| Space | ボタングループ | - |
| Flex | レイアウト | justify, align, vertical |
| Alert | 警告メッセージ | type, message, description, showIcon |

### 5.2. @ant-design/icons使用

- ZoomInOutlined: 拡大ボタン
- ZoomOutOutlined: 縮小ボタン
- ReloadOutlined: リセットボタン
- DownloadOutlined: ダウンロードボタン
- FileImageOutlined: ファイルアイコン

---

## 6. 実装ファイル

### 6.1. ソースファイルパス

```
frontend/src/components/viewer/TiffViewer.tsx
```

### 6.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| DocumentEditDialog | ../editor/DocumentEditDialog | 親コンポーネント |
| ImageViewer | ./ImageViewer | 通常画像ファイル用ビューア |

### 6.3. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| antd | 6.x | UIコンポーネント |
| @ant-design/icons | 5.x | アイコン |
| react | 18.2.0 | Reactライブラリ |

---

## 7. 既知の課題・TODO

- [ ] TIFFをCanvas経由でPNG変換して表示
- [ ] マルチページTIFFの対応
- [ ] TIFF圧縮形式の完全対応
- [ ] サムネイル表示機能

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-12-26 | Ant Design v6対応 | Development Team |
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
| 2.1.0 | 2026-02-25 | APIエンドポイントを `/api/s3/file-binary` → `POST /api/v1/files/view-url`（署名付きURL）に変更。ダウンロードボタンに署名付きURLを使用するよう修正 | Cline |

---

## 9. 使用例

```typescript
<TiffViewer
  fileKey="org_maiml_lab_001/experiments/exp_001/microscope_image.tiff"
  fileName="microscope_image.tiff"
/>
```

---

## 10. APIエンドポイント

### 10.1. 表示用署名付きURL取得

**エンドポイント:**
```
POST /api/v1/files/view-url
```

**リクエストボディ:**
```json
{
  "fileKey": "projects/Sample_Project/microscope.tiff"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "url": "https://swift.example.com/...?temp_url_sig=...",
    "expiresAt": "2026-02-25T16:45:00Z",
    "expiresIn": 3600
  }
}
```

**フロントエンドサービス:**
```typescript
// frontend/src/services/fileAccessService.ts
const url = await getFileViewUrl(fileKey);
// → ダウンロードボタンの href に使用
const link = document.createElement('a');
link.href = url;
link.download = fileName;
link.click();
```

**注意:** ブラウザでのTIFF直接表示はサポートされないため、署名付きURLはダウンロード用として使用します。

---

## 11. TIFF形式について

### 11.1. TIFF（Tagged Image File Format）とは

**特徴:**
- 高品質画像フォーマット
- ロスレス圧縮対応
- マルチページ対応
- 科学画像・医療画像で広く使用

**用途:**
- 顕微鏡画像
- 医療画像（CT、MRI等）
- スキャン文書
- 専門的な写真

### 11.2. ブラウザ対応状況

| ブラウザ | TIFF対応 | 備考 |
|---------|---------|------|
| Chrome | ❌ | 非対応 |
| Firefox | ❌ | 非対応 |
| Safari | △ | 一部のTIFFのみ対応 |
| Edge | ❌ | 非対応 |

**結論:**
- Webブラウザでの表示は困難
- ダウンロードして専用ソフトで開くことを推奨

### 11.3. 代替表示方法（将来の実装候補）

**1. Canvas経由でPNG変換:**
```typescript
// tiff.jsライブラリを使用
import Tiff from 'tiff.js';

const tiff = new Tiff({ buffer: arrayBuffer });
const canvas = tiff.toCanvas();
```

**2. サーバーサイドで変換:**
- S3にアップロード時にPNG/JPGも生成
- サムネイル画像を事前作成

**3. 専用ライブラリ:**
- tiff.js
- geotiff.js
- utif.js

---

## 12. エラーハンドリング

### 12.1. ダウンロード失敗

```typescript
const handleDownload = (): void => {
  try {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    link.click();
  } catch (error) {
    console.error('ダウンロードエラー:', error);
    message.error('ファイルのダウンロードに失敗しました');
  }
};
```

---

## 13. 使用シナリオ

### 13.1. 顕微鏡画像の表示

1. DocumentEditDialogでTIFFファイルを選択
2. TiffViewerが表示される
3. 警告メッセージが表示される
4. 「ダウンロード」ボタンをクリック
5. ローカルに保存される
6. ImageJなどの専用ソフトで開く

### 13.2. 代替案の提示

1. TIFFファイルを選択
2. 警告メッセージで代替案を提示
3. オプション1: ダウンロードして開く
4. オプション2: JPG/PNG形式に変換してアップロード
5. オプション3: 別のビューアを使用

---

## 14. ユーザーガイダンス

### 14.1. 警告メッセージ

```
⚠ TIFF形式はブラウザで直接表示できない場合があります

TIFFファイルを表示するには、以下の方法をお試しください：

1. 「ダウンロード」ボタンでファイルをダウンロード
2. ローカルの画像ビューア（ImageJ、Photoshop等）で開く
3. または、JPG/PNG形式に変換してアップロード

推奨ソフトウェア：
- ImageJ（科学画像解析）
- GIMP（無料画像編集）
- Photoshop（商用）
```

### 14.2. ダウンロード手順

```
ファイル名: microscope_image.tiff
ファイルサイズ: 5.2 MB

1. 「ダウンロード」ボタンをクリック
2. ブラウザのダウンロードフォルダに保存されます
3. 保存されたファイルを画像ビューアで開いてください
```

---

## 15. 将来の拡張

### 15.1. TIFF表示機能の実装

**Phase 1: 基本表示**
- tiff.jsライブラリの統合
- Canvas経由でPNG変換
- 単一ページTIFFの表示

**Phase 2: 高度な機能**
- マルチページTIFFの対応
- ページナビゲーション
- メタデータ表示

**Phase 3: 画像処理**
- 輝度・コントラスト調整
- 疑似カラー表示
- ヒストグラム表示

### 15.2. サーバーサイド変換

**メリット:**
- クライアント側の負荷削減
- すべてのブラウザで表示可能
- 高速な表示

**実装方法:**
- アップロード時にサムネイル生成
- Lambda関数で変換処理
- 変換後の画像をS3に保存
