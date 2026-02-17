# タスク6.2: エラーメッセージの多言語対応確認

**作成日時**: 2026-02-17 14:20  
**タスクID**: 6.2  
**Requirements**: 7 (エラーハンドリング)

## 概要

実験データ保存API用のカスタムエラークラス（ProjectNotEditableError、TaskNotFoundError、InvalidStatusTransitionError）のエラーメッセージが、要件を満たしていることを検証しました。

## 検証項目と結果

### ✅ 1. 日本語で分かりやすいメッセージ

**検証内容:**
- エラーメッセージが日本語であること
- ユーザーが理解しやすい表現を使用していること

**結果:**
すべてのエラークラスで日本語のデフォルトメッセージが設定されており、ユーザーフレンドリーな表現が使用されています。

| エラークラス | デフォルトメッセージ | 評価 |
|------------|-------------------|------|
| ProjectNotEditableError | プロジェクトが編集可能な状態ではありません | ✅ 状況を明確に説明 |
| TaskNotFoundError | 指定されたタスクが見つかりません | ✅ リソース不存在を明確に表現 |
| InvalidStatusTransitionError | 不正なステータス遷移です | ✅ 遷移の不正を明示 |

### ✅ 2. 機密情報が含まれていない

**検証内容:**
- パスワード、トークン、APIキーなどの機密情報が含まれていないこと
- ファイルパス、内部パスが含まれていないこと
- UUIDなどの識別子が直接メッセージに含まれていないこと

**検証方法:**
```typescript
// パスワード、トークン、キー関連
expect(error.message).not.toMatch(/password|token|secret|key|jwt/i);

// ファイルパス
expect(error.message).not.toMatch(/\/[a-zA-Z0-9_/-]+\.(ts|js|env)/);

// UUID
expect(error.message).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);

// データベース情報
expect(error.message).not.toMatch(/postgres|pg|database|table|column/i);
expect(error.message).not.toContain('SELECT');

// スタックトレース
expect(JSON.stringify(response)).not.toContain('at Object');
expect(JSON.stringify(response)).not.toContain('.ts:');
```

**結果:**
すべてのエラーメッセージとエラーレスポンスで機密情報が含まれていないことを確認しました。

### ✅ 3. ユーザーフレンドリーな表現

**検証内容:**
- 問題の原因が明確に説明されていること
- 次のアクションが推測可能であること
- 専門用語が適切に使用されていること

**結果:**

| エラー | ユーザーフレンドリー度 | 説明内容 |
|--------|---------------------|---------|
| ProjectNotEditableError | ⭐⭐⭐⭐⭐ | プロジェクトが編集できない状態であることを明示 |
| TaskNotFoundError | ⭐⭐⭐⭐⭐ | タスクが見つからないことを明確に伝達 |
| InvalidStatusTransitionError | ⭐⭐⭐⭐⭐ | ステータス遷移が不正であることを説明 |

**推奨される使用例:**

```typescript
// ProjectNotEditableError
throw new ProjectNotEditableError(
  'このプロジェクトは現在編集できません。ステータスを確認してください。',
  projectId,
  currentStatus
);

// TaskNotFoundError
throw new TaskNotFoundError(
  '指定されたタスク番号が存在しません。タスク一覧を確認してください。',
  taskNo,
  projectId
);

// InvalidStatusTransitionError
throw new InvalidStatusTransitionError(
  'このステータス遷移は許可されていません。現在のステータスを確認してください。',
  currentStatus,
  targetStatus
);
```

### ✅ 4. 統一されたエラーレスポンス形式

**検証内容:**
- すべてのエラーが統一されたレスポンス形式を使用していること
- ISO 8601形式のタイムスタンプが含まれていること
- リクエストIDが適切に設定されていること

**エラーレスポンス形式:**
```typescript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "エラーメッセージ"
  },
  meta: {
    timestamp: "2026-02-17T05:20:00.000Z", // ISO 8601形式
    requestId: "req-123"
  }
}
```

**結果:**
すべてのエラークラスが`formatErrorResponse()`関数を通じて統一されたレスポンス形式を生成することを確認しました。

## テスト結果サマリー

```
Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
Time:        2.905 s
```

**テストカバレッジ:**
- ProjectNotEditableError: 4テスト ✅
- TaskNotFoundError: 4テスト ✅
- InvalidStatusTransitionError: 4テスト ✅
- エラーレスポンス形式の統一性: 2テスト ✅
- ユーザーフレンドリーなメッセージ: 3テスト ✅
- 機密情報の漏洩防止: 3テスト ✅

## HTTPステータスコードマッピング

| エラークラス | HTTPステータス | エラーコード | 説明 |
|------------|---------------|------------|------|
| ProjectNotEditableError | 403 Forbidden | PROJECT_NOT_EDITABLE | プロジェクトが編集不可能な状態 |
| TaskNotFoundError | 404 Not Found | TASK_NOT_FOUND | タスクが存在しない |
| InvalidStatusTransitionError | 422 Unprocessable Entity | INVALID_STATUS_TRANSITION | 不正なステータス遷移 |

## セキュリティチェックリスト

- [x] エラーメッセージにパスワードが含まれていない
- [x] エラーメッセージにトークンが含まれていない
- [x] エラーメッセージにAPIキーが含まれていない
- [x] エラーメッセージにファイルパスが含まれていない
- [x] エラーメッセージにスタックトレースが含まれていない
- [x] エラーメッセージにデータベース情報が含まれていない
- [x] エラーレスポンスが統一形式を使用している
- [x] タイムスタンプがISO 8601形式である

## 推奨事項

### DO（推奨）

✅ **明確なメッセージを使用する**
```typescript
// Good
new ProjectNotEditableError(
  'このプロジェクトは現在編集できません。ステータスを確認してください。'
);

// Bad
new ProjectNotEditableError('Error');
```

✅ **カスタムメッセージで具体的な対処方法を提示する**
```typescript
new TaskNotFoundError(
  '指定されたタスク番号が存在しません。タスク一覧を確認してください。',
  taskNo,
  projectId
);
```

✅ **エラーコードを活用してフロントエンドで適切に処理する**
```typescript
// フロントエンド例
if (error.code === 'PROJECT_NOT_EDITABLE') {
  showMessage('プロジェクトのステータスを確認してください', 'warning');
}
```

### DON'T（非推奨）

❌ **機密情報を含めない**
```typescript
// Bad - トークンを含めている
new AuthenticationError(`Token ${token} is invalid`);

// Good
new AuthenticationError('認証情報が無効です。再ログインしてください。');
```

❌ **内部エラー詳細を露出しない**
```typescript
// Bad - スタックトレースを含めている
new DatabaseError(`Query failed: ${error.stack}`);

// Good
new DatabaseError('データベースエラーが発生しました。しばらくしてから再試行してください。');
```

❌ **英語メッセージを使用しない**
```typescript
// Bad
new TaskNotFoundError('Task not found');

// Good
new TaskNotFoundError('指定されたタスクが見つかりません');
```

## 結論

実験データ保存API用のエラーメッセージは、以下の要件をすべて満たしていることを確認しました：

1. ✅ **日本語で分かりやすい**: すべてのエラーメッセージが日本語で記述され、ユーザーが理解しやすい表現を使用
2. ✅ **機密情報が含まれていない**: パスワード、トークン、ファイルパス、スタックトレースなどの機密情報を一切含まない
3. ✅ **ユーザーフレンドリー**: 問題の原因と推奨される対処方法が明確
4. ✅ **統一されたレスポンス形式**: すべてのエラーが一貫した形式でレスポンスを返す
5. ✅ **ISO 8601形式のタイムスタンプ**: 国際標準に準拠

**タスク6.2は完了です。**

## 関連ドキュメント

- [backend/src/utils/errorClasses.ts](../../../backend/src/utils/errorClasses.ts) - エラークラス実装
- [backend/tests/utils/errorClasses.messageQuality.test.ts](../../../backend/tests/utils/errorClasses.messageQuality.test.ts) - メッセージ品質テスト
- [backend/tests/utils/errorClasses.experimentData.test.ts](../../../backend/tests/utils/errorClasses.experimentData.test.ts) - 実験データAPIエラーテスト
- [セキュリティ規約](../../../.clinerules/development/security.md) - セキュリティ要件
