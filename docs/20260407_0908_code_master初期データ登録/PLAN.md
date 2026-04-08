# タスク計画書: 組織追加時 code_master 初期レコード登録

## メタデータ
- **作成日時**: 2026-04-07 09:08
- **タスクID**: code_master初期データ登録
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

組織を新規追加した際に、`code_master` テーブルへ組織用の初期レコードを自動登録する処理を追加する。

`test_data/public.code_master.csv` に定義された35件のレコード（10区分）を、新規作成組織の `organization_id` で登録する。

---

## 目的と期待される成果

### 目的
現状、組織を新規追加しても `code_master` テーブルに初期データが入らないため、組織作成後に手動でデータ投入が必要になっている。この作業を自動化することで、組織追加後すぐにシステムが正常動作するようにする。

### 期待される成果
- [ ] 組織追加ダイアログ（OrganizationManagement.tsx → POST /provider/organization）でのモーダルOK時に、code_masterへ初期レコードが自動登録される
- [ ] CSVアップロード（OrganizationManagement.tsx → POST /provider/organization/upload-csv）経由での組織追加時も同様に初期レコードが登録される
- [ ] 登録失敗時でも組織作成自体は成功とし、警告ログのみ出力する（既存パターンと整合）
- [ ] 重複登録防止（ON CONFLICT DO NOTHING）でべき等な処理にする

---

## 初期登録データ（CSVから抽出）

`test_data/public.code_master.csv` の内容をもとに、以下の35件を登録する。

| code_division | code_value | code_name | code_description |
|---|---|---|---|
| checkout_status | 0 | チェックイン中 | プロジェクトのチェックアウト状態 |
| checkout_status | 1 | チェックアウト済 | プロジェクトのチェックアウト状態 |
| experiment_condition | 0 | 全て同一条件で実行 | 繰り返し実験時の条件指定 |
| experiment_condition | 1 | 実験条件 | 繰り返し実験時の条件指定 |
| instruction_priority | 0 | 低 | 実験指示の優先度 |
| instruction_priority | 1 | 通常 | 実験指示の優先度 |
| instruction_priority | 2 | 中 | 実験指示の優先度 |
| instruction_priority | 3 | 高 | 実験指示の優先度 |
| instruction_status | 0 | 未送信 | 指示送信ステータス |
| instruction_status | 1 | 送信済 | 指示送信ステータス |
| instruction_target | 0 | ファイル全体 | 指示送信時の指示範囲 |
| instruction_target | 1 | 特定タスク | 指示送信時の指示範囲 |
| instruction_target | 2 | 特定トランジション | 指示送信時の指示範囲 |
| instruction_type | 0 | 一般 | 実験指示のタイプ |
| instruction_type | 1 | セットアップ | 実験指示のタイプ |
| instruction_type | 2 | 測定 | 実験指示のタイプ |
| instruction_type | 3 | 安全 | 実験指示のタイプ |
| instruction_type | 4 | 清掃 | 実験指示のタイプ |
| issue_type | 0 | 材料不足2 | 問題のタイプ |
| issue_type | 1 | 機器故障 | 問題のタイプ |
| issue_type | 2 | 手順不明確 | 問題のタイプ |
| issue_type | 3 | 安全性の懸念 | 問題のタイプ |
| issue_type | 4 | 品質問題 | 問題のタイプ |
| issue_type | 5 | 時間制約 | 問題のタイプ |
| issue_type | 6 | その他 | 問題のタイプ |
| project_status | 0 | プロジェクト計画中 | プロジェクトの進捗ステータス |
| project_status | 1 | タスク実行待ち | プロジェクトの進捗ステータス |
| project_status | 2 | タスク実行中 | プロジェクトの進捗ステータス |
| project_status | 3 | タスク結果レビュー待ち | プロジェクトの進捗ステータス |
| project_status | 4 | プロジェクト完了 | プロジェクトの進捗ステータス |
| project_status | 5 | タスク異常終了 | プロジェクトの進捗ステータス |
| task_status | 0 | 実行待ち | タスクの進捗ステータス |
| task_status | 1 | 実行中 | タスクの進捗ステータス |
| task_status | 2 | レビュー待ち | タスクの進捗ステータス |
| task_status | 3 | 完了 | タスクの進捗ステータス |
| task_status | 4 | 異常終了 | タスクの進捗ステータス |

---

## 実装ステップ

### Phase 1: SQLファイルの追加

- [ ] `backend/src/sql/queries/codeMaster/` ディレクトリを作成
- [ ] `backend/src/sql/queries/codeMaster/insertInitialData.sql` を作成
  - INSERT INTO code_master ... VALUES ($1, ...) ON CONFLICT DO NOTHING パターン
  - 組織IDを引数（`$1`）に取り、35件分のINSERT文を生成

### Phase 2: Repository層の追加

- [ ] `backend/src/repositories/codeMasterRepository.ts` に `insertInitialData` 関数を追加
  - 引数: `organizationId: string`, `userId: string`, `t?: ITask` (pg-promise トランザクション対応)
  - 35件のレコードを一括 INSERT

### Phase 3: Service層の修正

- [ ] `backend/src/services/organizationService.ts` の `createOrganization` 関数に code_master 初期登録処理を追加
  - 追加場所: MaiML OpenData 用組織スキーマ作成処理の後（既存パターンに合わせて、失敗しても組織作成は成功とする）
  - try-catch で囲み、失敗時は `logger.warn` でログ出力のみ

---

## 変更ファイル

### 新規作成
1. `backend/src/sql/queries/codeMaster/insertInitialData.sql` - code_master 初期データ INSERT SQL

### 修正
1. `backend/src/repositories/codeMasterRepository.ts` - `insertInitialData` 関数を追加
2. `backend/src/services/organizationService.ts` - `createOrganization` 内に code_master 初期登録処理を追加

---

## 技術的詳細

### SQL設計方針

```sql
INSERT INTO code_master (organization_id, code_division, code_value, code_name, code_description, create_user_id, update_user_id, create_at, update_at)
VALUES
  ($1, 'checkout_status', '0', 'チェックイン中', 'プロジェクトのチェックアウト状態', $2, $2, NOW(), NOW()),
  ($1, 'checkout_status', '1', 'チェックアウト済', 'プロジェクトのチェックアウト状態', $2, $2, NOW(), NOW()),
  -- ... 全35件
ON CONFLICT (organization_id, code_division, code_value) DO NOTHING;
```

- `$1`: organization_id
- `$2`: create_user_id / update_user_id（操作ユーザーID）
- `ON CONFLICT DO NOTHING`: 重複時はスキップ（べき等な処理）

### Repository層設計

```typescript
export async function insertInitialData(
  organizationId: string,
  userId: string
): Promise<void> {
  const pool = getPool();
  const query = await loadSqlFile('codeMaster/insertInitialData.sql');
  await pool.query(query, [organizationId, userId]);
}
```

### Service層への追加位置

`organizationService.ts` の `createOrganization` 関数内、既存の組織スキーマ作成処理のブロックの後に追加：

```typescript
// code_master 初期データを登録
// 失敗しても組織作成自体は成功とする
try {
  logger.info(`[organizationService] code_master初期データを登録: organizationId=${data.organizationId}`);
  await codeMasterRepository.insertInitialData(data.organizationId, userId);
  logger.info(`[organizationService] code_master初期データ登録完了: organizationId=${data.organizationId}`);
} catch (codeMasterError) {
  logger.warn(
    `[organizationService] code_master初期データ登録失敗（組織作成は成功）: organizationId=${data.organizationId}`,
    {
      error: codeMasterError instanceof Error ? codeMasterError.message : String(codeMasterError),
      organizationId: data.organizationId,
    }
  );
}
```

---

## 影響範囲

### 影響を受ける機能
- **組織追加（モーダル）**: `POST /api/v1/provider/organization` → `createOrganization` を呼ぶパス
- **組織CSVアップロード**: `POST /api/v1/provider/organization/upload-csv` → `uploadOrganizationsCsv` → `createOrganization` を呼ぶパス（共通関数のため自動的に適用される）

### 影響なし
- 組織更新（PUT）
- 組織ステータス変更（PATCH）
- フロントエンドのコード（バックエンドのみの変更）

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| code_master登録失敗時に組織作成まで失敗する | 高 | 低 | try-catchで囲み、失敗はwarnログのみ（既存パターン踏襲） |
| 重複実行で重複INSERT エラーが発生する | 中 | 低 | ON CONFLICT DO NOTHING で回避 |
| SQLファイルのロードエラー | 低 | 低 | loadSqlFile はエラーをthrowするため、上位のtry-catchで捕捉される |

---

## テスト計画

### 手動テスト
- [ ] 組織追加モーダルから新規組織を作成し、`code_master` テーブルに35件登録されていることを確認
- [ ] CSVアップロードから組織を追加し、同様に35件登録されていることを確認
- [ ] 既存組織に対して再登録を試みた場合（ON CONFLICT）でもエラーにならないことを確認

### 確認SQL
```sql
SELECT code_division, COUNT(*) as cnt
FROM code_master
WHERE organization_id = '<新規組織ID>'
GROUP BY code_division
ORDER BY code_division;
-- 期待: 10区分、合計35件
```

---

## 承認記録
- **計画書提示日時**: 2026-04-07 09:08
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）
