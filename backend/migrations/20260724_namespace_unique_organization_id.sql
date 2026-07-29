-- namespace テーブルに organization_id UNIQUE 制約を追加
-- 1組織につき名前空間は1件のみ登録可能とする

ALTER TABLE namespace
  ADD CONSTRAINT namespace_organization_id_unique UNIQUE (organization_id);
