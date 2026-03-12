# タスク計画書: api_progress_monitoring 進捗データ取得API仕様書修正

## メタデータ
- **作成日時**: 2026-03-12 17:10
- **タスクID**: api_progress_monitoring_fix_transitions_api
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`docs/design/api/api_progress_monitoring.md` の「### 3. 進捗データ取得API」（`GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions`）の仕様書を、実際のソースコード実装に合わせて修正する。

対象は `API一覧_実験作業者画面.md` の「4. 進捗データ関連 API」に記載された **API #10**（仕様書内では API #2 / 本文 `### 3.`）。

---

## 調査結果

### 調査対象ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/controllers/progressController.ts` | `getProgressData()` 関数 |
| `backend/src/services/progressService.ts` | `ProgressService.getProgressData()` |
| `backend/src/repositories/transitionDataRepository.ts` | `getLatestRecordByTransition()` |
| `backend/src/routes/progressRoutes.ts` | ルート定義・ミドルウェアチェーン |

### 一致している箇所（変更不要）

| 項目 | 仕様書の記載 | 実装の実態 | 判定 |
|------|------------|-----------|------|
| エンドポイント | `GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` | 同一 | ✅ |
| 権限チェック | `checkPermission('050000', 0)` | 同一 | ✅ |
| プロジェクト解決 SQL | `projects/findByName.sql` | 同一 | ✅ |
| 実績数取得 SQL | `template_data/countActualByPlaceIds.sql` | 同一 | ✅ |
| 最新ステータス取得 | `transitionDataRepository.getLatestRecordByTransition()` → `transition_data/getLatestRecord.sql` | 同一 | ✅ |
| トランジション名 | `transition.data?.label \|\| transition.id` | 同一 | ✅ |
| コントローラー参照 | `progressController.ts - getProgressData()` | 同一 | ✅ |
| サービス参照 | `progressService.ts - ProgressService.getProgressData()` | 同一 | ✅ |
| `overall_progress.in_progress` の範囲 | `status = 1〜4, 6` | PREPARING(1)/READY(2)/IN_PROGRESS(3)/PAUSED(4)/ERROR(6) | ✅ |

### 差分・修正が必要な箇所

#### 差分1: `overall_progress.in_progress` フィールド説明が不正確

- **現在の仕様書**: 「作業中数（status = 1〜4, 6）」とだけ記載
- **実装（progressService.ts `calculateOverallProgress()`）**:
  ```typescript
  const inProgress = transitions.filter(t => [
    TransitionStatusEnum.PREPARING,    // 1
    TransitionStatusEnum.READY,        // 2
    TransitionStatusEnum.IN_PROGRESS,  // 3
    TransitionStatusEnum.PAUSED,       // 4
    TransitionStatusEnum.ERROR         // 6
  ].includes(t.status as TransitionStatusNumber)).length;
  ```
- **修正内容**: フィールド詳細表に数値の内訳（各ステータス名と番号）を追記

#### 差分2: 進捗率正規化ロジック（`normalizeProgress`）が仕様書に記載なし

- **実装（progressService.ts `normalizeProgress()`）**:
  ```typescript
  private normalizeProgress(status: TransitionStatusNumber, progressRate: number): number {
    if (status === TransitionStatusEnum.COMPLETED) return 100;   // 5 → 強制100
    if (status === TransitionStatusEnum.INITIAL)   return 0;     // 0 → 強制0
    return Math.max(0, Math.min(100, progressRate));              // 1〜4,6 → 0-100
  }
  ```
- **修正内容**: 「実装要件」セクションの ProgressService 処理フロー内に `normalizeProgress()` の挙動を明記

#### 差分3: `transitions[].progress` フィールド説明が不正確

- **現在の仕様書**: 「進捗率（0〜100の整数）」
- **実装**: `normalizeProgress()` を経由するため、COMPLETED(5)は常に100、INITIAL(0)は常に0。また型は `number`（整数とは限らない）
- **修正内容**: フィールド詳細表の説明を「進捗率（0〜100）。status=5(COMPLETED)時は自動的に100、status=0(INITIAL)時は0に補正される」に修正

---

## 目的と期待される成果

- [ ] `overall_progress.in_progress` フィールドの説明に各ステータス番号と名称を明記
- [ ] `transitions[].progress` フィールドの説明に正規化ロジックを反映
- [ ] 「実装要件 > ProgressService 処理フロー」に `normalizeProgress()` の挙動を追記

## 実装ステップ

### Step 1: `transitions[].progress` フィールド説明の修正
- 修正箇所: 「transitions[] フィールド詳細」テーブルの `progress` 行
- 変更内容: 「進捗率（0〜100の整数）」→「進捗率（0〜100）。status=5(COMPLETED)時は100、status=0(INITIAL)時は0に自動補正」

### Step 2: `overall_progress.in_progress` フィールド説明の修正
- 修正箇所: 「overall_progress フィールド詳細」テーブルの `in_progress` 行
- 変更内容: 「作業中数（status = 1〜4, 6）」→「作業中数（PREPARING(1) / READY(2) / IN_PROGRESS(3) / PAUSED(4) / ERROR(6)）」

### Step 3: ProgressService 処理フローに正規化ロジックを追記
- 修正箇所: 「実装要件 > ProgressService 処理フロー」の Step 4 の説明
- 変更内容: `normalizeProgress()` の動作を箇条書きで追記

## 変更ファイル

1. `docs/design/api/api_progress_monitoring.md` - 上記 Step 1〜3 の修正

## リスク

| リスク | 対策 |
|--------|------|
| 修正箇所が多くなりすぎて SEARCH マッチに失敗する | Step ごとに細かく replace_in_file を分割して実行 |

## テスト計画

- [ ] 修正後の Markdown が正常にレンダリングされることを目視確認

## 承認記録

- **計画書提示日時**: 2026-03-12 17:10
- **承認日時**: 2026-03-12 17:10
- **承認者コメント**: 調査結果も含めてタスク計画書を作成し修正作業を細かく分けて実行するよう指示あり
