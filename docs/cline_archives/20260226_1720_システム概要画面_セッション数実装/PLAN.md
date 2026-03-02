# タスク計画書: システム概要画面_セッション数実装

## メタデータ
- **作成日時**: 2026-02-26 17:20
- **タスクID**: システム概要画面_セッション数実装
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

システム概要画面の「セッション」カードに表示している「総セッション」を、モックデータではなくRedisで管理されているアクティブなリフレッシュトークン数（ログインユーザーのorganization_idに紐づく）をAPIから取得して表示する。
また不要になったモックデータファイル（system-overview.json）を削除する。

## 目的と期待される成果

- [ ] 「総セッション」にRedisのアクティブトークン数が表示される
- [ ] `frontend/mock/data/system-overview.json` が削除される
- [ ] モックデータへの依存がなくなる

## 実装ステップ

- [ ] `frontend/mock/data/system-overview.json` を削除
- [ ] `frontend/src/components/SystemManagement/SystemOverview.tsx` を修正
  - `import systemOverviewData` を削除
  - `useEffect` + `useState` で `getActiveSessions()` を呼び出し
  - 「総セッション」欄をAPIの `count` 値で表示

## 変更ファイル

1. `frontend/src/components/SystemManagement/SystemOverview.tsx` - モックデータ廃止、API呼び出し追加
2. `frontend/mock/data/system-overview.json` - 削除（使用箇所なし）

## 技術的詳細

- 使用API: `GET /api/v1/sessions` (既存)
- レスポンス: `{ sessions: [...], count: N }` の `count` を使用
- APIはauthMiddleware + tenantIsolationで組織IDフィルタ済み
- Redis未起動時はフォールバックで `count: 0` が返る

## 承認記録
- **承認日時**: 2026-02-26 17:23
