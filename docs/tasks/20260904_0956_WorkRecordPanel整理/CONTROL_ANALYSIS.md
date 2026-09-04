# WorkRecordPanel 制御ロジック整理ドキュメント

作成日: 2026-09-04

---

## 1. 2種類の「制御」が存在する

WorkRecordPanel には現在、**目的の異なる2つの制御**が混在している。

### 制御A: トランジションステータスによるボタン活性制御（正常に機能している）

**何を制御するか**: WorkHeader の「開始」「終了」「異常終了」「指示確認」ボタンの disabled 状態

**データソース**: `progressRows[].status`（API から取得したリアルタイムのステータス文字列）

**制御ロジック（PlanB 内 L1693〜1701）**:
```
currentStatus = displayKey に対応する progressRow.status

confirmInstructionDisabled = currentStatus !== 'preparing'
startDisabled    = currentStatus NOT IN ('preparing', 'ready', 'on_hold')
endDisabled      = currentStatus !== 'in_progress'
forceEndDisabled = currentStatus !== 'in_progress'
```

**状態と活性の対応表**:

| progressRow.status | 指示確認 | 開始 | 終了 | 異常終了 |
|--------------------|----------|------|------|----------|
| not_started        | 非活性   | 非活性 | 非活性 | 非活性 |
| preparing          | **活性** | **活性** | 非活性 | 非活性 |
| ready              | 非活性   | **活性** | 非活性 | 非活性 |
| in_progress        | 非活性   | 非活性 | **活性** | **活性** |
| on_hold            | 非活性   | **活性** | 非活性 | 非活性 |
| completed / issue  | 非活性   | 非活性 | 非活性 | 非活性 |

**この制御の役割**: ステータス遷移の操作ボタン（開始・終了・異常終了）を「現在の状態から押せるものだけ活性化」する。APIの遷移ルールをUIで補強するためのもの。

---

### 制御B: 閲覧/編集モード切り替え（破綻している）

**何を制御するか**: プロパティカードの入力フォームが読み取り専用か編集可能か（`isReadOnly` フラグ）

**本来やりたかったこと**: 「記録済みかどうか」で編集可否を切り替える

```
isRecorded === false（未記録） → 編集可能（isReadOnly = false）
isRecorded === true（記録済み） → デフォルト閲覧専用（isReadOnly = true）
  └→「訂正」ボタンで isCorrectionMode = true → 再び編集可能（isReadOnly = false）
```

**現在の実装（破綻している）**:
```tsx
// PlanB 内 L1621〜1624
const viewingKeyStatusB = viewingKey
  ? progressRows?.find(...).status
  : undefined;
const isReadOnly = viewingKey !== null
  && (viewingKeyStatusB === 'completed' || viewingKeyStatusB === 'issue')
  && !isCorrectionMode;
```

**問題点**:
1. `isRecorded` フラグを全く参照していない
2. `viewingKey !== null`（別タブから遷移してきた場合）かつ `status === 'completed'/'issue'` の場合にのみ読み取り専用になる
3. 同じ画面内で自分でトランジションを切り替えた場合（`viewingKey = null`）は `isReadOnly` が常に false になり、完了済みのトランジションも編集できてしまう
4. `status === 'completed'` であっても `isRecorded === false`（データ未保存）の場合がありうる

---

## 2. viewingKey の役割

`viewingKey` は「**どのトランジションをパネルに表示するか**」を固定するポインタ。

- ProgressOverviewTab の「記録確認」ボタン → `initialTaskNo`/`initialTransitionId` → `viewingKey` にセット
- 通常作業中は `viewingKey = null`、その場合は `activeEntry`（進行中トランジション）を表示

**viewingKey の責務**: 表示対象の固定のみ。読み取り専用かどうかの判断には使うべきでない。

---

## 3. 修正後の正しい設計

```
displayKey（表示対象）= viewingKey ?? pendingEndKey ?? activeEntry
  ↑ viewingKey は「表示を固定する」役割のみ（isReadOnly とは独立）

displayRow = progressRows.find(displayKey)

isReadOnly = displayRow?.isRecorded === true && !isCorrectionMode
  ↑ 記録済みフラグだけで判定。viewingKey の有無・statusは関係ない
```

### 各状態での動作

| 状況 | isRecorded | isCorrectionMode | isReadOnly | 表示 |
|------|-----------|-----------------|----------|------|
| 未記録トランジションを表示 | false | false | **false** | 編集可能・保存ボタン表示 |
| 記録済みトランジションを確認 | true | false | **true** | 閲覧専用・「訂正」ボタン表示 |
| 訂正モードで編集 | true | true | **false** | 編集可能・「訂正保存」「キャンセル」表示 |

---

## 4. WorkHeader 内の状態プルダウンの問題

`WorkHeader` には「状態」プルダウン（Select）があり `onStatusChange` コールバックを持つが、
`PlanB` から `WorkHeader` へ `onStatusChange` が渡されていない（未接続のデッドUI）。

### 現状の状態プルダウンがやろうとしていたこと
- ステータスを直接選択して変更できる（開始・終了ボタンの代替的な操作）

### 今後の方針
**状態プルダウンを存続させる場合**: `PlanB` → `WorkHeader` へ `onStatusChange` を正しく接続し、`ExperimentWorkerMenu` まで貫通させる必要がある。

**状態プルダウンを削除する場合**: 「開始」「終了」「異常終了」ボタンで遷移を操作する設計に統一し、プルダウンは削除する。

→ **ユーザーへの確認事項**（後述）

---

## 5. handleSaveAndNext の次遷移探索問題

```tsx
// 現在（L2825〜）- スキップ済みを無視
const currentTtIdx = task.transitions.findIndex(...);
const nextTt = task.transitions[currentTtIdx + 1];  // 単純 +1

// 本来あるべき姿 - スキップ・前提条件を考慮
const next = findNextAvailableTransition(taskNo, transitionId, skippedTransitionIds, tasks);
```

---

## 6. activeEntry の二重計算

`PlanB` 内（useMemo）と `WorkRecordPanel` 本体（`activeTaskEntry` useMemo）の2か所で同じロジックで計算されている。本体で1回計算して PlanB に Props で渡すべき。

---

## 7. 修正方針の選択肢（ユーザー確認が必要な点）

### 選択1: 状態プルダウンをどうするか

**A) 削除する**: 「開始」「終了」「異常終了」ボタンで統一（シンプル）
**B) 残して接続する**: `onStatusChange` を PlanB → WorkHeader → ExperimentWorkerMenu まで貫通させる（工数大）

### 選択2: isReadOnly の判定基準

**A) isRecorded のみ**: `isReadOnly = isRecorded === true && !isCorrectionMode`
**B) isRecorded + viewingKey**: `isReadOnly = (isRecorded === true || viewingKey !== null) && !isCorrectionMode`
　→ viewingKey が設定されているとき（別タブから来た場合）は強制的に閲覧モード開始

現在のコードの意図的な動作「別タブから来た場合は閲覧モードで開始し、未記録でも訂正ボタンで編集できる」を残すなら B が適切。
