# 調査レポート: 完了 eventLog 二重登録問題

- **作成日時**: 2026-09-24
- **種類**: 調査レポート（実装なし）
- **調査者**: Cline

---

## 1. 事象

`WorkRecordPanel` の終了ボタンから `onEnd` が呼ばれ、  
`progressController.updateTransitionStatus` が実行されると、  
MAIMLの `maiml_event_log` に完了を示す eventLog が **2件** 登録される。

| # | `lifecycle:transition` の値 | 正否 | 出所 |
|---|---|---|---|
| 1 | `complete` | ✅ 正しい | `progressService.updateTransitionStatus` → `insertTransitionProgressLog` |
| 2 | `completed` | ❌ 誤り | `experimentDataService.updateDeemedProgress`（みなし進捗） → `insertTransitionProgressLog` |

---

## 2. 調査対象ファイル

| ファイル | 役割 |
|---|---|
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 終了ボタン `onEnd` ハンドラー |
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 終了ボタン UI |
| `backend/src/controllers/progressController.ts` | `updateTransitionStatus` コントローラー |
| `backend/src/services/progressService.ts` | `updateTransitionStatus` サービス |
| `backend/src/services/experimentDataService.ts` | `saveBatchData` → `updateDeemedProgress`（みなし進捗） |
| `backend/src/repositories/eventLogRepository.ts` | `insertTransitionProgressLog` / `LIFECYCLE_TRANSITION_VALUE_MAP` |

---

## 3. 正常な登録経路（`complete`）

```
[終了ボタン押下]
  ExperimentWorkerMenu.tsx onEnd (L610)
    → updateTransitionStatus(project, methodId, transitionId, { status: COMPLETED })
      → progressController.updateTransitionStatus (progressController.ts L219)
        → progressService.updateTransitionStatus (progressService.ts L947)
          → insertTransitionProgressLog(
              ...
              statusLabel = "completed",   // transitionStatusLabelMap[COMPLETED]
              fromStatus  = 4(IN_PROGRESS),
              toStatus    = 6(COMPLETED)
            )
              → getLifecycleTransitionValue(4, 6, "completed")
                → LIFECYCLE_TRANSITION_VALUE_MAP[4][6] = "complete"  ✅
```

`progressService.ts` L974〜977 で `Number()` による明示的なキャストが行われており、  
`LIFECYCLE_TRANSITION_VALUE_MAP` の数値キーとの照合が正常に機能する。

```typescript
// progressService.ts L974-977（正しい実装）
const { ..., status: _rawCurrentStatus } = findResult.rows[0];
const currentStatus = Number(_rawCurrentStatus) as TransitionStatusNumber; // ← Number()変換あり
```

---

## 4. 誤った登録経路（`completed`）

### 4-1. 呼び出しトリガー

`saveBatchData`（データ記録保存 API）内でも `insertTransitionProgressLog` が呼ばれる。

```
[データ保存時]
  experimentDataService.saveBatchData (L81)
    → Step 4: updateDeemedProgress (L159)
        → みなし進捗判定: 全データ登録済み → newStatus = COMPLETED(6)
          → insertTransitionProgressLog(
              ...
              statusLabel  = "completed",  // deemedStatusLabelMap[COMPLETED]
              fromStatus   = deemedFromStatus,  ← ★ ここが問題
              toStatus     = 6(COMPLETED)
            )
```

### 4-2. 問題箇所

`experimentDataService.ts` L1092〜1097:

```typescript
let deemedFromStatus: TransitionStatus | null = null;
try {
  const currentSql = await loadSqlFile('transition_data/findByTransitionId.sql');
  const currentResult = await client.query(currentSql, [...]);
  if (currentResult.rows.length > 0) {
    deemedFromStatus = currentResult.rows[0].status as TransitionStatus;  // ← Number()変換なし
  }
}
```

PostgreSQL の `numeric(2,0)` 型は `pg` ライブラリが**文字列**として返す。  
`progressService.ts` では `Number(_rawCurrentStatus)` と明示キャストしているが、  
`experimentDataService.ts` では `as TransitionStatus` の型キャストのみで**数値変換が行われていない**。

### 4-3. 結果として起きること

```typescript
// deemedFromStatus = "4"（文字列）で渡される
getLifecycleTransitionValue("4", 6, "completed")
  → LIFECYCLE_TRANSITION_VALUE_MAP["4"]  // → undefined（数値キー4とは別物）
  → toMap が undefined のため早期リターン
  → statusLabel のフォールバック = "completed" が返される  ❌
```

`LIFECYCLE_TRANSITION_VALUE_MAP` のキーは数値型（`TransitionStatusEnum` のEnum値）だが、  
文字列 `"4"` では照合に失敗し、フォールバック値の `"completed"`（statusLabel）が  
そのまま `lifecycle:transition` として登録される。

---

## 5. 発生シナリオ

```
① WorkRecordPanel でデータを入力・保存（saveBatchData 呼び出し）
     → みなし進捗が「全データ登録済み」と判定
     → COMPLETED へ遷移 + eventLog 登録（lifecycle:transition = "completed" ❌）

② 終了ボタン押下（onEnd → updateTransitionStatus 呼び出し）
     → COMPLETED は ALLOWED_TRANSITIONS では COMPLETED → COMPLETED のみ許可
     → 遷移バリデーションは通過
     → eventLog 登録（lifecycle:transition = "complete" ✅）

→ 結果: 2件の eventLog が登録される
```

---

## 6. `insertTransitionProgressLog` 自体の実装について

**`eventLogRepository.ts` の `insertTransitionProgressLog` は正常に実装されている。**

- `getLifecycleTransitionValue(fromStatus, toStatus, statusLabel)` を呼び出し
- `fromStatus` / `toStatus` が数値型で正しく渡された場合は `LIFECYCLE_TRANSITION_VALUE_MAP` を参照して正しい値を返す
- `fromStatus` が `null` または型変換失敗の場合は `statusLabel` をフォールバックとして返す仕様

問題は呼び出し側（`experimentDataService.ts`）が `fromStatus` を数値に変換せず渡していること。

---

## 7. 根本原因まとめ

| 項目 | 内容 |
|---|---|
| **問題ファイル** | `backend/src/services/experimentDataService.ts` |
| **問題箇所** | L1097: `deemedFromStatus = currentResult.rows[0].status as TransitionStatus;` |
| **原因** | `Number()` 変換なしで PostgreSQL の文字列値をそのまま `fromStatus` に渡しているため `LIFECYCLE_TRANSITION_VALUE_MAP` の数値キーとの照合が失敗し、フォールバック値 `"completed"` が `lifecycle:transition` に登録される |
| **正しい実装** | `progressService.ts` L977 と同様に `Number(currentResult.rows[0].status) as TransitionStatus` とすべき |

---

## 8. みなし進捗廃止との関係

**みなし進捗（`updateDeemedProgress`）を廃止する場合、この問題は自動的に解消される。**

`updateDeemedProgress` 関数が削除または無効化されれば、  
`experimentDataService.saveBatchData` 経由での `insertTransitionProgressLog` 呼び出しが  
なくなるため、`"completed"` の不正な eventLog は登録されなくなる。

対象の削除候補コード：

| ファイル | 行 | 内容 |
|---|---|---|
| `backend/src/services/experimentDataService.ts` | L158-169 | `updateDeemedProgress` 呼び出し |
| `backend/src/services/experimentDataService.ts` | L950-1232 | `updateDeemedProgress` 関数本体 |
| `backend/src/repositories/transitionDataRepository.ts` | （要確認） | `updateStatusDeemed` メソッド |
| `backend/src/repositories/organizationRepository.ts` | （要確認） | `getUseDeemedProgress` 関数 |

---

## 9. 調査時の注意事項

- 本レポート作成時点でソースコードへの変更は**一切行っていない**
- `insertTransitionProgressLog` 自体のロジックに問題はなく、ユーザーの認識どおり正常
- みなし進捗廃止の実装は別タスクとして計画・承認を経て進めること
