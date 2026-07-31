-- 組織に紐づく namespace の URI 一覧を取得（URI重複チェック用）
SELECT uri FROM namespace
WHERE organization_id = $1
