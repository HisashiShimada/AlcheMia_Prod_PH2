# 組織グループセレクター UI設計書

## メタデータ
- **画面名**: 組織グループセレクター
- **物理名**: OrganizationGroupSelector.tsx
- **ファイルパス**: `frontend/src/components/format/OrganizationGroupSelector.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-14
- **最終更新日**: 2026-08-20
- **担当者**: Development Team
- **バージョン**: 1.1.0

---

## 1. 画面概要

### 1.1. 目的

フォーマット管理画面内で使用される**組織階層グループを選択するための汎用セレクターコンポーネント**です。
`organization_group` テーブルのグループ一覧を取得し、**ログインユーザーが所属しているグループのみ**をドロップダウンで選択できます。

### 1.2. アクセス権限

利用画面（フォーマット管理）に準じる。

### 1.3. 主要機能

1. 組織階層グループ一覧の取得（APIマウント時）
2. ログインユーザーの所属グループ（`userGroupCds`）のみに絞り込んで表示
3. グループの選択・親コンポーネントへのコールバック
4. 所属グループが1件のみの場合はSelectを`disabled`にして操作不能

---

## 2. コンポーネント概要

```
[TeamOutlined アイコン] [組織グループ ▼]
  ├─ グループA名称（cd_a）
  ├─ グループB名称（cd_b）
  └─ グループC名称（cd_c）
```

- ラベル形式: `{organization_group_name}（{organization_group_cd}）`
- 未取得時: `organization_group_cd` をそのままラベルに表示

---

## 3. コンポーネント Props 定義

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `value` | `string` | ✅ | 選択中グループCD |
| `onChange` | `(cd: string) => void` | ✅ | 選択変更コールバック |
| `userGroupCds` | `string[]` | ✅ | ログインユーザーの所属グループCD一覧（絞り込み用） |

> **注意**: `disabled`・`placeholder`・`allowClear`・`style` はPropsとして公開されていません。
> `disabled` は内部ロジック（`options.length <= 1`）で自動制御されます。
> `placeholder` は `useLanguage` の翻訳キー `formatManagement.organization_group_placeholder` を使用します。

---

## 4. 内部型定義

```typescript
interface OrgGroupRecord {
  organization_group_cd: string;
  organization_group_name: string;
}
```

---

## 5. データ取得

| API | 取得タイミング | 補足 |
|-----|--------------|------|
| `GET /api/v1/organization-groups` | マウント時（`useEffect`） | `createApiClient` 経由でリクエスト |

**レスポンス形式:**
```typescript
{
  success: boolean;
  data: OrgGroupRecord[];
}
```

**絞り込みロジック:**
1. APIから全グループ一覧を取得（`allGroups`）
2. `userGroupCds` に含まれるCDのみを `filteredGroups` として抽出
3. `userGroupCds` の順序でオプションリストを構築

---

## 6. disabled制御

| 条件 | Select状態 |
|------|-----------|
| `options.length <= 1` | `disabled`（操作不能） |
| `options.length >= 2` | 操作可能 |

---

## 7. 使用コンポーネント・ライブラリ

| ライブラリ | 使用要素 | 用途 |
|-----------|---------|------|
| Ant Design | `Select` | ドロップダウン選択 |
| Ant Design | `Space` | レイアウト（ラベルとSelectの横並び） |
| Ant Design | `Typography.Text` | ラベルテキスト表示 |
| Ant Design | `theme` | デザイントークン（フォントサイズ・ウェイト） |
| Ant Design Icons | `TeamOutlined` | ラベルアイコン |
| `@/utils/authUtils` | `createApiClient` | API呼び出し |
| `@/contexts/LanguageContext` | `useLanguage` | 翻訳テキスト取得 |

---

## 8. 備考・注意事項

1. `attribute.organization_group_cd` および `project.organization_group_cd` に対応するセレクターとして使用。
2. `is_active=true` のグループのみを選択肢として表示する制御はバックエンド側で行う（フロントは全件受け取り後 `userGroupCds` で絞り込む）。
3. `loading` 中は Select に `loading` プロパティを渡してスピナーを表示する（`Spin` コンポーネントは使用しない）。

---

## 9. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-08-14 | 初版作成 | Development Team |
| 2026-08-20 | ソース実装と照合し全面改訂: Props定義修正（userGroupCds追加・disabled等削除）・disabled制御ロジック追加・使用コンポーネント修正（Spin→theme/Space/Typography/TeamOutlined）・内部型定義追加 | Cline |
