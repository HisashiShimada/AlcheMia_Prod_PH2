# タスク計画書: ExperimentPlanDialog リファクタリング

## メタデータ
- **作成日時**: 2026-06-29 16:08
- **タスクID**: ExperimentPlanDialog_リファクタリング
- **優先度**: 中
- **推定工数**: 3時間

## 1. タスク概要

`frontend/src/components/project/ExperimentPlanDialog.tsx`（現在 2,027行）を、コンポーネントの責務ごとに複数ファイルへ分割するリファクタリングを行う。
あわせてプロジェクトの TypeScript 型定義規約（`.clinerules/development/typescript.md`）に違反しているインライン型定義を専用ファイルへ移動する。

---

## 2. 現状の問題

### 問題1: ファイルが肥大化（2,027行）

単一ファイルに5つのコンポーネント・6つのヘルパー関数・複数の定数が混在しており、保守性・可読性が低下している。

### 問題2: TypeScript 型定義規約違反

以下の型定義がコンポーネントファイル内にインラインで定義されており、規約違反となっている。

| 型定義名 | 現在の位置（行番号） |
|---------|-------------------|
| `TransitionRow` | 158-163行 |
| `TransitionOrderItem` | 169-181行 |
| `InheritableField` | 121行 |
| `CustomPropType` | 354-357行 |
| `CustomPropValue` | 360-366行 |
| `RefSectionProps` | 371-379行 |
| `FieldValueInputProps` | 469-483行 |
| `TemplateInputPanelProps` | 656-666行 |
| `SortableTransitionRowProps` | 1070-1084行 |

---

## 3. 目的と期待される成果

### 目的
- ファイルを適切なサイズに分割し、保守性・可読性を向上させる
- TypeScript 型定義規約に準拠させる
- サブコンポーネントの再利用性を高める

### 期待される成果
- [ ] 各ファイルが 600 行以下に収まる
- [ ] TypeScript 型定義が専用ファイルに集約される
- [ ] 規約違反がゼロになる
- [ ] リファクタリング前後でコンポーネントの動作が変わらない

---

## 4. 実装ステップ

### Phase 1: 型定義の分離

- [ ] `frontend/src/types/experimentPlanDialog.ts` を新規作成
- [ ] 以下の型定義を移動する
  - `InheritableField`
  - `TransitionRow`
  - `TransitionOrderItem`
  - `CustomPropType`
  - `CustomPropValue`
  - `RefSectionProps`
  - `FieldValueInputProps`
  - `TemplateInputPanelProps`
  - `SortableTransitionRowProps`
- [ ] `ExperimentPlanDialog.tsx` の import 文を更新する

### Phase 2: ヘルパー関数・定数の分離

- [ ] `frontend/src/utils/experimentPlanHelpers.ts` を新規作成し、以下を移動する
  - `createInitialTabData()`
  - `buildDefaultTemplateValues()`
  - `calculateSteps()`
  - `canMoveToOrder()`
  - `collectTransitionSubtree()`
  - `moveTransitionWithSubtree()`
- [ ] `frontend/src/constants/experimentPlanConstants.ts` を新規作成し、以下を移動する
  - `TAB_KEY_ALL`
  - `CUSTOM_PROP_TYPE_OPTIONS`
- [ ] 各ファイルから正しく import する

### Phase 3: サブコンポーネントの分離

- [ ] `frontend/src/components/project/ExperimentPlanDialog/` フォルダを作成
- [ ] `RefSection.tsx` を分離
  - 元ファイル: 370-462行
  - 依存: `RefSectionProps`（型定義ファイルから import）
- [ ] `FieldValueInput.tsx` を分離
  - 元ファイル: 465-644行
  - 依存: `FieldValueInputProps`（型定義ファイルから import）
  - 依存: `xsiTypeValidator`
- [ ] `SortableTransitionRow.tsx` を分離
  - 元ファイル: 1066-1211行
  - 依存: `SortableTransitionRowProps`、`TransitionOrderItem`（型定義ファイルから import）
  - 依存: `@dnd-kit/sortable`, `@dnd-kit/utilities`、`canMoveToOrder`（ヘルパーから import）
- [ ] `TemplateInputPanel.tsx` を分離
  - 元ファイル: 646-1064行
  - 依存: `TemplateInputPanelProps`、`CustomPropValue`、`CustomPropType`（型定義ファイルから import）
  - 依存: `FieldValueInput`（同フォルダから import）
  - 依存: `CUSTOM_PROP_TYPE_OPTIONS`（定数ファイルから import）
  - 依存: `UncertaintyCriteriaSelectorModal`

### Phase 4: メインファイルの整理

- [ ] `ExperimentPlanDialog.tsx` から移動済みのコード（型定義・ヘルパー関数・定数・サブコンポーネント）を削除する
- [ ] import 文を整理する
- [ ] メインダイアログ本体のみを残す（目標: 600行以内）

### Phase 5: 動作確認

- [ ] TypeScript コンパイルエラーがないことを確認する
- [ ] 画面上でダイアログが正常に動作することを確認する

---

## 5. 影響範囲

### 新規作成するファイル

| ファイルパス | 内容 |
|------------|------|
| `frontend/src/types/experimentPlanDialog.ts` | ダイアログ関連の型定義 |
| `frontend/src/utils/experimentPlanHelpers.ts` | トランジション順序計算などのヘルパー関数 |
| `frontend/src/constants/experimentPlanConstants.ts` | タブキー定数・選択肢定数 |
| `frontend/src/components/project/ExperimentPlanDialog/RefSection.tsx` | Ref追加エリアコンポーネント |
| `frontend/src/components/project/ExperimentPlanDialog/FieldValueInput.tsx` | xsi:type対応入力コンポーネント |
| `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx` | テンプレート入力パネル |
| `frontend/src/components/project/ExperimentPlanDialog/SortableTransitionRow.tsx` | D&D可能なトランジション行 |

### 変更するファイル

| ファイルパス | 変更内容 |
|------------|---------|
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | 移動済みコードの削除・import文の整理 |

### 削除するファイル
なし

### 影響を受ける機能
- 実験計画詳細指示ダイアログの表示・操作（動作は変わらない）

---

## 6. リファクタリング後の想定ファイル規模

| ファイル | 改善後（目安）|
|---------|-------------|
| `ExperimentPlanDialog.tsx` | 約 600 行 |
| `RefSection.tsx` | 約 100 行 |
| `FieldValueInput.tsx` | 約 180 行 |
| `TemplateInputPanel.tsx` | 約 420 行 |
| `SortableTransitionRow.tsx` | 約 150 行 |
| `experimentPlanDialog.ts`（型定義） | 約 100 行 |
| `experimentPlanHelpers.ts`（ヘルパー） | 約 200 行 |
| `experimentPlanConstants.ts`（定数） | 約 30 行 |

---

## 7. テスト計画

### コンパイル確認
- [ ] `npx tsc --noEmit` でエラーがないことを確認

### 手動テスト
- [ ] ダイアログが正常に開く
- [ ] トランジション選択ができる
- [ ] CreatorRef / InstrumentRef / OwnerRef の追加・削除ができる
- [ ] 注意事項の追加・削除・編集ができる
- [ ] テンプレート入力パネルが正常に表示される
- [ ] 実行順序のドラッグ&ドロップが機能する
- [ ] インポート・エクスポートが機能する
- [ ] 保存ボタンが機能する

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 循環 import の発生 | 高 | 低 | 型定義 → ヘルパー → コンポーネントの依存方向を一方向に保つ |
| `useToken` の参照問題（`SortableTransitionRowProps` の token 型）| 中 | 中 | token 型を `ReturnType<typeof useToken>['token']` として別途定義 |
| ファイル分割後に `ESLint` / `prettier` のエラーが出る | 低 | 低 | 各ファイル保存時に自動整形を確認 |

---

## 9. 承認記録

- **計画書提示日時**: 2026-06-29 16:08
- **承認日時**: （承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

---

## 10. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した変更があれば記入）

### 最終的な成果物
- [ ] 型定義ファイル作成
- [ ] ヘルパー関数ファイル作成
- [ ] 定数ファイル作成
- [ ] サブコンポーネント4ファイル作成
- [ ] メインファイル整理完了
