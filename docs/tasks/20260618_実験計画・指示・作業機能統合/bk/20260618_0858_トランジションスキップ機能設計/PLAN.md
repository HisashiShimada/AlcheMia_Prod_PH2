# タスク計画書: トランジション・タスクスキップ機能設計と実装

## メタデータ
- **作成日時**: 2026-06-18 08:58
- **タスクID**: transition-skip-feature
- **優先度**: 中
- **推定工数**: 3時間

## 1. タスク概要

`transition_data` テーブルに設定したトランジションの順序（`work_order`）と固定順序フラグ（`is_order_fixed`）を活用し、進められないトランジションをスキップして並列優先度のトランジションを先に記録できる機能を実装する。
また、トランジション単位だけでなく、タスク全体をスキップして次のタスクを先に行う機能も検討・実装する。

---

## 2. 背景と前提

### transition_data テーブルの関連カラム（2026-06-17追加）
```sql
work_order     INTEGER  -- 作業の順序番号（小さいほど先）
is_order_fixed BOOLEAN  -- TRUE: 固定順序（前の順序が全て完了しないと開始不可）
                        -- FALSE: 並列実行可（順序に関係なく作業可能）
```

### 現在の画面構成
- **ExperimentWorkerMenu**: タブ管理（作業記録タブ・進捗確認タブ）
- **WorkRecordPanel**: 個々のトランジション作業記録（PlanA/PlanB）
- **ProgressOverviewTab**: 全体進捗表示テーブル（操作: 作業へ / 詳細確認）

---

## 3. 要件詳細

### 3-1. トランジションのスキップ

#### 目的
- `is_order_fixed = FALSE` のトランジションに別の並列トランジションがある場合、現在のトランジションを後回し（スキップ）にして他のトランジションを先に実施できる

#### ルール
- スキップに制限なし（何度でもスキップ可能）
- スキップを記録する専用ステータスは設けない（単に別トランジションに移動するだけ）
- スキップしたトランジションは ProgressOverviewTab から選択して戻れる

#### 固定順序のルール
```
is_order_fixed = TRUE のトランジションは、
自分より小さい work_order のトランジションが全て completed になっていれば作業開始可能。
逆に、未完了のものが1件でも残っている場合は開始不可（disabled 表示）。
```

#### 例
```
work_order=1, is_order_fixed=FALSE → 常にアクセス可能
work_order=2, is_order_fixed=FALSE → 常にアクセス可能
work_order=3, is_order_fixed=TRUE  → order=1,2 が両方 completed のときのみ可能
work_order=4, is_order_fixed=FALSE → 常にアクセス可能
work_order=5, is_order_fixed=TRUE  → order=1,2,3,4 が全て completed のときのみ可能
```

### 3-2. タスクのスキップ

#### 目的
- タスク単位でスキップして次のタスクを先に実施できる
- 例：タスク#1 の材料が届いていないため、タスク#2 を先に実施する

#### ルール
- タスクのスキップも制限なし
- ProgressOverviewTab からスキップしたタスクに戻れる
- タスクスキップは「そのタスクの全トランジションを一時的に飛ばす」ことを意味する（ステータス変更なし）

---

## 4. UI設計

### 4-1. WorkRecordPanel への追加

#### 「スキップ」ボタン
```
既存の操作エリア:
  [保存] [保存して次へ]

変更後:
  [保存] [スキップ] [保存して次へ]
         ↑新規追加
```

- **有効条件**: 他に実行可能なトランジションが存在する場合
- **無効条件**: スキップできる他のトランジションが存在しない場合
- **確認ダイアログ**: なし（シンプルに次へ移動）

#### スキップ処理フロー
```
1. 現在のトランジションを skippedTransitions[] に追加
2. 次の実行可能なトランジションを検索
3. 次があれば → そのトランジションに移動
4. 次がなければ → ProgressOverviewTab に自動切り替え + メッセージ
```

#### 次の実行可能なトランジション検索ロジック
```typescript
function findNextAvailableTransition(
  allTransitions: TransitionItem[],
  currentTransitionId: string,
  skippedIds: string[]
): TransitionItem | null {
  const sorted = [...allTransitions].sort((a, b) => a.order - b.order);
  const currentIndex = sorted.findIndex(t => t.id === currentTransitionId);

  // 現在より後ろから探す
  for (let i = currentIndex + 1; i < sorted.length; i++) {
    const candidate = sorted[i];
    if (candidate.status === 'completed') continue;          // 完了済みはスキップ
    if (skippedIds.includes(candidate.id)) continue;         // スキップ済みも除外
    if (!canAccessTransition(candidate, sorted)) continue;   // 固定順序チェック
    return candidate;
  }

  // 現在より前も探す（循環）
  for (let i = 0; i < currentIndex; i++) {
    const candidate = sorted[i];
    if (candidate.status === 'completed') continue;
    if (skippedIds.includes(candidate.id)) continue;
    if (!canAccessTransition(candidate, sorted)) continue;
    return candidate;
  }

  return null;
}
```

### 4-2. ProgressOverviewTab への追加

#### 型拡張（ProgressRow）
```typescript
export interface ProgressRow {
  // 既存フィールド（変更なし）
  rowKey: string;
  taskNo: number;
  methodId: string;
  transitionId: string;
  status: 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'issue';
  hasRecord: boolean;
  materialRecorded?: number;
  materialTotal?: number;
  conditionRecorded?: number;
  conditionTotal?: number;
  resultRecorded?: number;
  resultTotal?: number;
  issueCount?: number;

  // ★新規追加
  order?: number;           // work_order（省略時は 0）
  isOrderFixed?: boolean;   // 固定順序フラグ
  isSkipped?: boolean;      // 現在スキップ中フラグ（UI管理）
}
```

#### テーブル列の追加
```
現在:
  [タスクNo] [メソッドID] [トランジションID] [ステータス] [Mat] [Cond] [Res] [問題] [操作]

変更後:
  [順序] [タスクNo] [メソッドID] [トランジションID] [ステータス] [Mat] [Cond] [Res] [問題] [操作]
  ↑新規追加
```

#### 「順序」列の表示
```
order=1, isOrderFixed=false → "1"（通常）
order=3, isOrderFixed=true  → "3 🔒"（固定順序アイコン付き）
```

#### ステータス列の拡張
```
既存: [ステータスタグ]

スキップ中の場合:
  [ステータスタグ] [スキップ中 ⚡ タグ（orange）]
```

#### アクション列の変更
```
completed / issue → [詳細確認] ボタン（変更なし）
in_progress       → [作業へ] ボタン（変更なし）
not_started（アクセス可能）     → [開始] ボタン（新規）
not_started（アクセス不可）     → [開始] ボタン disabled + Tooltip「前の順序のトランジションを完了してください」
on_hold           → [再開] ボタン（新規）
```

#### フィルタの追加
```
現在: [タスクNo] [ステータス]

変更後: [タスクNo] [ステータス] [スキップ中のみ] チェックボックス
```

---

## 5. ビジネスロジック

### 5-1. 固定順序チェック
```typescript
function canAccessTransition(
  target: ProgressRow,
  allRows: ProgressRow[]
): boolean {
  if (!target.isOrderFixed) return true;

  // 同じタスク・同じメソッドの、自分より小さい order のトランジション
  const previousTransitions = allRows.filter(
    r =>
      r.taskNo === target.taskNo &&
      r.methodId === target.methodId &&
      (r.order ?? 0) < (target.order ?? 0)
  );

  return previousTransitions.every(r => r.status === 'completed');
}
```

### 5-2. スキップ状態の管理
```typescript
// ExperimentWorkerMenu または WorkRecordPanel の state
const [skippedTransitionIds, setSkippedTransitionIds] = useState<string[]>([]);

// スキップ追加
function addSkip(transitionId: string) {
  setSkippedTransitionIds(prev =>
    prev.includes(transitionId) ? prev : [...prev, transitionId]
  );
}

// スキップ解除（作業に戻ったとき）
function removeSkip(transitionId: string) {
  setSkippedTransitionIds(prev => prev.filter(id => id !== transitionId));
}
```

### 5-3. ProgressRow への isSkipped 反映
```typescript
// ProgressOverviewTab の rows 生成時
const rowsWithSkipInfo: ProgressRow[] = rows.map(row => ({
  ...row,
  isSkipped: skippedTransitionIds.includes(row.transitionId),
}));
```

---

## 6. 実装対象ファイル

### 変更するファイル
1. `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`
   - ProgressRow 型に `order`, `isOrderFixed`, `isSkipped` 追加
   - 「順序」列追加
   - ステータス列に「スキップ中」タグ追加
   - アクション列のロジック変更（開始/無効）
   - フィルタにスキップ中フィルタ追加
   - `canAccessTransition` ロジック追加
   - Props に `onStartWork` 追加

2. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - スキップリスト state 追加
   - 「スキップ」ボタン追加
   - `findNextAvailableTransition` ロジック追加
   - スキップ時の遷移処理

3. `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
   - スキップ状態の管理（スキップIDリスト）
   - ProgressOverviewTab への rows 生成時に isSkipped を反映
   - WorkRecordPanel からのスキップ通知受け取り

---

## 7. モックデータの拡張

WorkRecordPanel のモックデータに `order` と `isOrderFixed` を追加する。

```typescript
// モックトランジション例
const MOCK_TRANSITIONS = [
  { id: 'trans-001', name: '材料準備',   order: 1, isOrderFixed: false },
  { id: 'trans-002', name: '混合',       order: 2, isOrderFixed: false },
  { id: 'trans-003', name: '加熱',       order: 3, isOrderFixed: true  }, // 固定：1,2完了後
  { id: 'trans-004', name: '冷却',       order: 4, isOrderFixed: false },
  { id: 'trans-005', name: '測定',       order: 5, isOrderFixed: true  }, // 固定：1-4完了後
];
```

---

## 8. 将来のバックエンド対応

| 対応内容 | 詳細 |
|---------|------|
| `work_order` / `is_order_fixed` の取得 | `GET /progress/projects/:name/worker-tasks` のレスポンスに追加 |
| スキップ状態の永続化 | 必要に応じて `transition_data` に `is_skipped` カラム追加を検討 |
| タスクスキップの永続化 | 必要に応じて `project_task` に `is_skipped` カラム追加を検討 |

---

## 9. 実装ステップ（フェーズA: モック）

- [ ] Phase 1: ProgressOverviewTab の拡張
  - [ ] 型拡張（order, isOrderFixed, isSkipped）
  - [ ] 「順序」列追加
  - [ ] 「スキップ中」タグ追加
  - [ ] アクション列変更（開始ボタン・固定順序disabled）
  - [ ] `canAccessTransition` 関数追加
  - [ ] スキップ中フィルタ追加
  - [ ] Props に `onStartWork` 追加

- [ ] Phase 2: WorkRecordPanel の拡張
  - [ ] スキップリスト state 追加
  - [ ] 「スキップ」ボタン追加
  - [ ] `findNextAvailableTransition` 実装
  - [ ] スキップ時の遷移処理
  - [ ] Props に `onSkip` コールバック追加

- [ ] Phase 3: ExperimentWorkerMenu の更新
  - [ ] スキップIDリスト state 追加
  - [ ] ProgressOverviewTab の rows に isSkipped を反映
  - [ ] WorkRecordPanel の onSkip ハンドラ実装

---

---

## 追記: ExperimentPlanDialog 順序設定部品の再設計 (2026-06-18)

### 背景

`is_order_fixed` + `work_order` による「固定順序フラグ」の表現から、
`prerequisite_transition_ids`（前提トランジションID配列）による「依存関係表現」への移行に伴い、
ExperimentPlanDialog の実行順序リスト部品も同様に再設計する。

---

### 現状の実装

```typescript
// 状態管理
const [transitionOrder, setTransitionOrder] = useState<{
  id: string;
  order: number;
  isFixed: boolean; // ← モックハードコード
}[]>([]);

// isFixed 判定（モック実装 — 廃止対象）
function isTransitionFixed(transitionId: string): boolean {
  return transitionId.includes('加熱') || transitionId.includes('測定');
}

// ドラッグ制御: isFixed=true の行は移動不可
if (prev[oldIndex]?.isFixed || prev[newIndex]?.isFixed) {
  message.warning('依存関係により順序を変更できない...');
  return prev;
}
```

**UI:**
- `isFixed=true` → 🔒アイコン + 黄色背景 + ドラッグ不可（完全固定）
- `isFixed=false` → 🟰ドラッグハンドル + 自由に移動可能

**課題:**
- `isFixed` がハードコードであり、実際の依存関係データと連動していない
- 「固定か/自由か」の二択しか表現できない
  （並列実行可能だが依存先より前には行けない、という中間状態が表現できない）
- `prerequisiteTransitionIds` の情報を一切活用していない

---

### 採用する設計方針

#### 方針: オプションB — 依存関係を考慮した柔軟な制約

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| 制約の表現 | `isFixed: boolean` | `prerequisiteTransitionIds: string[]` |
| ドラッグ制御 | `isFixed=true` なら完全移動不可 | 依存先より前への移動のみ不可 |
| UI アイコン | 🔒（固定） | 🔗（依存あり）+ ツールチップ詳細 |
| バリデーション | ドラッグ時 | ドラッグ時（即時フィードバック） |
| 背景色 | 黄色（isFixed=true） | 青色薄め（prerequisiteTransitionIds が空でない行） |

**核心ロジック:**

```
あるトランジション T を targetOrder に移動可能？
  →「T の全ての依存先の order より大きい」位置にのみ移動可能

例:
  TR_A(order=1, prereqs=[])          → どこにでも移動可能
  TR_B(order=2, prereqs=[])          → どこにでも移動可能
  TR_C(order=3, prereqs=[])          → どこにでも移動可能
  TR_D(order=4, prereqs=[TR_A, TR_B, TR_C])
     → order=4 より前（order=1,2,3）には移動不可
     → order=4 以降は自由に移動可能

逆方向チェック:
  TR_A を order=4 に移動しようとした場合
  → TR_D が TR_A に依存しているため、TR_D より後ろには移動不可
```

---

### 実装詳細

#### 1. 型定義の更新

```typescript
// 変更前
{ id: string; order: number; isFixed: boolean }

// 変更後
interface TransitionOrderItem {
  id: string;
  name: string;
  order: number;
  /** 前提となるトランジションIDの配列（空配列 = 依存なし） */
  prerequisiteTransitionIds: string[];
}
```

#### 2. `canMoveToOrder` 関数（新規追加）

```typescript
/**
 * 指定トランジションを targetOrder に移動できるか判定する。
 *
 * チェック項目:
 *   A) 自分の依存先（prerequisiteTransitionIds）が全て targetOrder より小さいか
 *   B) 自分に依存している他トランジションが全て targetOrder より大きいか
 *
 * @returns { canMove: boolean; reason?: string }
 */
function canMoveToOrder(
  transitionId: string,
  targetOrder: number,
  currentOrderList: TransitionOrderItem[]
): { canMove: boolean; reason?: string } {
  const target = currentOrderList.find((t) => t.id === transitionId);
  if (!target) return { canMove: false, reason: 'トランジションが見つかりません' };

  // A) 自分の依存先チェック
  const prereqs = target.prerequisiteTransitionIds ?? [];
  for (const prereqId of prereqs) {
    const prereq = currentOrderList.find((t) => t.id === prereqId);
    if (prereq && prereq.order >= targetOrder) {
      return {
        canMove: false,
        reason: `依存先「${prereq.name}」（順序: ${prereq.order}）より前には移動できません`,
      };
    }
  }

  // B) 自分に依存している他トランジションチェック（逆方向）
  const dependents = currentOrderList.filter((t) =>
    (t.prerequisiteTransitionIds ?? []).includes(transitionId)
  );
  for (const dep of dependents) {
    if (dep.order <= targetOrder) {
      return {
        canMove: false,
        reason: `このトランジションに依存している「${dep.name}」（順序: ${dep.order}）より後ろには移動できません`,
      };
    }
  }

  return { canMove: true };
}
```

#### 3. SortableTransitionRow の UI 変更

```tsx
// 変更前
{isFixed ? (
  <Tooltip title="依存関係により順序固定">
    <LockOutlined style={{ color: '#faad14' }} />
  </Tooltip>
) : (
  <HolderOutlined {...listeners} style={{ cursor: 'grab' }} />
)}

// 変更後
{/* ドラッグハンドル（常に表示・依存があっても許容範囲内は移動可） */}
<HolderOutlined {...listeners} style={{ cursor: 'grab', color: '#8c8c8c' }} />

{/* 依存関係アイコン（prerequisiteTransitionIds が空でない場合のみ） */}
{prerequisiteTransitionIds.length > 0 && (
  <Tooltip
    title={
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
          依存関係あり（以下より後に実行）
        </div>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {prerequisiteTransitionIds.map((prereqId) => {
            const prereq = allTransitionOrderItems.find((t) => t.id === prereqId);
            return (
              <li key={prereqId}>
                {prereq?.name || prereqId}（順序: {prereq?.order ?? '?'}）
              </li>
            );
          })}
        </ul>
      </div>
    }
  >
    <Tag
      color="blue"
      icon={<LinkOutlined />}
      style={{ margin: 0, cursor: 'default', fontSize: 11 }}
    >
      依存
    </Tag>
  </Tooltip>
)}
```

#### 4. 行の背景色変更

```typescript
// 変更前
backgroundColor: isFixed ? token.colorWarningBg : token.colorFillAlter

// 変更後
backgroundColor: prerequisiteTransitionIds.length > 0
  ? token.colorInfoBg        // 青系（依存あり）
  : token.colorFillAlter     // デフォルト（依存なし）
```

#### 5. ドラッグ&ドロップハンドラ更新

```typescript
const handleDragEnd = useCallback((event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  setTransitionOrder((prev) => {
    const oldIndex = prev.findIndex((item) => item.id === active.id);
    const newIndex = prev.findIndex((item) => item.id === over.id);
    const targetOrder = newIndex + 1;

    // 依存関係バリデーション
    const validation = canMoveToOrder(active.id as string, targetOrder, prev);
    if (!validation.canMove) {
      message.warning(validation.reason ?? '順序を変更できません');
      return prev;
    }

    const moved = arrayMove(prev, oldIndex, newIndex);
    return moved.map((item, i) => ({ ...item, order: i + 1 }));
  });
}, [message]);
```

#### 6. Select 手入力ハンドラ更新

```typescript
const handleOrderSelectChange = useCallback((transitionId: string, targetOrder: number) => {
  setTransitionOrder((prev) => {
    const validation = canMoveToOrder(transitionId, targetOrder, prev);
    if (!validation.canMove) {
      message.warning(validation.reason ?? '順序を変更できません');
      return prev;
    }
    const currentIndex = prev.findIndex((item) => item.id === transitionId);
    const targetIndex = targetOrder - 1;
    const moved = arrayMove(prev, currentIndex, targetIndex);
    return moved.map((item, i) => ({ ...item, order: i + 1 }));
  });
}, [message]);
```

#### 7. 初期化処理の更新

```typescript
// dialogData.transitions に prerequisiteTransitionIds が含まれることを前提
useEffect(() => {
  if (!open || !dialogData?.transitions) return;

  const orderList: TransitionOrderItem[] = dialogData.transitions.map((trans, index) => ({
    id: trans.id,
    name: trans.name,
    order: trans.workOrder ?? index + 1,
    prerequisiteTransitionIds: trans.prerequisiteTransitionIds ?? [],
  }));

  setTransitionOrder(orderList);
}, [open, dialogData]);
```

---

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | 型定義・ロジック・UI の全面更新 |
| `frontend/src/types/experimentPlan.ts` | `TransitionRow` 型に `prerequisiteTransitionIds` 追加 |
| `frontend/src/services/experimentPlanApiService.ts` | APIレスポンス型に `prerequisiteTransitionIds` 追加（必要に応じて） |

---

### 変更しないもの

- `order`（表示順序）フィールドはそのまま維持
- ドラッグ&ドロップ機能自体は維持（制約ロジックのみ変更）
- `SortableContext` / `DndContext` の構造は変更なし
- Select による手入力順序変更も維持

---

## 10. 承認記録

- **計画書提示日時**: 2026-06-18 08:58
- **承認日時**: 2026-06-18 08:58
- **承認者コメント**: 一旦検討事項をファイルにまとめたうえで画面を修正してください
- **ExperimentPlanDialog 再設計承認**: 2026-06-18 09:47（オプションB・UI表現B・ドラッグ時バリデーション）

## 11. 実施記録

### 実施日時
開始: 2026-06-18 08:58
完了: 2026-06-18 09:53

### 実施内容

#### DB マイグレーション
- `backend/migrations/20260618_002_add_prerequisite_to_transition_data.sql` 作成
  - `transition_data` テーブルに `prerequisite_transition_ids TEXT[] NOT NULL DEFAULT '{}'` を追加
  - `is_order_fixed` / `work_order` による固定制約をアプリ層の `prerequisiteTransitionIds` に移行

#### フロントエンド実装

**ProgressOverviewTab.tsx**
- `TransitionInfo` 型: `isOrderFixed: boolean` → `prerequisiteTransitionIds: string[]` に変更
- `canAccessTransition()`: 依存先トランジションが全て `completed` の場合のみアクセス可能に変更
- モックデータ更新

**WorkRecordPanel.tsx**
- `TransitionData` 型: `isOrderFixed: boolean` → `prerequisiteTransitionIds: string[]` に変更
- `canAccessTransitionInTask()`: 同様ロジックに変更

**ExperimentWorkerMenu.tsx**
- モックデータ: `isOrderFixed` → `prerequisiteTransitionIds` に更新

**ExperimentPlanDialog.tsx**（順序設定部品の再設計）
- アイコン: `LockOutlined` → `LinkOutlined` に変更
- 新型定義 `TransitionOrderItem`（`isFixed` を廃止し `name` / `prerequisiteTransitionIds` を追加）
- 新関数 `canMoveToOrder()`: 依存関係を双方向でチェック
  - A) 依存先が targetOrder より後にある場合は移動不可
  - B) 自分に依存するトランジションが targetOrder より前にある場合は移動不可
- `transitionOrder` state 型: `{ id, order, isFixed }[]` → `TransitionOrderItem[]`
- `isTransitionFixed()` 関数を削除
- 初期化 `useEffect`: `name` / `prerequisiteTransitionIds` を含む形に変更
- `handleDragEnd` / `handleOrderSelectChange`: `canMoveToOrder()` によるバリデーション適用
- `SortableTransitionRow` Props 更新:
  - `isFixed` を削除、`prerequisiteTransitionIds` / `allTransitionOrderItems` を追加
  - 依存ありの場合: 青系（`colorInfoBg` / `colorInfoBorder`）で表示
  - `LinkOutlined` + 「依存」タグにツールチップ（依存先の名前と現在の順序を表示）

### 残課題（次フェーズ）

- **バックエンド統合**: `transition_data` API で `prerequisite_transition_ids` を返却するよう更新
- **ExperimentPlanDialog 設計画面での依存関係設定UI**: どのトランジションを依存先にするか設定する UI（本タスクでは未実装）
- **タスクスキップ機能**: 設計は PLAN.md §3-2 に記載済み。実装は次タスクで対応

---

## 12. 追加設計: 依存グループ自動連動移動 (2026-06-18)

### 背景

`prerequisite_transition_ids` の設計方針が確定した（直接の依存先のみを格納）。
これに伴い、ExperimentPlanDialog の順序変更時に以下の問題があった：

**現状の問題:**
```
TR1(order=1) → TR2(order=2, prereqs=[TR1]) → TR3(order=3, prereqs=[TR2])

TR1 を order=5 に移動しようとした場合:
  → canMoveToOrder が拒否（TR2が依存しているため）
  → TR1を移動できない
```

**目的:** トランジションを移動した際に、そのトランジションに依存している子孫トランジションも一緒に自動連動移動させる。

---

### 設計

#### `prerequisite_transition_ids` の格納方針（確定）

- **直接の依存先のみ**を格納する
- 推移的な依存（間接依存）は格納しない
- 例:
  ```
  TR1: prereqs=[]
  TR2: prereqs=[TR1]          ← TR1の直後
  TR3: prereqs=[]             ← 独立
  TR4: prereqs=[TR3]          ← TR3の直後
  TR5: prereqs=[TR2, TR4]     ← TR2とTR4の両方が完了後
  ```

---

#### 追加する関数

##### `collectTransitionSubtree()`
移動対象のトランジションと、その全子孫（直接・間接依存）を収集する。

```typescript
/**
 * 指定トランジションとその全子孫（直接・間接依存）を収集する。
 * 返却値は currentOrder 順にソートされた TransitionOrderItem[]。
 */
function collectTransitionSubtree(
  transitionId: string,
  allTransitions: TransitionOrderItem[]
): TransitionOrderItem[] {
  const visited = new Set<string>();
  const result: TransitionOrderItem[] = [];

  function traverse(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const item = allTransitions.find((t) => t.id === id);
    if (!item) return;
    result.push(item);
    // 直接の子を再帰的に処理
    allTransitions
      .filter((t) => t.prerequisiteTransitionIds.includes(id))
      .forEach((child) => traverse(child.id));
  }

  traverse(transitionId);
  return result.sort((a, b) => a.order - b.order);
}
```

##### `moveTransitionWithSubtree()`
移動対象グループを targetOrder へ挿入し、order を振り直す。

```typescript
/**
 * 指定トランジションとその全子孫を targetOrder に移動する。
 * targetOrder は「移動対象グループの先頭が置かれるべき order 値」。
 *
 * アルゴリズム:
 *   1. 移動対象グループ（transitionId + 全子孫）を収集
 *   2. 残り（グループ以外）を元の順序で並べる
 *   3. 残りの列に targetOrder-1 の位置でグループを挿入
 *   4. order を 1 から振り直す
 */
function moveTransitionWithSubtree(
  transitionId: string,
  targetOrder: number,
  currentOrderList: TransitionOrderItem[]
): TransitionOrderItem[] {
  const subtree = collectTransitionSubtree(transitionId, currentOrderList);
  const subtreeIds = new Set(subtree.map((t) => t.id));

  // グループ以外を元の order 順で取得
  const others = currentOrderList
    .filter((t) => !subtreeIds.has(t.id))
    .sort((a, b) => a.order - b.order);

  // targetOrder は「残り列の何番目の後ろに挿入するか」
  // 例: targetOrder=3 → others の先頭2件の後ろに挿入
  const insertAt = Math.max(0, Math.min(targetOrder - 1, others.length));
  const result = [
    ...others.slice(0, insertAt),
    ...subtree,
    ...others.slice(insertAt),
  ];

  // order を 1 から振り直す
  return result.map((item, i) => ({ ...item, order: i + 1 }));
}
```

---

#### `canMoveToOrder` の変更

自動連動移動を採用するため、**`canMoveToOrder` の子孫チェック（Bチェック）を廃止**する。
子孫は自動で一緒に移動するため、「依存している子より後ろには移動できない」制約は不要になる。

変更後の制約:
- **Aチェックのみ**: 自分の依存先（prereqs）が全て targetOrder より前にあるか

```typescript
function canMoveToOrder(
  transitionId: string,
  targetOrder: number,
  currentOrderList: TransitionOrderItem[]
): { canMove: boolean; reason?: string } {
  const target = currentOrderList.find((t) => t.id === transitionId);
  if (!target) return { canMove: false, reason: 'トランジションが見つかりません' };

  // A) 依存先チェック（自分の prereqs が全て targetOrder より前にあるか）
  for (const prereqId of target.prerequisiteTransitionIds) {
    const prereq = currentOrderList.find((t) => t.id === prereqId);
    if (prereq && prereq.order >= targetOrder) {
      return {
        canMove: false,
        reason: `依存先「${prereq.name}」（順序: ${prereq.order}）より前には移動できません`,
      };
    }
  }

  return { canMove: true };
}
```

---

#### ドラッグ&ドロップハンドラの変更

```typescript
const handleDragEnd = useCallback((event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  setTransitionOrder((prev) => {
    const newIndex = prev.findIndex((item) => item.id === over.id);
    const targetOrder = newIndex + 1;

    // 依存先チェック（Aチェックのみ）
    const validation = canMoveToOrder(active.id as string, targetOrder, prev);
    if (!validation.canMove) {
      message.warning(validation.reason ?? '順序を変更できません');
      return prev;
    }

    // 子孫と一緒に移動
    return moveTransitionWithSubtree(active.id as string, targetOrder, prev);
  });
}, [message]);
```

#### Select手入力ハンドラの変更

```typescript
const handleOrderSelectChange = useCallback((transitionId: string, newOrder: number) => {
  setTransitionOrder((prev) => {
    const validation = canMoveToOrder(transitionId, newOrder, prev);
    if (!validation.canMove) {
      message.warning(validation.reason ?? '順序を変更できません');
      return prev;
    }
    return moveTransitionWithSubtree(transitionId, newOrder, prev);
  });
}, [message]);
```

---

#### モックデータの更新

`ExperimentWorkerMenu.tsx` のモックデータを、依存関係が意味を持つデータに修正する。

```typescript
const MOCK_TRANSITIONS = [
  { id: 'trans-001', name: '材料準備A',  prerequisiteTransitionIds: [] },
  { id: 'trans-002', name: '材料準備B',  prerequisiteTransitionIds: [] },
  { id: 'trans-003', name: '混合',       prerequisiteTransitionIds: ['trans-001', 'trans-002'] },
  { id: 'trans-004', name: '加熱',       prerequisiteTransitionIds: ['trans-003'] },
  { id: 'trans-005', name: '測定',       prerequisiteTransitionIds: ['trans-004'] },
];
// 例: TR3（混合）はTR1・TR2（材料準備A/B）が完了しないと開始不可
// 例: TR4（加熱）はTR3（混合）が完了しないと開始不可
// → TR1はTR2より先でも後でも可（並列）
// → TR4を移動しようとすると TR5（測定）も一緒に移動
```

---

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | `collectTransitionSubtree` / `moveTransitionWithSubtree` 追加、`canMoveToOrder` からBチェック削除、ハンドラ更新 |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | モックデータを依存関係あり構造に更新 |
