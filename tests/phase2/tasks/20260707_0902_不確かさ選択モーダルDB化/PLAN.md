# タスク計画書: 不確かさ選択モーダルをモックからDB取得に切り替え

## メタデータ
- **作成日時**: 2026-07-07 09:02
- **タスクID**: uncertainty-selector-modal-db
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要
プロジェクト管理のテンプレート編集でプロパティの「不確かさ値を登録」ボタン押下時に開く `UncertaintyCriteriaSelectorModal` が、`mock/uncertainty-criteria.json` を直接インポートしているためエラーとなる。バックエンドにセレクター用APIを追加し、DBから取得するよう修正する。

## 目的と期待される成果
- [x] モーダルのモックJSON直接インポートを廃止する
- [x] バックエンドにセレクター用エンドポイント `GET /api/v1/uncertainty-criteria/for-selector` を追加する
- [x] フロントエンドのAPIサービスに `fetchUncertaintyCriteriaForSelector()` を追加する
- [x] モーダルがAPIからDBデータを取得して表示する

## 実装ステップ

### Phase 1: バックエンド実装
- [x] `findForSelector.sql` 新規作成（有効データのみ取得）
- [x] `uncertaintyCriteriaRepository.ts` に `findForSelector()` メソッド追加
- [x] `uncertaintyCriteriaController.ts` に `getForSelector()` 関数追加
- [x] `uncertaintyCriteriaRoutes.ts` に `/for-selector` ルート追加

### Phase 2: フロントエンド実装
- [x] `uncertaintyCriteriaApiService.ts` に `fetchUncertaintyCriteriaForSelector()` 追加
- [x] `UncertaintyCriteriaSelectorModal.tsx` をAPI呼び出しに切り替え（モックJSON削除）

## 変更ファイル

### 新規作成
1. `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql`

### 修正
1. `backend/src/repositories/uncertaintyCriteriaRepository.ts` — `findForSelector()` 追加
2. `backend/src/controllers/uncertaintyCriteriaController.ts` — `getForSelector()` 追加
3. `backend/src/routes/uncertaintyCriteriaRoutes.ts` — `/for-selector` ルート追加
4. `frontend/src/services/uncertaintyCriteriaApiService.ts` — `fetchUncertaintyCriteriaForSelector()` 追加
5. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` — モック削除・API化

## 承認記録
- **承認日時**: 2026-07-07 09:02

## 実施記録

### 実施日時
開始: 2026-07-07 09:02  
完了: 2026-07-07 09:07

### 計画からの変更点
- `UncertaintyCreateModal` に必須 props `allCriteria` が必要だったため `allCriteria={[]}` を追加
- テーブルを `<Spin>` でラップしてローディング表示を追加

### 発生した問題と解決方法
- `criteriaMock` の import 削除後、3箇所の参照が残存 → `criteriaList` state に置き換え
- `UncertaintyCreateModal` の必須 props 未指定でビルドエラー → `allCriteria={[]}` で解消
