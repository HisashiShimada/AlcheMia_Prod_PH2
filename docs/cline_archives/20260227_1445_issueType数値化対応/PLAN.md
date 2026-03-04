# タスク計画書: issueType数値化対応

## メタデータ
- **作成日時**: 2026-02-27 14:45
- **タスクID**: issueType数値化対応
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

問題管理APIの `issueType` が文字列から数値（integer）に変更されました。
`issueType` は `code_master` テーブルの `code_division = 'issue_type'` のレコードの `code_value` の値（数値）を使用します。

対象API:
- **1. 問題報告API** (`POST /api/v1/issues`): issueType バリデーションを code_master 参照に変更
- **3. 問題一覧取得API** (`GET /api/v1/issues`): issueType クエリパラメータを数値として処理

## 目的と期待される成果

### 目的
- issueType の型を文字列Union型から `number` 型に変更
- 問題報告API で issueType が code_master に登録された有効な値かを動的に検証
- 問題一覧取得API で issueType フィルタを数値として扱う

### 期待される成果
- [ ] `types/issue.ts` の issueType 関連型が number 型に更新される
- [ ] 問題報告時に code_master を参照して issueType の妥当性を検証できる
- [ ] 問題一覧取得時に issueType クエリパラメータが数値として処理される

## 実装ステップ

### Phase 1: 型定義更新
- [ ] `backend/src/types/issue.ts` の `IssueType` 型を `number` に変更
- [ ] `ISSUE_TYPE_VALUES` 定数を削除
- [ ] `IssueWithComments.issueType` を `number` に変更
- [ ] `IssueListFilters.issueType` を `number | undefined` に変更
- [ ] `IssueUpdateData.issueType` を `number` に変更

### Phase 2: Service層更新
- [ ] `backend/src/services/issueService.ts` の `validateIssueData` を async 化
- [ ] `codeMasterRepository` をインポート追加
- [ ] `ISSUE_TYPE_VALUES` の参照を削除
- [ ] issueType バリデーションを code_master 参照に変更

### Phase 3: Controller層更新
- [ ] `backend/src/controllers/issueController.ts` の `list` メソッドで issueType を parseInt で数値変換

## 影響範囲

### 変更するファイル
1. `backend/src/types/issue.ts` - 型定義変更
2. `backend/src/services/issueService.ts` - バリデーションロジック変更
3. `backend/src/controllers/issueController.ts` - クエリパラメータ処理変更

### 新規作成するファイル
なし

### 影響を受ける機能
- 問題報告API（POST /api/v1/issues）
- 問題一覧取得API（GET /api/v1/issues）

## 技術的詳細

### issueType バリデーション変更内容

**変更前（ハードコード）:**
```typescript
const validIssueTypeNumbers = [1, 2, 3, 4, 5];
if (!validIssueTypeNumbers.includes(data.issueType as number)) {
  throw new ValidationError('無効な問題タイプです。1-5のいずれかを指定してください');
}
```

**変更後（code_master 参照）:**
```typescript
// 正の整数チェック
if (typeof issueType !== 'number' || !Number.isInteger(issueType) || issueType <= 0) {
  throw new ValidationError('問題タイプは正の整数である必要があります');
}
// code_master 参照チェック
const validCodes = await codeMasterRepository.findByDivision(organizationId, 'issue_type');
const validValues = validCodes.map(cm => Number(cm.code_value));
if (!validValues.includes(issueType)) {
  throw new ValidationError('無効な問題タイプです');
}
```

### issueType クエリパラメータ処理変更内容

**変更前:**
```typescript
issueType: req.query.issueType as string | undefined,
```

**変更後:**
```typescript
const issueTypeRaw = req.query.issueType as string | undefined;
const issueTypeNum = issueTypeRaw !== undefined ? parseInt(issueTypeRaw, 10) : undefined;
issueType: issueTypeNum !== undefined && !isNaN(issueTypeNum) ? issueTypeNum : undefined,
```

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| code_master テーブルに issue_type が未登録 | 中 | 低 | バリデーションエラーが返る（正常動作） |
| 既存のフロントエンドが文字列で送信している | 高 | 中 | フロントエンド側の修正は別タスク扱い |

## テスト計画

### 手動テスト
- [ ] issueType=1（有効な数値）で問題報告 → 成功
- [ ] issueType=999（無効な数値）で問題報告 → 400エラー
- [ ] issueType=0（0以下）で問題報告 → 400エラー
- [ ] GET /api/v1/issues?issueType=1 → 数値フィルタが適用される

## フロントエンド側調査結果と修正計画

### 調査対象ファイル

| ファイル | issueType の利用方法 |
|---------|-------------------|
| `frontend/src/types/experimentWorker.ts` | `IssueType` を文字列Union型として定義。`IssueReportData`, `Issue`, `IssueReportFormData` で参照 |
| `frontend/src/services/issueApiService.ts` | `CreateIssueParams.issueType: string`, `GetIssuesParams.issueType?: string`, `CreateIssueApiData.issueType: string`, `IssueApiData.issueType: string` |
| `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` | `useCodeMaster('issue_type')` で取得した options を `<Select>` に渡す。`SelectOption.value` は `number \| string` 型のため変更不要 |
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | `issue.issueType` を `createIssue()` に渡すのみ。型が変われば自動整合するため変更不要 |
| `frontend/src/components/ExperimentWorker/TransitionList.tsx` | 同上。変更不要 |

### フロントエンド修正ファイル（2ファイル）

#### Phase 4: `frontend/src/types/experimentWorker.ts`

**変更前:**
```typescript
export type IssueType = 
  | 'material_shortage'
  | 'equipment_failure'
  | 'procedure_unclear'
  | 'safety_concern'
  | 'quality_issue'
  | 'time_constraint'
  | 'other';
```

**変更後:**
```typescript
// code_master テーブルの code_division='issue_type' の code_value（整数）
export type IssueType = number;
```

この変更により以下も自動的に `number` 型に変わる:
- `IssueReportData.issueType: IssueType`
- `Issue.issueType?: IssueType`
- `IssueReportFormData.issueType: IssueType`

#### Phase 5: `frontend/src/services/issueApiService.ts`

| 箇所 | 変更前 | 変更後 |
|------|--------|--------|
| `CreateIssueParams.issueType` | `string` | `number` |
| `GetIssuesParams.issueType?` | `string` | `number` |
| `CreateIssueApiData.issueType` | `string` | `number` |
| `IssueApiData.issueType` | `string` | `number` |
| `mapToIssue` 内のキャスト | `data.issueType as IssueType \| undefined` | `data.issueType` (キャスト不要) |

### フロントエンド追加テスト計画

- [ ] 問題報告モーダルで問題タイプを選択して送信 → 数値（code_value）が issueType として送信されること
- [ ] 問題一覧取得 → issueType が数値として返ってくること
- [ ] TypeScript コンパイルエラーが発生しないこと

## 承認記録
- **計画書提示日時**: 2026-02-27 14:45
- **承認日時**: 2026-02-27 14:45
- **承認者コメント**: 実装開始承認（バックエンド先行、フロントエンド追加対応）

## 実施記録

### 実施日時
開始: 2026-02-27 14:45
完了: （完了後に記入）

### 計画からの変更点
- フロントエンド側の修正（Phase 4, 5）を追加

### 最終的な成果物
- [x] `backend/src/types/issue.ts` 更新完了
- [x] `backend/src/services/issueService.ts` 更新完了
- [x] `backend/src/controllers/issueController.ts` 更新完了
- [x] `frontend/src/types/experimentWorker.ts` 更新完了
- [x] `frontend/src/services/issueApiService.ts` 更新完了
