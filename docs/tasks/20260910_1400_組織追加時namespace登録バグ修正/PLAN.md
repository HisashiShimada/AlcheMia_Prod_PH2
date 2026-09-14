# タスク計画書: 組織追加時 namespace 登録バグ修正

## メタデータ
- **作成日時**: 2026-09-10 14:00
- **タスクID**: 20260910_1400
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## タスク概要

組織追加時（`createOrganization`）の namespace 登録処理に以下の2つのバグが存在する。

### バグ1: 組織のネームスペースが `scope_key = NULL` で重複登録される

`organizationService.ts` のステップ8で `createNamespaceUri` を呼ぶ際に `scopeKey` が未指定（NULL）のため、  
`createNamespaceUri.sql` の `ON CONFLICT ... WHERE scope_key IS NOT NULL` が**適用されない**。  
その結果、組織スコープの namespace が重複して複数件登録されうる状態になっている。  
（DBで確認された「スコープキーなし2件」の原因）

### バグ2: 組織作成と同時に登録されるシステム管理者の個人ネームスペースが登録されない

`createOrganization` 内でシステム管理者（`chiefUserEmail`）を `organization_user` に挿入しているが、  
その後に個人 namespace 登録（`registerUserNamespace` 相当）が行われていない。  
`userService.createUser` や `importUsersCsv` ではユーザー作成直後に必ず個人 namespace を登録しているが、  
組織作成時のシステム管理者作成パスだけが抜けている。

---

## 目的と期待される成果

- [ ] 組織追加時に `scope_key = NULL` の namespace が重複登録されなくなる
- [ ] 組織追加時に作成されるシステム管理者の個人 namespace（`scope_key = chiefUserEmail`）が正しく登録される
- [ ] 既存の `ensureGroupNamespace`・`registerUserNamespace` と同じ冪等チェックパターンに統一される

---

## 根本原因の整理

| 呼び出し元 | 対象 | scopeKey | 冪等チェック | 状態 |
|---|---|---|---|---|
| `userService.createUser` | 個人 namespace | `userId` | `existsByScopeKey` あり | ✅ 正常 |
| `userService.importUsersCsv` | 個人 namespace | `userId` | `existsByScopeKey` あり | ✅ 正常 |
| `organizationGroupService.createOrganizationGroup` | グループ namespace | `groupCd` | `existsByScopeKey` あり | ✅ 正常 |
| `organizationService.createOrganization` (ステップ8) | 組織 namespace | **NULL** | **なし** | ❌ 重複可 |
| `organizationService.createOrganization` (chiefUser) | 個人 namespace | — | — | ❌ **登録自体なし** |

---

## 実装ステップ

- [ ] 1. `organizationService.ts` のステップ8：組織 namespace 登録を冪等化する
  - `createNamespaceUri` 呼び出し前に `existsByScopeKey(organizationId, organizationId, t)` で重複チェックを追加
  - `scopeKey` に `organizationId`（組織UUID）を設定して登録（組織固有の識別子として使用）
  - これにより `ON CONFLICT (organization_id, scope_key) WHERE scope_key IS NOT NULL DO NOTHING` が機能し、重複防止される
- [ ] 2. `organizationService.ts` のステップ8直後：システム管理者の個人 namespace を登録する
  - `chiefUserEmail` が存在する場合、`userService.ts` の `registerUserNamespace` と同等の処理を追加
  - `existsByScopeKey(organizationId, chiefUserEmail, t)` で事前チェック（冪等）
  - URI形式: `https://{organizationCd}.Alchemia.co.jp/{loginName}`（`loginName` = `chiefUserEmail` の `@` 前）
  - `createNamespaceUri({ organizationId, uri, userId: chiefUserEmail, scopeKey: chiefUserEmail }, t)` で登録

---

## 変更ファイル

| # | ファイル | 種別 | 変更内容 |
|---|---|---|---|
| 1 | `backend/src/services/organizationService.ts` | 修正 | ステップ8の `createNamespaceUri` に `scopeKey: data.organizationId` を追加。ステップ8直後にシステム管理者（`chiefUserEmail`）の個人 namespace 登録処理を追加 |

---

## 影響範囲

- `organizationService.ts` の `createOrganization` 関数のみ
- 既存の組織（作成済み）への影響なし（新規作成時の処理改修のみ）
- `createNamespaceUri.sql` は変更しない（前タスク 20260910_1100 で `ON CONFLICT` 修正済み）
- `namespaceTermRepository.ts` の `existsByScopeKey`・`createNamespaceUri` はそのまま使用
- フロントエンドへの変更なし

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `scopeKey = organizationId` にすることで既存の namespace 参照ロジックに影響する | 中 | 低 | `scope_key` は組織ツリー表示やユーザー・グループ検索に使われるが、`organizationId` は UUID 形式でありユーザーIDやグループCDと衝突しない。`findNamespacesByScopeKey` 等の既存クエリも `organization_id` と組み合わせて検索しているため問題なし |
| 既存DBに `scope_key = NULL` の組織 namespace が残る | 低 | 高（既に発生済み） | 本修正は新規作成時の防止のみ。既存データのクリーンアップは別途マイグレーション対応が必要だが、今回のスコープ外 |
| トランザクション内での `findUrisByOrganization` が新規挿入分を正しく反映しない | 低 | 低 | 同一トランザクション内での読み取りは同じコネクションを使用するため問題なし（pg-promise `ITask` を引数として渡している） |

---

## テスト計画

- [ ] 組織追加（新規）を実行し、`namespace` テーブルに `scope_key = organizationId` のレコードが1件登録されること
- [ ] 組織追加を実行し、`namespace` テーブルに `scope_key = chiefUserEmail` のレコードが1件登録されること（システム管理者の個人 namespace）
- [ ] 同じ組織 ID で `createOrganization` を仮に2回呼んでも namespace が重複登録されないこと（ON CONFLICT の動作確認）
- [ ] `chiefUserEmail` を指定しない場合（省略）に個人 namespace 登録がスキップされ、エラーにならないこと
- [ ] 既存のユーザー追加・グループ作成の namespace 登録が従来通り動作すること（リグレッション確認）

---

## 承認記録
- **計画書提示日時**: 2026-09-10 14:00
- **承認日時**: 2026-09-10 14:30
- **承認者コメント**: 承認します

---

## 実施記録

### 実施日時
開始: 2026-09-10 14:30
完了: 2026-09-10 15:00

### 計画からの変更点
- バグ1（組織 namespace 重複）の修正方針を変更
  - 当初計画: `scopeKey: data.organizationId` を設定して `ON CONFLICT` で重複防止
  - 最終実装: `scope_key = NULL` のまま維持し、冪等チェックコードを追加しない
  - 理由: `scope_key` は `organization_group_cd` または `user_id` のみを格納する設計であり、`organizationId`（UUID）を設定すると namespace 参照 SQL の JOIN ロジックと設計上の不整合が生じるため。また `createOrganization` はトランザクション前の組織CD重複チェックにより1リクエスト1回のみ実行が保証されており、システム的に二重登録は発生しない。

### 発生した問題と解決方法
- 一度 `scopeKey: data.organizationId` で実装したが、`scope_key` カラムの設計意図（`organization_group_cd` か `user_id` のみ）と不整合であることをユーザーが指摘。`scope_key = NULL` に差し戻した。

### 最終的な成果物
- [x] `backend/src/services/organizationService.ts` 修正完了
  - ステップ8（組織 namespace 登録）: `scope_key = NULL` のまま維持。余分な冪等チェックコードを追加しないシンプルな実装に確定
  - ステップ9（新規）: システム管理者（`chiefUserEmail`）の個人 namespace 登録処理を追加（`existsByScopeKey` による冪等チェック付き）
  - TypeScript コンパイルエラーなし（`tsc --noEmit` exit:0）
