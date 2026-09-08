# タスク計画書: NamespaceMain 不具合修正（3件）

## メタデータ
- **作成日時**: 2026-09-07 00:00
- **タスクID**: 20260907_0000_NamespaceMain不具合修正
- **優先度**: 高
- **推定工数**: 1時間

---

## タスク概要

`NamespaceMain` 関連コンポーネントで確認された以下3件の不具合を修正する。

---

## 不具合詳細と修正方針

### 🐛 不具合1：Prefix管理タブ — 編集可能な行のチェックボックスが非活性

**ファイル**: `frontend/src/components/namespace/PrefixManagement.tsx`
**箇所**: L1035〜1045（`getCheckboxProps`）

**原因**:
```tsx
const isCurrentNodeRow = currentScopeKey != null && r.scopeKey === currentScopeKey;
return { disabled: isAncestorRow || isCurrentNodeRow };
```
`isCurrentNodeRow`（現在選択ノードと同じ scopeKey を持つ行）を `disabled: true` にしており、編集可能なPrefixのチェックボックスまで非活性になっている。

**修正方針**:
`isCurrentNodeRow` を `disabled` 条件から除外する。
```tsx
// 修正後
return { disabled: isAncestorRow };
```

---

### 🐛 不具合2：用語管理タブ — 編集不可の行のチェックボックスが活性

**ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`
**箇所**: L2358（`getCheckboxProps`）

**原因**:
```tsx
getCheckboxProps: (record: Term | NewTermRow) => ({ disabled: '_rowId' in record }),
```
新規入力行（`_rowId`あり）のみを `disabled` にしており、読み取り専用・非アクティブ・システムNS・上位層の用語行への `disabled` 設定が欠落している。

**修正方針**:
`actionCell` と同等の判定ロジックを `getCheckboxProps` に追加する。
- `isSystemNs`（システム名前空間行）は disabled
- `isAncestorTerm`（上位層用語行）は disabled
- `isReadonlyPrefix`（読み取り専用 Prefix）かつ `isCompanyNodeSelected` でない場合は disabled
- `effectiveViewOnly`（閲覧専用モード）は disabled

```tsx
getCheckboxProps: (record: Term | NewTermRow) => {
  if ('_rowId' in record) return { disabled: true };
  const term = record as Term;
  const isSystemNs = term.prefix === SYSTEM_NAMESPACE_PREFIX;
  const currentScopeKey = effectiveNsKey
    ? effectiveNsKey.replace(/^personal-/, '')
    : null;
  const isAncestorTerm =
    isCompanyNodeSelected &&
    currentScopeKey != null &&
    term.scopeKey != null &&
    term.scopeKey !== currentScopeKey;
  const isReadonly =
    isSystemNs ||
    isAncestorTerm ||
    (!isCompanyNodeSelected && isReadonlyPrefix(term.prefix)) ||
    effectiveViewOnly;
  return { disabled: isReadonly };
},
```

---

### 🐛 不具合3：用語管理タブ — 単位ドロップダウンに `scaleFactor` 等が含まれる

**原因**:
`GET /api/v1/master/attribute` が `attribute_name` パラメータを受け付けておらず、全種別のレコードを返している。フロントエンドもフィルタなしで全件を単位リストとして使用するため、`unit` 以外の属性種別（`scaleFactor` 等）の値が混入する。

**修正方針**:
取得する段階で `attribute_name = 'unit'` に絞り込む。フロントエンドからAPIへ `attribute_name=unit` クエリパラメータを渡し、バックエンド（Route → Controller → Service → Repository → SQL）を通じてDBレベルでフィルタリングする。

#### 修正ファイル詳細

**(A) Route**: `backend/src/routes/masterRoutes.ts`
- `attribute_name` クエリパラメータのバリデーションを追加

**(B) Controller**: `backend/src/controllers/masterController.ts`
- `req.query` から `attribute_name` を取り出して `filters` に追加

**(C) Service**: `backend/src/services/masterService.ts`
- `filters` の型に `attributeName?: string` を追加し Repository へ渡す

**(D) Repository**: `backend/src/repositories/attributeRepository.ts`
- `filters.attributeName` が指定された場合に `AND a.attribute_name = $n` 条件を動的追加

**(E) Frontend Service**: `frontend/src/services/namespaceApiService.ts`
- `getAttributeMaster()` のリクエストURLに `?attribute_name=unit` を追加
- `AttributeMaster` 型の `attributeName` フィールドはもう不要になるが、既存の型定義との整合性を確認

---

## 変更ファイル一覧

| # | ファイルパス | 変更概要 |
|---|------------|---------|
| 1 | `frontend/src/components/namespace/PrefixManagement.tsx` | `getCheckboxProps` から `isCurrentNodeRow` 条件を除外 |
| 2 | `frontend/src/components/namespace/NamespaceMain.tsx` | `getCheckboxProps` に読み取り専用判定を追加 |
| 3 | `backend/src/routes/masterRoutes.ts` | `attribute_name` クエリパラメータのバリデーション追加 |
| 4 | `backend/src/controllers/masterController.ts` | `attribute_name` を `filters` に追加 |
| 5 | `backend/src/services/masterService.ts` | `filters` 型に `attributeName` 追加・Repository へ連携 |
| 6 | `backend/src/repositories/attributeRepository.ts` | `attributeName` フィルタの動的SQL追加 |
| 7 | `frontend/src/services/namespaceApiService.ts` | `getAttributeMaster()` に `?attribute_name=unit` を追加 |

---

## 影響範囲

- **Prefix管理タブ**: チェックボックスの活性/非活性制御のみ変更。既存の共有（Share）操作・編集・無効化には影響なし。
- **用語管理タブ（チェックボックス）**: チェックボックスの活性/非活性制御のみ変更。一括操作（共有・無効化）は引き続き `selectedTermIds` をベースに動作。
- **用語管理タブ（単位）**: 単位ドロップダウンの表示内容変更。`attribute_name = 'unit'` のレコードのみ表示されるようになる。

## リスク

| リスク | 対策 |
|--------|------|
| `attributeName` フィールドが `namespaceApiService.ts` の `AttributeMaster` 型に未定義の場合 | 型定義を確認・追加してから実装 |
| `isCurrentNodeRow` を除外したことで意図しない行が共有操作の対象になる | 動作確認で検証 |

## テスト計画

- [ ] Prefix管理タブ：選択中ノードのPrefixのチェックボックスが活性になっていることを確認
- [ ] Prefix管理タブ：上位層（祖先グループ）のPrefixのチェックボックスが非活性のままであることを確認
- [ ] 用語管理タブ：システムNS・読み取り専用・非活性・上位層用語行のチェックボックスが非活性になることを確認
- [ ] 用語管理タブ：通常の編集可能行のチェックボックスが活性のままであることを確認
- [ ] 用語管理タブ：単位ドロップダウンに `scaleFactor` 等の不要な値が含まれないことを確認
- [ ] TypeScript コンパイルエラーがないことを確認

## 承認記録
- **計画書提示日時**: 2026-09-07 00:00
- **承認日時**: 2026-09-07
- **承認者コメント**: 承認

## 実施記録
### 実施日時
開始: 2026-09-07
完了: 2026-09-07

### 最終的な成果物
- [x] 不具合1: `PrefixManagement.tsx` - `getCheckboxProps` から `isCurrentNodeRow` 条件を除外
- [x] 不具合2: `NamespaceMain.tsx` - `getCheckboxProps` に読み取り専用判定を追加
- [x] 不具合3 (A): `backend/masterRoutes.ts` - `attribute_name` バリデーション追加
- [x] 不具合3 (B): `backend/masterController.ts` - `attribute_name` → `filters` に追加
- [x] 不具合3 (C): `backend/masterService.ts` - `filters` 型に `attributeName` 追加
- [x] 不具合3 (D): `backend/attributeRepository.ts` - 動的SQL条件追加
- [x] 不具合3 (E): `frontend/namespaceApiService.ts` - `?attribute_name=unit&is_active=true` パラメータ追加
- [x] 不具合3 (F): `NamespaceMain.tsx` - フロント側の冗長な `.filter(isActive)` を削除
- [x] フロントエンド TypeScript コンパイルエラーなし (exit: 0)
- [x] バックエンド TypeScript コンパイルエラーなし (exit: 0)
