# タスク計画書: code_remark暫定対応（日本語値を取得できるよう修正）

## メタデータ
- **作成日時**: 2026-05-26 08:22
- **タスクID**: code_remark_fix
- **優先度**: 高
- **推定工数**: 1時間

---

## タスク概要

code_masterの多言語化対応（code_nameをi18nキーに変換）により、
バックエンドからMAIMLデータやエラーメッセージに使用するための
「日本語のコード名称」を取得できなくなった。

暫定対応として `code_remark` カラムに日本語のコード名称を保存し、
バックエンドコードで `code_remark` を参照するよう修正する。

---

## 現状の問題

### insertInitialData.sql の現状
```
code_name: i18nキー（英語） ← 変更済み（OK）
code_remark: '日本語値 / カテゴリ説明' ← 混在している（NG）
code_description: 設定されていない ← 空
```

例:
```sql
($1, 'checkout_status', '0', 'checkedIn', 'チェックイン中 / プロジェクトのチェックアウト状態', $2, $2, NOW(), NOW())
-- カラム順: organization_id, code_division, code_value, code_name, code_remark, create_user_id, update_user_id, create_at, update_at
-- ※ code_description はINSERTに含まれていない
```

### 修正後の目標状態
```
code_name: i18nキー（英語）        例: 'checkedIn'
code_description: カテゴリ説明     例: 'プロジェクトのチェックアウト状態'
code_remark: 日本語コード名称      例: 'チェックイン中'
```

---

## DDLカラム定義（参照: docs/design/db/ddl/code_master.sql）

| カラム | 型 | 説明 |
|--------|-----|------|
| organization_id | UUID | 組織ID（PK） |
| code_division | VARCHAR(30) | コード区分（PK） |
| code_value | VARCHAR(30) | コード値（PK） |
| code_description | TEXT | コード概要 |
| code_name | VARCHAR(30) | コード名称（i18nキー） |
| code_remark | TEXT | 備考（← 日本語値を入れる） |
| create_user_id | VARCHAR(50) | 作成者 |
| update_user_id | VARCHAR(50) | 更新者 |
| create_at | TIMESTAMP | 作成日時 |
| update_at | TIMESTAMP | 更新日時 |

---

## 修正対象ファイル

### 1. backend/src/sql/queries/codeMaster/insertInitialData.sql

**修正内容**: INSERTクエリのカラム定義と値を変更

```sql
-- 修正前（code_descriptionなし、code_remarkに混在）
INSERT INTO code_master (organization_id, code_division, code_value, code_name, code_remark, create_user_id, update_user_id, create_at, update_at)
VALUES
  ($1, 'checkout_status', '0', 'checkedIn', 'チェックイン中 / プロジェクトのチェックアウト状態', $2, $2, NOW(), NOW()),

-- 修正後（code_descriptionを追加、code_remarkに日本語値のみ）
INSERT INTO code_master (organization_id, code_division, code_value, code_name, code_description, code_remark, create_user_id, update_user_id, create_at, update_at)
VALUES
  ($1, 'checkout_status', '0', 'checkedIn', 'プロジェクトのチェックアウト状態', 'チェックイン中', $2, $2, NOW(), NOW()),
```

**全35件の分離ルール**:

| code_remark現在値 | code_description（修正後） | code_remark（修正後） |
|------------------|--------------------------|----------------------|
| `チェックイン中 / プロジェクトのチェックアウト状態` | `プロジェクトのチェックアウト状態` | `チェックイン中` |
| `チェックアウト済 / プロジェクトのチェックアウト状態` | `プロジェクトのチェックアウト状態` | `チェックアウト済` |
| `全て同一条件で実行 / 繰り返し実験時の条件指定` | `繰り返し実験時の条件指定` | `全て同一条件で実行` |
| `実験ごとに条件を変更 / 繰り返し実験時の条件指定` | `繰り返し実験時の条件指定` | `実験ごとに条件を変更` |
| `低 / 実験指示の優先度` | `実験指示の優先度` | `低` |
| `通常 / 実験指示の優先度` | `実験指示の優先度` | `通常` |
| `中 / 実験指示の優先度` | `実験指示の優先度` | `中` |
| `高 / 実験指示の優先度` | `実験指示の優先度` | `高` |
| `未送信 / 指示送信ステータス` | `指示送信ステータス` | `未送信` |
| `送信済 / 指示送信ステータス` | `指示送信ステータス` | `送信済` |
| `ファイル全体 / 指示送信時の指示範囲` | `指示送信時の指示範囲` | `ファイル全体` |
| `特定タスク / 指示送信時の指示範囲` | `指示送信時の指示範囲` | `特定タスク` |
| `特定トランジション / 指示送信時の指示範囲` | `指示送信時の指示範囲` | `特定トランジション` |
| `一般 / 実験指示のタイプ` | `実験指示のタイプ` | `一般` |
| `セットアップ / 実験指示のタイプ` | `実験指示のタイプ` | `セットアップ` |
| `測定 / 実験指示のタイプ` | `実験指示のタイプ` | `測定` |
| `安全 / 実験指示のタイプ` | `実験指示のタイプ` | `安全` |
| `清掃 / 実験指示のタイプ` | `実験指示のタイプ` | `清掃` |
| `材料不足 / 問題のタイプ` | `問題のタイプ` | `材料不足` |
| `機器故障 / 問題のタイプ` | `問題のタイプ` | `機器故障` |
| `手順不明確 / 問題のタイプ` | `問題のタイプ` | `手順不明確` |
| `安全性の懸念 / 問題のタイプ` | `問題のタイプ` | `安全性の懸念` |
| `品質問題 / 問題のタイプ` | `問題のタイプ` | `品質問題` |
| `時間制約 / 問題のタイプ` | `問題のタイプ` | `時間制約` |
| `その他 / 問題のタイプ` | `問題のタイプ` | `その他` |
| `プロジェクト計画中 / プロジェクトの進捗ステータス` | `プロジェクトの進捗ステータス` | `プロジェクト計画中` |
| `タスク実行待ち / プロジェクトの進捗ステータス` | `プロジェクトの進捗ステータス` | `タスク実行待ち` |
| `タスク実行中 / プロジェクトの進捗ステータス` | `プロジェクトの進捗ステータス` | `タスク実行中` |
| `タスク結果レビュー待ち / プロジェクトの進捗ステータス` | `プロジェクトの進捗ステータス` | `タスク結果レビュー待ち` |
| `プロジェクト完了 / プロジェクトの進捗ステータス` | `プロジェクトの進捗ステータス` | `プロジェクト完了` |
| `タスク異常終了 / プロジェクトの進捗ステータス` | `プロジェクトの進捗ステータス` | `タスク異常終了` |
| `実行待ち / タスクの進捗ステータス` | `タスクの進捗ステータス` | `実行待ち` |
| `実行中 / タスクの進捗ステータス` | `タスクの進捗ステータス` | `実行中` |
| `レビュー待ち / タスクの進捗ステータス` | `タスクの進捗ステータス` | `レビュー待ち` |
| `完了 / タスクの進捗ステータス` | `タスクの進捗ステータス` | `完了` |
| `異常終了 / タスクの進捗ステータス` | `タスクの進捗ステータス` | `異常終了` |

---

### 2. backend/src/repositories/eventLogRepository.ts

**修正箇所**: `insertInstructionSentLog()` メソッド内（約290-300行目）

```typescript
// 修正前（code_nameを使用 → 英語キーが埋め込まれる）
const priorityLabelMap: Record<number, string> = Object.fromEntries(
  priorityMasters.map(m => [Number(m.code_value), m.code_name])
);
const typeLabelMap: Record<number, string> = Object.fromEntries(
  typeMasters.map(m => [Number(m.code_value), m.code_name])
);
const targetLabelMap: Record<number, string> = Object.fromEntries(
  targetMasters.map(m => [Number(m.code_value), m.code_name])
);

// 修正後（code_remarkを使用 → 日本語が埋め込まれる）
const priorityLabelMap: Record<number, string> = Object.fromEntries(
  priorityMasters.map(m => [Number(m.code_value), m.code_remark || m.code_name])
);
const typeLabelMap: Record<number, string> = Object.fromEntries(
  typeMasters.map(m => [Number(m.code_value), m.code_remark || m.code_name])
);
const targetLabelMap: Record<number, string> = Object.fromEntries(
  targetMasters.map(m => [Number(m.code_value), m.code_remark || m.code_name])
);
```

**フォールバック**: `code_remark` が空の場合は `code_name` を使用（後方互換）

---

### 3. backend/src/services/projectService.ts

**修正箇所1**: `checkout()` メソッド内（約475-483行目）

```typescript
// 修正前（ハードコード）
const statusNames: { [key: number]: string } = {
  0: 'プロジェクト計画中',
  1: 'タスク実行待ち',
  2: 'タスク実行中',
  3: 'タスク結果レビュー待ち',
  4: 'プロジェクト完了',
  5: 'タスク異常終了',
};
const currentStatusName = statusNames[project.project_status ?? -1] || '不明';

// 修正後（code_masterから取得）
import * as codeMasterRepository from '../repositories/codeMasterRepository';
// ...
const statusMaster = await codeMasterRepository.findByValue(
  organizationId,
  'project_status',
  String(project.project_status ?? -1)
);
const currentStatusName = statusMaster?.code_remark || statusMaster?.code_name || '不明';
```

**修正箇所2**: `checkin()` メソッド内（同様のパターン）
→ 同様にハードコードを削除し `code_remark` から取得

---

### 4. backend/src/controllers/fileAccessController.ts

**修正箇所**: MAIMLファイルアップロード時のプロジェクトステータスチェック（約1150行目付近）

```typescript
// 修正前
const currentStatusMaster = await codeMasterRepository.findByValue(
  organizationId, 'project_status', String(currentStatusValue)
);
// code_nameが英語キーになっている可能性

// 修正後
const currentStatusMaster = await codeMasterRepository.findByValue(
  organizationId, 'project_status', String(currentStatusValue)
);
const currentStatusLabel = currentStatusMaster?.code_remark || currentStatusMaster?.code_name || String(currentStatusValue);
// エラーメッセージにはcurrentStatusLabelを使用
```

---

## codeMasterRepositoryの型定義確認

`findByValue()` の戻り値型に `code_remark` が含まれているか確認が必要。
含まれていない場合は型定義を追加する。

---

## 修正が不要なもの

- **マイグレーションSQL** (`backend/migrations/20260525_convert_code_master_to_i18n.sql`):
  既存データのcode_remarkも同様の修正が必要か検討が必要
  → 既存DBのデータは現在「日本語 / カテゴリ説明」形式なので、マイグレーションで分離が必要

---

## マイグレーションSQL追加（必要な場合）

既存DBのcode_remarkが「日本語 / カテゴリ説明」形式のままの場合、
マイグレーションSQLで分離が必要:

```sql
-- 既存データのcode_remarkを分離
-- '/' で分割して前半をcode_remark、後半をcode_descriptionに設定
UPDATE code_master
SET
  code_description = TRIM(SPLIT_PART(code_remark, ' / ', 2)),
  code_remark = TRIM(SPLIT_PART(code_remark, ' / ', 1))
WHERE code_remark LIKE '% / %';
```

---

## 実装チェックリスト

- [ ] codeMasterRepository.tsの型定義に`code_remark`が含まれているか確認
- [ ] insertInitialData.sql: code_descriptionカラム追加 + 35件の値分離
- [ ] 20260525マイグレーションSQL: 既存データのcode_remark分離を追加
- [ ] eventLogRepository.ts: `m.code_name` → `m.code_remark || m.code_name` に変更（3箇所）
- [ ] projectService.ts: checkout()のハードコード修正
- [ ] projectService.ts: checkin()のハードコード修正（存在確認後）
- [ ] fileAccessController.ts: エラーメッセージのcode_remark使用
