# タスク計画書: 環境変数差分チェックスクリプト

## メタデータ
- **作成日時**: 2026-04-21 11:37
- **タスクID**: 環境変数差分チェックスクリプト
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

検証環境へのデプロイ時に、前回リリースコミットと今回リリースコミット間で環境変数の変更を自動チェックするスクリプトを作成する。

## 目的と期待される成果
- [ ] デプロイ時の環境変数確認作業を自動化
- [ ] `.env系ファイル` / `docker-compose*.yml` の変更を検出
- [ ] 検出した変数が `aws/ecs-task-definition-*.json` にも反映されているかを照合
- [ ] 結果を `docs/deliverables/env_diff_YYYYMMDD_HHMMSS.md` に自動出力

## 実装ステップ
- [ ] `scripts/check-env-diff.sh` を新規作成
- [ ] `staging-deploy-checklist.md` の STEP 7 に使用手順を追記

## 変更ファイル
1. `scripts/check-env-diff.sh` - 新規作成
2. `docs/deploy-guide/saas/staging-deploy-checklist.md` - STEP 7 へ手順追記
