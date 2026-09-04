# タスク計画書: フロー図進捗率0%修正

## メタデータ
- **作成日時**: 2026-09-04 00:00
- **タスクID**: 20260904_0000_フロー図進捗率0%修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験作業者メニューの「進捗確認タブ」において、フロー図のトランジションノードに表示される進捗率が、
実験が完了済み（completed）のトランジションでも **0%** のままになっている不具合を修正する。

## 根本原因

```
バックエンド (progressService.normalizeProgress)
  → COMPLETED ステータス: progress = 100 を返す ✅

fetchTransitionStatus (projectApiService.ts)
  → progressPercentage: t.progress ?? 0 でマッピング ✅ (100 が正しく返る)

ExperimentWorkerMenu.tsx (fetchProgressRows / reloadProgressRows)
  → ProgressRow 生成時に progressRate フィールドが含まれていない ❌

ProgressOverviewTab.tsx (progressRowToTransition)
  → progressRate を MCR(material/condition/result)件数から再計算 ❌
  → totalItems = 0 のトランジション（テンプレート未定義）は progressRate = 0 ❌

TransitionFlowNode.tsx
  → transition.progressRate ?? 0 = 0% を表示 ❌（バグ）
```

## 目的と期待される成果

- [x] `completed` ステータスのトランジションはフロー図で **100%** と表示される
- [x] MCR テンプレートが未定義でも、バックエンドの進捗率が正しく反映される
- [x] 既存の MCR 件数ベース計算は MCR が存在する場合のフォールバックとして維持される

## 変更ファイル

1. `frontend/src/types/progress.ts`
   - `ProgressRow` 型に `progressRate?: number` フィールドを追加

2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
   - `fetchProgressRows` 内の `rows.push()` に `progressRate: tr.progressPercentage` を追加（1箇所目）
   - `reloadProgressRows` 内の `rows.push()` に `progressRate: tr.progressPercentage` を追加（2箇所目）

3. `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`
   - `progressRowToTransition` の進捗率計算ロジックを修正
   - 優先順位: `completed` → 100、`r.progressRate` → バックエンド値、MCR計算 → フォールバック

## 実装ステップ

- [x] タスクフォルダ・PLAN.md 作成
- [x] `frontend/src/types/progress.ts` に `progressRate` フィールドを追加
- [x] `frontend/src/components/menus/ExperimentWorkerMenu.tsx` の ProgressRow 生成を修正（2箇所）
- [x] `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` の `progressRowToTransition` を修正
- [x] TypeScript コンパイルエラーがないことを確認

## リスク

| リスク | 対策 |
|--------|------|
| MCR件数ベースの進捗率計算が壊れる | フォールバックとして維持する |
| 他の ProgressRow 利用箇所への影響 | `progressRate` はオプショナル（`?`）にするため既存コードへの影響なし |

## テスト計画

- [ ] `completed` ステータスのトランジションがフロー図で 100% と表示されること
- [ ] MCR が定義されていないトランジションで progressRate が正しく表示されること
- [ ] TypeScript コンパイルが通ること（`npm run build` または `tsc --noEmit`）

## 承認記録
- **計画書提示日時**: 2026-09-04 00:00
- **承認日時**: 2026-09-04（Act モード移行により承認）
