-- file_keyでMAIML分析結果を取得するクエリ
-- $1: file_key
SELECT *
FROM maiml_analysis_results
WHERE file_key = $1
