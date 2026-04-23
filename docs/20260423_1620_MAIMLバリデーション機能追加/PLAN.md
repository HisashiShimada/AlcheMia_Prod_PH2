# タスク計画書: MAIMLバリデーション機能追加

## メタデータ
- **作成日時**: 2026-04-23 16:20
- **更新日時**: 2026-04-23 16:40
- **タスクID**: maiml-validation-button
- **優先度**: 中
- **推定工数**: 4〜6時間

## タスク概要

`ProjectManagement.tsx` にて、プロジェクト選択後に対象プロジェクトの MAIMLファイルの
バリデーションを実行するボタンを追加する。

解析結果に問題がある場合、以下の箇所に警告アイコン/バッジを表示する。
1. **プロジェクト情報ヘッダー**のプロジェクト名の横
2. **ファイル一覧テーブル**の MAIMLファイル行の横

---

## 調査結果サマリー

### 既存のバリデーション API
- **POST `/api/v1/maiml/validate`**
  - リクエスト: `{ content: string (Base64), fileKey?: string, skipAnalysisSave?: boolean }`
  - `skipAnalysisSave = true`（デフォルト）→ DB保存なし（エディタ用）
  - `skipAnalysisSave = false` → `maiml_analysis_results` テーブルに自動UPSERT保存
  - フロント: `validateMaiml(content, strict)` ← 引数を `fileKey`, `skipAnalysisSave` に拡張が必要

### バリデーション結果のDB保存（既存）
- テーブル: `maiml_analysis_results`
  - 主キー: `id (SERIAL)`、ユニーク: `file_key`
  - カラム: `is_valid`, `errors (JSONB)`, `warnings (JSONB)`, `statistics`, `analysis_timestamp` 等
- Repository: `maimlAnalysisResultRepository.ts` に `upsert()`, `getByFileKey()` 関数あり

### DB保存済み結果の取得 API（**未実装 → 新規追加が必要**）
- `GET /api/v1/maiml/analysis-result?fileKey=xxx` を新規追加する
- プロジェクト選択時に呼び出し → 過去の結果があれば警告アイコンを表示

### 型定義
- `AnalysisResult` 型: `frontend/src/types/maimlValidation.ts` に定義済み
  - `isValid`, `errors: ErrorContent[]`, `warnings: ErrorContent[]` 等

### 変更対象コンポーネント
- **バックエンド**: `maimlController.ts`, `maimlRoutes.ts`（analysis-result取得エンドポイント追加）
- **フロントエンド**:
  - `maimlApiService.ts`（validateMaiml 引数拡張、getAnalysisResult 追加）
  - `ProjectManagement.tsx`（バリデーションボタン・警告アイコン・モーダル追加）
  - `FileListTable.tsx`（MAIMLファイル行への警告アイコン追加）

### ValidationPanel.tsx の参考
- `ValidationPanel.tsx` が既にバリデーション結果表示UIとして存在
- 自動補正機能がある → 今回は **不要** のため `onAutoCorrect` を渡さない（シンプルな Props で再利用）
- またはモーダル内でインラインに結果表示（Collapse + List で同等UIを構築）

---

## 目的と期待される成果

### 目的
- プロジェクト管理画面から直接 MAIMLファイルのバリデーションを実行できるようにする
- バリデーション結果をDBに保存し、次回アクセス時も警告状態を維持する
- バリデーション結果（エラー/警告）を画面上で視覚的に確認できるようにする

### 期待される成果
- [ ] プロジェクト選択時に DB から過去のバリデーション結果を自動取得・表示する
- [ ] ファイル操作ツールバーに「バリデーション」ボタンが表示される
- [ ] ボタン押下時に MAIMLバリデーション API が呼び出され、結果が DB に保存される
- [ ] バリデーション結果がモーダル（ValidationPanel 流用）で表示される
- [ ] エラー・警告がある場合、プロジェクト名の横に警告アイコンが表示される
- [ ] エラー・警告がある場合、ファイル一覧の MAIMLファイル行の横に警告アイコンが表示される
- [ ] MAIMLファイルが存在しない場合はボタンが無効化される

---

## 実装ステップ

### Phase 1: バックエンド — 分析結果取得 API 追加

**新規エンドポイント**: `GET /api/v1/maiml/analysis-result`

**maimlController.ts に追加**:
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

**maimlRoutes.ts に追加**:
```typescript
router.get(
  '/analysis-result',
  authMiddleware,
  [query('fileKey').notEmpty().withMessage('fileKeyは必須です')],
  handleValidationErrors,
  maimlController.getAnalysisResult
);
```

**validate エンドポイントの変更**: `skipAnalysisSave` のデフォルトをそのまま維持
- プロジェクト管理画面からは `skipAnalysisSave = false`, `fileKey` を渡して呼び出す

### Phase 2: フロントエンド — maimlApiService.ts 変更

**`validateMaiml` 関数の引数を拡張**（既存の `strict` 引数は残す or 整理）:
```typescript
export const validateMaiml = async (
  content: string,
  options?: {
    fileKey?: string;
    skipAnalysisSave?: boolean;
    strict?: boolean;
  }
): Promise<ApiResponse<AnalysisResult>> => {
  const client = createApiClient();
  const response = await client.post<ApiResponse<AnalysisResult>>(
    '/maiml/validate',
    {
      content,
      fileKey: options?.fileKey,
      skipAnalysisSave: options?.skipAnalysisSave ?? true,
      strict: options?.strict ?? false,
    }
  );
  return response.data;
};
```

**`getAnalysisResult` 関数を新規追加**:
```typescript
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

**型定義の追加** (`maimlApiService.ts` 内 or `types/maimlValidation.ts`):
```typescript
/** DB保存済みの分析結果（maiml_analysis_results テーブル） */
export interface MaimlAnalysisResultRow {
  id: number;
  file_key: string;
  is_valid: boolean;
  errors: string; // JSON文字列
  warnings: string; // JSON文字列
  analysis_timestamp: string;
  // ...
}
```

### Phase 3: ProjectManagement.tsx の変更

**追加するステート**:
```typescript
const [isValidating, setIsValidating] = useState(false);
const [validationResult, setValidationResult] = useState<AnalysisResult | null>(null);
const [validationModalOpen, setValidationModalOpen] = useState(false);
```

**プロジェクト選択時に DB から過去の結果を取得**:
```typescript
// selectedProject が変わるたびに過去のバリデーション結果を取得
useEffect(() => {
  if (!selectedProject?.maimlFileKey) {
    setValidationResult(null);
    return;
  }
  getAnalysisResult(selectedProject.maimlFileKey)
    .then(res => {
      if (res.data) {
        // DB保存済みの結果を AnalysisResult 形式に変換
        setValidationResult({
          fileKey: res.data.file_key,
          isValid: res.data.is_valid,
          errors: JSON.parse(res.data.errors || '[]'),
          warnings: JSON.parse(res.data.warnings || '[]'),
          autoCorrections: [],
        });
      } else {
        setValidationResult(null);
      }
    })
    .catch(() => setValidationResult(null));
}, [selectedProject?.maimlFileKey]);
```

**バリデーション実行ハンドラ**:
```typescript
const handleValidate = useCallback(async () => {
  if (!selectedProject?.maimlFileKey || !maimlContent) return;
  
  setIsValidating(true);
  try {
    // ブラウザ環境での Base64 エンコード
    const base64Content = btoa(unescape(encodeURIComponent(maimlContent)));
    const res = await validateMaiml(base64Content, {
      fileKey: selectedProject.maimlFileKey,
      skipAnalysisSave: false, // DB保存あり
    });
    
    if (res.success && res.data) {
      setValidationResult(res.data);
      setValidationModalOpen(true);
    }
  } catch (error) {
    message.error('バリデーションの実行に失敗しました');
  } finally {
    setIsValidating(false);
  }
}, [selectedProject, maimlContent]);
```

**バリデーションボタン追加**（ファイル操作ツールバー内）:
```tsx
<Button
  icon={<SafetyCertificateOutlined />}
  onClick={handleValidate}
  loading={isValidating}
  disabled={!selectedProject || !maimlContent}
>
  MAIMLバリデーション
</Button>
```

**プロジェクト名横の警告アイコン**（プロジェクト情報ヘッダー内）:
```tsx
{validationResult && !validationResult.isValid && (
  <Tooltip
    title={`バリデーションエラーがあります (エラー${validationResult.errors.length}件・警告${validationResult.warnings.length}件)`}
  >
    <WarningOutlined style={{ color: token.colorWarning, fontSize: 18, marginLeft: 8 }} />
  </Tooltip>
)}
```

**バリデーション結果モーダル** — `ValidationPanel` を再利用（自動補正なし）:
```tsx
<ValidationPanel
  show={validationModalOpen}
  validationResult={validationResult}
  onClose={() => setValidationModalOpen(false)}
  onRevalidate={handleValidate}
  isValidating={isValidating}
  // onAutoCorrect は渡さない（自動補正不要）
/>
```

### Phase 4: FileListTable.tsx の変更

**Props に警告情報を追加**:
```typescript
interface FileListTableProps {
  // 既存のProps...
  maimlValidationResult?: AnalysisResult | null;
}
```

**MAIMLファイル行のファイル名カラムに警告アイコン追加**:
- `record.name` が `.maiml` で終わる行 かつ `maimlValidationResult?.isValid === false` の場合に表示
```tsx
{record.name?.endsWith('.maiml') && maimlValidationResult && !maimlValidationResult.isValid && (
  <Tooltip title={`バリデーションエラーあり`}>
    <WarningOutlined style={{ color: token.colorWarning, marginLeft: 6 }} />
  </Tooltip>
)}
```

**ProjectManagement.tsx 側で渡す**:
```tsx
<FileListTable
  ...
  maimlValidationResult={validationResult}
/>
```

---

## 変更ファイル一覧

### バックエンド

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/controllers/maimlController.ts` | `getAnalysisResult` 関数を追加 |
| `backend/src/routes/maimlRoutes.ts` | `GET /analysis-result` エンドポイントを追加 |

### フロントエンド

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/services/maimlApiService.ts` | `validateMaiml` 引数拡張、`getAnalysisResult` 関数追加 |
| `frontend/src/components/project/ProjectManagement.tsx` | バリデーションステート、ハンドラ、ボタン、警告アイコン、モーダル追加 |
| `frontend/src/components/project/FileListTable.tsx` | `maimlValidationResult` prop 追加、MAIMLファイル行の警告アイコン表示 |

---

## UI仕様詳細

### バリデーションボタン
| 状態 | 表示 |
|------|------|
| MAIMLファイルなし | 無効（`disabled`） |
| バリデーション前 | 「MAIMLバリデーション」（`SafetyCertificateOutlined`アイコン） |
| バリデーション中 | ローディングスピナー + 「MAIMLバリデーション」 |

### 警告アイコン表示条件
| 箇所 | 表示条件 |
|------|---------|
| プロジェクト名横 | `validationResult?.isValid === false` |
| ファイル一覧のMAIMLファイル行 | 同上 |
| 表示タイミング | ①プロジェクト選択時（DB取得結果を反映）、②バリデーション実行後 |

### バリデーション結果モーダル（ValidationPanel 流用）
- タイトル: 「🔍 バリデーション結果」
- 成功時: `Alert` で「MaiMLファイルは有効です」
- エラーあり: `Collapse + List` でエラー詳細（severity タグ, XPath, メッセージ等）
- 警告あり: 別セクションで警告詳細
- **自動補正ボタンなし**（`onAutoCorrect` を渡さない）
- 「再検証」ボタンあり（`onRevalidate={handleValidate}`）

### プロジェクト切り替え時の動作
- 別プロジェクトを選択 → DB から新しい分析結果を取得（なければリセット）

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| maiml_analysis_resultsにfileKeyが未登録 | 低 | 中 | getAnalysisResult が null を返す → 警告アイコム非表示（正常動作） |
| Base64エンコード（日本語文字） | 低 | 低 | `btoa(unescape(encodeURIComponent(content)))` で対処 |
| validateMaiml引数変更の既存影響 | 中 | 低 | options オブジェクト型にして後方互換を維持 |
| FileListTableのmaiml行識別方法 | 低 | 低 | `record.name.endsWith('.maiml')` または `record.fileType` で判定 |

---

## テスト計画

### 手動テスト
- [ ] MAIMLファイルなしのプロジェクトでボタンが無効化されること
- [ ] MAIMLファイルありのプロジェクトでボタンが有効化されること
- [ ] プロジェクト選択時に過去のバリデーション結果がDBから取得されること
- [ ] 過去にエラーがあった場合、選択時から警告アイコンが表示されること
- [ ] バリデーション実行後にDB保存されること（再選択後も警告が残ること）
- [ ] バリデーション成功時に警告アイコンが消えること
- [ ] ValidationPanel でエラー/警告一覧が表示されること
- [ ] 「再検証」ボタンで再実行できること
- [ ] ファイル一覧のMAIMLファイル行に警告アイコンが表示されること

---

## 承認記録

- **計画書提示日時**: 2026-04-23 16:40
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

---

## 実施記録

### 実施日時
開始: （記入予定）
完了: （記入予定）

### 計画からの変更点
（実施後記入）

### 発生した問題と解決方法
（実施後記入）
