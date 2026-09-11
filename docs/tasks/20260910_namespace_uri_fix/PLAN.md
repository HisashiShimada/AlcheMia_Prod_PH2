# タスク計画書: namespace URI生成・取得処理の不具合修正

## メタデータ
- **作成日時**: 2026-09-10
- **タスクID**: namespace_uri_fix
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

前タスク（namespace_declaration_fix）の修正後、グループスコープのprefix宣言に設定されるURIが
DBに実際に登録されている値と異なる値になっている問題を修正する。

あわせて、URIのサジェスト生成ロジック（`getSuggestedUri`）も正しい仕様に修正する。

---

## 2. 問題詳細

### 問題A：namespace宣言のURIに `fetchSuggestedUri` の戻り値を使っている（フロントエンド）

**発生箇所**: `namespaceApiService.ts` `getOrganizationNamespaces()` グループスコープ処理

```ts
// 現状（誤り）: fetchSuggestedUri(scopeKey) でURIを生成して上書き
const correctUri = await getUriForScopeKey(scopeKey);   // ← URI「候補」を生成
correctedGroup.push({ ...entry, uri: correctUri });     // ← DBの値を上書きしてしまう
```

**`fetchSuggestedUri` は新規prefix登録フォームのURI入力補完専用**であり、
「DBに登録済みの実際のURI」を返す関数ではない。
→ **`entry.uri`（DBの実際の値）をそのまま使うべき**。

個人スコープ側（`personalUri`）も同様に `fetchSuggestedUri()` で上書きしているため同じ問題が発生しうる。
→ **`entry.uri` をそのまま使うよう修正する**。

### 問題B：`getSuggestedUri` のグループURI生成ロジックが仕様と異なる（バックエンド）

**発生箇所**: `backend/src/services/namespaceService.ts` `getSuggestedUri()` L.676〜684

```ts
// 現状（誤り）
const ancestors = await findOrgGroupAncestors(organizationId, scopeKey);
// ancestors = ['DIV_C', 'DEPT_B', 'TEAM_A']（ルート→自分の順）
const domainPart = ancestors[0] ?? organizationCd;  // ← 'DIV_C'（ルートグループCD）をドメインに使用
const pathParts = ancestors.slice(1);               // ← ['DEPT_B', 'TEAM_A']
candidateUri = `https://DIV_C.Alchemia.co.jp/DEPT_B/TEAM_A`  // ← 誤り
```

**正しい仕様**:
```
https://{組織CD}.Alchemia.co.jp/{グループCD}/{グループCD}/...
```

```ts
// 正しい実装
candidateUri = `https://${organizationCd}.Alchemia.co.jp/${ancestors.join('/')}`
// → `https://ORG001.Alchemia.co.jp/DIV_C/DEPT_B/TEAM_A`
```

**参照**: `organizationGroupService.ts` L.205〜208 に同一仕様の正しい実装がある:
```ts
const basePart = generateNamespaceUri(params.organizationCd);          // https://ORG001.Alchemia.co.jp
const groupPath = [...ancestorCds, params.groupCd].join('/');          // DIV_C/DEPT_B/TEAM_A
const candidateUri = `${basePart}/${groupPath}`;                       // ← 正しい
```

**影響**: `getSuggestedUri` は `PrefixManagement.tsx`（新規prefix登録フォームのURI自動補完）のみで使用。
DBへの書き込みは行わないため、既存データへの影響はない。

---

## 3. 修正方針

### 方針A：`getOrganizationNamespaces()` のURI上書きを廃止

グループスコープ・個人スコープともに `fetchSuggestedUri` によるURI上書きをやめ、
`getNamespaceList` が返した **`entry.uri`（DBに登録済みの実際の値）をそのまま使う**。

`uriCache` / `getUriForScopeKey` 関数 / `fetchSuggestedUri` 呼び出しはすべて不要になるため削除する。

### 方針B：`getSuggestedUri` のグループURI生成ロジックを仕様どおりに修正

```ts
// 修正後
const ancestors = await findOrgGroupAncestors(organizationId, scopeKey);
// ancestors = ['DIV_C', 'DEPT_B', 'TEAM_A']（ルート→自分の順、ORDER BY depth DESC）
candidateUri = ancestors.length > 0
  ? `https://${organizationCd}.Alchemia.co.jp/${ancestors.join('/')}`
  : `https://${organizationCd}.Alchemia.co.jp`;
```

`organizationGroupService.ts` の実装と整合させる。

---

## 4. 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `frontend/src/services/namespaceApiService.ts` | `getOrganizationNamespaces()` のグループ・個人スコープで `entry.uri` をそのまま使用するよう修正。`uriCache`・`getUriForScopeKey`・`fetchSuggestedUri` 呼び出しを削除 |
| `backend/src/services/namespaceService.ts` | `getSuggestedUri()` のグループURI生成を `https://${organizationCd}.Alchemia.co.jp/${ancestors.join('/')}` に修正 |

---

## 5. 影響範囲

- **`getOrganizationNamespaces` の修正**: MAIMLファイル保存時・XMLビュー表示時のnamespace宣言URI。DBの実際の値が使われるようになる（これが正しい動作）。
- **`getSuggestedUri` の修正**: `PrefixManagement.tsx` の新規prefix登録フォームのURI自動補完のみ。DBへの書き込みを行わないため既存データへの影響なし。フォームの初期表示URIが仕様どおりの形式になる。

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `entry.uri` がDBに空や誤った値で登録されているケース | 中 | 低 | 既存の絶対URIバリデーションフィルタ（`isAbsoluteUri` チェック）が防御する |

---

## 7. 実装ステップ

### Step 1: フロントエンド `getOrganizationNamespaces()` 修正
- [ ] グループスコープの `uriCache`・`getUriForScopeKey`・`fetchSuggestedUri` 呼び出しを削除
- [ ] `entry.uri` をそのまま使うよう変更（isActive フィルタは維持）
- [ ] 個人スコープの `fetchSuggestedUri()` 呼び出しと `personalUri` 上書きを削除
- [ ] `entry.uri` をそのまま使うよう変更（isActive フィルタは維持）

### Step 2: バックエンド `getSuggestedUri()` 修正
- [ ] グループスコープURI生成を `https://${organizationCd}.Alchemia.co.jp/${ancestors.join('/')}` に修正
- [ ] `domainPart` / `pathParts` の誤ったロジックを削除

---

## 8. テスト計画

- [ ] グループスコープのprefixのnamespace宣言URIがDBに登録されている値と一致すること
- [ ] 個人スコープのprefixのnamespace宣言URIがDBに登録されている値と一致すること
- [ ] `PrefixManagement` 画面で新規prefix追加時のURI自動補完が `https://{組織CD}.Alchemia.co.jp/{グループCD}/{グループCD}/...` の形式になること

---

## 9. 承認記録
- **計画書提示日時**: 2026-09-10
- **承認日時**: 2026-09-10
- **承認者コメント**: 承認済み・実装完了

## 10. 実施記録

### 実施日時
開始: 2026-09-10  
完了: 2026-09-10

### 変更ファイル（実施結果）
1. `frontend/src/services/namespaceApiService.ts`
   - 個人スコープ: `fetchSuggestedUri()` + `personalUri` 上書きを削除 → `entry.uri` そのまま使用
   - グループスコープ: `uriCache`・`getUriForScopeKey`・`fetchSuggestedUri` 呼び出しを削除 → `entry.uri` そのまま使用
2. `backend/src/services/namespaceService.ts`
   - `getSuggestedUri()` グループURI生成を修正
   - 修正前: `https://{ルートグループCD}.Alchemia.co.jp/{途中グループCD}/...`
   - 修正後: `https://{組織CD}.Alchemia.co.jp/{グループCD}/{グループCD}/...`

### TypeScript型チェック結果
- バックエンド: エラーなし (exit:0)
- フロントエンド: エラーなし (exit:0)
