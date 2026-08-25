# タスク計画書: ペトリネット編集画面 不確かさ編集機能追加

## メタデータ
- **作成日時**: 2026-07-22 09:00
- **タスクID**: petri-net-uncertainty-edit
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

ペトリネット編集画面（TemplateEditorDialog）にて不確かさを付与した後、削除は出来るが編集（再選択・値変更）が出来ない問題を修正する。  
実験詳細指示ダイアログ内の不確かさ基準編集と同様の仕組みを実装する。

## 目的と期待される成果
- [x] 不確かさセクションに「編集」ボタンを追加
- [x] 編集ボタン押下時、既存の不確かさ情報（key・value・description）を initialPayload として `UncertaintyCriteriaSelectorModal` に渡す
- [x] モーダル内で既存の基準が選択済み状態・値が入力済み状態で開く
- [x] モーダルで付与確定後、対象プロパティの uncertainty 子ノードが上書き更新される

## 変更ファイル

### 修正
1. `frontend/src/components/editorv2/TemplateEditorDialog.tsx` - handleEditUncertainty 追加 / criteriaEditPayload state 追加 / モーダルへ initialPayload 渡し / NestedPropertyEditor に onEditUncertainty prop 渡し
2. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` - id=0 時の key フォールバック検索修正

### 確認（既実装）
- `frontend/src/components/editorv2/NestedPropertyEditor.tsx` - onEditUncertainty prop・編集ボタンは既に実装済み

## 技術的詳細

### 問題の原因
`NestedPropertyEditor.tsx` には `onEditUncertainty` prop と編集ボタンのレンダリングが既に実装されていたが、
`TemplateEditorDialog.tsx` 側でこの prop を渡していなかったため、ボタンが表示されていなかった。

### 修正内容

#### TemplateEditorDialog.tsx
1. `criteriaEditPayload: AssignPayload | null` state を追加
2. `handleEditUncertainty(propertyKey, uncertaintyNode)` ハンドラーを追加
   - uncertaintyNode の key・attributes・elements から `AssignPayload` を構築
   - `id: 0` として criteria を設定（ペトリネット側には DB の id 情報がない）
   - `setCriteriaEditPayload(editPayload)` → `setCriteriaSelectorOpen(true)` の順に呼び出す
3. `NestedPropertyEditor` に `onEditUncertainty={handleEditUncertainty}` を追加
4. `UncertaintyCriteriaSelectorModal` に `initialPayload={criteriaEditPayload ?? undefined}` を追加
5. モーダルの `onClose` で `setCriteriaEditPayload(null)` をリセット

#### UncertaintyCriteriaSelectorModal.tsx
- `initialPayload.criteria.id !== 0` の場合は id で検索、`id === 0` の場合は key でフォールバック検索するよう修正

## 追加修正（2026-07-22 09:33）

### 問題の再調査

上記の修正では「編集」ボタン自体の表示と initialPayload の渡しは実装済みだったが、
**「不確かさ選択（新規付与）」ボタンで `setCriteriaEditPayload(null)` が呼ばれていなかった**。

この結果、一度「編集」ボタンを押した後に「不確かさ選択」ボタンで新規付与を開くと、
前回の `criteriaEditPayload` が残り、`UncertaintyCriteriaSelectorModal` に `initialPayload` として
渡されてしまい、編集モードで開いてしまっていた。

### 追加修正内容

`handleOpenCriteriaSelector` に `setCriteriaEditPayload(null)` を追加。

```typescript
// 修正前
setCriteriaTargetProperty(target);
setCriteriaSelectorOpen(true);

// 修正後
setCriteriaTargetProperty(target);
setCriteriaEditPayload(null);  // ← 追加：新規付与時は editPayload をクリア
setCriteriaSelectorOpen(true);
```

## 実施記録

### 実施日時
開始: 2026-07-22 09:00
完了: 2026-07-22 09:33

### 最終的な成果物
- [x] TemplateEditorDialog.tsx 修正完了（handleEditUncertainty・initialPayload 渡し・criteriaEditPayload リセット）
- [x] UncertaintyCriteriaSelectorModal.tsx 修正完了（id=0 時の key フォールバック検索）
- [x] NestedPropertyEditor.tsx は既実装確認済み（onEditUncertainty prop・編集ボタン）
