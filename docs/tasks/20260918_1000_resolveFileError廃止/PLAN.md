# タスク計画書: resolveFileError 廃止

## メタデータ
- **作成日時**: 2026-09-18 10:00
- **タスクID**: 20260918_1000_resolveFileError廃止
- **優先度**: 高
- **推定工数**: 4〜6時間

---

## 1. タスク概要

`backend/src/controllers/fileAccessController.ts` 内の `resolveFileError()` 関数を廃止し、他のコントローラーと同様に **`next(error)` → `errorHandlerMiddleware`** パターンへ統一する。

### 現状の問題点

| 問題 | 詳細 |
|------|------|
| **日本語キーワードマッチングによる上書き** | Service 内部の詳細エラーメッセージが「アップロード」「ストレージ」等のキーワードにマッチすると常に `E4006` に変換される |
| **500 エラー時のメッセージ消去** | フォールバック末尾では `errorMessage` が `'システムエラーが発生しました'` に固定される。実際の例外メッセージ（DB エラー、型エラー等）が完全に失われる |
| **エラー型の二重管理** | `errorClasses.ts` の `StorageError` / `NotFoundError` 等は `instanceof` で正しく判定できるのに `resolveFileError()` 内でも同じ判定を重複実装している |
| **`errorHandlerMiddleware` との不整合** | 他のコントローラーはすべて `next(error)` で委譲しているが `fileAccessController` だけが独自ハンドリングを行っている |

---

## 2. 目的と期待される成果

- [ ] `resolveFileError()` 関数を削除する
- [ ] 全 `catch` ブロックを `next(error)` パターンに移行する
- [ ] `errorHandlerMiddleware` が `statusCode` を正しく参照できるよう `AppError` には `nextWithStatus()` ヘルパーを追加する
- [ ] 本番ログに元エラーの詳細（スタックトレース・メッセージ）が確実に残るようにする

---

## 3. 現状分析

### 3-1. resolveFileError の呼び出し箇所（合計 10 箇所）

| 行番号 | 関数名 |
|--------|--------|
| L133 | `downloadFile` |
| L254 | `downloadFolderAsZip` |
| L380 | `uploadFiles` ※本番問題の主要箇所 |
| L475 | `getFileDownloadUrl` |
| L520 | `getFileContentAsText` |
| L566 | `getFileViewUrl` |
| L730 | `deleteFile` |
| L784 | `cancelBatch` |
| L1484 | `completeChunkUpload` |

### 3-2. カスタムエラークラスの statusCode

| クラス | statusCode | errorHandlerMiddleware |
|--------|------------|----------------------|
| `ValidationError` | 400 | `err.statusCode` で取得 ✅ |
| `AuthenticationError` | 401 | `err.statusCode` で取得 ✅ |
| `AuthorizationError` | 403 | `err.statusCode` で取得 ✅ |
| `NotFoundError` | 404 | `err.statusCode` で取得 ✅ |
| `StorageError` | 500 | `err.statusCode` で取得 ✅ |
| `AppError` | ❌ なし | `formatController` の `nextWithStatus` パターンが必要 |

### 3-3. 特殊ケース: `MAIML_VALIDATION_ERROR`

`uploadFiles` の `catch` ブロックには `MAIML_VALIDATION_ERROR:` プレフィックスを持つ特殊なエラーハンドリングがある（L354〜L376）。

→ **方針A（採用）**: MAIML_VALIDATION_ERROR の特殊分岐はそのまま維持し、それ以外を `next(error)` に移行（最小変更・別タスクで専用クラス化を検討）

---

## 4. 実装ステップ

### Step 1: `NextFunction` パラメータの追加

- [ ] 全エクスポート関数のシグネチャに `next: NextFunction` を追加する

### Step 2: `nextWithStatus` ヘルパーを追加

- [ ] `formatController.ts` と同じパターンで `statusFromCode()` + `nextWithStatus()` を追加する

```typescript
function statusFromCode(code: string): number {
  if (code.startsWith('E1')) return 400;
  if (code === 'E5015' || code === 'E5012') return 403;
  if (code.startsWith('E5')) return 401;
  if (code === 'E6001' || code === 'E6002') return 404;
  if (code === 'E7013') return 400;
  if (code.startsWith('E7')) return 400;
  return 500;
}

function nextWithStatus(error: unknown, next: NextFunction): void {
  if (error instanceof AppError) {
    (error as any).statusCode = statusFromCode(error.code);
  }
  next(error as Error);
}
```

### Step 3: 各 `catch` ブロックを移行

```typescript
// Before
} catch (error: any) {
  logError('...', error, { ... });
  const { statusCode, errorCode, errorMessage } = resolveFileError(error);
  res.status(statusCode).json({ ... });
}

// After
} catch (error) {
  logError('...', error, { ... });
  nextWithStatus(error, next);
}
```

- [ ] `downloadFile`
- [ ] `downloadFolderAsZip`
- [ ] `uploadFiles` ※ MAIML_VALIDATION_ERROR 特殊分岐は維持、それ以外を移行
- [ ] `getFileDownloadUrl`
- [ ] `getFileContentAsText`
- [ ] `getFileViewUrl`
- [ ] `deleteFile`
- [ ] `cancelBatch`
- [ ] `completeChunkUpload`

### Step 4: `resolveFileError` 関数の削除

- [ ] `resolveFileError` 関数の定義（L33〜L86）を削除する

### Step 5: ビルド確認

- [ ] `cd backend && npm run build` で型エラーがないことを確認

---

## 5. 影響範囲

### 変更ファイル
1. `backend/src/controllers/fileAccessController.ts` — 主要変更

### 参照ファイル（変更なし）
- `backend/src/middleware/errorHandlerMiddleware.ts` — `err.statusCode` を参照する実装済み
- `backend/src/utils/errorClasses.ts` — `statusCode` プロパティ実装済み
- `backend/src/enums/errorCodes.ts` — 変更不要

### 挙動の変化

| エラー種別 | Before | After |
|-----------|--------|-------|
| `ValidationError` | resolveFileError → 400/E1003 | errorHandlerMiddleware → 400 + error.code ✅ |
| `StorageError` | resolveFileError → 500/E4006 | errorHandlerMiddleware → 500 + error.code ✅ |
| `AppError(E7013)` | resolveFileError → 400/E7013 | nextWithStatus → 400 + error.code ✅ |
| 予期しない Error | **500/'システムエラーが発生しました'（元メッセージ消去）** | **500 + 元メッセージをサーバーログに保持** ✅ 改善 |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `AppError` の statusCode が正しくマッピングされない | 高 | 低 | `nextWithStatus()` で補完。`formatController` の実績あるパターンを使用 |
| フロントエンドのエラーハンドリングが壊れる | 高 | 低 | `errorHandlerMiddleware` のレスポンス形式は同一のため影響なし |
| `requestId` が `meta` に含まれなくなる | 中 | 中 | `errorHandlerMiddleware` は `x-request-id` ヘッダーから取得する。コントローラー内の UUID と同じ値をヘッダーにセットする方式を検討 |

---

## 7. テスト計画

- [ ] `cd backend && npm run build` 型エラーなし
- [ ] アップロード成功時に 200 が返ること（手動確認）
- [ ] 不正なファイルキーでダウンロードしたとき 404 が返ること
- [ ] ストレージ接続エラー時にサーバーログに元エラーメッセージが出力されること
- [ ] MAIML_VALIDATION_ERROR 発生時に 400 + details が返ること

---

## 8. 承認記録
- **計画書提示日時**: 2026-09-18 10:00
- **承認日時**: 2026-09-18 10:30
- **承認者コメント**: 承認します。

## 9. 実施記録

### 実施日時
開始: 2026-09-18 10:30
完了: 2026-09-18 10:50

### 変更内容
- `import { Request, Response }` → `import { Request, Response, NextFunction }` に変更
- `resolveFileError()` 関数（L30〜L86）を削除
- `statusFromCode()` + `nextWithStatus()` ヘルパーを追加
- 全エクスポート関数（14関数）のシグネチャに `next: NextFunction` を追加
- 全 `catch (error: any)` → `catch (error)` に変更し `nextWithStatus(error, next)` に移行
- `uploadFiles` の `MAIML_VALIDATION_ERROR` 特殊分岐は維持
- `npm run build` 型エラーなし確認済み

### チェック結果
- [x] `resolveFileError` の残存なし（grep 結果: exit code 1 = 未検出）
- [x] `catch (error: any)` の残存なし
- [x] 全関数に `next: NextFunction` 追加済み（14関数）
- [x] ビルド成功
