# タスク計画書: 名前空間ツリー表示修正・API化・共通化

## メタデータ
- **作成日時**: 2026-07-27 13:55
- **タスクID**: 名前空間ツリー表示修正
- **優先度**: 高
- **推定工数**: 10時間（Phase 1〜8 合算）

## タスク概要

名前空間管理タブの左ペイン階層ツリーおよび部署管理タブに関する一連の修正・改善を行う。

1. **部署管理タブ API接続実装**（Phase 1・完了済み）: DepartmentTreeManagement のモック除去・organization_group API接続
2. **階層表示 設計・実装乖離修正**（Phase 2・完了済み）: prefix/uri/description 列削除・groupCd 入力化・chief_user_id 自動セット
3. **ロール判定バグ修正**（Phase 3・完了済み）: `buildUserRole()` の誤判定で実験管理者に1部署しか表示されなかった問題を修正
4. **現状調査**（Phase 4・完了済み）: 階層表示のデータ取得方法・リアルタイム性を調査
5. **モック除去・API化 Phase1**（Phase 5）: `effectiveTree` state 導入・不要コンポーネント削除
6. **モック除去・API化 Phase2**（Phase 6）: `NAMESPACE_TREE_RAW` を完全に動的ツリーへ置き換え・モックファイル削除
7. **共通コンポーネント化**（Phase 7）: `NamespaceTreePanel.tsx` を新規作成し `NamespaceMain` と `UncertaintyManagement` で共用
8. **Personal階層 個人名前空間表示**（Phase 8）: ログインユーザーの個人名前空間を Personal ノード配下に動的表示

---

## Phase 1: 部署管理タブ API接続実装（完了済み）

### 目的
名前空間管理タブ内の「部署管理」タブ（`DepartmentTreeManagement`）がモックJSONを直接参照しており、バックエンドAPIに接続されていなかった。バックエンドの `organization_group` APIは実装済みのため、フロントエンドをAPI接続に切り替えた。

### 期待された成果
- `DepartmentTreeManagement` がモックJSONではなく実際のDBデータを表示する
- 追加・編集・削除操作がDBに反映される
- `DepartmentNodeAddDialog` のAPI呼び出しを `namespaceApiService` 経由に統一する

### 実装ステップ
- [x] `frontend/src/types/namespace.ts` に `OrganizationGroupRow` 型を追加
- [x] `frontend/src/services/namespaceApiService.ts` に organization_group CRUD関数を追加
  - `getOrganizationGroups(search?: string)`
  - `createOrganizationGroup(data)`
  - `updateOrganizationGroup(groupCd, data)`
  - `deleteOrganizationGroup(groupCd)`
- [x] `DepartmentTreeManagement.tsx` のモックJSONインポートを削除、`useEffect` でAPIからデータ取得、編集・削除操作をAPI呼び出しに変更
- [x] `DepartmentNodeAddDialog.tsx` の `fetch()` 直接呼び出しを `createOrganizationGroup()` に変更、モックフォールバックを削除

### 変更ファイル
1. `frontend/src/types/namespace.ts` - OrganizationGroupRow型追加
2. `frontend/src/services/namespaceApiService.ts` - organization_group API関数追加
3. `frontend/src/components/namespace/DepartmentTreeManagement.tsx` - API接続
4. `frontend/src/components/namespace/DepartmentNodeAddDialog.tsx` - API接続

---

## Phase 2: 階層表示 設計・実装乖離修正（完了済み）

### 目的
名前空間管理タブ内の階層表示（`DepartmentTreeManagement`）について、設計書（§13）と実装の間に複数の乖離があったため修正した。

### 乖離一覧（修正対象）

| # | 優先度 | 乖離内容 |
|---|--------|---------|
| 1 | 🔴 高 | フロントエンドが `organization_group` に存在しない `prefix` / `uri` / `description` フィールドを参照・送信（DBに追加するのではなくフロントエンドから削除） |
| 2 | 🔴 高 | `organization_group_cd` が `dept-{timestamp}` という仮実装 |
| 3 | 🔴 高 | `chief_user_id` が空文字で送信（NOT NULL制約違反リスク） |
| 4 | 🟡 中 | URI自動生成の引数が設計書（3引数）と実装（2引数）で異なる |
| 5 | 🟡 中 | 設計書のAPIエンドポイントが旧名称のまま（`department-nodes` → `organization-groups`） |
| 6 | 🟢 低 | データソース説明がモック前提のまま（設計書の §13.9 が古い） |

### 実装ステップ
- [x] `frontend/src/types/namespace.ts` の `OrganizationGroupRow` / `CreateOrganizationGroupRequest` / `UpdateOrganizationGroupRequest` 型から `prefix` / `uri` / `description` フィールドを削除
- [x] `frontend/src/services/namespaceApiService.ts` の `createOrganizationGroup()` / `updateOrganizationGroup()` の送信ボディから `prefix` / `uri` / `description` を削除
- [x] `DepartmentTreeManagement.tsx` から「Prefix」「名前空間URI」「説明」テーブル列を削除、`editValues` から `prefix/description` を削除
- [x] `DepartmentNodeAddDialog.tsx` から `prefix/description` 入力フィールドを削除、`organization_group_cd` をユーザー入力フィールドに変更、`chief_user_id` 送信を削除
- [x] `backend/src/controllers/organizationGroupController.ts` — create時に `chief_user_id` を `req.user` から自動セット
- [x] `backend/src/services/organizationGroupService.ts` — `updateOrganizationGroup()` シグネチャを変更し `chief_user_id` を既存レコードから維持するよう修正
- [x] 設計書 `ui_namespace_main.md` §13.10 APIエンドポイント表を更新（`department-nodes` → `organization-groups`）

### 変更ファイル
1. `frontend/src/types/namespace.ts` - prefix/uri/description フィールド削除、chief_user_id を optional に変更
2. `frontend/src/services/namespaceApiService.ts` - 送信ボディから prefix/uri/description を削除
3. `frontend/src/components/namespace/DepartmentTreeManagement.tsx` - Prefix・URI・説明列削除
4. `frontend/src/components/namespace/DepartmentNodeAddDialog.tsx` - prefix/description フィールド削除、groupCd をユーザー入力化
5. `backend/src/controllers/organizationGroupController.ts` - chief_user_id 自動セット
6. `backend/src/services/organizationGroupService.ts` - chief_user_id を既存レコードから維持
7. `docs/design/ui/experiment_admin/04_namespace_management/ui_namespace_main.md` - §13 各セクション更新

---

## Phase 3: ロール判定バグ修正・visibilitychange 追加（完了済み）

### 根本原因
`buildUserRole()` が `roleCd` を無視し、`organizationGroupCds` の有無だけでロールを判定していたため、
実験管理者（ROLE004）が `organizationGroupCds: ['DEP004']` を持つことで `team_owner` と誤判定され、
`DEP004` の1件だけに絞り込まれていた。

### 実装ステップ
- [x] 調査・原因特定完了
- [x] `buildUserRole()` に `roleCd` 判定を追加（ROLE005のみ team_owner、それ以外は sys_admin）
- [x] `visibilitychange` イベントで再フェッチを追加
- [x] `uncertainty-scope.json` の依存を `NamespaceMain.tsx` 内のインライン定数 `NAMESPACE_TREE_RAW` に置き換え

### 変更ファイル
1. `frontend/src/components/namespace/NamespaceMain.tsx` - buildUserRole修正・再フェッチ追加・uncertainty-scope.json依存除去

---

## Phase 4: 階層表示調査（完了済み）

### 調査結果サマリー

#### データ取得方法
| ノード種別 | データソース | 取得タイミング |
|---|---|---|
| company 配下 | `organization_group` テーブル（DB） | コンポーネント初回マウント時のみ |
| Global / Personal | `uncertainty-scope.json`（モック）| ビルド時（静的インポート） |

#### マージ処理
```
mergedTree = [Global（モック）, company（APIデータ or モック）, Personal（モック）]
```
`apiCompanyChildren` が null（未取得・失敗）の間はモックデータで表示される。

#### リアルタイム性
- 組織グループの変更: **ページリロードが必要**（useEffect 依存配列が `[]`）
- 用語の件数バッジ: `terms` ステートから動的計算されるため**自分の操作は即時反映**

---

## Phase 5: effectiveTree 導入・不要ファイル削除

### 目的
- `namespaceTreeRaw` への直接参照を `effectiveTree` state に統一する
- 未使用コンポーネント（`DepartmentTreeManagement.tsx` / `DepartmentNodeAddDialog.tsx`）を削除

### 実装ステップ

#### 5-1. 不要ファイル削除
- [ ] `frontend/src/components/namespace/DepartmentTreeManagement.tsx` を削除（どこからも import されていないことを確認）
- [ ] `frontend/src/components/namespace/DepartmentNodeAddDialog.tsx` を削除（どこからも import されていないことを確認）

#### 5-2. effectiveTree state の導入
```typescript
// 初期値はモック JSON そのまま（Global / Personal ノードは引き続きモックを使用）
const [effectiveTree, setEffectiveTree] = useState<NamespaceNode[]>(
  namespaceTreeRaw as NamespaceNode[]
);

// API 取得完了時に company 配下のみ差し替え
useEffect(() => {
  if (!apiCompanyChildren || apiCompanyChildren.length === 0) return;
  setEffectiveTree((prev) =>
    prev.map((n) =>
      n.key === 'company' ? { ...n, children: apiCompanyChildren } : n
    )
  );
}, [apiCompanyChildren]);
```

#### 5-3. namespaceTreeRaw 直参照箇所を effectiveTree に差し替え（10箇所）
- [ ] `filterTreeForUser` 呼び出し箇所（複数）
- [ ] `isGlobalOrPersonalSelected` useMemo
- [ ] `isCompanyNodeSelected` useMemo
- [ ] `ancestorPrefixesForSelected` useMemo
- [ ] `isPersonalSelected` useMemo
- [ ] `currentUserOrgPrefix` useMemo
- [ ] `shareSourceRole` useMemo
- [ ] `shareScopeNodes` useMemo
- [ ] `teamOwnerReadonlyPrefixes` useMemo
- [ ] `getRelatedPrefixes()` 関数に `tree: NamespaceNode[]` 引数を追加して `effectiveTree` を渡す形に変更

### 変更ファイル
#### 削除
1. `frontend/src/components/namespace/DepartmentTreeManagement.tsx`
2. `frontend/src/components/namespace/DepartmentNodeAddDialog.tsx`
#### 修正
1. `frontend/src/components/namespace/NamespaceMain.tsx` - effectiveTree 追加・namespaceTreeRaw 直参照除去

---

## Phase 6: NAMESPACE_TREE_RAW を完全に動的ツリーへ置き換え・モックファイル削除

### 目的
- `NAMESPACE_TREE_RAW` ハードコード定数を廃止し、`organization-groups` API から取得したデータで動的にツリーを構築する
- 使用されなくなったモックJSONファイルをすべて削除する

### 実装ステップ

#### 6-1. NamespaceMain.tsx の修正
- [ ] `orgGroups` state と `treeLoading` state を追加
- [ ] マウント時に `getOrganizationGroups()` を呼び出す `useEffect` を追加
- [ ] フラットリスト → ツリー変換関数 `buildOrgTree` を追加

```typescript
const buildOrgTree = (groups: OrganizationGroupRow[]): NamespaceNode[] => {
  const map = new Map<string, NamespaceNode>();
  const roots: NamespaceNode[] = [];
  for (const g of groups) {
    map.set(g.organization_group_cd, {
      key: g.organization_group_cd,
      label: g.organization_group_name,
      count: 0,
      children: [],
    });
  }
  for (const g of groups) {
    const node = map.get(g.organization_group_cd)!;
    if (g.parent_group_cd && map.has(g.parent_group_cd)) {
      map.get(g.parent_group_cd)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  const stripEmpty = (nodes: NamespaceNode[]): NamespaceNode[] =>
    nodes.map((n) => ({
      ...n,
      children: n.children && n.children.length > 0 ? stripEmpty(n.children) : undefined,
    }));
  return stripEmpty(roots);
};
```

- [ ] `NAMESPACE_TREE_RAW` を `useMemo` で動的ツリーを生成する `namespaceTree` に変更（`company.children` に `buildOrgTree(orgGroups)` を使用）
- [ ] ファイル内の `NAMESPACE_TREE_RAW` 参照箇所をすべて `namespaceTree` に置き換え

#### 6-2. TeamManagementPanel.tsx のモック依存除去
- [ ] `import teamsMockRaw from '../../../mock/namespace/department-unit-members.json'` を削除
- [ ] DUMMY_TEAMS のモックメンバーデータを空配列に変更（API接続が未実装のため）

#### 6-3. モックファイル削除（参照がないことを確認後）
- [ ] `frontend/mock/namespace/uncertainty-scope.json`
- [ ] `frontend/mock/namespace/department-unit-members.json`
- [ ] `frontend/mock/namespace/terms.json`
- [ ] `frontend/mock/namespace/declaredNamespaces.json`
- [ ] `frontend/mock/uncertainty-scope.json`

### 変更ファイル
#### 修正
1. `frontend/src/components/namespace/NamespaceMain.tsx` - NAMESPACE_TREE_RAW を動的ツリーに置き換え
2. `frontend/src/components/namespace/TeamManagementPanel.tsx` - モックimportを削除
#### 削除
1. `frontend/mock/namespace/uncertainty-scope.json`
2. `frontend/mock/namespace/department-unit-members.json`
3. `frontend/mock/namespace/terms.json`
4. `frontend/mock/namespace/declaredNamespaces.json`
5. `frontend/mock/uncertainty-scope.json`

### 技術詳細

#### organization_group テーブルのカラム構成
| カラム | 型 | 説明 |
|---|---|---|
| `organization_group_cd` | VARCHAR | グループコード（PK） |
| `organization_group_name` | VARCHAR | グループ名 |
| `chief_user_id` | VARCHAR | 代表者ユーザーID |
| `parent_group_cd` | VARCHAR | 親グループコード（NULL=ルート） |
| `layer` | VARCHAR | 階層ラベル（dept/group等） |

#### API
- `GET /api/v1/organization-groups` → `OrganizationGroupRow[]`
- `namespaceApiService.getOrganizationGroups()` として実装済み

### リスク
| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| `NAMESPACE_TREE_RAW` 参照箇所の置き換え漏れ | 高 | 中 | search_files で全参照箇所を確認してから修正 |
| モックファイル削除後にビルドエラー | 高 | 低 | 削除前に全参照を検索で確認 |
| `buildOrgTree` の空childrenでAnt Design Treeが展開アイコンを表示 | 中 | 中 | `children: undefined` に統一する処理を追加 |

---

## Phase 7: NamespaceTreePanel 共通コンポーネント化

### 目的
`NamespaceMain.tsx` と `UncertaintyManagement.tsx` で二重実装されている左ペインのツリー表示ロジックを
`NamespaceTreePanel.tsx` として共通コンポーネントに抽出し、両画面から再利用する。

### 期待される成果
- [ ] 左ペインツリーのロジックが1箇所に集約される
- [ ] `UncertaintyManagement.tsx` のインライン `NamespaceNode` 型定義が削除される
- [ ] `UncertaintyManagement.tsx` の重複 `filterTreeForUser` が削除される
- [ ] 両画面のツリー表示が同一ロジックで動作する
- [ ] レイアウトは変更しない（左ペイン幅240px維持）

### 実装ステップ

#### 7-1. NamespaceTreePanel.tsx を新規作成
- [ ] `frontend/src/components/namespace/NamespaceTreePanel.tsx` を作成
  - `NamespaceMain` の左ペインで使用しているロジックを移植
  - `getOrganizationGroups()` API呼び出し
  - `filterTreeForUser()` によるロールベースフィルタリング
  - `renderTreeTitle()` / `toAntTree()` によるツリーデータ構築
  - 右クリックメニュー（TeamAddDialog / TeamEditDialog）
  - Props: `selectedNsKey`, `onNsKeyChange`, `terms`（件数表示用・optional）

#### 7-2. NamespaceMain.tsx の左ペインを NamespaceTreePanel に置き換え
- [ ] 左ペインの Tree JSX を `<NamespaceTreePanel>` に置き換え
- [ ] 左ペイン関連の state / ロジックを NamespaceTreePanel.tsx に移動済みのものを削除

#### 7-3. UncertaintyManagement.tsx の左ペインを NamespaceTreePanel に置き換え
- [ ] インライン `NamespaceNode` 型定義を削除 → `@/types/namespace` からimport
- [ ] `filterTreeForUser()` 等の重複ロジックを削除
- [ ] 重複している `TeamAddDialog` / `TeamEditDialog` の呼び出しを削除
- [ ] `namespaceTreeRaw` import を削除
- [ ] 左ペインの Tree JSX を `<NamespaceTreePanel>` に置き換え

### 変更ファイル
#### 新規作成
1. `frontend/src/components/namespace/NamespaceTreePanel.tsx` - 共通ツリーパネルコンポーネント
#### 修正
1. `frontend/src/components/namespace/NamespaceMain.tsx` - 左ペインを NamespaceTreePanel に置き換え
2. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - 重複コードを削除し NamespaceTreePanel に置き換え

---

## Phase 8: Personal階層 個人名前空間 API化

### 目的
- 現在 Personal ノードの `children` が空配列で固定されている
- ログインユーザーに紐づく名前空間をAPIから取得して Personal ノード配下に表示する

### 期待される成果
- [ ] Personal ノード配下にログインユーザーの名前空間が一覧表示される
- [ ] 各子ノードのラベルは `organization_user.user_name` を表示する
- [ ] モック定数 `CURRENT_USER_NS_KEY` を API ベースの実装に置き換える

### 実装ステップ

#### Phase 8-1: バックエンド実装
- [ ] `namespaceTermRepository.ts` に `findNamespacesByScopeKey()` を追加
  - `namespace` テーブルと `organization_user` テーブルを JOIN
  - `scope_key = userId` でフィルタ
  - `user_name` をレスポンスに含める

```sql
SELECT
  n.namespace_id,
  n.uri,
  n.scope_key,
  n.global_flg,
  ou.user_name
FROM namespace n
LEFT JOIN organization_user ou
  ON n.organization_id = ou.organization_id
  AND n.scope_key = ou.user_id
WHERE n.organization_id = $1
  AND n.scope_key = $2
ORDER BY n.namespace_id
```

- [ ] `namespaceController.ts` の `getNamespaces` に `?scopeKey=` クエリパラメータ対応を追加
  - `scopeKey` が指定された場合は `findNamespacesByScopeKey()` を呼び出す

#### Phase 8-2: フロントエンド実装
- [ ] `namespaceApiService.ts` に `getPersonalNamespaces(userId: string)` を追加
  - `GET /api/v1/namespaces?scopeKey={userId}` を呼び出す
- [ ] `UncertaintyManagement.tsx`（Phase 7 後は `NamespaceTreePanel.tsx`）の Personal ノードを動的構築
  - `localStorage.getItem('userInfo')` から `userId` を取得
  - `useEffect` で `getPersonalNamespaces(userId)` を呼び出し
  - レスポンスを `NamespaceNode[]` に変換して `personalChildren` ステートにセット
  - モック定数 `CURRENT_USER_NS_KEY` を削除

#### ツリー表示イメージ
```
Personal 👤
  └── 山田太郎  （← user_name、key: namespace_id）
```

### API 仕様

**エンドポイント**: `GET /api/v1/namespaces?scopeKey={userId}`
**レスポンス**:
```json
{
  "namespaces": [
    {
      "namespace_id": "ns001",
      "uri": "https://www.myco.jp/user/yamada/",
      "scope_key": "user001",
      "global_flg": false,
      "user_name": "山田太郎"
    }
  ]
}
```

### 変更ファイル
1. `backend/src/repositories/namespaceTermRepository.ts` - `findNamespacesByScopeKey()` 追加
2. `backend/src/controllers/namespaceController.ts` - `scopeKey` クエリパラメータ対応追加
3. `frontend/src/services/namespaceApiService.ts` - `getPersonalNamespaces()` 追加
4. `frontend/src/components/namespace/NamespaceTreePanel.tsx`（または `UncertaintyManagement.tsx`）- Personal ノード動的構築

### リスク
| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| userId が userInfo に含まれていない | 中 | 低 | null チェックを実装し、undefined の場合は Personal ノードを空のまま表示 |
| scope_key が userId 以外の値が混在 | 低 | 低 | `scope_key = userId` で厳密にフィルタするため影響なし |

---

## テスト計画

### Phase 5〜6
- [ ] sys_admin ロールでログインし、全部署・全チームがツリーに表示される
- [ ] dept_owner ロールで自部署のみ表示される
- [ ] member ロールで自ノードへの祖先パスのみ表示される
- [ ] バッジの件数（用語数）が正しく更新される
- [ ] ビルドエラーが出ないこと

### Phase 7
- [ ] NamespaceMain と UncertaintyManagement の両方で左ペインが正常表示される
- [ ] 右クリックメニュー（グループ追加・編集）が動作する

### Phase 8
- [ ] ログイン済み状態で名前空間管理タブを開き、Personal ノード配下にユーザー名が表示される
- [ ] 個人名前空間が0件の場合、Personal ノードが空（子なし）で表示される
- [ ] API エラー時にコンソールエラーが出るが画面がクラッシュしないことを確認

---

## 承認記録
- **承認日時**: 2026-07-27 13:55
