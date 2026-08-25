# タスク計画書: 名前空間管理 バグ修正・フィルタリング修正

## メタデータ
- **作成日時**: 2026-08-04 16:00
- **タスクID**: 名前空間管理バグ修正
- **優先度**: 高
- **推定工数**: 5時間

## タスク概要

名前空間管理タブで発生している以下のバグ・不具合をまとめて修正する。

### ツリーフィルタリング
1. 左側ツリーに、ログインユーザーが所属していない organization_group が表示される

### 個人名前空間 Prefix
2. 個人の名前空間ノード選択時、Prefix追加ダイアログのプルダウンに組織全体のPrefixが表示される（個人名前空間のみ表示されるべき）
3. Prefix保存後に再フェッチするとデータなしになる（`scopeKey` が渡されず `scope_key = NULL` で保存されるため）

### Prefix管理
4. 組織・個人スコープ選択時の編集内容がDBに反映されない
5. 組織・個人スコープ選択時の新規追加でスコープデータが保存されない（前セッションで修正済み）
6. 個人選択時に登録されているデータが取得できず表示されない（調査の結果、問題なし）

### 用語管理
7. 非アクティブボタン押下時ダイアログのボタンが英語表記になっている
8. スコープフィルターにPrefixそのものが表示される（useMemo依存配列の欠落）
9. CSVインポートのカラムインデックスがずれる（存在しない `displayNameEn` フィールド参照）

---

## 原因分析

### 問題①：ツリーにユーザー非所属グループが表示される
- **ファイル**: `backend/src/sql/queries/organization_groups/findAll.sql`
- **原因**: `organization_id` のみでフィルタしており、`organization_group_user` テーブルを参照したユーザー所属フィルタが存在しない

### 問題②：個人Prefix ― fetchPrefixes に scopeKey なし
- **ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`
- **原因**: `fetchPrefixes` が常に `getNamespaceList()` を scopeKey 無しで呼び出しているため、常に組織全件が `dbPrefixes`（Prefixプルダウン）に入る

```typescript
// 現状: scopeKey 指定なし → 常に組織全体のPrefixを取得
const fetchPrefixes = useCallback(() => {
  getNamespaceList()   // ← scopeKey無し
    ...
}, []);
```

### 問題③：個人Prefix ― page.tsx に scopeKey プロップが渡されていない
- **ファイル**: `frontend/src/app/namespace-management/page.tsx`
- **原因**: `PrefixManagement` に `scopeKey` プロップが渡されておらず、`executeSave` 内で `scopeKey = undefined` → DBに `scope_key = NULL` で保存される

```tsx
// 現状: scopeKey プロップが渡されていない
<PrefixManagement
  selectedNsKey={selectedScopeKey ?? undefined}
  // scopeKey が未指定
/>
```

### 問題④：Prefix編集内容がDBに反映されない
- **ファイル**: `frontend/src/components/namespace/PrefixManagement.tsx`（`saveEdit()`）
- **原因**: `saveEdit()` がローカル state 更新のみ行い、API呼び出しが実装されていない

### 問題⑤：新規追加時にスコープが保存されない（修正済み）
- **ファイル**: `frontend/src/components/namespace/PrefixManagement.tsx`（`executeSave()`）
- **修正内容**: `scopeKey: scopeKey ?? selectedNsKey ?? undefined`

### 問題⑦：用語管理ダイアログのボタンが英語
- **ファイル**: `frontend/src/components/namespace/TermManagement.tsx`
- **使用キー**: `t('termManagement.deactivate')`, `t('termManagement.activate')`, `t('common.cancel')`
- **原因**: `ja.json` に上記キーが定義されていない

### 問題⑧：スコープフィルターにPrefixそのものが表示される（修正済み）
- **ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`
- **原因**: `scopeFilterOptions` の `useMemo` 依存配列に `prefixScopeNameMap` が欠落していたため、DB取得後もラベルが更新されなかった

### 問題⑨：CSVインポートのカラムインデックスずれ（修正済み）
- **ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`
- **原因**: ヘッダーは7列だが `displayNameEn: row.displayNameEn` を参照しており、`description` 以降のカラムが1つずれていた

---

## 実装ステップ

### Phase 0: ツリーフィルタリング修正
- [x] 根本原因調査完了
- [ ] `backend/src/sql/queries/organization_groups/findByUser.sql` 新規作成
- [ ] `backend/src/repositories/organizationGroupRepository.ts` に `findByUser` メソッド追加
- [ ] `backend/src/services/organizationGroupService.ts` に `userId?` 引数追加
- [ ] `backend/src/controllers/organizationGroupController.ts` に `req.userId` 渡す修正

### Phase 1: 個人名前空間 Prefix 修正
- [x] 原因調査
- [x] `frontend/src/app/namespace-management/page.tsx` 修正（`PrefixManagement` に `scopeKey` プロップを追加）
- [x] `frontend/src/components/namespace/NamespaceMain.tsx` 修正（`fetchPrefixes` に `scopeKey` 引数を追加、`externalSelectedNsKey` 変化時に再取得）
- [ ] 動作確認

### Phase 2: 用語管理 多言語キー追加
- [ ] `frontend/src/locales/ja.json` に `common.cancel`, `termManagement.deactivate`, `termManagement.activate` キーを追加
- [ ] `frontend/src/locales/en.json` に対応する英語キーを追加

### Phase 3: Prefix編集 API 実装
- [ ] `backend/src/sql/queries/namespace_terms/updateNamespaceUri.sql` 新規作成
- [ ] `backend/src/repositories/namespaceTermRepository.ts` に `updateNamespaceUri()` 追加
- [ ] `backend/src/services/namespaceService.ts` に `updateNamespace()` 追加
- [ ] `backend/src/controllers/namespaceController.ts` に `updateNamespace` ハンドラ追加
- [ ] `backend/src/routes/namespaceRoutes.ts` に `PUT /:prefix` ルート追加
- [ ] `frontend/src/services/namespaceApiService.ts` に `updateNamespace()` 追加
- [ ] `frontend/src/components/namespace/PrefixManagement.tsx` の `saveEdit()` をAPI呼び出しに修正

### Phase 4: scopeKey 渡し修正・useMemo・CSVカラムずれ修正
- [x] `frontend/src/components/namespace/NamespaceMain.tsx` — `scopeFilterOptions` useMemo依存配列に `prefixScopeNameMap` を追加
- [x] `frontend/src/components/namespace/NamespaceMain.tsx` — `handleCsvUpload` 内の `displayNameEn` 削除
- [ ] `frontend/src/components/namespace/NamespaceMain.tsx` — 組織・個人スコープ選択時の `scopeKey` 渡し確認

---

## 変更ファイル一覧

### 新規作成
1. `backend/src/sql/queries/organization_groups/findByUser.sql`
2. `backend/src/sql/queries/namespace_terms/updateNamespaceUri.sql`

### 修正
| ファイル | 変更内容 |
|----------|---------|
| `backend/src/repositories/organizationGroupRepository.ts` | `findByUser` メソッド追加 |
| `backend/src/services/organizationGroupService.ts` | `userId` 引数追加 |
| `backend/src/controllers/organizationGroupController.ts` | `req.userId` を渡す修正 |
| `backend/src/repositories/namespaceTermRepository.ts` | `updateNamespaceUri()` 追加 |
| `backend/src/services/namespaceService.ts` | `updateNamespace()` 追加 |
| `backend/src/controllers/namespaceController.ts` | `updateNamespace` ハンドラ追加 |
| `backend/src/routes/namespaceRoutes.ts` | `PUT /:prefix` ルート追加 |
| `frontend/src/services/namespaceApiService.ts` | `updateNamespace()` 追加 |
| `frontend/src/components/namespace/PrefixManagement.tsx` | `saveEdit()` API呼び出し実装・`executeSave()` scopeKey修正（実施済み） |
| `frontend/src/components/namespace/NamespaceMain.tsx` | `fetchPrefixes` scopeKey対応・useMemo依存配列修正・CSV displayNameEn削除（一部実施済み） |
| `frontend/src/app/namespace-management/page.tsx` | `PrefixManagement` に `scopeKey` プロップ追加（実施済み） |
| `frontend/src/locales/ja.json` | 不足キー追加 |
| `frontend/src/locales/en.json` | 不足キー追加 |

---

## 実施記録

### Phase 1 実施内容（2026-08-04 14:45）

#### `frontend/src/app/namespace-management/page.tsx`
```tsx
// 修正前
<PrefixManagement selectedNsKey={selectedScopeKey ?? undefined} />

// 修正後
<PrefixManagement
  selectedNsKey={selectedScopeKey ?? undefined}
  scopeKey={selectedScopeKey ?? undefined}
/>
```

#### `frontend/src/components/namespace/NamespaceMain.tsx` — fetchPrefixes scopeKey対応
```ts
// 修正前
const fetchPrefixes = useCallback(() => {
  getNamespaceList()  // ← scopeKey なし

// 修正後
const fetchPrefixes = useCallback((scopeKey?: string) => {
  const options = scopeKey ? { scopeKeys: [scopeKey] } : undefined;
  getNamespaceList(options)  // ← scopeKey フィルタあり
```

- グローバルノード選択時 → `fetchPrefixes()`（全件）
- 個人名前空間ノード選択時 → `fetchPrefixes(userId)`
- 組織グループノード選択時 → `fetchPrefixes(groupCd)`

### Phase 4 実施内容（2026-08-04 16:33〜16:49）

#### `frontend/src/components/namespace/NamespaceMain.tsx` — 問題⑧修正
```typescript
// 修正前
  }, [terms, effectiveNsKey]);

// 修正後
  }, [terms, effectiveNsKey, prefixScopeNameMap]);
```

#### `frontend/src/components/namespace/NamespaceMain.tsx` — 問題⑨修正
```typescript
// 修正前
const response = await apiClient.post<Term>('/namespaces/terms', {
  prefix:        row.prefix,
  localName:     row.localName,
  displayNameJa: row.displayName,
  displayNameEn: row.displayNameEn,   // ← 削除（TermCsvParsedRow に存在しないフィールド）
  description:   row.description,
  typeHint:      row.type || 'stringType',
  unitHint:      row.unitHint,
});

// 修正後
const response = await apiClient.post<Term>('/namespaces/terms', {
  prefix:        row.prefix,
  localName:     row.localName,
  displayNameJa: row.displayName,
  description:   row.description,
  typeHint:      row.type || 'stringType',
  unitHint:      row.unitHint,
});
```

---

## テスト計画

### 手動テスト
- [ ] ログインユーザーが所属しているグループのみツリーに表示されることを確認
- [ ] 個人スコープ選択 → Prefix追加ダイアログのプルダウンが個人名前空間のPrefixのみ表示されることを確認
- [ ] 個人スコープ選択 → Prefix保存後に再フェッチしてデータが表示されることを確認
- [ ] 組織スコープ選択 → Prefix新規追加 → DBにscopeKeyが保存されることを確認
- [ ] 個人スコープ選択 → Prefix一覧が正しく表示されることを確認
- [ ] 既存Prefix編集 → 保存ボタン押下 → DBに反映されることを確認
- [ ] 用語一覧で非アクティブボタン押下 → ダイアログのボタンが日本語で表示されることを確認
- [ ] 用語管理スコープフィルターにスコープ名（ラベル）が正しく表示されることを確認
- [ ] CSVインポートで用語の各カラムが正しく保存されることを確認

---

## 承認記録
- **計画書提示日時**: 2026-08-04 16:00
- **承認日時**: 
- **承認者コメント**: 
