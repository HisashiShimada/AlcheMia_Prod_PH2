# タスク計画書: テンプレート新規作成後の保存消失バグ修正

## メタデータ
- **作成日時**: 2026-09-15 12:00
- **タスクID**: 20260915_1200_テンプレート新規作成保存消失バグ修正
- **優先度**: 高
- **推定工数**: 3時間

---

## タスク概要

`material` / `condition` / `result` のいずれかのテンプレートを新規作成して保存後、
テンプレート編集画面から離れると登録したテンプレート情報が消える事象を調査・修正する。

また、XMLビューにも追加したテンプレート情報が反映されない事象も同時に修正する。

---

## 調査結果・根本原因

### 根本原因1: `TemplateContext` の `maimlData` 再パースによる全上書き（修正済み）

**場所**: `frontend/src/contexts/TemplateContext.tsx` L.64〜93  
**修正**: Phase 1 で `maimlData` 再パース時にメモリ上の未保存テンプレートをマージするよう修正済み ✅

### 根本原因2: `handleSaveTemplate` の `useCallback` 依存配列に `nodes` が未登録（修正済み）

**場所**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`  
**修正**: Phase 2 で `nodesRef` を使用して古い `nodes` を参照しないよう修正済み ✅

### 根本原因3: `window.clineAllTemplates` null 時のフォールバック欠如（修正済み）

**場所**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`  
**修正**: Phase 3 でフォールバック処理を追加済み ✅

### 根本原因4（追加調査で特定）: MaiML 保存時の `placeRefs.length > 0` フィルタによる除外 ← **真の根本原因**

**場所**:
- `frontend/src/utils/reactFlowToMaiml.ts` L.1223-1225（material/condition/result の3箇所）
- `frontend/src/utils/multiMethodConverter.ts` L.467-468, L.501-502, L.535-536（3箇所）

**問題の流れ**:

```
テンプレート一覧「+」ボタン
  → handleTemplateAdd() → 仮ノード: placeRefs=[]

TemplateEditorDialog 保存 → handleSaveTemplate()
  → nodesRef.current.some() = false（仮ノードIDはペトリネット上に存在しない）
  → convertedTemplateRef.placeRefs = []（空のまま）
  → TemplateContext.addTemplate() → メモリに追加 → 画面に表示 ✅（一時的）

「保存」ボタン（MaiMLファイル保存）
  → reactFlowToMaiml.ts:
      allTemplates.material.filter(t => ... && t.placeRefs && t.placeRefs.length > 0)
      ↑ placeRefs=[] なので除外 ❌

  → XMLにテンプレートが含まれない → S3保存後に再ロード → テンプレートが消える ❌
```

**消えない場合との比較**:
- PlaceRef追加あり: `placeRefs.length > 0` → XMLに書き出される → 保存後も残る ✅
- ペトリネットから追加: `nodeId` = 実際の Place ノード ID → `placeRefs` に自分自身を追加 → 保存後も残る ✅

**修正**: Phase 4 で `placeRefs.length > 0` 条件を削除 ✅

---

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|----------|
| 1 | `frontend/src/contexts/TemplateContext.tsx` | maimlData 再パース時のマージロジック追加（Phase 1） |
| 2 | `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | nodes 参照修正・null フォールバック追加（Phase 2,3） |
| 3 | `frontend/src/utils/reactFlowToMaiml.ts` | material/condition/result フィルタから placeRefs.length > 0 条件削除（Phase 4） |
| 4 | `frontend/src/utils/multiMethodConverter.ts` | 同様（Phase 4） |

---

## 修正前/修正後の機能フロー図

### 修正前（バグあり）

```
テンプレート一覧「+」→ placeRefs=[] → TemplateContext追加OK（メモリのみ）
  → MaiML保存時: placeRefs.length > 0 フィルタ → 除外 → XMLなし → 再ロード後消える ❌
```

### 修正後（正常）

```
テンプレート一覧「+」→ placeRefs=[] → TemplateContext追加OK（メモリのみ）
  → MaiML保存時: placeRefs条件なし → XML出力 → S3保存 → 再ロード後も残る ✅
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| TemplateContext マージロジックが既存テンプレートを誤って上書き | 高 | 低 | マージルールを明確化 |
| nodesRef 導入による他のハンドラとの不整合 | 中 | 低 | 既存パターンと同様の方式 |
| placeRefs=[]のテンプレートが XML に含まれることで仕様影響 | 中 | 低 | MaiML 仕様上 placeRefs は任意（0件OK） |

---

## 実施記録

### 実施日時
開始: 2026-09-15 12:00
完了: 2026-09-15（追加修正）

### 最終的な成果物
- [x] Phase 1: `TemplateContext.tsx` - maimlData 再パース時マージロジック追加（完了）
- [x] Phase 2: `PetriNetEditorInner.tsx` - `nodesRef` 追加・`nodes.some()` → `nodesRef.current.some()` 変更（完了）
- [x] Phase 3: `PetriNetEditorInner.tsx` - `window.clineAllTemplates` null 時フォールバック追加（完了）
- [x] Phase 4: `reactFlowToMaiml.ts` / `multiMethodConverter.ts` - `placeRefs.length > 0` フィルタ削除（完了）
- [x] Phase 5: フロントエンドビルド確認（完了）
- [x] Phase 5: バックエンド TSC 確認（完了）
