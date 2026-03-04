# タスク計画書: issue create バグ修正

## メタデータ
- **作成日時**: 2026-02-27 17:37
- **タスクID**: issue_create_bug_fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`issueRepository.ts` の `create` 関数でSQLクエリ実行後に例外が発生している問題を修正する。

---

## 分析結果

### 調査対象ファイル

| ファイル | 内容 |
|---------|------|
| `backend/src/repositories/issueRepository.ts` | create 関数の実装 |
| `backend/src/sql/queries/issues/create.sql` | INSERT SQL |
| `backend/src/services/issueService.ts` | create 関数の呼び出し元 |
| `backend/src/controllers/issueController.ts` | HTTP リクエスト処理 |
| `docs/design/db/ddl/issue.sql` | DB テーブル定義（正）|
| `docs/design/db/er_diagram.a5er` | ER図 |

### `create.sql` の検証結果 ✅ 問題なし

`create.sql` のカラム・パラメータマッピングは DDL（`docs/design/db/ddl/issue.sql`）と完全に一致しており、SQL自体は正しい。

| `create.sql` のカラム | DDL の型 | パラメータ | 判定 |
|---------------------|---------|-----------|------|
| organization_id | UUID NOT NULL | $1 | ✅ |
| project_id | VARCHAR(20) NOT NULL | $2 | ✅ |
| issue_id | CHARACTER VARYING NOT NULL | $3 | ✅ |
| method_id | CHARACTER VARYING | $4 | ✅ |
| issue_target | NUMERIC(2,0) | $5 | ✅ |
| task_no | NUMERIC(3,0) | $6 | ✅ |
| transition_id | CHARACTER VARYING | $7 | ✅ |
| issue_title | CHARACTER VARYING | $8 | ✅ |
| issue_type | NUMERIC(2,0) | $9 | ✅ |
| issue_contents | TEXT | $10 | ✅ |
| status | NUMERIC(2,0) | `0`（固定） | ✅ |
| issue_reporter_id / create_user_id / update_user_id | VARCHAR(50) | $11（再利用） | ✅ |

### 例外の根本原因 ❌

**`issueService.ts` で `targetType`（文字列）を変換せずに `issueTarget`（NUMERIC型）として渡している。**

データの流れ：

```
[フロントエンド] POST /api/v1/issues
  body: { targetType: "project" | "task" | "transition", ... }
  ↓
issueController.ts
  const { ..., targetType, ... } = req.body;
  ↓ data.targetType = "project"（文字列）
issueService.ts
  issueTarget: data.targetType,   ← ❌ 文字列のまま渡している
  ↓ newIssue.issueTarget = "project"
issueRepository.ts
  values = [ ..., newIssue.issueTarget, ... ]  // $5 に文字列が入る
  ↓
create.sql
  issue_target NUMERIC(2,0) ← ❌ PostgreSQL が型変換エラー
```

ER図 `issue_target` の定義：
- `NUMERIC(2,0)` 型
- 想定値：1 = プロジェクト全体、2 = タスク、3 = トランジション

### 副次的な問題 ⚠️

`issueRepository.ts` の `create` 関数内：

```typescript
newIssue.taskNo || null,        // ❌ taskNo = 0 のとき null になる
newIssue.methodId || null,      // ❌ methodId = "" のとき null になる（許容範囲内）
newIssue.transitionId || null,  // ❌ transitionId = "" のとき null になる（許容範囲内）
```

`||` 演算子は falsy 値（0, "", null, undefined）すべてを null に変換する。
`taskNo = 0` が有効値の場合、`??` 演算子を使うべき。

---

## 目的と期待される成果

### 目的
`issueService.ts` の `create` 関数で `targetType`（文字列）を `issue_target`（NUMERIC）に正しく変換し、PostgreSQL の型変換エラーを解消する。

### 期待される成果
- [ ] `POST /api/v1/issues` が正常に 201 Created を返す
- [ ] `issue_target` カラムに正しい数値が格納される
- [ ] `||` を `??` に修正し、0 の誤変換を防ぐ

---

## 実装ステップ

### Step 1: issueService.ts の修正
- [ ] `targetType` → 数値変換メソッド `convertTargetTypeToNumber()` を追加
- [ ] `create` 関数内の `issueTarget: data.targetType` を変換後の値に修正

### Step 2: issueRepository.ts の修正
- [ ] `newIssue.taskNo || null` → `newIssue.taskNo ?? null` に修正
- [ ] `newIssue.methodId || null` → `newIssue.methodId ?? null` に修正
- [ ] `newIssue.transitionId || null` → `newIssue.transitionId ?? null` に修正

### Step 3: 動作確認
- [ ] コンパイルエラーがないことを確認

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/issueService.ts` | `convertTargetTypeToNumber()` 追加、`issueTarget` のマッピング修正 |
| `backend/src/repositories/issueRepository.ts` | `||` → `??` に修正（3箇所） |

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| targetType の値がER図想定外の場合 | 中 | ValidationError をスローして 400 を返す |
| taskNo=0 が有効値かどうか不明 | 低 | `??` に修正することで安全側に倒す |

---

## 承認記録
- **計画書提示日時**: 2026-02-27 17:37
- **承認日時**: 2026-02-27 17:44
