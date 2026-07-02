# リリースノート

**リリース日**: 2026-07-02  
**対象ブランチ**: main  
**前回リリースコミット**: `a0777acf`  
**今回リリースコミット**: `24d8b6f0`

---

## 環境設定変更

### 1. 検証サーバのSMTPメール送信設定を追加

- AWS SES（Simple Email Service）を使用したメール送信機能を有効化するため、ECSタスク定義にSMTP接続設定を追加
- 対象: バックエンドコンテナの環境変数
- 追加設定項目: `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM_ADDRESS` / `SMTP_FROM_NAME`

---

## ドキュメント更新

### 1. 検証サーバデプロイ手順の更新

- `docs/deploy-guide/saas-staging/staging-deploy-checklist.md` のデプロイ手順を最新の作業フローに合わせて更新

---

## DB マイグレーション

なし

---

## 主な変更ファイル

| ファイル | 変更概要 |
|---------|---------|
| `aws/ecs-task-definition-alchemia-backend.json` | SMTP設定（環境変数7件）を追加 |
| `docs/deploy-guide/saas-staging/staging-deploy-checklist.md` | デプロイ手順を更新 |
