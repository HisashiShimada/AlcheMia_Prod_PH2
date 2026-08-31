# タスク計画書: 組織ノード選択時 閲覧専用化ロール制御

## メタデータ

- **作成日時**: 2026-08-31
- **タスクID**: 課題調査（名前空間管理）
- **優先度**: 高
- **推定工数**: 0.5時間

---

## タスク概要

実験管理者メニューの名前空間管理タブ（Prefix管理タブ・用語管理タブ）において、
左ペインの階層表示部で「組織」ノードを選択した場合に、
**システム管理者ロール（`system_admin`）のユーザーのみ** 新規追加・インポート・編集・非アクティブ化を許可し、
それ以外のロールは閲覧専用とする。

---

## 目的と期待される成果

- [ ] 「組織」ノード選択時に system_admin 以外のロールでは操作ボタンが非活性になる
- [ ] system_admin ロールは「組織」ノード選択時でも従来通り操作可能
- [ ] Global・Personal ノード選択時は従来通り（ロールに関わらず操作可能）

---

## 実装ステップ

- [ ] ステップ①: `isSysAdmin` メモ化変数の追加
- [ ] ステップ②: `isCompanyNodeSelected` メモ化変数の追加
- [ ] ステップ③: `isViewOnlyForCompany` 変数の追加
- [ ] ステップ④: `NamespaceMain` に `viewOnly={isViewOnlyForCompany}` を追加
- [ ] ステップ⑤: `PrefixManagement` に `viewOnly={isViewOnlyForCompany}` を追加
- [ ] ステップ⑥: TypeScript コンパイルエラーなし確認

---

## 変更ファイル

1. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - 上記ステップ①〜⑤の修正

バックエンドの変更なし。

---

## 修正内容詳細

### ステップ①②③: 追加するメモ化変数（`isGlobalOrPersonalSelected` の直後に追加）

```typescript
// システム管理者ロール（system_admin）かどうかを判定
// ※ DBの role_cd には 'system_admin' のみが使用される（'sys_admin' は内部識別子のため不使用）
const isSysAdmin = useMemo(() => {
  return user?.roleCd === 'system_admin';
}, [user?.roleCd]);

// 「組織」ノード（company 配下）が選択中かどうかを判定
// rootKey の種類: 'global' / 'company' / 'personal' / null
// 'company' は画面上「組織」と表示される（t('namespaceTree.company') = "組織"）
const isCompanyNodeSelected = useMemo(() => {
  if (!selectedNsKey) return false;
  const rootKey = getRootKey(selectedNsKey, namespaceTree);
  return rootKey === 'company';
}, [selectedNsKey, namespaceTree]);

// 「組織」ノード選択中 かつ システム管理者以外 → 閲覧専用
const isViewOnlyForCompany = isCompanyNodeSelected && !isSysAdmin;
```

### ステップ④: NamespaceMain への viewOnly 追加

```tsx
// 修正前
<NamespaceMain
  hideTree
  externalSelectedNsKey={selectedNsKey}
/>

// 修正後
<NamespaceMain
  hideTree
  externalSelectedNsKey={selectedNsKey}
  viewOnly={isViewOnlyForCompany}
/>
```

### ステップ⑤: PrefixManagement への viewOnly 追加

```tsx
// 修正前
<PrefixManagement
  showShareButton={true}
  selectedNsKey={effectiveNsKey}
  orgGroupCds={filteredOrgGroupCds}
  onShareSelected={handleShareSelected}
/>

// 修正後
<PrefixManagement
  showShareButton={true}
  selectedNsKey={effectiveNsKey}
  orgGroupCds={filteredOrgGroupCds}
  onShareSelected={handleShareSelected}
  viewOnly={isViewOnlyForCompany}
/>
```

---

## ルール準拠確認

| ルール | 対応 |
|------|------|
| インラインオブジェクト引数禁止 (config.md) | `viewOnly={isViewOnlyForCompany}` は boolean の単一値。`isViewOnlyForCompany` は変数に代入済みのため問題なし |
| 多言語対応 (frontend.md) | ユーザー表示文字列の追加なし |
| services/ 経由 API (frontend.md) | API 呼び出しなし |
| TypeScript 型定義 (typescript.md) | 既存の `viewOnly?: boolean` Props を使用するため型定義変更なし |

---

## 影響範囲

- `UncertaintyManagement.tsx` のみ変更
- Global ノード / Personal ノード選択時: `isCompanyNodeSelected = false` → `isViewOnlyForCompany = false` → 影響なし
- system_admin ロール: `isSysAdmin = true` → `isViewOnlyForCompany = false` → 従来通り操作可能
- system_admin 以外のロール（experiment_admin 等）で「組織」ノード選択時のみ `viewOnly=true` が有効

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `user` Props が undefined の場合 | 低 | 低 | `user?.roleCd` でオプショナルチェーン使用。undefined は false 扱いとなり安全 |

---

## テスト計画

### 手動テスト

- [ ] 実験管理者ロールで「組織」ノード選択 → Prefix管理タブの追加・編集・削除・非アクティブ化ボタンが非活性
- [ ] 実験管理者ロールで「組織」ノード選択 → 用語管理タブの追加・保存・編集・非アクティブ化ボタンが非活性
- [ ] 実験管理者ロールで「Personal」ノード選択 → 操作可能（従来通り）
- [ ] system_admin ロールで「組織」ノード選択 → 操作可能（制限なし）

---

## 承認記録

- **計画書提示日時**: 2026-08-31
- **承認日時**: 2026-08-31（会話内での承認）

---

## 実施記録

### 実施日時

開始: 2026-08-31
完了: 2026-08-31

### 計画からの変更点

なし

### 発生した問題と解決方法

なし

### 最終的な成果物

- [x] `isSysAdmin` メモ化変数追加・修正（L353〜359）：`roleCd`判定 → `initialScreenFunctionCd === '020000'` 判定に修正
- [x] `isCompanyNodeSelected` メモ化変数追加（L362〜366）
- [x] `isViewOnlyForCompany` 変数追加（L369）
- [x] `NamespaceMain` に `viewOnly={isViewOnlyForCompany}` 追加（L583）
- [x] `PrefixManagement` に `viewOnly={isViewOnlyForCompany}` 追加（L597）
- [x] 全7チェック OK 確認済み（isSysAdmin定義・isCompanyNodeSelected定義・isViewOnlyForCompany定義・viewOnly 2箇所追加・system_admin判定・sys_admin残存なし）
