# タスク計画書: ExperimentPlanDialog修正

## メタデータ
- **作成日時**: 2026-06-30 08:45
- **タスクID**: ExperimentPlanDialog修正
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

ExperimentPlanDialogに以下2点の修正を加える。

1. **カスタムプロパティ追加UIをDataRecordDialog準拠に変更**
   - `TemplateInputPanel.tsx` のカスタムプロパティ追加エリアを DataRecordDialog のUI実装と同様の作りに変更する
2. **スクロールバーの二重構造を解消**
   - テンプレート入力タブで外側の `overflowY: auto` ラッパーと内側のスクロールが二重になっているため、テンプレート一覧（左側）にスクロールを追加し、外側のスクロールを削除する

---

## 目的と期待される成果

### 目的
- カスタムプロパティのUIを DataRecordDialog と統一し、操作感の一貫性を確保する
- スクロールバーの二重構造を解消し、UXを改善する

### 期待される成果
- [ ] カスタムプロパティ追加時にコンテナタイプ（property/content/insertion）を選択できる
- [ ] Key 重複チェック機能が動作する（テンプレート固定プロパティのKeyとの重複も検出）
- [ ] content コンテナで複数行入力（行追加機能）が使えるようになる
- [ ] insertion コンテナでファイルアップロードができる
- [ ] テンプレート一覧（左側）にスクロールが付く
- [ ] タブコンテンツ外側のスクロールが削除される（二重スクロール解消）

---

## 実装ステップ

### Phase 1: 型定義の変更
- [ ] `frontend/src/types/experimentPlanDialog.ts` の `CustomPropValue` 型を拡張
  - `containerType: 'property' | 'content' | 'insertion'` フィールドを追加
  - `value` を `string | string[] | null` に変更（content用に string[] を追加）
  - insertion 用フィールドを追加（`file?: File`, `uri?: string`, `hash?: string`, `format?: string`）

### Phase 2: TemplateInputPanel.tsx の修正（カスタムプロパティUI）
- [ ] 追加ボタンを「コンテナタイプごとのボタン3つ」に変更
  - `<Button> property 追加 </Button>`
  - `<Button> content 追加 </Button>`
  - `<Button> insertion 追加 </Button>`
- [ ] `handleAddCustomProp` を `containerType` 引数付きに変更
- [ ] 追加済みカスタムプロパティの表示を DataRecordDialog 準拠に変更
  - property: コンテナタイプTag + Key入力 + Type選択 + 値入力 + Units入力 + 削除ボタン
  - content: コンテナタイプTag + Key入力 + Type選択 + Units入力 + 複数行入力（行追加機能） + 削除ボタン
  - insertion: コンテナタイプTag + ファイル選択ボタン + 削除ボタン
- [ ] Key重複チェック機能の実装
  - `duplicateCustomKeys` の `useMemo` を追加
  - テンプレート固定プロパティとの重複も検出
  - 重複時はInput枠を赤くハイライト + エラーテキスト表示

### Phase 3: スクロールバー構造の修正
- [ ] `TemplateInputPanel.tsx`：左側テンプレート一覧の Card に `maxHeight: 420, overflowY: 'auto'` を設定
- [ ] `ExperimentPlanDialog.tsx`：880行目付近の外側ラッパー `div` から `maxHeight: 540` と `overflowY: 'auto'` を削除

### Phase 4: 動作確認
- [ ] TemplateInputPanel でカスタムプロパティを追加・削除できること
- [ ] Key重複チェックが動作すること
- [ ] テンプレート一覧のスクロールが機能すること
- [ ] 右側のプロパティ入力エリアのスクロールが残っていること
- [ ] タブ全体の二重スクロールが解消されていること

---

## 変更ファイル

### 修正
1. `frontend/src/types/experimentPlanDialog.ts` - `CustomPropValue` 型の拡張
2. `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx` - カスタムプロパティUI全面変更
3. `frontend/src/components/project/ExperimentPlanDialog.tsx` - 外側スクロールの削除

---

## 現状の問題詳細

### スクロール二重構造の箇所（ExperimentPlanDialog.tsx 880行目）

```typescript
// 問題のある実装
<div style={{ maxHeight: 540, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4 }}>
  <Tabs>
    ...
    <Tab key="template">
      <TemplateInputPanel />
      // ↑ TemplateInputPanel 内部の右側 Card も maxHeight: 420, overflowY: 'auto'
      // → 二重スクロールになっている
    </Tab>
  </Tabs>
</div>

// 修正後
<div style={{ overflowX: 'hidden', paddingRight: 4 }}>
  <Tabs>...</Tabs>
</div>
```

### テンプレート一覧スクロール欠如の箇所（TemplateInputPanel.tsx 119行目）

```typescript
// 問題のある実装（スクロールなし）
<Card title="テンプレート一覧" styles={{ body: { padding: 0 } }}>
  <Table ... />
</Card>

// 修正後（スクロール追加）
<Card title="テンプレート一覧" styles={{ body: { padding: 0, maxHeight: 420, overflowY: 'auto' } }}>
  <Table ... />
</Card>
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型変更による既存コードのビルドエラー | 中 | 低 | CustomPropValue 使用箇所を検索して確認 |
| スクロール削除で基本情報タブが見切れる | 中 | 中 | 基本情報タブのコンテンツ量を確認 |
| insertion のファイル保存処理が未実装 | 低 | 低 | ExperimentPlanDialog では UI のみ（保存処理は別途） |

---

## 承認記録
- **計画書提示日時**: 2026-06-30 08:45
- **承認日時**: 2026-06-30 08:45
- **承認者コメント**: Act Modeに切り替えて承認済み

---

## 追加タスク: トランジション選択時のテンプレート絞り込み対応

**追記日時**: 2026-06-30 15:29

### 問題概要

トランジションを選択しても、テンプレート一覧が切り替わらない。
本来は選択したトランジションに流入するPlace（Arc.target=transitionId のArcのsource）に紐づくテンプレートのみ表示される必要がある。

### 問題の根本原因

**MAIMLの構造:**
```
Transition（トランジション）
  ← Arc（target: transitionId, source: placeId）
    ← Place（プレース）
      ← Template.placeRefs（ref: placeId）
        ← Template（テンプレート）
```

**問題箇所①: `ExperimentPlanDialog.tsx` (216-219行目)**
```typescript
// 問題: selectedTransitionId が変わっても全テンプレートを返すだけ
const filteredTemplates = useMemo(() => {
  if (!selectedTransitionId) return [];
  return dialogData?.templates ?? methodTemplatesProp;  // ← フィルタリングなし
}, [selectedTransitionId, dialogData, methodTemplatesProp]);
```

**問題箇所②: `backend/src/types/api.ts` の `PlanDialogData` 型**
- `transitions[].placeIds` フィールドがない
- `templates[].placeIds` フィールドがない

**問題箇所③: `backend/src/services/experimentInstructionService.ts`**
- `getPlanDialogDataFromMaiml` がTransition→Place→Templateの紐付けを返していない

### 追加実装ステップ

#### Phase A: 型定義の修正
- [ ] `backend/src/types/api.ts` の `PlanDialogData` 型に以下を追加
  - `transitions[].placeIds: string[]`
  - `templates` を `(TemplateDef & { placeIds: string[] })[]` に変更

#### Phase B: バックエンド修正
- [ ] `backend/src/services/experimentInstructionService.ts` の `getPlanDialogDataFromMaiml` を修正
  - `extractPlaceIdsForTransition()` ヘルパー関数を追加（Arc.target=transitionId のArcのsource一覧）
  - `transitions` の各要素に `placeIds` を追加
  - `templates` の各要素に `placeIds` を追加（Template.placeRefs[].ref から抽出）

#### Phase C: フロントエンド修正
- [ ] `frontend/src/components/project/ExperimentPlanDialog.tsx` の `filteredTemplates` useMemo を修正
  - 選択トランジションの `placeIds` に紐づくテンプレートのみフィルタリング
  - `placeIds` が空・未設定の場合のフォールバック（全テンプレート表示）

#### Phase D: ビルドチェック
- [ ] バックエンド TypeScript コンパイルチェック（`npx tsc --noEmit`）
- [ ] フロントエンド TypeScript コンパイルチェック（`npx tsc --noEmit`）

### 変更ファイル

1. `backend/src/types/api.ts` - PlanDialogData 型に placeIds 追加
2. `backend/src/services/experimentInstructionService.ts` - placeIds 抽出・返却ロジック追加
3. `frontend/src/components/project/ExperimentPlanDialog.tsx` - filteredTemplates フィルタリング修正

### 承認記録（追加タスク）
- **計画書提示日時**: 2026-06-30 15:29
- **承認日時**: 2026-06-30 15:29
- **承認者コメント**: Act Modeに切り替えて承認済み

---

## 追加タスク2: 基本情報タブのデータ管理単位変更（タスク×トランジション二次元管理）

**追記日時**: 2026-06-30 15:57

### 問題概要

基本情報タブ（CreatorRef/InstrumentRef/OwnerRef/注意事項）が「タスクごと」にしか管理されていない。
本来「タスク × トランジションごと」に独立して設定・保存されるべき。

### テーブル設計（変更なし）

`experiment_plan` テーブルの `planned_values` JSONB は既にTransition単位で設計済み。

```json
{
  "transition-1": {
    "mgr-instruction:requiredCreatorUUID": ["uuid1"],
    "mgr-instruction:requiredInstrumentUUID": ["uuid2"],
    "template-A": { "field1": "value1" }
  },
  "transition-2": {
    "mgr-instruction:requiredCreatorUUID": ["uuid3"],
    ...
  }
}
```

**→ マイグレーション不要。フロントエンド・バックエンドの変換ロジックのみ修正。**

### State設計の変更

```typescript
// 変更前（タスクのみ）
tabDataMap: Record<string, ExperimentPlanTabData>
// { 'all': {...}, 'task-1': {...}, 'task-2': {...} }

// 変更後（タスク × トランジション）
tabDataMap: Record<string, Record<string, ExperimentPlanTabData>>
// {
//   'all':    { 'trans-1': {...}, 'trans-2': {...} },
//   'task-1': { 'trans-1': {...}, 'trans-2': {...} },
//   'task-2': { 'trans-1': {...}, 'trans-2': {...} },
// }
```

### 一括タブの伝播ルール

- 一括タブのトランジション1で変更 → タスク1のトランジション1、タスク2のトランジション1に伝播
- トランジションをまたいだ伝播は行わない（各トランジション独立）

### 追加実装ステップ

#### Phase E: フロントエンド型定義の修正
- [ ] `frontend/src/types/experimentPlanDialog.ts` の `tabDataMap` 関連型を二次元に変更

#### Phase F: ExperimentPlanDialog.tsx の State管理修正
- [ ] `tabDataMap` の型を `Record<string, Record<string, ExperimentPlanTabData>>` に変更
- [ ] `currentTabData` 取得ロジックを `tabDataMap[activeTab]?.[selectedTransitionId]` に変更
- [ ] `updateCurrentTabData` を二次元更新・一括伝播ロジックに変更
- [ ] 初期化処理（useEffect）を全トランジション分の初期化に変更
- [ ] `handleSave` を全タスク×全トランジション分の保存に変更

#### Phase G: バックエンドAPI修正（JSONB変換対応）
- [ ] `backend/src/types/api.ts` の `UpsertExperimentPlanInput` 型を変更（transitionId単位→全トランジション統合）
- [ ] `backend/src/services/experimentPlanService.ts` の変換ロジック修正
- [ ] `frontend/src/services/experimentPlanApiService.ts` の `upsertExperimentPlanToApi` 修正

#### Phase H: ビルドチェック
- [ ] バックエンド・フロントエンド TypeScript コンパイルチェック

### 変更ファイル（追加タスク2）

| ファイル | 変更内容 |
|--------|---------|
| `frontend/src/types/experimentPlanDialog.ts` | tabDataMap 関連型を二次元化 |
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | State管理・保存処理変更 |
| `frontend/src/services/experimentPlanApiService.ts` | API呼び出し変更 |
| `frontend/src/utils/experimentPlanHelpers.ts` | experimentPlansToTabDataMap 変更 |
| `backend/src/types/api.ts` | UpsertExperimentPlanInput 型変更 |
| `backend/src/services/experimentPlanService.ts` | JSONB変換ロジック修正 |

### 承認記録（追加タスク2）
- **計画書提示日時**: 2026-06-30 15:57
- **承認日時**: 2026-06-30 15:57
- **承認者コメント**: Act Modeに切り替えて承認済み

---

## 追加タスク3: トランジション入出力Place分離によるテンプレート絞り込み改善

### 背景

- テンプレート絞り込みの `placeIds` が入力Placeのみ取得していたため、最後のトランジションの出力Result Placeのテンプレートが表示されない問題があった
- さらに「前のトランジションの出力Placeは表示するが非活性（disabled）にしたい」という仕様が確認された

### 仕様

Petri Net の構造: `TransitionA → ResultPlace_A → TransitionB → ResultPlace_B`

- **TransitionA選択時**: 入力Placeのフィールド（入力可能）+ 出力Place（ResultPlace_A）のフィールド（入力可能）
- **TransitionB選択時**: 入力Place（ResultPlace_A）のフィールド（**表示するがdisabled**）+ 出力Place（ResultPlace_B）のフィールド（入力可能）

### 実装ステップ（追加タスク3）

#### Phase I: バックエンド型定義変更
- [ ] `backend/src/types/api.ts` の `PlanDialogData.transitions[]` を変更
  - `placeIds: string[]` → `inputPlaceIds: string[]` + `outputPlaceIds: string[]` に分離

#### Phase J: バックエンド実装変更
- [ ] `backend/src/services/experimentInstructionService.ts`
  - `calcOutputPlaceIds()` 関数を新規追加
  - `transitions` 生成時に `inputPlaceIds` / `outputPlaceIds` に分けて設定

#### Phase K: フロントエンド修正（filteredTemplates + TemplateInputPanel）
- [ ] `frontend/src/components/project/ExperimentPlanDialog.tsx`
  - `filteredTemplates` を `inputPlaceIds + outputPlaceIds` の合算で絞り込むよう変更
  - `outputTemplateIds`（出力Place紐づきテンプレートID Set）を算出して `TemplateInputPanel` に渡す
- [ ] `frontend/src/services/experimentPlanApiService.ts` の `PlanDialogData` 型定義を変更
- [ ] `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx`
  - `outputTemplateIds?: Set<string>` prop を追加
  - 出力Placeに紐づくテンプレートのフィールドを `disabled` にする

#### Phase L: ビルドチェック
- [ ] バックエンド・フロントエンド TypeScript コンパイルチェック

### 変更ファイル（追加タスク3）

| ファイル | 変更内容 |
|--------|---------|
| `backend/src/types/api.ts` | PlanDialogData.transitions の placeIds を inputPlaceIds/outputPlaceIds に分離 |
| `backend/src/services/experimentInstructionService.ts` | calcOutputPlaceIds 追加、transitions 生成変更 |
| `frontend/src/services/experimentPlanApiService.ts` | PlanDialogData 型定義変更 |
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | filteredTemplates・outputTemplateIds 算出変更 |
| `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx` | outputTemplateIds prop 追加・disabled 制御 |

### 承認記録（追加タスク3）
- **計画書提示日時**: 2026-06-30 16:55
- **承認日時**: 2026-06-30 16:55
- **承認者コメント**: Act Modeに切り替えて承認済み

---

## 実施記録

### 実施日時
開始: 2026-06-30 08:45
完了: 2026-06-30 17:02

### 最終的な成果物

- [x] Phase A-D: PlanDialogData.transitions.placeIds 追加、filteredTemplates 絞り込み実装
- [x] Phase E-H: tabDataMap 二次元化（タスク×トランジション管理）、保存ロジック変更
- [x] Phase I: backend/src/types/api.ts — `placeIds` → `inputPlaceIds` + `outputPlaceIds` に分離
- [x] Phase J: experimentInstructionService.ts — `calcOutputPlaceIds()` 追加、`transitions` 生成変更
- [x] Phase K: フロントエンド全修正
  - experimentPlanApiService.ts — PlanDialogData 型定義変更
  - experimentPlanDialog.ts — TemplateInputPanelProps に outputTemplateIds 追加
  - ExperimentPlanDialog.tsx — filteredTemplates + outputTemplateIds 算出変更
  - TemplateInputPanel.tsx — outputTemplateIds prop 受取・effectiveDisabled 制御・参照専用バッジ表示
- [x] Phase L: フロントエンド・バックエンド両方 TypeScript コンパイル成功（EXIT:0）
