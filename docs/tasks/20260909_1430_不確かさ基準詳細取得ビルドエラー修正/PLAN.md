# タスク計画書: 不確かさ基準詳細取得ビルドエラー修正

## メタデータ
- **作成日時**: 2026-09-09 14:30
- **タスクID**: 不確かさ基準詳細取得ビルドエラー修正
- **優先度**: 高
- **推定工数**: 0.25時間

## タスク概要

バックエンドビルド時に以下の TypeScript エラーが発生している。

```
src/repositories/uncertaintyCriteriaRepository.ts:237:9 - error TS2739:
Type '{ uncertaintyKey: string; ... qualitativeOptions: { ... }[]; }'
is missing the following properties from type 'UncertaintyCriteriaDetailRow':
scopeKey, scopeName
```

### 根本原因

タスク `20260909_1000_不確かさ基準スコープ表示修正` にて `UncertaintyCriteriaRow` インターフェースに
`scopeKey` / `scopeName` の2フィールドが追加された。

`UncertaintyCriteriaDetailRow extends UncertaintyCriteriaRow` の継承により、
`findByKey` 関数内の `detail` オブジェクトリテラル（L237）でもこれらが必須フィールドとなったが、
**オブジェクトへの代入が行われていない**ためコンパイルエラーが発生している。

### 修正方針

`findByKey` は詳細モーダル（`UncertaintyDetailModal`）向けのAPIであり、
詳細画面では `scopeKey` / `scopeName` を**表示・利用していない**。

また `findByKey.sql` にはスコープ情報の JOIN がなく SQL 変更コストもかかるため、
`detail` オブジェクトリテラルに `scopeKey: null` / `scopeName: null` を追加して
型の整合を取るのが最小コストかつ安全な修正方針である。

## 目的と期待される成果

- [x] TypeScript コンパイルエラーの解消
- [x] ビルドが正常に完了すること
- [x] 既存の `findByKey` の動作に変化がないこと

## 実装ステップ

- [x] STEP 1: タスクフォルダ・PLAN.md 作成
- [ ] STEP 2: `uncertaintyCriteriaRepository.ts` の `detail` オブジェクトに `scopeKey: null` / `scopeName: null` を追加
- [ ] STEP 3: ビルド確認（`tsc --noEmit`）

## 変更ファイル

| # | ファイル | 操作 | 変更内容 |
|---|---|---|---|
| 1 | `backend/src/repositories/uncertaintyCriteriaRepository.ts` | **修正（2行追加）** | `detail` オブジェクトに `scopeKey: null` / `scopeName: null` を追加 |

## 影響範囲

### 変更対象
- `findByKey` 関数の戻り値オブジェクト（詳細取得用）

### 影響なし
- `findAllByOrganization`（一覧取得）: 既に SQL で `scopeKey` / `scopeName` を取得済み
- フロントエンド・API レスポンス: `scopeKey` / `scopeName` が `null` になるだけ（詳細画面では未使用）
- DB / SQL ファイル: 変更なし

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 詳細画面で `scopeKey`/`scopeName` が将来必要になった場合 | 低 | 低 | その際に `findByKey.sql` に JOIN を追加する（今回は範囲外） |

## テスト計画

- [ ] `cd backend && npx tsc --noEmit` でビルドエラーがなくなること

## 承認記録

- **計画書提示日時**: 2026-09-09 14:30
- **承認日時**: 2026-09-09 14:30
- **承認者コメント**: Act モードへの切り替えによる承認

## 実施記録

### 実施日時
開始: 2026-09-09 14:30
完了: 2026-09-09 14:45

### 計画からの変更点
なし

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] `backend/src/repositories/uncertaintyCriteriaRepository.ts` 修正完了
  - `findByKey` 内の `detail` オブジェクトに `scopeKey: null` / `scopeName: null` を追加
- [x] ビルドエラー解消確認（`npx tsc --noEmit` exit code 0）
