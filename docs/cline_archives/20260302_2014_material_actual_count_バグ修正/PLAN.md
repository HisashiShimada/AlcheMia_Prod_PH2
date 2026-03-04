# タスク計画書: material_actual_count が常に0になるバグ修正

## メタデータ
- **作成日時**: 2026-03-02 20:14
- **タスクID**: material_actual_count_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` APIにおいて、
`material_actual_count`、`condition_actual_count`、`result_actual_count` が常に `0` になるバグを修正する。

## 原因調査結果

### 根本原因：`templateType`の値の不一致

`progressService.ts` の実績数カウント処理において、DBから取得した `template_type` の値と
比較している文字列が完全に食い違っている。

#### DBに格納されている値（`template_data.property_set->>'templateType'`）

`templateDataRepository.ts` の `PropertySet` 型定義より：
```typescript
export interface PropertySet {
  templateId: string;
  templateType: 'material' | 'condition' | 'result';  // ← この値がDBに入っている
  ...
}
```
SQLクエリ（`countActualByPlaceIds.sql`）が返す `template_type` の値は：
- `'material'`
- `'condition'`
- `'result'`

#### progressService.ts の比較処理（バグ箇所）

```typescript
// 現在のコード（誤り）
for (const row of countRows) {
  if (row.template_type === 'materialTemplate') {   // ❌ DBは 'material'
    materialActualCount = Number(row.count);
  } else if (row.template_type === 'conditionTemplate') { // ❌ DBは 'condition'
    conditionActualCount = Number(row.count);
  } else if (row.template_type === 'resultTemplate') {    // ❌ DBは 'result'
    resultActualCount = Number(row.count);
  }
}
```

比較文字列が **MAIMLのstereotype値**（`'materialTemplate'` 等）になっており、
**DBのtemplate_type値**（`'material'` 等）と一致しないため、常に0のままになる。

#### 値の対応表

| 用途 | 値 |
|------|-----|
| MAIMLのstereotype（プレース定義数カウントで使用） | `'materialTemplate'` / `'conditionTemplate'` / `'resultTemplate'` |
| DBのtemplate_type（実績数カウントで使用） | `'material'` / `'condition'` / `'result'` |

---

## 目的と期待される成果

### 目的
進捗確認APIが正しい実績数を返すよう修正する。

### 期待される成果
- [x] 原因調査完了
- [ ] `material_actual_count` が正しい実績数を返す
- [ ] `condition_actual_count` が正しい実績数を返す
- [ ] `result_actual_count` が正しい実績数を返す

---

## 実装ステップ

### Phase 1: バグ修正
- [x] `progressService.ts` の比較文字列を修正（`'materialTemplate'` → `'material'` 等）

### Phase 2: 動作確認
- [ ] APIを呼び出して `material_actual_count` が正しく返ることを確認

---

## 影響範囲

### 変更するファイル
1. `backend/src/services/progressService.ts` - 比較文字列の修正（1箇所のみ）

### 影響を受ける機能
- `GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions`
  - `material_actual_count`、`condition_actual_count`、`result_actual_count` が正しい値を返すようになる

---

## 修正内容詳細

### 修正前（バグあり）
```typescript
for (const row of countRows) {
  if (row.template_type === 'materialTemplate') {
    materialActualCount = Number(row.count);
  } else if (row.template_type === 'conditionTemplate') {
    conditionActualCount = Number(row.count);
  } else if (row.template_type === 'resultTemplate') {
    resultActualCount = Number(row.count);
  }
}
```

### 修正後（正しい）
```typescript
for (const row of countRows) {
  if (row.template_type === 'material') {
    materialActualCount = Number(row.count);
  } else if (row.template_type === 'condition') {
    conditionActualCount = Number(row.count);
  } else if (row.template_type === 'result') {
    resultActualCount = Number(row.count);
  }
}
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 他の箇所で `'materialTemplate'` 等の比較が同様に誤っている可能性 | 低 | 低 | 修正後にgrep確認する |

---

## テスト計画

### 手動テスト
- [ ] `template_data` テーブルに `material_actual_count` に相当するデータが存在する状態でAPIを呼び出し、正しいカウントが返ることを確認
  - エンドポイント: `GET http://localhost:3001/api/v1/progress/projects/TestProjectOmori8/methods/method_TestProjectOmori8_6cc24b82/tasks/1/transitions`
  - 確認項目: `material_actual_count`、`condition_actual_count`、`result_actual_count` が `0` でなく正しい値を返すこと

---

## 承認記録
- **計画書提示日時**: 2026-03-02 20:14
- **承認日時**: 2026-03-02 20:14
- **承認者コメント**: Act modeに切り替えて実施
