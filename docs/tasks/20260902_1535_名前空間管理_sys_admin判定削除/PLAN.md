# タスク計画書: 名前空間管理 sys_admin 判定削除

## メタデータ

- **作成日時**: 2026-09-02 15:35
- **タスクID**: 仕様変更（名前空間管理ロール制御廃止）
- **優先度**: 高
- **推定工数**: 0.5時間

---

## タスク概要

名前空間管理画面（実験管理者メニュー）の仕様変更。
「ロールの考え方を持たせない」という方針に基づき、`UncertaintyManagement.tsx` 内に存在する
システム管理者（sys_admin）かどうかの判定処理をすべて削除する。

新しいロール制御の考え方：
- **組織ノード（`'company'` ルート）**: ロール問わず常に閲覧モード
- **代表を務めるグループノード**: ロール問わず編集可能モード
- **メンバーとして属するグループノード**: ロール問わず閲覧モード
- **所属していないグループノード**: ツリーに表示しない

---

## 目的と期待される成果

- [ ] `isSysAdmin` 変数が削除され、sys_admin 判定コードが存在しない
- [ ] `isViewOnlyForCompany` が sys_admin に関わらず「組織ルートは常に閲覧」「代表グループのみ編集可」で動作する
- [ ] `UserNsRole` の import が削除される（未使用のため）
- [ ] `NamespaceMain.tsx` は変更しない（既存の sys_admin 処理はそのまま残す）
- [ ] TypeScript コンパイルエラーなし

---

## 実装ステップ

- [ ] ステップ①: `isSysAdmin` useMemo（L374〜376）を削除
- [ ] ステップ②: `isViewOnlyForCompany` から `if (isSysAdmin) return false;` を削除し、dependency 配列から `isSysAdmin` を除去
- [ ] ステップ③: L21 の import 文から `UserNsRole` を削除（未使用になるため）
- [ ] ステップ④: TypeScript コンパイルエラーなし確認

---

## 変更ファイル

1. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - 上記ステップ①〜③の修正

バックエンドの変更なし。`NamespaceMain.tsx` の変更なし。

---

## 修正内容詳細

### ステップ①: `isSysAdmin` 削除（L370〜376）

```typescript
// 削除対象
// システム管理者かどうかを判定
// roleCd はユーザーが任意に設定するロールコードのため判定に使用しない
// initialScreenFunctionCd はロールに紐づくシステム固定値（MENU_FUNCTION_IDS で定義）を使用する
// '020000' = system_admin に対応する初期画面機能CD
const isSysAdmin = useMemo(() => {
  return user?.initialScreenFunctionCd === '020000';
}, [user?.initialScreenFunctionCd]);
```

### ステップ②: `isViewOnlyForCompany` の修正

```typescript
// 修正前
const isViewOnlyForCompany = useMemo(() => {
  if (isSysAdmin) return false;
  if (selectedNsKey === 'company') return true;
  if (isOrgGroupNodeSelected) return !isRepresentativeOfSelected;
  return false;
}, [isSysAdmin, selectedNsKey, isOrgGroupNodeSelected, isRepresentativeOfSelected]);

// 修正後
const isViewOnlyForCompany = useMemo(() => {
  if (selectedNsKey === 'company') return true;
  if (isOrgGroupNodeSelected) return !isRepresentativeOfSelected;
  return false;
}, [selectedNsKey, isOrgGroupNodeSelected, isRepresentativeOfSelected]);
```

### ステップ③: import 文の修正（L21）

```typescript
// 修正前
import type { OrganizationGroupRow, UserNsRole } from '@/types/namespace';

// 修正後
import type { OrganizationGroupRow } from '@/types/namespace';
```

---

## 影響範囲

- `UncertaintyManagement.tsx` のみ変更
- `NamespaceMain.tsx` の既存 sys_admin 処理（`deriveUserNsRoleFromStorage`・`deriveNsKeyFromRole`・`filterTreeForUser` の `sys_admin` ブランチ）はそのまま残す
  - これらは `/namespace-management` 単独ページ専用の処理であり、`UncertaintyManagement` からは `hideTree=true` で呼ぶため画面表示に影響しない
- Global / Personal ノード選択時: `isViewOnlyForCompany = false` → 影響なし
- 組織ルート（`'company'`）選択時: ロール問わず `viewOnly=true` → 閲覧専用
- 所属グループ選択時: 代表者のみ編集可、メンバーは閲覧専用

---

## ルール準拠確認

| ルール | 対応 |
|------|------|
| インラインオブジェクト引数禁止 (config.md) | 既存の `viewOnly={isViewOnlyForCompany}` は変数渡しのため問題なし |
| 多言語対応 (frontend.md) | ユーザー表示文字列の追加なし |
| TypeScript 型定義 (typescript.md) | 未使用の import を削除するのみ。型定義の新規追加なし |

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `isSysAdmin` を参照している箇所の削除漏れ | 中 | 低 | 実装後に `isSysAdmin` の文字列検索で残存確認 |

---

## テスト計画

### 手動テスト

- [ ] 実験管理者ロール（system_admin 以外）で「組織」ルートノード選択 → Prefix管理タブ・用語管理タブのボタンが非活性（閲覧モード）
- [ ] 実験管理者ロール（system_admin 以外）で代表グループノード選択 → 編集可能モード
- [ ] 実験管理者ロール（system_admin 以外）でメンバーグループノード選択 → 閲覧モード
- [ ] system_admin ロールで「組織」ルートノード選択 → 閲覧モード（従来と異なる動作・仕様変更による意図した挙動）
- [ ] system_admin ロールで代表グループノード選択 → 編集可能モード
- [ ] Global / Personal ノード選択時 → 操作可能（従来通り）

---

## 承認記録

- **計画書提示日時**: 2026-09-02 15:35
- **承認日時**: （承認時に記入）
- **承認者コメント**: （フィードバックがあれば記入）

---

## 実施記録

### 実施日時

開始: 2026-09-02 15:35
完了: 2026-09-02 15:40

### 計画からの変更点

- L379 に残存していた旧コメント「組織ノード選択中 かつ システム管理者以外 → 閲覧専用（旧ロジック、以下の isViewOnlyForNode に統合）」も合わせて削除（コードの整合性向上のため）

### 発生した問題と解決方法

なし

### 最終的な成果物

- [x] `isSysAdmin` useMemo 削除（L370〜376、コメント含む）
- [x] `isViewOnlyForCompany` から `isSysAdmin` 依存除去（dependency 配列も修正）
- [x] `UserNsRole` import 削除（L21）
- [x] 旧コメント残骸（L379）削除
- [x] `isSysAdmin` / `UserNsRole` の残存なし確認済み
