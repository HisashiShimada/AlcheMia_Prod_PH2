# タスク計画書: 実験記録タブ トランジション表示修正

## メタデータ
- **作成日時**: 2026-08-23 19:20
- **タスクID**: 実験記録タブトランジション表示修正
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

進捗確認タブでトランジション開始操作を行った後、実験記録タブで「担当タスクの全トランジションが完了しています。」と誤表示され、テンプレート0件・「作業中のトランジションがありません。」となる問題を修正する。

## 根本原因（調査済み）

`WorkRecordPanel.tsx` が内部でモックデータ（`MOCK_TRANSITIONS`・`ORDERED_TRANSITION_IDS`・`INITIAL_TASKS`）を使用しており、APIから実際のトランジションデータを取得していない。

- `activeEntry` の計算が `ORDERED_TRANSITION_IDS`（モック固定ID配列）と `INITIAL_TASKS`（ハードコードされたモックタスク）を元に行われている
- APIで取得した実際のトランジションIDがモックのID（`transition-1781057805603` 等）と一致しないため、すべて「完了済み」扱いになる
- 「担当タスクの全トランジションが完了しています。」は `activeEntry === null` のときに表示される Alert であり、モックIDとAPI IDの不一致が原因

## 目的と期待される成果

- [ ] ProgressOverviewTab でトランジション開始後、実験記録タブに対象トランジションが表示される
- [ ] WorkRecordPanel が API から取得した実際のトランジションデータを使用する
- [ ] `ORDERED_TRANSITION_IDS` の代わりに API レスポンスのトランジションID順序を使用する
- [ ] 「担当タスクの全トランジションが完了しています。」は実際に全完了のときのみ表示される

## 実装ステップ

### Phase 1: 調査
- [ ] `WorkRecordPanel.tsx` の props インターフェースを確認（外部からトランジションデータを受け取る仕組みがあるか確認）
- [ ] `ExperimentWorkerMenu.tsx` の `<WorkRecordPanel>` 呼び出し部分の props を確認
- [ ] `ProgressOverviewTab.tsx` でトランジション開始後にメニュー側へ通知するコールバックがあるか確認
- [ ] バックエンド `GET /api/v1/progress/projects/:name/work-details` レスポンス構造を確認
  - 対象ファイル: `backend/src/services/progressService.ts`（`getWorkDetails` メソッド）
- [ ] フロントエンドの progressApiService（workDetails 取得関数）を確認

### Phase 2: WorkRecordPanel のモックデータ依存を除去
- [ ] `WorkRecordPanel.tsx` の外部インターフェースを拡張し、API から取得したトランジションデータを props で受け取れるようにする
  - `tasks: ApiTaskTransition[]` prop を追加（または既存 props を活用）
  - `ORDERED_TRANSITION_IDS` の代わりに API データのトランジション順序を使用
  - `INITIAL_TASKS` モックの代わりに API データを使用
- [ ] `activeEntry` の計算ロジックをAPI データベースに変更
  - `status !== 'running'` でなく、API のトランジションステータス（`in_progress` 等）に合わせる

### Phase 3: ExperimentWorkerMenu での API 接続
- [ ] `ExperimentWorkerMenu.tsx` でプロジェクト選択時に `getWorkDetails` API を呼び出す
- [ ] 取得したトランジションデータを `WorkRecordPanel` に props として渡す
- [ ] `ProgressOverviewTab` でトランジション開始後に `getWorkDetails` を再取得するコールバックを実装

### Phase 4: 動作確認
- [ ] 進捗確認タブでトランジション開始 → 実験記録タブでトランジションが表示されることを確認
- [ ] 全トランジション完了時のみ「完了しています」Alert が表示されることを確認

## 変更ファイル

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 修正 | モックデータ依存を除去・API データを props で受け取る |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 修正 | getWorkDetails API 呼び出し・WorkRecordPanel へデータ渡し |
| `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` | 修正（必要に応じて） | トランジション開始後の再取得コールバック追加 |

## 調査時の重要発見

```
// WorkRecordPanel.tsx のモックID（これがAPI実データと不一致の原因）
export const TR_A_ID = 'transition-1781057805603';
export const TR_B_ID = 'transition-1781057812047';
export const TR_C_ID = 'transition-1781057819834';
export const TR_D_ID = 'transition-1781057826501';

// activeEntry 判定がこれらを使用しているため、
// API の実トランジションIDと一致せず常に null になる
const activeEntry = useMemo(() => {
  for (const tid of ORDERED_TRANSITION_IDS) {  // ← モック固定配列
    const tt = task.transitions.find((x) => x.transitionId === tid);
    if (tt && tt.status !== 'completed' && tt.status !== 'error') return ...;
  }
  return null;  // ← 常にここに到達 → 「全完了しています」Alert が表示される
});
```

## リスク

| リスク | 対策 |
|---|---|
| WorkRecordPanel が大規模ファイルで変更範囲が広い | replace_in_file で局所的に変更・各変更後にユーザー確認 |
| API レスポンスのトランジションステータス値がモックと異なる | progressService のレスポンス構造を先に確認してからマッピング |

## 承認記録
- **計画書提示日時**: 2026-08-23 19:20
- **承認日時**: （承認待ち）
