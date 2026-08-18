# Insertion機能 新旧差分調査レポート

- **作成日時**: 2026-07-27 09:30
- **種類**: 調査レポート（実装変更なし）
- **調査対象（旧）**: `frontend/src/reference/components/ExperimentRecorder/components/InsertionFileUpload.js`
- **調査対象（現行）**: `frontend/src/hooks/useInsertionEditor.ts` / `frontend/src/components/common/InsertionEditorForm.tsx` / `frontend/src/components/common/InsertionEditorCompact.tsx` 他

---

## 1. 概要

過去バージョンの Insertion 機能（`InsertionFileUpload.js`）と現行実装の差分を整理する。
機能・設計・利用箇所の観点でそれぞれ比較する。

---

## 2. ファイル構成の比較

### 2-1. 旧実装

```
frontend/src/reference/components/ExperimentRecorder/
├── components/
│   ├── InsertionFileUpload.js     # UI + ロジック集約（428行）
│   ├── InsertionFileUpload.css    # 専用スタイル（351行）
│   └── MobileDataInput.js        # 呼び出し元。S3アップロード処理(uploadInsertionFilesObject)も記述
├── utils/
│   └── MaiMLParser.js             # <insertion>要素の独自XMLパース
└── MobileExperimentRecorder.js    # 画面全体
```

- すべて JavaScript（非TypeScript）
- UIとロジックが `InsertionFileUpload.js` に集約
- S3アップロード処理は呼び出し元の `MobileDataInput.js` に別定義（分離しているが単一ファイルに混在）
- MAIMLのパースは独自クラス `MaiMLParser.js` が担当

### 2-2. 現行実装

```
frontend/src/
├── types/
│   └── maiml-unified.ts           # Insertion型定義（uri/hash/uuid/format）
├── hooks/
│   └── useInsertionEditor.ts      # Insertionロジック共通フック（161行）
├── components/common/
│   ├── InsertionEditorForm.tsx    # Form.Item型UI（TemplateEditorDialog用・121行）
│   └── InsertionEditorCompact.tsx # 小型UI（WorkRecordPanel用・150行）
└── utils/
    └── maimlTypeConverter.ts      # <insertion>要素の変換ロジック（統合型コンバーター）
```

利用箇所（コンポーネント）:
| ファイル | 使用コンポーネント / 方式 |
|---|---|
| `components/editorv2/TemplateEditorDialog.tsx` | `InsertionEditorForm` |
| `components/format/FormatEditorDialog.tsx` | `InsertionEditorForm`（UI非表示・保存用に保持） |
| `components/ExperimentWorker/WorkRecordPanel.tsx` | `InsertionEditorCompact` |
| `components/ExperimentWorker/DataRecordDialog.tsx` | `handleInsertionFileSelect`（独自実装・非共通） |
| `components/project/ExperimentPlanDialog/TemplateInputPanel.tsx` | `handleInsertionFileSelect`（独自実装・非共通） |

> **注意**: `DataRecordDialog.tsx` / `TemplateInputPanel.tsx` では `useInsertionEditor` を使わず独自の `handleInsertionFileSelect` 関数を実装しており、現行でも完全な共通化はされていない。

---

## 3. 主要機能の差分

### 3-1. ハッシュ値の扱い

| 観点 | 旧実装 | 現行実装 |
|---|---|---|
| データ構造 | `hash: "sha256:abc123..."` 単一文字列 | `hash: { method: "SHA-256", value: "abc123..." }` オブジェクト形式 |
| アルゴリズム固定 | SHA-256固定（`generateSHA256Hash`関数） | 環境変数 `NEXT_PUBLIC_INSERTION_DEFAULT_HASH_METHOD` で切り替え可（デフォルトSHA-256） |
| ハッシュ計算方法 | 独自ユーティリティ `fileHashUtils.js` | `crypto.subtle.digest` をフック内で直接呼び出し（標準Web API） |
| MAIML仕様準拠 | `<hash>` 要素のアルゴリズム情報が欠落 | `<hash method="SHA-256">` の属性込みで構造化（仕様準拠） |

### 3-2. MIMEタイプの扱い

| 観点 | 旧実装 | 現行実装 |
|---|---|---|
| 検出方法 | 独自ユーティリティ `detectMimeType`（`mimeTypeUtils.js`）でマジックバイト等から検出 | `file.type`（ブラウザの標準MIMEタイプ）をそのまま使用 |
| ファイル形式制限 | `acceptedFormats` propsでホワイトリスト指定可能（ワイルドカード`image/*`等対応） | 制限なし（すべてのファイルを受け付ける） |

### 3-3. アップロードタイミングとフロー

| 観点 | 旧実装 | 現行実装 |
|---|---|---|
| 選択時の動作 | ハッシュ計算のみ実施。S3アップロードはしない。`uri: null` を親に通知 | ハッシュ計算 → 4項目（uri/hash/format）を即座にonChange通知 |
| S3アップロード | フォーム全体の「保存」ボタン押下時に `uploadInsertionFilesObject` で一括アップロード | ファイル選択直後に `Modal.confirm` でユーザー確認 → `uploadFiles`サービス呼び出し |
| アップロード先指定 | 呼び出し元の `MobileDataInput.js` で `organizationId` / `maimlFileKey` を渡す | `uploadTargetPath` props（S3相対パス）で指定。未指定時はアップロード確認なし（ファイル名のみセット） |
| URIの設定タイミング | アップロード完了後、s3Keyで更新（非同期2段階） | アップロード確認後のPromise内で `onChange({ ...insertion, uri: s3Key })` で更新（同フロー内） |

### 3-4. UI・UX

| 観点 | 旧実装 | 現行実装 |
|---|---|---|
| ドラッグ&ドロップ | 対応（`onDragOver` / `onDragLeave` / `onDrop` ハンドラ実装） | 未対応（`<input type="file">` ボタン方式のみ） |
| 進捗表示 | 疑似プログレスバー（0%→10%→30%→80%→100%のステップ方式） | なし（アップロード中は `LoadingOutlined` アイコン） |
| 画像プレビュー | あり（選択ファイルは `URL.createObjectURL`、既存ファイルはAPI経由） | なし |
| ファイルクリアボタン | あり（ファイル情報表示エリア内の✕ボタン） | なし（新しいファイルを選択すると上書き） |
| ファイル情報表示 | 選択後にファイル名・サイズ・URI・SHA256・形式を専用カードで表示 | フィールドの Input にそのまま反映（専用表示なし） |
| 手動編集 | 不可（ファイル選択UIのみ） | URI / Hash Method / Hash Value / Format を手動テキスト編集可能 |
| デザインシステム | 独自CSS（`InsertionFileUpload.css` 351行） | Ant Design（Form.Item / Input / Button / Space.Compact） |
| ファイルサイズ制限 | `maxFileSize` props（デフォルト10MB）でバリデーション | なし |
| エラー表示 | コンポーネント内に専用エラーエリア（赤色カード） | `message.error` / `message.warning`（Ant Designのグローバルトースト） |

### 3-5. 既存データの復元

| 観点 | 旧実装 | 現行実装 |
|---|---|---|
| 既存URI表示 | `existingUri` propsを受け取り、URLデコード（二重デコード対応）してファイル情報カードに表示 | `value.uri` Inputにそのまま表示（デコード処理なし） |
| 既存ハッシュ | `existingHash` propsを受け取り先頭32文字を短縮表示 | `value.hash.value` Inputにそのまま表示（短縮なし） |
| 二重URLデコード | あり（URIが二重エンコードされている場合に対応） | なし |

### 3-6. MAIMLパース

| 観点 | 旧実装 | 現行実装 |
|---|---|---|
| パーサー | 独自クラス `MaiMLParser.js` の `parseInsertionElement` メソッド | `frontend/src/utils/maimlTypeConverter.ts` の `convertInsertion` 関数 |
| 変換対象 | プロパティ配列の中の `insertion` 型プロパティとして処理 | `Insertion` 型（`uri/hash/uuid/format`）として独立して変換 |
| XMLパース方式 | DOMパーサーベース（`getElementsByTagName`等） | xml-jsライブラリ経由のオブジェクトをTypeScript型に変換 |

### 3-7. バックエンド連携

| 観点 | 旧実装 | 現行実装 |
|---|---|---|
| 画像取得API | `/api/experiment-records/get-insertion-file?uri=...&organizationId=...&maimlFileKey=...` | なし（現行UIではプレビューなし） |
| ファイルアップロードAPI | `MobileDataInput.js`内で`fetch('/api/...')` を直接呼び出し | `services/fileAccessService.ts` の `uploadFiles` 関数（サービス層経由） |
| DB永続化 | なし（S3パスのみ保持） | `maiml_insertion` / `maiml_template_insertion` テーブルに正規化保存（MAIMLパブリッシュ時） |
| S3パス管理 | 独自のパス生成ロジック | `s3_structure.md` 規約に従った `storageService` 経由 |

---

## 4. 現行実装で未移植の機能（旧実装にあって現行にない機能）

以下の機能は旧実装に存在するが、現行実装には移植されていない。

1. **ドラッグ&ドロップ対応** — ファイルをドロップゾーンに直接ドロップできる
2. **ファイル形式ホワイトリスト制限** — `acceptedFormats` による MIME タイプ制限
3. **ファイルサイズ上限チェック** — アップロード前のクライアントサイドバリデーション
4. **画像ファイルのプレビュー表示** — 選択した画像ファイルのサムネイル表示
5. **進捗表示（プログレスバー）** — ファイル処理中の視覚的フィードバック
6. **ファイルクリア機能** — 選択済みファイルの削除ボタン
7. **選択ファイル情報の詳細表示** — ファイル名・サイズ・URI・ハッシュ・形式の専用カード表示
8. **既存URIの二重URLデコード処理** — URLエンコードが重複している場合の自動デコード

---

## 4-2. CSV/XMLデータインポート機能の差分

旧実装では、`<insertion>` 専用ファイルアップロードとは**別に**、`Property` / `Content`（汎用データコンテナ）型フィールドに対して CSV や XML ファイルをアップロードし、`contentDoubleListType` 形式に自動変換して格納する機能が存在する。この機能の現行実装との差分を以下に整理する。

### 4-2-1. 機能の概要

| 観点 | 旧実装 | 現行実装 |
|---|---|---|
| 機能の有無 | **あり**（`useFileUpload.js`） | **なし**（未移植）|
| CSVパーサー | `papaparse`（Papa.parse）| 実装なし |
| XMLパーサー | `DataFormatUtils.js`（xml-js使用、独自実装） | 実装なし |
| データの格納先 | `formData[activeTab][templateId][propertyKey]` に `contentDoubleListType` 形式で反映 | DataGrid（`dataGrids` state）への手動入力のみ（`handleAddRow` / `handleAddColumn` で行/列追加、`InputNumber` で1件ずつ入力） |
| ネスト要素対応 | あり（`propertyKey` に `_` を含む場合、`parentKey_contentKey` として分解し `propertyListType` 構造に組み込む） | なし |

### 4-2-2. 旧実装の処理フロー（`useFileUpload.js`）

```
ファイル選択（accept=".csv,.xml"）
  ↓
CSVの場合:
  Papa.parse でヘッダー+行データを取得
  → 最初の数値列を自動検出して値配列を抽出
  → csvContentDataObject（type:'content', contentType:'contentDoubleListType'）を生成
  → formData を即時更新 + setForceRerender で強制再レンダリング
  → DataGrid（columns/rows）に表示

XMLの場合:
  FileReader でテキスト読み込み
  → parseXMLData（DataFormatUtils.js）でMaiML <content>要素をパース
  → 同様に xmlContentDataObject を生成 → formData 即時更新
```

### 4-2-3. 旧実装の DataFormatUtils.js の主要機能

| 関数名 | 説明 |
|---|---|
| `parseXMLData` | xml-js で XML→JSON変換後、`maiml.property.content` / `property.content` 等5パターンでcontent要素を探索し、カラム/行データを抽出 |
| `formatToMaiMLContent` | グリッドデータ（columns/rows）→ MaiML `<content>`構造への逆変換。`detectContentType` で int/double/string 型を自動判定 |
| `detectFormatString` | 数値の小数桁数を解析してフォーマット文字列（`0`, `0.00` 等）を自動生成 |
| `createMaiMLPropertyFromCSV` | CSV列データ → `propertyListType` 構造への変換 |
| `validateFileFormat` | `.csv` / `.xml` のみ許可、50MB制限のバリデーション |

### 4-2-4. 現行実装での DataGrid（`contentDoubleListType`）の扱い

`DataRecordDialog.tsx` では `contentDoubleListType` を `renderDataGrid` で描画するが、値の入力は以下の手動操作のみ：

- 行追加ボタン（`handleAddRow`）
- 列追加ボタン（`handleAddColumn`）
- 行削除ボタン（`handleDeleteRow`）
- 列削除ボタン（`handleDeleteColumn`）
- `InputNumber` での1セルずつの値入力（`handleDataGridChange`）

CSV/XMLファイルからの一括インポートには対応していない。

### 4-2-5. 未移植機能のまとめ

以下の機能が旧実装に存在するが、現行実装には移植されていない：

1. **CSVファイルからの自動インポート** — papaparse でCSVをパースし、数値列を自動検出して `contentDoubleListType` に変換
2. **XMLファイルからの自動インポート** — MaiML形式 `<content>` 要素を複数パターンでパースしてDataGridに反映
3. **ネスト要素（`propertyListType`）へのCSV/XML反映** — `parentKey_contentKey` 形式のキーでネスト構造に直接書き込み
4. **データ型の自動判定** — int / double / string を値の内容から自動検出
5. **フォーマット文字列の自動生成** — 小数桁数から `formatString` を自動生成（MaiML仕様準拠）
6. **ファイル処理統計の記録** — ファイル名・行数・列数・ファイルサイズ・タイムスタンプを `fileStats` として管理
7. **50MBファイルサイズ制限** — クライアントサイドでのバリデーション

---

## 5. 現行実装の改善点（旧実装よりも優れている点）

1. **TypeScript型安全性** — `Insertion` 型（`types/maiml-unified.ts`）により型チェックが効く
2. **ロジックとUIの分離** — `useInsertionEditor` フックで複数UIコンポーネントが共通ロジックを利用可能
3. **MAIML仕様準拠のハッシュ構造** — `hash.method` + `hash.value` でアルゴリズム可変化
4. **手動編集対応** — URI/Hash/Format を直接テキスト入力できるため、S3以外のパス（ファイルサーバー等）も対応可能
5. **UIバリエーション** — ダイアログ向け（`InsertionEditorForm`）とリスト向け（`InsertionEditorCompact`）の2種を提供
6. **Ant Designへの統合** — アプリ全体のデザインシステムと統一されたUX
7. **DBへの正規化保存** — `maiml_insertion` / `maiml_template_insertion` テーブルへの永続化により、検索・集計が可能
8. **環境変数によるハッシュアルゴリズム設定** — `NEXT_PUBLIC_INSERTION_DEFAULT_HASH_METHOD` で変更可能

---

## 6. 現行実装の課題・留意点

1. **`DataRecordDialog.tsx` / `TemplateInputPanel.tsx` の未統一** — `useInsertionEditor` を使わず独自の `handleInsertionFileSelect` 関数を持っており、ロジックの重複が残っている。将来的なリファクタリング対象。

2. **ファイル形式制限がない** — MAIMLの `<insertion>` の `format` 要素でファイルタイプを制限したい場合も、現行UIでは制限を設けていないため、不正なタイプのファイルが選択できてしまう。

3. **ファイルサイズチェックがない** — 大容量ファイルを選択しても制限されない（バックエンド側やS3の制限のみ）。

4. **画像プレビューがない** — 画像ファイルを扱う際にプレビューできないため、選択ファイルの確認ができない。

5. **URI確認手段がない** — アップロード後の実際のS3パス（s3Key）はInputに反映されるが、旧実装のようにUI上でハイライト表示されないため見落としやすい。

---

## 7. 関連ファイル一覧

### フロントエンド

| ファイル | 役割 |
|---|---|
| `frontend/src/reference/components/ExperimentRecorder/components/InsertionFileUpload.js` | 旧実装（参照用） |
| `frontend/src/reference/components/ExperimentRecorder/components/InsertionFileUpload.css` | 旧実装スタイル（参照用） |
| `frontend/src/types/maiml-unified.ts` | `Insertion` 型定義 |
| `frontend/src/hooks/useInsertionEditor.ts` | Insertionロジック共通フック |
| `frontend/src/components/common/InsertionEditorForm.tsx` | Form.Item型UIコンポーネント |
| `frontend/src/components/common/InsertionEditorCompact.tsx` | 小型UIコンポーネント |
| `frontend/src/utils/maimlTypeConverter.ts` | `<insertion>`要素の型変換 |
| `frontend/src/services/fileAccessService.ts` | ファイルアップロードサービス |
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `InsertionEditorCompact`利用箇所 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | 独自insertion処理（非共通） |
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | `InsertionEditorForm`利用箇所 |
| `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx` | 独自insertion処理（非共通） |

### バックエンド

| ファイル | 役割 |
|---|---|
| `backend/src/types/maiml-unified.ts` | `Insertion`型定義（フロントと共通化） |
| `backend/src/utils/maimlTypeConverter.ts` | `<insertion>`要素の変換ロジック |
| `backend/src/services/maimlIngestParserService.ts` | `Insertion`→`MaimlInsertionInput`変換 |
| `backend/src/repositories/maimlAssetRepository.ts` | `maiml_insertion`/`maiml_template_insertion`テーブルへの保存 |
| `backend/src/sql/ddl/org_schema_tables.sql` | `maiml_insertion`/`maiml_template_insertion`テーブル定義 |
| `backend/src/workers/maimlPublishWorker.ts` | MAIMLパブリッシュ時のinsertion保存フロー |
