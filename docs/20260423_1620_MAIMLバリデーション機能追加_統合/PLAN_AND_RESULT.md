# タスク計画書・対応結果: MAIMLバリデーション機能追加（統合）

## メタデータ

| 項目 | 内容 |
|------|------|
| **作成日時** | 2026-04-23 16:20 |
| **最終更新** | 2026-04-24 14:15 |
| **タスクID** | maiml-validation-feature |
| **優先度** | 中〜高 |
| **推定工数** | 合計 5.5〜8時間 |
| **実績工数** | 約 5時間（2026-04-24 08:56〜14:15） |

> **このドキュメントは以下の4タスクを統合したものです**
> 1. `20260423_1620_MAIMLバリデーション機能追加`（メイン実装）
> 2. `20260424_1059_MAIMLバリデーションダイアログ修正`（ダイアログ修正）
> 3. `20260424_1318_MAIMLバリデーション表示バグ修正`（表示バグ修正）
> 4. `20260424_1406_保存時ファイル名バグ修正`（保存ファイル名バグ修正）

---

## 1. タスク概要

以下の機能追加・修正を行った。

### メイン機能追加（タスク1）
1. **プロジェクト管理画面にバリデーション実行ボタンを追加**
2. **ボタン押下時にダイアログを開き、DB保存済み結果を表示 + その場で再バリデーション可能にする**
3. **すべてのバリデーション実行時（エディタ保存前・ValidationPanel・アップロード時・プロジェクト管理画面）に結果をDBに保存するよう変更**

### ダイアログ修正（タスク2）
1. アップロード直後にバリデーションダイアログを開いた際にアップロード時のバリデーション結果が表示されない問題の修正
2. バリデーションダイアログのレイアウトをValidationPanelの構成に寄せる（Card + Collapse + List + Tag 構成）
3. MAIMLの保存時に実行しているバリデーション結果もDBに登録する対応

### 表示バグ修正（タスク3）
1. MAIMLファイルアップロード後にバリデーション警告アイコンが表示されない問題の修正
2. バリデーションダイアログ2回目以降オープン時に警告詳細のCollapseパネルが描画されない問題の修正

### 保存時ファイル名バグ修正（タスク4）
1. プロジェクト名と異なる名前のファイルをアップロード後に編集・保存すると、元ファイルが更新されずプロジェクト名のファイルが新規生成されるバグの修正

---

## 2. 調査結果サマリー

### バリデーション実行箇所（実装前の現状）

| 箇所 | 呼び出し関数 | fileKey有無 | DB保存 |
|------|------------|-----------|-------|
| エディタ：保存前バリデーション | `handleOpenSaveConfirmDialog` → `maimlService.validateMaiml(base64Data)` | ❌ なし | ❌ |
| エディタ：ValidationPanel開く | `handleOpenValidationPanel` → `maimlService.validateMaiml(base64Data)` | ❌ なし | ❌ |
| ファイルアップロード時 | `fileAccessService.ts` → `analyzeMaiMLFile(..., true, 'lenient')` | ✅ あり | ❌ skipSave=true 明示 |
| プロジェクト管理画面 | ❌ 未実装 | — | — |

### 既存インフラ（実装済みで使われていない）

| 要素 | 状態 |
|------|------|
| `maiml_analysis_results` テーブル | ✅ DDL定義済み |
| Repository `upsert()` / `getByFileKey()` | ✅ 実装済み |
| `maimlParser.ts` の `saveAnalysisResults()` | ✅ 実装済み（skipSave=false 時のみ動作） |
| `skipSave=false` で呼ぶ箇所 | ❌ 0件 |

### バックエンド バリデーション関数シグネチャ（変更前）

```typescript
// maimlService.ts
export async function validateMaiML(
  organizationId: string,
  content: string,
  fileKey: string = '',
  skipAnalysisSave: boolean = true  // デフォルト true = DB保存しない
): Promise<AnalysisResult>
```

```typescript
// maimlApiService.ts（フロントエンド）
export const validateMaiml = async (
  content: string,
  strict: boolean = false          // fileKey, skipAnalysisSave を渡せない
): Promise<ApiResponse<AnalysisResult>>
```

### 保存時ファイル名バグ原因（タスク4）

`PetriNetEditorInner.tsx` の S3 保存処理にて、保存先 `fileKey` のファイル名部分を `documentData?.name`（Document の name プロパティ）から決定していた。`documentData.name` は MAIML 読み込み時に `originalFileName`（プロジェクト名）で上書きされるため、プロジェクト名のファイルが新規生成されてしまっていた。

---

## 3. 目的と期待される成果

### 達成成果

- [x] プロジェクト管理画面にバリデーションボタンが表示される
- [x] ボタン押下でダイアログが開き、DB保存済みの結果（最終バリデーション日時・エラー/警告一覧）が表示される
- [x] ダイアログ内で「再バリデーション」ボタンを押すと、その場でバリデーションが実行される
- [x] バリデーション結果に問題がある場合（`isValid=false`）、以下の箇所に警告アイコンを常時表示する
  - プロジェクト詳細ヘッダーのプロジェクト名横
  - ファイル一覧テーブルのMAIMLファイル行横
- [x] エディタ保存前バリデーション・ValidationPanel・アップロード・プロジェクト管理画面のすべてのバリデーションでDB保存が行われる
- [x] タスク登録タブでMAIMLエラーがある場合は操作をブロックしAlertを表示する
- [x] アップロード後に警告アイコンが正しく反映される
- [x] ダイアログ2回目以降オープン時に警告/エラーのCollapseパネルが開いた状態で表示される
- [x] プロジェクト名と異なるファイル名のMAIMLを編集・保存した際に、正しいファイルが更新される

---

## 4. 実装内容

### Phase 1: バックエンド変更

#### 1-1. `maimlService.ts` — `skipAnalysisSave` デフォルト変更

```typescript
// 変更前
export async function validateMaiML(
  organizationId: string, content: string, fileKey: string = '', skipAnalysisSave: boolean = true
)

// 変更後
export async function validateMaiML(
  organizationId: string, content: string, fileKey: string = '', skipAnalysisSave: boolean = false
)
// ※ fileKey が空の場合は保存スキップにフォールバック
```

また、`saveMaiML()` の最後（ストレージ保存完了後）に `maimlParser.analyzeMaiMLFile()` を `skipSave=false` で呼び出すよう変更した（MAIMLの保存時もバリデーション結果をDBに登録）。

#### 1-2. `maimlController.ts` — DB保存済み結果の取得エンドポイント追加

```typescript
/**
 * MAIML分析結果取得（DB保存済み）
 * GET /api/v1/maiml/analysis-result?fileKey=xxx
 */
export async function getAnalysisResult(req: Request, res: Response): Promise<void>
```

#### 1-3. `maimlRoutes.ts` — エンドポイント登録

```typescript
router.get(
  '/analysis-result',
  authMiddleware,
  [query('fileKey').notEmpty().withMessage('fileKeyは必須です')],
  handleValidationErrors,
  maimlController.getAnalysisResult
);
```

#### 1-4. `fileAccessService.ts` — アップロード時バリデーションをDB保存有効化

```typescript
// 変更前: true,  // skipSave=true: DB保存はスキップ
// 変更後: false, // skipSave=false: DB保存を行う
```

---

### Phase 2: フロントエンド — maimlApiService.ts 変更

#### 2-1. `validateMaiml` 関数の引数拡張

```typescript
// 変更後
export const validateMaiml = async (
  content: string,
  options?: {
    strict?: boolean;
    fileKey?: string;
  }
): Promise<ApiResponse<AnalysisResult>>
```

#### 2-2. `getAnalysisResult` 関数・`MaimlAnalysisResultRow` 型を新規追加

```typescript
export interface MaimlAnalysisResultRow {
  id: number;
  file_key: string;
  is_valid: boolean;
  errors: string;      // JSON文字列
  warnings: string;    // JSON文字列
  analysis_timestamp: string;
}

export const getAnalysisResult = async (
  fileKey: string
): Promise<ApiResponse<MaimlAnalysisResultRow | null>>
```

---

### Phase 3: フロントエンド — PetriNetEditorInner.tsx 変更

- バリデーション呼び出し2箇所（`handleOpenSaveConfirmDialog`・`handleOpenValidationPanel`）に `fileKey` を追加してDB保存を有効化
- ValidationPanel を開く際にDB保存済み結果を初期取得して初期表示
- S3保存時の `fileKey` 決定ロジックを修正（**タスク4の修正もここに含む**）:

```tsx
// 修正後 fileKey 決定ロジック
// - sourceS3Key が存在する場合（既存ファイル編集）: S3Key のファイル名を維持する
//   - フォルダ変更なし: sourceS3Key をそのまま使用
//   - フォルダ変更あり: 選択フォルダ + sourceS3Key のファイル名部分
// - sourceS3Key がない場合（新規作成）: originalFileName（プロジェクト名）でファイル名を決定
// ※ documentData.name は Document 要素の name 属性でありファイル名とは別物のため使用しない
let fileKey;
if (props.sourceS3Key) {
  const sourceFileNameWithExt = props.sourceS3Key.substring(props.sourceS3Key.lastIndexOf('/') + 1);
  if (folder) {
    fileKey = `${folder}/${sourceFileNameWithExt}`;
  } else {
    fileKey = props.sourceS3Key;
  }
} else {
  const newFileName = `${props.originalFileName?.replace('.maiml', '') || 'document'}.maiml`;
  fileKey = folder ? `${folder}/${newFileName}` : `${currentOrgId}/${newFileName}`;
}
```

---

### Phase 4: フロントエンド — ProjectManagement.tsx 変更

- バリデーション確認ボタン追加（プロジェクト未選択時は disabled）
- プロジェクト選択時に `getAnalysisResult()` を呼び出し `savedValidationRow` を更新
- `MaimlValidationDialog` コンポーネントを組み込み（Modal内でDB結果表示・再バリデーション実行）
- プロジェクト詳細ヘッダー・ファイル一覧テーブルへの警告アイコン表示（エラー: 赤、警告: 黄）
- `maimlHasErrors`（`useMemo`）を算出して `TaskRegistrationTab` に渡す
- `handleUploadComplete` にて `refetchProjects()` 完了後、最新 `maimlFileKey` を直接 `getProjects()` APIで取得してから `getAnalysisResult()` を呼ぶよう修正（タスク2・3の修正）

---

### Phase 5: フロントエンド — MaimlValidationDialog.tsx（新規作成）

PLAN.md ではModalをインラインで実装する方針だったが、コードの見通しをよくするために独立コンポーネントとして切り出した。

- 最終バリデーション日時・結果サマリー（DBから取得）を表示
- Card + Collapse + List + Tag 構成でエラー/警告を分類表示（ValidationPanel のスタイルに準拠）
  - 致命的エラー / 編集可能エラー / 警告 の3分類
- 再バリデーションボタンで実行 → DB保存 → 表示更新
- `destroyOnClose` プロパティを追加し、2回目以降オープン時も `defaultActiveKey` が適用されるよう修正（タスク3の修正）

---

### Phase 6: フロントエンド — FileListTable.tsx 変更

- `maimlValidationRow: MaimlFileRow | null` prop を追加
- MAIMLファイル行に警告アイコンを表示
  - `is_valid === false && errors` が1件以上: 赤アイコン（`colorError`）
  - `warnings` のみ: 黄アイコン（`colorWarning`）

---

### Phase 7: フロントエンド — TaskRegistrationTab.tsx 変更

- `maimlHasErrors?: boolean` prop を追加
- エラー時にタブ上部にAlertを表示
- 保存ボタン・メソッド追加ボタン等を無効化（`disabled={... || maimlHasErrors}`）

---

## 5. 変更・作成ファイル一覧（最終）

### バックエンド

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/maimlService.ts` | `validateMaiML` の `skipAnalysisSave` デフォルトを `false` に変更（fileKeyが空の場合は保存スキップ）。`saveMaiML()` に保存後バリデーション+DB保存を追加 |
| `backend/src/services/fileAccessService.ts` | アップロード時の `skipSave=true` を `false` に変更 |
| `backend/src/controllers/maimlController.ts` | `getAnalysisResult` 関数を追加（DB保存済み分析結果を取得） |
| `backend/src/routes/maimlRoutes.ts` | `GET /analysis-result?fileKey=xxx` エンドポイントを追加 |

### フロントエンド

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/services/maimlApiService.ts` | `validateMaiml` の引数を `options: { strict?, fileKey? }` 形式に拡張。`MaimlAnalysisResultRow` 型と `getAnalysisResult()` 関数を追加 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | バリデーション呼び出し2箇所に `fileKey` を追加。ValidationPanel 開く際にDB保存済み結果を初期表示。S3保存時の `fileKey` 決定ロジック修正（`documentData.name` を使わず `sourceS3Key` を維持する） |
| `frontend/src/components/project/ProjectManagement.tsx` | バリデーション確認ボタン・`MaimlValidationDialog`・警告アイコン追加。プロジェクト選択時DB結果取得。`maimlHasErrors` 算出・`TaskRegistrationTab` への受け渡し。`handleUploadComplete` のバリデーション取得タイミング修正（`getProjects()` 直接呼び出し後に実施） |
| `frontend/src/components/project/MaimlValidationDialog.tsx` | **新規作成**。バリデーション結果表示ダイアログ（最終日時・Card+Collapse+List+Tag 構成・再バリデーションボタン・`destroyOnClose` 追加） |
| `frontend/src/components/project/FileListTable.tsx` | `maimlValidationRow: MaimlFileRow | null` prop を追加。MAIMLファイル行に警告アイコン（エラー: 赤、警告: 黄）を表示 |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | `maimlHasErrors?: boolean` prop を追加。エラー時にタブ上部にAlert表示、保存ボタン等を無効化 |

### テストファイル

| ファイル | 内容 |
|---------|------|
| `backend/tests/controllers/maimlController.validation.test.ts` | `getAnalysisResult` / `validate` コントローラーのユニットテスト（10件） |
| `backend/tests/services/maimlService.validateMaiML.test.ts` | `validateMaiML` の fileKey/skipAnalysisSave ロジックのユニットテスト（7件） |
| `frontend/src/services/__tests__/maimlApiService.validation.test.ts` | `validateMaiml` / `getAnalysisResult` フロントエンドサービスのユニットテスト（10件） |

### UI仕様書

| ファイル | 変更内容 |
|---------|---------|
| `docs/design/ui/experiment_admin/01_project_management/ui_project_management.md` | バリデーション確認ボタン・`MaimlValidationDialog`・警告アイコン仕様追記 |
| `docs/design/ui/experiment_admin/01_project_management/ui_file_list_table.md` | `maimlValidationRow` prop・警告アイコン仕様追記 |
| `docs/design/ui/experiment_admin/01_project_management/ui_task_registration_tab.md` | `maimlHasErrors` prop・Alert・操作ブロック仕様追記 |

---

## 6. UI仕様詳細

### バリデーションボタン（ProjectManagement 操作エリア）

| 状態 | 表示 |
|------|------|
| プロジェクト未選択 | 無効（`disabled`） |
| プロジェクト選択済み | 有効「バリデーション確認」ボタン |

### バリデーション結果ダイアログ（MaimlValidationDialog）

| 要素 | 内容 |
|------|------|
| ヘッダー | 最終バリデーション日時（DBから取得） |
| 結果バッジ | ✅ 有効 / ⚠️ エラーあり |
| エラー分類 | Card + Collapse + List + Tag 構成（致命的エラー / 編集可能エラー / 警告） |
| 再バリデーションボタン | 押下でMAIMLを取得しバリデーション実行→DB保存→表示更新 |
| 自動補正ボタン | なし（ProjectManagement では不要） |
| `destroyOnClose` | 有効（毎回DOM再マウント → `defaultActiveKey` が正しく適用される） |

### 警告アイコン色分け・表示条件

| 状態 | アイコン色 | 表示箇所 |
|------|----------|---------|
| `errors.length > 0` | 🔴 赤（`colorError`） | プロジェクト詳細ヘッダー / ファイル一覧MAIMLファイル行 |
| `errors.length === 0 && warnings.length > 0` | 🟡 黄（`colorWarning`） | 同上 |
| 問題なし | — | アイコンなし |

更新タイミング: ①プロジェクト選択時（DB取得）、②アップロード完了後（`getProjects()` で最新 `maimlFileKey` 確定後）、③再バリデーション実行後

### タスク登録タブの操作ブロック

| 操作 | ブロック条件 | 対象コンポーネント |
|------|------------|-----------------|
| タスク登録タブ内の保存・メソッド追加等 | `errors.length > 0` | `TaskRegistrationTab.tsx` |

エラーがある場合はタブ上部にエラーAlertを表示し、保存ボタン等を `disabled` にする。チェックアウトボタンはブロックしない。

### ファイル名決定ルール（S3保存時）

| ルール | 内容 |
|--------|------|
| `sourceS3Key` が存在する場合（既存ファイル編集） | `sourceS3Key` のファイル名をそのまま維持 |
| フォルダ変更あり + `sourceS3Key` 存在 | 選択フォルダ + `sourceS3Key` のファイル名部分 |
| `sourceS3Key` がない場合（新規作成） | `originalFileName`（プロジェクト名）でファイル名を決定 |
| `documentData.name` について | Document 要素の `name` 属性であり、**ファイル名の決定に使用しない** |

---

## 7. バグ修正詳細

### Bug 1: アップロード後に警告アイコンが表示されない

**根本原因**:
`handleUploadComplete` 内で `currentProject` を `refetchProjects()` 呼び出し**前**に取得している。初回MAIMLアップロード時は `currentProject.maimlFileKey` がまだ `null` のため、バリデーション取得のif条件が満たされずスキップされていた。

**修正**: `refetchProjects()` 完了後に `getProjects()` API を直接呼んで最新の `maimlFileKey` を確定させてから `getAnalysisResult()` を呼ぶよう修正。

### Bug 2: ダイアログ2回目以降オープン時にCollapseパネルが描画されない

**根本原因**:
Ant Design の `Modal` はデフォルトで `destroyOnClose={false}`。一度開くとDOMに残り続けるため、2回目以降のオープン時に `Collapse` の `defaultActiveKey` は初回マウント時にのみ適用され、パネルが閉じたまま再表示されていた。

**修正**: `MaimlValidationDialog` の `Modal` に `destroyOnClose` プロパティを追加。

### Bug 3: 保存時にプロジェクト名のファイルが新規生成される

**根本原因**:
S3保存時の `fileKey` 決定ロジックで `documentData.name` を使用していたが、これはMAIML読み込み時に `originalFileName`（プロジェクト名）で強制上書きされる `<Document name="...">` 属性。ファイル名とは別物。

**修正**: `sourceS3Key` が存在する場合は `sourceS3Key` のファイル名を維持するよう修正。

---

## 8. テスト実行結果

| スイート | テスト数 | PASS | FAIL |
|---|---|---|---|
| maimlController.validation | 10 | 10 | 0 |
| maimlService.validateMaiML | 7 | 7 | 0 |
| maimlApiService.validation | 10 | 10 | 0 |
| **合計** | **27** | **27** | **0** |

### テストケース詳細

#### バックエンド: コントローラーテスト（`maimlController.validation.test.ts`）

| # | テストケース | 結果 |
|---|---|---|
| 1 | getAnalysisResult: レコードが存在する場合は 200 + data を返す | ✅ PASS |
| 2 | getAnalysisResult: レコードが存在しない場合は 404 を返す | ✅ PASS |
| 3 | getAnalysisResult: fileKey が空の場合は 400 を返す | ✅ PASS |
| 4 | getAnalysisResult: fileKey が配列の場合は 400 を返す | ✅ PASS |
| 5 | getAnalysisResult: DB例外発生時は 500 を返す | ✅ PASS |
| 6 | validate: バリデーション成功時に success:true と結果を返す | ✅ PASS |
| 7 | validate: fileKey 省略時はデフォルト値で呼ばれる | ✅ PASS |
| 8 | validate: バリデーションエラーがある場合も success:true で返す | ✅ PASS |
| 9 | validate: maimlService が例外を投げた場合は 500 を返す | ✅ PASS |
| 10 | validate: content が不正な Base64 の場合は 500 を返す | ✅ PASS |

#### バックエンド: サービステスト（`maimlService.validateMaiML.test.ts`）

| # | テストケース | 結果 |
|---|---|---|
| 1 | fileKey あり + skipAnalysisSave=false の場合、effectiveSkip=false で analyzeMaiMLFile が呼ばれる | ✅ PASS |
| 2 | fileKey が空文字の場合、effectiveSkip=true（DB保存スキップ）で呼ばれる | ✅ PASS |
| 3 | skipAnalysisSave=true の場合、effectiveSkip=true（DB保存スキップ）で呼ばれる | ✅ PASS |
| 4 | デフォルト引数（fileKey=""）の場合、effectiveSkip=true で呼ばれる | ✅ PASS |
| 5 | バリデーションエラーがある場合は isValid=false の AnalysisResult を返す | ✅ PASS |
| 6 | analyzeMaiMLFile が例外を投げた場合、例外が伝播する | ✅ PASS |
| 7 | fileKey あり + skipAnalysisSave=false で fileKey が analyzeMaiMLFile に渡される | ✅ PASS |

#### フロントエンド: APIサービステスト（`maimlApiService.validation.test.ts`）

| # | テストケース | 結果 |
|---|---|---|
| 1 | validateMaiml: options なしで呼んだ場合、strict=false / fileKey="" がリクエストに含まれる | ✅ PASS |
| 2 | validateMaiml: options.strict=true を渡した場合、strict=true がリクエストされる | ✅ PASS |
| 3 | validateMaiml: options.fileKey を渡した場合、fileKey がリクエストに含まれる | ✅ PASS |
| 4 | validateMaiml: API 成功時に ApiResponse<AnalysisResult> を返す | ✅ PASS |
| 5 | validateMaiml: API エラー時に例外を投げる | ✅ PASS |
| 6 | getAnalysisResult: fileKey を encodeURIComponent して GET リクエストを送る | ✅ PASS |
| 7 | getAnalysisResult: レコードが存在する場合に MaimlAnalysisResultRow を返す | ✅ PASS |
| 8 | getAnalysisResult: データが null の場合でも ApiResponse を返す | ✅ PASS |
| 9 | getAnalysisResult: API エラー時（404等）に例外を投げる | ✅ PASS |
| 10 | getAnalysisResult: fileKey に特殊文字が含まれる場合も正しくエンコードされる | ✅ PASS |

---

## 9. 実装中に判明した事項・設計変更

### MaimlValidationDialog を独立コンポーネントとして実装
PLAN では Modal をインラインで実装する方針だったが、コードの見通しをよくするために `MaimlValidationDialog.tsx` として独立コンポーネントに切り出した。

### maimlHasErrors の判定ロジック
`ProjectManagement.tsx` でプロジェクト選択時（タブアクティブ時）に `getAnalysisResult` API を呼び出し、取得した結果から `errors` JSON をパースして `maimlHasErrors` を算出。`useMemo` で管理し `TaskRegistrationTab` に props で渡す。

### FileListTable の警告アイコン型
`maimlValidationRow` の型は `MaimlFileRow | null`（`MaimlAnalysisResultRow` 型を参照）。

### uuid ESM 対応
`validationHistoryRepository.ts` が `uuid` を import しており、Jest の CommonJS 環境で ESM エラーが発生した。既存の `jest.config.js` に `transformIgnorePatterns` と `moduleNameMapper` が設定されているが、各テストファイルに `jest.mock('uuid', ...)` を追加して対応。

### analyzeMaiMLFile の引数順序確認
テスト作成時に `(organizationId, fileKey, content, ...)` と想定していたが、実際は `(organizationId, content, fileKey, ...)` の順序。実コードを確認して期待値を修正。

### ダイアログレイアウト修正（タスク2）
バリデーションダイアログを ul/li シンプルリストから ValidationPanel に合わせた Card + Collapse + List + Tag 構成に変更。`canBeIgnoredOnUpload` でエラーを「致命的エラー」「編集可能エラー」に分類して表示。

---

## 10. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| skipAnalysisSaveデフォルト変更の影響範囲 | 中 | 低 | fileKeyが空の場合は保存スキップのフォールバックを追加 |
| アップロード時DB保存が重い | 低 | 低 | 既存の非同期処理内なので影響なし |
| エディタでfileKeyが取れない（新規作成中） | 低 | 中 | fileKey=""の場合は保存スキップ（既存動作） |
| refetchProjects完了後もprojectsステートが未更新 | 中 | 中 | getProjects() を直接呼んで最新maimlFileKeyを取得 |

---

## 11. 実施記録

### 実施日時
- **開始**: 2026-04-24 08:56
- **完了**: 2026-04-24 14:15

### タスク別実施内容

| タスク | 内容 | 完了日時 |
|--------|------|---------|
| MAIMLバリデーション機能追加（メイン） | Phase 1〜6 全実装 + UI仕様書更新 | 2026-04-24 09:50 |
| MAIMLバリデーションダイアログ修正 | アップロード後DB結果リフレッシュ修正・ダイアログレイアウト修正・保存時DB登録追加 | 2026-04-24 13:18頃 |
| MAIMLバリデーション表示バグ修正 | アップロード後警告アイコン修正・`destroyOnClose` 追加 | 2026-04-24 13:30頃 |
| 保存時ファイル名バグ修正 | `PetriNetEditorInner.tsx` の `fileKey` 決定ロジック修正 | 2026-04-24 14:15 |
