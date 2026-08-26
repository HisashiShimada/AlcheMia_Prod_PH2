# タスク計画書: ユーザ管理 編集時URI未設定修正とバックフィル

## メタデータ
- **作成日時**: 2026-08-25 11:00
- **タスクID**: 20260825_1100
- **優先度**: 高
- **推定工数**: 3時間

---

## 1. タスク概要

システム管理者メニュー → ユーザ管理 にて、ユーザの「編集」ボタンを押すと
URI フィールドが常に「未設定」と表示される事象を修正する。

あわせて、`namespace` テーブルに個人URIレコードが存在しないユーザ（過去登録分）に対して
バックフィルを行うマイグレーションSQLを追加する。

---

## 2. 原因分析

### 根本原因

| # | 層 | 問題内容 |
|---|----|---------|
| 1 | **フロントエンド** `handleEdit()` | `form.setFieldsValue()` に `namespaceUri` を含めていないため、`Form.useWatch('namespaceUri')` が常に空文字を返す → 「URI未設定」表示 |
| 2 | **バックエンド** `findAll.sql` / `findById.sql` | `namespace` テーブルをJOINしておらず、個人URIをSQLで取得していない |
| 3 | **バックエンド** `database.ts` `User` 型 | `namespace_uri` フィールドが存在しない |
| 4 | **バックエンド** `userController.ts` | レスポンスマッピングに `namespaceUri` がない |
| 5 | **フロントエンド** `types/user.ts` `UserRecord` 型 | `namespaceUri` フィールドが存在しない |
| 6 | **DBデータ** | 過去登録ユーザの `namespace` テーブルにレコードが存在しないケースがある |

### データフロー（修正後のイメージ）

```
[編集ボタン押下]
  → handleEdit(user)
      → form.setFieldsValue({ ..., namespaceUri: user.namespaceUri ?? '' })  ← 追加
          → UserNamespaceFields が Form.useWatch('namespaceUri') で値を取得
              → URIが表示される（未登録なら「未設定」表示のまま）

[APIレスポンス]
  fetchUsers() → namespace LEFT JOIN → namespaceUri を含めて返す  ← 追加
```

---

## 3. 目的と期待される成果

- [ ] 編集ボタンを押したとき、`namespace` テーブルに個人URIが登録済みであれば正しく表示される
- [ ] `namespace` テーブルに未登録ユーザは「URI未設定」と表示される（従来通り）
- [ ] バックフィルSQLにより、過去登録ユーザの個人URIが `namespace` テーブルに補完される
- [ ] 既存の追加機能・URI自動生成ロジックに影響を与えない

---

## 4. 実装ステップ

### Step 1: バックエンド ── `database.ts` `User` 型に `namespace_uri` 追加

- [ ] `backend/src/types/database.ts` の `User` インターフェースに `namespace_uri?: string | null` を追加

### Step 2: バックエンド ── SQL修正（namespace LEFT JOIN追加）

- [ ] `backend/src/sql/queries/users/findAll.sql`
  - `namespace` テーブルを `LEFT JOIN`（`n.scope_key = ou.user_id AND n.organization_id = ou.organization_id`）
  - `SELECT` に `n.uri AS namespace_uri` を追加

- [ ] `backend/src/sql/queries/users/findById.sql`
  - 同様に `namespace` LEFT JOIN と `n.uri AS namespace_uri` を追加

### Step 3: バックエンド ── コントローラーのレスポンスマッピング修正

- [ ] `backend/src/controllers/userController.ts`
  - `getUsers` のレスポンスマッピングに `namespaceUri: user.namespace_uri ?? null` を追加
  - `getUserById` のレスポンスマッピングに `namespaceUri: user.namespace_uri ?? null` を追加

### Step 4: フロントエンド ── `UserRecord` 型に `namespaceUri` 追加

- [ ] `frontend/src/types/user.ts`
  - `UserRecord` インターフェースに `namespaceUri?: string | null` を追加

### Step 5: フロントエンド ── `handleEdit` に `namespaceUri` セット

- [ ] `frontend/src/components/SystemManagement/UserManagement.tsx`
  - `handleEdit()` 内の `form.setFieldsValue()` に `namespaceUri: user.namespaceUri ?? ''` を追加

### Step 6: バックフィルSQLマイグレーション作成

- [ ] `backend/migrations/20260825_backfill_user_namespace_uri.sql` を新規作成
  - 対象: `organization_user` に存在するが `namespace` テーブルに `scope_key = user_id` のレコードがないユーザ
  - 処理:
    1. 対象ユーザと組織CDを結合して取得
    2. URI を `https://{organization_cd}.Alchemia.co.jp/{loginName}` 形式で生成（`SPLIT_PART(user_id, '@', 1)` で loginName を取得）
    3. 重複URI（`{uri}1`, `{uri}2`, …）の回避は CTE で既存URI一覧と照合
    4. `namespace` テーブルに INSERT（`ON CONFLICT DO NOTHING`）
    5. `namespace_id` は `NS` + 4桁連番（組織内MAX+1）で採番

---

## 5. 影響範囲

| カテゴリ | 影響 |
|---------|------|
| ユーザ管理 編集ダイアログ | URI表示が正しくなる（バグ修正） |
| ユーザ管理 追加ダイアログ | 変更なし（既存動作を維持） |
| ユーザ一覧API | `namespaceUri` フィールドが追加される（既存フィールドは変更なし） |
| 認証・認可 | 影響なし |
| マルチテナント分離 | `organization_id` でのJOINのため影響なし |
| DBパフォーマンス | `LEFT JOIN` 追加による軽微な増加（インデックス `scope_key` 利用想定） |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `namespace` 未登録ユーザが多数いる場合のバックフィル遅延 | 低 | 低 | `ON CONFLICT DO NOTHING` で冪等性確保。バッチサイズ分割は不要（ユーザ数は最大でも数百件想定） |
| URI重複（同じloginNameが複数組織に存在） | 低 | 低 | `namespace` の `UNIQUE(organization_id, scope_key)` 制約があるため組織内重複は起きない。URI文字列の重複は CTE で確認後 `1` を付与 |
| `findAll.sql` の動的フィルタ適用との干渉 | 中 | 低 | LEFT JOIN 追加後も `WHERE`/`ORDER BY` の位置は変わらず、既存の動的フィルタ置換ロジックに影響しない |
| バックフィルSQL実行時のトランザクション失敗 | 低 | 低 | `ON CONFLICT DO NOTHING` のため冪等。再実行可能 |

---

## 7. 変更ファイル一覧

### 修正ファイル（5件）
1. `backend/src/types/database.ts` ── `User` 型に `namespace_uri` 追加
2. `backend/src/sql/queries/users/findAll.sql` ── namespace LEFT JOIN 追加
3. `backend/src/sql/queries/users/findById.sql` ── namespace LEFT JOIN 追加
4. `backend/src/controllers/userController.ts` ── レスポンスマッピング修正（`getUsers` / `getUserById`）
5. `frontend/src/types/user.ts` ── `UserRecord` 型に `namespaceUri` 追加
6. `frontend/src/components/SystemManagement/UserManagement.tsx` ── `handleEdit()` 修正

### 新規作成ファイル（1件）
7. `backend/migrations/20260825_backfill_user_namespace_uri.sql` ── バックフィルSQL

---

## 8. テスト計画

### 手動テスト（動作確認）
- [ ] ユーザ管理画面を開き、ユーザ一覧が正常に表示される
- [ ] namespace 登録済みユーザの「編集」ボタンを押すと、URIフィールドに正しいURIが表示される
- [ ] namespace 未登録ユーザの「編集」ボタンを押すと、「URI未設定」と表示される（従来通り）
- [ ] 追加ダイアログを開き、メールアドレス入力でURIがリアルタイム生成される（既存動作の維持確認）
- [ ] バックフィルSQL実行後、対象ユーザの編集ダイアログでURIが表示される

### バックフィルSQL確認
- [ ] バックフィル対象ユーザ数が期待通りであることを事前確認用SELECTで確認できる
- [ ] 実行後に対象ユーザが `namespace` テーブルに登録されている
- [ ] 2回実行しても重複しない（冪等性確認）

---

## 9. ロールバック計画

- SQLマイグレーション（バックフィル）はINSERT操作のみ。ロールバックは対象レコードをDELETEで削除可能
- ソースコード変更はgit revertで戻せる

---

## 10. 承認記録

- **計画書提示日時**: 2026-08-25 11:00
- **承認日時**: 2026-08-25 11:00
- **承認者コメント**: 承認

---

## 11. 実施記録

### 実施日時
開始: 2026-08-25 11:00
完了: 2026-08-25 11:30

### 計画からの変更点
- バックフィルSQLの `ON CONFLICT (organization_id, namespace_id) DO NOTHING` を `ON CONFLICT DO NOTHING` に変更
  - 理由: `UNIQUE(organization_id, scope_key)` 制約も存在するため、いずれの制約衝突も安全にスキップするよう修正

### 最終的な成果物
- [x] Step 1: `backend/src/types/database.ts` ── `User` 型に `namespace_uri` 追加
- [x] Step 2: `backend/src/sql/queries/users/findAll.sql` ── namespace LEFT JOIN 追加
- [x] Step 3: `backend/src/sql/queries/users/findById.sql` ── namespace LEFT JOIN 追加
- [x] Step 4: `backend/src/controllers/userController.ts` ── `getUsers`/`getUserById` に `namespaceUri` マッピング追加
- [x] Step 5: `frontend/src/types/user.ts` ── `UserRecord` 型に `namespaceUri` 追加
- [x] Step 6: `frontend/src/components/SystemManagement/UserManagement.tsx` ── `handleEdit()` に `namespaceUri` セット追加
- [x] Step 7: `backend/migrations/20260825_backfill_user_namespace_uri.sql` ── バックフィルSQL新規作成
