# タスク計画書: システム概要画面_契約情報追加

## メタデータ
- **作成日時**: 2026-03-05 14:44
- **タスクID**: システム概要画面_契約情報追加
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
システム概要画面に以下の2項目を追加する。
1. 「ユーザー」カード内の「アクティブ」の下に「契約ユーザー数」を追加
2. 「ストレージ」カード内の「使用容量」の下に「契約容量」を追加

データはorganizationテーブルの `contracted_users`（契約ユーザー数）・`contract_capacity`（契約容量）カラムから取得する。

## 目的と期待される成果
- [ ] ユーザーカードに「契約ユーザー数」が表示される
- [ ] ストレージカードに「契約容量」が表示される
- [ ] 未設定の場合は `-` と表示される

## 実装ステップ
- [ ] Repository層に `getOrganizationContractInfo()` メソッドを追加
- [ ] Service層の型定義・ロジックを更新
- [ ] フロントエンド型定義を更新
- [ ] フロントエンドUIを更新

## 変更ファイル
1. `backend/src/repositories/systemOverviewRepository.ts` - `getOrganizationContractInfo()` 追加
2. `backend/src/services/systemOverviewService.ts` - 型定義・取得ロジック更新
3. `frontend/src/types/systemOverview.ts` - 型定義更新
4. `frontend/src/components/SystemManagement/SystemOverview.tsx` - UI更新

## 承認記録
- **計画書提示日時**: 2026-03-05 14:44
- **承認日時**: 2026-03-05 14:44

---

## 追加タスク: 契約プロジェクト数の追加（2026-03-05 18:00）

### 追加要件
「実験システム」カード内の「プロジェクト完了/タスク異常終了」の下に「契約プロジェクト数」を追加する。
データは organizationテーブルの `contracted_projects` カラムから取得する。

### 実施確認
- [x] `backend/src/repositories/systemOverviewRepository.ts` - `getOrganizationContractInfo()` に `contracted_projects` 取得済み
- [x] `backend/src/services/systemOverviewService.ts` - `experimentSystem.contractedProjects` として返却済み
- [x] `frontend/src/types/systemOverview.ts` - `contractedProjects: number | null` 定義済み
- [x] `frontend/src/components/SystemManagement/SystemOverview.tsx` - 「契約プロジェクト数」表示行実装済み
- [x] `docs/design/api/api_system_overview.md` - レスポンス仕様・型定義・変更履歴更新（v1.2.0）
- [x] `docs/design/api/api_information_download.md` - CSVカラム追加・変更履歴更新（v1.1.0）
- [x] `docs/design/ui/ui_system_overview_main.md` - カード仕様・型定義・変更履歴更新（v1.2.0）

### 完了日時
2026-03-05 18:10
