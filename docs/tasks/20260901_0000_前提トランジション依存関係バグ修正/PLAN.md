# タスク計画書: 前提トランジション依存関係バグ修正

## メタデータ
- **作成日時**: 2026-09-01 00:00
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

前提トランジションが複数存在する依存関係トランジションについて、以下の2つのバグを修正する。

**バグ内容:**
前提トランジションAが「7: 異常終了状態（ERROR）」、前提トランジションBが「6: 終状態（COMPLETED）」の場合に、
依存トランジションCが誤って「2: 準備状態（PREPARING）」に遷移し、「記録」ボタンも活性化されてしまう。

**正しい仕様:**
- 前提トランジションが複数存在する場合、**全て** が「6: COMPLETED」でない限り、依存トランジションは「1: 初期状態（INITIAL）」のままにし、「記録」ボタンも非活性のままにする。

## バグの根本原因

### バグ1（バックエンド）: `progressService.ts` の前提確認ロジック

**ファイル**: `backend/src/services/progressService.ts`（1087〜1090行）

`findByTransitionId.sql` に `task_no` の絞り込みがないため、複数タスク（task_no=1, task_no=2...）が存在する場合に複数行が返る。
`rows[0]` の1件目しか確認しないため、task_no=2 の COMPLETED 行が先に返ってきた場合に誤って「全前提COMPLETED」と判定されてしまう。

```typescript
// 問題のコード
const prereqResult = await client.query(prereqSql, [organizationId, projectId, dep.method_id, prereqId]);
// ↑ task_no を渡していないため、複数行返ってくる
if (prereqResult.rows[0].status !== TransitionStatusEnum.COMPLETED) return false;
// ↑ rows[0] のみ確認（不定順）
```

**修正方針**: `findByTransitionId.sql` に `task_no > 0` の絞り込みと、全行が COMPLETED かを確認するロジックを追加する。
または、`progressService.ts` 側で `dep.task_no` を使って特定タスクのみ確認するよう修正する。

→ **`dep.task_no` を渡すことで同一タスクの前提トランジションのみを確認する**（正しいアプローチ）

### バグ2（フロントエンド）: `ProgressOverviewTab.tsx` の「記録」ボタン活性化ロジック

**ファイル**: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`（368〜372行）

`preparing` / `ready` / `on_hold` 状態の場合は前提トランジションの完了確認を**一切行わず**に「記録」ボタンを活性化してしまう。

```typescript
// 問題のコード
const isActive =
  r.status === 'preparing' ||   // ← 前提確認なし
  r.status === 'ready' ||
  r.status === 'on_hold' ||
  (r.status === 'not_started' && isPrerequisitesMet);  // not_startedのみ前提確認
```

**修正方針**: `preparing` / `ready` / `on_hold` 状態でも `isPrerequisitesMet` を条件に加える。

## 実装ステップ

- [x] PLAN.md 作成
- [x] TODO-1: `backend/src/services/progressService.ts` — 前提確認時に `dep.task_no` を渡すよう修正
- [x] TODO-2: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` — `preparing`/`ready`/`on_hold` 時も前提確認を行うよう修正
- [x] TODO-3: 動作確認（TypeScript コンパイルエラーなし確認）

## 変更ファイル

1. `backend/src/services/progressService.ts` — 前提トランジション確認ロジック修正
2. `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` — 「記録」ボタン活性化条件修正

## リスク

| リスク | 対策 |
|--------|------|
| `findByTransitionId.sql` に `task_no` を追加すると、他の呼び出し箇所に影響が出る可能性 | SQL は変更せず、`progressService.ts` 側で `dep.task_no` をパラメータに追加して対応する |
| フロントエンド修正で `preparing` 状態のトランジションが非活性になるケースが増える | 仕様通りの動作であり、前提が全て COMPLETED の場合は活性のままなので問題なし |

## テスト計画

- [ ] 前提A=ERROR, 前提B=COMPLETED → 依存C は INITIAL のまま、記録ボタン非活性
- [ ] 前提A=COMPLETED, 前提B=COMPLETED → 依存C は PREPARING になり、記録ボタン活性
- [ ] TypeScript コンパイルエラーなし

## 承認記録

- **承認日時**: 2026-09-01（ユーザー承認済み・Actモード移行確認）
