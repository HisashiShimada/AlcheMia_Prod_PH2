# タスク計画書: Prefix管理編集ボタン非活性と保存失敗修正

## メタデータ
- **作成日時**: 2026-09-29 16:00
- **タスクID**: 20260929_1600
- **優先度**: 高
- **推定工数**: 1時間

---

## 1. タスク概要

実験管理者メニュー > 名前空間管理タブ > Prefix管理 において以下2件の不具合を修正する。

| # | 不具合 | 画面 |
|---|--------|------|
| ① | 編集ボタン押下時に Prefix 入力欄が非活性（disabled）になっており変更できない | PrefixManagement.tsx |
| ② | 説明を修正して保存ボタンを押すと「Prefix の更新に失敗しました」が表示される | PrefixManagement.tsx + バックエンド |

---

## 2. 根本原因

### 不具合①：Prefix が非活性

**ファイル**: `frontend/src/components/namespace/PrefixManagement.tsx` 694行

```tsx
// 現在（バグあり）
return r.id === editingId ? (
  <Input disabled size="small" value={editingValues.prefix} />  ← disabled が付いている
```

UI設計書（`ui_prefix_management.md` §3）では「prefix・説明の変更」が可能と明記されているが、
実装では `disabled` が付いているため編集不可。

---

### 不具合②：保存失敗（HTTP 500）

**根本原因**: `updatePrefix.sql` の WHERE 句に `namespace_id` が含まれていないため、
同一 prefix が複数スコープ（異なる namespace_id）に登録されている場合、
複数行がマッチして `t.oneOrNone()` が例外スローされ HTTP 500 となる。

**証拠（エビデンス画像）**: `testDup` が「テスト上位グループ」と「テスト下位グループ」の
2スコープに存在 → `WHERE prefix = 'testDup'` が 2 行マッチ → `t.oneOrNone()` エラー

**問題のSQL** (`updatePrefix.sql`):
```sql
WHERE organization_id = $3
  AND prefix          = $4   ← namespace_id が未指定 → 複数行マッチ可能
```

**フローチャート（修正前）**:
```
フロント saveEdit()
  └─ PATCH /namespaces/:prefix
     body: { description }
       ↓
namespaceController.updateNamespace
       ↓
namespaceTermRepository.updateNamespace
       ↓
updatePrefix.sql
  WHERE org_id=? AND prefix=?
  ← 複数行マッチ → t.oneOrNone() 例外 ❌
       ↓
HTTP 500 → 「更新に失敗しました」
```

**フローチャート（修正後）**:
```
フロント saveEdit()
  └─ PATCH /namespaces/:prefix
     body: { description, scopeKey }  ← scopeKey を追加送信
       ↓
namespaceController.updateNamespace
  scopeKey を受け取る
       ↓
namespaceService.updateNamespace
  scopeKey を Repository に渡す
       ↓
namespaceTermRepository.updateNamespace
  findNamespaceIdByScopeKey で namespace_id 取得
       ↓
updatePrefix.sql
  WHERE org_id=? AND prefix=? AND namespace_id=?  ← 1行のみマッチ ✅
       ↓
HTTP 200 → 「更新に成功しました」
```

---

## 3. 修正ファイル一覧

| # | ファイル | 種別 | 修正内容 |
|---|---------|------|---------|
| 1 | `frontend/src/components/namespace/PrefixManagement.tsx` | 修正 | ① Prefix の `disabled` 削除 ② `editingScopeKey` state 追加 ③ saveEdit に scopeKey 含める |
| 2 | `backend/src/types/api.ts` | 修正 | `UpdateNamespaceBody` に `scopeKey?: string` 追加 |
| 3 | `backend/src/controllers/namespaceController.ts` | 修正 | body から `scopeKey` を受け取り `UpdateNamespaceInput` に含める |
| 4 | `backend/src/services/namespaceService.ts` | 修正 | `UpdateNamespaceInput` に `scopeKey?: string` 追加 |
| 5 | `backend/src/repositories/namespaceTermRepository.ts` | 修正 | `updateNamespace` で `scopeKey` が存在する場合に `namespace_id` を取得して WHERE 条件に追加 |
| 6 | `backend/src/sql/queries/namespace_terms/updatePrefix.sql` | 修正 | `namespace_id` の引数（$5）を追加し WHERE 句に含める |

---

## 4. 実装ステップ

- [ ] Step 1: `updatePrefix.sql` に namespace_id($5) パラメータ追加
- [ ] Step 2: `backend/src/types/api.ts` の `UpdateNamespaceBody` に `scopeKey?` 追加
- [ ] Step 3: `backend/src/services/namespaceService.ts` の `UpdateNamespaceInput` に `scopeKey?` 追加
- [ ] Step 4: `backend/src/repositories/namespaceTermRepository.ts` の `updateNamespace` に scopeKey 処理追加
- [ ] Step 5: `backend/src/controllers/namespaceController.ts` の `updateNamespace` で `scopeKey` を受け取る
- [ ] Step 6: `frontend/src/components/namespace/PrefixManagement.tsx` の ① `disabled` 削除 ② `editingScopeKey` state 追加 ③ `saveEdit` に `scopeKey` 含める
- [ ] Step 7: バックエンド TypeScript ビルドエラーなし確認
- [ ] Step 8: フロントエンド TypeScript ビルドエラーなし確認

---

## 5. リスク

| リスク | 対策 |
|--------|------|
| scopeKey が null/undefined の場合（旧データや scope なし prefix） | null の場合はフォールバックとして namespace_id 条件なしで実行（従来動作を維持） |
| prefix 変更 + 複数スコープ重複時の namespace_term FK 更新漏れ | scopeKey で namespace_id を特定して namespace_term.prefix も同一 namespace_id で絞り込む |

---

## 6. テスト計画

- [ ] 「編集」ボタンを押したとき prefix フィールドが活性状態で変更可能なこと
- [ ] prefix を変更して「保存」を押すと正常に更新されること
- [ ] 説明のみ変更して「保存」を押すと正常に更新されること
- [ ] 複数スコープに同名 prefix が存在する状態で「保存」を押してもエラーが出ないこと
- [ ] バックエンド TypeScript ビルドエラーなし
- [ ] フロントエンド TypeScript ビルドエラーなし

---

## 7. 承認記録
- **計画書提示日時**: 2026-09-29 16:00
- **承認日時**: 2026-09-29 (Act モードへの切り替えにより承認済み)
