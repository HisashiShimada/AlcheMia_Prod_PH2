-- パスワードリセットトークンを削除するクエリ
DELETE FROM password_reset_tokens
WHERE reset_token = $1
