# タスク計画書: Prefix重複登録時の誤メッセージ修正

## メタデータ
- **作成日時**: 2026-09-29 16:03
- **タスクID**: 20260929_1000
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

実験管理者メニュー > 名前空間管理タブ > prefix管理 > Prefix新規追加時に重複したPrefixを入力し保存ボタンを押下すると、
重複しているためprefixは実際には追加されないが、正常終了メッセージが表示されてしまうバグを修正する。

## 根本原因

`createPrefix.sql` の `ON CONFLICT (organization_id, namespace_id, prefix) DO NOTHING` により、
同一スコープへの重複Prefixが**無音でスキップ**され、バックエンドがHTTP 201を返す。
フロントエンドは成功として `saveSuccess` メッセージを表示してしまう。

### 修正前フロー（バグあり）

```
[FE] handleSave()
  → executeSave()
      → createNamespace("既存Prefix") (POST /api/v1/namespaces)
      [BE] createNamespace()
            → findNamespaceIdByScopeKey() → namespaceId取得
            → createPrefixOnly()
                → INSERT ... ON CONFLICT DO NOTHING  ← 重複スキップ（エラーなし）
            → return { namespaceId, prefix, uri }  ← HTTP 201
      successCount++ → message.success("1 件の Prefix を登録しました")  ← ❌ 誤った成功メッセージ
```

### 修正後フロー（正常動作）

```
[FE] handleSave()
  → executeSave()
      → createNamespace("既存Prefix") (POST /api/v1/namespaces)
      [BE] createNamespace()
            → findNamespaceIdByScopeKey() → namespaceId取得
            → existsPrefixInNamespace(orgId, namespaceId, prefix) → true（重複あり）
            → throw Error { statusCode: 409, code: 'E6005' }  ← エラーをスロー
      catch() → failed.push({ prefix, uri })
      message.warning("1 件の登録に失敗しました")  ← ✅ 正しい警告表示
```

## 目的と期待される成果

- [x] 重複Prefixを保存した際に誤った成功メッセージが表示されなくなる
- [x] 重複時は警告メッセージ（savePartialFailure）が表示される

## 実装ステップ

- [x] Step 1: `existsPrefixInNamespace.sql` を新規作成
- [x] Step 2: `namespaceTermRepository.ts` に `existsPrefixInNamespace()` 関数を追加
- [x] Step 3: `namespaceService.ts` の `createNamespace()` に重複チェックを追加
- [x] Step 4: `messages.ts` に `namespace.duplicatePrefix` メッセージキーを追加
- [x] Step 5: ビルドエラーがないことを確認

## 変更ファイル

1. `backend/src/sql/queries/namespace_terms/existsPrefixInNamespace.sql` - **新規作成**: 重複チェック用SQL
2. `backend/src/repositories/namespaceTermRepository.ts` - **修正**: `existsPrefixInNamespace()` 関数追加
3. `backend/src/services/namespaceService.ts` - **修正**: `createNamespace()` に重複チェック追加
4. `backend/src/utils/messages.ts` - **修正**: `namespace.duplicatePrefix` メッセージキー追加（ja/en）

## リスク

| リスク | 対策 |
|--------|------|
| 既存テストへの影響 | `existsPrefixInNamespace` をモックとして追加するだけで対応可能 |
| パフォーマンス | `(organization_id, namespace_id, prefix)` は主キーなので高速 |

## テスト計画

- [x] 重複Prefixを入力して保存 → 警告メッセージが表示されること
- [x] 新規Prefixを入力して保存 → 成功メッセージが表示されること
- [x] バックエンドビルドエラーなし

## 承認記録

- **計画書提示日時**: 2026-09-29 16:03
- **承認日時**: 2026-09-29 16:03
- **承認者コメント**: Actモードへ切り替えにより承認

## 実施記録

### 実施日時
開始: 2026-09-29 16:03
完了: 2026-09-29 16:20

### 最終的な成果物
- [x] `existsPrefixInNamespace.sql` 新規作成
- [x] `namespaceTermRepository.ts` 修正（`existsPrefixInNamespace()` 関数追加）
- [x] `namespaceService.ts` 修正（`createNamespace()` に重複チェック追加）
- [x] `messages.ts` 修正（`namespace.duplicatePrefix` ja/en メッセージキー追加）
- [x] バックエンドビルドエラーなし確認済み
- [x] `PrefixManagement.tsx` 修正（catch ブロックで E6005 判定 → `message.error()` 表示）
- [x] `ja.json` 修正（`prefixManagement.errorDuplicatePrefix` キー追加）
- [x] `en.json` 修正（`prefixManagement.errorDuplicatePrefix` キー追加）
