# タスク計画書: フロー図「記録」ボタン活性条件修正

## メタデータ
- **作成日時**: 2026-02-26 21:33
- **タスクID**: flow-record-button-fix
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

フロー図（TransitionFlowDiagram）のノードに表示される「記録」ボタンが、リスト表示（TransitionList）では活性なのに非活性になっている問題を修正する。

調査の結果、原因は両コンポーネントの `isProjectRecordable` 判定ロジックの不整合であることが判明した。
リスト表示側（`isRecordableStatus` 関数を使用し `waiting_task`, `executing_task`, `waiting_approval` の3つで活性）が正しい仕様であり、フロー図側（`executing_task` のみ活性）が誤っている。

また、`isRecordableStatus` という関数名は「記録できる」という意味に誤解されるため、「記録を確認できる」という意味の `isRecordViewableStatus` に改名する。

## 目的と期待される成果

- [ ] フロー図の「記録」ボタンの活性条件をリスト表示と統一する（`waiting_task`, `executing_task`, `waiting_approval` の3つで活性）
- [ ] `isRecordableStatus` 関数名を `isRecordViewableStatus` に変更する
- [ ] `ExperimentRecordTab.tsx` の `isProjectRecordable` 計算を `isRecordViewableStatus` を使う形に修正する

## 実装ステップ

### Phase 1: experimentWorker.ts の修正（ロールバック + 関数名変更）
- [ ] 誤って変更した `isRecordableStatus` の内容を元に戻す（3つのステータスで活性）
- [ ] 関数名を `isRecordableStatus` → `isRecordViewableStatus` に変更する

### Phase 2: TransitionList.tsx の修正（ロールバック + 関数名変更）
- [ ] 誤って削除した `isRecordableStatus` インポートを `isRecordViewableStatus` として復元する
- [ ] `isProjectRecordable` 計算を `isRecordViewableStatus` を使う形に修正する

### Phase 3: ExperimentRecordTab.tsx の修正
- [ ] `isProjectRecordable` の計算を `isRecordViewableStatus` を使う形に修正する

### Phase 4: 動作確認
- [ ] 修正内容が意図通りか確認する

## 変更ファイル

1. `frontend/src/types/experimentWorker.ts` - `isRecordableStatus` → `isRecordViewableStatus` に関数名変更（内容は元に戻す）
2. `frontend/src/components/ExperimentWorker/TransitionList.tsx` - `isRecordViewableStatus` を使うよう修正
3. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - `isProjectRecordable` 計算を `isRecordViewableStatus` に統一

## リスク

| リスク | 対策 |
|--------|------|
| `isRecordableStatus` を他のコンポーネントが使用していた場合、見落としが発生する | 検索で全使用箇所を確認する |

## 承認記録
- **計画書提示日時**: 2026-02-26 21:33
- **承認日時**: 2026-02-26 21:39（修正版）
