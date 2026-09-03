# タスク計画書: 新規Prefix追加後スコープ表示が「-」になる修正

## メタデータ
- **作成日時**: 2026-09-02 08:30
- **タスクID**: fix-prefix-scope-display
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

新規Prefixを追加した直後、スコープ列が「-」と表示される不具合を修正する。
DBにはデータが正常に登録されており、画面に表示する際の処理に問題がある。

## 2. 目的と期待される成果

### 目的
新規Prefix追加後にスコープ列（`scopePath`）が正しく表示されるようにする。

### 期待される成果
- [ ] 新規Prefix保存後、スコープ列に正しい組織グループ名（または個人名）が表示される
- [ ] 既存のPrefix一覧（編集・削除）の動作に影響がない

## 3. 原因分析

### 問題の場所
`frontend/src/components/namespace/PrefixManagement.tsx` の `executeSave()` 関数

### 根本原因
新規Prefix保存後、APIレスポンス（`createNamespace`）には `scopeName` が含まれないため、
`added` 配列に `scopePath` が設定されないまま `setRows` でstateに追加される。

```typescript
// executeSave() 内（問題のコード）
added.push({
  id: created.prefix,
  prefix: created.prefix,
  uri: created.uri,
  description: row.description,
  // ← scopePath が設定されていない！
});
// ...
setRows((prev) => [...added, ...prev]);  // scopePath なしで直接追加
```

スコープ列のrender処理では `r.scopePath || '—'` としているため、
`scopePath` が空の場合 `'—'` が表示される。

### 比較：編集保存（saveEdit）は正常
`saveEdit()` は保存後に `reloadNamespaces()` を呼んでDBから再フェッチするため
正しいスコープ名が取得できる。`executeSave()` にも同様の再フェッチ処理が必要。

## 4. 実装ステップ

- [x] `executeSave()` の末尾で `setRows((prev) => [...added, ...prev])` をやめ、
      `reloadNamespaces()` を呼ぶように変更する

## 5. 変更するファイル

1. `frontend/src/components/namespace/PrefixManagement.tsx`
   - `executeSave()` 関数: `setRows` による直接state更新を `reloadNamespaces()` の呼び出しに変更

## 6. 変更内容詳細

### 変更前（現在）

```typescript
const executeSave = async () => {
  const added: PrefixRow[] = [];
  const failed: { prefix: string; uri: string }[] = [];

  for (const row of newRows) {
    try {
      // ...
      const created = await createNamespace(createNamespaceRequest);
      added.push({
        id: created.prefix,
        prefix: created.prefix,
        uri: created.uri,
        description: row.description,
      });
    } catch {
      failed.push({ prefix: row.prefix, uri: row.uri });
    }
  }

  if (added.length > 0) {
    setRows((prev) => [...added, ...prev]);          // ← 削除
    message.success(t('prefixManagement.saveSuccess', { count: String(added.length) }));
  }
  if (failed.length > 0) {
    message.warning(t('prefixManagement.savePartialFailure', { failCount: String(failed.length) }));
  }
  setNewRows([]);
};
```

### 変更後

```typescript
const executeSave = async () => {
  let successCount = 0;
  const failed: { prefix: string; uri: string }[] = [];

  for (const row of newRows) {
    try {
      // ...
      await createNamespace(createNamespaceRequest);
      successCount++;
    } catch {
      failed.push({ prefix: row.prefix, uri: row.uri });
    }
  }

  if (successCount > 0) {
    message.success(t('prefixManagement.saveSuccess', { count: String(successCount) }));
  }
  if (failed.length > 0) {
    message.warning(t('prefixManagement.savePartialFailure', { failCount: String(failed.length) }));
  }
  setNewRows([]);
  reloadNamespaces();  // ← DBから再フェッチ（scopeName を含む正しいデータを取得）
};
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 保存後の再フェッチで画面がちらつく | 低 | 低 | Spin（ローディング）が既に表示されているため問題なし |

## 8. テスト計画

### 手動テスト
- [ ] 新規Prefixを追加し保存後、スコープ列に正しいグループ名が表示されることを確認
- [ ] 組織グループノード選択時・個人ノード選択時の両方で確認
- [ ] 既存Prefixの編集・削除が正常に動作することを確認

## 9. 承認記録

- **計画書提示日時**: 2026-09-02 08:30
- **承認日時**: （承認時に記入）
