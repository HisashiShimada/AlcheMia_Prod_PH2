# タスク計画書: ExperimentWorkerMenu 進捗確認画面 本実装

## メタデータ
- **作成日時**: 2026-07-03 11:31
- **タスクID**: progress-overview-impl
- **優先度**: 高
- **推定工数**: 4〜6時間

## タスク概要

ExperimentWorkerMenu の「進捗確認」タブ（`ProgressOverviewTab`）をバックエンド含めて本実装する。
現状は多数の課題（N+1 API呼び出し・データ未連携・ハードコード等）があり、これらを解消して実用的な進捗確認画面を完成させる。

> **2026-07-03 更新**: `docs/tasks/20260703_1300_ProgressOverviewTab手直し/` のタスクで以下が対応済みになった:
> - 修正1（メソッド名・トランジション名表示） → `ProgressRow` 型に `methodName`/`transitionName` 追加・列定義変更
> - 修正2（Material/Condition/Result 進捗バー） → `fetchTransitionStatus` マッピング修正でフロントのみ解決済み
> - 修正3（issueCount バッジ） → Issue一覧並列取得ロジックをフロントに追加して解決済み
>
> これらはバックエンド変更なしでフロントエンドのみで解決された。
> 本計画書の **Phase 1（バックエンド getWorkDetails 拡張）は Material/Condition/Result・issueCount の観点では不要になった**。
> ただし N+1 問題・prerequisiteTransitionIds・NG理由・カスタムフック分離は未対応のため残存する。

---

## 現状の問題整理

### 問題1: N+1 API呼び出し（最重要）

`ExperimentWorkerMenu.tsx` 内の進捗データ取得処理が以下の非効率なフローになっている：

```
getWorkerTasks(projectId)         ← 1回
  └─ for each method × task:
       fetchTransitionStatus(...)  ← メソッド数 × タスク数 分だけAPIコール
```

タスクが多いプロジェクトでは大量のAPIコールが発生しパフォーマンスが著しく低下する。

**既存の一括取得API `GET /api/v1/progress/projects/:id/work-details` が存在しているが未使用。**

### ~~問題2: ProgressRow のデータが未設定~~（✅ 解決済み: 2026-07-03）

~~`ProgressOverviewTab` の以下の列が常に「—」表示になっている~~
- ~~`Material`, `Condition`, `Result` 進捗バー（`materialRecorded/Total` 等が未設定）~~
- ~~「問題」バッジ（`issueCount` が未設定）~~

→ `fetchTransitionStatus` マッピング修正（フロントのみ）・Issue一覧並列取得ロジック追加で解決済み。

### 問題3: `prerequisiteTransitionIds` が空固定

トランジション間の順序ロック機能（前提トランジション完了後のみ開始可能）が機能しない。
MAIML の PetriNet 構造から順序情報を取得していない。

### 問題4: NG理由がハードコード

「NG理由」ボタンのモーダル内のテキストが以下のようにハードコードされている：
```tsx
タスク＃1の定性評価結果が正しくありません。
```
バックエンドAPI・DBとの連携が未実装。

### 問題5: ロジックが `ExperimentWorkerMenu.tsx` に集中

進捗データ取得処理（API呼び出し・変換処理 約60行）が親コンポーネントにベタ書きされており保守性が低い。

### 問題6: `ProgressCheckTab.tsx` が未使用

かつての「タスク単位（開始/強制終了ボタン付き）」UI が残骸として存在している。

---

## 目的と期待される成果

- [ ] N+1呼び出しを解消し、1回のAPIで進捗データを一括取得する
- [x] Material / Condition / Result 進捗バーを実データで表示する（✅ 2026-07-03 解決済み）
- [x] 問題件数バッジを実データで表示する（✅ 2026-07-03 解決済み）
- [x] メソッド名・トランジション名を表示する（✅ 2026-07-03 解決済み）
- [ ] トランジション順序ロック（`prerequisiteTransitionIds`）を正しくセットする
- [ ] NG理由をAPI/DBから取得して表示する（または仕様確認後に方針決定）
- [ ] データ取得ロジックを専用カスタムフックに分離し保守性を向上させる

---

## 実装ステップ

### Phase 1: バックエンド `fetchTransitionStatus` レスポンスへの `prerequisiteTransitionIds` 追加

> ⚠️ **スコープ縮小（2026-07-03）**: Material/Condition/Result・issueCount はフロント修正で解決済み。
> Phase 1 で残っているバックエンド作業は `prerequisiteTransitionIds` の取得のみ。

#### 1-1. `fetchTransitionStatus` APIのレスポンスに追加するフィールド

現在 `fetchTransitionStatus`（`GET .../tasks/:taskNo/transitions`）のレスポンスには
`prerequisiteTransitionIds`（前提トランジションID配列）が含まれていない。

MAIML の PetriNet 構造から各トランジションの入力プレース情報を解析して返す必要がある。

#### 1-2. 変更ファイル（バックエンド）

1. `backend/src/services/progressService.ts` の `getProgressData` メソッド — `parsePetriNetStructure` 戻り値から `prerequisiteTransitionIds` を抽出してレスポンスに含める
2. `backend/src/types/progress.ts` または `api.ts` — `TransitionStatus` 型に `prerequisiteTransitionIds?: string[]` 追加

### Phase 2: フロントエンド データ取得リファクタリング

#### 2-1. カスタムフック作成

`frontend/src/hooks/useProgressOverview.ts` を新規作成し、以下を担当：
- `getWorkDetails` API を呼び出し
- `WorkDetailItem[]` → `ProgressRow[]` への変換
- `loading` / `error` state 管理

```typescript
// 大まかなインターフェース
export function useProgressOverview(projectId: string | null) {
  return { rows: ProgressRow[]; loading: boolean; error: string | null };
}
```

#### 2-2. `ExperimentWorkerMenu.tsx` の修正

- 現在の約60行の進捗データ取得処理を削除し、`useProgressOverview` フックに置き換える
- `progressRows` / `progressLoading` の state 管理をフック内に移動

#### 2-3. `ProgressOverviewTab.tsx` の型修正（必要に応じて）

- 追加フィールドに対応するよう `ProgressRow` 型を更新（`progressPercentage` 等）

### Phase 3: NG理由の実装方針確定・実装

#### 3-1. 調査内容

- `project_task_detail` テーブルに `ng_reason` 等のフィールドがあるか確認
- または `issue` テーブルから「NG判定に関するissue」を取得する方式か確認
- `docs/design/` 配下の設計書を参照

#### 3-2. 実装（方針確定後）

- バックエンド: 対応するAPI / レスポンスフィールドを追加
- フロントエンド: `ExperimentWorkerMenu.tsx` の NG理由モーダル内をAPIデータで表示

### Phase 4: 保守性向上・クリーンアップ

- [ ] 不要な `ProgressCheckTab.tsx` の扱いを決定（削除 or コメントアウト）
- [ ] `ExperimentWorkerMenu.tsx` の `console.log/info` を整理
- [ ] `ProgressOverviewTab.tsx` の日本語ハードコード文字列を `t()` 国際化対応（既存パターンに合わせる）

---

## 変更ファイル一覧

### 新規作成

| ファイル | 目的 |
|---------|------|
| `frontend/src/hooks/useProgressOverview.ts` | 進捗データ取得専用カスタムフック |

### 修正（解決済み）

| ファイル | 変更内容 | 状態 |
|---------|---------|------|
| `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` | `ProgressRow` 型に `methodName`/`transitionName` 追加・列定義修正 | ✅ 完了 |
| `frontend/src/services/projectApiService.ts` | `TransitionStatusItem` 型に MCR フィールド追加・マッピング修正 | ✅ 完了 |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 名前・MCR進捗・issueCount セット・Issue取得ロジック追加 | ✅ 完了 |

### 修正（未対応）

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/progressService.ts` | `getProgressData` に `prerequisiteTransitionIds` 追加 |
| `backend/src/types/progress.ts` または `api.ts` | `TransitionStatus` 型に `prerequisiteTransitionIds?: string[]` 追加 |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | N+1解消（`getWorkDetails` 1回呼び出しに変更）/ NG理由実装 |

### 削除候補

| ファイル | 理由 |
|---------|------|
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | 未使用（要確認後に削除） |

---

## 技術的詳細

### `getWorkDetails` API レスポンス現状との差分

現状の `TransitionProgressItem` に**存在しない**フィールド（未対応のみ）：
- `prerequisiteTransitionIds` — MAIML PetriNet 解析結果（`parsePetriNetStructure` 戻り値）から取得可能 ← **未対応**

解決済み（フロントのみで対応）：
- ~~`materialRecorded/Total`, `conditionRecorded/Total`, `resultRecorded/Total`~~ → `fetchTransitionStatus` マッピングで解決済み ✅
- ~~`issueCount`~~ → Issue一覧並列取得でフロント側に集計 ✅

### N+1 解消後のAPI呼び出しフロー

```
プロジェクト選択
  ↓
GET /api/v1/progress/projects/:id/work-details  ← 1回のみ
  ↓
WorkDetailItem[] を ProgressRow[] に変換（フロントエンド側）
  ↓
ProgressOverviewTab に渡す
```

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `project_task_detail` に Mat/Cond/Res件数フィールドがない | 中 | 中 | DBスキーマ確認後、Phase1-2 で代替取得方法を検討 |
| `getWorkDetails` の既存利用箇所（`WorkProgressDetailDialog`）への影響 | 中 | 低 | レスポンスはフィールド追加のみ（後方互換性あり） |
| MAIML PetriNet の `prerequisiteTransitionIds` 抽出が複雑 | 中 | 中 | `parsePetriNetStructure` の戻り値を精査してから実装 |
| NG理由の設計仕様が不明 | 高 | 高 | Phase3 を後回しにし、まず空実装（TODO コメント）で対応 |

---

## テスト計画

- [ ] `getWorkDetails` API を手動 curl / Postman で呼び出し、追加フィールドが正しく返ることを確認
- [ ] フロントエンド: 複数タスク・複数トランジションを持つプロジェクトで進捗確認タブの各列が正しく表示されることを確認
- [ ] Material/Condition/Result 進捗バーが 0件・部分入力・全件入力で正しく表示されることを確認
- [ ] 問題件数バッジが 0件・1件以上で正しく表示されることを確認
- [ ] 順序ロックアイコンが `prerequisiteTransitionIds` 設定時に表示されることを確認
- [ ] N+1 解消確認: ブラウザの Network タブで API 呼び出し数を確認

---

## 承認記録

- **計画書提示日時**: 2026-07-03 11:31
- **承認日時**: 
- **承認者コメント**: 

---

## 実施記録

### 実施日時
開始: 
完了: 

### 計画からの変更点

### 発生した問題と解決方法

### 最終的な成果物
