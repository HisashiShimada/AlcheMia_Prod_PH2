# タスク計画書: progressService getWorkDetails toISOString null エラー修正

## メタデータ
- **作成日時**: 2026-03-09 20:43
- **タスクID**: progressService_toISOString_null修正
- **優先度**: 高
- **推定工数**: 0.5時間

---

## 1. タスク概要

`GET /api/v1/progress/projects/:projectName/work-details` が 500 Internal Server Error を返す。

バックエンドログより `progressService.ts:735` で `TypeError: Cannot read properties of null (reading 'toISOString')` が発生している。

---

## 2. 調査結果

### 2.1 エラーログ

```
errorMessage: "Cannot read properties of null (reading 'toISOString')"
errorStack: "TypeError: Cannot read properties of null (reading 'toISOString')\n
  at ProgressService.getWorkDetails (progressService.ts:735:35)"
```

### 2.2 エラー発生箇所（progressService.ts getWorkDetails メソッド）

**問題箇所①（主因、line ~735）**

`transition_data` テーブルの `create_at` が NULL のレコードに対して `.toISOString()` を呼び出している。

```typescript
// ❌ 現状：null の場合に例外が発生
return {
  transitionId: row.transition_id,
  progressStatus: TRANSITION_STATUS_LABELS[row.status] ?? '未開始',
  assignedWorker: row.worker_name ?? undefined,
  startDate: row.create_at.toISOString(),        // ← create_at が null で落ちる
  endDate: row.status === 5 ? row.update_at.toISOString() : undefined  // ← update_at も同様
};
```

**問題箇所②（潜在的、projectInfo組み立て部分）**

`project` テーブルの `create_at` / `update_at` が NULL の場合も同様にエラーが発生しうる。

```typescript
// ❌ 潜在的な問題：null の場合に例外が発生する可能性
createdAt: proj.create_at.toISOString(),
updatedAt: proj.update_at.toISOString()
```

### 2.3 根本原因

`transition_data` テーブルに `create_at` が NULL のレコードが存在する。
`findByTask.sql` では `td.create_at` を直接 SELECT しているが、NULL 制約が付いていない（または過去のデータが NULL のまま登録されている）。

---

## 3. 修正方針

`.toISOString()` を呼び出す前に **null チェック** を追加する。

```typescript
// ✅ 修正後
startDate: row.create_at ? row.create_at.toISOString() : undefined,
endDate: row.status === 5 && row.update_at ? row.update_at.toISOString() : undefined,
```

```typescript
// ✅ 修正後（念のため）
createdAt: proj.create_at ? proj.create_at.toISOString() : '',
updatedAt: proj.update_at ? proj.update_at.toISOString() : '',
```

---

## 4. 実装ステップ

### Phase 1: transition_data の toISOString null チェック修正（主因の修正）
- [ ] `progressService.ts` の `getWorkDetails()` 内、`transitionProgress` 配列生成部分の `row.create_at.toISOString()` に null チェックを追加
- [ ] 同じ箇所の `row.update_at.toISOString()` にも null チェックを追加

### Phase 2: projectInfo の toISOString null チェック修正（潜在的な問題の修正）
- [ ] `progressService.ts` の `getWorkDetails()` 内、`projectInfo` 組み立て部分の `proj.create_at.toISOString()` に null チェックを追加
- [ ] 同じ箇所の `proj.update_at.toISOString()` にも null チェックを追加

### Phase 3: 動作確認
- [ ] バックエンドを再起動してAPIが 200 を返すことを確認

---

## 5. 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/progressService.ts` | `getWorkDetails()` 内の toISOString 呼び出し箇所に null チェックを追加（2箇所） |

---

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| null チェックにより startDate が undefined になり UI 表示が変わる | 低 | 中 | UI側はすでに `startDate?` でオプショナル扱いのため問題なし |

---

## 7. テスト計画

- [ ] `GET /api/v1/progress/projects/QuantumDotLED/work-details` が 200 を返すことを確認
- [ ] レスポンスの `transitionProgress[].startDate` が null のレコードで `undefined` になっていることを確認（エラーにならないこと）

---

## 8. 承認記録

- **計画書提示日時**: 2026-03-09 20:43
- **承認日時**: 2026-03-09 20:43（Act mode 切り替えにより承認済み）

---

## 9. 実施記録

### 実施日時
開始: 2026-03-09 20:43
完了: 2026-03-09 20:54

### 修正内容

**Phase 1: startDate / endDate の null チェック追加**

```typescript
// 修正前
startDate: row.create_at.toISOString(),
endDate: row.status === 5 ? row.update_at.toISOString() : undefined

// 修正後
startDate: row.create_at ? row.create_at.toISOString() : undefined,
endDate: row.status === 5 && row.update_at ? row.update_at.toISOString() : undefined
```

**Phase 2: createdAt / updatedAt の null チェック追加**

```typescript
// 修正前
createdAt: proj.create_at.toISOString(),
updatedAt: proj.update_at.toISOString()

// 修正後
createdAt: proj.create_at ? proj.create_at.toISOString() : '',
updatedAt: proj.update_at ? proj.update_at.toISOString() : ''
```

### 最終的な成果物
- [x] `backend/src/services/progressService.ts` の修正（2箇所）
