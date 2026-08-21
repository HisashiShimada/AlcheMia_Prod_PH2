# 組織グループセレクター UI設計書

## メタデータ
- **画面名**: 組織グループセレクター
- **物理名**: OrganizationGroupSelector.tsx
- **ファイルパス**: `frontend/src/components/format/OrganizationGroupSelector.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-14
- **最終更新日**: 2026-08-14
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

フォーマット管理画面内で使用される**組織階層グループを選択するための汎用セレクターコンポーネント**です。
`organization_group` テーブルのグループ一覧を取得し、ドロップダウンで選択できます。

### 1.2. アクセス権限

利用画面（フォーマット管理）に準じる。

### 1.3. 主要機能

1. 組織階層グループ一覧の取得・表示
2. グループの選択・クリア
3. 選択値の親コンポーネントへのコールバック

---

## 2. コンポーネント概要

```
[組織グループを選択 ▼]
  ├─ グループA（部門）
  ├─ グループB（チーム）
  └─ グループC（ラボ）
```

---

## 3. コンポーネント Props 定義

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `value` | `string \| null` | ❌ | 選択中グループCD |
| `onChange` | `(cd: string \| null) => void` | ✅ | 選択変更コールバック |
| `disabled` | `boolean` | ❌ | 非活性フラグ |
| `placeholder` | `string` | ❌ | プレースホルダーテキスト |
| `allowClear` | `boolean` | ❌ | クリアボタン表示（デフォルト: true）|
| `style` | `React.CSSProperties` | ❌ | スタイル上書き |

---

## 4. データ取得

| API | 取得タイミング |
|-----|--------------|
| `GET /api/v1/organization-groups` | マウント時（アクティブなグループのみ取得）|

---

## 5. 使用コンポーネント

- `Select`（Ant Design）- ドロップダウン選択
- `Spin` - ローディング中

---

## 6. 備考・注意事項

1. `attribute.organization_group_cd` および `project.organization_group_cd` に対応するセレクターとして使用。
2. `is_active=true` のグループのみを選択肢として表示。
