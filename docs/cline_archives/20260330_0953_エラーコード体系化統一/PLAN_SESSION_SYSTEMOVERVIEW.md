# タスク計画書: SessionManagement・SystemOverview エラーコード体系化適用

## メタデータ
- **作成日時**: 2026-03-30 14:28
- **タスクID**: error-code-session-overview
- **優先度**: 中
- **推定工数**: 30分

## タスク概要

前回の「エラーコード体系化統一」タスク（PLAN.md）で対応漏れとなった
`SessionManagement.tsx` と `SystemOverview.tsx` に `extractErrorMessage` を適用する。

## 修正対象

### 1. SessionManagement.tsx
- `fetchSessions()` の catch: `t('...')` ハードコード → `extractErrorMessage(error, t('...'))`
- `handleTerminateSession()` の catch: 同上

### 2. SystemOverview.tsx
- `fetchData()` の catch: `err instanceof Error ? err.message : ...` の手動分岐 → `extractErrorMessage` に統一

## 変更ファイル
1. `frontend/src/components/SystemManagement/SessionManagement.tsx`
2. `frontend/src/components/SystemManagement/SystemOverview.tsx`

## 承認記録
- **承認日時**: 2026-03-30 14:28（ACTモード切替により承認）
