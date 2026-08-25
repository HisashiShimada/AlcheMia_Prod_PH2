# タスク計画書: Prefix新規追加保存失敗バグ修正

## メタデータ
- **作成日時**: 2026-08-18 14:28
- **タスクID**: 20260818_1428_Prefix新規追加保存失敗バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

Prefixを新規追加しようとすると「1件の保存に失敗しました」と表示される不具合を修正する。

## 原因

### 確定バグ: `createNamespace()` のトランザクション未使用

`namespaceTermRepository.createNamespace()` が namespace テーブルと prefix テーブルへの INSERT を
トランザクションなしで個別に実行している。

1件目（namespace INSERT）は `ON CONFLICT DO NOTHING` のため既存レコードと競合しても例外を投げないが、
2件目（prefix INSERT）で `(organization_id, namespace_id, prefix)` の複合PKへの UNIQUE 違反や
その他DBエラーが発生した際に例外がスローされ、呼び出し元の `executeSave` の `catch` に捕捉されて
「保存に失敗しました」と表示される。

また namespace レコードが残存したままになるためデータ不整合も生じる。

### 副次リスク: `findNextNamespaceSeq.sql` の CAST 問題

`CAST(SUBSTRING(namespace_id FROM 3) AS INTEGER)` が NS 形式以外のIDに対して型変換エラーをスローする可能性がある。

## 修正内容

### 変更ファイル

1. `backend/src/repositories/namespaceTermRepository.ts`
   - `createNamespace()` を `pgp.task()` でトランザクション化

2. `backend/src/sql/queries/namespace_terms/findNextNamespaceSeq.sql`
   - `NS[0-9]+` 形式のIDのみ CAST 対象にするフィルター追加

## 実装ステップ
- [x] タスク計画書作成
- [ ] findNextNamespaceSeq.sql 修正
- [ ] namespaceTermRepository.ts の createNamespace() をトランザクション化

## 承認記録
- **計画書提示日時**: 2026-08-18 14:28
