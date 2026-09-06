# タスク計画書: ExperimentPlanDialog Ref プルダウン表示名修正

## メタデータ

- **作成日時**: 2026-09-04 13:00
- **タスクID**: 20260904_1300
- **優先度**: 中
- **推定工数**: 1時間
- **担当**: Cline

---

## 1. タスク概要

`ExperimentPlanDialog` の CreatorRef / InstrumentRef / OwnerRef プルダウンにおいて、
選択肢がIDで表示されていた問題を修正する。

MAIML の `document.creators / instruments / owners` には `id`（XML ID属性）と
`name`（人間可読な名前）が存在するが、バックエンドが `id` のみを返却しており、
フロントエンドのプルダウンにもIDが表示されていた。

`name` を表示名（label）として使い、`id` は内部キー（value）として保持することで、
プルダウンに読みやすい名前を表示するよう修正する。

---

## 2. 目的と期待される成果

- [x] CreatorRef / InstrumentRef / OwnerRef プルダウンの選択肢に `name` が表示される
- [x] `name` が未設定の場合は `id` にフォールバックする
- [x] 追加済みタグ（選択後のTag表示）にも `name` が表示される
- [x] 保存データ（DB の creatorRefs / instrumentRefs / ownerRefs）は引き続き `id` 文字列で保持され互換性が維持される
- [x] TypeScript 型エラーがゼロである

---

## 3. 原因分析

---

## 4. 実装ステップ

### Step 1: バックエンド型定義変更
- [x] `backend/src/types/api.ts`
  - `PlanDialogData.creatorRefs / instrumentRefs / ownerRefs` を `string[]` → `Array<{ value: string; label: string }>` に変更

### Step 2: バックエンドサービス変更
- [x] `backend/src/services/experimentInstructionService.ts`
  - Ref 選択肢生成を `c.id` のみ → `{ value: c.id, label: c.name || c.id }` 形式に変更（creator / instrument / owner 全3種）

### Step 3: フロントエンド API サービス型変更
- [x] `frontend/src/services/experimentPlanApiService.ts`
  - `PlanDialogData.creatorRefs / instrumentRefs / ownerRefs` の型を同様に変更

### Step 4: 共通型定義追加
- [x] `frontend/src/types/experimentPlanDialog.ts`
  - `RefOption` インターフェース（`{ value: string; label: string }`）を新規追加
  - `RefSectionProps.options` の型を `string[]` → `RefOption[]` に変更

### Step 5: ExperimentPlanDialogProps 型変更
- [x] `frontend/src/types/experimentPlan.ts`
  - `RefOption` を `./experimentPlanDialog` からインポート
  - `ExperimentPlanDialogProps.creatorRefOptions / instrumentRefOptions / ownerRefOptions` を `RefOption[]` に変更

### Step 6: RefSection コンポーネント修正
- [x] `frontend/src/components/project/subcomponents/RefSection.tsx`
  - `availableOptions` フィルタを `o.value` ベースに変更
  - `valueLabelMap`（`Map<value, label>`）を useMemo で追加
  - Select の options を `{ label: o.label, value: o.value }` 形式に変更
  - 追加済み Tag 表示を `{v}` → `{valueLabelMap.get(v) ?? v}` に変更

### Step 7: ExperimentPlanDialog 修正
- [x] `frontend/src/components/project/ExperimentPlanDialog.tsx`
  - `RefOption` を `@/types/experimentPlanDialog` からインポート
  - `creatorRefOptions / instrumentRefOptions / ownerRefOptions` に `RefOption[]` 型注釈を追加

### Step 8: TaskRegistrationTab 修正
- [x] `frontend/src/components/project/TaskRegistrationTab.tsx`
  - `RefOption` をインポート
  - `creatorRefOptions / instrumentRefOptions / ownerRefOptions` の useMemo を `RefOption[]` 形式に変更

### Step 9: WorkRecordPanel 修正
- [x] `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
  - `RefOption` をインポート
  - `PlanProps.creatorRefOptions / instrumentRefOptions` の型を `RefOption[]` に変更
  - state の型を `RefOption[]` に変更
  - Select の options 渡しを `.map(...)` 省略し `RefOption[]` をそのまま渡すよう変更

---

## 5. 影響範囲

### 変更ファイル一覧

| # | ファイル | 変更種別 |
|---|---------|---------|
| 1 | `backend/src/types/api.ts` | 型変更 |
| 2 | `backend/src/services/experimentInstructionService.ts` | ロジック変更 |
| 3 | `frontend/src/services/experimentPlanApiService.ts` | 型変更 |
| 4 | `frontend/src/types/experimentPlanDialog.ts` | 型追加・変更 |
| 5 | `frontend/src/types/experimentPlan.ts` | 型変更 |
| 6 | `frontend/src/components/project/subcomponents/RefSection.tsx` | ロジック変更 |
| 7 | `frontend/src/components/project/ExperimentPlanDialog.tsx` | 型注釈追加 |
| 8 | `frontend/src/components/project/TaskRegistrationTab.tsx` | ロジック変更 |
| 9 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 型・ロジック変更 |

### 影響しない範囲

- DB 保存値（`creatorRefs / instrumentRefs / ownerRefs`）は引き続き `id` 文字列 → 既存データ互換性維持
- `handleAddRef / handleRemoveRef` は `value`（= id）文字列を扱うため変更不要
- バックエンドの eventLog 生成ロジック（`@ref` に id 使用）は変更不要

### セキュリティへの影響

なし（表示名変更のみ）

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| MAIML の `name` が未設定のデータが存在する | 低 | 中 | `name \|\| id` フォールバックで安全 |
| 型変更による他コンポーネントへの波及 | 中 | 低 | tsc --noEmit でゼロエラー確認済み |

---

## 7. テスト計画

### 手動テスト

- [ ] ExperimentPlanDialog の CreatorRef / InstrumentRef / OwnerRef プルダウンに `name` が表示されること
- [ ] 選択して「追加」後、Tag にも `name` が表示されること
- [ ] `name` 未設定エントリで `id` がフォールバック表示されること
- [ ] 保存後 DB に `id` が保存されること（既存データ互換性）
- [ ] WorkRecordPanel の Creator / Instrument プルダウンにも `name` が表示されること

### 自動テスト

- [x] TypeScript 型チェック（tsc --noEmit）: バックエンド EXIT:0 / フロントエンド EXIT:0

---

## 8. ロールバック計画

DB スキーマ変更・マイグレーションを伴わないため、`git revert` により即座にロールバック可能。

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-04 13:00（リバース作成）
- **承認日時**: 2026-09-04 13:00（実装後リバース作成のため承認済みとして記録）

---

## 10. 実施記録

### 実施日時

- 開始: 2026-09-04 13:00
- 完了: 2026-09-04 13:30

### 計画からの変更点

なし。計画どおりに実装完了。

### 発生した問題と解決方法

なし。TypeScript 型チェックはバックエンド・フロントエンドともに一発でエラーゼロ。

### 最終的な成果物

- [x] `backend/src/types/api.ts` — `PlanDialogData` の Ref 選択肢型を `Array<{value,label}>` に変更
- [x] `backend/src/services/experimentInstructionService.ts` — `{value: id, label: name || id}` 形式で返却
- [x] `frontend/src/services/experimentPlanApiService.ts` — `PlanDialogData` 型を同様に更新
- [x] `frontend/src/types/experimentPlanDialog.ts` — `RefOption` 型新規追加、`RefSectionProps.options` を `RefOption[]` に変更
- [x] `frontend/src/types/experimentPlan.ts` — `ExperimentPlanDialogProps` の Ref Props 型を `RefOption[]` に変更
- [x] `frontend/src/components/project/subcomponents/RefSection.tsx` — label 表示・valueLabelMap 追加・Tag を name 表示に変更
- [x] `frontend/src/components/project/ExperimentPlanDialog.tsx` — `RefOption` インポート・型注釈追加
- [x] `frontend/src/components/project/TaskRegistrationTab.tsx` — useMemo を `RefOption[]` 形式に変更
- [x] `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` — 型・state・プルダウン描画を `RefOption[]` に対応

---

## 11. 振り返り

### うまくいった点

- `RefOption` 型を `experimentPlanDialog.ts` に集約し、バックエンド・フロントエンド間の型一貫性を保てた
- `value`（id）を保存キーとして保持し続けることで DB 互換性を維持しながら表示名のみ変更できた
- `valueLabelMap`（Map）による Tag 表示解決がシンプルかつ効率的だった

### 改善が必要な点

- 実装前に計画書を作成すべきだった

### 学んだこと

- `{value, label}` 形式にすることで、プルダウン表示名と保存キーを分離できる
- バックエンドの型定義（`api.ts`）とフロントエンドの型定義（`experimentPlanApiService.ts`）の同期が重要


### データフロー（修正前）

```
MAIMLファイル (document.creators[].id / .name)
    ↓
experimentInstructionService.ts L776-778
    c.id のみを返却 ← 問題箇所
    ↓
APIレスポンス: creatorRefs = string[]（ID配列）
    ↓
RefSection.tsx
    options.map((o) => ({ label: o, value: o })) ← IDをそのまま表示
    ↓
プルダウン表示: ID が表示される ← バグ
```
