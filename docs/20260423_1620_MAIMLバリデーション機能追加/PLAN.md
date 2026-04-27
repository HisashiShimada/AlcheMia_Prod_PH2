# タスク計画書: MAIMLバリデーション機能追加

## メタデータ
- **作成日時**: 2026-04-23 16:20
- **更新日時**: 2026-04-24 08:30
- **タスクID**: maiml-validation-button
- **優先度**: 中
- **推定工数**: 4〜6時間

---

## タスク概要

以下の3点を実装する。

1. **プロジェクト管理画面にバリデーション実行ボタンを追加する**
2. **ボタン押下時にダイアログを開き、DB保存済みの結果を表示 + その場で再バリデーション可能にする**
3. **すべてのバリデーション実行時（エディタ保存前・ValidationPanel・アップロード時・プロジェクト管理画面）に結果をDBに保存するよう変更する**

---

## 調査結果サマリー

### バリデーション実行箇所（現状）

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

### バックエンド バリデーション関数シグネチャ

```typescript
// maimlService.ts
export async function validateMaiML(
  organizationId: string,
  content: string,
  fileKey: string = '',
  skipAnalysisSave: boolean = true  // ← デフォルト true = DB保存しない
): Promise<AnalysisResult>
```

```typescript
// maimlApiService.ts（フロントエンド）
export const validateMaiml = async (
  content: string,
  strict: boolean = false          // ← fileKey, skipAnalysisSave を渡せない
): Promise<ApiResponse<AnalysisResult>>
```

---

## 目的と期待される成果

- [ ] プロジェクト管理画面にバリデーションボタンが表示される
- [ ] ボタン押下でダイアログが開き、DB保存済みの結果（最終バリデーション日時・エラー/警告一覧）が表示される
- [ ] ダイアログ内で「再バリデーション」ボタンを押すと、その場でバリデーションが実行される
- [ ] **バリデーション結果に問題がある場合（isValid=false）、以下の箇所に警告アイコンを常時表示する**
  - プロジェクト一覧テーブルのプロジェクト名横（DB保存済み結果を反映）
  - プロジェクト詳細ヘッダーのプロジェクト名横
  - ファイル一覧テーブルのMAIMLファイル行横
- [ ] **エディタ保存前バリデーション・ValidationPanel・アップロード・プロジェクト管理画面のすべてのバリデーションでDB保存が行われる**

---

## 実装方針

### バリデーション結果のDB保存を全箇所で有効化する方針

**バックエンド側の変更（最小限）**:
- `maimlService.validateMaiML` のデフォルトを `skipAnalysisSave = false` に変更
- ただし `fileKey` が空文字の場合はDB保存をスキップ（エディタで新規作成中など保存先が未確定の場合）
- アップロード時（`fileAccessService.ts`）は引き続き `skipSave=true` を明示（アップロード中の一時バリデーションはDB保存不要 → ただし今回の要件で「全て保存」なら `false` に変更）

**フロントエンド側の変更**:
- `validateMaiml` 関数に `fileKey` を渡せるよう引数を拡張
- エディタ内の呼び出し箇所に `fileKey`（現在開いているファイルのキー）を渡す

---

## 実装ステップ

### Phase 1: バックエンド変更

#### 1-1. `maimlService.ts` — デフォルト変更

```typescript
// 変更前
export async function validateMaiML(
  organizationId: string, content: string, fileKey: string = '', skipAnalysisSave: boolean = true
)

// 変更後
export async function validateMaiML(
  organizationId: string, content: string, fileKey: string = '', skipAnalysisSave: boolean = false
)
```

> **注意**: `fileKey` が空の場合 `maimlParser.ts` 内で保存スキップされる仕組みを確認する。
> 空の場合は `skipSave=true` にフォールバックするロジックを追加する。

#### 1-2. `maimlController.ts` — DB保存済み結果の取得エンドポイント追加

```typescript
/**
 * MAIML分析結果取得（DB保存済み）
 * GET /api/v1/maiml/analysis-result?fileKey=xxx
 */
export async function getAnalysisResult(req: Request, res: Response): Promise<void> {
  try {
    const { fileKey } = req.query as { fileKey: string };
    const result = await maimlAnalysisResultRepository.getByFileKey(fileKey);
    res.json({
      success: true,
      data: result || null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(res, error, 'MAIML分析結果取得エラー');
  }
}
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
// 変更前
true, // skipSave=true: DB保存はスキップ

// 変更後
false, // skipSave=false: DB保存を行う
```

---

### Phase 2: フロントエンド — maimlApiService.ts 変更

#### 2-1. `validateMaiml` 関数の引数拡張

```typescript
// 変更前
export const validateMaiml = async (
  content: string,
  strict: boolean = false
): Promise<ApiResponse<AnalysisResult>>

// 変更後
export const validateMaiml = async (
  content: string,
  options?: {
    strict?: boolean;
    fileKey?: string;
  }
): Promise<ApiResponse<AnalysisResult>> => {
  const client = createApiClient();
  const response = await client.post<ApiResponse<AnalysisResult>>(
    '/maiml/validate',
    {
      content,
      strict: options?.strict ?? false,
      fileKey: options?.fileKey ?? '',
    }
  );
  return response.data;
};
```

#### 2-2. `getAnalysisResult` 関数を新規追加

```typescript
/** DB保存済みの分析結果行 */
export interface MaimlAnalysisResultRow {
  id: number;
  file_key: string;
  is_valid: boolean;
  errors: string;      // JSON文字列
  warnings: string;    // JSON文字列
  analysis_timestamp: string;
}

/**
 * MAIML分析結果取得（DB保存済み）
 * GET /maiml/analysis-result?fileKey=xxx
 */
export const getAnalysisResult = async (
  fileKey: string
): Promise<ApiResponse<MaimlAnalysisResultRow | null>> => {
  const client = createApiClient();
  const response = await client.get<ApiResponse<MaimlAnalysisResultRow | null>>(
    `/maiml/analysis-result?fileKey=${encodeURIComponent(fileKey)}`
  );
  return response.data;
};
```

---

### Phase 3: フロントエンド — PetriNetEditorInner.tsx 変更

#### 方針: すべてのバリデーションはDB保存。ValidationPanelを開く際はDB保存済み結果を初期表示し、再実行も可能にする。

#### 3-1. バリデーション呼び出し2箇所に `fileKey` を追加

```typescript
// handleOpenSaveConfirmDialog 内
const response = await maimlService.validateMaiml(base64Data, { fileKey: currentFileKey });

// handleOpenValidationPanel 内
const response = await maimlService.validateMaiml(base64Data, { fileKey: currentFileKey });
```

> `currentFileKey` はエディタが現在開いているファイルキー（既存の状態変数から取得）。
> 新規作成中（fileKeyなし）の場合は空文字のままでOK（DB保存スキップ）。

#### 3-2. ValidationPanel を開く際にDB保存済み結果を初期取得

`handleOpenValidationPanel` の先頭でDBから前回の結果を取得し、ValidationPanelに初期値として渡す。
取得後、パネルを開く。ユーザーが「再バリデーション実行」を押した場合のみAPIを呼ぶ。

```typescript
const handleOpenValidationPanel = useCallback(async () => {
  // DB保存済み結果を取得して初期表示
  if (currentFileKey) {
    const savedResult = await maimlService.getAnalysisResult(currentFileKey);
    if (savedResult?.data) {
      setSavedValidationResult(savedResult.data);
    }
  }
  setValidationPanelOpen(true);
  // 再バリデーションは ValidationPanel 内の「再実行ボタン」から呼ぶ
}, [...]);
```

ValidationPanel 内に「再バリデーション実行」ボタンを追加（または既存の「再検証」ボタンを流用）し、
押下時に `handleRevalidate`（`validateMaiml` with `fileKey`）を呼ぶ。

---

### Phase 4: フロントエンド — ProjectManagement.tsx 変更

#### 追加するステート

```typescript
const [isValidating, setIsValidating] = useState(false);
const [validationResult, setValidationResult] = useState<AnalysisResult | null>(null);
const [savedValidationRow, setSavedValidationRow] = useState<MaimlAnalysisResultRow | null>(null);
const [validationDialogOpen, setValidationDialogOpen] = useState(false);
```

#### プロジェクト選択時にDB保存済み結果を取得

```typescript
useEffect(() => {
  if (!selectedProject?.maimlFileKey) {
    setSavedValidationRow(null);
    setValidationResult(null);
    return;
  }
  getAnalysisResult(selectedProject.maimlFileKey)
    .then(res => setSavedValidationRow(res.data ?? null))
    .catch(() => setSavedValidationRow(null));
}, [selectedProject?.maimlFileKey]);
```

#### バリデーション実行ハンドラ

```typescript
const handleValidate = useCallback(async () => {
  if (!selectedProject?.maimlFileKey || !maimlContent) return;
  setIsValidating(true);
  try {
    const base64Content = btoa(unescape(encodeURIComponent(maimlContent)));
    const res = await validateMaiml(base64Content, {
      fileKey: selectedProject.maimlFileKey,
    });
    if (res.success && res.data) {
      setValidationResult(res.data);
      // DB保存済み結果も更新
      setSavedValidationRow({
        id: 0,
        file_key: selectedProject.maimlFileKey,
        is_valid: res.data.isValid,
        errors: JSON.stringify(res.data.errors),
        warnings: JSON.stringify(res.data.warnings),
        analysis_timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    message.error('バリデーションの実行に失敗しました');
  } finally {
    setIsValidating(false);
  }
}, [selectedProject, maimlContent]);
```

#### バリデーションボタン（プロジェクト操作エリアに追加）

```tsx
<Button
  icon={<SafetyCertificateOutlined />}
  onClick={() => setValidationDialogOpen(true)}
  disabled={!selectedProject}
>
  バリデーション確認
</Button>
```

#### プロジェクト名横の警告アイコン

```tsx
{savedValidationRow && !savedValidationRow.is_valid && (
  <Tooltip title={`バリデーションエラーがあります（最終確認: ${new Date(savedValidationRow.analysis_timestamp).toLocaleString()}）`}>
    <WarningOutlined style={{ color: token.colorWarning, fontSize: 18, marginLeft: 8 }} />
  </Tooltip>
)}
```

#### バリデーション結果ダイアログ（ValidationPanel 流用）

```tsx
<Modal
  title="🔍 MAIMLバリデーション"
  open={validationDialogOpen}
  onCancel={() => setValidationDialogOpen(false)}
  footer={null}
  width={800}
>
  {/* DB保存済み結果がある場合は最終確認日時を表示 */}
  {savedValidationRow && (
    <Alert
      type={savedValidationRow.is_valid ? 'success' : 'warning'}
      message={`最終バリデーション: ${new Date(savedValidationRow.analysis_timestamp).toLocaleString()}`}
      style={{ marginBottom: 16 }}
    />
  )}
  
  {/* 再バリデーションボタン */}
  <Button
    icon={<SafetyCertificateOutlined />}
    onClick={handleValidate}
    loading={isValidating}
    disabled={!maimlContent}
    style={{ marginBottom: 16 }}
  >
    再バリデーション実行
  </Button>

  {/* バリデーション結果表示（ValidationPanel 流用 or インライン） */}
  {validationResult && (
    <ValidationPanel
      show={true}
      validationResult={validationResult}
      embedded={true}         // モーダル内埋め込みモード
      isValidating={isValidating}
    />
  )}
  {!validationResult && savedValidationRow && (
    <ValidationResultFromRow row={savedValidationRow} />
  )}
</Modal>
```

---

### Phase 5: フロントエンド — FileListTable.tsx 変更

#### Props 追加

```typescript
interface FileListTableProps {
  // 既存のProps...
  maimlValidationRow?: MaimlAnalysisResultRow | null;
}
```

#### MAIMLファイル行への警告アイコン

```tsx
{record.name?.endsWith('.maiml') && maimlValidationRow && !maimlValidationRow.is_valid && (
  <Tooltip title="バリデーションエラーあり">
    <WarningOutlined style={{ color: token.colorWarning, marginLeft: 6 }} />
  </Tooltip>
)}
```

---

## 変更ファイル一覧

### バックエンド

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/maimlService.ts` | `skipAnalysisSave` デフォルトを `false` に変更（fileKeyが空の場合はスキップ） |
| `backend/src/services/fileAccessService.ts` | アップロード時の `skipSave=true` を `false` に変更 |
| `backend/src/controllers/maimlController.ts` | `getAnalysisResult` 関数を追加 |
| `backend/src/routes/maimlRoutes.ts` | `GET /analysis-result` エンドポイントを追加 |

### フロントエンド

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/services/maimlApiService.ts` | `validateMaiml` 引数拡張、`getAnalysisResult`・`MaimlAnalysisResultRow` 追加 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | バリデーション呼び出し2箇所に `fileKey` を追加 |
| `frontend/src/components/project/ProjectManagement.tsx` | バリデーションボタン・ダイアログ・警告アイコン追加、DB結果取得 useEffect 追加、`maimlHasErrors` 算出と `TaskRegistrationTab` への受け渡し |
| `frontend/src/components/project/FileListTable.tsx` | `maimlValidationRow` prop 追加、MAIMLファイル行の警告アイコン追加 |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | `maimlHasErrors` prop 追加、エラー時のAlert表示・保存ボタン等の無効化 |

---

## UI仕様詳細

### バリデーションボタン（ProjectManagement 操作エリア）

| 状態 | 表示 |
|------|------|
| プロジェクト未選択 | 無効（`disabled`） |
| プロジェクト選択済み | 有効「バリデーション確認」ボタン |

### バリデーション結果ダイアログ

| 要素 | 内容 |
|------|------|
| ヘッダー | 最終バリデーション日時（DBから取得） |
| 結果バッジ | ✅ 有効 / ⚠️ エラーあり |
| 再バリデーションボタン | 押下でMAIMLを取得しバリデーション実行→DB保存 |
| エラー一覧 | severity/XPath/メッセージ（ValidationPanel 流用） |
| 警告一覧 | 別セクション |
| 自動補正ボタン | **なし**（ProjectManagement では不要） |

### 警告アイコン表示条件

| 箇所 | 対象コンポーネント | 条件 |
|------|-------------------|------|
| プロジェクト一覧テーブルのプロジェクト名横 | `ProjectFolderTree` or プロジェクト一覧 | DBから取得した `is_valid === false` |
| プロジェクト詳細ヘッダーのプロジェクト名横 | `ProjectManagement.tsx` 詳細エリア | `savedValidationRow?.is_valid === false` |
| ファイル一覧テーブルのMAIMLファイル行横 | `FileListTable.tsx` | 同上 |
| 更新タイミング | — | ①プロジェクト選択時（DB取得）、②再バリデーション実行後 |

### プロジェクト一覧の警告アイコン実装方針

プロジェクト一覧（`ProjectFolderTree` またはプロジェクト選択コンポーネント）にも警告アイコンを表示するには、
**プロジェクト一覧取得時に各プロジェクトの `maiml_analysis_results` をまとめて取得する API が必要**。

2つの実装方針：

**方針A（推奨）: プロジェクト一覧API にバリデーション状態を含める**
- `GET /api/v1/projects` のレスポンスに `validationStatus: { isValid: boolean, timestamp: string } | null` を追加
- バックエンドで JOIN または別クエリで `maiml_analysis_results` を取得してレスポンスに付与

**方針B: プロジェクト選択時のみ取得（Phase 4 の現行案）**
- プロジェクト選択時にDB取得 → 詳細ヘッダー・ファイル一覧のみ対応
- 一覧には警告アイコンを表示しない（シンプルな実装）

**今回のスコープ**: 方針Bで実装し、プロジェクト一覧への警告アイコンは Phase 2 として後日対応。

### エラー / ワーニングの区別と操作ブロック仕様

`AnalysisResult` の型定義により、エラーとワーニングは**別フィールドで区別されている**。

```typescript
errors: ErrorContent[];   // エラー（致命的）→ 実験計画進行をブロック
warnings: ErrorContent[]; // 警告（非致命的）→ 進行可能、警告アイコンのみ表示
```

DB（`maiml_analysis_results`）も `errors JSONB` と `warnings JSONB` で別カラム保存済み。

#### 警告アイコン色分け

| 状態 | アイコン色 | 意味 |
|------|----------|------|
| `errors.length > 0` | 🔴 赤（`colorError`） | チェックアウトをブロック |
| `errors.length === 0 && warnings.length > 0` | 🟡 黄（`colorWarning`） | 進行可能・注意喚起のみ |
| 問題なし | — | アイコンなし |

#### 操作ブロック対象

| 操作 | ブロック条件 | 対象コンポーネント |
|------|------------|-----------------|
| **タスク登録タブ内の操作** | `errors.length > 0`（MAIMLエラーあり） | `TaskRegistrationTab.tsx` |

> チェックアウトボタンはブロックしない。
> タスク登録タブ内でエラーがある場合は保存ボタン・メソッド追加ボタン等を無効化し、バリデーションエラーがある旨のAlert を表示する。

#### Phase 6 の実装内容（操作ブロック）

**`TaskRegistrationTab` に `maimlHasErrors` prop を追加**:

```typescript
// ProjectManagement.tsx から渡す
const maimlHasErrors = useMemo(() => {
  if (!savedValidationRow) return false;
  try {
    const errors = JSON.parse(savedValidationRow.errors || '[]');
    return Array.isArray(errors) && errors.length > 0;
  } catch {
    return false;
  }
}, [savedValidationRow]);

// TaskRegistrationTab に prop を追加
<TaskRegistrationTab
  // 既存のprops...
  maimlHasErrors={maimlHasErrors}
/>
```

**`TaskRegistrationTab.tsx` 内での制御**:

```tsx
// タブ上部に警告Alert を表示
{maimlHasErrors && (
  <Alert
    type="error"
    icon={<ExclamationCircleOutlined />}
    message="MAIMLファイルにエラーがあります"
    description="バリデーションエラーを解消するまでタスク登録の変更・保存はできません。プロジェクト管理画面のバリデーション確認ボタンで詳細を確認してください。"
    showIcon
    style={{ marginBottom: 16 }}
  />
)}

// 保存ボタン・メソッド追加ボタン等
<Button
  disabled={loadingMethods || isCheckoutLocked || maimlHasErrors}
  data-testid="task-registration-save-button"
>
  保存
</Button>
```

**変更するファイルに追加**:
- `frontend/src/components/project/TaskRegistrationTab.tsx` — `maimlHasErrors` prop 追加、Alertと操作ブロック追加

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| skipAnalysisSaveデフォルト変更の影響範囲 | 中 | 低 | fileKeyが空の場合は保存スキップのフォールバックを追加 |
| アップロード時DB保存が重い | 低 | 低 | 既存の非同期処理内なので影響なし |
| エディタでfileKeyが取れない（新規作成中） | 低 | 中 | fileKey=""の場合は保存スキップ（既存動作） |
| ValidationPanel の embedded モード非対応 | 中 | 中 | 対応していない場合はインラインでCollapseを構築 |

---

## テスト計画

### 手動テスト

- [ ] エディタ保存前バリデーション後にDBに結果が保存されていること
- [ ] エディタ ValidationPanel バリデーション後にDBに結果が保存されていること
- [ ] ファイルアップロード後にDBに結果が保存されていること
- [ ] プロジェクト管理画面でボタンが表示されること
- [ ] プロジェクト選択時にDB保存済みの結果が取得されること
- [ ] 過去にエラーがあった場合、選択時から警告アイコンが表示されること
- [ ] ダイアログを開くと最終バリデーション日時と結果が表示されること
- [ ] 再バリデーションボタンで実行でき、結果がDBに更新されること
- [ ] バリデーション成功時に警告アイコンが消えること
- [ ] ファイル一覧のMAIMLファイル行に警告アイコンが表示されること

---

## 承認記録

- **計画書更新日時**: 2026-04-24 08:37
- **承認日時**: 2026-04-24 08:38
- **承認者コメント**: 承認。新しいセッションで実装を開始する。

---

## 実施記録

### 実施日時
開始: 2026-04-24 09:00
完了: 2026-04-24 09:50

### 実施済み
- [x] Phase 1: バックエンド変更（maimlService.ts / maimlController.ts / maimlRoutes.ts / fileAccessService.ts）
- [x] Phase 2: フロントエンド maimlApiService.ts 変更（validateMaiml引数拡張・getAnalysisResult追加）
- [x] Phase 3: フロントエンド PetriNetEditorInner.tsx 変更（fileKey渡し・DB結果初期表示）
- [x] Phase 4: ProjectManagement.tsx（バリデーションボタン・ダイアログ・警告アイコン）
- [x] Phase 5: FileListTable.tsx（maimlValidationRow prop・警告アイコン）
- [x] Phase 6: TaskRegistrationTab.tsx（maimlHasErrors prop・Alert・操作ブロック）
- [x] UI仕様書更新（ui_project_management.md / ui_file_list_table.md / ui_task_registration_tab.md）

### 計画からの変更点
- validateMaimlダイアログはMaimlValidationDialog.tsxとして独立コンポーネントに実装
- ProjectManagement.tsxのmaimlHasErrors判定ロジックはgetAnalysisResult APIを使いタブアクティブ時に自動チェック
- FileListTable.tsxにmaimlValidationRow: MaimlFileRow | nullを追加してWarningアイコン表示
- TaskRegistrationTab.tsxにmaimlHasErrors?: booleanを追加してAlert + 保存ボタン無効化

### 発生した問題と解決方法
- 特になし。すべて計画通りに実装完了。

---

## 追加タスク計画書: MAIMLバリデーションダイアログ修正

### メタデータ
- **作成日時**: 2026-04-24 10:59
- **タスクID**: maiml-validation-dialog-fix
- **優先度**: 高
- **推定工数**: 1時間

### タスク概要

以下の3点を修正する。

1. アップロード直後にバリデーションダイアログを開いた際にアップロード時のバリデーション結果が表示されない
2. バリデーションダイアログのレイアウトがValidationPanelと違う（ValidationPanelの構成に寄せる）
3. MAIMLの保存時に実行しているバリデーション結果もDBに登録する

### 原因分析

#### ①アップロード後にDB結果が表示されない
- `savedValidationRow` は `selectedProject?.maimlFileKey` の useEffect で `getAnalysisResult()` を呼び出して取得する
- `handleUploadComplete` でアップロード後に `refetchProjects()` + `reloadMaiml()` しているが、`maimlFileKey` が変化しない場合（既存MAIMLの更新アップロード）は useEffect が再発火しない
- 結果、アップロードでDBに保存されたバリデーション結果が画面に反映されない

#### ②バリデーションダイアログのレイアウト
- 現在: ul/li シンプルリスト表示
- ValidationPanel: Card + Collapse + List + Tag で分類表示（致命的エラー/編集可能エラー/警告）

#### ③MAIMLの保存時にDBに登録されない
- `POST /maiml/save` → `maimlService.saveMaiML()` はバリデーションを実行しない
- `maiml_analysis_results` テーブルが更新されないため保存後にバリデーション結果が古くなる

### 実装ステップ

- [ ] `ProjectManagement.tsx`: `handleUploadComplete` に `hasMaimlFile=true` の場合 `getAnalysisResult()` を呼んで `setSavedValidationRow()` を更新する処理を追加
- [ ] `ProjectManagement.tsx`: Modal内のバリデーション結果表示部分を Card + Collapse + List + Tag 構成に書き直す
- [ ] `backend/src/services/maimlService.ts`: `saveMaiML()` 完了後に `maimlParser.analyzeMaiMLFile()` を `skipSave=false` で呼び出す

### 変更ファイル

1. `frontend/src/components/project/ProjectManagement.tsx` - ①②の修正
2. `backend/src/services/maimlService.ts` - ③の修正

### 承認記録
- **承認日時**: 2026-04-24 10:59

---

## 追加タスク計画書: MAIMLバリデーション表示バグ修正

### メタデータ
- **作成日時**: 2026-04-24 13:18
- **タスクID**: maiml_validation_display_bugfix
- **優先度**: 高
- **推定工数**: 1時間

### タスク概要

MAIMLファイルのアップロード後にバリデーション警告アイコンが表示されない問題と、
バリデーションダイアログを開いた際に警告詳細の中身が描画されない問題を修正する。

### 原因分析

#### Bug 1: アップロード後に警告アイコンが表示されない
- `handleUploadComplete` 内で `refetchProjects()` 呼び出し**前**に `currentProject` を取得している
- 初回MAIMLアップロード時: `currentProject.maimlFileKey` がまだ `null` のため、バリデーション取得のif条件が満たされずスキップされる
- 修正方針: `refetchProjects()` 完了後に `getProjects()` API を直接呼んで最新の `maimlFileKey` を確定させてから `getAnalysisResult()` を呼ぶ

#### Bug 2: ダイアログで警告の中身（Collapseパネル）が描画されない
- Ant Design の `Modal` はデフォルトで `destroyOnClose={false}`
- 一度開くと DOM に残り続けるため、2回目以降のオープン時に `Collapse` の `defaultActiveKey` は初回マウント時にのみ適用され、パネルが閉じたまま再表示される
- 修正方針: `Modal` コンポーネントに `destroyOnClose` プロパティを追加する

### 実装ステップ

- [ ] `ProjectManagement.tsx`: `handleUploadComplete` 修正（`maimlFileKey` 確定後にバリデーション結果取得）
- [ ] `MaimlValidationModal.tsx`: `Modal` に `destroyOnClose` 追加

### 変更ファイル

1. `frontend/src/components/project/ProjectManagement.tsx`
2. `frontend/src/components/project/MaimlValidationModal.tsx`

### 承認記録
- **承認日時**: 2026-04-24 13:18

---

## 追加タスク計画書: 保存時ファイル名バグ修正

### メタデータ
- **作成日時**: 2026-04-24 14:06
- **タスクID**: fix-save-filename-bug
- **優先度**: 高
- **推定工数**: 0.5時間

### タスク概要

プロジェクト名と異なる名前のファイルをアップロード後に編集して保存した際に、
元のファイルがバックアップ・更新されず、プロジェクト名のファイルが新規生成されるバグを修正する。

### 原因

`PetriNetEditorInner.tsx` の S3 保存処理にて、保存先 `fileKey` のファイル名部分を
`documentData?.name`（Document の name プロパティ）から決定しているが、
`documentData.name` は MAIML 読み込み時に `originalFileName`（プロジェクト名）で上書きされるため、
プロジェクト名のファイルが新規生成されてしまう。

### 修正方針

1. **sourceS3Key が存在する場合（既存ファイル編集）**: `sourceS3Key` をそのまま `fileKey` として使う
2. **ユーザーがフォルダを選択した場合**: `folder` + `sourceS3Key` のファイル名部分
3. **sourceS3Key がない場合（新規作成）**: `originalFileName`（プロジェクト名）でファイル名を決定
4. **`documentData.name` は使用しない**（MAIML の Document 要素の name 属性であり、ファイル名とは別物）

### 実装ステップ

- [ ] `PetriNetEditorInner.tsx` の S3 保存ロジック（2758行目付近）を修正

### 変更ファイル

1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

### 承認記録
- **承認日時**: 2026-04-24 14:06
