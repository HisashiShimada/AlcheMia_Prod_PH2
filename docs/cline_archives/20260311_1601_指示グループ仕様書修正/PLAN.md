# タスク計画書: InstructionGroup UI設計書修正

## メタデータ
- **作成日時**: 2026-03-11 16:01
- **タスクID**: 指示グループ仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/design/ui/experiment_worker/ui_instruction_group.md` の仕様書をソースコード（`frontend/src/components/ExperimentWorker/InstructionGroup.tsx`）の実態に合わせて修正する。

調査の結果、以下の6件の差分が確認された。

## 目的と期待される成果

- [ ] 仕様書がソースコードの実装を正確に反映した状態にする
- [ ] 開発者がソースコードを見なくても仕様書だけで実装内容を把握できるようにする

## 差分一覧（修正対象）

| No. | 項目 | 重要度 |
|-----|------|--------|
| 1 | Props定義に `onConfirmInstructions` と `confirmLoading` を追加 | 🔴 高 |
| 2 | 確認完了ボタンの動作をモック→実装済みに変更 | 🔴 高 |
| 3 | 確認完了ボタンの `disabled` 条件を追記 | 🔴 高 |
| 4 | Space の `direction` → `orientation` に修正 | 🟡 中 |
| 5 | メソッド単位指示の扱いを独立ケースとして修正 | 🟡 中 |
| 6 | `getIcon` ヘルパー関数の追記 | 🟢 低 |

---

## 実装ステップ

### Step 1: Props定義の修正（Section 3）
- [ ] `onConfirmInstructions?: (instructions: Instruction[]) => void` を追加
- [ ] `confirmLoading?: boolean` を追加
- [ ] Props説明文を更新

### Step 2: title種類テーブルの修正（Section 3.1）
- [ ] メソッド単位指示の後方互換性に関する記述を修正
  - 修正前：「メソッド単位指示 → タスク指示」
  - 修正後：メソッド単位指示は独立したケースとして処理される旨を記載

### Step 3: 確認完了イベントの修正（Section 6.2）
- [ ] `handleConfirmation` 関数（モック）の記述を削除
- [ ] `onConfirmInstructions` コールバック呼び出し実装に更新
- [ ] `confirmLoading` によるローディング状態制御を追記
- [ ] 全指示確認済み（`isAcknowledged`）でのボタン `disabled` 動作を追記

### Step 4: JSX例のプロパティ名修正（Section 7）
- [ ] Section 7.1（プロジェクト指示）の `<Space direction="vertical">` → `<Space orientation="vertical">` に修正
- [ ] Section 7.2（タスク指示）の `<Space direction="vertical">` → `<Space orientation="vertical">` に修正
- [ ] Section 7.3（トランジション単位指示）の記述も同様に確認・修正

### Step 5: メソッド単位指示セクションの追加（Section 7）
- [ ] 「メソッド単位指示（Section 7.4）」を新規追加
  - `title === 'メソッド単位指示'` の場合の動作説明
  - `groupByMethod()` でグループ化する旨を記載
  - 構造はタスク指示と同様（ToolOutlinedアイコン）

### Step 6: 備考（Section 13.1）の修正
- [ ] 「確認完了ボタンの動作は現在モック実装（alert表示）」の記述を削除
- [ ] 実装済みの動作説明（コールバック・disabled制御）に更新
- [ ] `getIcon` ヘルパー関数（未使用）の記載を追加

### Step 7: 変更履歴の更新（Section 14）
- [ ] バージョン 1.1.0 として変更履歴に追記

---

## 変更ファイル
1. `docs/design/ui/experiment_worker/ui_instruction_group.md` - 仕様書修正

---

## リスク
| リスク | 対策 |
|--------|------|
| 修正漏れ | 差分一覧のチェックリストで全項目を確認する |
| 仕様書とソースコードの乖離が残る | 修正後にソースコードと再照合する |

---

## 承認記録
- **計画書提示日時**: 2026-03-11 16:01
- **承認日時**: 
- **承認者コメント**: 
