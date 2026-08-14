# タスク計画書: 進捗確認タブ フロー図切り替え機能追加

## メタデータ
- **作成日時**: 2026-08-14 10:00
- **更新日時**: 2026-08-14 10:30（依存関係レイアウト対応を追加）
- **タスクID**: 20260814_1000
- **優先度**: 中
- **推定工数**: 3〜4時間

---

## タスク概要

`ExperimentRecordTab.tsx` に実装済みのフロー図切り替え機能（リスト表示 ⇔ フロー図表示）を、
現行の進捗確認画面（`ProgressOverviewTab.tsx`）にも取り込む。

フロー図モード時は **「メソッド名 / #タスクNo」の組み合わせをタブとして列挙** し、
選択中タブに対応するトランジション群を `TransitionFlowDiagram` で表示する。

### 現状の問題点（調査で判明）

現行の `TransitionFlowDiagram` のレイアウトは `workOrder` 順の単純な直列配置になっており、
`prerequisiteTransitionIds`（依存関係）を一切使っていない。

```
現状: A → B → C → D（workOrder順の直列つなぎ）

あるべき姿（例: AとBが並列でどちらもCの前提）:
  [A]
       → [C] → [D]
  [B]
```

これを `PetriNetVisualization.tsx` で実装済みの **BFSトポロジカルソート** 方式に改修し、
進捗確認タブでも正確な並列構造を表示できるようにする。

### データ連鎖の欠損箇所（調査結果）

| 段階 | `prerequisiteTransitionIds` | 状態 |
|---|---|---|
| DB（`transition_data`） | `prerequisite_transition_ids` | ✅ 保存済み |
| バックエンドAPIレスポンス | `prerequisite_transition_ids` | ✅ 返却済み |
| `fetchTransitionStatus` マッピング | `prerequisiteTransitionIds` | ✅ マッピング済み |
| `ExperimentRecordTab` の変換処理 | — | ❌ 変換時に落としている |
| `Transition` 型定義 | — | ❌ フィールドなし |
| `TransitionFlowDiagram` レイアウト | — | ❌ 未使用（直列固定） |

---

## 目的と期待される成果

- [ ] 進捗確認タブにリスト⇔フロー図の切り替えボタンを追加する
- [ ] フロー図モード時に「メソッド名 / #タスクNo」の組み合わせタブを表示する
- [ ] タブ切り替えにより対応するトランジションのフロー図が表示される
- [ ] フロー図ノードの「記録」ボタン押下で作業記録タブへ遷移する（`onGoToWork` 呼び出し）
- [ ] リストモードのフィルタ操作がフロー図モードに影響しない（ステートは独立）
- [ ] **`TransitionFlowDiagram` のレイアウトを `prerequisiteTransitionIds` ベースの BFS トポロジカルソートに刷新し、並列トランジションが縦に並ぶ正確な構造を実現する**
- [ ] **`Transition` 型に `prerequisiteTransitionIds` を追加し、`ExperimentRecordTab` の変換処理でも正しく引き継ぐ**

---

## UI 設計

### リストモード（変更なし）
```
[ フィルタバー ... ]   [ フロー図 ▷ ]  ← 右端に切り替えボタン追加
────────────────────────────────────────
  既存テーブル（変更なし）
```

### フロー図モード
```
[ フィルタバー非表示 ]  [ ◁ リスト ]  ← 右端に切り替えボタン
────────────────────────────────────────
タブ: [溶解工程 / #1] [溶解工程 / #2] [加工工程 / #1] ...
──────────────────────────────────────
  TransitionFlowDiagram
  （選択タブ = methodId × taskNo に対応するトランジション群）
```

- タブラベル: `{methodName} / #{taskNo}`（例: `溶解工程 / #2`）
- タブキー: `${methodId}__${taskNo}`（一意）
- 初期選択: `rows` 先頭の組み合わせを自動選択
- `rows` 変化時にタブキーをリセット（無効キー防止）

---

## 実装ステップ

---

### Phase 1: 型定義の修正

- [x] **Step 1-1**: `frontend/src/types/experimentWorker.ts` の `Transition` 型に追加
  ```typescript
  prerequisiteTransitionIds?: string[]; // 前提トランジションID配列（依存関係）
  ```

---

### Phase 2: `ExperimentRecordTab.tsx` の修正

- [x] **Step 2-1**: `transitionsWithProgress` の `useMemo` 変換処理に `prerequisiteTransitionIds` を追加
  - `fetchTransitionStatus` のレスポンス（`TransitionStatusItem`）には `prerequisiteTransitionIds` が含まれているが、現在の変換時に落としている
  - `progressData` に `prerequisiteTransitionIds` を含めて変換する

---

### Phase 3: `TransitionFlowDiagram.tsx` のレイアウト全面改修

現行の「`workOrder` 順の直列配置＋隣接エッジ」を廃止し、
`PetriNetVisualization.tsx` で実装済みの BFS トポロジカルソート方式に置き換える。

- [x] **Step 3-1**: `initialNodes` の生成ロジックをBFSトポロジカルソートに変更
  - `prerequisiteTransitionIds` を使って各トランジションの「レベル（深さ）」を BFS で計算
  - 同一レベル（並列）のトランジションを **縦に** 配置
  - レベルが深くなるにつれて **右に** 配置
  - 実装アルゴリズム概要:
    ```
    1. 全トランジションの inDegree（前提数）を初期化
    2. inDegree=0（前提なし）のトランジションをキューに入れ level=0 とする
    3. BFSループ:
       - キューから取り出したトランジションの後続を探す
         （prerequisiteTransitionIds に自分が含まれるトランジション）
       - 後続のレベルを max(現在のレベル+1, 既存のレベル) で更新
       - inDegree が 0 になったものをキューに追加
    4. transitionsByLevel マップを生成（level → トランジションの配列）
    5. 各レベルの配列を縦方向（Y軸）に配置
       x = level * horizontalSpacing
       y = indexInLevel * verticalSpacing
    ```

- [x] **Step 3-2**: `initialEdges` の生成ロジックを依存関係ベースに変更
  - 隣接トランジション間の直列接続を廃止
  - 各トランジションの `prerequisiteTransitionIds` を走査してエッジを生成
    ```typescript
    for (const t of transitions) {
      for (const prereqId of t.prerequisiteTransitionIds ?? []) {
        edges.push({ source: prereqId, target: t.id, ... });
      }
    }
    ```
  - `prerequisiteTransitionIds` が空の場合は孤立ノードとして表示（エッジなし）

---

### Phase 4: `ProgressOverviewTab.tsx` にフロー図切り替え機能を追加

- [x] **Step 4-1**: インポートを追加
- [x] **Step 4-2**: `ProgressRow → Transition[]` 変換アダプター関数を追加
- [x] **Step 4-3**: `viewMode` ステートを追加（`'list' | 'flow'`）
- [x] **Step 4-4**: `flowTabKey` ステートを追加（`${methodId}__${taskNo}` 形式）
- [x] **Step 4-5**: `flowTabItems` を `useMemo` で生成
- [x] **Step 4-6**: `useEffect` で初期タブ自動選択ロジックを追加
- [x] **Step 4-7**: 切り替えボタンを JSX に追加
- [x] **Step 4-8**: フロー図パネルの JSX を追加

---

### Phase 5: 動作確認

- [ ] **Step 5-1**: TypeScript ビルドエラーなし（`npm run build` または型チェック）
- [ ] **Step 5-2**: 切り替えボタンの表示・動作確認
- [ ] **Step 5-3**: タブの自動生成・切り替え確認
- [ ] **Step 5-4**: フロー図の並列構造確認（並列トランジションが縦に並ぶこと）
- [ ] **Step 5-5**: フロー図ノードの「記録」ボタン → 作業記録タブ遷移確認
- [ ] **Step 5-6**: `ExperimentRecordTab` のフロー図も正しい並列構造で表示されること（Phase 1〜3の影響確認）

---

## 変更ファイル

| # | ファイル | フェーズ | 変更内容 |
|---|---|---|---|
| 1 | `frontend/src/types/experimentWorker.ts` | Phase 1 | `Transition` 型に `prerequisiteTransitionIds?: string[]` を追加 |
| 2 | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | Phase 2 | `transitionsWithProgress` の変換処理に `prerequisiteTransitionIds` を追加 |
| 3 | `frontend/src/components/ExperimentWorker/TransitionFlowDiagram.tsx` | Phase 3 | レイアウトを BFS トポロジカルソートに全面変更・エッジを依存関係ベースに変更 |
| 4 | `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` | Phase 4 | viewMode ステート・切り替えボタン・タブ生成・変換アダプター・TransitionFlowDiagram 呼び出しを追加 |

**バックエンド変更なし。**

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `prerequisiteTransitionIds` が空配列の場合、全ノードが level=0 に集まり縦に並びすぎる | 低 | 孤立ノードはそのまま縦に並べる（既存の挙動と同等）。`workOrder` を補助的な縦順ソートに使うことも検討 |
| `TransitionFlowDiagram` のレイアウト変更が `ExperimentRecordTab` のフロー図表示に影響する | 中 | Phase 2 で `prerequisiteTransitionIds` を正しく連携してから Phase 3 を実施し、両方で動作確認する |
| `rows` 空時にタブが0件になる | 低 | タブ0件時は「データなし」メッセージを表示 |
| タブ数が多くなる | 低 | Ant Design Tabs はデフォルトでスクロール対応 |
| `flowTabKey` が `rows` 更新後に無効になる | 低 | `rows` 変化時に `flowTabKey` をリセットして先頭を再選択 |

---

## テスト計画

### フロー図レイアウト（Phase 3 の確認）
- [ ] 前提なしのトランジションが複数ある場合、縦に並んで表示される
- [ ] A・B の両方が完了後に C が開始できる構造（A→C、B→C）が正しいレイアウトで表示される
- [ ] エッジが `prerequisiteTransitionIds` に基づいて正しく引かれる
- [ ] `prerequisiteTransitionIds` が空の場合は孤立ノードとして表示される

### 進捗確認タブ（Phase 4 の確認）
- [ ] 切り替えボタンが表示され、リスト⇔フロー図の切り替えが動作する
- [ ] フロー図モード時に `{methodName} / #{taskNo}` のタブ一覧が表示される
- [ ] タブを切り替えると対応するトランジションのフロー図が表示される
- [ ] フロー図ノードの「記録」ボタン押下で `onGoToWork` が呼ばれ作業記録タブへ遷移する
- [ ] リストモードのフィルタ操作がフロー図モードに影響しない
- [ ] `rows` が空のとき「データなし」UIが表示される

### 既存機能への影響（Phase 1〜3 の確認）
- [ ] `ExperimentRecordTab` のフロー図が引き続き正しく表示される
- [ ] TypeScript ビルドエラーが発生しない

---

## 承認記録
- **計画書提示日時**: 2026-08-14 10:00
- **承認日時**: 未記入
- **承認者コメント**: 未記入
