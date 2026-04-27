# MAIMLバリデーション機能 挙動概要

> 作成日: 2026-04-24  
> 最終更新: 2026-04-24  
> 対象タスク: 20260423_1620_MAIMLバリデーション機能追加 / 20260424_1059_MAIMLバリデーションダイアログ修正

---

## 1. 全体フロー概観

```
フロントエンド (ProjectManagement.tsx)
  │
  ├─ [A] プロジェクト切り替え時（selectedProject 変更）
  │       └─ useEffect → getAnalysisResult(maimlFileKey) → DB照会 → savedValidationRow 更新
  │
  ├─ [B] MAIMLアップロード完了後
  │       └─ アップロード完了 → getAnalysisResult(maimlFileKey) → DB照会 → savedValidationRow 更新
  │
  ├─ [C] 手動バリデーション（「バリデーション」ボタン押下）
  │       └─ validateMaiml(base64Content, {fileKey, skipAnalysisSave:false})
  │               → POST /api/v1/maiml/validate → DB保存
  │               → getAnalysisResult(maimlFileKey) → savedValidationRow 更新
  │
  └─ [D] MAIMLエディタ保存時
          └─ POST /api/v1/maiml/save → saveMaiML → analyzeMaiMLFile(..., skipSave:false)
                  → DB保存（バックエンド側で自動実行）
                  ※ フロント側は保存後に getAnalysisResult を呼んで更新する必要あり
```

**表示の唯一の情報源**: `savedValidationRow`（DB から取得した `MaimlAnalysisResultRow`）  
手動バリデーション後も API レスポンスを直接使わず、DB から再取得した結果を使う。

---

## 2. DB テーブル構成

### `maiml_analysis_results` テーブル

| カラム | 型 | 説明 |
|---|---|---|
| id | SERIAL (PK) | 自動採番 |
| file_key | TEXT (UNIQUE) | ファイルを一意識別するキー（後述） |
| is_valid | BOOLEAN | バリデーション合否 |
| version | NUMERIC | MAIMLバージョン |
| namespace | TEXT | XML名前空間 |
| errors | JSONB | エラー一覧（`ValidationError[]` を JSON 文字列として格納） |
| warnings | JSONB | 警告一覧（`ValidationWarning[]` を JSON 文字列として格納） |
| suggestions | JSONB | 改善提案一覧 |
| statistics | JSONB | 統計情報（要素数等） |
| processing_time | INTEGER | 処理時間(ms) |
| analysis_timestamp | TIMESTAMPTZ | 解析実行日時 |
| created_at | TIMESTAMPTZ | 初回保存日時 |
| updated_at | TIMESTAMPTZ | 最終更新日時 |

**UPSERT 動作**: `file_key` に対して `ON CONFLICT DO UPDATE` → 常に最新のバリデーション結果のみ保持（過去履歴は保持されない）

### `file_metadata` テーブル（連動更新）

バリデーション結果保存時（`saveAnalysisResults`）に `file_metadata` テーブルも連動更新される。

| 更新カラム | 内容 |
|---|---|
| `maiml_analysis_status` | `has_errors` / `has_warnings` / `valid` / `analyzed` |
| `maiml_error_count` | エラー数 |
| `analysis_timestamp` | 解析実行日時 |
| `version_detected` | 検出されたMAIMLバージョン |

- `file_metadata` にレコードが**存在しない**場合: `insertFileMetadata` で新規作成
- `file_metadata` にレコードが**存在する**場合: `updateFileMetadata` で上記カラムを更新

---

## 3. file_key の形式

### 統一形式

```
{organizationId}/projects/{projectName}/{projectName}.maiml
例: a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/sample/sample.maiml
```

- **DB保存時** (`maimlService.ts` → `saveMaiML`): `normalizedFileKey`（組織IDプレフィックス付き）で保存
- **フロント照会時** (`maimlFileKey`): `file_metadata.file_key` から取得 = 同じく組織IDプレフィックス付き
- **一致しているため `getAnalysisResult` で正常に引き当て可能**

### `maimlFileKey` の取得元（フロントエンド）

`maimlFileKey` は `ProjectManagement.tsx` の `selectedProject` から取得。  
`selectedProject` はプロジェクト一覧 API レスポンス由来。

```sql
-- プロジェクト一覧クエリ（概要）
SELECT
  p.*,
  fm.file_key AS "maimlFileKey"   -- file_metadata.file_key = {orgId}/projects/xxx/xxx.maiml
FROM project p
LEFT JOIN file_metadata fm ON fm.project_uuid = p.project_uuid
  AND fm.file_key NOT LIKE '%/archive/%'
  AND fm.file_key LIKE '%.maiml'
```

→ `maimlFileKey` は常に **組織IDプレフィックス付き** (`{orgId}/projects/...`)

フォールバック（`maimlFileKey` が null の場合）:
```typescript
const sourceS3Key = selectedProject.maimlFileKey
  ?? `${orgId}/projects/${selectedProject.name}/${selectedProject.name}.maiml`;
```

---

## 4. バリデーション実行パターン詳細

### [A] プロジェクト切り替え時の自動取得

**トリガー**: `selectedProject?.maimlFileKey` が変化したとき（`useEffect` 依存）

```typescript
// ProjectManagement.tsx
useEffect(() => {
  if (!selectedProject?.maimlFileKey) {
    setSavedValidationRow(null);
    return;
  }
  getAnalysisResult(selectedProject.maimlFileKey)
    .then(res => setSavedValidationRow(res.data ?? null))
    .catch(() => setSavedValidationRow(null));
}, [selectedProject?.maimlFileKey]);
```

**バックエンド**:
- `GET /api/v1/maiml/analysis-result?fileKey=xxx`
- Controller → `maimlAnalysisResultRepository.getByFileKey(fileKey)`
- DBに保存済みの結果を**そのまま返す**（再解析なし）
- 存在しない場合: `data: null` を返す（404 ではなく success + null）

---

### [B] アップロード後の自動リフレッシュ

**トリガー**: MAIMLアップロード完了後

```typescript
// ProjectManagement.tsx（アップロード完了時）
const fileKeyForValidation = currentProject?.maimlFileKey;
if (fileKeyForValidation) {
  const analysisRes = await getAnalysisResult(fileKeyForValidation);
  setSavedValidationRow(analysisRes.data ?? null);
}
```

**いつ DB に保存されているか**:  
アップロード処理内（`maimlIngestParserService` 等）で `skipSave:false` の `analyzeMaiMLFile` が呼ばれた場合

---

### [C] 手動バリデーション（「バリデーション」ボタン）

**トリガー**: ユーザーがバリデーションモーダル内の「再バリデーション実行」ボタンを押下

```typescript
// ProjectManagement.tsx
const handleValidate = useCallback(async () => {
  if (!selectedProject?.maimlFileKey || !maimlContent) return;
  setIsValidating(true);
  
  const base64Content = btoa(unescape(encodeURIComponent(maimlContent)));
  
  // バリデーション実行（skipAnalysisSave:false → DB保存あり）
  await validateMaiml(base64Content, {
    fileKey: selectedProject.maimlFileKey,
    skipAnalysisSave: false,
  });
  
  // バリデーション後に DB から最新結果を取得（DB が唯一の情報源）
  const analysisRes = await getAnalysisResult(selectedProject.maimlFileKey);
  setSavedValidationRow(analysisRes.data ?? null);
}, [...]);
```

**バックエンド**:
- `POST /api/v1/maiml/validate`
- リクエストボディ: `{ content: base64, fileKey, strict, skipAnalysisSave }`
- Controller: `validateMaiml()`
  - `content` を base64 デコード
  - `maimlService.validateMaiML(organizationId, decodedContent, fileKey, skipAnalysisSave)` を呼ぶ
- Service: `validateMaiML()`
  ```typescript
  const effectiveSkip = skipAnalysisSave || !fileKey;
  // fileKey あり + skipAnalysisSave=false → DB保存あり
  // fileKey なし → DB保存スキップ（リアルタイム検証用）
  await maimlParser.analyzeMaiMLFile(organizationId, content, fileKey, effectiveSkip, 'strict');
  ```
- `analyzeMaiMLFile` → `saveAnalysisResults()` → `maimlAnalysisResultRepository.upsert()`

**保存される `file_key`**: 渡された `fileKey`（= 組織IDプレフィックス付き）がそのまま使われる

---

### [D] MAIMLエディタ保存時の自動バリデーション

**トリガー**: エディタ上で「保存」実行

**バックエンド**:
- `POST /api/v1/maiml/save`
- Service: `saveMaiML()`
  1. S3/Swift へファイルアップロード（リトライ3回・タイムアウト60秒）
  2. `project` テーブルの `project_maiml_flg` / `project_uuid` 更新
  3. `analyzeMaiMLFile(organizationId, content, normalizedFileKey, false, 'strict')`
     - **normalizedFileKey = `{orgId}/projects/{name}/{name}.maiml`**（組織IDプレフィックス付き）
     - `skipSave: false` → DB保存あり
  4. バリデーション例外はファイル保存の成否に影響しない（`catch` して `warn` のみ）

**フロント側**: エディタ保存後に `getAnalysisResult` を呼んで `savedValidationRow` を更新する実装が別途必要（現状の実装状況は要確認）

---

## 5. `maimlParser.analyzeMaiMLFile` の DB 保存フロー

```typescript
// backend/src/utils/maimlParser.ts
export async function analyzeMaiMLFile(
  organaizationId: string,
  maimlContent: string,
  fileKey: string,
  skipSave?: boolean,      // true: DB保存スキップ（デフォルト: undefined = 保存する）
  validationMode: ValidationMode = 'strict'
)
```

### 保存処理（`saveAnalysisResults`）

```typescript
async function saveAnalysisResults(
  organizationId: string,
  analysisResult: AnalysisResult
): Promise<number>
```

1. **`analysisStatus` 決定**（`maiml_analysis_status` 用）
   - エラーあり → `has_errors`
   - エラーなし・警告あり → `has_warnings`
   - エラーも警告もなし → `valid`
   - その他 → `analyzed`

2. **`maiml_analysis_results` に UPSERT**
   - `file_key` = 渡された `analysisResult.fileKey`
   - `maimlAnalysisResultRepository.upsert(data)` を呼ぶ

3. **`file_metadata` テーブルを確認・更新**
   - `FileMetadataRepository.getFileMetadataByFileKey(fileKey)` で確認
   - **存在しない場合**: `insertFileMetadata()` で新規作成（`is_maiml_file: true` 等を設定）
   - **存在する場合**: `updateFileMetadata()` で `maiml_analysis_status` / `maiml_error_count` / `analysis_timestamp` / `version_detected` を更新

---

## 6. フロントエンド状態管理（ProjectManagement.tsx）

### 主要 state

| state | 型 | 説明 |
|---|---|---|
| `savedValidationRow` | `MaimlAnalysisResultRow \| null` | DB取得済みバリデーション結果（唯一の表示源） |
| `isValidating` | `boolean` | バリデーション実行中フラグ |
| `validationDialogOpen` | `boolean` | バリデーションモーダルの開閉状態 |
| `maimlContent` | `string` | 現在のエディタ上の MAIML コンテンツ |

### `maimlHasErrors` （useMemo）

プロジェクト一覧のバリデーションアイコン表示制御に使用

```typescript
const maimlHasErrors = useMemo(() => {
  if (!savedValidationRow) return false;
  try {
    const errors = JSON.parse(savedValidationRow.errors || '[]');
    return Array.isArray(errors) && errors.length > 0;
  } catch { return false; }
}, [savedValidationRow]);
```

---

## 7. MaimlValidationModal コンポーネント

`ProjectManagement.tsx` から分離された独立コンポーネント。

### Props

| prop | 型 | 説明 |
|---|---|---|
| `open` | `boolean` | モーダル開閉状態 |
| `onClose` | `() => void` | 閉じるコールバック |
| `savedValidationRow` | `MaimlAnalysisResultRow \| null` | DB取得済みバリデーション結果 |
| `isValidating` | `boolean` | 実行中フラグ（ボタンの loading 表示） |
| `hasMaimlContent` | `boolean` | コンテンツ有無（ボタン活性制御） |
| `onValidate` | `() => void` | 再バリデーション実行コールバック |

### 表示データ生成（`displayResult`）

`savedValidationRow` から `AnalysisResult` に変換する `parseRowToAnalysisResult()` ユーティリティを使用。

```typescript
// MaimlValidationModal.tsx
const displayResult: AnalysisResult | null = savedValidationRow
  ? parseRowToAnalysisResult(savedValidationRow)
  : null;
```

- `errors` / `warnings` / `suggestions` / `statistics` は JSONB 文字列を `JSON.parse()` してオブジェクト化
- エラーは `canBeIgnoredOnUpload` フラグで「致命的エラー」と「編集可能エラー」に分類して表示

---

## 8. API エンドポイント一覧

| メソッド | パス | 説明 | DB保存 |
|---|---|---|---|
| POST | `/api/v1/maiml/validate` | バリデーション実行 | `skipAnalysisSave` に依存（デフォルト: `true` = なし） |
| GET | `/api/v1/maiml/analysis-result?fileKey=xxx` | 保存済み結果取得 | なし（参照のみ） |
| POST | `/api/v1/maiml/save` | MAIML保存 | あり（保存後に自動バリデーション） |

### `POST /api/v1/maiml/validate` リクエストボディ

```typescript
{
  content: string,          // base64 エンコード済み MAIML XML
  strict: boolean,          // 厳密モード（デフォルト: false）
  fileKey: string,          // ファイルキー（空文字の場合 DB 保存スキップ）
  skipAnalysisSave: boolean // true: DB 保存スキップ（デフォルト: true）
}
```

---

## 9. skipSave フラグまとめ

| 呼び出し元 | skipSave | DB保存 |
|---|---|---|
| `saveMaiML`（エディタ保存） | `false` | ✅ あり |
| `validateMaiML`（手動バリデーション、`skipAnalysisSave=false`） | `false` | ✅ あり |
| `validateMaiML`（デフォルト or `skipAnalysisSave=true`） | `true` | ❌ なし |
| `validateMaiML`（`fileKey` 未指定） | `true`（強制） | ❌ なし |
| アップロード処理内（`maimlIngestParserService` 等） | `false` | ✅ あり（要確認） |
| `validateMaiMLWithHistory`（未使用？） | ※ 内部で `validateMaiML(content, '')` を呼ぶため常に skipSave=true | ❌ なし |

---

## 10. 修正履歴

### 2026-04-24: file_key の形式統一

**問題**: `saveMaiML` 内でバリデーション保存時に `relFileKey`（組織IDなし）を渡していたため、
DB の `file_key` が `projects/xxx/xxx.maiml` となり、フロントが渡す
`{orgId}/projects/xxx/xxx.maiml` と**不一致** → `getAnalysisResult` が結果を引き当てられない問題。

**修正箇所**: `backend/src/services/maimlService.ts`
```typescript
// 修正前（組織IDなし）
const relFileKey = normalizedFileKey.slice(organizationId.length + 1);
await maimlParser.analyzeMaiMLFile(..., relFileKey, false, 'strict');

// 修正後（組織IDプレフィックス付き）
await maimlParser.analyzeMaiMLFile(..., normalizedFileKey, false, 'strict');
```

---

## 11. 注意点・制約

1. **UPSERT のため1ファイル1レコード**: 同じ `file_key` に対しては常に最新結果のみ保持される。過去履歴は保持されない（別途 `validation_history` テーブルあり）。

2. **バリデーション失敗でもファイル保存は成功**: `saveMaiML` 内でバリデーションが例外を投げても `catch` で吸収し、ファイル保存の結果には影響しない。

3. **`getAnalysisResult` は再解析しない**: DBに保存済みの結果を返すだけ。新しい結果が欲しい場合はバリデーション API を明示的に呼ぶ必要がある。

4. **`file_key` = `file_metadata.file_key`**: 同じキーを使うことでバリデーション結果とファイルメタデータが対応付けられる。

5. **表示の情報源は DB のみ**: `validateMaiml` の API レスポンス（`AnalysisResult`）を直接表示用に使わず、常に `getAnalysisResult` で DB から再取得した `savedValidationRow` を使う設計。

6. **`validateMaiMLWithHistory` は現状未活用**: `maimlService.ts` に存在するが、内部で `validateMaiML(content, '')` を呼ぶため `fileKey` が空となり DB 保存されない。呼び出し元も現状なし。

7. **base64 エンコード**: フロントエンドから `POST /maiml/validate` に送る content は `btoa(unescape(encodeURIComponent(maimlContent)))` でエンコードされる。バックエンドのコントローラーでデコードしてから `maimlService.validateMaiML` に渡す。
