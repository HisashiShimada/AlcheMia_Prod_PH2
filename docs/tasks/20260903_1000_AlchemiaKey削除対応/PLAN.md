# タスク計画書: Alchemia:workerId / Alchemia:reportType 削除対応

## メタデータ
- **作成日時**: 2026-09-03 10:00
- **タスクID**: 20260903_1000_AlchemiaKey削除対応
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`maiml_event_log.log` に保存されている以下2つの property Key について調査を行い、不要なものを削除する。

| Key | 判定 | 対応 |
|-----|------|------|
| `Alchemia:workerId` | 参照箇所なし → 不要 | **削除** |
| `Alchemia:reportType` | `progressService.ts` でフィルタに使用中 → ログへの保存は不要（代替手段あり） | **INSERT停止 + フィルタ変更** |

## 目的と期待される成果
- [ ] `Alchemia:workerId` を maiml_event_log.log から除去する
- [ ] `Alchemia:reportType` を maiml_event_log.log から除去する
- [ ] `progressService.ts` のフィルタリングを `Alchemia:status` の存在チェックに変更し、機能を維持する

## 実装ステップ
- [ ] TODO-1: `eventLogRepository.ts` — `Alchemia:workerId` / `Alchemia:reportType` エントリ削除（実装 + JSDoc）
- [ ] TODO-2: `progressService.ts` — フィルタリングを `Alchemia:status` 存在チェックに変更
- [ ] TODO-3: `findTransitionStateRecords.sql` — コメント更新
- [ ] TODO-4: `backend/src/types/maiml-unified.ts` — `@example` コメント修正
- [ ] TODO-5: `frontend/src/types/maiml-unified.ts` — `@example` コメント修正

## 変更ファイル
1. `backend/src/repositories/eventLogRepository.ts` — プロパティ削除（2箇所実装 + 2箇所JSDoc）
2. `backend/src/services/progressService.ts` — フィルタリングロジック変更
3. `backend/src/sql/queries/event_log/findTransitionStateRecords.sql` — コメント更新
4. `backend/src/types/maiml-unified.ts` — `@example` コメント修正
5. `frontend/src/types/maiml-unified.ts` — `@example` コメント修正

## リスク
| リスク | 対策 |
|--------|------|
| `Alchemia:reportType` 削除によりフィルタが機能しなくなる | `Alchemia:status` 存在チェックに切り替え（transitionProgress のみ status を持つ構造を利用） |

## テスト計画
- [ ] `eventLogRepository.test.ts` が修正なしでパスすること（`workerId`/`reportType` のアサートなし）

## 承認記録
- **承認日時**: 2026-09-03 10:00
- **承認者コメント**: 計画承認済み
