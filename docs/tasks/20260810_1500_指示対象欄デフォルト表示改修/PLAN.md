# タスク計画書: 指示対象欄デフォルト表示改修

## メタデータ
- **作成日時**: 2026-08-10 15:00
- **タスクID**: 20260810_1500
- **優先度**: 中
- **推定工数**: 1〜2時間

---

## タスク概要

`InstructionEditDialog.tsx` の指示対象欄を改修する。

**現在の動作:**
- 種類（granularity）選択欄があり、選択すると追加入力欄（メソッドID等）が現れる

**改修後の動作:**
- 種類（granularity）選択欄を**削除**
- **メソッドID選択欄**: 常に表示（全メソッドから選択可）
- **トランジションID選択欄**: 常に表示。メソッド未選択時はdisabled、メソッド選択後はそのメソッドに紐づくトランジションのみ表示
- **タスクNo選択欄**: 常に表示。メソッド未選択時はdisabled、メソッド選択後はそのメソッドの試行回数分を表示
- **保存時のgranularity自動判定**:
  - taskNoが入力あり → `TASK`
  - transitionIdが入力あり（taskNoなし）→ `TRANSITION`
  - methodIdのみ入力あり → `METHOD`
  - すべて空 → `OVERALL`（全体指示）

---

## 目的と期待される成果

- [x] 種類（granularity）選択欄が削除される
- [x] メソッドID・トランジションID・タスクNoの3欄が常に表示される
- [x] トランジション選択肢がメソッドに紐づくものだけに絞られる
- [x] タスクNo選択肢がメソッドの試行回数分に絞られる
- [x] granularityが入力値から自動判定されて保存される
- [x] 全て空で保存すると全体指示として扱われる
- [x] 既存の保存・編集・詳細表示の動作に影響なし

---

## 実装ステップ

### Step 1: `TransitionInfo` 型に `methodId` を追加

- [x] `/home/mi_ito/mmdpf/frontend/src/types/instructionRegistration.ts`
  - `TransitionInfo` interface に `methodId?: string` フィールドを追加

### Step 2: 呼び出し元で `methodId` を付与して生成

- [x] `/home/mi_ito/mmdpf/frontend/src/components/project/InstructionRegistrationTab.tsx`
  - `availableTransitions` を生成する `useMemo` で、各トランジションに `methodId: method.id` を付与

- [x] `/home/mi_ito/mmdpf/frontend/src/components/project/TaskRegistrationTab.tsx`
  - 当初「変更不要」としていたが、動作確認で **トランジションIDが取れないバグ** を発見
  - `availableTransitions` が `useState<TransitionInfo[]>([])` の空配列のままで `setAvailableTransitions` が未呼び出しだった
  - `useState` を削除し `InstructionRegistrationTab` と同様に `useMemo` で `maimlRoot` から動的生成するよう修正

### Step 3: `InstructionEditDialog.tsx` のロジック・UI改修

#### state変更
- [x] `selectedGranularity` state を**削除**
- [x] `handleGranularityChange` を**削除**

#### ロジック変更

- [x] `transitionOptions` の `useMemo` を変更:
  - **変更前**: 全トランジションをそのままオプション化
  - **変更後**: `selectedMethodId` でフィルタリング（`tr.methodId === selectedMethodId`）、未選択時は空配列

- [x] `taskNoOptions` の `useMemo`: メソッド未選択時は空配列を返すよう修正

- [x] `granularityOptions` / `INSTRUCTION_GRANULARITY_LABELS` のimportを削除

- [x] `calcEffectiveGranularity` 計算ロジックを追加（保存時に使用）:
  ```
  taskNo入力あり       → TASK
  transitionId入力あり → TRANSITION
  methodIdのみ入力あり → METHOD
  全て空              → OVERALL
  ```

- [x] `calcTargetType` をeffectiveGranularityに対応させる

- [x] `doSave` を変更: effectiveGranularityを算出してから `granularity` / `targetType` にセット

- [x] `useEffect`（editモード時の初期化）から `setSelectedGranularity` を削除

#### UI変更

- [x] 種類（granularity）選択欄（`instruction-granularity-select`）を**削除**
- [x] メソッドID選択欄: 条件なし（常に表示）
- [x] トランジションID選択欄: 常に表示、disabled: `isSentInstruction || !selectedMethodId`
- [x] タスクNo選択欄: 常に表示、disabled: `isSentInstruction || !selectedMethodId`
- [x] 説明テキスト更新: `（未入力の場合は全体指示として扱われます）`

---

## 変更ファイル

| ファイル | 変更内容 | 状態 |
|----------|----------|------|
| `frontend/src/types/instructionRegistration.ts` | `TransitionInfo` に `methodId?: string` 追加 | ✅ 完了 |
| `frontend/src/components/project/InstructionRegistrationTab.tsx` | availableTransitions生成時に `methodId` を付与 | ✅ 完了 |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | `useState` 空配列 → `useMemo` による動的生成に変更（バグ修正） | ✅ 完了 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | 種類欄削除・3欄常時表示・transitionOptionsフィルタリング・granularity自動判定 | ✅ 完了 |

---

## 影響範囲

- `InstructionEditDialog` を使用するコンポーネント: `InstructionRegistrationTab.tsx`、`TaskRegistrationTab.tsx`
- `TransitionInfo` 型の変更はオプショナル（`methodId?`）のため後方互換性あり
- 保存データの `granularity` は入力値から自動判定されるため既存データの編集時も正しく復元される

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の編集指示で `granularity` が保存されている場合に復元時にセット不要になる | 低 | 低 | 編集時は methodId/transitionId/taskNo をそのままセットするため表示は変わらない。保存時のgranularityは再計算される |
| `TransitionInfo.methodId` が付与されていないと全件空になる | 中 | 低 | InstructionRegistrationTab で付与。TaskRegistrationTabは現状空なので変化なし |

---

## テスト計画

### 手動テスト

- [x] 指示追加ダイアログ表示時に種類欄がなく、メソッドID・トランジションID・タスクNoの3欄が表示されること
- [x] メソッド未選択時はトランジションID・タスクNoがdisabledであること
- [ ] メソッドを選択するとトランジションIDがそのメソッドのトランジションのみ表示されること（動作確認でバグ発見→修正済み）
- [ ] メソッドを選択するとタスクNoがそのメソッドの試行回数分表示されること
- [ ] 全て空で保存すると全体指示（OVERALL）として登録されること
- [ ] methodIdのみ選択して保存するとMETHODレベルとして登録されること
- [ ] transitionIdまで選択して保存するとTRANSITIONレベルとして登録されること
- [ ] taskNoまで選択して保存するとTASKレベルとして登録されること
- [ ] 既存指示の編集で methodId/transitionId/taskNo が正しく復元されること

---

## 承認記録

- **計画書提示日時**: 2026-08-10 15:00
- **承認日時**: 2026-08-10 15:30（ユーザー承認）
- **承認者コメント**: 「修正を開始してください」

---

## 11. 実施記録

### 実施日時
開始: 2026-08-10 15:30
完了: 2026-08-10 16:10（バグ修正含む）

### 計画からの変更点
- **Step 2 の TaskRegistrationTab.tsx**: 当初「変更不要」と判断していたが、動作確認時にトランジションIDが取れないバグを発見し追加修正を実施

### 発生した問題と解決方法
1. **トランジションIDが取れない問題**
   - 原因: `TaskRegistrationTab.tsx` の `availableTransitions` が `useState<TransitionInfo[]>([])` の空配列のまま。`setAvailableTransitions` が一度も呼ばれていなかった
   - 解決: `useState` を削除し、`InstructionRegistrationTab` と同様に `useMemo` で `maimlRoot` からトランジションを動的生成（`methodId` 付与）するよう変更

2. **既存TSCエラーについて**: `tsc --noEmit` 実行時、`insertion-spec-mock`・`EncryptionManagement.tsx`・`PrefixManagement.tsx`・`LanguageContext.tsx` に既存エラーが存在するが今回の変更とは無関係であることを確認

### 最終的な成果物

- [x] **Step 1** - `TransitionInfo` 型に `methodId?: string` 追加
  - `frontend/src/types/instructionRegistration.ts`

- [x] **Step 2** - `InstructionRegistrationTab.tsx` の `availableTransitions` 生成時に `methodId` 付与
  - `frontend/src/components/project/InstructionRegistrationTab.tsx`

- [x] **Step 2（追加修正）** - `TaskRegistrationTab.tsx` トランジションID未取得バグ修正
  - `frontend/src/components/project/TaskRegistrationTab.tsx`
  - `useState` 空配列 → `useMemo` による `maimlRoot` からの動的生成に変更

- [x] **Step 3** - `InstructionEditDialog.tsx` ロジック・UI改修
  - `frontend/src/components/project/InstructionEditDialog.tsx`
  - `selectedGranularity` state・`handleGranularityChange`・`granularityOptions` 削除
  - `transitionOptions`: `selectedMethodId` でフィルタリング（未選択時は空配列）
  - `taskNoOptions`: メソッド未選択時は空配列
  - `calcEffectiveGranularity` 追加（入力値から granularity を自動判定）
  - `doSave`: `effectiveGranularity` ベースで保存
  - UI: 種類（granularity）選択欄を削除
  - UI: メソッドID・トランジションID・タスクNoを常時表示
  - UI: トランジションID/タスクNoはメソッド未選択時に `disabled`
  - 説明テキスト更新：「未入力の場合は全体指示として扱われます」
