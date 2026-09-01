# タスク計画書: WorkRecordPanel モックデータ除去

## メタデータ
- **作成日時**: 2026-08-24 14:59
- **タスクID**: モックデータ除去_WorkRecordPanel
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要
`WorkRecordPanel.tsx` に残っているモックデータ定数・フォールバックを除去し、
すべてのデータを API（DB / MAIMLファイル）から取得する構造に変更する。

## 目的と期待される成果
- [ ] `MOCK_TRANSITIONS` フォールバックを削除（`effectiveTransitions = apiTransitions` のみ）
- [ ] `INITIAL_TASKS` を `[]` に変更
- [ ] `MOCK_PROJECT_INSTRUCTIONS` フォールバックを `[]` に変更
- [ ] `ORDERED_TRANSITION_IDS` を `apiTransitions` のorderベースに置き換え
- [ ] モック定数の定義を削除（型定義・ユーティリティ関数は維持）

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

## 変更詳細

### 1. tasks 初期値
```typescript
// 変更前
const [tasks, setTasks] = useState<MockTask[]>(INITIAL_TASKS);
// 変更後
const [tasks, setTasks] = useState<MockTask[]>([]);
```

### 2. effectiveTransitions（PlanB）
```typescript
// 変更前
const effectiveTransitions = (apiTransitions && apiTransitions.length > 0) ? apiTransitions : MOCK_TRANSITIONS;
// 変更後
const effectiveTransitions = apiTransitions;
```

### 3. activeEntry（ORDERED_TRANSITION_IDS 依存を除去）
ORDERED_TRANSITION_IDS は MOCK_METHODS + MOCK_TRANSITIONS から生成されており、
実API のトランジションIDとは無関係。
progressRows がある場合は progressRows のみを使うため実質影響なし。
progressRows がない場合のフォールバックコード（ORDERED_TRANSITION_IDS を使うブロック）を削除。

### 4. projectInstructions フォールバック
```typescript
// 変更前
instructions: projectInstructions ?? MOCK_PROJECT_INSTRUCTIONS,
// 変更後
instructions: projectInstructions ?? [],
```

### 5. モック定数定義の削除
以下の定数を削除（export していたものも削除）:
- `MOCK_PROJECT_INSTRUCTIONS`
- `PROJECT_NAME`, `METHOD_ID`
- `TR_A_ID`, `TR_B_ID`, `TR_C_ID`, `TR_D_ID`
- `MOCK_METHODS`
- `MOCK_TRANSITIONS`
- `ORDERED_TRANSITION_IDS`
- `INITIAL_TASKS`

型定義（`MockProperty`, `MockTemplate`, `MockTransition`, `MockTask` 等）は維持。

### 6. PlanA コンポーネント
PlanA の `activeEntry` でも ORDERED_TRANSITION_IDS を使うフォールバックがあるため同様に削除。
PlanA は現在 WorkRecordPanel では使用されていないが、コードは維持（ただしモックフォールバックは除去）。

## 承認記録
- **承認日時**: 2026-08-24 14:59
