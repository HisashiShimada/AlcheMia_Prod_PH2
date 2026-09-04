-- namespace_term.xsi_type の integerType → intType 修正マイグレーション
--
-- 背景: Namespace管理UIの型選択肢として 'integerType' を使用していたが、
--       MAIML XSD仕様では正式な整数型は 'intType' であるため統一する。
--       UIの選択肢を 'intType' に変更したことに合わせ、既存DBデータも修正する。
--
-- 実行日: 2026-09-04
-- タスク: 20260904_1300_xsiType統一修正

UPDATE namespace_term
SET
  xsi_type  = 'intType'
  , update_at = CURRENT_TIMESTAMP
WHERE xsi_type = 'integerType';
