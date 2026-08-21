# タスク計画書: ProgressOverviewTab 表示手直し

## メタデータ
- **作成日時**: 2026-07-03 13:00
- **タスクID**: progress-overview-tab-fix
- **優先度**: 高
- **推定工数**: 1〜2時間

## タスク概要

`ProgressOverviewTab` 画面の以下3点を手直しする。
バックエンドAPIは既に正しいデータを返しているため、**フロントエンドのみ修正**。

---

## 修正点一覧

### 修正1: メソッドID → メソッド名、トランジションID → トランジション名 表示

**現状の問題:**
- `ProgressOverviewTab.tsx` のテーブルが「メソッドID」「トランジションID」列として表示している
- 列見出しも ID 固定で、表示値も `v.slice(-8)` / `v.slice(-16)` で末尾を切ってコード表示している

**原因:**
- `ProgressRow` 型に `methodName` / `transitionName` フィールドが存在しない
- `ExperimentWorkerMenu.tsx` の行生成時に名前を詰めていない

**対応方針:**
- `ProgressRow` 型に `methodName?: string`, `transitionName?: string` を追加
- `ExperimentWorkerMenu.tsx` の行生成で `method.method_name` / `tr.transitionName` をセット
- `ProgressOverviewTab.tsx` のカラム定義を変更:
  - 「メソッドID」→「メソッド名」: `record.methodName || record.methodId`
  - 「トランジションID」→「トランジション名」: `record.transitionName || record.transitionId`

---

### 修正2: Material / Condition / Result 欄が「—」固定問題

**現状の問題:**
- Material / Condition / Result 列が常に「—」表示になっている

**原因:**
- バックエンド API（`GET .../tasks/:taskNo/transitions`）は `material_count` / `material_actual_count` 等を返しているが、フロントの `fetchTransitionStatus` マッピングでこれらを無視している
- `TransitionStatusItem` 型にフィールドが存在しない
- `ExperimentWorkerMenu.tsx` の行生成で `materialRecorded` / `materialTotal` 等を設定していない

**対応方針:**
- `TransitionStatusItem` 型に以下を追加:
  ```typescript
  materialCount?: number;
  materialActualCount?: number;
  conditionCount?: number;
  conditionActualCount?: number;
  resultCount?: number;
  resultActualCount?: number;
  ```
- `fetchTransitionStatus` のマッピングで `t.material_count` 等を詰める
- バックエンドAPIレスポンス型定義（`client.get` の型引数）にも `material_actual_count` 等を追加
- `ExperimentWorkerMenu.tsx` 行生成で以下をセット:
  ```typescript
  materialRecorded: tr.materialActualCount ?? 0,
  materialTotal: tr.materialCount ?? 0,
  conditionRecorded: tr.conditionActualCount ?? 0,
  conditionTotal: tr.conditionCount ?? 0,
  resultRecorded: tr.resultActualCount ?? 0,
  resultTotal: tr.resultCount ?? 0,
  ```

---

### 修正3: 問題欄が常に「—」表示（問題がなくても空は正しいが、問題がある場合に表示されない）

**現状の問題:**
- `issueCount` が常に `undefined` のため `(v ?? 0) > 0` が常に false → 「—」表示
- 実際に問題報告があっても反映されない

**原因:**
- `ExperimentWorkerMenu.tsx` 行生成時に `issueCount` を設定していない

**対応方針:**
- プロジェクト変更時（進捗データ取得と同タイミング）に `getIssues({ projectId })` を1回呼び出し
- 取得した `Issue[]` を `transitionId` でグルーピングして件数マップを作成
- 行生成時に `issueCount: issueCountMap[tr.transitionId] ?? 0` をセット
- 問題なし（0件）は「—」表示、1件以上は赤バッジ（既存UIロジック）

---

## 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` | `ProgressRow`型に`methodName`/`transitionName`追加。テーブル列定義を名前表示＋IDフォールバックに変更 |
| 2 | `frontend/src/services/projectApiService.ts` | `TransitionStatusItem`型にmaterial/condition/result（定義数・実績数）追加。`fetchTransitionStatus`マッピング修正 |
| 3 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 行生成で名前・MCR進捗・issueCountをセット。Issue取得ロジック追加 |

---

## 実装ステップ

- [x] Step 1: `ProgressOverviewTab.tsx` の `ProgressRow` 型に `methodName`/`transitionName` 追加、テーブル列定義を修正
- [x] Step 2: `projectApiService.ts` の `TransitionStatusItem` 型拡張・`fetchTransitionStatus` マッピング修正
- [x] Step 3: `ExperimentWorkerMenu.tsx` の行生成ロジック修正（名前・MCR進捗）
- [x] Step 4: `ExperimentWorkerMenu.tsx` にIssue件数取得・`issueCount` セットを追加

---

## 影響範囲

- `ProgressOverviewTab` を使用する `ExperimentWorkerMenu.tsx` のみ（他コンポーネントへの影響なし）
- バックエンドの変更は一切なし

---

## リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| Issue取得APIが失敗した場合 | issueCount が設定されない | try/catch で握りつぶし、0のまま継続 |
| method_name が空文字列の場合 | フォールバックでIDが表示される | `|| record.methodId` フォールバックで対応済み |

---

## 承認記録

- **計画書提示日時**: 2026-07-03 13:00
- **承認日時**: 2026-07-03 13:03
- **承認者コメント**: 承認。修正1はバッジの見切れも改善される認識で正しい。

## 実施記録

- **完了日時**: 2026-07-03 13:10
- **変更ファイル**:
  1. `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` - ProgressRow型にmethodName/transitionName追加。テーブル列を名前表示＋IDフォールバックに変更
  2. `frontend/src/services/projectApiService.ts` - TransitionStatusItem型にmaterial/condition/result（定義数・実績数）フィールド追加。fetchTransitionStatusマッピング修正
  3. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - 行生成で名前・MCR進捗・issueCountをセット。Issue一覧並列取得ロジック追加
