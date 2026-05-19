-- file_keyでMAIML分析結果を削除するクエリ
-- $1: file_key
DELETE FROM maiml_analysis_results
WHERE file_key = $1
