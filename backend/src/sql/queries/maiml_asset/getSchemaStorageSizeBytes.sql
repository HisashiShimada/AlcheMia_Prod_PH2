-- 組織スキーマの総使用容量をバイト単位で返す
-- pg_tablesビューを通じてスキーマ内の全テーブルを特定し、
-- pg_total_relation_size()（テーブル本体 + TOAST + インデックス）の合計を返す。
SELECT COALESCE(
  SUM(pg_total_relation_size(quote_ident($1) || '.' || quote_ident(tablename))),
  0
)::bigint AS total_bytes
FROM pg_tables
WHERE schemaname = $1
