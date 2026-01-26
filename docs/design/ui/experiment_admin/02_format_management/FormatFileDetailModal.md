# FormatFileDetailModal UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

フォーマットファイルの詳細情報を表示する読み取り専用のモーダルダイアログ。ファイル名、パス、サイズ、作成者、概要などのメタデータを確認できます。

### 1.2. 使用場面

- FormatManagement画面でファイル行をクリック時（オプション）
- ファイルの詳細情報を確認したい場合
- ファイル検索結果からの詳細表示

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────┐
│ [📄] ファイル詳細                        │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ファイル名    │ template1.xml       │ │
│ ├───────────────┼─────────────────────┤ │
│ │ ファイルタイプ │ [XML]              │ │
│ ├───────────────┼─────────────────────┤ │
│ │ ファイルパス  │ formats/materials/  │ │
│ │               │ template1.xml       │ │
│ ├───────────────┼─────────────────────┤ │
│ │ ファイルサイズ│ 2.5 KB              │ │
│ ├───────────────┼─────────────────────┤ │
│ │ 最終更新日    │ 2日前               │ │
│ ├───────────────┼─────────────────────┤ │
│ │ 作成日        │ 1週間前             │ │
│ ├───────────────┼─────────────────────┤ │
│ │ 作成者        │ 山田太郎            │ │
│ ├───────────────┼─────────────────────┤ │
│ │ バージョン    │ [1.0.0]            │ │
│ ├───────────────┼─────────────────────┤ │
│ │ 概要          │ 材料テンプレート    │ │
│ │               │                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│                              [閉じる]   │
└─────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. モーダルヘッダー

| 要素 | コンポーネント | 説明 |
|------|--------------|------|
| アイコン | FileTextOutlined | プライマリ色のファイルアイコン |
| タイトル | Text (strong) | 「ファイル詳細」（多言語対応） |

#### 2.2.2. 詳細情報表示（Descriptions）

| 項目 | 必須 | 説明 | 形式 |
|------|------|------|------|
| ファイル名 | ○ | ファイル名 | Text (strong) |
| ファイルタイプ | ○ | 拡張子（大文字） | Tag (blue) |
| ファイルパス | ○ | フルパス | Text (secondary, code) |
| ファイルサイズ | ○ | フォーマット済みサイズ | Text |
| 最終更新日 | ○ | 相対時刻表示 | Text |
| 作成日 | × | 相対時刻表示 | Text |
| 作成者 | × | 作成者名 | Text (strong) |
| バージョン | × | バージョン番号 | Tag (green) |
| 概要 | ○ | 説明文（未登録時はイタリック表示） | Text (pre-wrap) |

#### 2.2.3. フッター

| ボタン | スタイル | 動作 |
|--------|---------|------|
| （なし） | - | footer={null} でボタンなし |
| モーダル外クリック | - | モーダルを閉じる |
| Escキー | - | モーダルを閉じる |

### 2.3. 画面遷移

- 画面遷移なし
- 閉じる操作でモーダルを閉じる

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. モーダル表示

**処理フロー:**
1. 親コンポーネントからopen=trueとfileデータで呼び出される
2. fileがnullの場合は何も表示しない（早期リターン）
3. fileデータをDescriptionsコンポーネントで表示
4. オプション項目（作成日、作成者、バージョン）は条件付きで表示

**表示条件:**
- **必須項目**: ファイル名、ファイルタイプ、ファイルパス、ファイルサイズ、最終更新日、概要
- **オプション項目**: 作成日（createdAt）、作成者（createdByName）、バージョン（version）

#### 3.1.2. ファイルタイプ表示

**処理フロー:**
1. file.nameから拡張子を抽出
2. `.split('.').pop()`で最後のドットより後ろを取得
3. toUpperCase()で大文字化
4. Tag（blue）で表示

**例:**
- `template1.xml` → `XML`
- `workflow.maiml` → `MAIML`

#### 3.1.3. ファイルサイズ表示

**処理フロー:**
1. file.size（バイト数）を受け取る
2. formatFileSize()ユーティリティでフォーマット
3. 人間が読みやすい形式で表示

**例:**
- 2500 → `2.5 KB`
- 1500000 → `1.5 MB`

#### 3.1.4. 日時表示

**処理フロー:**
1. file.lastModifiedまたはfile.createdAtを受け取る
2. formatRelativeTime()ユーティリティでフォーマット
3. 相対時刻で表示

**例:**
- `2日前`
- `1週間前`
- `3時間前`

#### 3.1.5. 概要表示

**処理フロー:**
1. file.descriptionの有無を確認
2. 存在する場合:
   - whiteSpace: 'pre-wrap' で改行を保持して表示
3. 存在しない場合:
   - イタリック体で「概要が登録されていません」と表示

#### 3.1.6. モーダルを閉じる

**処理フロー:**
1. モーダル外クリック、Escキー、×ボタンで閉じる
2. 親コンポーネントのonClose()コールバックを呼び出し

### 3.2. ボタン・操作の動作

| 操作 | 動作 | コールバック |
|------|------|------------|
| モーダル外クリック | モーダルを閉じる | onClose() |
| ×ボタンクリック | モーダルを閉じる | onClose() |
| Escキー | モーダルを閉じる | onClose() |

### 3.3. バリデーションルール

- なし（読み取り専用）

---

## 4. データ仕様

### 4.1. 入力項目（Props）

```typescript
interface FormatFileDetailModalProps {
  open: boolean;                      // モーダル表示状態
  onClose: () => void;                // 閉じる時のコールバック
  file: FormatFileDetailData | null;  // ファイル詳細データ
}
```

### 4.2. FormatFileDetailData型定義

```typescript
interface FormatFileDetailData {
  id: string;               // ファイルID
  name: string;             // ファイル名（必須）
  path: string;             // ファイルパス（必須）
  size: number;             // ファイルサイズ（バイト）（必須）
  lastModified: string;     // 最終更新日時（ISO 8601形式）（必須）
  type: string;             // ファイルタイプ（必須）
  version?: string;         // バージョン（オプション）
  description?: string;     // 概要（オプション）
  createdBy?: string;       // 作成者ID（オプション）
  createdByName?: string;   // 作成者名（オプション）
  createdAt?: string;       // 作成日時（ISO 8601形式）（オプション）
}
```

### 4.3. 出力項目

- なし（読み取り専用モーダル）

---

## 5. API連携

### 5.1. 使用するAPI一覧

- なし（親コンポーネントからデータを受け取る）

---

## 6. エラーハンドリング

### 6.1. エラーケース

| エラーケース | 処理 |
|------------|------|
| fileがnull | 何も表示しない（早期リターン） |
| 必須項目の欠落 | undefinedとして表示される |

### 6.2. エラーメッセージ

- なし（読み取り専用モーダル）

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Modal | モーダル本体 | title, open, onCancel, footer={null}, width={600}, destroyOnClose |
| Descriptions | 詳細情報表示 | bordered, column={1}, size="small" |
| Descriptions.Item | 各項目 | label, labelStyle |
| Space | ヘッダーアイコンとテキスト | - |
| Typography.Text | テキスト表示 | strong, type="secondary", code, italic |
| Tag | タグ表示 | color="blue", color="green" |

### 7.2. デザイントークン使用

```typescript
const { token } = theme.useToken();

// 使用例
color: token.colorPrimary           // アイコン色
marginTop: token.marginLG           // 上部マージン
fontWeight: token.fontWeightStrong  // ラベルのフォントウェイト
```

### 7.3. 多言語対応

- `useLanguage()` カスタムフックを使用
- `t('formatManagement.detail.*')` で翻訳文字列を取得
- 主な翻訳キー:
  - `formatManagement.detail.title`
  - `formatManagement.detail.fileName`
  - `formatManagement.detail.fileType`
  - `formatManagement.detail.filePath`
  - `formatManagement.detail.fileSize`
  - `formatManagement.detail.lastModified`
  - `formatManagement.detail.createdAt`
  - `formatManagement.detail.createdBy`
  - `formatManagement.detail.version`
  - `formatManagement.detail.description`
  - `formatManagement.detail.noDescription`

### 7.4. レスポンシブ対応

- モーダル幅: 600px（固定）
- モバイルでは自動的に幅が調整される（Ant Designのデフォルト動作）

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/project/FormatFileDetailModal.tsx
```

### 8.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| FormatManagement | ./FormatManagement.tsx | 親コンポーネント |

### 8.3. カスタムフック

| フック | パス | 役割 |
|--------|------|------|
| useLanguage | @/contexts/LanguageContext | 多言語化 |

### 8.4. ユーティリティ

| 関数 | パス | 役割 |
|------|------|------|
| formatFileSize | @/utils/formatters | ファイルサイズをフォーマット（例: 2.5 KB） |
| formatRelativeTime | @/utils/formatters | 相対時刻をフォーマット（例: 2日前） |

---

## 9. 既知の課題・TODO

### 改善提案

- [ ] 編集ボタンの追加（モーダル内から直接編集可能に）
- [ ] ファイル履歴表示機能（バージョン履歴）
- [ ] ファイルプレビュー機能（XMLの構造表示）
- [ ] タグ付け機能の追加
- [ ] ファイルのダウンロードボタン追加
- [ ] 共有リンクの生成機能
- [ ] 関連ファイルの表示（同じフォルダ内のファイル）

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
