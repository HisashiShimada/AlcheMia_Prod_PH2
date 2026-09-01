# タスク計画書: 名前空間管理 — グループ代表者の編集権限付与とメンバーグループのツリー表示修正

## メタデータ

- **作成日時**: 2026-08-31
- **タスクID**: 20260831_名前空間管理_グループ代表者編集権限とメンバーグループ表示修正
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

実験管理者メニューの名前空間画面において、以下2件の不具合を修正する。

| # | 不具合 | 重要度 |
|---|--------|--------|
| ① | グループの代表者（`chief_user_id`）がそのグループを左ペインで選択すると、編集・新規追加ボタンが非活性（閲覧モード）になる | 高 |
| ② | グループ代表者以外のユーザーでログインすると、所属するグループが左ペインの階層表示部に表示されない | 高 |

### 期待する動作

| ユーザー種別 | 期待する動作 |
|---|---|
| グループの代表者（`chief_user_id`） | そのグループを選択したとき、prefix・用語の追加・編集が可能（編集モード） |
| グループの一般メンバー | そのグループを選択したとき、閲覧のみ（ボタン非活性） |
| どちらのユーザーも | 所属するグループが左ペインの階層表示部に表示される |

---

## 2. 根本原因

### 不具合①：代表者なのに閲覧モードになる

**原因の連鎖：**

```
organization_group テーブルの chief_user_id（代表者）は、
JWTの organizationGroupCds には含まれない。
（organizationGroupCds は organization_group_user テーブルの
 メンバー登録に基づいて発行される）

↓

NamespaceMain.tsx の deriveUserNsRoleFromStorage() は
organizationGroupCds が空 → kind: 'member' と判定。

↓

getOrganizationGroups() は chiefUserId フィルタで呼ばれるため
「代表グループ」は orgGroups に入るが…

↓

filterTreeForUser() の member ブランチは
「自分の userId に一致するノードへの祖先パスのみ表示」する処理のため、
company 配下のグループノードは userId と一致せず非表示になる。

↓

さらに viewOnly の制御ロジックが「代表者かどうか」を考慮していないため、
仮にグループが表示されても編集ボタンが非活性のまま。
```

**核心問題：** 「グループの代表者（`chief_user_id`）かどうか」を判定するロジックが存在しない。

### 不具合②：一般メンバーのグループが表示されない

**原因の連鎖：**

```
NamespaceMain 初期化時の getOrganizationGroups() 呼び出し（約726行目）

↓ バックエンドコントローラー (organizationGroupController.ts 72〜77行目)

const chiefUserId = req.user!.userId;  // chiefUserId フィルタで絞込
→ ログインユーザーが chief_user_id のグループのみ返す

↓

一般メンバー（代表者でないユーザー）→ orgGroups = []
→ namespaceTree.company.children = []（空）
→ 所属グループが表示されない
```

**核心問題：** フロントエンドの `getOrganizationGroups()` がデフォルトで `chiefUserId` フィルタを使用しているため、代表者でないメンバーのグループが取得されない。既にバックエンドには `?memberOf=true` オプション（所属グループ＋祖先グループを返す）が実装済みだが、フロントエンドで未利用。

---

## 3. 修正方針

### 方針概要

```
修正後のデータフロー:

初期化時:
  ① getOrganizationGroups()                        → 自分が chief のグループ一覧
  ② getOrganizationGroups(undefined,{memberOf:true}) → 自分がメンバーのグループ＋祖先グループ
  ↓
  両者をマージ → orgGroups にセット（重複はグループCDで除去）
  ① の結果から chiefGroupCds（Set<string>）を生成・保持

ノード選択時:
  isRepresentativeOfSelected = chiefGroupCds.has(effectiveNsKey)
  isOrgGroupNodeSelected     = 固定キー・personal- 以外のノード選択中
  effectiveViewOnly = viewOnly || (isOrgGroupNodeSelected && !isRepresentativeOfSelected)

ボタン制御:
  disabled={effectiveViewOnly || ...}
  → 代表者：effectiveViewOnly = false → 編集可能
  → 一般メンバー：effectiveViewOnly = true → 閲覧のみ

ツリー表示:
  filterTreeForUser に allowedGroupCds（マージ済み全グループCDのSet）を渡す
  → 代表グループ＋メンバーグループの両方がツリーに表示される
```

### `UserNsRole.kind` の選択肢と現在の判定ロジック

| `kind` | 意味 | `deriveUserNsRoleFromStorage` での生成条件 |
|---|---|---|
| `'sys_admin'` | システム管理者 | `roleCd` が `'sys_admin'` または `'system_admin'` |
| `'dept_owner'` | グループメンバー（名前に注意: 代表者ではない） | `organizationGroupCds` に1件以上ある |
| `'team_owner'` | （将来拡張用）型定義のみ存在 | 現在のコードでは生成されない |
| `'member'` | グループ未所属 | `organizationGroupCds` が空 |

> **重要**: `'dept_owner'` という名前だが実際には「メンバーとして所属しているグループがある」という意味。代表者かどうかとは無関係。

### `effectiveNsKey` の取りうる値

| 値のパターン | 意味 |
|---|---|
| `null` | 未選択 |
| `'global'` | Global ルートノード |
| `'ns-maiml'` | maiml グローバルプレフィックスノード |
| `'ns-xsi'` | xsi グローバルプレフィックスノード |
| `'company'` | 組織ルートノード |
| `'personal'` | Personal ルートノード |
| `'personal-{userId}'` | 特定ユーザーの Personal ノード |
| **任意のグループCD文字列** | `organization_group.organization_group_cd`（例: `'dept-rd'`） |

orgグループノードであることの判定は、上記の固定キーと `personal-` プレフィックスを除外することで行う。

---

## 4. 実装ステップ

- [ ] **Phase 1**: `NamespaceMain.tsx` — `chiefGroupCds` 状態の追加
- [ ] **Phase 2**: `NamespaceMain.tsx` — グループ取得ロジックを二重API呼び出し＋マージに変更
- [ ] **Phase 3**: `NamespaceMain.tsx` — `isRepresentativeOfSelected` の追加
- [ ] **Phase 4**: `NamespaceMain.tsx` — `isOrgGroupNodeSelected` / `effectiveViewOnly` の追加
- [ ] **Phase 5**: `NamespaceMain.tsx` — ボタン制御を `viewOnly` → `effectiveViewOnly` に置き換え（6箇所）
- [ ] **Phase 6**: `NamespaceMain.tsx` — `filterTreeForUser` に `allowedGroupCds` 引数を追加（シグネチャ・dept_owner・member ブランチ）
- [ ] **Phase 7**: `NamespaceMain.tsx` — `treeData` の useMemo 内で `allowedGroupCds` を渡すよう修正
- [ ] **Phase 8**: TypeScript コンパイルエラーなし確認・動作確認

---

## 5. 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/src/components/namespace/NamespaceMain.tsx` | Phase 1〜7 の全修正 |

バックエンドの変更なし。

---

## 6. 実装詳細

### Phase 1: `chiefGroupCds` 状態の追加

追加場所: `orgGroups` ステートの直後

```typescript
// ログインユーザーが代表者（chief_user_id）であるグループCDの集合
const [chiefGroupCds, setChiefGroupCds] = useState<Set<string>>(new Set());
```

---

### Phase 2: グループ取得ロジックの変更（旧726行目の useEffect）

```typescript
// 変更後: 代表グループ + メンバーグループを並列取得してマージ
useEffect(() => {
  Promise.all([
    getOrganizationGroups(),                               // ① chiefUserId フィルタ（代表グループ）
    getOrganizationGroups(undefined, { memberOf: true }), // ② 所属グループ＋祖先グループ
  ])
    .then(([chiefGroups, memberGroups]) => {
      // 代表グループCDを Set として保存（編集権限判定に使用）
      setChiefGroupCds(new Set(chiefGroups.map((g) => g.organization_group_cd)));
      // 重複を organization_group_cd で除去してマージ
      const mergedMap = new Map<string, OrganizationGroupRow>();
      [...chiefGroups, ...memberGroups].forEach((g) =>
        mergedMap.set(g.organization_group_cd, g)
      );
      const mergedGroups = Array.from(mergedMap.values());
      setOrgGroups(mergedGroups);
      // ツリー構築・初期選択（既存ロジックを維持）
      const orgTree = buildOrgTree(mergedGroups);
      const fullTree: NamespaceNode[] = NAMESPACE_TREE_RAW.map((n) =>
        n.key === 'company' ? { ...n, children: orgTree } : n
      );
      const allowedCds = new Set(mergedGroups.map((g) => g.organization_group_cd));
      const filteredTree = filterTreeForUser(fullTree, currentUserNsKey, currentUserRole, allowedCds);
      const companyNode = filteredTree.find((n) => n.key === 'company');
      const leafKey = companyNode?.children ? findDeepestLeafKey(companyNode.children) : null;
      if (leafKey) {
        setSelectedNsKey(leafKey);
        onNsKeyChange?.(leafKey);
      }
    })
    .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

---

### Phase 3: `isRepresentativeOfSelected` の追加

追加場所: `isCompanyNodeSelected` の useMemo の直後

```typescript
// 選択中のノードに対してログインユーザーが代表者（chief_user_id）かどうか
const isRepresentativeOfSelected = useMemo(() => {
  if (!effectiveNsKey) return false;
  return chiefGroupCds.has(effectiveNsKey);
}, [effectiveNsKey, chiefGroupCds]);
```

---

### Phase 4: `isOrgGroupNodeSelected` / `effectiveViewOnly` の追加

追加場所: `isRepresentativeOfSelected` の直後

```typescript
// orgグループノード判定用固定キー集合（コンポーネント外に定数として定義）
const STATIC_NS_KEYS_FOR_VIEW_ONLY = new Set(
  ['global', 'ns-maiml', 'ns-xsi', 'company', 'personal']
);

// orgグループノード（company 配下のグループノード）が選択中かどうか
const isOrgGroupNodeSelected = useMemo(() => {
  if (!effectiveNsKey) return false;
  if (STATIC_NS_KEYS_FOR_VIEW_ONLY.has(effectiveNsKey)) return false;
  if (effectiveNsKey.startsWith('personal-')) return false;
  return true;
}, [effectiveNsKey]);

// 実効的な閲覧専用フラグ
// - 外部 props の viewOnly=true は常に優先
// - orgグループノード選択中 かつ 自分が代表者でない場合は閲覧専用
const effectiveViewOnly = viewOnly || (isOrgGroupNodeSelected && !isRepresentativeOfSelected);
```


---

### Phase 5: ボタン制御の `viewOnly` → `effectiveViewOnly` 置き換え（6箇所）

| 対象箇所 | 変更前 | 変更後 |
|---|---|---|
| インポートボタン | `disabled={viewOnly}` | `disabled={effectiveViewOnly}` |
| エクスポートボタン | `disabled={viewOnly}` | `disabled={effectiveViewOnly}` |
| 用語を追加ボタン | `disabled={viewOnly \|\| availablePrefixOptions.length === 0}` | `disabled={effectiveViewOnly \|\| availablePrefixOptions.length === 0}` |
| 保存ボタン | `disabled={viewOnly \|\| newTerms.length === 0 \|\| ...}` | `disabled={effectiveViewOnly \|\| newTerms.length === 0 \|\| ...}` |
| キャンセルボタン | `disabled={viewOnly \|\| newTerms.length === 0}` | `disabled={effectiveViewOnly \|\| newTerms.length === 0}` |
| `actionCell` 内 `readonly` | `\|\| viewOnly` | `\|\| effectiveViewOnly` |

---

### Phase 6: `filterTreeForUser` の修正

#### 6-1. シグネチャに `allowedGroupCds` 引数を追加

```typescript
// 変更後
const filterTreeForUser = (
  nodes: NamespaceNode[],
  _userNsKey: string,
  role: UserNsRole,
  allowedGroupCds?: Set<string>  // 追加: 表示を許可するグループCDの集合
): NamespaceNode[] => {
```

#### 6-2. `dept_owner` ブランチの修正

```typescript
// 変更前
if (c.key === role.deptKey) {
  acc.push({ ...c });
} else if (c.children) {

// 変更後（allowedGroupCds が渡された場合はその Set で判定、未指定時は従来の deptKey で判定）
const isAllowed = allowedGroupCds ? allowedGroupCds.has(c.key) : c.key === role.deptKey;
if (isAllowed) {
  acc.push({ ...c });
} else if (c.children) {
```

#### 6-3. `member` ブランチの修正

```typescript
// 変更後（.filter の末尾に allowedGroupCds のチェックを追加）
.filter((n) => {
  if (n.key === 'global') return true;
  if (n.key === 'personal') return true;
  if (n.key === 'company') return true;
  if (n.key === userNsKey) return true;
  if (ancestorKeys.has(n.key)) return true;
  // 追加: allowedGroupCds に含まれるグループノードも表示（所属グループ・代表グループ）
  if (allowedGroupCds && allowedGroupCds.has(n.key)) return true;
  return false;
})
```

---

### Phase 7: `treeData` の useMemo 内の呼び出し修正

```typescript
// 変更前（約1366行目）
const filteredTree = filterTreeForUser(namespaceTree, currentUserNsKey, currentUserRole);

// 変更後
const allowedGroupCds = new Set(orgGroups.map((g) => g.organization_group_cd));
const filteredTree = filterTreeForUser(namespaceTree, currentUserNsKey, currentUserRole, allowedGroupCds);
```

---

## 7. 影響範囲

| ケース | 修正前 | 修正後 |
|---|---|---|
| 代表者がそのグループを選択 | 閲覧モード（ボタン非活性） | **編集モード（ボタン活性）** |
| 一般メンバーがそのグループを選択 | 表示されない or 閲覧モード | **表示され、閲覧モード**（ボタン非活性） |
| 一般メンバーがログイン | グループがツリーに表示されない | **グループがツリーに表示される** |
| sys_admin / system_admin | 全ノード表示・全操作可能 | 変化なし |
| Global / Personal ノード選択 | 操作可能 | 変化なし |
| `viewOnly=true` で外部呼び出し | 全体閲覧専用 | 変化なし（`effectiveViewOnly` が `viewOnly` を優先） |

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `getOrganizationGroups({memberOf:true})` が失敗した場合 | 中 | 低 | `Promise.all` の `.catch()` で空ツリーのまま継続（既存と同じ挙動） |
| `filterTreeForUser` の `allowedGroupCds` が空のとき | 低 | 低 | `allowedGroupCds` 未指定時は従来の `deptKey` 判定にフォールバックするため安全 |
| `treeData` useMemo 内で `allowedGroupCds` を毎回再生成するコスト | 低 | 低 | `orgGroups` が変化するタイミングは初期ロード時のみのため実用上問題なし |

---

## 9. テスト計画

### 手動テスト（不具合①：代表者の編集権限）

- [ ] グループの代表者アカウントでログイン
- [ ] 左ペインでそのグループのノードを選択
- [ ] 「用語を追加」ボタンが活性状態であること
- [ ] 「保存」「キャンセル」ボタンが活性状態であること
- [ ] 「インポート」「エクスポート」ボタンが活性状態であること
- [ ] 用語を実際に追加・編集できること

### 手動テスト（不具合②：一般メンバーのグループ表示）

- [ ] グループの一般メンバーアカウントでログイン
- [ ] 左ペインの階層表示部に所属グループが表示されること
- [ ] そのグループを選択すると閲覧モード（ボタン非活性）であること

### 手動テスト（回帰確認）

- [ ] sys_admin / system_admin ロールで全ノードが表示・操作可能なこと
- [ ] Global ノード選択時は従来通り（GlobalNamespaceView が表示される）
- [ ] Personal ノード / Personal 配下ユーザーノード選択時は従来通り操作可能
- [ ] `viewOnly=true` で外部呼び出し時は引き続き全体閲覧専用
- [ ] `/namespace-management` ページ（NamespaceMain 単独利用）が正しく動作すること

---

## 10. ロールバック計画

1. `NamespaceMain.tsx`: `chiefGroupCds` 状態を削除
2. `NamespaceMain.tsx`: `useEffect` を単一の `getOrganizationGroups()` 呼び出しに戻す
3. `NamespaceMain.tsx`: `isRepresentativeOfSelected` / `isOrgGroupNodeSelected` / `effectiveViewOnly` を削除
4. `NamespaceMain.tsx`: ボタン6箇所の `effectiveViewOnly` を `viewOnly` に戻す
5. `NamespaceMain.tsx`: `filterTreeForUser` の `allowedGroupCds` 引数を削除
6. `NamespaceMain.tsx`: `treeData` useMemo の呼び出しを元に戻す

---

## 11. 規約適合確認

| 規約 | 結果 | 備考 |
|---|---|---|
| services/ 経由必須（直接 API 呼び出し禁止） | ✅ 準拠 | `getOrganizationGroups()` は `namespaceApiService` 経由 |
| 型定義ファイルへの集約 | ✅ 準拠 | 新規型定義の追加なし（`OrganizationGroupRow` は既存） |
| インラインオブジェクト引数禁止 | ✅ 準拠 | `allowedCds`・`mergedGroups`・`allowedGroupCds` を変数に代入してから渡す |
| コメントは日本語 | ✅ 準拠 | 追加コメントはすべて日本語 |
| 多言語対応（翻訳キー） | ✅ 準拠 | 新規表示文字列の追加なし |

---

## 12. 承認記録

- **計画書提示日時**: 2026-08-31

---

## 13. 実施記録

（実装後に記入）

### 実施日時

開始: 2026-08-31
完了: 2026-08-31

### 計画からの変更点

- `ShareTarget` / `ShareSourceRole` 型が import 文に不足していたため、インポートリストに追加した（既存バグの修正を兼ねる）

### 発生した問題と解決方法

- `tsc --noEmit` で `NamespaceMain.tsx` の `ShareTarget` / `ShareSourceRole` に関するエラーが発生したが、これは今回の変更とは無関係の既存エラーであったため、import 文に追加して解消した

### 最終的な成果物

- [x] Phase 1: `chiefGroupCds` 状態追加（620行目）
- [x] Phase 2: グループ取得ロジックを `Promise.all` による二重API呼び出し＋マージに変更（735〜772行目）
- [x] Phase 3: `isRepresentativeOfSelected` useMemo 追加（1224〜1229行目）
- [x] Phase 4: `isOrgGroupNodeSelected` useMemo / `effectiveViewOnly` 追加（1231〜1244行目）
- [x] Phase 5: ボタン制御6箇所の `viewOnly` → `effectiveViewOnly` 置き換え（1712行目・2117〜2134行目）
- [x] Phase 6: `filterTreeForUser` に `allowedGroupCds` 引数追加・dept_owner ブランチ修正・member ブランチ修正（368行目・398〜400行目・472〜473行目）
- [x] Phase 7: `treeData` useMemo 内の呼び出しに `allowedGroupCds` を追加（1412〜1413行目）
- [x] Phase 8: TypeScript コンパイルエラーなし確認（`NamespaceMain.tsx` に関するエラーゼロ）
- [x] 追加: `ShareTarget` / `ShareSourceRole` を import 文に追加（43〜44行目）

---

### 追加実施（UncertaintyManagement.tsx の修正）

実験管理者メニューの名前空間タブは `NamespaceMain.tsx` 直接ではなく `UncertaintyManagement.tsx` 経由で表示されており、左ペインのツリーとグループ取得・viewOnly 判定が `UncertaintyManagement.tsx` 側で行われていたため、追加で以下を修正した。

- [x] `chiefGroupCds` 状態追加（251〜252行目）
- [x] グループ取得を `Promise.all` による二重API呼び出し＋マージに変更（275〜303行目）
- [x] `isOrgGroupNodeSelected` / `isRepresentativeOfSelected` / `isViewOnlyForCompany` の判定ロジックを代表者ベースに変更（389〜407行目）
- [x] TypeScript コンパイルエラーなし確認（`UncertaintyManagement.tsx` に関するエラーゼロ）
