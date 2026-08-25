# タスク計画書: 不確かさ基準管理画面一覧をDBと紐づけ（モックデータ除去）

## メタデータ
- **作成日時**: 2026-07-02 15:46
- **タスクID**: uncertainty-criteria-db-integration
- **優先度**: 中
- **推定工数**: 1.5時間

## タスク概要
不確かさ基準管理画面（UncertaintyManagement）の一覧テーブルが `mock/uncertainty.json` を参照していたものを、バックエンドAPI経由でDBの `uncertainty_criteria` テーブルと紐づける。

## 目的と期待される成果
- [ ] モックデータ参照を完全に除去する
- [ ] バックエンドに `uncertainty_criteria` テーブルのGET APIを新規作成する
- [ ] フロントエンドのAPIサービスからDB値を取得・変換して一覧に表示する
- [ ] DBカラムの値を画面列に正しくマッピングする（Enum変換含む）

## 実装ステップ

### Phase 1: バックエンド実装
- [ ] `backend/src/repositories/uncertaintyCriteriaRepository.ts` 新規作成
- [ ] `backend/src/controllers/uncertaintyCriteriaController.ts` 新規作成
- [ ] `backend/src/routes/uncertaintyCriteriaRoutes.ts` 新規作成
- [ ] `backend/src/server.ts` にルート登録追加

### Phase 2: フロントエンド実装
- [ ] `frontend/src/services/uncertaintyCriteriaApiService.ts` 新規作成
- [ ] `frontend/src/components/uncertainty/UncertaintyManagement.tsx` 修正（モック除去・API呼び出し）
- [ ] `frontend/src/components/uncertainty/UncertaintyListTable.tsx` 修正（型定義の nullable 対応）

## 変更ファイル

### 新規作成
1. `backend/src/repositories/uncertaintyCriteriaRepository.ts`
2. `backend/src/controllers/uncertaintyCriteriaController.ts`
3. `backend/src/routes/uncertaintyCriteriaRoutes.ts`
4. `frontend/src/services/uncertaintyCriteriaApiService.ts`

### 修正
1. `backend/src/server.ts` — ルート登録追加
2. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` — モック除去・API呼び出し
3. `frontend/src/components/uncertainty/UncertaintyListTable.tsx` — 型定義の nullable 対応

## DBカラムと画面列のマッピング

| 画面列 | DBカラム | 変換 |
|---|---|---|
| 不確かさ基準名 | なし | 空白（`—`表示） |
| 評価方式 | `evaluation_method` | 1→quantitative, 2→qualitative |
| 型 | `xsi_type` | そのまま |
| 継承元 | なし（今回） | 空白（`—`表示） |
| スコープ | なし（今回） | 空白（`—`表示） |
| 説明 | `description` | そのまま |
| バージョン | `version` (integer) | 先頭 "V" を付ける（例: V1） |
| 状態 | `is_Invalid` (boolean) | false→active, true→deprecated |

## 承認記録
- **承認日時**: 2026-07-02 15:46
