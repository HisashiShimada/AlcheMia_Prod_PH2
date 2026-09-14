# タスク計画書: namespace宣言生成処理の不具合修正

## メタデータ
- **作成日時**: 2026-09-09
- **タスクID**: namespace_declaration_fix
- **優先度**: 高
- **推定工数**: 4〜6時間

---

## 1. タスク概要

PetriNetEditorInner周辺のMAIMLファイル保存・XML表示時におけるnamespace宣言生成処理に2つの不具合がある。

1. **同一prefixが複数階層に登録されている場合、すべての階層のprefix宣言が登録される**（URIの誤割り当て）
2. **プロジェクトに登録されたグループ以外のnamespace宣言も実行される**（スコープ絞り込み漏れ）

本来の仕様：
> **対象プロジェクトの登録されたグループのnamespaceをベースに、そのグループの上位層すべてのprefixを対象グループのnamespaceとして宣言する**

---

## 2. 現状の問題詳細

### 問題A：URI一律上書きによる誤ったprefix宣言（フロントエンド）

**発生箇所**: `frontend/src/services/namespaceApiService.ts` `getOrganizationNamespaces()` L.241〜256

`withAncestors: true` で対象グループ＋上位グループすべてのprefixが返ってくるが、
すべてのエントリに `fetchSuggestedUri(groupCds[0])` で取得した **1つのURI** を一律に上書きしてしまっている。  
上位グループが持つprefixも、ログインユーザーの所属グループのURIに書き換えられる。

**正しい動作**：各prefixが属するグループ（`entry.scopeKey`）ごとのURIをそれぞれ取得して割り当てる。

### 問題B：プロジェクトスコープを無視したnamespace宣言（フロントエンド）

**発生箇所**: `getOrganizationNamespaces()` 引数なし関数シグネチャ

- `organizationGroupCd`（プロジェクトが属するグループ）を引数に取らない
- 代わりに `localStorage.userInfo.organizationGroupCds[0]`（ログインユーザーの所属グループ）を使用
- `PetriNetEditorInner` には `organizationGroupCd` propがあるが活用されていない
- 結果として「プロジェクトとは無関係なログインユーザーのグループ」のnamespaceが宣言される

**呼び出し元**：
- `maimlApiService.ts` `saveMaiml()` 内（保存時）
- `XMLViewerWrapper.tsx`（XML表示時）

### 問題C：バックエンドの組織全件取得（バックエンド）

**発生箇所**: `maimlWriterService.ts` `buildMergedNamespaces()` L.45〜53

`findNamespacesByOrganization(organizationId)` が組織配下の**全グループスコープのprefixを全件返す**。  
プロジェクトの `organization_group_cd` を一切考慮しない。

一方 `namespaceService.getDeclarationsByProject()` と `findDeclarationsByProjectScope.sql` は
プロジェクトのグループに絞り込む正しい実装が既に存在するが、`writeDataAndEventLog` / `writeEventLogOnly` では使われていない。

また `findDeclarationsByProjectScope.sql` は現時点では祖先グループを辿らない（完全一致のみ）ため、SQL修正も必要。

---

## 3. 修正方針

### 全体方針
「プロジェクトの所属グループ + その上位グループすべてのprefixを取得し、各prefixには属するグループのURIを正しく割り当てる」ように統一する。

### 方針A：フロントエンド `getOrganizationNamespaces()` の修正

1. 関数シグネチャに `organizationGroupCd?: string` を追加
2. グループスコープ取得時、`organizationGroupCd` が渡されていればそちらを優先（なければ `userInfo.organizationGroupCds[0]` をフォールバック）
3. `withAncestors: true` で取得した各prefixに対して、`entry.scopeKey` ごとに `fetchSuggestedUri(scopeKey)` を呼んで正規URIを取得・割り当て
   - 同一scopeKeyへのAPIコールは `Map<scopeKey, uri>` でキャッシュして重複排除

### 方針B：フロントエンド呼び出し元への `organizationGroupCd` 引き渡し

| 呼び出し元 | 修正内容 |
|---|---|
| `maimlApiService.ts` `saveMaiml()` | 引数に `organizationGroupCd?: string` 追加、`getOrganizationNamespaces` へ渡す |
| `XMLViewerWrapper.tsx` | Propsに `organizationGroupCd?: string` 追加、`getOrganizationNamespaces` へ渡す |
| `PetriNetEditorInner.tsx` | `saveMaiml` 呼び出しと `XMLViewerWrapper` へのProps渡しに `organizationGroupCd` を追加 |

### 方針C：バックエンド `buildMergedNamespaces()` の修正

1. `buildMergedNamespaces(organizationId, projectId)` にシグネチャ変更
2. 内部で `findProjectGroupCd()` を呼び `organization_group_cd` を取得
3. `findDeclarationsByProjectScope`（修正済みSQL）を利用するよう切り替え
4. `writeDataAndEventLog()` / `writeEventLogOnly()` の呼び出しに `projectId` を渡す

### 方針D：バックエンド `findDeclarationsByProjectScope.sql` の修正

WITH RECURSIVEを追加し、対象グループ + 祖先グループすべてのprefixを返すよう修正する。  
また**同一prefixが対象グループと祖先グループの両方に存在する場合は対象グループ（depth=0）のものを優先**する。

現状：`AND n.scope_key = $2`（完全一致）  
修正後：`DISTINCT ON (p.prefix) ... ORDER BY p.prefix ASC, depth ASC` でSQL側で対象グループ優先の重複除去を行う

### 方針E：フロントエンド `getOrganizationNamespaces()` の重複除去強化

`withAncestors: true` で取得した結果において、同一prefixが対象グループと祖先グループの両方にある場合、**対象グループ（depth=0）のものを優先**する。  
`findNamespacesByScopeKeyWithAncestors.sql` は現在 `ORDER BY p.prefix ASC` のみでdepth順が未保証のため、SQL側に `depth ASC` を追加し、アプリ側の先勝ちフィルタと組み合わせて対象グループ優先を保証する。

---

## 4. 変更ファイル一覧

### フロントエンド
| ファイル | 変更内容 |
|---|---|
| `frontend/src/services/namespaceApiService.ts` | `getOrganizationNamespaces()` に `organizationGroupCd` 引数追加、URI割り当てをscopeKey別に修正 |
| `frontend/src/services/maimlApiService.ts` | `saveMaiml()` に `organizationGroupCd` 引数追加 |
| `frontend/src/components/editorv2/XMLViewerWrapper.tsx` | Propsに `organizationGroupCd` 追加 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | `saveMaiml` 呼び出し・`XMLViewerWrapper` Propsに `organizationGroupCd` 追加 |

### バックエンド
| ファイル | 変更内容 |
|---|---|
| `backend/src/services/maimlWriterService.ts` | `buildMergedNamespaces()` を `projectId` 対応に修正 |
| `backend/src/sql/queries/namespace_terms/findDeclarationsByProjectScope.sql` | WITH RECURSIVE追加・DISTINCT ONで対象グループ優先の重複除去 |
| `backend/src/sql/queries/namespace_terms/findNamespacesByScopeKeyWithAncestors.sql` | `ORDER BY` に `depth ASC` を追加して対象グループ優先を保証 |

---

## 5. 影響範囲

- **`getOrganizationNamespaces` の他の呼び出し元**：`XMLViewerWrapper.tsx` と `maimlApiService.ts` のみ（修正対象のみ）
- **`saveMaiml` の他の呼び出し元**：`PetriNetEditorInner.tsx` のみ（修正対象のみ）
- **`findDeclarationsByProjectScope.sql` 変更**：`getDeclarationsByProject()` → `GET /api/v1/namespaces/project-declarations` にも影響するが、フロントから未使用のため実質的影響なし
- すべてのオプション引数は後方互換性を維持

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `organizationGroupCd` 未設定時の動作変化 | 中 | 低 | オプション引数として既存フォールバックを維持 |
| `fetchSuggestedUri` 複数回呼び出しによるAPIコール増加 | 低 | 高 | scopeKeyをキーとしたMapでキャッシュし重複排除 |
| `buildMergedNamespaces` 変更でprojectId不明の場合 | 中 | 低 | `findProjectGroupCd` がnullの場合は全件取得にフォールバック |

---

## 7. 実装ステップ（詳細チェックリスト）

### Step 1: バックエンド SQL修正
- [ ] `findDeclarationsByProjectScope.sql` にWITH RECURSIVEを追加し、`DISTINCT ON (p.prefix) ORDER BY p.prefix ASC, depth ASC` で対象グループ優先の重複除去
- [ ] `findNamespacesByScopeKeyWithAncestors.sql` の `ORDER BY` に `depth ASC` を追加（`ORDER BY p.prefix ASC, depth ASC`）

### Step 2: バックエンド `buildMergedNamespaces` 修正
- [ ] `maimlWriterService.ts` の `buildMergedNamespaces` を `projectId` 受け取りに変更
- [ ] 内部で `findProjectGroupCd()` を使いグループCDを取得し `findDeclarationsByProjectScope` へ切り替え
- [ ] `writeDataAndEventLog()` / `writeEventLogOnly()` の呼び出し箇所に `projectId` を渡す

### Step 3: フロントエンド `getOrganizationNamespaces` 修正
- [ ] `organizationGroupCd?: string` 引数追加
- [ ] `organizationGroupCd` が渡された場合はそちらをグループスコープ取得に優先使用
- [ ] `withAncestors: true` で返ってくる結果はSQL側でdepth順ソート済みのため、既存の先勝ちフィルタ（`seen` Set）でそのまま対象グループ優先となる
- [ ] scopeKey別URIをキャッシュ（`Map<scopeKey, uri>`）しながら各エントリに正しいURIを割り当て

### Step 4: フロントエンド `saveMaiml` 修正
- [ ] `maimlApiService.ts` の `saveMaiml()` に `organizationGroupCd?: string` 引数追加
- [ ] `getOrganizationNamespaces(organizationGroupCd)` へ渡す

### Step 5: フロントエンド `XMLViewerWrapper` 修正
- [ ] `XMLViewerWrapperProps` に `organizationGroupCd?: string` 追加
- [ ] `getOrganizationNamespaces(organizationGroupCd)` へ渡す

### Step 6: フロントエンド `PetriNetEditorInner` 修正
- [ ] `handleSaveConfirmAction` 内の `saveMaiml` 呼び出しに `organizationGroupCd` を渡す
- [ ] `XMLViewerWrapper` のPropsに `organizationGroupCd` を追加

---

## 8. テスト計画

- [ ] 親グループA → 子グループBの階層でプロジェクトがBに属する場合、B + A両方のprefixが宣言されること
- [ ] 各prefixのURIが属するグループのURIで正しく設定されること（BのprefixはBのURI、AのprefixはAのURI）
- [ ] 同一prefixが親子グループ両方に登録されている場合、**対象グループ（子グループB）のものが優先**され重複なく1件だけ宣言されること
- [ ] プロジェクトに属さないグループのprefixは宣言されないこと
- [ ] `organizationGroupCd` 未指定ケース（フォールバック）でもエラーにならないこと
- [ ] XMLビュー表示時のnamespace宣言が正しいこと
- [ ] 保存したMAIMLファイルのnamespace宣言が正しいこと

---

## 9. 承認記録
- **計画書提示日時**: 2026-09-09
- **承認日時**: 2026-09-09
- **承認者コメント**: 承認済み・実装完了

## 10. 実施記録

### 実施日時
開始: 2026-09-09  
完了: 2026-09-09

### 変更ファイル（実施結果）
1. `backend/src/sql/queries/namespace_terms/findDeclarationsByProjectScope.sql` — WITH RECURSIVE追加、DISTINCT ONで対象グループ（depth=0）優先の重複除去
2. `backend/src/sql/queries/namespace_terms/findNamespacesByScopeKeyWithAncestors.sql` — ORDER BYにdepth ASCを追加（サブクエリ形式）
3. `backend/src/services/maimlWriterService.ts` — `buildMergedNamespaces` を `projectId` 受け取りに変更、`findDeclarationsByProjectScope` 利用へ切り替え
4. `frontend/src/services/namespaceApiService.ts` — `getOrganizationNamespaces()` に `organizationGroupCd` 引数追加、個人スコープ取得削除、scopeKey別URI取得（Mapキャッシュ）に修正
5. `frontend/src/services/maimlApiService.ts` — `saveMaiml()` に `organizationGroupCd` 引数追加
6. `frontend/src/components/editorv2/XMLViewerWrapper.tsx` — Propsに `organizationGroupCd` 追加
7. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` — `saveMaiml` 呼び出しと `XMLViewerWrapper` Propsに `organizationGroupCd` を渡すよう修正

### TypeScript型チェック結果
- バックエンド: エラーなし (exit:0)
- フロントエンド: エラーなし (exit:0)
