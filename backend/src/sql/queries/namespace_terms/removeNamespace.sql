-- prefix テーブルから対象の prefix を削除
-- namespace テーブルの孤立レコードは残す（他の prefix が参照している可能性があるため）
DELETE FROM prefix
WHERE organization_id = $1
  AND prefix = $2
