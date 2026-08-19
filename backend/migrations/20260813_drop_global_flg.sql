-- グローバル名前空間管理をファイルサーバに移行したため global_flg カラムを廃止
--
-- ⚠️ 実施前の注意事項:
--   1. 既存の global_flg=TRUE データを先にエクスポートしてファイルサーバへ配置すること
--      → ProviderMenu の「名前空間管理」画面からエクスポート操作を実施
--      → インポート操作で system/namespaces/global-declarations.csv を作成
--   2. コードから global_flg 参照がすべて削除済みであることを確認してからデプロイ
--   3. このマイグレーションはコードデプロイ後に実施すること

ALTER TABLE namespace DROP COLUMN IF EXISTS global_flg;
