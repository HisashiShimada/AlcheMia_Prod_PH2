-- ファイルパスに一致するtransition_setレコードを全削除
-- organization_idでマルチテナント分離を保証

DELETE FROM transition_set
WHERE organization_id = $1
  AND file_path = $2
