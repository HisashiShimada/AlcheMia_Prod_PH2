# タスク計画書: 名前空間ツリー 組織名表示・選択連動実装

## メタデータ
- **作成日時**: 2026-08-03 14:21
- **タスクID**: 名前空間ツリー組織名表示・選択連動
- **優先度**: 高
- **推定工数**: 4.5時間

## タスク概要

名前空間管理タブの左ペインツリーに対して、以下2点を実装する。

1. **組織名表示**: `company` ノードが固定ラベル「組織」と表示されている問題を修正し、`organization_display_name` を取得して実際の組織名を表示する。
2. **ツリー選択連動**: 階層ツリー（DepartmentTreeManagement）でノードを選択した際に、選択した名前空間（organization_group_cd）に紐づく Prefix 管理・用語管理のデータが右ペインに表示されるよう実装する。現在はツリー選択に関係なく、組織全体の全データが表示されている状態。

---

## 現状調査結果

### コンポーネント構成

```
NamespaceMain.tsx
├── DepartmentTreeManagement.tsx   ← 左ペイン：階層ツリー（organization_group ベース）
├── PrefixManagement.tsx           ← 右ペイン：Prefix 一覧
└── TermManagement.tsx             ← 右ペイン：用語一覧
```

### DepartmentTreeManagement の現状

- `organization_group` テーブルのデータをツリー表示
- ノード選択時のコールバック (`onSelect`) は **定義されているが NamespaceMain に伝搬されていない**
- 選択ノードの `organization_group_cd` を外部に渡す手段がない

### PrefixManagement の現状

- `selectedNsKey` Props は型定義（`PrefixManagementProps`）に存在する
- ただし実際には `selectedNsKey` を使ったフィルタリングが **未実装** または **組織全体取得のまま**
- API 呼び出し: `namespaceApiService.fetchPrefixes()` が `scopeKey` パラメータを受け取れるか要確認

### TermManagement の現状

- `selectedNsKey` Props が存在するか不明（要確認）
- API 呼び出し: `namespaceApiService.fetchTerms()` が `scopeKey` パラメータを受け取れるか要確認

### namespaceApiService の現状

- `fetchPrefixes(scopeKeys?: string[])` の引数対応は **部分的に実装済み**（前タスクで追加済みの可能性あり）
- バックエンド側の `GET /api/v1/namespaces/prefixes?scopeKey=xxx` の対応が必要

### バックエンドの現状

- `namespaceController.ts` に `getPrefixes` エンドポイントが存在
- `namespace` テーブルに `scope_key` カラムがあり、organization_group_cd に対応
- `findNamespacesByScopeKey.sql` が存在 → scopeKey でのフィルタ SQL は既にある
- 用語側: `findAllByOrganization.sql` は全組織取得のみ（scopeKey フィルタなし）

---

## 修正の方針

### ツリー選択 → Prefix/用語 の連動フロー

```
DepartmentTreeManagement
  ↓ onNodeSelect(organizationGroupCd: string | null)
NamespaceMain
  ↓ state: selectedScopeKey
  ↓ props: selectedNsKey={selectedScopeKey}
PrefixManagement / TermManagement
  ↓ useEffect([selectedNsKey]) → API 再フェッチ
  ↓ GET /api/v1/namespaces/prefixes?scopeKey={selectedNsKey}
  ↓ GET /api/v1/namespaces/terms?scopeKey={selectedNsKey}
```

- ツリー **非選択時**（selectedScopeKey = null）→ **組織全体**のデータを表示
- ツリー **選択時** → 選択 scopeKey に紐づくデータのみ表示

---

## 実装ステップ

### Phase 0: 組織名表示

- [ ] `frontend/src/services/namespaceApiService.ts` に `getOrganizationDisplayName()` 関数を追加
- [ ] `frontend/src/components/namespace/NamespaceMain.tsx` に `companyLabel` state を追加
- [ ] useEffect で `getOrganizationDisplayName()` を呼び出し、`companyLabel` にセット
- [ ] `company` ノードのラベルを固定値「組織」から `companyLabel` に変更

### Phase 1: DepartmentTreeManagement → NamespaceMain への選択連動

- [ ] `DepartmentTreeManagement.tsx` に `onNodeSelect?: (scopeKey: string | null) => void` Props を追加
- [ ] ツリーの行クリック時に `organization_group_cd` を `onNodeSelect` コールバックで通知
- [ ] `NamespaceMain.tsx` に `selectedScopeKey` state を追加
- [ ] `<DepartmentTreeManagement onNodeSelect={(key) => setSelectedScopeKey(key)} />` を設定

### Phase 2: PrefixManagement の連動

- [ ] `NamespaceMain.tsx` から `<PrefixManagement selectedNsKey={selectedScopeKey} />` を渡す
- [ ] `PrefixManagement.tsx` 内の `useEffect` に `selectedNsKey` を依存配列に追加
- [ ] `selectedNsKey` が変わったら `namespaceApiService.fetchPrefixes(selectedNsKey)` を再呼び出し
- [ ] `namespaceApiService.fetchPrefixes` の引数に `scopeKey?: string | null` を追加（未対応の場合）

### Phase 3: TermManagement の連動

- [ ] `NamespaceMain.tsx` から `<TermManagement selectedNsKey={selectedScopeKey} />` を渡す
- [ ] `TermManagement.tsx` 内の `useEffect` に `selectedNsKey` を依存配列に追加
- [ ] `selectedNsKey` が変わったら `namespaceApiService.fetchTerms(selectedNsKey)` を再呼び出し

### Phase 4: namespaceApiService の scopeKey 対応

- [ ] `fetchPrefixes(scopeKey?: string | null)` のクエリパラメータ送信確認
- [ ] `fetchTerms(scopeKey?: string | null)` のクエリパラメータ送信確認・追加

### Phase 5: バックエンド Prefix エンドポイントの scopeKey フィルタ対応

- [ ] `namespaceController.ts` の `getPrefixes` ハンドラで `req.query.scopeKey` を受け取る
- [ ] `namespaceService.ts` の `getPrefixes` 関数に `scopeKey` 引数を追加
- [ ] `scopeKey` がある場合 `findNamespacesByScopeKey.sql` を使用（既存）
- [ ] `scopeKey` がない場合 `findAll.sql` または `findAllByOrganization.sql` を使用

### Phase 6: バックエンド 用語エンドポイントの scopeKey フィルタ対応

- [ ] `namespaceController.ts` の `getTerms` ハンドラで `req.query.scopeKey` を受け取る
- [ ] `namespaceService.ts` の `getTerms` 関数に `scopeKey` 引数を追加
- [ ] `namespaceTermRepository.ts` に `findTermsByScopeKey` 関数を追加
- [ ] SQL ファイル `findTermsByScopeKey.sql` を新規作成

---

## 変更ファイル一覧

### フロントエンド

| ファイル | 変更内容 |
|----------|---------|
| `frontend/src/services/namespaceApiService.ts` | `getOrganizationDisplayName()` 関数追加・`fetchPrefixes`/`fetchTerms` に `scopeKey` 引数追加 |
| `frontend/src/components/namespace/NamespaceMain.tsx` | `companyLabel` state追加 + useEffect + ノードラベル変更・`selectedScopeKey` state 追加・子コンポーネントへ伝搬 |
| `frontend/src/components/namespace/DepartmentTreeManagement.tsx` | `onNodeSelect` Props 追加・ツリークリックで emit |
| `frontend/src/components/namespace/PrefixManagement.tsx` | `selectedNsKey` 変化で API 再フェッチ |
| `frontend/src/components/namespace/TermManagement.tsx` | `selectedNsKey` Props 追加・変化で API 再フェッチ |
| `frontend/src/types/namespace.ts` | `PrefixManagementProps` に `ancestorScopeKeys` 追加（既存の props 型と統合済み） |

### バックエンド

| ファイル | 変更内容 |
|----------|---------|
| `backend/src/controllers/namespaceController.ts` | `getPrefixes` / `getTerms` に `scopeKey` クエリ受け取り |
| `backend/src/services/namespaceService.ts` | `getPrefixes` / `getTerms` に `scopeKey` 引数追加 |
| `backend/src/repositories/namespaceTermRepository.ts` | `findTermsByScopeKey` 関数追加 |
| `backend/src/sql/queries/namespace_terms/findTermsByScopeKey.sql` | 新規作成 |

---

## 技術的詳細

### DepartmentTreeManagement の onNodeSelect 実装イメージ

```tsx
// DepartmentTreeManagement.tsx
interface DepartmentTreeManagementProps {
  onNodeSelect?: (scopeKey: string | null) => void;
  // ... 既存 props
}

// ツリー行クリック時
const handleRowClick = (record: FlatDeptRow) => {
  onNodeSelect?.(record.key); // record.key = organization_group_cd
};

// 選択解除時
const handleDeselect = () => {
  onNodeSelect?.(null);
};
```

### NamespaceMain の selectedScopeKey state 追加イメージ

```tsx
// NamespaceMain.tsx
const [selectedScopeKey, setSelectedScopeKey] = useState<string | null>(null);

// DepartmentTreeManagement に渡す
<DepartmentTreeManagement
  onNodeSelect={(key) => setSelectedScopeKey(key)}
/>

// PrefixManagement に渡す
<PrefixManagement
  selectedNsKey={selectedScopeKey}
  scopeKey={selectedScopeKey}
/>

// TermManagement に渡す
<TermManagement
  selectedNsKey={selectedScopeKey}
/>
```

### PrefixManagement の再フェッチ実装イメージ

```tsx
// PrefixManagement.tsx
useEffect(() => {
  fetchData(); // selectedNsKey が変わるたびに再取得
}, [selectedNsKey]);

const fetchData = async () => {
  const data = await namespaceApiService.fetchPrefixes(selectedNsKey ?? undefined);
  setRows(data);
};
```

### findTermsByScopeKey.sql（新規）

```sql
-- 特定スコープキーに紐づく用語を取得
SELECT
  nt.namespace_term_id,
  nt.prefix,
  nt.local_name,
  nt.display_name,
  nt.description,
  nt.type_hint,
  nt.unit_hint,
  nt.is_active
FROM namespace_term nt
INNER JOIN namespace n ON nt.namespace_id = n.namespace_id
WHERE n.organization_id = $1
  AND n.scope_key = $2
ORDER BY nt.prefix, nt.local_name
```

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| DepartmentTreeManagement の行クリック実装が現状ツリー表示専用で onSelect が未配線 | 中 | 既存の行ハイライト実装（前タスク実装済み）を流用する |
| TermManagement に selectedNsKey Props が未定義 | 低 | 型定義追加と Props 受け取りのみで対応可能 |
| バックエンド API の scopeKey フィルタが未実装 | 高 | findNamespacesByScopeKey.sql が既存のため Prefix は対応しやすい |

---

## テスト計画

- [ ] `company` ノードのラベルが実際の組織名に変わっていることを確認
- [ ] ツリーで組織グループを選択 → Prefix 一覧が絞り込まれることを確認
- [ ] ツリーで組織グループを選択 → 用語一覧が絞り込まれることを確認
- [ ] ツリーの選択を解除 → 全データが表示されることを確認
- [ ] 選択ノードに Prefix/用語が登録されていない場合 → 空テーブルが表示されることを確認

---

## 承認記録

- **計画書提示日時**: 2026-08-03 14:21
- **承認日時**: 2026-08-03 14:28
