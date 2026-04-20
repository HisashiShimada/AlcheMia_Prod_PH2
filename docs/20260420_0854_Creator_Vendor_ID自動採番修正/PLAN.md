# タスク計画書: Creator/Vendor ID自動採番修正

## メタデータ
- **作成日時**: 2026-04-20 08:54
- **タスクID**: creator-vendor-id-autoincrement-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

`MultiObjectEditor.tsx` の「空のXxxを追加」ボタン押下時に採番される ID が、
削除操作後に重複してしまう問題を修正する。

## 2. 問題の詳細

### 問題箇所
**ファイル**: `frontend/src/components/editorv2/components/MultiObjectEditor.tsx`  
**行**: 544〜563（`handleAdd` 関数）

```typescript
// 現状の実装（問題あり）
const handleAdd = useCallback(() => {
  const newObject: DocumentTagData = {
    tagName: ...,
    id: `${objectKey}${objects.length + 1}`,  // ← ここが問題
    ...
  };
  ...
}, [objects, objectKey, onDataChange]);
```

### 問題の再現手順
1. Creator を 3 件追加 → ID: `creators1`, `creators2`, `creators3`
2. `creators2` を削除 → 配列は `[creators1, creators3]`（長さ: 2）
3. 新規追加 → `objects.length + 1` = `2 + 1` = `3` → ID `creators3` が重複！

### MaiML 規約上の問題
MaiML の XML では ID 属性の一意性が必須であり、重複 ID は規約違反となる。

## 3. 修正案

### 修正方針: 「既存 ID の最大連番 + 1」方式（採用）

現在の配列に存在する ID の末尾数値の最大値を取得し、それに +1 した値を次の連番として使用する。

```typescript
const handleAdd = useCallback(() => {
  // 既存IDから末尾の数値を取得し、最大値を算出
  const existingNumbers = objects
    .map(obj => {
      const match = obj.id?.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNumber = maxNumber + 1;

  const newObject: DocumentTagData = {
    tagName: ...,
    id: `${objectKey}${nextNumber}`,  // 重複しない連番
    ...
  };
  ...
}, [objects, objectKey, onDataChange]);
```

### 方式比較

| 方式 | メリット | デメリット |
|------|---------|-----------|
| **最大連番+1（採用）** | 削除後も重複しない、番号が連続的で分かりやすい | 削除すると番号が飛ぶ（例: 1,3,4） |
| UUID採番 | 完全に重複しない | ID が非常に長くなり人間が読みにくい |
| 全体スキャン+最小未使用番号 | 隙間を埋める | ロジックが複雑、削除→追加で予想外の番号になる |

**採用理由**: シンプルで確実に重複しない。MaiML 上 ID は一意であれば形式不問のため、番号が飛んでも問題ない。

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/MultiObjectEditor.tsx`
   - `handleAdd` 関数の ID 生成ロジックのみ修正（約 3〜5 行の変更）

### 影響を受ける機能
- Creator / Vendor / Owner / Instrument の「空のXxxを追加」ボタン
- マスタから追加する機能（`handleAddFromMaster`）は ID をマスタから引き継ぐため影響なし

## 5. 修正内容の詳細

### Before（現状）
```typescript
const handleAdd = useCallback(() => {
  const newObject: DocumentTagData = {
    tagName: objectKey === 'creators' ? 'Creator' : objectKey === 'vendors' ? 'Vendor' : objectKey === 'owners' ? 'Owner' : 'Instrument',
    id: `${objectKey}${objects.length + 1}`,
    uuid: '',
    name: '',
    description: '',
    annotation: ''
  };
  ...
}, [objects, objectKey, onDataChange]);
```

### After（修正後）
```typescript
const handleAdd = useCallback(() => {
  // 既存IDの末尾数値の最大値を取得し、次の連番を算出（削除後の重複防止）
  const existingNumbers = objects.map(obj => {
    const match = obj.id?.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNumber = maxNumber + 1;

  const newObject: DocumentTagData = {
    tagName: objectKey === 'creators' ? 'Creator' : objectKey === 'vendors' ? 'Vendor' : objectKey === 'owners' ? 'Owner' : 'Instrument',
    id: `${objectKey}${nextNumber}`,
    uuid: '',
    name: '',
    description: '',
    annotation: ''
  };
  ...
}, [objects, objectKey, onDataChange]);
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存IDが数値以外の形式（例: `creator_abc`）の場合、`match` が null になり 0 扱いになる | 低 | 低 | `|| 0` でフォールバック済み。次回は `1` から開始されるため問題なし |
| 既存データが空配列の場合 | 低 | 有 | `existingNumbers.length > 0` のガードで対処済み（`maxNumber = 0` → `nextNumber = 1`） |

## 7. テスト計画

### 手動テスト
- [ ] 新規追加時に ID が `creators1` から始まること
- [ ] 2 件追加後に `creators2` を削除し、再度追加すると `creators3` になること（重複なし）
- [ ] 全件削除後に追加すると `creators1` になること
- [ ] Vendor / Owner / Instrument でも同様に動作すること

## 8. 承認記録

- **計画書提示日時**: 2026-04-20 08:54
- **承認日時**: 2026-04-20 08:56
- **承認者コメント**: 承認します。修正を進めてください

## 9. 実施記録

### 実施日時
開始: 2026-04-20 08:56  
完了: 2026-04-20 08:56

### 変更内容
`MultiObjectEditor.tsx` の `handleAdd` 関数を修正。

**修正箇所**: 544行目付近の ID 生成ロジック

- **Before**: `id: \`${objectKey}${objects.length + 1}\``
- **After**: 既存 ID の末尾数値の最大値を取得し `maxNumber + 1` を使用

```typescript
const existingNumbers = objects.map(obj => {
  const match = obj.id?.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
});
const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
const nextNumber = maxNumber + 1;
id: `${objectKey}${nextNumber}`
```

### 最終的な成果物
- [x] `frontend/src/components/editorv2/components/MultiObjectEditor.tsx` 修正完了
