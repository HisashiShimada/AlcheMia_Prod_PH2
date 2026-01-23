# FormatUploadDialog UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

フォーマット管理画面用の一括ファイルアップロードダイアログ。単一ファイル、一括ファイル、フォルダ構造を保持したアップロードの3つのモードをサポートします。

### 1.2. 使用場面

- FormatManagement画面の「アップロード」ボタンクリック時
- 複数のフォーマットファイルを一度にアップロードする場合
- フォルダ構造を保持してアップロードする場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌───────────────────────────────────────────────┐
│ ファイルアップロード                           │
├───────────────────────────────────────────────┤
│ アップロードタイプ                             │
│ [📄単一] [📦一括] [📁フォルダ]               │
│                                               │
│ ┌─────────────────────────────────────────┐  │
│ │       📦                                 │  │
│ │   ファイルをドラッグ&ドロップ            │  │
│ │ または、クリックしてファイルを選択        │  │
│ └─────────────────────────────────────────┘  │
│                                               │
│ 選択ファイル (2個)                            │
│ ┌─────────────────────────────────────────┐  │
│ │ template1.xml                    2.5 KB │  │
│ │ workflow.maiml                   3.2 KB │  │
│ │ 総サイズ: 5.7 KB                         │  │
│ └─────────────────────────────────────────┘  │
│ ──────────────────────────────────────────   │
│ アップロード先フォルダ                        │
│ ベースフォルダ: 材料データフォーマット        │
│ [サブフォルダを選択（省略可） ▼]             │
│ 選択パス: formats/materials/templates        │
│                                               │
│ ☑ フォルダ構造を保持する                     │
│                                               │
├───────────────────────────────────────────────┤
│                     [キャンセル] [アップロード]│
└───────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. モーダルヘッダー

| 要素 | 説明 |
|------|------|
| タイトル | 「ファイルアップロード」 |

#### 2.2.2. アップロードタイプ（Segmented）

| モード | アイコン | 説明 | 制限 |
|--------|---------|------|------|
| 単一ファイル | FileOutlined | 1つのファイルをアップロード | 1ファイルのみ |
| 一括ファイル | InboxOutlined | 複数ファイルを一度にアップロード | 制限なし |
| フォルダ | FolderOutlined | フォルダごとアップロード（構造保持） | 制限なし |

#### 2.2.3. ファイル選択エリア

**ドラッグ&ドロップエリア（単一・一括モード）:**

| 要素 | 説明 |
|------|------|
| アイコン | InboxOutlined（48px、色: #0093CF） |
| メインテキスト | 「ファイルをドラッグ&ドロップ」 |
| サブテキスト | 「または、クリックしてファイルを選択」 |
| 対応形式 | .maiml, .xml, .json, .txt, .csv, .png, .jpg, .jpeg, .gif, .pdf, .tif, .tiff, .bmp, .svg, .webp |

**フォルダ選択ボタン（フォルダモード）:**

| 要素 | 説明 |
|------|------|
| ボタン | 「フォルダを選択」（FolderOutlined、large） |
| 動作 | 非表示のinput要素をトリガー |

#### 2.2.4. 選択ファイル表示エリア

| 項目 | 説明 |
|------|------|
| ヘッダー | 「選択ファイル (N個)」 |
| ファイルリスト | 最大10件表示、スクロール可能（最大高さ200px） |
| ファイル名 | 左寄せ、ellipsis対応 |
| ファイルサイズ | 右寄せ、フォーマット済み |
| 総サイズ | 青背景エリアに表示 |

#### 2.2.5. アップロード先フォルダ選択

| 要素 | 説明 |
|------|------|
| ベースフォルダ表示 | 灰色背景、選択されたフォーマット名 |
| サブフォルダ選択 | Cascader（階層選択、検索可能） |
| 選択パス表示 | 青背景、完全なパス文字列 |

#### 2.2.6. オプション

| オプション | 表示条件 | デフォルト |
|----------|---------|----------|
| フォルダ構造を保持する | 一括・フォルダモードのみ | チェック済み |

#### 2.2.7. 進行状況表示

| 状態 | 表示内容 |
|------|---------|
| アップロード中 | Alert（info）+ Progress（active） + ファイル数表示 |
| 完了 | Alert（success）+ CheckCircleOutlined |
| エラー | Alert（error）+ CloseCircleOutlined + エラーメッセージ |

#### 2.2.8. フッターボタン

| ボタン | スタイル | 状態 | 動作 |
|--------|---------|------|------|
| キャンセル | default | アップロード中は無効 | モーダルを閉じる |
| アップロード開始 | primary | ファイル未選択・アップロード中は無効 | アップロード実行 |

### 2.3. 画面遷移

- 画面遷移なし
- アップロード完了後、2秒後に自動的にクリア
- onUploadCompleteコールバックで親に通知

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. モーダル表示

**処理フロー:**
1. 親コンポーネントからopen=trueで呼び出される
2. baseFolderがnullの場合は警告メッセージを表示
3. baseFolderがある場合は通常のアップロードUIを表示

**警告表示（ベースフォルダ未選択）:**
```
タイトル: 「フォーマットが選択されていません」
説明: 「先にフォーマットを選択してください。」
タイプ: warning
```

#### 3.1.2. アップロードモードの切り替え

**処理フロー:**
1. Segmentedコンポーネントで3つのモードを選択
2. モード変更時にfileListをクリア
3. フォルダモードの場合はDraggerではなくボタン表示

**モード別の動作:**

| モード | ファイル選択方法 | 複数選択 | 構造保持オプション |
|--------|----------------|---------|------------------|
| 単一ファイル | Dragger | 不可（最後の1つのみ） | 非表示 |
| 一括ファイル | Dragger | 可 | 表示 |
| フォルダ | 非表示inputでディレクトリ選択 | 可 | 表示 |

#### 3.1.3. ファイル選択（単一・一括モード）

**処理フロー:**
1. Draggerコンポーネントでドラッグ&ドロップまたはクリック選択
2. beforeUploadでfalseを返し、自動アップロードを無効化
3. onChange時にfileListを更新
4. 単一モードの場合は最後の1つのみ保持

**対応ファイル形式:**
```typescript
accept=".maiml,.xml,.json,.txt,.csv,.png,.jpg,.jpeg,.gif,.pdf,.tif,.tiff,.bmp,.svg,.webp"
```

#### 3.1.4. フォルダ選択（フォルダモード）

**処理フロー:**
1. 非表示のinput要素（webkitdirectory属性付き）を使用
2. ボタンクリックでinputをトリガー
3. フォルダ選択時、全ファイルをwebkitRelativePathと共に取得
4. UploadFile配列に変換してfileListに設定

**webkitRelativePath:**
- フォルダ構造を保持するためのパス情報
- 例: `materials/templates/template1.xml`

#### 3.1.5. ファイルリストの表示

**処理フロー:**
1. fileList配列の内容を表示
2. 10件まで表示、それ以上は「他N件...」
3. 各ファイルの名前とサイズを表示
4. 総サイズを計算して表示

**ファイルサイズフォーマット:**
- 1024未満: `X Bytes`
- 1024以上、1MB未満: `X.XX KB`
- 1MB以上、1GB未満: `X.XX MB`
- 1GB以上: `X.XX GB`

#### 3.1.6. サブフォルダ選択

**処理フロー:**
1. 親から受け取ったsubFolders配列をCascaderに渡す
2. 階層構造で選択可能
3. 検索機能（showSearch）有効
4. 一括・フォルダモードではchangeOnSelect=trueで途中階層選択可能

**Cascader options形式:**
```typescript
[
  {
    value: 'templates',
    label: 'テンプレート',
    children: [
      {
        value: 'materials',
        label: '材料'
      }
    ]
  }
]
```

**選択パス表示:**
- ベースフォルダ + 選択されたサブフォルダのパス
- 例: `formats/materials/templates`

#### 3.1.7. フォルダ構造保持オプション

**処理フロー:**
1. 一括・フォルダモードのみ表示
2. Checkboxでオン/オフ切り替え
3. オン: webkitRelativePathを保持してアップロード
4. オフ: ファイル名のみでアップロード（フラット化）

#### 3.1.8. アップロード実行

**処理フロー:**
1. ファイル選択チェック（0件の場合は警告）
2. ベースフォルダチェック（nullの場合はエラー）
3. アップロード状態を設定（isUploading=true）
4. 各ファイルを順次アップロード（モック処理）
5. 進行状況を更新（uploadedCount、progress）
6. 完了後、2秒後に自動リセット
7. onUploadCompleteコールバックを呼び出し

**進行状況の更新:**
```typescript
progress = Math.round((uploadedCount / totalCount) * 100)
```

**完了後の自動リセット:**
- fileListをクリア
- uploadStateを初期化
- 2秒のディレイ

#### 3.1.9. エラーハンドリング

**エラーケース:**
1. ファイル未選択でアップロード実行
2. ベースフォルダ未選択
3. アップロードAPI呼び出し失敗

**エラー表示:**
- Alert（error）コンポーネント
- closable（ユーザーが手動で閉じられる）

#### 3.1.10. モーダルを閉じる

**処理フロー:**
1. アップロード中の場合は確認ダイアログ表示
2. 確認後、onClose()コールバックを呼び出し
3. アップロード中でない場合は即座に閉じる

**確認ダイアログ:**
```
タイトル: 「アップロード中」
内容: 「アップロード処理が進行中です。キャンセルしますか？」
```

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| モード切り替え | fileListをクリア | uploadMode変更 |
| ファイル選択（Dragger） | fileList更新 | fileList変更 |
| フォルダ選択ボタン | input要素をトリガー | - |
| サブフォルダ選択 | パス更新 | selectedSubFolder変更 |
| 構造保持チェック | オプション切り替え | preserveFolderStructure変更 |
| アップロード開始 | アップロード実行 | uploadState変更 |
| キャンセル | モーダルを閉じる | - |

### 3.3. バリデーションルール

| ルール | タイミング | エラーメッセージ |
|--------|----------|----------------|
| ファイル選択チェック | アップロード開始時 | 「ファイルを選択してください」 |
| ベースフォルダチェック | アップロード開始時 | 「ベースフォルダが選択されていません」 |

---

## 4. データ仕様

### 4.1. 入力項目（Props）

```typescript
interface FormatUploadDialogProps {
  open: boolean;                      // ダイアログ表示状態
  onClose: () => void;                // 閉じる時のコールバック
  onUploadComplete?: (result: {       // アップロード完了時のコールバック
    mode: UploadMode;
    fileCount: number;
    success: boolean;
  }) => void;
  baseFolder: {                       // ベースフォルダ（必須）
    id: string;
    name: string;
    folderName: string;
  } | null;
  subFolders?: Array<{                // サブフォルダ一覧（オプション）
    value: string;
    label: string;
    children?: Array<{
      value: string;
      label: string;
    }>;
  }>;
}
```

### 4.2. UploadMode型定義

```typescript
type UploadMode = 'single' | 'bulk' | 'folder';
```

### 4.3. UploadState型定義

```typescript
interface UploadState {
  isUploading: boolean;    // アップロード中フラグ
  progress: number;        // 進行状況（0-100）
  uploadedCount: number;   // アップロード完了ファイル数
  totalCount: number;      // 総ファイル数
  error: string | null;    // エラーメッセージ
}
```

### 4.4. 出力項目

**onUploadComplete コールバック引数:**
```typescript
{
  mode: UploadMode;       // 使用したアップロードモード
  fileCount: number;      // アップロードしたファイル数
  success: boolean;       // 成功/失敗
}
```

---

## 5. API連携

### 5.1. 使用するAPI一覧

| API | メソッド | 説明 | 実装状態 |
|-----|---------|------|---------|
| uploadFormatFiles | POST | フォーマットファイルアップロード | TODO |

### 5.2. リクエスト仕様

```typescript
// TODO: API実装後に追加
POST /api/v1/formats/upload
Content-Type: multipart/form-data

FormData:
- files: File[]
- baseFolder: string
- subFolder?: string
- preserveStructure: boolean
```

---

## 6. エラーハンドリング

### 6.1. エラーケース

| エラーケース | 処理 |
|------------|------|
| ファイル未選択 | message.warning「ファイルを選択してください」 |
| ベースフォルダ未選択 | message.error「ベースフォルダが選択されていません」 |
| アップロードAPI失敗 | Alert（error）+ エラーメッセージ |
| アップロード中のキャンセル | 確認ダイアログ表示 |

### 6.2. エラーメッセージ

| メッセージ | 表示タイミング | 種類 |
|----------|--------------|------|
| 「ファイルを選択してください」 | ファイル未選択でアップロード | message.warning |
| 「ベースフォルダが選択されていません」 | ベースフォルダ未選択 | message.error |
| 「アップロードに失敗しました」 | API呼び出し失敗 | Alert（error） |
| 「アップロード処理が進行中です。キャンセルしますか？」 | アップロード中のキャンセル | Modal.confirm |

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Modal | ダイアログ本体 | title, open, onCancel, width={800}, footer, styles |
| Segmented | モード選択 | value, onChange, block, options, disabled |
| Upload.Dragger | ファイル選択（単一・一括） | fileList, onChange, beforeUpload, multiple, disabled, accept, showUploadList={false} |
| Button | フォルダ選択、フッターボタン | icon, onClick, disabled, block, size, type, loading |
| Cascader | サブフォルダ選択 | options, value, onChange, placeholder, disabled, expandTrigger="hover", showSearch, changeOnSelect, allowClear |
| Checkbox | 構造保持オプション | checked, onChange, disabled |
| Alert | 情報・進行状況・エラー表示 | message, description, type, showIcon, icon, closable |
| Progress | アップロード進行状況 | percent, status="active" |
| Space | 要素の配置 | direction, size |
| Typography.Text | テキスト表示 | strong, type, ellipsis, title |
| Divider | セクション区切り | - |

### 7.2. カラーパレット

```typescript
// アップロードアイコン色
#0093CF  // 青系

// ベースフォルダ背景
#F0F0F0  // 薄い灰色

// 選択パス背景
#E6F7FC  // 薄い青
color: #007AB3  // 濃い青

// 選択ファイルエリア背景
#f5f5f5  // 薄い灰色
```

### 7.3. 多言語対応

- 現在は日本語のみ
- 将来的に多言語化が必要

### 7.4. レスポンシブ対応

- モーダル幅: 800px（固定）
- モーダル高さ: 最大70vh、スクロール可能
- ファイルリスト: 最大高さ200px、スクロール可能
- モバイルでは自動的に幅が調整される（Ant Designのデフォルト動作）

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/project/FormatUploadDialog.tsx
```

### 8.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| FormatManagement | ./FormatManagement.tsx | 親コンポーネント |

### 8.3. ユーティリティ

- formatFileSize(): ファイルサイズをフォーマット（コンポーネント内に実装）

---

## 9. 既知の課題・TODO

### 実装待ち

- [ ] API実装（uploadFormatFiles）
- [ ] モックアップロード処理を実際のAPI呼び出しに置き換え
- [ ] アップロードのキャンセル機能
- [ ] 大容量ファイルのチャンクアップロード
- [ ] リトライ機能

### 改善提案

- [ ] ファイルのバリデーション強化（サイズ制限、形式チェック）
- [ ] アップロード前のファイルプレビュー
- [ ] 並列アップロードのサポート
- [ ] アップロード履歴の表示
- [ ] 重複ファイルの検出と警告
- [ ] ファイル名の自動リネーム機能
- [ ] ドラッグ&ドロップ時のビジュアルフィードバック強化
- [ ] アップロード速度の表示
- [ ] 残り時間の推定表示

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
