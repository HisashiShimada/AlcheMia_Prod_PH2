# タスク計画書: 他ユーザーDB変更対応 自動リフレッシュ規約追加

## メタデータ
- **作成日時**: 2026-09-11 11:20
- **タスクID**: 20260911_1100
- **優先度**: 中
- **推定工数**: 1.5時間

## タスク概要

自分がDB操作をしていない場合でも、他のユーザーがDBを書き換えた最新情報を
画面に表示できるよう、`useApi` フックに自動リフレッシュ機能を追加し、
スキルドキュメントに統一ルールとして明文化する。

## 目的と期待される成果

- [ ] `useApi` / `useMultipleApi` に `refetchOnWindowFocus` オプション追加（タブ復帰時自動リフレッシュ）
- [ ] `useApi` / `useMultipleApi` に `refetchInterval` オプション追加（定期ポーリング）
- [ ] `.cline/skills/frontend-develop-skill/docs/frontend.md` に「他ユーザーのDB変更への対応」規約セクションを追加
- [ ] `useApi.test.ts` にフォーカスリフレッシュ・ポーリングのテストを追加
- [ ] TSエラーなし・テスト全PASS確認

## 実装ステップ

- [x] Step 0: タスク計画書作成
- [x] Step 1: `useApi.ts` に `refetchOnWindowFocus` / `refetchInterval` を追加（`useApi` + `useMultipleApi`）
- [x] Step 2: `frontend.md` に「他ユーザーのDB変更への対応」セクション追加
- [x] Step 3: `useApi.test.ts` にテスト追加（8テスト追加、計24テスト）
- [x] Step 4: テスト実行・TSビルド確認（24 tests PASS、TSエラーなし）

## 変更ファイル

1. `frontend/src/hooks/useApi.ts` - オプション追加
2. `.cline/skills/frontend-develop-skill/docs/frontend.md` - 規約追加
3. `frontend/src/hooks/__tests__/useApi.test.ts` - テスト追加

## リスク

| リスク | 対策 |
|--------|------|
| `refetchOnWindowFocus` が既存コードと競合 | opt-in（デフォルト false）設計のため既存コードへの影響なし |
| ポーリングのメモリリーク | アンマウント時に clearInterval を確実に実行 |

## 承認記録
- **承認日時**: 2026-09-11 11:20
- **承認者コメント**: ユーザーが act モードに切り替え承認済み
