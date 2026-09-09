# タスク計画書: フロー図記録ボタン活性/非活性不整合修正

## メタデータ
- **作成日時**: 2026-09-09 22:00
- **タスクID**: 20260909_2200_フロー図記録ボタン活性非活性不整合修正
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

実験作業者メニューの「進捗確認」タブにおいて、一覧表示（リスト）とフロー図表示で「記録」ボタンの活性/非活性状態が異なる不具合を修正する。

### 現象
- **一覧表示**: 着手可能なトランジション（`not_started` 以外）のみ記録ボタンが活性
- **フロー図表示**: すべてのトランジションの記録ボタンが活性（ステータスを無視）

### 根本原因

| 表示方式 | `disabled` 判定ロジック | 問題 |
|---|---|---|
| リスト表示（`ProgressOverviewTab.tsx`） | `r.status === 'not_started'` | ✅ 正常（初期状態のみ非活性） |
| フロー図（`TransitionFlowNode.tsx`） | `!isProjectRecordable` のみ | ❌ ステータス判定なし |
| `ProgressOverviewTab.tsx` 呼び出し元 | `isProjectRecordable={true}` ハードコード | ❌ 常に `true` のため全活性 |

加えて、`ProgressStatus` 型（`experimentWorker.ts`）に `'preparing'` と `'ready'` が未定義のため、
`progressRowToTransition` で `as ProgressStatus` 型キャストで型安全を迂回している問題も同時修正する。

## 目的と期待される成果

- [ ] フロー図の記録ボタンが、リスト表示と同様に `not_started` のトランジションのみ非活性になること
- [ ] `ProgressStatus` 型に `preparing` / `ready` を追加し、型安全性を向上させること
- [ ] `isProjectRecordable` がプロジェクトステータスに基づいて正しく算出・伝達されること
- [ ] フロントエンドのビルド・TSエラーが発生しないこと
- [ ] 単体テストが追加されグリーンになること

## 実装ステップ

- [x] Step 1: タスク計画書作成（本ファイル）
- [x] Step 2: `frontend/src/types/experimentWorker.ts` — `ProgressStatus` 型に `'preparing'` `'ready'` を追加
- [x] Step 3: `frontend/src/types/progress.ts` — `ProgressOverviewTabProps` に `isProjectRecordable?: boolean` を追加
- [x] Step 4: `frontend/src/components/ExperimentWorker/TransitionFlowNode.tsx` — `disabled` 条件にトランジションステータス判定を追加（**主要修正**）
- [x] Step 5: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` — `isProjectRecordable` を props から受け取り `TransitionFlowDiagram` へ渡す
- [x] Step 6: `frontend/src/components/menus/ExperimentWorkerMenu.tsx` — `isProjectRecordable` を算出して `ProgressOverviewTab` に渡す
- [x] Step 7: `frontend/src/components/ExperimentWorker/__tests__/TransitionFlowNode.test.tsx` — 単体テスト作成
- [x] Step 8: TypeScript ビルドエラー確認 (`npx tsc --noEmit`) — **exit code 0 (エラーなし)**
- [x] Step 9: 単体テスト実行確認 — **25 tests passed**

## 変更ファイル

| # | ファイルパス | 変更種別 | 変更内容 |
|---|---|---|---|
| 1 | `frontend/src/types/experimentWorker.ts` | 修正 | `ProgressStatus` 型に `'preparing'` `'ready'` を追加 |
| 2 | `frontend/src/types/progress.ts` | 修正 | `ProgressOverviewTabProps` に `isProjectRecordable?: boolean` prop を追加 |
| 3 | `frontend/src/components/ExperimentWorker/TransitionFlowNode.tsx` | **修正（主要）** | `disabled={!isProjectRecordable}` → `disabled={!isProjectRecordable \|\| transition.status === 'not_started'}` |
| 4 | `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` | 修正 | `isProjectRecordable` を props から受け取り `TransitionFlowDiagram` に渡す（ハードコード `true` 解消） |
| 5 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 修正 | `isProjectRecordable` を算出して `ProgressOverviewTab` に渡す |
| 6 | `frontend/src/components/ExperimentWorker/__tests__/TransitionFlowNode.test.tsx` | **新規** | 記録ボタン活性/非活性判定の単体テスト |

## リスク

| リスク | 対策 |
|--------|------|
| `ProgressStatus` 型拡張による既存コードの型エラー | TSビルドで確認。`getStatusConfig` はフォールバック処理あり |
| `isProjectRecordable` の prop 追加による既存呼び出し箇所の対応漏れ | オプション型（`?: boolean`）にしデフォルト `true` とすることで後方互換を維持 |
| `TransitionFlowNode` のステータス設定が `preparing`/`ready` に対応していない | `getStatusConfig` にフォールバック処理があるため表示は問題なし（ステータスカバレッジ拡充も行う） |

## テスト計画

### 単体テスト（`TransitionFlowNode.test.tsx`）
- [ ] `not_started` 状態の記録ボタンが `disabled` であること
- [ ] `preparing` 状態の記録ボタンが活性であること
- [ ] `ready` 状態の記録ボタンが活性であること
- [ ] `in_progress` 状態の記録ボタンが活性であること
- [ ] `completed` 状態の記録ボタンが活性であること
- [ ] `isProjectRecordable=false` 時に全ステータスで記録ボタンが `disabled` であること

## 承認記録
- **計画書提示日時**: 2026-09-09 22:00
- **承認日時**: 2026-09-09 22:00（ユーザー承認済み）
- **承認者コメント**: Act モードへの切り替えにより承認
