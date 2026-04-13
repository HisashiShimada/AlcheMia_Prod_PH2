# 実施結果: code_master初期データ登録

## 実施日時
2026-04-07

## 概要

組織新規作成時に `code_master` テーブルへ初期データを登録する機能を追加した。  
併せて `createOrganization()` の付随処理を1つのtry-catchに統合し、処理順序を整理した。

---

## 変更ファイル一覧

| ファイル | 種別 | 変更内容 |
|---|---|---|
| `backend/src/sql/queries/codeMaster/insertInitialData.sql` | 新規作成 | 組織用code_master初期データ35件一括INSERT SQL |
| `backend/src/repositories/codeMasterRepository.ts` | 修正 | `insertInitialData()` にトランザクションオブジェクト対応を追加 |
| `backend/src/services/organizationService.ts` | 修正 | `createOrganization()` の構造を全面見直し |

---

## 変更詳細

### 1. `insertInitialData.sql`（新規作成）

`test_data/public.code_master.csv` の内容をベースに、35件の初期レコードを `INSERT` する SQL。

- `$1` = `organization_id`、`$2` = `userId`（`create_user_id` / `update_user_id`）でパラメータ化
- `ON CONFLICT DO NOTHING` によりべき等な処理を保証（重複実行しても安全）

---

### 2. `codeMasterRepository.ts`

**`insertInitialData()` のシグネチャ変更：**

```typescript
// 変更前
export async function insertInitialData(
  organizationId: string,
  userId: string
): Promise<void>

// 変更後
export async function insertInitialData(
  organizationId: string,
  userId: string,
  t?: ITask<unknown>   // ← 追加（pg-promise トランザクションオブジェクト）
): Promise<void>
```

- `t` が渡された場合は `t.none()` でトランザクション内実行
- `t` が省略された場合は `pool.query()` でプール接続を使用（後方互換性を維持）

---

### 3. `organizationService.ts`（`createOrganization()` 構造変更）

#### 変更前の構造

```
① DBトランザクション（organization / user / role / permission / user_authentication）
② 証明書生成           ← try-catch でエラー握り潰し（warn ログ）
③ S3フォルダ作成       ← try-catch でエラー握り潰し（warn ログ）
④ メール送信           ← try-catch でエラー握り潰し（warn ログ）
⑤ 組織スキーマ作成     ← try-catch でエラー握り潰し（warn ログ）
⑥ code_master 登録    ← try-catch でエラー握り潰し（warn ログ）※今回追加
```

#### 変更後の構造

```
┌── try-catch（失敗時はエラーthrow）──────────────────────────┐
│ ① DBトランザクション                                          │
│    1. organization テーブル INSERT                           │
│    2. organization_user テーブル INSERT（代表システム管理者）  │
│    3. role テーブル INSERT（ROLE002: システム管理者）          │
│    4. role_permission テーブル INSERT（4機能権限）            │
│    5. user_authentication テーブル INSERT                    │
│    6. code_master 初期データ登録（35件）← 今回追加            │
│    7. 組織スキーマ作成（maiml_asset 等）                      │
│ ② 証明書生成（DB完了後）                                      │
│ ③ S3フォルダ作成（projects/ / formats/）                     │
└────────────────────────────────────────────────────────────┘
④ メール送信 ← try-catch（warn ログのみ、エラーにしない）
```

#### 変更ポイントまとめ

| 処理 | 変更前 | 変更後 |
|---|---|---|
| code_master 初期登録 | トランザクション外 / エラー握り潰し | **トランザクション内（step 6）/ 失敗時ロールバック** |
| 組織スキーマ作成 | トランザクション外 / エラー握り潰し | **トランザクション内（step 7）/ 失敗時ロールバック** |
| 証明書生成 | エラー握り潰し（warn） | **失敗時エラーthrow** |
| S3フォルダ作成 | エラー握り潰し（warn） | **失敗時エラーthrow** |
| メール送信 | エラー握り潰し（warn） | warn ログのみ（変更なし） |

---

## 設計上の判断

### code_master / 組織スキーマをトランザクション内に含めた理由
- `code_master` が未登録の場合、実験のコード選択が機能せず実験が進められない
- 組織スキーマ（maiml_asset 等）が未作成の場合、公開機能が動作しない
- いずれも組織作成と不可分な処理であるため、DBロールバックの対象とする

### 証明書生成・S3フォルダ作成をエラーthrowに変更した理由
- 証明書未生成の組織はクライアント証明書認証が機能しない
- S3フォルダ未作成の組織はファイル管理が機能しない
- 中途半端な状態で組織が作成されるよりも、エラーとして再作成させる方が安全

### メール送信のみwarnに留めた理由
- SMTPサーバー障害等のインフラ都合で失敗する可能性がある
- メール失敗は組織の機能性に直接影響しない
- 管理者がログを確認して手動でメール再送すれば対応可能

---

## 動作確認

- TypeScript コンパイル: **エラーなし（exit: 0）**
