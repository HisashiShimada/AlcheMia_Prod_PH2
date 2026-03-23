# タスク計画書: 画面コンポーネントのエラーメッセージハンドリング整理

## メタデータ
- **作成日時**: 2026-03-23 11:57
- **タスクID**: component-error-handling
- **優先度**: 中
- **推定工数**: 1日
- **前提タスク**: [エラーコード体系化対応](../20260323_1037_エラーコード体系化対応/PLAN.md)

---

## 1. タスク概要

`components/` 配下の画面ソースでは、API呼び出し後の `catch` ブロックで  
エラーメッセージをハードコード文字列や `err.message` 直接参照で処理しており、  
バックエンドが返すエラーコード（E1001〜E9999）がUI表示に反映されていない。

本タスクでは、全コンポーネントの `catch` ブロックを  
`extractErrorMessage(err)` 経由に統一し、エラーコード体系化の恩恵を画面に届ける。

---

## 2. 目的と期待される成果

### 目的
- バックエンドが `E5001` 等のエラーコードを返した際、フロントエンドが適切な日本語メッセージを表示できるようにする
- ハードコード文字列によるメンテナンスコストを排除する
- `extractErrorMessage()` を唯一のエラーメッセージ取得経路として統一する

### 期待される成果
- [ ] 全14ファイルの `catch` ブロックが `extractErrorMessage(err)` 経由になる
- [ ] ハードコードエラー文字列（`'タスク一覧の取得中にエラーが発生しました'` 等）がゼロになる
- [ ] `err instanceof Error ? err.message : '...'` パターンがゼロになる

---

## 3. 背景・現状パターン

### パターン1: ハードコード文字列（APIエラーコードを完全無視）

```typescript
// ❌ 現状: APIが E7008 を返しても無視して固定文字列を表示
} catch {
  message.error('タスク一覧の取得中にエラーが発生しました');
}

// ✅ 修正後
} catch (err) {
  message.error(extractErrorMessage(err));
}
```

### パターン2: `err.message` 直接参照（errorMapper 未経由）

```typescript
// ❌ 現状: err.message をそのまま使用（エラーコードによるマッピング未適用）
const errorMessage = err instanceof Error ? err.message : '予期しないエラーが発生しました';
setError(errorMessage);

// ✅ 修正後
const errorMessage = extractErrorMessage(err);
setError(errorMessage);
```

### 追加 import（修正時に必要）

```typescript
import { extractErrorMessage } from '@/utils/errorUtils';
```

> **注意**: `extractErrorMessage(err)` は内部で `extractErrorCode(err)` → `mapErrorToMessage(code)` を呼ぶため、
> 追加実装は不要。既存のインフラをそのまま使用できる。

---

## 4. 対象ファイル一覧

### グループA: 認証系（優先度：高）

| # | ファイル | パターン | 件数 | 修正箇所の概要 |
|---|---------|---------|------|--------------|
| 1 | `auth/LoginForm.tsx` | パターン2 | 1件 | ログイン失敗時の `setError` |
| 2 | `auth/PINCodeForm.tsx` | パターン2 | 2件 | PIN認証・再送失敗時の `setError` |
| 3 | `auth/PasswordResetRequest.tsx` | パターン2 | 1件 | パスワードリセット要求失敗時の `setError` |
| 4 | `auth/PasswordResetExecute.tsx` | パターン2 | 1件 | パスワードリセット実行失敗時の `setError` |

### グループB: 実験作業系（優先度：高）

| # | ファイル | パターン | 件数 | 修正箇所の概要 |
|---|---------|---------|------|--------------|
| 5 | `ExperimentWorker/ExperimentRecordTab.tsx` | パターン1 | 4件 | タスク取得・問題取得・報告・コメント失敗 |
| 6 | `ExperimentWorker/InstructionConfirmationTab.tsx` | パターン1 | 3件 | タスク取得・フロー図読み込み・指示確認失敗 |
| 7 | `ExperimentWorker/TransitionList.tsx` | パターン1 | 4件 | 問題取得・報告・コメント・ステータス更新失敗 |
| 8 | `ExperimentWorker/ProgressCheckTab.tsx` | パターン1+2 | 複数件 | タスク取得・更新・リフレッシュ失敗 |
| 9 | `ExperimentWorker/IssueManagementModal.tsx` | パターン1 | 3件 | 問題取得・コメント送信・ステータス変更失敗 |
| 10 | `ExperimentWorker/DataRecordDialog.tsx` | パターン1 | 1件 | データ記録バリデーションエラー |
| 11 | `ExperimentWorker/InstructionFlowDialog.tsx` | パターン2 | 1件 | ファイル読み込み失敗 |
| 12 | `menus/ExperimentWorkerMenu.tsx` | パターン1 | 1件 | メニュー操作失敗 |

### グループC: エディタ系（優先度：低）

| # | ファイル | パターン | 件数 | 修正箇所の概要 |
|---|---------|---------|------|--------------|
| 13 | `editorv2/hooks/useWorkflow.ts` | パターン2 | 1件 | ワークフロー操作失敗 |
| 14 | `editorv2/hooks/useNamespaceOperations.ts` | パターン2 | 5件 | 名前空間操作（各種）失敗 |

---

## 5. 実装ステップ

### Phase 1: 認証系（グループA）
- [ ] `auth/LoginForm.tsx` — パターン2 → `extractErrorMessage(err)` に変更
- [ ] `auth/PINCodeForm.tsx` — パターン2 × 2件 → `extractErrorMessage(err)` に変更
- [ ] `auth/PasswordResetRequest.tsx` — パターン2 → `extractErrorMessage(err)` に変更
- [ ] `auth/PasswordResetExecute.tsx` — パターン2 → `extractErrorMessage(err)` に変更

### Phase 2: 実験作業系（グループB）
- [ ] `ExperimentWorker/ExperimentRecordTab.tsx` — パターン1 × 4件 → `extractErrorMessage(err)` に変更
- [ ] `ExperimentWorker/InstructionConfirmationTab.tsx` — パターン1 × 3件 → `extractErrorMessage(err)` に変更
- [ ] `ExperimentWorker/TransitionList.tsx` — パターン1 × 4件 → `extractErrorMessage(err)` に変更
- [ ] `ExperimentWorker/ProgressCheckTab.tsx` — パターン1+2 複数件 → `extractErrorMessage(err)` に変更
- [ ] `ExperimentWorker/IssueManagementModal.tsx` — パターン1 × 3件 → `extractErrorMessage(err)` に変更
- [ ] `ExperimentWorker/DataRecordDialog.tsx` — パターン1 × 1件 → `extractErrorMessage(err)` に変更
- [ ] `ExperimentWorker/InstructionFlowDialog.tsx` — パターン2 × 1件 → `extractErrorMessage(err)` に変更
- [ ] `menus/ExperimentWorkerMenu.tsx` — パターン1 × 1件 → `extractErrorMessage(err)` に変更

### Phase 3: エディタ系（グループC）
- [ ] `editorv2/hooks/useWorkflow.ts` — パターン2 × 1件 → `extractErrorMessage(err)` に変更
- [ ] `editorv2/hooks/useNamespaceOperations.ts` — パターン2 × 5件 → `extractErrorMessage(err)` に変更

### Phase 4: 最終確認
- [ ] ハードコード文字列残存チェック（`message.error('` + 日本語の組み合わせを検索）
- [ ] `err instanceof Error ? err.message` パターン残存チェック
- [ ] TypeScriptコンパイルエラーなし確認

---

## 6. 影響範囲

### 変更するファイル（14ファイル）
1. `frontend/src/components/auth/LoginForm.tsx`
2. `frontend/src/components/auth/PINCodeForm.tsx`
3. `frontend/src/components/auth/PasswordResetRequest.tsx`
4. `frontend/src/components/auth/PasswordResetExecute.tsx`
5. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
6. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
7. `frontend/src/components/ExperimentWorker/TransitionList.tsx`
8. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`
9. `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx`
10. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
11. `frontend/src/components/ExperimentWorker/InstructionFlowDialog.tsx`
12. `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
13. `frontend/src/components/editorv2/hooks/useWorkflow.ts`
14. `frontend/src/components/editorv2/hooks/useNamespaceOperations.ts`

### 新規作成するファイル
なし（インフラは前タスクで整備済み）

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `extractErrorMessage(err)` が null/undefined を受け取り例外発生 | 中 | 低 | `extractErrorMessage()` の実装を確認し、null セーフであることを確認してから進める |
| `catch` の引数が `unknown` 型でそのまま渡せない場合 | 低 | 低 | `extractErrorMessage()` は `unknown` 型を受け入れているため問題なし |
| エディタ系（グループC）が複雑で影響範囲が広い | 中 | 中 | グループC は最後に対応し、エディタ動作を手動で確認する |

---

## 8. テスト計画

### 手動テスト
- [ ] 認証失敗（E5001）時に「ユーザー名またはパスワードが正しくありません」が表示されること
- [ ] PIN認証失敗（E5003）時に適切なメッセージが表示されること
- [ ] 実験作業画面でAPIエラー発生時に固定文字列ではなくエラーコード対応メッセージが表示されること
- [ ] エディタ系でワークフロー操作失敗時に適切なメッセージが表示されること

---

## 9. 承認記録

- **計画書提示日時**: 2026-03-23 11:57
- **承認日時**: 2026-03-23 11:59（タスク指示にて承認済み）
- **承認者コメント**: 承認済みとして実装開始

---

## 10. 実施記録

### 実施日時
開始: 2026-03-23 12:00  
完了: 2026-03-23 12:07

### 計画からの変更点
なし（計画書通りに実施）

### 最終的な成果物
- [x] 全14ファイルの `catch` ブロックが `extractErrorMessage(err)` 経由に変更済み
- [x] ハードコードエラー文字列残存ゼロ確認済み（対象14ファイル内）

### 変更ファイル一覧

#### Phase 1: 認証系
1. `frontend/src/components/auth/LoginForm.tsx` — パターン2 → `extractErrorMessage` に変更
2. `frontend/src/components/auth/PINCodeForm.tsx` — パターン2 × 2件 → `extractErrorMessage` に変更
3. `frontend/src/components/auth/PasswordResetRequest.tsx` — パターン2 → `extractErrorMessage` に変更
4. `frontend/src/components/auth/PasswordResetExecute.tsx` — パターン2 → `extractErrorMessage` に変更

#### Phase 2: 実験作業系
5. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` — パターン1 × 4件 → `extractErrorMessage` に変更
6. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` — パターン1 × 3件 → `extractErrorMessage` に変更
7. `frontend/src/components/ExperimentWorker/TransitionList.tsx` — パターン1 × 4件 → `extractErrorMessage` に変更
8. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` — パターン1+2 複数件 → `extractErrorMessage` に変更
9. `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` — パターン1 × 3件 → `extractErrorMessage` に変更
10. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` — パターン1 × 1件 → `extractErrorMessage` に変更
11. `frontend/src/components/ExperimentWorker/InstructionFlowDialog.tsx` — パターン2 × 1件 → `extractErrorMessage` に変更
12. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` — パターン1 × 1件（else節）→ `extractErrorMessage` に変更

#### Phase 3: エディタ系
13. `frontend/src/components/editorv2/hooks/useWorkflow.ts` — パターン2 × 1件 → `extractErrorMessage` に変更、import 追加
14. `frontend/src/components/editorv2/hooks/useNamespaceOperations.ts` — パターン2 × 5件 → `extractErrorMessage` に変更、import 追加

### 備考
- `ProgressCheckTab.tsx` と `useNamespaceOperations.ts` に `error instanceof Error ? error.message` が `console.error`/`console.warn` 用デバッグログとして残存しているが、UI表示パス（`message.error()`/`setError()`）には影響なし
- 対象外ファイル（`SystemManagement/`, `DataManagement/`, `project/`, `viewer/` 等）の残存は本タスクのスコープ外
