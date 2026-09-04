# タスク計画書: ProgressOverviewTab ボタンロジック整理

## メタデータ
- **作成日時**: 2026-09-04 10:00
- **タスクID**: 20260904_1000
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

マージ時に壊れた `ProgressOverviewTab` の `renderAction`（操作列ボタン）を正しいロジックに修正する。

### 背景

マージコミット（`62ba08606`）により `renderAction` に2ブランチのコードが混在し、以下の問題が発生している：

- `in_progress` / `completed` / `issue` 等のステータスがボタン disabled になり WorkRecordPanel に遷移できない
- 不要な特殊分岐（`isRecorded` / `projectStatus` / 前提チェック）が残存

### 正しい要件

| 条件 | ボタン状態 |
|------|-----------|
| `not_started` | **disabled**（バックエンドが前提完了時に自動で `PREPARING` に変える） |
| それ以外の全ステータス | **活性** → `onGoToWork` を呼ぶ |

**編集モード / 閲覧モードの判定は WorkRecordPanel 側が自律的に行う**（`isReadOnly` ロジック）ため、ProgressOverviewTab 側での制御は不要。

### 前提トランジション条件が不要な理由

`backend/src/services/progressService.ts`（1077〜1137行）に明確に実装されている：
- 前提トランジションが `COMPLETED` になった瞬間、バックエンドが依存先トランジションを自動的に `PREPARING` に変更する
- つまり「`not_started` のまま」= まだ前提が完了していない状態、フロントで重複チェックは不要

## 目的と期待される成果

- [ ] `not_started` のみ disabled、それ以外の全ステータスで活性ボタンが表示される
- [ ] 全ステータスで `onGoToWork` のみを呼ぶシンプルな実装になる
- [ ] 不要な Props（`onViewDetail` / `onStartWork` / `projectStatus`）が除去される
- [ ] 不要な import（`ProjectStatus` / `TaskStatus` / `Tag`）が除去される
- [ ] TypeScript ビルドエラーがない

## 実装ステップ

- [ ] Step 1: `docs/tasks/` にタスク計画書作成（本ファイル）
- [ ] Step 2: `frontend/src/types/progress.ts` — `ProgressOverviewTabProps` から不要 Props を削除
- [ ] Step 3: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` — `renderAction` 修正・不要 Props / import 除去
- [ ] Step 4: `frontend/src/components/menus/ExperimentWorkerMenu.tsx` — `<ProgressOverviewTab>` への不要 Props 渡しを削除
- [ ] Step 5: TypeScript ビルドエラー確認

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/types/progress.ts` | `ProgressOverviewTabProps` から `onViewDetail` / `onStartWork` / `projectStatus` を削除 |
| 2 | `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` | `renderAction` をシンプルなロジックに置き換え・Props デストラクチャーから `onViewDetail`/`onStartWork`/`projectStatus` 除去・不要 import 除去 |
| 3 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `<ProgressOverviewTab>` への `onViewDetail`/`onStartWork`/`projectStatus` props 渡しを削除 |

## 変更後の `renderAction` 完成形

```typescript
// ── 操作列 ─────────────────────────────────────────
// not_started のみ disabled（バックエンドが前提完了時に自動で PREPARING に変えるため
// フロント側での前提チェックは不要）
// それ以外の全ステータスは活性 → onGoToWork で WorkRecordPanel を開く
// WorkRecordPanel 側が progressRows のステータスを見て編集/閲覧を自己判定する
const renderAction = (_: unknown, r: ProgressRow) => (
  <Button
    size="small"
    disabled={r.status === 'not_started'}
    onClick={() => onGoToWork(r.taskNo, r.transitionId)}
  >
    {t('experimentWork.table.record')}
  </Button>
);
```

## リスク

| リスク | 対策 |
|--------|------|
| `onViewDetail` / `onStartWork` を他のコンポーネントから呼んでいる | 削除前に grep で使用箇所を確認する |
| `Tag` コンポーネントが他の箇所で使われている | import 削除前に使用箇所を確認する |

## テスト計画

- [ ] TypeScript ビルドエラーなし（`npx tsc --noEmit`）
- [ ] `not_started` ステータスの行がボタン disabled になっていること
- [ ] `preparing` / `ready` / `in_progress` / `on_hold` / `completed` / `issue` がボタン活性になっていること

## 承認記録
- **計画書提示日時**: 2026-09-04 10:00
- **承認日時**: 2026-09-04 10:30
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-09-04 10:30
完了: 2026-09-04 10:45

### 最終的な成果物
- [x] Step 1: PLAN.md 作成
- [x] Step 2: `frontend/src/types/progress.ts` — `ProgressOverviewTabProps` を `rows` + `onGoToWork` のみに簡素化
- [x] Step 3: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` — `renderAction` をシンプルなロジックに置き換え・`onViewDetail`/`onStartWork`/`projectStatus` Props 除去・`ProjectStatus`/`TaskStatus` import 除去
- [x] Step 4: `frontend/src/components/menus/ExperimentWorkerMenu.tsx` — `onViewDetail`/`onStartWork`/`projectStatus` props 渡しを削除
- [x] Step 5: TypeScript ビルドエラーなし確認（exit code 0）
